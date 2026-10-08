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
import { COACH_ALL_WHITELISTED_TOOLS } from './coachActions';

export const GEMINI_LIVE_DEFAULT_MODEL = 'models/gemini-3.8-live';
export const GEMINI_LIVE_WS_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

export const MARCUS_CLASSROOM_INSTRUCTOR_PROMPT = `You are Marcus Vance, a master sales instructor and direct-response phone sales coach running a high-intensity, supportive 1-on-1 cold calling masterclass and script co-creation lab.

CORE OBJECTIVE:
Your mission is to teach the user how to cold call, control conversations, manage tonality, and close meetings through real-time spoken feedback and rapid drills. You do not just roleplay; you teach the mechanics of selling like a dedicated private instructor in a classroom workshop.

CLASSROOM CURRICULUM:
1. The 10-Second Pattern Interrupt: Tone must be calm, peer-to-peer, unhurried, and curious. Eliminate fast, apologetic pitch breath.
2. The Friction Pivot: Moving from an initial reflex brush-off ("I'm busy", "Send info") to a concrete problem without arguing.
3. Discovery & Diagnosis: Asking punchy, diagnostic questions rather than presenting features.
4. Downside Risk Removal: Closing for a low-friction 10-minute audit or demo, not a permanent commitment.

CORE MODES OF OPERATION:
1. DRILL & TONE LAB: You teach vocal projection, down-inflection, eliminating hesitation words, and cadence. You model the line first, then have the user repeat it until crisp.
2. SCRIPT BUILDER CO-PILOT: You help the user construct 20-second hooks and punchy rebuttals. When they state an idea, you sharpen it into conversational, no-fluff spoken language.
3. INTERACTIVE SIMULATION (PAUSE & COACH): When doing roleplay, you can switch into a contractor persona (e.g., Carl 'Mac' McIntyre on Route 60), but if the user stumbles, sounds nervous, or asks for help, INSTANTLY break character to give 1-sentence tactical coaching ("Drop your pitch at the end of 'budget'—don't ask permission, state it. Try it again.").

SCAFFOLDED EXPERT TEACHING:
- At the beginner or guided stage, Coach is responsible for choosing the exact words. Do not ask the student to invent an opening line, rebuttal, or closing before they have mastered the model.
- State the expert line in quotation marks, explain briefly why it works, model the delivery, and have the student repeat it.
- Keep coaching the same line until the delivery is good enough. Then introduce one controlled variation and explain the decision behind it.
- Only at the independent stage should Coach ask the student to dynamically choose what to say; evaluate the choice and correct it against proven sales principles.

TURN-INTENT RULE:
- Distinguish lesson conversation from line rehearsal. The student may speak to Coach about the business, correct Coach, ask questions, reject an example, or explain that a line does not fit. Those are not practice lines.
- If the student says anything like "I am not selling that," "that is not what I mean," "listen to me," or otherwise corrects the context, stop the drill immediately, acknowledge the correction, and respond to the meaning of what they said.
- Never assume the student is repeating a script line merely because they are speaking after a prompt. Ask for confirmation before scoring or coaching a phrase when intent is unclear.

AUDIO & LIVE CONVERSATIONAL RULES (STRICT):
- Direct & Conversational: You are speaking aloud over live two-way WebRTC audio. Keep spoken responses short (1 to 3 sentences maximum at a time). Never give multi-paragraph lectures.
- Natural Turn-Taking: After providing an observation or a coaching tip, immediately pass the turn back to the student with a targeted drill prompt.
- Active Listening to Tone: Listen not just to the student's words, but to their pace, vocal cadence, hesitation, and pitch. Explicitly coach them when they sound tentative, rushed, or robotic.
- Interruption-Friendly: Welcome interruptions. If the student interrupts, seamlessly catch their thought and adapt.
- Repeat-until-ready rule: Never move to a new phrase merely because the student has repeated once. If pace, pitch movement, hesitation, filler words, or vocal confidence are still off, stay with the current phrase and coach the next correction. If the delivery is good enough, explicitly say it passed and then advance.

PEDAGOGICAL TEACHING PROTOCOL:
1. Explain & Demonstrate: State the rule, then model the exact line using your own natural voice.
   Example: "Drop the salesperson pitch. Speak slower than they do. Say it like this: 'Carl, caught you in the middle of a job?' Now repeat that back to me."
2. Call and Response (Micro-Drills): Keep the student on one line for as many attempts as needed until the delivery is solid. There is no fixed attempt limit. After every miss, identify one concrete issue, explain exactly how to correct it, model the corrected delivery, and ask for that same line again.
3. Guided Roleplay with Tactical Pauses:
   - When running a scenario (e.g., calling Carl McIntyre or Delbert Workman), step into character briefly to throw a realistic objection.
   - If the student trips up or freezes, break character immediately as the Instructor: "Freeze. Stop right there. Notice your inflection went up at the end? You're asking for permission. Drop your tone and hit the problem. Run it again."
4. Immediate Positive Reinforcement: Validate sharp execution cleanly ("That was crisp. Exactly that energy."), then elevate to the next difficulty level.

INITIAL GREETING:
When the session connects, introduce yourself warmly as their instructor, establish what trade contractor or opener they want to master today, and immediately run their baseline 10-second opener drill.`;

