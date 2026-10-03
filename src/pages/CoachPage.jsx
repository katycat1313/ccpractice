import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  FileText, 
  Edit3, 
  RotateCcw, 
  ChevronDown, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  ArrowLeft,
  Pause,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  FolderOpen,
  Play,
  ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import IframeMicModal from '../components/IframeMicModal';
import { playTelephoneRing, playPickupClick, playHangupClick } from '../lib/soundUtils';
import { askGeminiCoach, getGeminiTTSAudio, getGeminiApiKey } from '../lib/geminiClient';
import { getCoachMemory, extractMemoryFromInput, generateMemoryAwareFallback } from '../lib/coachMemory';
import { getCustomProspects, getSelectedProspectId, setSelectedProspectId } from '../lib/prospectManager';
import { saveRecording, formatSeconds } from '../lib/recordingsService';
import { 
  saveScriptToScriptsPage, 
  pullUpScript, 
  openPracticeSession, 
  resolveAppRoute,
  COACH_ALL_WHITELISTED_TOOLS,
  COACH_SYSTEM_PROMPT_ENHANCED,
  BUILTIN_TEMPLATES
} from '../lib/coachActions';
import { GoogleGenAI } from '@google/genai';

const SCRIPT_TEMPLATES = BUILTIN_TEMPLATES;

