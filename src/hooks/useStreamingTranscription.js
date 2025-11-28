import { useRef, useCallback, useState } from 'react';

/**
 * useStreamingTranscription - BROWSER BUILT-IN VERSION
 * 
 * Uses Web Speech API (built into Chrome/Edge/Safari)
 * NO API KEYS NEEDED - works immediately
 */

export const useStreamingTranscription = () => {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);

  const startStreaming = useCallback(async (stream) => {
    try {
      // Check if browser supports speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Browser does not support speech recognition');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsConnected(true);
        console.log('[Browser STT] Started listening');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setCurrentTranscript(prev => prev + finalTranscript);
          console.log('[Browser STT] Final:', finalTranscript);
        } else if (interimTranscript) {
          console.log('[Browser STT] Interim:', interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('[Browser STT] Error:', event.error);
        setError(event.error);
      };

      recognition.onend = () => {
        setIsConnected(false);
        console.log('[Browser STT] Stopped');
      };

      recognitionRef.current = recognition;
      recognition.start();

      return true;
    } catch (err) {
      console.error('[Browser STT] Start error:', err);
      setError(err.message);
      setIsConnected(false);
      return false;
    }
  }, []);

  const stopStreaming = useCallback(async () => {
    return new Promise((resolve) => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setTimeout(() => {
          resolve(currentTranscript);
        }, 100);
      } else {
        resolve(currentTranscript);
      }
    });
  }, [currentTranscript]);

  const reset = useCallback(() => {
    setCurrentTranscript('');
    setError(null);
  }, []);

  return {
    startStreaming,
    stopStreaming,
    reset,
    transcript: currentTranscript,
    currentTranscript,
    isConnected,
    error,
  };
};
