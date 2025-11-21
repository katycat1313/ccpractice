import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * useStreamingTranscription
 * 
 * React hook for real-time transcription using Deepgram API
 * Sends audio chunks as they're recorded and gets live transcript updates
 * 
 * Usage:
 * const { startStreaming, stopStreaming, currentTranscript, isConnected } = useStreamingTranscription();
 */

export const useStreamingTranscription = () => {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const pendingBlob = useRef(null);
  const processingRef = useRef(false);

  /**
   * Start recording and streaming to Deepgram
   */
  const startStreaming = useCallback(async (stream) => {
    try {
      setIsConnected(true);
      setError(null);
      setCurrentTranscript('');
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(500); // Send chunks every 500ms
      console.log('[Streaming] Started real-time transcription');

      // Stream chunks to transcription service
      const streamInterval = setInterval(async () => {
        if (audioChunksRef.current.length > 0 && !processingRef.current) {
          processingRef.current = true;
          
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];

            // Send to Supabase function for transcription
            const { data, error: transcriptError } = await supabase.functions.invoke('speech-to-text', {
              body: audioBlob,
              headers: { 'Content-Type': 'audio/webm' },
            });

            if (transcriptError) {
              console.error('[Streaming] Transcription error:', transcriptError);
              setError(transcriptError.message);
            } else if (data?.transcript) {
              // Append new transcript to running total
              setCurrentTranscript(prev => prev + (prev ? ' ' : '') + data.transcript);
              console.log('[Streaming] Partial: "' + data.transcript + '"');
            }
          } catch (err) {
            console.error('[Streaming] Stream processing error:', err);
            setError(err.message);
          } finally {
            processingRef.current = false;
          }
        }
      }, 1000); // Process every 1 second

      // Store interval ID for cleanup
      mediaRecorderRef.current._streamInterval = streamInterval;

      return true;
    } catch (error) {
      console.error('[Streaming] Start error:', error);
      setError(error.message);
      setIsConnected(false);
      return false;
    }
  }, []);

  /**
   * Stop streaming and get final transcript
   */
  const stopStreaming = useCallback(async () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = async () => {
          // Process any remaining audio chunks
          if (audioChunksRef.current.length > 0) {
            try {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              audioChunksRef.current = [];

              const { data, error: transcriptError } = await supabase.functions.invoke('speech-to-text', {
                body: audioBlob,
                headers: { 'Content-Type': 'audio/webm' },
              });

              if (!transcriptError && data?.transcript) {
                setCurrentTranscript(prev => prev + (prev ? ' ' : '') + data.transcript);
                console.log('[Streaming] Final chunk: "' + data.transcript + '"');
              }
            } catch (err) {
              console.error('[Streaming] Final chunk error:', err);
            }
          }

          // Cleanup
          if (mediaRecorderRef.current._streamInterval) {
            clearInterval(mediaRecorderRef.current._streamInterval);
          }

          setIsConnected(false);
          console.log('[Streaming] Stopped. Final transcript:', currentTranscript);
          resolve(currentTranscript);
        };

        mediaRecorderRef.current.stop();
      } else {
        resolve(currentTranscript);
      }
    });
  }, [currentTranscript]);

  /**
   * Reset transcript for new session
   */
  const reset = useCallback(() => {
    setCurrentTranscript('');
    audioChunksRef.current = [];
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current?._streamInterval) {
        clearInterval(mediaRecorderRef.current._streamInterval);
      }
    };
  }, []);

  return {
    startStreaming,
    stopStreaming,
    reset,
    currentTranscript,
    isConnected,
    error,
  };
};