import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Utility functions for audio processing
function convertBase64ToBytes(base64String: string): Uint8Array {
  const decoded = atob(base64String);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
}

function convertFloat32ToPCM(audioData: Float32Array): string {
  const pcm16 = new Int16Array(audioData.length);

  for (let i = 0; i < audioData.length; i++) {
    const normalized = Math.max(-1, Math.min(1, audioData[i]));
    pcm16[i] = normalized < 0 ? normalized * 0x8000 : normalized * 0x7FFF;
  }

  const bytes = new Uint8Array(pcm16.buffer);
  let binaryString = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }

  return btoa(binaryString);
}

function createAudioBuffer(
  pcmBytes: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const pcm16Array = new Int16Array(pcmBytes.buffer);
  const audioBuffer = audioContext.createBuffer(1, pcm16Array.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < pcm16Array.length; i++) {
    channelData[i] = pcm16Array[i] / 32768.0;
  }

  return audioBuffer;
}

// Audio visualization component
interface VisualizerProps {
  isActive: boolean;
  analyser: AnalyserNode | null;
}

const AudioVisualizer: React.FC<VisualizerProps> = ({ isActive, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrame: number;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      analyser.getByteFrequencyData(dataArray);

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 80;

      // Calculate pulse effect based on audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const scaleFactor = 1 + (average / 256) * 0.5;

      context.save();
      context.translate(centerX, centerY);
      context.scale(scaleFactor, scaleFactor);

      // Draw glowing center orb
      const gradient = context.createRadialGradient(0, 0, baseRadius * 0.5, 0, 0, baseRadius);
      gradient.addColorStop(0, 'rgba(66, 133, 244, 0.8)');
      gradient.addColorStop(0.6, 'rgba(219, 68, 55, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      context.beginPath();
      context.arc(0, 0, baseRadius, 0, 2 * Math.PI);
      context.fillStyle = gradient;
      context.fill();

      // Draw frequency bars in circular pattern
      const barCount = 60;
      const angleStep = (Math.PI * 2) / barCount;

      context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      context.lineWidth = 2;

      for (let i = 0; i < barCount; i++) {
        const frequencyValue = dataArray[i * 2] || 0;
        const barLength = (frequencyValue / 255) * 50;

        context.rotate(angleStep);
        context.beginPath();
        context.moveTo(0, baseRadius);
        context.lineTo(0, baseRadius + barLength);
        context.stroke();
      }

      context.restore();
    };

    animate();

    return () => cancelAnimationFrame(animationFrame);
  }, [isActive, analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight * 0.6}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
};

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to connect");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio state references
  const sessionRef = useRef<Promise<any> | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextAudioStartTime = useRef<number>(0);
  const activeAudioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserNode = useRef<AnalyserNode | null>(null);

  const cleanupSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current
        .then(session => {
          if (session && typeof session.close === 'function') {
            session.close();
          }
        })
        .catch(console.error);
      sessionRef.current = null;
    }

    activeAudioSources.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source already stopped
      }
    });
    activeAudioSources.current.clear();

    if (inputAudioContext.current) {
      inputAudioContext.current.close();
      inputAudioContext.current = null;
    }

    if (outputAudioContext.current) {
      outputAudioContext.current.close();
      outputAudioContext.current = null;
    }

    setIsConnected(false);
    setStatusMessage("Disconnected");
    analyserNode.current = null;
  }, []);

  const startSession = async () => {
    try {
      if (isConnected) {
        cleanupSession();
        return;
      }

      setStatusMessage("Initializing audio...");
      setErrorMessage(null);

      // Initialize audio contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputContext = new AudioContextClass({ sampleRate: 16000 });
      const outputContext = new AudioContextClass({ sampleRate: 24000 });

      inputAudioContext.current = inputContext;
      outputAudioContext.current = outputContext;

      // Setup audio analyser for visualization
      const analyser = outputContext.createAnalyser();
      analyser.fftSize = 256;
      analyserNode.current = analyser;

      // Initialize Gemini AI client
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error('API key not found. Please set API_KEY in .env.local');
      }

      const genAI = new GoogleGenAI({ apiKey });
      const modelName = "gemini-2.5-flash-native-audio-preview-09-2025";

      setStatusMessage("Connecting to Gemini...");

      // Start live audio session
      const session = genAI.live.connect({
        model: modelName,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are a helpful, witty, and concise AI assistant. You love to chat.",
        },
        callbacks: {
          onopen: async () => {
            setStatusMessage("Connected! Listening...");
            setIsConnected(true);

            // Start capturing microphone input
            try {
              const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const micSource = inputContext.createMediaStreamSource(mediaStream);

              const audioProcessor = inputContext.createScriptProcessor(4096, 1, 1);

              audioProcessor.onaudioprocess = (event) => {
                const audioData = event.inputBuffer.getChannelData(0);
                const encodedAudio = convertFloat32ToPCM(audioData);

                session.then(activeSession => {
                  activeSession.sendRealtimeInput({
                    media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: encodedAudio
                    }
                  });
                });
              };

              micSource.connect(audioProcessor);
              audioProcessor.connect(inputContext.destination);
            } catch (err) {
              console.error("Microphone error:", err);
              setErrorMessage("Microphone access denied. Please allow microphone permissions.");
              cleanupSession();
            }
          },

          onmessage: async (message: LiveServerMessage) => {
            const audioResponse = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

            if (audioResponse) {
              const audioBytes = convertBase64ToBytes(audioResponse);
              const audioBuffer = createAudioBuffer(audioBytes, outputContext, 24000);

              const currentTime = outputContext.currentTime;
              nextAudioStartTime.current = Math.max(nextAudioStartTime.current, currentTime);

              const bufferSource = outputContext.createBufferSource();
              bufferSource.buffer = audioBuffer;
              bufferSource.connect(analyser);
              analyser.connect(outputContext.destination);

              bufferSource.start(nextAudioStartTime.current);
              nextAudioStartTime.current += audioBuffer.duration;

              activeAudioSources.current.add(bufferSource);
              bufferSource.onended = () => activeAudioSources.current.delete(bufferSource);
            }

            if (message.serverContent?.interrupted) {
              activeAudioSources.current.forEach(source => {
                try {
                  source.stop();
                } catch (e) {
                  // Already stopped
                }
              });
              activeAudioSources.current.clear();
              nextAudioStartTime.current = 0;
            }
          },

          onclose: () => {
            setStatusMessage("Disconnected");
            setIsConnected(false);
          },

          onerror: (error) => {
            console.error("Session error:", error);
            setErrorMessage("Connection error occurred. Please try again.");
            cleanupSession();
          }
        }
      });

      sessionRef.current = session;

    } catch (error: any) {
      console.error("Failed to start session:", error);
      setErrorMessage(error.message || "Failed to connect. Please check your setup.");
      cleanupSession();
    }
  };

  const toggleSession = () => {
    if (isConnected) {
      cleanupSession();
    } else {
      startSession();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white font-sans selection:bg-blue-500 selection:text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black z-0" />

      <div className="z-10 flex flex-col items-center w-full max-w-md px-6">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 mb-4 shadow-lg shadow-blue-500/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
            Gemini Live
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Real-time Native Audio Experience</p>
        </div>

        {/* Visualizer */}
        <div className="relative w-full h-64 mb-12 flex items-center justify-center">
          {isConnected ? (
            <AudioVisualizer isActive={isConnected} analyser={analyserNode.current} />
          ) : (
            <div className="w-40 h-40 rounded-full border-2 border-gray-800 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gray-800/50 animate-pulse flex items-center justify-center">
                <span className="text-gray-500 text-xs uppercase tracking-widest">Idle</span>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="h-8 mb-6 flex items-center justify-center">
          {errorMessage ? (
            <span className="text-red-400 text-sm bg-red-900/20 px-3 py-1 rounded-full border border-red-900/50">
              {errorMessage}
            </span>
          ) : (
            <span className={`text-sm px-4 py-1 rounded-full border transition-all duration-300 ${
              isConnected
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}>
              {statusMessage}
            </span>
          )}
        </div>

        {/* Control Button */}
        <button
          onClick={toggleSession}
          className={`group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
            isConnected
              ? "bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              : "bg-white hover:bg-gray-100 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          }`}
        >
          {isConnected ? (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <p className="mt-6 text-gray-600 text-xs">
          Press play to start a conversation.
        </p>

      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
