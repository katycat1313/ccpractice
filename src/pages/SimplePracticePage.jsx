import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function SimplePracticePage({ onClose }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const deepgramSocketRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCall();
    };
  }, []);

  const stopCall = () => {
    // Disconnect audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close Deepgram socket
    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close();
      deepgramSocketRef.current = null;
    }

    setIsConnected(false);
    setIsRecording(false);
  };

  const playAudio = async (text) => {
    try {
      console.log('[SimplePractice] Playing audio:', text);

      // Use Gemini TTS
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY not found');
      }

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-tts:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Speak in a professional, confident tone with clear articulation: "${text}"`
              }]
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore'
                  }
                },
                audioConfig: {
                  audioEncoding: 'LINEAR16',
                  sampleRateHertz: 24000
                }
              }
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SimplePractice] Gemini TTS error:', response.status, errorText);
        throw new Error(`Gemini TTS failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
      const mimeType = data.candidates[0].content.parts[0].inlineData.mimeType;

      // Convert base64 to blob and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0))],
        { type: mimeType }
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play();
      });

      URL.revokeObjectURL(audioUrl);
      console.log('[SimplePractice] Audio playback complete');
    } catch (err) {
      console.error('[SimplePractice] Audio playback error:', err);
      setError(`Audio error: ${err.message}`);
    }
  };

  const getAIResponse = async (userText) => {
    try {
      console.log('[SimplePractice] Getting AI response for:', userText);

      const { data, error } = await supabase.functions.invoke('generate-prospect-response', {
        body: {
          conversationHistory: [
            ...conversationHistory,
            { speaker: 'You', text: userText }
          ],
          difficulty: 'Medium'
        }
      });

      if (error) throw error;

      const responseText = data.responseText;
      console.log('[SimplePractice] AI response:', responseText);

      setAiResponse(responseText);
      setConversationHistory(prev => [
        ...prev,
        { speaker: 'You', text: userText },
        { speaker: 'Prospect', text: responseText }
      ]);

      // Play the AI response
      await playAudio(responseText);

    } catch (err) {
      console.error('[SimplePractice] AI error:', err);
      setError(`AI error: ${err.message}`);
    }
  };

  const startCall = async () => {
    try {
      setError(null);
      console.log('[SimplePractice] Starting call...');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;
      console.log('[SimplePractice] Microphone access granted');

      // Get Deepgram API key from env
      const deepgramKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
      console.log('[SimplePractice] Deepgram key exists:', !!deepgramKey);
      if (!deepgramKey || deepgramKey === 'your_deepgram_api_key_here') {
        throw new Error('VITE_DEEPGRAM_API_KEY not configured. Please add your Deepgram API key to .env.local');
      }

      // Connect to Deepgram WebSocket for STT with raw audio encoding
      const deepgramSocket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&smart_format=true&interim_results=false',
        ['token', deepgramKey]
      );
      deepgramSocketRef.current = deepgramSocket;

      deepgramSocket.onopen = async () => {
        console.log('[SimplePractice] Deepgram WebSocket connected');
        setIsConnected(true);

        // Create AudioContext to process raw audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(audioContext.destination);

        // Send raw PCM audio data to Deepgram (16-bit little-endian)
        processor.onaudioprocess = (e) => {
          if (deepgramSocket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);

            // Convert Float32Array to Int16Array (PCM 16-bit)
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              // Clamp to [-1, 1] range and convert to 16-bit PCM
              const s = Math.max(-1, Math.min(1, inputData[i]));
              int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Send as little-endian bytes
            deepgramSocket.send(int16Data);
          }
        };

        setIsRecording(true);
        console.log('[SimplePractice] Recording started with raw PCM audio');

        // Prospect says hello first
        playAudio("Hello?").then(() => {
          setAiResponse("Hello?");
          setConversationHistory([{ speaker: 'Prospect', text: 'Hello?' }]);
        });
      };

      deepgramSocket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        console.log('[SimplePractice] Deepgram message:', data);

        // Check for errors
        if (data.type === 'Error' || data.error) {
          console.error('[SimplePractice] Deepgram error response:', data);
          setError(`Deepgram error: ${data.error || data.message || 'Unknown error'}`);
          return;
        }

        if (data.type === 'Results') {
          const transcript = data.channel?.alternatives?.[0]?.transcript;

          if (transcript && transcript.trim()) {
            console.log('[SimplePractice] Transcript:', transcript);
            setTranscript(transcript);

            // Get AI response
            await getAIResponse(transcript);
          }
        }
      };

      deepgramSocket.onerror = (error) => {
        console.error('[SimplePractice] Deepgram WebSocket error:', error);
        setError('Deepgram WebSocket connection error');
      };

      deepgramSocket.onclose = (event) => {
        console.log('[SimplePractice] Deepgram WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) {
          setError(`Deepgram closed unexpectedly: ${event.reason || event.code}`);
        }
        setIsConnected(false);
      };

    } catch (err) {
      console.error('[SimplePractice] Start error:', err);
      setError(err.message);
      stopCall();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Cold Call Practice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded p-4 mb-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Conversation History */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {conversationHistory.map((msg, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${
                msg.speaker === 'Prospect'
                  ? 'bg-purple-900 bg-opacity-30 border-2 border-purple-500'
                  : 'bg-blue-900 bg-opacity-30 border-2 border-blue-500'
              }`}
            >
              <p className={`font-bold mb-2 ${
                msg.speaker === 'Prospect' ? 'text-purple-300' : 'text-blue-300'
              }`}>
                {msg.speaker}:
              </p>
              <p className="text-white text-lg">{msg.text}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            {!isConnected ? (
              <button
                onClick={startCall}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-xl font-bold flex items-center gap-2"
              >
                <Mic size={24} />
                Place Call
              </button>
            ) : (
              <button
                onClick={stopCall}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full text-xl font-bold flex items-center gap-2"
              >
                <MicOff size={24} />
                End Call
              </button>
            )}
          </div>

          <p className="text-gray-400 text-sm text-center">
            {!isConnected && 'Click "Place Call" to start practicing'}
            {isConnected && !isRecording && 'Connecting...'}
            {isConnected && isRecording && 'Listening... speak now'}
          </p>
        </div>
      </div>
    </div>
  );
}
