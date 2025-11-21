import { useRef, useCallback, useEffect } from 'react';

/**
 * useAudioAnalyzer
 * 
 * React hook for real-time audio analysis using Web Audio API
 * Detects speech/silence transitions, pause lengths, and turn-taking cues
 * 
 * Returns:
 * - startAnalysis(): Begin analyzing audio from stream
 * - stopAnalysis(): Stop analyzing
 * - getSpeechPatterns(): Get current detected patterns
 * - isCurrentlySpeaking: Boolean state
 * - pauseLength: Current pause duration in ms
 */

export const useAudioAnalyzer = (onSpeechEnd, onSpeechStart) => {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const processorRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  // Speech detection state
  const speechPatterns = useRef({
    avgPauseLength: 800,
    speakingRate: 150,
    minPauseForTurnEnd: 1200,
    sessionStartTime: null,
  });
  
  const silenceDetection = useRef({
    threshold: -40, // dB
    minSilenceDuration: 300, // ms
    lastSpeechTime: null,
    isSpeaking: false,
    pauseStartTime: null,
    pauseLength: 0,
  });

  /**
   * Initialize Web Audio API context and analyser
   */
  const initializeAudioContext = useCallback(async (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // Create data array for frequency analysis
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      // Connect microphone stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }, []);

  /**
   * Analyze audio frequency data and detect speech
   * Uses RMS (Root Mean Square) energy to determine if user is speaking
   */
  const analyzeAudioFrame = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    // Get frequency data
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS energy (indicates volume/speech)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Convert to dB scale (-100 to 0)
    const db = 20 * Math.log10(rms / 255);

    // Determine if currently speaking
    const isSpeaking = db > silenceDetection.current.threshold;

    // Handle speech state transitions
    handleSpeechStateChange(isSpeaking);

    return {
      rms,
      db,
      isSpeaking,
      pauseLength: silenceDetection.current.pauseLength,
    };
  }, []);

  /**
   * Detect transitions between speaking and silence
   */
  const handleSpeechStateChange = useCallback((isSpeaking) => {
    const now = Date.now();
    const silence = silenceDetection.current;

    if (isSpeaking && !silence.isSpeaking) {
      // Speech started
      silence.isSpeaking = true;
      silence.lastSpeechTime = now;
      if (silence.pauseLength > 0) {
        updateSpeechPatterns(silence.pauseLength);
        silence.pauseLength = 0;
      }
      if (onSpeechStart) {
        onSpeechStart();
      }
    } else if (!isSpeaking && silence.isSpeaking) {
      // Speech ended - silence started
      silence.isSpeaking = false;
      silence.pauseStartTime = now;

      if (onSpeechEnd) {
        onSpeechEnd();
      }
    } else if (!isSpeaking && !silence.isSpeaking && silence.pauseStartTime) {
      // Update pause length during silence
      silence.pauseLength = now - silence.pauseStartTime;
    }
  }, [onSpeechStart, onSpeechEnd]);

  /**
   * Update speech patterns based on observed pauses and speaking rate
   */
  const updateSpeechPatterns = useCallback((pauseLength) => {
    const patterns = speechPatterns.current;

    // Exponential moving average for pause length
    const alpha = 0.3; // smoothing factor
    patterns.avgPauseLength = 
      alpha * pauseLength + (1 - alpha) * patterns.avgPauseLength;

    // Calculate minimum pause needed to signal turn completion
    patterns.minPauseForTurnEnd = patterns.avgPauseLength * 1.5;
  }, []);

  /**
   * Predict if user is about to finish speaking
   * Returns true if pause length suggests turn completion
   */
  const predictTurnCompletion = useCallback(() => {
    const silence = silenceDetection.current;
    const patterns = speechPatterns.current;

    if (!silence.isSpeaking && silence.pauseLength > 0) {
      // User is paused - check if pause length suggests turn end
      return silence.pauseLength > (patterns.avgPauseLength * 0.8);
    }

    return false;
  }, []);

  /**
   * Get current speech patterns
   */
  const getSpeechPatterns = useCallback(() => {
    return {
      ...speechPatterns.current,
      currentPauseLength: silenceDetection.current.pauseLength,
      isSpeaking: silenceDetection.current.isSpeaking,
      predictedTurnEnd: predictTurnCompletion(),
    };
  }, [predictTurnCompletion]);

  /**
   * Start analyzing audio from microphone stream
   */
  const startAnalysis = useCallback(async (stream) => {
    try {
      const initialized = await initializeAudioContext(stream);
      if (!initialized) return false;

      speechPatterns.current.sessionStartTime = Date.now();
      silenceDetection.current.lastSpeechTime = Date.now();

      // Animation frame loop for continuous analysis
      const analyzeLoop = () => {
        analyzeAudioFrame();
        processorRef.current = requestAnimationFrame(analyzeLoop);
      };

      analyzeLoop();
      return true;
    } catch (error) {
      console.error('Error starting analysis:', error);
      return false;
    }
  }, [analyzeAudioFrame, initializeAudioContext]);

  /**
   * Stop analyzing audio
   */
  const stopAnalysis = useCallback(() => {
    if (processorRef.current) {
      cancelAnimationFrame(processorRef.current);
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;
  }, []);

  /**
   * Adjust silence threshold for different environments
   * Lower = more sensitive, Higher = less sensitive
   */
  const setSensitivity = useCallback((sensitivity) => {
    // sensitivity: 0-100, default 50
    // Map to dB threshold: -60 to -20
    silenceDetection.current.threshold = -60 + (sensitivity / 100) * 40;
  }, []);

  /**
   * Reset patterns for new session
   */
  const resetPatterns = useCallback(() => {
    speechPatterns.current = {
      avgPauseLength: 800,
      speakingRate: 150,
      minPauseForTurnEnd: 1200,
      sessionStartTime: Date.now(),
    };

    silenceDetection.current = {
      threshold: -40,
      minSilenceDuration: 300,
      lastSpeechTime: Date.now(),
      isSpeaking: false,
      pauseStartTime: null,
      pauseLength: 0,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return {
    startAnalysis,
    stopAnalysis,
    getSpeechPatterns,
    predictTurnCompletion,
    setSensitivity,
    resetPatterns,
    // Direct access to current state
    get isSpeaking() {
      return silenceDetection.current.isSpeaking;
    },
    get pauseLength() {
      return silenceDetection.current.pauseLength;
    },
    get avgPauseLength() {
      return speechPatterns.current.avgPauseLength;
    },
  };
};

/**
 * Utility function: Get audio quality metrics
 * Helps diagnose recording issues
 */
export const getAudioMetrics = (analyser) => {
  if (!analyser) return null;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const max = Math.max(...dataArray);
  const min = Math.min(...dataArray);

  return {
    average,
    max,
    min,
    range: max - min,
    isNoisy: average > 50,
    isTooQuiet: max < 30,
  };
};