export default function CoachPage({ setScript: setGlobalScript }) {
  const navigate = useNavigate();

  // Prospect State
  const [prospectsList, setProspectsList] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);

  // Script State
  const [activeScript, setActiveScript] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_active_script');
      return saved ? JSON.parse(saved) : SCRIPT_TEMPLATES[0];
    } catch (_) {
      return SCRIPT_TEMPLATES[0];
    }
  });

  // Action status toast
  const [actionToast, setActionToast] = useState(null);
  const showActionToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Sync activeScript dynamically across applet
  useEffect(() => {
    const handleScriptUpdated = () => {
      try {
        const saved = localStorage.getItem('scriptmaster_active_script');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.hook || parsed.problem)) {
            setActiveScript(parsed);
          }
        }
      } catch (_) {}
    };
    window.addEventListener('scriptmaster_script_updated', handleScriptUpdated);
    return () => window.removeEventListener('scriptmaster_script_updated', handleScriptUpdated);
  }, []);

  // UI Drawer / Modal Toggles
  const [isScriptDrawerOpen, setIsScriptDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [scriptEditDraft, setScriptEditDraft] = useState(null);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Call & Recording State
  const [isRinging, setIsRinging] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const maxCallTime = 120; // 2 minutes drill target

  // Audio / Speech
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [coachMemory, setCoachMemory] = useState(() => getCoachMemory());

  // Conversation Messages
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_coach_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // References
  const timerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const activeAudioRef = useRef(null);
  const recognitionRef = useRef(null);
  const hasSpokenInitialRef = useRef(false);

  // Load Prospects
  useEffect(() => {
    const list = getCustomProspects();
    setProspectsList(list);
    const activeId = getSelectedProspectId();
    const found = list.find(p => p.id === activeId) || list[0];
    setSelectedProspect(found);

    const handleProspectUpdate = () => {
      const updated = getCustomProspects();
      setProspectsList(updated);
      const currId = getSelectedProspectId();
      setSelectedProspect(updated.find(p => p.id === currId) || updated[0]);
    };

    window.addEventListener('scriptmaster_prospects_updated', handleProspectUpdate);
    return () => {
      window.removeEventListener('scriptmaster_prospects_updated', handleProspectUpdate);
    };
  }, []);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('scriptmaster_coach_messages', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // Scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Initial Coach greeting (Runs once, never loops if messages exist)
  useEffect(() => {
    if (messages.length > 0) return;

    const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    const memory = getCoachMemory();
    const userName = memory.userName || (user.name && user.name !== 'Sales Rep' ? user.name.split(' ')[0] : 'there');
    const userProduct = memory.productOrService || user.whatISell || 'your product';

    const greetingText = `Hey ${userName}! Ready to practice your pitch for **${userProduct}**?\n\nToggle **"View Script"** to peek at your 20-second hook, then tap the center button whenever you're ready to dial ${selectedProspect?.name || "Carl 'Mac' McIntyre"}.`;
    const spokenGreeting = `Hey ${userName}! Tap the record button whenever you're ready to practice dialing ${selectedProspect?.name || "Carl 'Mac' McIntyre"}.`;

    const initMsg = {
      id: `init-${Date.now()}`,
      speaker: 'Coach',
      name: 'Marcus (AI Coach)',
      text: greetingText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([initMsg]);

    if (!hasSpokenInitialRef.current) {
      hasSpokenInitialRef.current = true;
      speakSpeech(spokenGreeting, 'marcus');
    }
  }, [selectedProspect]);

  // Speech Helper
  const speakSpeech = async (text, persona = 'marcus') => {
    if (!text || isAgentMuted) return;

    const cleanText = text
      .replace(/[*_#`~|]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return;

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch (_) {}
    }
    window.speechSynthesis?.cancel();

    setIsAgentSpeaking(true);

    try {
      const voiceId = persona === 'hank' ? 'Charon' : 'Fenrir';
      const gender = persona === 'sarah' || persona === 'elena' ? 'female' : 'male';
      const ttsRes = await getGeminiTTSAudio(cleanText, voiceId, gender, persona);
      
      if (ttsRes && ttsRes.audioBase64) {
        const audio = new Audio(`data:${ttsRes.mimeType || 'audio/wav'};base64,${ttsRes.audioBase64}`);
        activeAudioRef.current = audio;
        audio.onended = () => setIsAgentSpeaking(false);
        audio.onerror = () => fallbackBrowserSpeak(cleanText, gender);
        await audio.play();
        return;
      }
    } catch (_) {}

    fallbackBrowserSpeak(cleanText, persona === 'sarah' || persona === 'elena' ? 'female' : 'male');
  };

  const fallbackBrowserSpeak = (text, gender = 'male') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAgentSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = gender === 'female' ? 1.05 : 0.95;
      const voices = window.speechSynthesis.getVoices() || [];
      const match = voices.find(v => v.lang.startsWith('en') && (gender === 'female' ? /female|zira|samantha/i.test(v.name) : /male|david|alex/i.test(v.name)));
      if (match) utterance.voice = match;
      utterance.onend = () => setIsAgentSpeaking(false);
      utterance.onerror = () => setIsAgentSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      setIsAgentSpeaking(false);
    }
  };

  // Mic toggle
  const toggleMic = () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsIframeMicModalOpen(true);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) handleSendMessage(transcript);
      };
      recognition.onerror = (e) => {
        setIsListening(false);
        if (isInIframe || e?.error === 'not-allowed') {
          setIsIframeMicModalOpen(true);
        }
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListening(false);
      if (isInIframe) {
        setIsIframeMicModalOpen(true);
      }
    }
  };

  // Start Call
  const handleStartCall = async () => {
    if (isCallActive || isRinging) return;

    setIsRinging(true);
    setCallDuration(0);
    playTelephoneRing(1.8);

    setTimeout(() => {
      setIsRinging(false);
      setIsCallActive(true);
      playPickupClick();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      const greeting = selectedProspect?.greeting || "Hank speaking. What's this about? I've got two minutes before I get on this roof.";
      const prospectMsg = {
        id: `prosp-${Date.now()}`,
        speaker: 'Prospect',
        name: `${selectedProspect?.name || 'Hank Miller'}`,
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, prospectMsg]);
      speakSpeech(greeting, 'hank');
    }, 2000);
  };

  // Stop Call
  const handleStopCall = () => {
    if (!isCallActive && !isRinging) return;

    setIsCallActive(false);
    setIsRinging(false);
    playHangupClick();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(callDuration, 15);
    const scoreVal = Math.min(96, Math.max(74, 75 + Math.floor(Math.random() * 20)));

    saveRecording({
      title: `Practice with ${selectedProspect?.name || 'Prospect'}`,
      prospectName: selectedProspect ? `${selectedProspect.name} (${selectedProspect.companyName})` : 'Target Prospect',
      scriptTitle: activeScript?.title || 'Cold Call Script',
      duration,
      notes: `Pitch score: ${scoreVal}/100. Call duration: ${formatSeconds(duration)}.`
    });

    const debriefMsg = {
      id: `debrief-${Date.now()}`,
      speaker: 'Coach',
      name: 'Marcus (AI Coach)',
      text: `Call stopped at **${formatSeconds(duration)}** (Score: **${scoreVal}/100**). Recording saved! Click the edit icon below if you want to tweak your script before running another rep.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, debriefMsg]);
    speakSpeech(`Call stopped. Score is ${scoreVal}. You can edit your script or dial again whenever you're ready.`);
  };

  // =========================================================================
  // COACH ACTIONS ENGINE: Direct tool calling & real actions across the app
  // =========================================================================
  const executeCoachAction = (actionName, args = {}) => {
    let summary = '';
    const safeArgs = args || {};

    switch (actionName) {
      case 'saveScriptToScriptsPage':
      case 'saveScript':
      case 'saveScriptToLibrary': {
        const scriptPayload = {
          ...activeScript,
          ...(safeArgs.title ? { title: safeArgs.title, name: safeArgs.title } : {}),
          ...(safeArgs.hook ? { hook: safeArgs.hook } : {}),
          ...(safeArgs.problem ? { problem: safeArgs.problem } : {}),
          ...(safeArgs.value ? { value: safeArgs.value } : {}),
          ...(safeArgs.closingAsk ? { closingAsk: safeArgs.closingAsk } : {})
        };
        saveScriptToScriptsPage(scriptPayload);
        setActiveScript(scriptPayload);
        if (setGlobalScript) setGlobalScript(scriptPayload);
        showActionToast(`Saved "${scriptPayload.title || scriptPayload.name}" to Scripts page!`);
        summary = `Saved "${scriptPayload.title || scriptPayload.name}" to Scripts page (/saved-scripts)`;
        break;
      }

      case 'pullUpScript':
      case 'loadScript': {
        const queryTerm = safeArgs.query || safeArgs.scriptId || safeArgs.title || safeArgs.name || '';
        const pullRes = pullUpScript(queryTerm);
        if (pullRes.success && pullRes.script) {
          setActiveScript(pullRes.script);
          if (setGlobalScript) setGlobalScript(pullRes.script);
          showActionToast(`Pulled up "${pullRes.script.title || pullRes.script.name}"`);
          summary = `Pulled up "${pullRes.script.title || pullRes.script.name}" onto active board and teleprompter`;
        } else {
          showActionToast(pullRes.message);
          summary = pullRes.message;
        }
        break;
      }

      case 'openPracticeSession':
      case 'launchPracticeStudio': {
        if (safeArgs.prospectId || safeArgs.personaId) {
          setSelectedProspectId(safeArgs.prospectId || safeArgs.personaId);
        }
        saveScriptToScriptsPage(activeScript);
        summary = 'Opening Practice Session in Studio...';
        showActionToast('Opening Practice Session in Studio...');
        setTimeout(() => {
          navigate('/practice');
        }, 400);
        break;
      }

      case 'navigateToPage':
      case 'goToPage': {
        const targetRoute = resolveAppRoute(safeArgs.page || safeArgs.destination || safeArgs.target || safeArgs.route);
        summary = `Navigating to ${targetRoute}...`;
        showActionToast(`Opening ${targetRoute}...`);
        setTimeout(() => {
          navigate(targetRoute);
        }, 400);
        break;
      }

      case 'updateActiveScript':
      case 'buildScript': {
        const updates = {};
        if (safeArgs.title) updates.title = safeArgs.title;
        if (safeArgs.hook) updates.hook = safeArgs.hook;
        if (safeArgs.problem) updates.problem = safeArgs.problem;
        else if (safeArgs.jobsitePain) updates.problem = safeArgs.jobsitePain;
        if (safeArgs.value) updates.value = safeArgs.value;
        else if (safeArgs.solutionValue) updates.value = safeArgs.solutionValue;
        if (safeArgs.closingAsk) updates.closingAsk = safeArgs.closingAsk;
        if (safeArgs.rebuttals && Array.isArray(safeArgs.rebuttals)) {
          updates.rebuttals = safeArgs.rebuttals.map(r => ({
            objection: r.objection || r.pushback || '',
            response: r.response || r.rebuttal || r.answer || ''
          }));
        }

        const next = { ...activeScript, ...updates };
        setActiveScript(next);
        localStorage.setItem('scriptmaster_active_script', JSON.stringify(next));
        localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('scriptmaster_script_updated'));
        if (setGlobalScript) setGlobalScript(next);

        if (safeArgs.saveToScriptsPage || safeArgs.addToScripts) {
          saveScriptToScriptsPage(next);
        }

        showActionToast('Updated active script document');
        summary = `Built/updated script document (${Object.keys(updates).join(', ')})`;
        break;
      }

      default:
        console.warn('Unknown coach action:', actionName);
    }

    return summary;
  };

  // Helper to parse JSON action blocks from response text
  const parseActionBlockFromText = (text) => {
    if (!text) return null;
    try {
      const match = text.match(/```(?:json)?\s*({[\s\S]*?"action"[\s\S]*?})\s*```/i);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      const rawMatch = text.match(/({[\s\S]*?"action"\s*:\s*"[a-zA-Z0-9_]+"[\s\S]*?})/);
      if (rawMatch && rawMatch[1]) {
        return JSON.parse(rawMatch[1]);
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // Quick Action Buttons Handler
  const handleExecuteQuickAction = (actionKey) => {
    switch (actionKey) {
      case 'saveScriptToScriptsPage': {
        executeCoachAction('saveScriptToScriptsPage', activeScript);
        const coachMsg = {
          id: `coach-${Date.now()}`,
          speaker: 'Coach',
          name: 'Marcus (AI Coach)',
          text: `Locked in! I saved "${activeScript?.title || 'your script'}" and added it directly to your Scripts page (/saved-scripts). You can practice it or pull it up anytime!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolExecuted: { action: 'saveScriptToScriptsPage', summary: 'Saved to Scripts Page (/saved-scripts)' }
        };
        setMessages(prev => [...prev, coachMsg]);
        speakSpeech(`Saved to your scripts page!`);
        break;
      }
      case 'pullUpScript': {
        const pullRes = pullUpScript('carl');
        if (pullRes.success && pullRes.script) {
          setActiveScript(pullRes.script);
          if (setGlobalScript) setGlobalScript(pullRes.script);
          const coachMsg = {
            id: `coach-${Date.now()}`,
            speaker: 'Coach',
            name: 'Marcus (AI Coach)',
            text: `Pulled up "${pullRes.script.title || pullRes.script.name}" onto your active board and teleprompter!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            toolExecuted: { action: 'pullUpScript', summary: `Loaded "${pullRes.script.title || pullRes.script.name}"` }
          };
          setMessages(prev => [...prev, coachMsg]);
          speakSpeech(`Pulled up ${pullRes.script.title || 'your script'}`);
        }
        break;
      }
      case 'openPracticeSession': {
        executeCoachAction('openPracticeSession', { prospectId: selectedProspect?.id });
        const coachMsg = {
          id: `coach-${Date.now()}`,
          speaker: 'Coach',
          name: 'Marcus (AI Coach)',
          text: `Opening your live practice session in Practice Studio! Dialing ${selectedProspect?.name || 'target contractor'}...`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolExecuted: { action: 'openPracticeSession', summary: 'Opening Practice Studio...' }
        };
        setMessages(prev => [...prev, coachMsg]);
        break;
      }
      case 'goToBuilder': {
        navigate('/script-builder');
        break;
      }
      case 'goToScripts': {
        navigate('/saved-scripts');
        break;
      }
      case 'goToRecordings': {
        navigate('/recordings');
        break;
      }
      default:
        break;
    }
  };

  // Send message
  const handleSendMessage = async (customText = null) => {
    const text = (customText || inputText).trim();
    if (!text) return;

    const updatedMem = extractMemoryFromInput(text, coachMemory);
    setCoachMemory(updatedMem);

    const userMsg = {
      id: `usr-${Date.now()}`,
      speaker: 'You',
      name: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setIsThinking(true);

    if (isCallActive) {
      try {
        const response = await askGeminiCoach({
          systemPrompt: `You are ${selectedProspect?.name || 'Hank Miller'}, owner of ${selectedProspect?.companyName || 'Miller HVAC'}.
Persona: ${selectedProspect?.skepticism || 'Skeptical contractor in truck cab'}.
Pain: ${selectedProspect?.bleedingNeckPain || 'Losing money on unbilled materials'}.
CRITICAL RULES:
1. Speak 1 to 2 crisp, realistic spoken sentences directly as the prospect on the phone.
2. If the user used a respectful 20-second contract or offered thermal imaging/demo, show slight curiosity.
3. If they talk too long without asking a question, hit them with a realistic objection like 'Send me an email' or 'We have a guy'.`,
          messages: nextMessages,
          userMessage: text,
          currentBusiness: selectedProspect,
          stage: 'live_cold_call',
          userMemory: updatedMem
        });

        setIsThinking(false);
        const reply = response?.text || generateMemoryAwareFallback({
          userMessage: text,
          memory: updatedMem,
          currentProspect: selectedProspect,
          isCallActive: true,
          agentHat: 'prospect'
        });

        const prospectMsg = {
          id: `prosp-${Date.now()}`,
          speaker: 'Prospect',
          name: `${selectedProspect?.name || 'Hank Miller'}`,
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, prospectMsg]);
        speakSpeech(reply, 'hank');
      } catch (err) {
        setIsThinking(false);
        console.warn('Call error:', err);
      }
      return;
    }

    // =========================================================================
    // COACH MARCUS: Mentorship Dialogue & App Action Execution
    // =========================================================================
    const lowerText = text.toLowerCase();
    let replyText = '';
    let executedAction = null;

    // Action 1: Save script to scripts page / library
    if (
      lowerText.includes('save') && 
      (lowerText.includes('script') || lowerText.includes('page') || lowerText.includes('library') || lowerText.includes('it') || lowerText.includes('this') || lowerText.includes('board'))
    ) {
      const summary = executeCoachAction('saveScriptToScriptsPage', activeScript);
      executedAction = { action: 'saveScriptToScriptsPage', summary };
      replyText = `Locked in! I saved "${activeScript?.title || 'your script'}" and added it directly to your Scripts page (/saved-scripts). You can pull it up or review your saved templates there anytime!`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 2: Pull up script
    if (
      lowerText.includes('pull up') || 
      lowerText.includes('load script') || 
      lowerText.includes('open script') ||
      lowerText.includes('show saved scripts') ||
      lowerText.includes('bring up') ||
      (lowerText.includes('load') && (lowerText.includes('carl') || lowerText.includes('hvac') || lowerText.includes('delbert') || lowerText.includes('roofing')))
    ) {
      const summary = executeCoachAction('pullUpScript', { query: text });
      executedAction = { action: 'pullUpScript', summary };
      replyText = summary || `Pulled up "${activeScript?.title || 'your script'}" onto your active board and teleprompter!`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 3: Open Practice Session
    if (
      lowerText.includes('open practice') ||
      lowerText.includes('start practice') ||
      lowerText.includes('let\'s practice') ||
      lowerText.includes('take it to the studio') ||
      lowerText.includes('take this to practice') ||
      lowerText.includes('launch practice') ||
      lowerText.includes('drill')
    ) {
      const summary = executeCoachAction('openPracticeSession', { prospectId: selectedProspect?.id });
      executedAction = { action: 'openPracticeSession', summary };
      replyText = `Opening your live practice session in Practice Studio! Dialing ${selectedProspect?.name || 'your target contractor'} with your active teleprompter.`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 4: App Navigation
    if (
      (lowerText.includes('go to') || lowerText.includes('take me to') || lowerText.includes('show') || lowerText.includes('view') || lowerText.includes('open')) &&
      (lowerText.includes('recording') || lowerText.includes('dashboard') || lowerText.includes('setting') || lowerText.includes('saved scripts') || lowerText.includes('scripts page') || lowerText.includes('builder'))
    ) {
      const summary = executeCoachAction('navigateToPage', { page: text });
      executedAction = { action: 'navigateToPage', summary };
      replyText = summary || "Navigating there now!";

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 5: Build / Inject Handled Script
    if (
      lowerText.includes('handled') || 
      lowerText.includes('route 60') || 
      (lowerText.includes('build') && (lowerText.includes('script') || lowerText.includes('pitch'))) ||
      (lowerText.includes('create') && (lowerText.includes('script') || lowerText.includes('pitch')))
    ) {
      const handledTpl = BUILTIN_TEMPLATES[0];
      const summary = executeCoachAction('updateActiveScript', handledTpl);
      executedAction = { action: 'updateActiveScript', summary };
      replyText = `Locked in! I built and updated your active script document with the Handled & Buddy field-ops pitch: Route 60 pattern interrupt hook, Sunday handwriting pain, Single Crew tier ($499 setup / $129/mo), and $250 upfront onboarding deposit ask. You can save it to your Scripts page or open a practice drill!`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // General AI Call with action block fallback
    try {
      const clientApiKey = getGeminiApiKey();
      if (clientApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientApiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...messages.slice(-6).map(m => ({
                role: m.speaker === 'You' ? 'user' : 'model',
                parts: [{ text: m.text }]
              })),
              {
                role: 'user',
                parts: [{ text: text }]
              }
            ],
            config: {
              systemInstruction: COACH_SYSTEM_PROMPT_ENHANCED,
              temperature: 0.7,
              tools: [{ functionDeclarations: COACH_ALL_WHITELISTED_TOOLS }]
            }
          });

          // Check for native function calls
          const functionCalls = response?.functionCalls || [];
          if (functionCalls.length > 0) {
            const fc = functionCalls[0];
            const summary = executeCoachAction(fc.name, fc.args);
            executedAction = { action: fc.name, summary, args: fc.args };
            replyText = `Locked in! I executed your request: ${summary}`;
          }

          if (!replyText && response?.text) {
            replyText = response.text.trim();
          }
        } catch (clientErr) {
          console.warn('GoogleGenAI direct call notice:', clientErr);
        }
      }

      // Backend route fallback
      if (!replyText) {
        const response = await askGeminiCoach({
          systemPrompt: COACH_SYSTEM_PROMPT_ENHANCED,
          messages: nextMessages,
          userMessage: text,
          currentBusiness: selectedProspect,
          stage: 'script_building',
          userMemory: updatedMem
        });

        if (response?.text) {
          replyText = response.text.trim();
        }
      }

      // Fallback response if completely offline
      if (!replyText) {
        replyText = generateMemoryAwareFallback({
          userMessage: text,
          memory: updatedMem,
          currentProspect: selectedProspect,
          isCallActive: false,
          agentHat: 'coach'
        }) || "I'm with you. Tell me what to build, save to scripts page, or let me know when you're ready to open a practice session!";
      }

      // Parse JSON action block if returned in text
      const jsonAction = parseActionBlockFromText(replyText);
      if (jsonAction && jsonAction.action) {
        const summary = executeCoachAction(jsonAction.action, jsonAction.params || {});
        if (summary) {
          executedAction = { action: jsonAction.action, summary, args: jsonAction.params };
        }
        replyText = replyText.replace(/```(?:json)?\s*({[\s\S]*?"action"[\s\S]*?})\s*```/i, '').trim();
      }

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };

      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
    } catch (err) {
      setIsThinking(false);
      console.warn('Coach error:', err);
    }
  };

  // Open Edit Draft
  const handleOpenEdit = () => {
    setScriptEditDraft(JSON.parse(JSON.stringify(activeScript)));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!scriptEditDraft) return;
    setActiveScript(scriptEditDraft);
    localStorage.setItem('scriptmaster_active_script', JSON.stringify(scriptEditDraft));
    if (setGlobalScript) setGlobalScript(scriptEditDraft);
    setIsEditModalOpen(false);
  };

  // Scrubber calculation
  const progressPercent = Math.min(100, Math.round((callDuration / maxCallTime) * 100));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar />

      {/* Global Action Toast Notification */}
      {actionToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-indigo-500/50 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold shadow-xs border border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          {/* Target Prospect Selector */}
          <div className="relative">
            <select
              value={selectedProspect?.id || ''}
              onChange={(e) => {
                const found = prospectsList.find(p => p.id === e.target.value);
                if (found) {
                  setSelectedProspect(found);
                  setSelectedProspectId(found.id);
                }
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-full px-3.5 py-1.5 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-xs transition"
            >
              {prospectsList.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name} · {p.companyName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Right Floating Actions: View Script & Audio Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScriptDrawerOpen(!isScriptDrawerOpen)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                isScriptDrawerOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isScriptDrawerOpen ? 'Close Script' : 'View Script'}</span>
            </button>

            <button
              onClick={() => setIsAgentMuted(!isAgentMuted)}
              className={`p-1.5 rounded-full border text-xs transition cursor-pointer shadow-xs ${
                isAgentMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isAgentMuted ? "Audio muted" : "Audio active"}
            >
              {isAgentMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* Collapsible Translucent Frosted Teleprompter Card */}
        {isScriptDrawerOpen && (
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 backdrop-blur-md animate-fadeIn flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  20-Second Opening Hook ({activeScript?.title})
                </h3>
              </div>
              <button
                onClick={handleOpenEdit}
                className="text-xs text-indigo-400 font-semibold hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
              "{activeScript?.hook}"
            </p>

            {activeScript?.rebuttals?.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
                {activeScript.rebuttals.map((r, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                    <span className="font-semibold text-indigo-300">"{r.objection}": </span>
                    <span>{r.response}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* CENTERPIECE: AUDIO-FIRST CALL STUDIO */}
        {/* ======================================================== */}
        <div className="bg-slate-900/70 rounded-2xl border border-slate-800/80 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden shadow-2xl">
          
          {/* Top Status Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2.5 h-2.5 rounded-full ${isCallActive ? 'bg-rose-500 animate-ping' : isRinging ? 'bg-amber-400 animate-bounce' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isCallActive ? `Live Call with ${selectedProspect?.name || 'Prospect'}` : isRinging ? 'Connecting Call...' : 'Voice Practice Studio'}
            </span>
          </div>

          {/* If in iframe, persistent helper link to open in full window */}
          {isInIframe && (
            <button
              type="button"
              onClick={() => setIsIframeMicModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer mb-2 animate-pulse"
              title="Click to open app in full window to use microphone"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>In Preview iFrame? Click to open full window &amp; enable mic</span>
            </button>
          )}

          {/* LARGE GLOWING VOICE ORB WITH SOFT RADIAL RIPPLES */}
          <div className="relative flex items-center justify-center my-6">
            
            {/* Layered soft radial ripples pulsing to cadence */}
            {isCallActive && (
              <>
                <div className="absolute w-64 h-64 rounded-full bg-indigo-500/15 animate-ping pointer-events-none" />
                <div className="absolute w-52 h-52 rounded-full bg-purple-500/20 animate-pulse pointer-events-none" />
              </>
            )}

            {/* Central Glowing Voice Orb */}
            <button
              onClick={() => {
                if (isCallActive) {
                  handleStopCall();
                } else {
                  if (isInIframe) {
                    setIsIframeMicModalOpen(true);
                    return;
                  }
                  handleStartCall();
                }
              }}
              className={`w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 relative cursor-pointer group ${
                isCallActive
                  ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 shadow-[0_0_50px_rgba(244,63,94,0.45)] scale-105'
                  : isRinging
                  ? 'bg-gradient-to-tr from-[#f59e0b] via-[#ea580c] to-[#f97316] shadow-[0_0_40px_rgba(245,158,11,0.35)] animate-bounce'
                  : 'bg-gradient-to-tr from-[#6366F1] via-[#7c3aed] to-[#8b5cf6] shadow-[0_12px_40px_rgba(99,102,241,0.35)] hover:scale-105 hover:shadow-[0_12px_50px_rgba(99,102,241,0.5)]'
              }`}
              title={isCallActive ? "Tap to end voice call" : "Tap to start voice call"}
            >
              {isCallActive ? (
                <div className="text-center text-white">
                  <Pause className="w-8 h-8 mx-auto mb-1 animate-pulse" />
                  <span className="text-2xl font-bold font-mono tracking-tight block">
                    {formatSeconds(callDuration)}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-200 tracking-wider uppercase mt-0.5 block">
                    Tap to End Call
                  </span>
                </div>
              ) : isRinging ? (
                <div className="text-center text-white">
                  <PhoneCall className="w-8 h-8 mx-auto animate-bounce mb-1" />
                  <span className="text-xs font-semibold">Calling...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Mic className="w-10 h-10 mb-1.5 drop-shadow" />
                  <span className="text-xs font-bold tracking-wider uppercase text-white">
                    Start Voice Call
                  </span>
                  <span className="text-[10px] text-indigo-200 mt-0.5 font-medium">
                    Tap to Dial
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Waveform Frequency Bars */}
          <div className="flex items-center justify-center gap-1.5 h-6 my-2">
            {[6, 12, 18, 24, 14, 26, 18, 10, 22, 14, 28, 18, 10, 22, 14, 18, 8, 12].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isCallActive ? 'bg-gradient-to-t from-indigo-500 to-purple-400' : 'bg-slate-800'
                }`}
                style={{
                  height: isCallActive ? `${Math.max(4, h * 0.9)}px` : '4px'
                }}
              />
            ))}
          </div>

          {/* Scrubber Timeline Displaying MM:SS */}
          <div className="w-full max-w-md px-2 py-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-slate-300">{formatSeconds(callDuration)}</span>
              <span className="text-[10px] font-sans text-slate-500 uppercase tracking-wider">
                Call Timeline
              </span>
              <span>{formatSeconds(maxCallTime)}</span>
            </div>

            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls Row with Primary Voice Call / Mic Button */}
          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="flex items-center justify-center gap-6">
              
              {/* Reset Button */}
              <button
                onClick={() => {
                  setCallDuration(0);
                  if (isCallActive) handleStopCall();
                }}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Reset Drill"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Primary Voice Mic Button */}
              {!isCallActive && !isRinging ? (
                <button
                  onClick={() => {
                    if (isInIframe) {
                      setIsIframeMicModalOpen(true);
                      return;
                    }
                    handleStartCall();
                  }}
                  className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transition hover:scale-105 active:scale-95 cursor-pointer group"
                  title="Voice Button: Start Cold Call"
                >
                  <Mic className="w-7 h-7 fill-white" />
                </button>
              ) : (
                <button
                  onClick={handleStopCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
                  title="Voice Button: Stop Call & Save"
                >
                  <Pause className="w-7 h-7 fill-white" />
                </button>
              )}

              {/* Quick Edit Button */}
              <button
                onClick={handleOpenEdit}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-indigo-400 transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Quick Edit Script"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 tracking-wide mt-1">
              {isCallActive ? "Live call in progress • Tap red to stop" : "Voice Button • Tap purple mic to dial"}
            </span>
          </div>

        </div>

        {/* ======================================================== */}
        {/* STREAMLINED CONVERSATION & COACH FEEDBACK */}
        {/* ======================================================== */}
        <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 sm:p-7 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Dialogue & Feedback
            </h3>
            <span className="text-[11px] text-slate-400">
              {isCallActive ? `Speaking with ${selectedProspect?.name || 'Prospect'}` : 'Marcus Vance Mentorship'}
            </span>
          </div>

          <div 
            ref={chatContainerRef}
            className="space-y-3 max-h-[260px] overflow-y-auto pr-1 text-xs"
          >
            {messages.map((m) => {
              const isUser = m.speaker === 'You';
              const isProspect = m.speaker === 'Prospect';

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl leading-relaxed flex flex-col gap-1 ${
                    isUser
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100 ml-10'
                      : isProspect
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 mr-10'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-300 mr-10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className={isUser ? 'text-indigo-400' : isProspect ? 'text-amber-400' : 'text-slate-400'}>
                      {m.name || m.speaker}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">{m.time}</span>
                  </div>

                  <div className="text-xs font-normal whitespace-pre-wrap">
                    {m.text}
                  </div>

                  {m.toolExecuted && (
                    <div className="mt-2 pt-2 border-t border-indigo-500/20 flex items-center gap-2 text-[11px] font-semibold text-indigo-300 bg-indigo-950/40 px-2.5 py-1.5 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{m.toolExecuted.summary || 'Action Executed on App'}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {isThinking && (
              <div className="p-3 rounded-xl bg-slate-950/60 text-slate-400 text-xs flex items-center gap-2 italic border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Coach Actions Toolbar: Lets user or coach immediately take action across the app */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('saveScriptToScriptsPage')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Save current pitch and add it directly to the Scripts Page (/saved-scripts)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Save to Scripts Page</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('pullUpScript')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Pull up Carl McIntyre or saved pitch onto teleprompter"
            >
              <FolderOpen className="w-3 h-3 text-indigo-400" />
              <span>Pull Up Scripts</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('openPracticeSession')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Open live Practice Studio session with teleprompter"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Open Practice Session</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('goToBuilder')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Open full Script Builder"
            >
              <Edit3 className="w-3 h-3 text-sky-400" />
              <span>Script Builder</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('goToScripts')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="View all saved scripts"
            >
              <FileText className="w-3 h-3 text-purple-400" />
              <span>Saved Scripts Page</span>
            </button>
          </div>

          {/* Minimalist Input Bar with Voice Button */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            {/* Live speech recognition mic button */}
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-full border transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isListening
                  ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={isListening ? "Listening with mic... click to stop" : "Voice input: Click to speak your answer"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-400" />}
              <span className="text-[10px] hidden sm:inline font-semibold">
                {isListening ? "Listening..." : "Voice"}
              </span>
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isListening ? "Listening to your voice..." : isCallActive ? "Type your live rebuttal or answer..." : "Ask coach for advice..."}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            {/* Voice Dictation Mic Button */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2 rounded-full border transition flex items-center justify-center shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-md shadow-rose-600/40'
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-indigo-400 hover:text-white'
              }`}
              title={isListening ? "Listening with mic... click to stop" : "Voice dictation (Click to speak into mic)"}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isThinking}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-40 cursor-pointer shadow-md transition"
            >
              Send
            </button>
          </div>
        </div>

      </main>

      {/* QUICK SCRIPT EDIT MODAL */}
      {isEditModalOpen && scriptEditDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Edit Practice Script</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Script Title</label>
              <input
                type="text"
                value={scriptEditDraft.title || ''}
                onChange={(e) => setScriptEditDraft({ ...scriptEditDraft, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-indigo-600 mb-1 uppercase tracking-wider">
                Opening Hook (First 20 Seconds)
              </label>
              <textarea
                rows={3}
                value={scriptEditDraft.hook || ''}
                onChange={(e) => setScriptEditDraft({ ...scriptEditDraft, hook: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-700">Objection Rebuttals</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextRebs = [
                      ...(scriptEditDraft.rebuttals || []),
                      { objection: 'New objection', response: 'Empathetic validation + counter-question.' }
                    ];
                    setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                  }}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(scriptEditDraft.rebuttals || []).map((reb, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-amber-700">Objection #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextRebs = scriptEditDraft.rebuttals.filter((_, idx) => idx !== i);
                          setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                        }}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={reb.objection}
                      onChange={(e) => {
                        const nextRebs = [...scriptEditDraft.rebuttals];
                        nextRebs[i].objection = e.target.value;
                        setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                    />

                    <input
                      type="text"
                      value={reb.response}
                      onChange={(e) => {
                        const nextRebs = [...scriptEditDraft.rebuttals];
                        nextRebs[i].response = e.target.value;
                        setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white text-xs font-semibold shadow-xs"
              >
                Save Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IFRAME MICROPHONE PERMISSION / OPEN FULL WINDOW MODAL */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />

    </div>
  );
}
