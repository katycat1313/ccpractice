import { useRef, useCallback, useState } from 'react';

/**
 * useTextToSpeech
 * 
 * React hook for text-to-speech synthesis using Google Cloud Text-to-Speech API
 * Synthesizes text to audio and plays it back
 * 
 * Returns:
 * - synthesizeAndPlay(text): Generate audio from text and play it
 * - stop(): Stop current audio playback
 * - isPlaying: Boolean state
 * - error: Error message if any
 */
export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  /**
   * Synthesize text to speech using Google Cloud TTS API
   * and play the audio
   */
  const synthesizeAndPlay = useCallback(async (text, voiceConfig = {}) => {
    try {
      setError(null);
      setIsPlaying(true);

      // Get API key from environment
      const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY;
      if (!apiKey) {
        throw new Error('Google TTS API key not configured');
      }

      console.log('[TTS] Synthesizing:', text.substring(0, 50) + '...');

      // Call Google Cloud Text-to-Speech API
      const response = await fetch(
        'https://texttospeech.googleapis.com/v1/text:synthesize',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: voiceConfig.languageCode || 'en-US',
              name: voiceConfig.name || 'en-US-Neural2-C',
              ssmlGender: voiceConfig.gender || 'FEMALE',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: voiceConfig.pitch || 0,
              speakingRate: voiceConfig.speakingRate || 1.0,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `TTS API error: ${response.status}`
        );
      }

      const data = await response.json();
      if (!data.audioContent) {
        throw new Error('No audio content in TTS response');
      }

      // Convert base64 audio to blob
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      } else {
        audioRef.current = new Audio(audioUrl);
      }

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.log('[TTS] Playback finished');
      };

      audioRef.current.onerror = (err) => {
        console.error('[TTS] Playback error:', err);
        setIsPlaying(false);
        setError('Audio playback error');
      };

      await audioRef.current.play();
      console.log('[TTS] Playing audio');
    } catch (err) {
      console.error('[TTS] Error:', err);
      setError(err.message);
      setIsPlaying(false);
    }
  }, []);

  /**
   * Stop audio playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      console.log('[TTS] Stopped');
    }
  }, []);

  /**
   * Check if audio is currently playing
   */
  const getCurrentTime = useCallback(() => {
    return audioRef.current?.currentTime || 0;
  }, []);

  /**
   * Get audio duration
   */
  const getDuration = useCallback(() => {
    return audioRef.current?.duration || 0;
  }, []);

  return {
    synthesizeAndPlay,
    stop,
    isPlaying,
    error,
    getCurrentTime,
    getDuration,
  };
};
