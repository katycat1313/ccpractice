import { useRef, useCallback, useState } from 'react';
import { GeminiLiveSession } from '../lib/geminiLiveClient';

export const useDeepgramVoiceAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);

  const startConversation = useCallback(async (_apiKey, personaPrompt = 'You are a sales prospect. Start by saying "Hello?"') => {
    try {
      setError(null);
      setMessages([]);
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }

      const session = new GeminiLiveSession({
        voiceName: 'Puck',
        systemInstruction: personaPrompt,
        initialPrompt: 'Answer the phone briefly in character.',
        onStateChange: (st) => {
          setIsConnected(['connected', 'listening', 'speaking', 'thinking'].includes(st));
        },
        onTurnComplete: (modelText) => {
          if (modelText) {
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), speaker: 'Prospect', text: modelText, timestamp: Date.now() },
            ]);
          }
        },
        onError: (err) => {
          setError(err?.message || 'Connection error');
        },
      });

      sessionRef.current = session;
      await session.start();
      return true;
    } catch (err) {
      setError(err?.message || 'Failed to start conversation');
      return false;
    }
  }, []);

  const stopConversation = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return { startConversation, stopConversation, isConnected, messages, error };
};
