import { useRef, useCallback, useState } from 'react';

export const useDeepgramVoiceAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  const pcmToWav = (pcmData, sampleRate = 24000) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));
    return buffer;
  };

  const playAudio = useCallback((arrayBuffer, audioContext) => {
    const wavBuffer = pcmToWav(arrayBuffer);
    audioQueueRef.current.push(wavBuffer);
    if (!isPlayingRef.current) {
      playNextInQueue(audioContext);
    }
  }, []);

  const playNextInQueue = (audioContext) => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const arrayBuffer = audioQueueRef.current.shift();
    audioContext.decodeAudioData(arrayBuffer)
      .then(audioBuffer => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => playNextInQueue(audioContext);
        source.start();
      })
      .catch(err => {
        console.error('[Gemini] Audio decode error:', err);
        playNextInQueue(audioContext);
      });
  };

  const startConversation = useCallback(async (apiKey, personaPrompt = 'You are a sales prospect. Start by saying "Hello?"') => {
    try {
      console.log('[Gemini] Starting conversation with persona');
      setError(null);
      setMessages([]);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 }
      });
      mediaStreamRef.current = stream;

      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);
      wsRef.current = ws;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      ws.onopen = () => {
        console.log('[Gemini] WebSocket connected');
        console.log('[Gemini] Using persona:', personaPrompt.substring(0, 100) + '...');
        
        const setup = {
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Puck' } } }
            },
            system_instruction: { parts: [{ text: personaPrompt }] }
          }
        };
        ws.send(JSON.stringify(setup));
        
        setTimeout(() => {
          ws.send(JSON.stringify({ client_content: { turns: [{ role: 'user', parts: [{ text: '' }] }], turn_complete: true } }));
        }, 500);
        
        setIsConnected(true);
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const text = await event.data.text();
          try {
            const message = JSON.parse(text);
            handleGeminiMessage(message, stream, ws, audioContext);
          } catch (e) {
            console.log('[Gemini] Blob was not JSON');
          }
          return;
        }
        
        const message = JSON.parse(event.data);
        console.log('[Gemini] Message:', message);
        handleGeminiMessage(message, stream, ws, audioContext);
      };

      const handleGeminiMessage = (message, stream, ws, audioContext) => {
        if (message.setupComplete) {
          console.log('[Gemini] Setup complete - starting audio capture');
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(audioContext.destination);
          
          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(pcmData.buffer)));
              ws.send(JSON.stringify({ realtime_input: { media_chunks: [{ mime_type: 'audio/pcm', data: base64Audio }] } }));
            }
          };
          mediaRecorderRef.current = processor;
        } else if (message.serverContent?.modelTurn) {
          const parts = message.serverContent.modelTurn.parts || [];
          for (const part of parts) {
            if (part.inlineData?.mimeType?.includes('audio')) {
              const audioData = atob(part.inlineData.data);
              const arrayBuffer = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                arrayBuffer[i] = audioData.charCodeAt(i);
              }
              playAudio(arrayBuffer.buffer, audioContext);
            }
            if (part.text) {
              setMessages(prev => [...prev, { id: Date.now(), speaker: 'Prospect', text: part.text, timestamp: Date.now() }]);
            }
          }
        }
      };

      ws.onerror = (err) => { console.error('[Gemini] Error:', err); setError('Connection error'); };
      ws.onclose = () => { console.log('[Gemini] Closed'); setIsConnected(false); };

      return true;
    } catch (err) {
      console.error('[Gemini] Failed:', err);
      setError(err.message);
      return false;
    }
  }, [playAudio]);

  const stopConversation = useCallback(() => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.disconnect();
    if (wsRef.current) wsRef.current.close();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
  }, []);

  return { startConversation, stopConversation, isConnected, messages, error };
};
