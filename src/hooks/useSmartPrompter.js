import { useState, useCallback, useEffect } from 'react';

/**
 * useSmartPrompter
 *
 * Intelligent script navigation that:
 * 1. Detects intent from prospect responses
 * 2. Matches intent to script branches
 * 3. Suggests the most relevant next line
 * 4. Provides alternatives
 */

// Intent detection keywords and patterns
const INTENT_PATTERNS = {
  time_objection: {
    keywords: ['busy', 'time', 'call back', 'later', 'not now', 'in a meeting', 'rushing'],
    priority: 10,
    label: 'Time Objection',
  },
  price_objection: {
    keywords: ['expensive', 'cost', 'price', 'budget', 'afford', 'too much', 'cheaper'],
    priority: 10,
    label: 'Price Objection',
  },
  not_interested: {
    keywords: ['not interested', 'no thanks', 'don\'t need', 'already have', 'satisfied'],
    priority: 9,
    label: 'Not Interested',
  },
  ask_more: {
    keywords: ['tell me more', 'how does', 'what is', 'explain', 'interested', 'curious'],
    priority: 8,
    label: 'Interested / Asking Questions',
  },
  competitor_mention: {
    keywords: ['already using', 'competitor', 'current provider', 'happy with'],
    priority: 9,
    label: 'Competitor Mention',
  },
  authority_objection: {
    keywords: ['decision maker', 'boss', 'manager', 'team', 'not my call', 'need approval'],
    priority: 9,
    label: 'Authority Objection',
  },
  positive_response: {
    keywords: ['sounds good', 'interesting', 'yes', 'sure', 'okay', 'tell me', 'go ahead'],
    priority: 7,
    label: 'Positive Response',
  },
  neutral: {
    keywords: [],
    priority: 1,
    label: 'Neutral / General',
  },
};

/**
 * Detect intent from text using keyword matching
 */
function detectIntent(text) {
  if (!text) return { intent: 'neutral', confidence: 50, label: 'Neutral / General' };

  const lowerText = text.toLowerCase();
  const detectedIntents = [];

  // Check each intent pattern
  for (const [intentKey, pattern] of Object.entries(INTENT_PATTERNS)) {
    let matchCount = 0;
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      detectedIntents.push({
        intent: intentKey,
        confidence: Math.min(50 + (matchCount * 20), 95),
        priority: pattern.priority,
        label: pattern.label,
        matchCount,
      });
    }
  }

  // Sort by priority and confidence
  detectedIntents.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.confidence - a.confidence;
  });

  // Return best match or neutral
  if (detectedIntents.length > 0) {
    return detectedIntents[0];
  }

  return { intent: 'neutral', confidence: 50, label: 'Neutral / General' };
}

/**
 * Find matching script nodes based on intent
 */
function findScriptMatches(script, intent, conversationHistory) {
  if (!script || !script.nodes) return [];

  const matches = [];

  // Look for nodes with matching metadata
  for (const node of script.nodes) {
    // Skip prospect nodes (we want user nodes)
    if (node.data.speaker !== 'You') continue;

    // Check if node has intent metadata
    const nodeIntent = node.data.intent || node.data.type;

    if (nodeIntent && nodeIntent.toLowerCase().includes(intent.toLowerCase())) {
      matches.push({
        node,
        confidence: 90,
        reason: `Matches ${intent}`,
      });
    }
  }

  // If no exact matches, find nodes that haven't been used yet
  if (matches.length === 0) {
    const usedNodeIds = conversationHistory
      .filter(msg => msg.nodeId)
      .map(msg => msg.nodeId);

    const unusedUserNodes = script.nodes.filter(
      node => node.data.speaker === 'You' && !usedNodeIds.includes(node.id)
    );

    // Return first unused node with lower confidence
    if (unusedUserNodes.length > 0) {
      matches.push({
        node: unusedUserNodes[0],
        confidence: 60,
        reason: 'Next available response',
      });
    }
  }

  return matches;
}

export function useSmartPrompter(script) {
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [alternatives, setAlternatives] = useState([]);

  /**
   * Analyze the latest prospect response and update suggestions
   */
  const analyzeAndSuggest = useCallback((prospectResponse, conversationHistory = []) => {
    if (!prospectResponse || !script) {
      setCurrentSuggestion(null);
      setDetectedIntent(null);
      setAlternatives([]);
      return;
    }

    // Detect intent from prospect's response
    const intent = detectIntent(prospectResponse);
    setDetectedIntent(intent);

    console.log('[SmartPrompter] Detected intent:', intent);

    // Find matching script branches
    const matches = findScriptMatches(script, intent.intent, conversationHistory);

    if (matches.length > 0) {
      // Set primary suggestion
      const primary = matches[0];
      setCurrentSuggestion({
        text: primary.node.data.text,
        nodeId: primary.node.id,
        confidence: primary.confidence,
        reason: primary.reason,
      });

      // Set alternatives
      const alts = matches.slice(1, 4).map(match => ({
        text: match.node.data.text,
        nodeId: match.node.id,
        intent: match.reason,
      }));
      setAlternatives(alts);

      console.log('[SmartPrompter] Suggestion:', primary.node.data.text.substring(0, 50) + '...');
    } else {
      // No matches found - suggest generic response
      setCurrentSuggestion({
        text: 'Continue the conversation naturally...',
        nodeId: null,
        confidence: 30,
        reason: 'No specific script match',
      });
      setAlternatives([]);

      console.log('[SmartPrompter] No matches found for intent:', intent.intent);
    }
  }, [script]);

  /**
   * Manually set a suggestion (for alternative selection)
   */
  const setSuggestion = useCallback((text, nodeId = null, confidence = 100) => {
    setCurrentSuggestion({
      text,
      nodeId,
      confidence,
      reason: 'User selected',
    });
  }, []);

  /**
   * Reset the prompter
   */
  const reset = useCallback(() => {
    setCurrentSuggestion(null);
    setDetectedIntent(null);
    setAlternatives([]);
  }, []);

  /**
   * Get initial suggestion from script
   */
  useEffect(() => {
    if (script && script.nodes && !currentSuggestion) {
      // Find the first user node as initial suggestion
      const firstUserNode = script.nodes.find(node => node.data.speaker === 'You');
      if (firstUserNode) {
        setSuggestion(firstUserNode.data.text, firstUserNode.id, 100);
      }
    }
  }, [script, currentSuggestion, setSuggestion]);

  return {
    currentSuggestion,
    detectedIntent,
    alternatives,
    analyzeAndSuggest,
    setSuggestion,
    reset,
  };
}
