import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ORCHESTRATOR_CONFIG, API_ENDPOINTS } from '../config/constants';
import { logger } from '../lib/logger';

/**
 * useAIResponseOrchestrator
 * 
 * Manages timing of AI prospect responses and pre-generation
 * Coordinates with audio analyzer to predict turn completion
 * 
 * Usage:
 * const { startOrchestration, stopOrchestration, getQueuedResponse, isGenerating } = useAIResponseOrchestrator();
 */

export const useAIResponseOrchestrator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [queuedResponse, setQueuedResponse] = useState(null);
  const [responseHistory, setResponseHistory] = useState([]);
  const [error, setError] = useState(null);

  const orchestrationLoopRef = useRef(null);
  const lastGenerationTimeRef = useRef(0);
  const generationDebounceRef = useRef(ORCHESTRATOR_CONFIG.GENERATION_DEBOUNCE_MS);

  /**
   * Generate prospect response using AI
   * Called predictively before user finishes speaking
   */
  const generateProspectResponse = useCallback(
    async (conversationHistory, difficulty, transcript = '') => {
      const now = Date.now();

      // Debounce: don't generate if we just generated
      if (now - lastGenerationTimeRef.current < generationDebounceRef.current) {
        logger.debug('Orchestrator', 'Debouncing response generation');
        return null;
      }

      lastGenerationTimeRef.current = now;
      setIsGenerating(true);

      try {
        logger.info('Orchestrator', 'Generating response', { difficulty });

        const { data: responseData, error: responseError } = await supabase.functions.invoke(
          API_ENDPOINTS.GENERATE_PROSPECT_RESPONSE,
          {
            body: {
              conversationHistory,
              difficulty,
            },
          }
        );

        if (responseError) {
          logger.error('Orchestrator', 'Generation error', responseError);
          setError(responseError.message);
          return null;
        }

        if (responseData?.responseText) {
          const response = {
            id: `response-${Date.now()}`,
            speaker: 'Prospect',
            text: responseData.responseText,
            timestamp: now,
            difficulty,
          };

          logger.success('Orchestrator', 'Response generated', { preview: response.text.substring(0, 60) });
          setQueuedResponse(response);
          setResponseHistory(prev => [...prev, response]);

          return response;
        } else {
          logger.error('Orchestrator', 'No response text in data', responseData);
          return null;
        }
      } catch (error) {
        logger.error('Orchestrator', 'Unexpected error', error);
        setError(error.message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Get and consume the queued response
   * Returns the response and clears the queue
   */
  const getQueuedResponse = useCallback(() => {
    const response = queuedResponse;
    if (response) {
      setQueuedResponse(null);
    }
    return response;
  }, [queuedResponse]);

  /**
   * Start orchestration loop that monitors speech patterns and generates responses
   */
  const startOrchestration = useCallback(
    (audioAnalyzer, conversationHistory, difficulty, onResponseReady) => {
      logger.info('Orchestrator', 'Starting orchestration loop');

      const orchestrationLoop = setInterval(() => {
        if (!audioAnalyzer) return;

        const patterns = audioAnalyzer.getSpeechPatterns();

        // Predict turn completion with 1-2 second lookahead
        // Access state via refs to avoid stale closure
        const now = Date.now();
        const timeSinceLastGen = now - lastGenerationTimeRef.current;

        if (patterns.predictedTurnEnd && timeSinceLastGen >= generationDebounceRef.current) {
          logger.debug('Orchestrator', 'Turn completion predicted', { pauseLength: patterns.currentPauseLength });

          // Generate response while user is still paused
          generateProspectResponse(conversationHistory, difficulty);

          if (onResponseReady) {
            onResponseReady();
          }
        }
      }, ORCHESTRATOR_CONFIG.ORCHESTRATION_CHECK_INTERVAL_MS);

      orchestrationLoopRef.current = orchestrationLoop;
      return orchestrationLoop;
    },
    [generateProspectResponse]
  );

  /**
   * Stop orchestration loop
   */
  const stopOrchestration = useCallback(() => {
    if (orchestrationLoopRef.current) {
      clearInterval(orchestrationLoopRef.current);
      orchestrationLoopRef.current = null;
      logger.info('Orchestrator', 'Stopped orchestration loop');
    }
  }, []);

  /**
   * Manually trigger response generation
   * Useful for testing or manual advancement
   */
  const forceGenerateResponse = useCallback(
    (conversationHistory, difficulty) => {
      logger.info('Orchestrator', 'Forcing response generation');
      return generateProspectResponse(conversationHistory, difficulty);
    },
    [generateProspectResponse]
  );

  /**
   * Clear the queue and history
   */
  const reset = useCallback(() => {
    setQueuedResponse(null);
    setResponseHistory([]);
    setError(null);
    setIsGenerating(false);
    lastGenerationTimeRef.current = 0;
    logger.info('Orchestrator', 'Reset');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopOrchestration();
    };
  }, [stopOrchestration]);

  return {
    generateProspectResponse,
    getQueuedResponse,
    startOrchestration,
    stopOrchestration,
    forceGenerateResponse,
    reset,
    isGenerating,
    queuedResponse,
    responseHistory,
    error,
  };
};
