/**
 * Gemini Multimodal Live Client (Server-Bridged WebSocket)
 *
 * Connects to /ws/live on our Express server, which bridges directly to
 * Gemini 3.8 Live (`gemini-3.8-live`) via @google/genai without exposing API keys
 * to the browser.
 *
 * Capabilities:
 * - Realtime Audio Input: PCM 16kHz, 16-bit mono little-endian
 * - Realtime Audio Output: PCM 24kHz, 16-bit mono little-endian gapless playback
 * - True Barge-In: Instant local playback cancellation + server interrupted signal
 * - Realtime Video / Screen-Share Streaming: 1 FPS JPEG frames (`video`)
 * - Bidirectional Input & Output Audio Transcriptions
 */

import { getDeepgramApiKey } from './deepgramService';

export const MARCUS_CLASSROOM_INSTRUCTOR_PROMPT = `You are Marcus Vance, an elite, direct, supportive Career & Sales Coach. Speak naturally, concisely (1 to 3 sentences per turn), and adapt immediately to interruptions.`;

export class GeminiLiveSession {
  constructor(options = {}) {
    this.options = {
      voiceName: options.voiceName || 'Zephyr',
      systemInstruction: options.systemInstruction || MARCUS_CLASSROOM_INSTRUCTOR_PROMPT,
      initialPrompt: options.initialPrompt || '',
      apiKey: options.apiKey || '',
      micStream: options.micStream || null,
      lowCostMode: Boolean(options.lowCostMode),
      onStateChange: options.onStateChange || (() => {}),
      onAudioAmplitude: options.onAudioAmplitude || (() => {}),
      onTextToken: options.onTextToken || (() => {}),
      onInputTranscript: options.onInputTranscript || (() => {}),
      onTurnComplete: options.onTurnComplete || (() => {}),
      onInterrupted: options.onInterrupted || (() => {}),
      onGrounding: options.onGrounding || (() => {}),
      onToolCall: options.onToolCall || (async () => ({ success: false, message: 'Tool not available.' })),
      onError: options.onError || (() => {}),
      onIframeMicBlocked: options.onIframeMicBlocked || (() => {}),
      onUserSpeechChunk: options.onUserSpeechChunk || (() => {}),
      ...options,
    };

    this.state = 'disconnected';
    this.ws = null;
    this.audioInputContext = null;
    this.audioOutputContext = null;
    this.micStream = null;
    this.micProcessor = null;
    this.activeAudioSources = [];
    this.isPlayingAudio = false;
    this.nextAudioStartTime = 0;
    this.outputAnalyser = null;
    this.inputAnalyser = null;
    this.animFrameId = null;
    this.isMuted = false;
    this.currentResponseText = '';
    this.currentUserTranscript = '';
    this.userSpeechChunkCount = 0;
    this.bargeInCount = 0;
    this.isReady = false;
    this.micReady = false;
    this.stoppedByUser = false;
    this.reconnectCount = 0;
    this.hasSentInitialPrompt = false;
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange(newState);
    }
  }

  hasActiveMic() {
    return Boolean(
      this.micReady &&
        this.micStream &&
        this.micStream.getAudioTracks?.().some((t) => t.readyState === 'live')
    );
  }

  async resumeAudioContexts() {
    try {
      if (this.audioOutputContext && this.audioOutputContext.state === 'suspended') {
        await this.audioOutputContext.resume();
      }
      if (this.audioInputContext && this.audioInputContext.state === 'suspended') {
        await this.audioInputContext.resume();
      }
    } catch {
      /* ignore */
    }
  }

  async start() {
    if (['connecting', 'connected', 'speaking', 'listening'].includes(this.state)) {
      return;
    }

    if (typeof window !== 'undefined' && window.__activeGeminiLiveSession && window.__activeGeminiLiveSession !== this) {
      try {
        window.__activeGeminiLiveSession.stop();
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== 'undefined') {
      window.__activeGeminiLiveSession = this;
    }

    this.setState('connecting');
    this.stoppedByUser = false;
    this.reconnectCount = 0;
    this.hasSentInitialPrompt = false;
    this.userSpeechChunkCount = 0;
    this.bargeInCount = 0;
    this.isReady = false;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioOutputContext = new AudioCtx({ sampleRate: 24000 });
      if (this.audioOutputContext.state === 'suspended') {
        await this.audioOutputContext.resume().catch(() => {});
      }

      this.outputAnalyser = this.audioOutputContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.72;
      this.outputAnalyser.connect(this.audioOutputContext.destination);

      // Connect WebSocket immediately so a blocked/pending mic never kills the live call!
      this.openBridgeWebSocket();

      // Request microphone in parallel without aborting the WebSocket session if denied
      await this.initMicrophoneCapture({ silentIfBlocked: false }).catch((micErr) => {
        console.warn('[GeminiLiveSession] Continuing call without mic until enabled:', micErr?.message || micErr);
      });
    } catch (err) {
      this.cleanup();
      this.setState('error');
      this.options.onError(err);
    }
  }

  openBridgeWebSocket() {
    if (this.stoppedByUser) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/live`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      if (this.stoppedByUser || this.ws !== ws) return;
      this.reconnectCount = 0;
      const dgKey = getDeepgramApiKey();
      const shouldGreet = !this.hasSentInitialPrompt;
      this.hasSentInitialPrompt = true;

      ws.send(
        JSON.stringify({
          type: 'setup',
          voiceName: this.options.voiceName || 'Zephyr',
          systemInstruction: this.options.systemInstruction,
          initialPrompt: shouldGreet ? this.options.initialPrompt || '' : '',
          ...(dgKey ? { deepgramApiKey: dgKey } : {}),
        })
      );
      this.setState('connected');
      this.startAmplitudeMonitor();
    };

    ws.onmessage = async (event) => {
      if (this.ws !== ws) return;
      await this.handleBridgeMessage(event.data);
    };

    ws.onerror = () => {
      if (this.stoppedByUser || this.ws !== ws) return;
      // Wait for onclose to decide whether to auto-reconnect
    };

    ws.onclose = (ev) => {
      if (this.stoppedByUser || this.ws !== ws) return;
      if (this.reconnectCount < 2 && ev?.code !== 1000) {
        this.reconnectCount += 1;
        this.isReady = false;
        setTimeout(() => {
          if (!this.stoppedByUser) {
            this.openBridgeWebSocket();
          }
        }, 600 * this.reconnectCount);
        return;
      }
      this.cleanup();
      this.setState('disconnected');
    };
  }

  async enableMicrophone() {
    if (this.hasActiveMic()) {
      this.isMuted = false;
      if (this.options.onMicStatusChange) {
        this.options.onMicStatusChange(true);
      }
      return true;
    }
    try {
      await this.initMicrophoneCapture({ silentIfBlocked: false });
      this.isMuted = false;
      if (this.options.onMicStatusChange) {
        this.options.onMicStatusChange(true);
      }
      return true;
    } catch {
      if (this.options.onMicStatusChange) {
        this.options.onMicStatusChange(false);
      }
      return false;
    }
  }

  async initMicrophoneCapture({ silentIfBlocked = false } = {}) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio is not supported by this browser.');
      }

      if (this.options.micStream && this.options.micStream.getAudioTracks?.().some((t) => t.readyState === 'live')) {
        this.micStream = this.options.micStream;
      } else {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioInputContext || this.audioInputContext.state === 'closed') {
        this.audioInputContext = new AudioCtx();
      }
      if (this.audioInputContext.state === 'suspended') {
        await this.audioInputContext.resume().catch(() => {});
      }

      const source = this.audioInputContext.createMediaStreamSource(this.micStream);
      this.inputAnalyser = this.audioInputContext.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      source.connect(this.inputAnalyser);

      const muteGain = this.audioInputContext.createGain();
      muteGain.gain.value = 0;

      let workletAttached = false;
      if (this.audioInputContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          const workletCode = `
class GeminiAudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bytesWritten++] = channelData[i];
        if (this.bytesWritten >= this.bufferSize) {
          this.port.postMessage(this.buffer.slice(0, this.bufferSize));
          this.bytesWritten = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('gemini-audio-recorder-processor', GeminiAudioRecorderProcessor);
`;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await this.audioInputContext.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          const workletNode = new AudioWorkletNode(this.audioInputContext, 'gemini-audio-recorder-processor');
          workletNode.port.onmessage = (e) => {
            if (e.data) this.processInputPCM(e.data);
          };

          source.connect(workletNode);
          workletNode.connect(muteGain);
          muteGain.connect(this.audioInputContext.destination);
          this.micProcessor = workletNode;
          workletAttached = true;
        } catch (workletErr) {
          console.warn('AudioWorklet fallback to ScriptProcessor:', workletErr);
        }
      }

      if (!workletAttached && this.audioInputContext.createScriptProcessor) {
        this.micProcessor = this.audioInputContext.createScriptProcessor(2048, 1, 1);
        this.micProcessor.onaudioprocess = (e) => {
          this.processInputPCM(e.inputBuffer.getChannelData(0));
        };
        source.connect(this.micProcessor);
        this.micProcessor.connect(muteGain);
        muteGain.connect(this.audioInputContext.destination);
      }

      this.micReady = true;
      if (this.options.onMicStatusChange) {
        this.options.onMicStatusChange(true);
      }
    } catch (micErr) {
      this.micReady = false;
      if (this.options.onMicStatusChange) {
        this.options.onMicStatusChange(false);
      }
      if (!silentIfBlocked) {
        if (micErr.name === 'NotAllowedError' || micErr.name === 'SecurityError') {
          this.options.onIframeMicBlocked(micErr);
        } else {
          this.options.onError(new Error(`Microphone notice: ${micErr.message || 'Click Mic On to grant access'}`));
        }
      }
      throw micErr;
    }
  }

  downsampleTo16k(buffer, sampleRate) {
    if (sampleRate === 16000) return buffer;
    const ratio = sampleRate / 16000;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origin = i * ratio;
      const index = Math.floor(origin);
      const nextIndex = Math.min(index + 1, buffer.length - 1);
      const fraction = origin - index;
      result[i] = buffer[index] * (1 - fraction) + buffer[nextIndex] * fraction;
    }
    return result;
  }

  estimatePitch(rawData, sampleRate = 16000) {
    if (!rawData || rawData.length < 256) return { pitchHz: 0, confidence: 0 };
    let energy = 0;
    for (let i = 0; i < rawData.length; i++) energy += rawData[i] * rawData[i];
    const rms = Math.sqrt(energy / rawData.length);
    if (rms < 0.025) return { pitchHz: 0, confidence: 0 };

    let bestLag = 0;
    let bestCorrelation = 0;
    const minLag = Math.max(2, Math.floor(sampleRate / 350));
    const maxLag = Math.min(rawData.length - 2, Math.floor(sampleRate / 70));
    for (let lag = minLag; lag <= maxLag; lag++) {
      let correlation = 0;
      let leftEnergy = 0;
      let rightEnergy = 0;
      for (let i = 0; i < rawData.length - lag; i++) {
        const left = rawData[i];
        const right = rawData[i + lag];
        correlation += left * right;
        leftEnergy += left * left;
        rightEnergy += right * right;
      }
      const normalized = correlation / Math.sqrt(leftEnergy * rightEnergy || 1);
      if (normalized > bestCorrelation) {
        bestCorrelation = normalized;
        bestLag = lag;
      }
    }
    if (!bestLag || bestCorrelation < 0.55) return { pitchHz: 0, confidence: bestCorrelation };
    return { pitchHz: sampleRate / bestLag, confidence: bestCorrelation };
  }

  processInputPCM(rawData) {
    if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isReady) return;

    const inputData = this.downsampleTo16k(rawData, this.audioInputContext?.sampleRate || 16000);
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);

    if (rms > 0.022) {
      this.userSpeechChunkCount++;
      if (this.options.onUserSpeechChunk) {
        const { pitchHz, confidence } = this.estimatePitch(inputData, 16000);
        this.options.onUserSpeechChunk({ rms, pitchHz, confidence, chunkCount: this.userSpeechChunkCount });
      }

      // Immediate client-side barge-in: stop AI output as soon as user speaks clearly
      if (this.isPlayingAudio && rms > 0.036) {
        this.bargeInCount++;
        this.stopAudioPlayback();
        this.setState('listening');
        this.options.onInterrupted({ source: 'barge-in', count: this.bargeInCount });
      } else if (this.state !== 'speaking') {
        this.setState('listening');
      }
    }

    const pcm16 = this.float32ToInt16PCM(inputData);
    const base64Data = this.arrayBufferToBase64(pcm16.buffer);

    try {
      this.ws.send(JSON.stringify({ type: 'audio', data: base64Data }));
    } catch {
      /* ignore */
    }
  }

  /**
   * Stream a JPEG frame (at <= 1 FPS) from screen share or camera to Gemini Live
   */
  sendVideoFrame(base64Jpeg) {
    if (!base64Jpeg || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isReady) return;
    const clean = base64Jpeg.replace(/^data:image\/\w+;base64,/, '');
    try {
      this.ws.send(JSON.stringify({ type: 'video', data: clean }));
    } catch {
      /* ignore */
    }
  }

  sendTextMessage(text) {
    if (!text || !text.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.stopAudioPlayback();
    this.setState('thinking');
    try {
      this.ws.send(JSON.stringify({ type: 'text', text: text.trim() }));
    } catch (err) {
      console.warn('Failed to send text turn:', err);
    }
  }

  commitUserTurn() {
    this.setState('thinking');
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'commit' }));
      } catch {
        /* ignore */
      }
    }
  }

  async handleBridgeMessage(rawData) {
    try {
      const msg = typeof rawData === 'string' ? JSON.parse(rawData) : JSON.parse(await rawData.text());
      if (!msg) return;

      if (msg.type === 'ready' || msg.type === 'setupComplete') {
        this.isReady = true;
        this.setState('listening');
        return;
      }

      if (msg.type === 'error') {
        this.setState('error');
        this.options.onError(new Error(msg.message || 'Gemini Live error'));
        return;
      }

      if (msg.type === 'interrupted') {
        this.bargeInCount++;
        this.stopAudioPlayback();
        this.setState('listening');
        this.options.onInterrupted({ source: 'server', count: this.bargeInCount });
        return;
      }

      if (msg.type === 'inputTranscript' && msg.text) {
        this.currentUserTranscript = this.currentUserTranscript
          ? `${this.currentUserTranscript} ${msg.text}`.replace(/\s+/g, ' ').trim()
          : msg.text.trim();
        this.options.onInputTranscript(msg.text, this.currentUserTranscript);
        return;
      }

      if (msg.type === 'outputTranscript' && msg.text) {
        this.currentResponseText = this.currentResponseText
          ? `${this.currentResponseText} ${msg.text}`.replace(/\s+/g, ' ').trim()
          : msg.text.trim();
        this.options.onTextToken(msg.text, this.currentResponseText);
        return;
      }

      if (msg.type === 'text' && msg.text) {
        this.currentResponseText += msg.text;
        this.options.onTextToken(msg.text, this.currentResponseText);
        return;
      }

      if (msg.type === 'audio' && msg.data) {
        this.setState('speaking');
        this.enqueueAudioChunk(msg.data);
        return;
      }

      if (msg.type === 'turnComplete') {
        const finalText = this.currentResponseText.trim();
        this.options.onTurnComplete(finalText);
        this.currentResponseText = '';
        this.currentUserTranscript = '';
        if (!this.isPlayingAudio) {
          this.setState('listening');
        }
        return;
      }

      if (msg.type === 'closed') {
        this.cleanup();
        this.setState('disconnected');
      }
    } catch (err) {
      console.warn('Error handling live bridge message:', err);
    }
  }

  enqueueAudioChunk(base64Audio) {
    if (!this.audioOutputContext || this.options.lowCostMode || !base64Audio) return;

    try {
      if (this.audioOutputContext.state === 'suspended') {
        this.audioOutputContext.resume().catch(() => {});
      }

      const pcm16 = this.base64ToInt16PCM(base64Audio);
      if (!pcm16 || pcm16.length === 0) return;
      const float32 = this.int16ToFloat32PCM(pcm16);

      const buffer = this.audioOutputContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.audioOutputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAnalyser);

      const currentTime = this.audioOutputContext.currentTime;
      if (this.nextAudioStartTime < currentTime) {
        this.nextAudioStartTime = currentTime;
      }
      const startTime = this.nextAudioStartTime;
      source.start(startTime);
      this.nextAudioStartTime = startTime + buffer.duration;

      this.activeAudioSources.push(source);
      this.isPlayingAudio = true;

      source.onended = () => {
        const idx = this.activeAudioSources.indexOf(source);
        if (idx !== -1) this.activeAudioSources.splice(idx, 1);
        if (this.activeAudioSources.length === 0) {
          this.isPlayingAudio = false;
          if (this.state === 'speaking') {
            this.setState('listening');
          }
        }
      };
    } catch (e) {
      console.warn('Audio decoding error:', e);
    }
  }

  stopAudioPlayback() {
    for (const source of this.activeAudioSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.activeAudioSources = [];
    this.isPlayingAudio = false;
    this.currentResponseText = '';
    if (this.audioOutputContext) {
      this.nextAudioStartTime = this.audioOutputContext.currentTime;
    }
  }

  startAmplitudeMonitor() {
    const dataArray = new Uint8Array(128);

    const update = () => {
      let outputAmp = 0;
      let inputAmp = 0;

      if (this.outputAnalyser && this.isPlayingAudio) {
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        outputAmp = Math.min(1, sum / dataArray.length / 85);
      }

      if (this.inputAnalyser && !this.isMuted) {
        this.inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        inputAmp = Math.min(1, sum / dataArray.length / 85);
      }

      this.options.onAudioAmplitude({
        output: outputAmp,
        input: inputAmp,
        active: Math.max(outputAmp, inputAmp),
      });

      this.animFrameId = requestAnimationFrame(update);
    };

    update();
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
  }

  setLowCostMode(enabled) {
    this.options.lowCostMode = Boolean(enabled);
  }

  float32ToInt16PCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  base64ToInt16PCM(base64) {
    if (!base64) return new Int16Array(0);
    const binary = atob(base64);
    const len = binary.length;
    const sampleCount = Math.floor(len / 2);
    const int16Array = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const low = binary.charCodeAt(i * 2);
      const high = binary.charCodeAt(i * 2 + 1);
      let val = (high << 8) | low;
      if (val >= 0x8000) val -= 0x10000;
      int16Array[i] = val;
    }
    return int16Array;
  }

  int16ToFloat32PCM(int16Array) {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  cleanup() {
    if (typeof window !== 'undefined' && window.__activeGeminiLiveSession === this) {
      window.__activeGeminiLiveSession = null;
    }
    this.isReady = false;
    this.micReady = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.stopAudioPlayback();

    if (this.micProcessor) {
      try {
        if (this.micProcessor.port) this.micProcessor.port.onmessage = null;
        this.micProcessor.disconnect();
      } catch {
        /* ignore */
      }
      this.micProcessor = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      this.micStream = null;
    }

    if (this.audioInputContext && this.audioInputContext.state !== 'closed') {
      try {
        this.audioInputContext.close();
      } catch {
        /* ignore */
      }
      this.audioInputContext = null;
    }

    if (this.audioOutputContext && this.audioOutputContext.state !== 'closed') {
      try {
        this.audioOutputContext.close();
      } catch {
        /* ignore */
      }
      this.audioOutputContext = null;
    }

    if (this.ws) {
      const closingWs = this.ws;
      this.ws = null;
      try {
        closingWs.close(1000, 'Session ended');
      } catch {
        /* ignore */
      }
    }
  }

  stop() {
    this.stoppedByUser = true;
    this.cleanup();
    this.setState('disconnected');
  }

  disconnect() {
    this.stop();
  }
}

export const geminiLiveClient = {
  connect(selectedProspect, activeScript, options = {}) {
    const session = new GeminiLiveSession({
      prospect: selectedProspect,
      script: activeScript,
      ...options,
    });
    session.start();
    return session;
  },
};