export class GeminiLiveSession {
  constructor(options = {}) {
    this.options = {
      model: options.model || GEMINI_LIVE_DEFAULT_MODEL,
      voiceName: options.voiceName || 'Fenrir', // 'Fenrir', 'Puck', 'Charon', 'Kore', 'Aoede', 'Zephyr'
      systemInstruction: options.systemInstruction || MARCUS_CLASSROOM_INSTRUCTOR_PROMPT,
      apiKey: options.apiKey || '',
      enableSearch: options.enableSearch !== false,
      micStream: options.micStream || null,
      lowCostMode: Boolean(options.lowCostMode),
      onStateChange: options.onStateChange || (() => {}),
      onAudioAmplitude: options.onAudioAmplitude || (() => {}),
      onTextToken: options.onTextToken || (() => {}),
      onTurnComplete: options.onTurnComplete || (() => {}),
      onInterrupted: options.onInterrupted || (() => {}),
      onGrounding: options.onGrounding || (() => {}),
      onToolCall: options.onToolCall || (async () => ({ success: false, message: 'Tool not available.' })),
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

    // There must be exactly one Live audio session for the whole app. This
    // prevents a hidden Coach, Practice session, or hot-reloaded component
    // from speaking over the current session.
    if (typeof window !== 'undefined' && window.__activeGeminiLiveSession && window.__activeGeminiLiveSession !== this) {
      try { window.__activeGeminiLiveSession.stop(); } catch { /* previous session cleanup is best effort */ }
    }
    if (typeof window !== 'undefined') {
      window.__activeGeminiLiveSession = this;
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
        tools: [
          ...(this.options.enableSearch ? [{ googleSearch: {} }] : []),
          { functionDeclarations: COACH_ALL_WHITELISTED_TOOLS }
        ]
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

  // Estimate fundamental frequency from voiced audio using normalized
  // autocorrelation. Zero-crossing counts consonants/noise as pitch and was
  // producing implausible readings such as 587 Hz.
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
      const normalized = correlation / Math.sqrt((leftEnergy * rightEnergy) || 1);
      if (normalized > bestCorrelation) {
        bestCorrelation = normalized;
        bestLag = lag;
      }
    }
    if (!bestLag || bestCorrelation < 0.55) return { pitchHz: 0, confidence: bestCorrelation };
    return { pitchHz: sampleRate / bestLag, confidence: bestCorrelation };
  }

  /**
   * Initialize microphone capture and downsampling to 16kHz PCM
   */
  async initMicrophoneCapture() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio not supported by this browser.');
      }

      // Request broadly first; Chrome/Safari can reject exact sample-rate
      // constraints even when the microphone is available. PCM is downsampled
      // to 16 kHz below, so the device does not need to provide 16 kHz natively.
      // Reuse a stream obtained by the click handler when supplied. This keeps
      // permission handling and the Gemini audio processor on the same stream.
      if (this.options.micStream) {
        this.micStream = this.options.micStream;
      } else {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
        } catch {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

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
        this.micProcessor = this.audioInputContext.createScriptProcessor(2048, 1, 1);
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
   * Continuously streams 512-1024 sample PCM chunks every 20-40ms with zero hold-back
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
      if (this.silenceTimeoutId) {
        clearTimeout(this.silenceTimeoutId);
        this.silenceTimeoutId = null;
      }
      this.userSpeechDetected = true;
      this.userSpeechChunkCount++;
      this.userSpeechRmsTotal += rms;

      if (this.options.onUserSpeechChunk) {
        const { pitchHz, confidence } = this.estimatePitch(inputData, 16000);
        this.options.onUserSpeechChunk({ rms, pitchHz, confidence, chunkCount: this.userSpeechChunkCount });
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

      // Reset the end-of-turn timer on every speech chunk. This is more
      // reliable than waiting for a perfectly silent audio frame because
      // microphone noise can keep RMS slightly above the threshold.
      this.silenceTimeoutId = setTimeout(() => {
        this.commitUserTurn();
      }, 800);
    } else {
      if (this.isUserCurrentlySpeaking) {
        this.isUserCurrentlySpeaking = false;
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
    if (!this.userSpeechDetected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.isUserCurrentlySpeaking = false;
      this.silenceTimeoutId = null;
      return;
    }

    this.isUserCurrentlySpeaking = false;
    this.userSpeechDetected = false;
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

      const toolCall = msgObj.toolCall || msgObj.tool_call;
      if (toolCall?.functionCalls || toolCall?.function_calls) {
        const calls = toolCall.functionCalls || toolCall.function_calls || [];
        const functionResponses = [];
        for (const call of calls) {
          try {
            const result = await this.options.onToolCall(call.name, call.args || {});
            functionResponses.push({ id: call.id, name: call.name, response: result || { success: true } });
          } catch (error) {
            functionResponses.push({ id: call.id, name: call.name, response: { success: false, message: error.message } });
          }
        }
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
        }
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
    if (typeof window !== 'undefined' && window.__activeGeminiLiveSession === this) {
      window.__activeGeminiLiveSession = null;
    }
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
