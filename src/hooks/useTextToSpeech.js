import { useRef, useCallback, useState } from 'react';

/**
 * useTextToSpeech - BROWSER BUILT-IN VERSION
 * 
 * Uses Web Speech API (built into all modern browsers)
 * NO API KEYS NEEDED - works immediately
 */

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const utteranceRef = useRef(null);

  const synthesizeAndPlay = useCallback(async (text, voiceConfig = {}) => {
    try {
      setError(null);
      setIsPlaying(true);

      // Check if browser supports speech synthesis
      if (!window.speechSynthesis) {
        throw new Error('Browser does not support text-to-speech');
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice
      utterance.rate = voiceConfig.speakingRate || 1.0;
      utterance.pitch = voiceConfig.pitch || 1.0;
      utterance.volume = 1.0;

      // Try to find a female voice
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.name.includes('Female') || 
        v.name.includes('Samantha') ||
        v.name.includes('Google US English')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        console.log('[Browser TTS] Finished speaking');
      };

      utterance.onerror = (event) => {
        console.error('[Browser TTS] Error:', event);
        setIsPlaying(false);
        setError(event.error);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      console.log('[Browser TTS] Speaking:', text.substring(0, 50) + '...');

    } catch (err) {
      console.error('[Browser TTS] Error:', err);
      setError(err.message);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    console.log('[Browser TTS] Stopped');
  }, []);

  return {
    synthesizeAndPlay,
    stop,
    isPlaying,
    error,
  };
};
