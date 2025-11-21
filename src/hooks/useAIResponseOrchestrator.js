import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

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
  const generationDebounceRef = useRef(300); // ms - prevent duplicate requests

  /**
   * Generate prospect response using AI
   * Called predictively before user finishes speaking
   */
  const generateProspectResponse = useCallback(
    async (conversationHistory, difficulty, transcript = '') => {
      const now = Date.now();

      // Debounce: don't generate if we just generated
      if (now - lastGenerationTimeRef.current < generationDebounceRef.current) {
        console.log('[Orchestrator] Debouncing response generation');
        return null;
      }

      lastGenerationTimeRef.current = now;
      setIsGenerating(true);

      try {
        console.log('[Orchestrator] Generating response... (difficulty:', difficulty, ')');

        const { data: responseData, error: responseError } = await supabase.functions.invoke(
          'generate-prospect-response',
          {
            body: {
              conversationHistory,
              difficulty,
            },
          }
        );

        if (responseError) {
          console.error('[Orchestrator] Generation error:', responseError);
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

          console.log('[Orchestrator] Response generated:', response.text.substring(0, 60) + '...');
          setQueuedResponse(response);
          setResponseHistory(prev => [...prev, response]);

          return response;
        } else {
          console.error('[Orchestrator] No response text in data:', responseData);
          return null;
        }
      } catch (error) {
        console.error('[Orchestrator] Unexpected error:', error);
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
      console.log('[Orchestrator] Starting orchestration loop');

      const orchestrationLoop = setInterval(() => {
        if (!audioAnalyzer) return;

        const patterns = audioAnalyzer.getSpeechPatterns();

        // Predict turn completion with 1-2 second lookahead
        if (patterns.predictedTurnEnd && !isGenerating && !queuedResponse) {
          console.log('[Orchestrator] Turn completion predicted! pauseLength:', patterns.currentPauseLength);

          // Generate response while user is still paused
          generateProspectResponse(conversationHistory, difficulty);

          if (onResponseReady) {
            onResponseReady();
          }
        }
      }, 200); // Check every 200ms

      orchestrationLoopRef.current = orchestrationLoop;
      return orchestrationLoop;
    },
    [isGenerating, queuedResponse, generateProspectResponse]
  );

  /**
   * Stop orchestration loop
   */
  const stopOrchestration = useCallback(() => {
    if (orchestrationLoopRef.current) {
      clearInterval(orchestrationLoopRef.current);
      orchestrationLoopRef.current = null;
      console.log('[Orchestrator] Stopped orchestration loop');
    }
  }, []);

  /**
   * Manually trigger response generation
   * Useful for testing or manual advancement
   */
  const forceGenerateResponse = useCallback(
    (conversationHistory, difficulty) => {
      console.log('[Orchestrator] Forcing response generation');
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
    console.log('[Orchestrator] Reset');
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
