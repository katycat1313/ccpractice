import { useRef, useCallback, useState } from 'react';
import { createClient } from '@deepgram/sdk';
import { DEEPGRAM_CONFIG, AUDIO_CONFIG } from '../config/constants';
import { logger } from '../lib/logger';

/**
 * useDeepgramVoiceAgent
 *
 * Simple hook for DeepGram Voice Agent - handles voice input, AI conversation, and voice output
 * all in one WebSocket connection
 *
 * Usage:
 * const { startConversation, stopConversation, isConnected, messages } = useDeepgramVoiceAgent();
 */

export const useDeepgramVoiceAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const deepgramRef = useRef(null);
  const connectionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);

  /**
   * Start the voice agent conversation
   */
  const startConversation = useCallback(async (apiKey) => {
    try {
      logger.info('VoiceAgent', 'Starting conversation');
      setError(null);
      setMessages([]);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: AUDIO_CONFIG.ECHO_CANCELLATION,
          noiseSuppression: AUDIO_CONFIG.NOISE_SUPPRESSION,
          autoGainControl: AUDIO_CONFIG.AUTO_GAIN_CONTROL,
        }
      });
      mediaStreamRef.current = stream;
      logger.success('VoiceAgent', 'Microphone access granted');

      // Initialize Deepgram client
      const deepgram = createClient(apiKey);
      deepgramRef.current = deepgram;

      // Create voice agent connection
      const connection = deepgram.speak.live({
        model: DEEPGRAM_CONFIG.MODEL,
        encoding: DEEPGRAM_CONFIG.ENCODING,
        sample_rate: DEEPGRAM_CONFIG.SAMPLE_RATE,
      });
      connectionRef.current = connection;

      // Set up audio context for playback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Handle connection open
      connection.on('open', () => {
        logger.success('VoiceAgent', 'Connection opened');
        setIsConnected(true);
      });

      // Handle audio data from AI
      connection.on('audio', (audioData) => {
        logger.debug('VoiceAgent', 'Received audio from AI');
        // Play the audio
        playAudio(audioData, audioContext);
      });

      // Handle text responses
      connection.on('metadata', (metadata) => {
        logger.debug('VoiceAgent', 'Received metadata', metadata);
        if (metadata.text) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            speaker: 'AI',
            text: metadata.text,
            timestamp: Date.now(),
          }]);
        }
      });

      // Handle errors
      connection.on('error', (err) => {
        logger.error('VoiceAgent', 'Connection error', err);
        setError(err.message);
      });

      // Handle connection close
      connection.on('close', () => {
        logger.info('VoiceAgent', 'Connection closed');
        setIsConnected(false);
      });

      // Send audio from microphone to Deepgram
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && connection && connection.getReadyState() === 1) {
          connection.send(event.data);
        }
      };
      mediaRecorder.start(AUDIO_CONFIG.MEDIA_RECORDER_CHUNK_INTERVAL);

      logger.success('VoiceAgent', 'Conversation started successfully');
      return true;

    } catch (err) {
      logger.error('VoiceAgent', 'Failed to start conversation', err);
      setError(err.message);
      setIsConnected(false);
      return false;
    }
  }, []);

  /**
   * Stop the voice agent conversation
   */
  const stopConversation = useCallback(() => {
    logger.info('VoiceAgent', 'Stopping conversation');

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close connection
    if (connectionRef.current) {
      connectionRef.current.finish();
      connectionRef.current = null;
    }

    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    logger.success('VoiceAgent', 'Conversation stopped');
  }, []);

  /**
   * Play audio data
   */
  const playAudio = (audioData, audioContext) => {
    try {
      const audioBuffer = audioContext.createBuffer(
        1, // mono
        audioData.length / 2, // 16-bit samples
        AUDIO_CONFIG.SAMPLE_RATE
      );

      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(audioData.buffer);

      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      logger.error('VoiceAgent', 'Audio playback error', err);
    }
  };

  return {
    startConversation,
    stopConversation,
    isConnected,
    messages,
    error,
  };
};
