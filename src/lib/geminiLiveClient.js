/**
 * Gemini Multimodal Live Client
 * 
 * Official bidirectional streaming client for Gemini Multimodal Live API
 * Endpoint: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
 * Model: models/gemini-3.8-live
 * 
 * Protocols supported:
 * - Realtime Audio Input: PCM 16kHz, 16-bit mono little-endian (via base64)
 * - Realtime Audio Output: PCM 24kHz, 16-bit mono little-endian gapless playback
 * - Realtime Text Chat: Bidirectional conversational turns
 * - Grounding: Google Search tool enabled ({ googleSearch: {} })
 * - Session Management: Setup, TurnComplete, Interrupted, Barge-in, and Low-Cost mode
 */

import { getGeminiApiKey as getStoredGeminiKey } from './geminiClient';

export const GEMINI_LIVE_DEFAULT_MODEL = 'models/gemini-3.8-live';
export const GEMINI_LIVE_WS_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

export class GeminiLiveSession {
  constructor(options = {}) {
    this.options = {
      model: options.model || GEMINI_LIVE_DEFAULT_MODEL,
      voiceName: options.voiceName || 'Fenrir', // 'Fenrir', 'Puck', 'Charon', 'Kore', 'Aoede', 'Zephyr'
      systemInstruction: options.systemInstruction || 'You are Marcus Vance, an aggressive, practical, elite B2B Cold Calling Coach for blue-collar contractors. Be punchy, conversational, and direct.',
      apiKey: options.apiKey || '',
      enableSearch: options.enableSearch !== false,
      lowCostMode: Boolean(options.lowCostMode),
      onStateChange: options.onStateChange || (() => {}),
      onAudioAmplitude: options.onAudioAmplitude || (() => {}),
      onTextToken: options.onTextToken || (() => {}),
      onTurnComplete: options.onTurnComplete || (() => {}),
      onInterrupted: options.onInterrupted || (() => {}),
      onGrounding: options.onGrounding || (() => {}),
      onError: options.onError || (() => {}),
      onIframeMicBlocked: options.onIframeMicBlocked || (() => {}),
      onUserSpeechChunk: options.onUserSpeechChunk || (() => {}),
      ...options
    };

    this.state = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error'
    this.ws = null;
    this.audioInputContext = null;
    this.audioOutputContext = null;
    this.micStream = null;
    this.micProcessor = null;
    this.audioQueue = [];
    this.isPlayingAudio = false;
    this.nextAudioStartTime = 0;
    this.activeAudioSources = [];
    this.outputAnalyser = null;
    this.inputAnalyser = null;
    this.animFrameId = null;
    this.isMuted = false;
    this.currentResponseText = '';

    // User speech detection & VAD turn management
    this.userSpeechDetected = false;
    this.userSpeechChunkCount = 0;
    this.userSpeechRmsTotal = 0;
    this.isUserCurrentlySpeaking = false;
    this.silenceTimeoutId = null;
    this.hasTriggeredGreeting = false;
    this.fallbackGreetingTimeout = null;
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange(newState);
    }
  }

  resolveApiKey() {
    if (this.options.apiKey && this.options.apiKey.trim().length > 10) {
      return this.options.apiKey.trim();
    }
    const stored = getStoredGeminiKey();
    if (stored && stored.length > 10) return stored;

    if (typeof window !== 'undefined') {
      if (window.env?.GEMINI_API_KEY) return window.env.GEMINI_API_KEY;
      if (window.process?.env?.API_KEY) return window.process.env.API_KEY;
      if (window.process?.env?.GEMINI_API_KEY) return window.process.env.GEMINI_API_KEY;
    }
    try {
      const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
      if (viteKey) return viteKey;
    } catch {
      /* ignore */
    }
    return '';
  }

  /**
   * Resume active audio contexts (must be triggered from user gesture)
   */
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

  /**
   * Start the Gemini Multimodal Live Session
   */
  async start() {
    if (this.state === 'connecting' || this.state === 'connected' || this.state === 'speaking' || this.state === 'listening') {
      return;
    }

    this.setState('connecting');
    this.userSpeechDetected = false;
    this.userSpeechChunkCount = 0;

    const key = this.resolveApiKey();
    if (!key) {
      const err = new Error('No Gemini API Key available. Please provide an API key in Settings or localStorage.');
      this.setState('error');
      this.options.onError(err);
      return;
    }

    try {
      // 1. Initialize Web Audio Output Context with native hardware sample rate (auto-resamples 24kHz buffers)
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioOutputContext = new AudioCtx();
      if (this.audioOutputContext.state === 'suspended') {
        await this.audioOutputContext.resume();
      }

      this.outputAnalyser = this.audioOutputContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.8;
      this.outputAnalyser.connect(this.audioOutputContext.destination);

      // 2. Initialize Microphone Input Audio Stream (unless in purely text mode)
      await this.initMicrophoneCapture();

      // 3. Connect to Gemini Multimodal Live WebSocket endpoint
      const wsUrl = `${GEMINI_LIVE_WS_ENDPOINT}?key=${encodeURIComponent(key)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.sendSessionSetup();
        this.setState('connected');
        this.startAmplitudeMonitor();

        // Fallback: If setupComplete message is not received within 1200ms, trigger greeting automatically
        this.fallbackGreetingTimeout = setTimeout(() => {
          if (!this.hasTriggeredGreeting && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[GeminiLive] Handshake fallback: dispatching initial greeting trigger.');
            this.sendInitialGreetingTrigger();
          }
        }, 1200);
      };

      this.ws.onmessage = async (event) => {
        await this.handleServerMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.warn('Gemini Live WebSocket error:', event);
        this.setState('error');
        this.options.onError(new Error('WebSocket connection to Gemini Live encountered an error.'));
      };

      this.ws.onclose = (event) => {
        console.log('Gemini Live WebSocket closed:', event.code, event.reason);
        this.cleanup();
        this.setState('disconnected');
      };

    } catch (err) {
      console.warn('Failed to start Gemini Live Session:', err);
      this.cleanup();
      this.setState('error');
      this.options.onError(err);
    }
  }

  /**
   * Send the initial Gemini Live setup payload with tools and voice configuration
   */
  sendSessionSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupPayload = {
      setup: {
        model: this.options.model || GEMINI_LIVE_DEFAULT_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.options.voiceName || 'Fenrir'
              }
            }
          }
        },
        systemInstruction: {
          parts: [
            { text: this.options.systemInstruction }
          ]
        },
        tools: this.options.enableSearch ? [{ googleSearch: {} }] : []
      }
    };

    this.ws.send(JSON.stringify(setupPayload));
  }

  /**
   * Downsample input audio buffer to 16kHz PCM
   */
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

  /**
   * Initialize microphone capture and downsampling to 16kHz PCM
   */
  async initMicrophoneCapture() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio not supported by this browser.');
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioInputContext = new AudioCtx();
      if (this.audioInputContext.state === 'suspended') {
        await this.audioInputContext.resume();
      }

      const source = this.audioInputContext.createMediaStreamSource(this.micStream);
      this.inputAnalyser = this.audioInputContext.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      source.connect(this.inputAnalyser);

      // Create a zero-gain node to keep the processor running continuously without mic echo to speakers
      const muteGain = this.audioInputContext.createGain();
      muteGain.gain.value = 0;

      // Audio processor to extract PCM chunks via modern AudioWorkletNode (avoids ScriptProcessorNode deprecation)
      let workletAttached = false;
      if (this.audioInputContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          const workletCode = `
class GeminiAudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
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
            if (e.data) {
              this.processInputPCM(e.data);
            }
          };

          source.connect(workletNode);
          workletNode.connect(muteGain);
          muteGain.connect(this.audioInputContext.destination);
          this.micProcessor = workletNode;
          workletAttached = true;
        } catch (workletErr) {
          console.warn('AudioWorklet initialization fallback to ScriptProcessor:', workletErr);
        }
      }

      // Safe fallback if AudioWorklet is not available (e.g. older environments or test mocks)
      if (!workletAttached && this.audioInputContext.createScriptProcessor) {
        this.micProcessor = this.audioInputContext.createScriptProcessor(4096, 1, 1);
        this.micProcessor.onaudioprocess = (e) => {
          const rawData = e.inputBuffer.getChannelData(0);
          this.processInputPCM(rawData);
        };
        source.connect(this.micProcessor);
        this.micProcessor.connect(muteGain);
        muteGain.connect(this.audioInputContext.destination);
      }

    } catch (micErr) {
      console.warn('Microphone initialization error:', micErr);
      if (micErr.name === 'NotAllowedError' || micErr.name === 'SecurityError') {
        this.options.onIframeMicBlocked(micErr);
      } else {
        this.options.onError(new Error(`Microphone error: ${micErr.message || 'Access denied'}`));
      }
      throw micErr;
    }
  }

  /**
   * Process raw input audio data chunk from AudioWorkletNode or ScriptProcessorNode
   */
  processInputPCM(rawData) {
    if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const inputData = this.downsampleTo16k(rawData, this.audioInputContext?.sampleRate || 16000);
    
    // Calculate input RMS energy level
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);

    // Active user speech detection (speech threshold)
    if (rms > 0.02) {
      this.isUserCurrentlySpeaking = true;
      this.userSpeechDetected = true;
      this.userSpeechChunkCount++;
      this.userSpeechRmsTotal += rms;

      // Reset silence timer while user is actively speaking
      if (this.silenceTimeoutId) {
        clearTimeout(this.silenceTimeoutId);
        this.silenceTimeoutId = null;
      }

      if (this.options.onUserSpeechChunk) {
        this.options.onUserSpeechChunk({ rms, chunkCount: this.userSpeechChunkCount });
      }

      // Barge-in: interrupt AI model speech immediately when user begins speaking
      if (this.isPlayingAudio) {
        this.stopAudioPlayback();
        this.setState('listening');
        this.options.onInterrupted();
      }

      if (this.state !== 'speaking') {
        this.setState('listening');
      }
    } else {
      // User is silent: if they were speaking, wait 800ms of silence to commit turnComplete
      if (this.isUserCurrentlySpeaking && !this.silenceTimeoutId) {
        this.silenceTimeoutId = setTimeout(() => {
          this.commitUserTurn();
        }, 800);
      }
    }

    // Convert Float32Array to 16-bit PCM (Int16Array)
    const pcm16 = this.float32ToInt16PCM(inputData);
    const base64Data = this.arrayBufferToBase64(pcm16.buffer);

    // Stream realtime input to Gemini Live
    const audioMsg = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data
          }
        ]
      }
    };

    try {
      this.ws.send(JSON.stringify(audioMsg));
    } catch {
      /* ignore */
    }
  }

  /**
   * Commit the user's spoken turn over WebSocket when silence is detected (800ms)
   */
  commitUserTurn() {
    if (!this.isUserCurrentlySpeaking || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.isUserCurrentlySpeaking = false;
      this.silenceTimeoutId = null;
      return;
    }

    this.isUserCurrentlySpeaking = false;
    this.silenceTimeoutId = null;
    this.setState('thinking');

    console.log('[GeminiLive] User stopped speaking (800ms silence detected). Committing turnComplete.');
    const turnCompleteMsg = {
      clientContent: {
        turnComplete: true
      }
    };

    try {
      this.ws.send(JSON.stringify(turnCompleteMsg));
    } catch (e) {
      console.warn('[GeminiLive] Failed to send turnComplete:', e);
    }
  }

  /**
   * Send initial greeting trigger turn immediately after setup handshake completes
   */
  sendInitialGreetingTrigger() {
    if (this.hasTriggeredGreeting || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.hasTriggeredGreeting = true;

    if (this.fallbackGreetingTimeout) {
      clearTimeout(this.fallbackGreetingTimeout);
      this.fallbackGreetingTimeout = null;
    }

    const greetingText = this.options.initialPrompt || 'Coach Marcus, please start the lesson now. Greet me aloud and state Scenario 1 to kick off the drill.';

    const initialTurnMsg = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text: greetingText }]
        }],
        turnComplete: true
      }
    };

    try {
      this.ws.send(JSON.stringify(initialTurnMsg));
      console.log('[GeminiLive] Dispatched initial greeting trigger turn to Marcus:', greetingText);
    } catch (e) {
      console.warn('[GeminiLive] Failed to send initial greeting trigger:', e);
    }
  }

  /**
   * Send text message directly into the live bidirectional session
   */
  sendTextMessage(text) {
    if (!text || !text.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.stopAudioPlayback(); // Interrupt any active speech on new user message
    this.setState('thinking');

    const clientContentMsg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text.trim() }]
          }
        ],
        turnComplete: true
      }
    };

    try {
      this.ws.send(JSON.stringify(clientContentMsg));
    } catch (e) {
      console.warn('Failed to send text turn to Gemini Live:', e);
    }
  }

  /**
   * Handle incoming messages from Gemini Live server
   */
  async handleServerMessage(data) {
    try {
      let msgObj = null;
      if (typeof data === 'string') {
        msgObj = JSON.parse(data);
      } else if (data instanceof Blob) {
        const text = await data.text();
        msgObj = JSON.parse(text);
      }

      if (!msgObj) return;

      // 1. Initial Handshake Confirmation: Trigger Marcus to speak first
      if (msgObj.setupComplete || msgObj.setup_complete) {
        console.log('[GeminiLive] Server confirmed setupComplete handshake. Triggering initial greeting...');
        this.sendInitialGreetingTrigger();
        return;
      }

      const serverContent = msgObj.serverContent || msgObj.server_content;
      if (!serverContent) return;

      // 2. Interruption notice: User spoke, cut off model speech immediately
      if (serverContent.interrupted) {
        this.stopAudioPlayback();
        this.setState('listening');
        this.options.onInterrupted();
        return;
      }

      // 3. Model Turn: Text tokens and Audio PCM chunks
      const modelTurn = serverContent.modelTurn || serverContent.model_turn;
      if (modelTurn && modelTurn.parts) {
        for (const part of modelTurn.parts) {
          // A. Text Token Chunk
          if (part.text) {
            this.currentResponseText += part.text;
            this.options.onTextToken(part.text, this.currentResponseText);
          }

          // B. PCM Audio Chunk (24kHz model output)
          const inlineData = part.inlineData || part.inline_data;
          if (inlineData && inlineData.data) {
            this.setState('speaking');
            this.enqueueAudioChunk(inlineData.data);
          }
        }
      }

      // 4. Grounding Search Metadata
      if (serverContent.groundingMetadata || serverContent.grounding_metadata) {
        this.options.onGrounding(serverContent.groundingMetadata || serverContent.grounding_metadata);
      }

      // 5. Turn Complete
      const turnComplete = serverContent.turnComplete || serverContent.turn_complete;
      if (turnComplete) {
        this.options.onTurnComplete(this.currentResponseText);
        this.currentResponseText = '';
        if (!this.isPlayingAudio) {
          this.setState('listening');
        }
      }

    } catch (err) {
      console.warn('Error parsing Gemini Live message:', err);
    }
  }

  /**
   * Decode base64 PCM 24kHz chunk and enqueue for seamless gapless audio playback
   */
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

  /**
   * Immediately cancel any active and queued audio playback (barge-in / interruption)
   */
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
    this.audioQueue = [];
    this.isPlayingAudio = false;
    this.currentResponseText = '';
    if (this.audioOutputContext) {
      this.nextAudioStartTime = this.audioOutputContext.currentTime;
    }
  }

  /**
   * Monitor output and input audio amplitudes to drive avatar visual reactions
   */
  startAmplitudeMonitor() {
    const dataArray = new Uint8Array(128);

    const update = () => {
      let outputAmp = 0;
      let inputAmp = 0;

      // Measure model speech output amplitude
      if (this.outputAnalyser && this.isPlayingAudio) {
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        outputAmp = Math.min(1, (sum / dataArray.length) / 100);
      }

      // Measure user mic input amplitude
      if (this.inputAnalyser && !this.isMuted) {
        this.inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        inputAmp = Math.min(1, (sum / dataArray.length) / 90);
      }

      this.options.onAudioAmplitude({
        output: outputAmp,
        input: inputAmp,
        active: Math.max(outputAmp, inputAmp)
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

  // Audio utility conversions
  float32ToInt16PCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Disconnect and clean up resources
   */
  cleanup() {
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }
    if (this.fallbackGreetingTimeout) {
      clearTimeout(this.fallbackGreetingTimeout);
      this.fallbackGreetingTimeout = null;
    }
    this.isUserCurrentlySpeaking = false;
    this.hasTriggeredGreeting = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopAudioPlayback();

    if (this.micProcessor) {
      try {
        if (this.micProcessor.port) {
          this.micProcessor.port.onmessage = null;
        }
        this.micProcessor.disconnect();
      } catch {
        /* ignore */
      }
      this.micProcessor = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach(t => t.stop());
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
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }

  stop() {
    this.cleanup();
    this.setState('disconnected');
  }
}

/**
 * Standard geminiLiveClient service helper
 */
export const geminiLiveClient = {
  connect(selectedProspect, activeScript, options = {}) {
    const session = new GeminiLiveSession({
      prospect: selectedProspect,
      script: activeScript,
      ...options
    });
    session.start();
    return session;
  }
};
