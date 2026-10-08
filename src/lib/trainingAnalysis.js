const FILLERS = /\b(um|uh|like|you know|basically|actually|sort of|kind of)\b/gi;

export function analyzeDelivery(turns = [], durationSeconds = 0, script = {}) {
  const userText = turns.filter((turn) => turn.speaker === 'You').map((turn) => turn.text || '').join(' ').trim();
  const words = userText ? userText.split(/\s+/).filter(Boolean) : [];
  const fillerWords = userText.match(FILLERS) || [];
  const wpm = durationSeconds > 0 ? Math.round((words.length / durationSeconds) * 60) : 0;
  const questions = (userText.match(/\?/g) || []).length;
  const hookWords = (script.hook || '').split(/\s+/).filter(Boolean).length;
  const qualificationTerms = ['problem', 'cost', 'how', 'when', 'currently', 'process', 'priority', 'why'];
  const qualificationSignals = qualificationTerms.filter((term) => userText.toLowerCase().includes(term));

  return {
    wordCount: words.length,
    wpm,
    fillerCount: fillerWords.length,
    fillerWords: [...new Set(fillerWords.map((word) => word.toLowerCase()))],
    questionCount: questions,
    qualificationSignals,
    hookWords,
    paceLabel: wpm === 0 ? 'No speech detected' : wpm < 110 ? 'Too slow' : wpm > 175 ? 'Too fast' : 'Conversational pace',
    nextDrill: fillerWords.length > 2 ? 'Repeat the hook with a clean pause instead of filler words.' : wpm > 175 ? 'Repeat the hook 20% slower with a full pause after the time contract.' : questions === 0 ? 'Repeat the discovery drill and ask one diagnostic question.' : 'Advance to the next objection drill.'
  };
}
