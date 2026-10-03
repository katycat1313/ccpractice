import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  BookOpen, 
  Award,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import { PROSPECTS } from '../lib/prospects';
import AudioPermissionModal from '../components/AudioPermissionModal';
import { speakWithDeepgram, DEEPGRAM_VOICES, getDeepgramApiKey, stopDeepgramAudio } from '../lib/deepgramService';

export default function PracticePageSimple({ 
  onClose, 
  prospect: incomingProspect, 
  script, 
  difficulty = 'medium',
  callStage = 'call1',
  callStrategy = 'callback',
  setFeedback,
  setTranscript
}) {
  const navigate = useNavigate();

  // Active prospect resolution
  const activeProspect = incomingProspect || PROSPECTS.hank;

  // Call states
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProspectSpeaking, setIsProspectSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [scriptZoom, setScriptZoom] = useState(1);
  const [activeTab, setActiveTab] = useState('script'); // 'script' | 'rebuttals'
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);

  // Live sales coach metrics
  const [objectionsEncountered, setObjectionsEncountered] = useState([]);
  const [depositCloseAttempted, setDepositCloseAttempted] = useState(false);
  const [liveCoachTip, setLiveCoachTip] = useState('Dial the call to practice with your target prospect.');
  const [talkRatio, setTalkRatio] = useState({ you: 0, prospect: 0 });

  // References
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProspectSpeaking]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDeepgramAudio();
      try {
        window.speechSynthesis?.cancel();
      } catch (_) {}
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  // Format timer MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Rebuttal Cheat Sheet tailored to the offerings
  const REBUTTALS = [
    {
      title: '50% Downpayment / Upfront Deposit Pushback',
      tag: 'Closing & Cash Flow',
      objection: '"Why should I pay a 50% deposit before you deliver anything? Can\'t I pay 100% on completion?"',
      rebuttal: 'I completely understand the concern—plenty of agencies take deposits and disappear. The 50% deposit reserves your dedicated engineering sprint exclusively on our calendar and covers cloud setup. We use milestone escrow: you test Milestone 1 and approve the live build before the final 50% is released. That way our risk is equally shared.',
      actionPrompt: 'Use 50% Milestone Rebuttal'
    },
    {
      title: 'Already Use Jobber / BuilderTrend / Paper',
      tag: 'Contractor PaaS',
      objection: '"We already have BuilderTrend / Jobber or our guys just use carbon paper invoices."',
      rebuttal: 'Most contractors we speak with hated BuilderTrend because it costs $400/mo and field crews refuse to touch it. Our PaaS is custom-built with only the 3 buttons your guys need on-site: 1-click change orders, sub tracking, and instant mobile customer sign-off so you get paid in 48 hours.',
      actionPrompt: 'Use PaaS Differentiation'
    },
    {
      title: 'Robots Sound Fake / Don\'t Want AI Calling',
      tag: 'AI Receptionist',
      objection: '"I don\'t want some robotic voice ticking off my customers when they call for service."',
      rebuttal: 'Completely agree—robotic phone trees drive customers to competitors. This is a natural, conversational voice trained specifically on your emergency service guidelines. It screens caller details, emergency address, and schedules jobs onto your board 24/7 so you never lose a $3,000 emergency water heater job while your hands are full.',
      actionPrompt: 'Use AI Realism Rebuttal'
    },
    {
      title: 'Missed Call Text Back Value Question',
      tag: 'Missed Call Text Back',
      objection: '"If I miss a call, I usually just call them back when I get out of the crawlspace."',
      rebuttal: 'Here is what the data shows: 85% of homeowners looking for emergency repair call the next company on Google within 90 seconds if they hit voicemail. Our automated 5-second SMS texts them: "Hey, sorry I missed your call—I\'m on a job. What\'s the emergency?" It locks them in before they dial your competitor.',
      actionPrompt: 'Use 5-Second SMS Proof'
    },
    {
      title: '"Just Send Me An Email / I\'m Busy Right Now"',
      tag: 'Pattern Interrupt',
      objection: '"I\'m in my truck heading to a job site. Just send an email and I\'ll look later."',
      rebuttal: 'I know you\'re busy and I don\'t want to clog your inbox with an email that will get buried. Give me 20 seconds: if it doesn\'t make sense for your crew, you can hang up on me. Fair enough?',
      actionPrompt: 'Use 20-Second Permission'
    }
  ];

  // Parse nodes from script prop
  const scriptNodes = (() => {
    if (!script) return [];
    if (script.nodes && Array.isArray(script.nodes)) return script.nodes;
    if (script.content) {
      try {
        const parsed = JSON.parse(script.content);
        return parsed.nodes || [];
      } catch (_) {}
    }
    return [];
  })();

  // Text-To-Speech (Deepgram Aura Realistic Voice with Browser Fallback)
  const speakText = useCallback(async (text) => {
    if (isMuted) return;
    stopDeepgramAudio();

    const dgKey = getDeepgramApiKey();
    if (dgKey) {
      try {
        setIsProspectSpeaking(true);
        const isFemale = activeProspect.voice?.gender === 'FEMALE';
        const model = isFemale ? DEEPGRAM_VOICES.CONTRACTOR_FEMALE : DEEPGRAM_VOICES.CONTRACTOR_MALE;
        await speakWithDeepgram({
          text,
          model,
          onStart: () => setIsProspectSpeaking(true),
          onEnd: () => setIsProspectSpeaking(false),
          onError: () => {
            setIsProspectSpeaking(false);
          }
        });
        return;
      } catch (err) {
        console.warn('Deepgram Aura synthesis error in practice, falling back:', err);
      }
    }

    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = activeProspect.voice?.rate || 1.0;
      utterance.pitch = activeProspect.voice?.pitch || 1.0;
      window._activeSimpleUtterance = utterance;

      const voices = window.speechSynthesis.getVoices();
      const isFemale = activeProspect.voice?.gender === 'FEMALE';
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && (isFemale ? /female|samantha|zira|karen|victoria/i.test(v.name) : /male|daniel|david|george|alex/i.test(v.name))
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsProspectSpeaking(true);
      utterance.onend = () => {
        setIsProspectSpeaking(false);
        window._activeSimpleUtterance = null;
      };
      utterance.onerror = () => {
        setIsProspectSpeaking(false);
        try { window.speechSynthesis.resume(); } catch (_) {}
      };

      window.speechSynthesis.speak(utterance);

      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (_) {}
      }, 50);
    } catch (_) {
      setIsProspectSpeaking(false);
    }
  }, [activeProspect, isMuted]);

  // Speech Recognition (Microphone)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLiveCoachTip('Speech Recognition not supported in this browser. You can type or click quick replies.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveCoachTip('🎙️ Listening to your voice... Speak your pitch naturally.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleUserSpeak(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Start Call
  const handleStartCall = () => {
    setIsCallActive(true);
    setCallDuration(0);
    setMessages([]);
    setObjectionsEncountered([]);
    setDepositCloseAttempted(false);
    setActiveNodeIndex(0);

    // Initial prospect opening based on persona and difficulty
    let openingText = "Hello?";
    if (activeProspect.id === 'hank') {
      openingText = difficulty === 'hard' 
        ? "Miller Roofing, Hank speaking. Make it quick, I'm pulling up to a job site."
        : "Hank speaking, who's this?";
    } else if (activeProspect.id === 'dave') {
      openingText = difficulty === 'hard'
        ? "Flow Pro Plumbing, Dave here. Look, my hands are in a sink, what's going on?"
        : "Yeah, this is Dave, what do you need?";
    } else if (activeProspect.id === 'elena') {
      openingText = "Apex Custom Builds, Elena here. What's this regarding?";
    } else if (activeProspect.id === 'julian') {
      openingText = "Julian Thorne. Who's calling?";
    }

    const firstMsg = {
      id: 'msg-init',
      speaker: 'Prospect',
      name: activeProspect.name,
      text: openingText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([firstMsg]);
    setLiveCoachTip('Prospect answered! Deliver your Pattern Interrupt and state why you called.');
    speakText(openingText);
  };

  // End Call & Compute Feedback
  const handleEndCall = () => {
    window.speechSynthesis?.cancel();
    stopListening();
    setIsCallActive(false);

    // Calculate score
    const youMessages = messages.filter(m => m.speaker === 'You');
    const totalWordCount = messages.reduce((acc, m) => acc + m.text.split(' ').length, 0);
    const youWordCount = youMessages.reduce((acc, m) => acc + m.text.split(' ').length, 0);

    const talkRatioPercentage = totalWordCount > 0 ? Math.round((youWordCount / totalWordCount) * 100) : 50;
    setTalkRatio({ you: talkRatioPercentage, prospect: 100 - talkRatioPercentage });

    const formattedTranscript = messages
      .map(m => `[${m.time}] ${m.speaker} (${m.name}): ${m.text}`)
      .join('\n\n');

    const strengths = [];
    const improvements = [];

    if (depositCloseAttempted) {
      strengths.push('Directly addressed and pitched the 50% upfront deposit with milestone risk reversal.');
    } else {
      improvements.push('Remember to close with confidence on the 50% deposit sprint reservation to secure cash flow.');
    }

    if (objectionsEncountered.length > 0) {
      strengths.push(`Successfully navigated ${objectionsEncountered.length} tough buyer objections (${objectionsEncountered.join(', ')}).`);
    } else {
      improvements.push('Dig deeper into their operational headaches before presenting the solution.');
    }

    if (talkRatioPercentage >= 40 && talkRatioPercentage <= 65) {
      strengths.push(`Maintained an ideal conversational talk ratio (${talkRatioPercentage}% You / ${100 - talkRatioPercentage}% Prospect).`);
    } else if (talkRatioPercentage > 65) {
      improvements.push(`You dominated ${talkRatioPercentage}% of the conversation. Pause more and ask open-ended questions.`);
    } else {
      strengths.push('Allowed the prospect room to explain their frustrations and scheduling pains.');
    }

    strengths.push('Maintained steady composure and tailored the message to trade contractor realities.');
    improvements.push('Quantify the cost of missed calls or lost change orders earlier in the pitch ($3,000/week).');

    const feedbackReport = {
      score: depositCloseAttempted ? 88 : 74,
      strengths,
      improvements,
      objectionsHandled: objectionsEncountered,
      depositPitched: depositCloseAttempted,
      prospect: activeProspect.name,
      duration: formatTime(callDuration)
    };

    if (setFeedback) setFeedback(feedbackReport);
    if (setTranscript) setTranscript(formattedTranscript);

    navigate(ROUTES.FEEDBACK);
  };

  // Core Prospect AI Simulation Engine
  const generateProspectResponse = (userText) => {
    const text = userText.toLowerCase();

    // Check for 50% deposit / payment discussion
    if (text.includes('50%') || text.includes('deposit') || text.includes('downpayment') || text.includes('milestone')) {
      setDepositCloseAttempted(true);
      if (!objectionsEncountered.includes('50% Downpayment Pushback')) {
        setObjectionsEncountered(prev => [...prev, '50% Downpayment Pushback']);
      }

      if (difficulty === 'hard' && !text.includes('escrow') && !text.includes('sprint') && !text.includes('milestone')) {
        setLiveCoachTip('⚠️ Prospect is pushing back on the deposit! Explain the milestone release and sprint protection.');
        return "Wait, 50% upfront before you build anything? I've been burned by developers taking deposits and vanishing. Can't we do 100% when it's live?";
      } else {
        setLiveCoachTip('🎯 Excellent! The prospect understands the milestone guarantee.');
        return "Okay, as long as that second 50% is contingent on me testing the staging portal and approving Milestone 1, that protects both of us. Send over the agreement.";
      }
    }

    // Check for Contractor PaaS topics
    if (text.includes('paas') || text.includes('contractor') || text.includes('change order') || text.includes('subcontractor') || text.includes('dispatch') || text.includes('jobber') || text.includes('buildertrend')) {
      if (difficulty === 'hard') {
        if (!objectionsEncountered.includes('Existing Software Bloat')) {
          setObjectionsEncountered(prev => [...prev, 'Existing Software Bloat']);
        }
        setLiveCoachTip('⚠️ Contractor is skeptical about software complexity. Focus on the 2-button on-site crew simplicity!');
        return "Look, we tried Jobber and BuilderTrend last year. It was $350 a month, too damn complicated, and my guys in the field wouldn't touch it. Why would yours be any different?";
      } else {
        setLiveCoachTip('💡 Good pitch! Contrast your custom platform with bloated off-the-shelf apps.');
        return "Change orders are actually a huge headache for us—my guys forget to bill extras all the time. How hard is it for a crew of 6 guys to learn?";
      }
    }

    // Check for AI Receptionist & Missed Call topics
    if (text.includes('receptionist') || text.includes('missed call') || text.includes('text back') || text.includes('phone') || text.includes('emergency') || text.includes('answer')) {
      if (difficulty === 'hard') {
        if (!objectionsEncountered.includes('Robotic Answering Fear')) {
          setObjectionsEncountered(prev => [...prev, 'Robotic Answering Fear']);
        }
        setLiveCoachTip('⚠️ Prospect fears robotic phone trees. Highlight natural voice and instant emergency triage.');
        return "I get sales calls all day, and I don't want robots answering my customer calls. People in an emergency want to talk to a human. Won't they just hang up?";
      } else {
        setLiveCoachTip('💡 Prospect is curious! Offer to text them a demo phone number to test-call.');
        return "To be honest, we lost a huge $4,000 commercial pipe burst last Tuesday because I was stuck on a highway and didn't check voicemail until 4 PM. How fast does the text back fire?";
      }
    }

    // Check for Pricing / Cost objection
    if (text.includes('cost') || text.includes('price') || text.includes('how much') || text.includes('rate') || text.includes('charge')) {
      setLiveCoachTip('💡 Anchor the price against the $3,000 lost revenue of a single missed job, then offer the 50% kickoff.');
      return "What kind of money are we talking about here? I run a tight ship and I'm not looking to burn budget.";
    }

    // Check for "Busy / Send email" objection
    if (text.includes('email') || text.includes('busy') || text.includes('send info') || text.includes('time')) {
      return "Yeah, I really don't have time to chit-chat. Can't you just email me a brochure or price sheet?";
    }

    // Check for meeting / CTA close
    if (text.includes('thursday') || text.includes('tomorrow') || text.includes('demo') || text.includes('screen share') || text.includes('15 minutes') || text.includes('calendar') || text.includes('call you')) {
      if (difficulty === 'hard' && messages.length < 4) {
        setLiveCoachTip('⚠️ Give a brief reason why 10 minutes will save them 10 hours a week before locking the time.');
        return "I'm slammed all week. Why should I block out 15 minutes for this?";
      } else {
        setLiveCoachTip('🎉 Meeting agreed! Confirm their email or phone number and close the call.');
        return "Alright, you've got my attention. Shoot an invite to my email or text my cell for Thursday at 9 AM.";
      }
    }

    // Default progressive responses
    const turnCount = messages.length;
    if (turnCount <= 2) {
      if (activeProspect.id === 'hank') {
        return "I'm in my truck heading to inspect a roof right now. Give me 20 seconds—what's this actually about?";
      } else if (activeProspect.id === 'dave') {
        return "What company did you say you're with? And how did you get this number?";
      } else {
        return "Go ahead, you have a minute. What do you have for me?";
      }
    } else if (turnCount <= 4) {
      return "Okay, that sounds fine in theory, but everyone claims they can save us time. What makes your system actually different for someone in my trade?";
    } else {
      return "Alright, what's the next step if I wanted to see how this works for my business?";
    }
  };

  // Handle salesperson speaking / typing
  const handleUserSpeak = (text) => {
    if (!text || !text.trim() || !isCallActive) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      speaker: 'You',
      name: 'You (Sales Rep)',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserInput('');

    // Advance script node highlight if possible
    setActiveNodeIndex((prev) => Math.min(prev + 1, Math.max(0, scriptNodes.length - 1)));

    // Generate prospect reply with slight realistic pause
    setIsProspectSpeaking(true);
    setTimeout(() => {
      const prospectReply = generateProspectResponse(text);
      const prospectMsg = {
        id: `prosp-${Date.now()}`,
        speaker: 'Prospect',
        name: activeProspect.name,
        text: prospectReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, prospectMsg]);
      speakText(prospectReply);
    }, 900);
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleUserSpeak(userInput);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-slate-100 font-sans">
      <AudioPermissionModal />
      {/* LEFT PANEL: Script & Rebuttal HUD */}
      <div className="w-1/2 flex flex-col border-r border-slate-800 bg-slate-900/90 overflow-hidden">
        {/* Left Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('script')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'script'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Sales Script ({scriptNodes.length} Nodes)
            </button>
            <button
              onClick={() => setActiveTab('rebuttals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'rebuttals'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Battle Rebuttals (50% Deposit & PaaS)
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setScriptZoom(Math.max(0.7, scriptZoom - 0.1))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 font-mono w-10 text-center">
              {Math.round(scriptZoom * 100)}%
            </span>
            <button
              onClick={() => setScriptZoom(Math.min(1.5, scriptZoom + 0.1))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: Script Flow */}
        {activeTab === 'script' && (
          <div 
            className="flex-1 p-6 overflow-y-auto space-y-4"
            style={{ fontSize: `${scriptZoom * 100}%` }}
          >
            {scriptNodes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                <h4 className="text-base font-semibold text-slate-200">No script nodes loaded</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  You can still practice! Use the Battle Rebuttals tab or speak freely into the microphone.
                </p>
              </div>
            ) : (
              scriptNodes.map((node, idx) => {
                const isYou = node.data?.speaker === 'You';
                const isCurrent = idx === activeNodeIndex;
                return (
                  <div
                    key={node.id || idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50 shadow-md'
                        : isYou
                        ? 'border-blue-900/40 bg-blue-950/20'
                        : 'border-purple-900/40 bg-purple-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isYou ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          {isYou ? '🎯 YOU SAY' : '👤 PROSPECT SAYS'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Step #{idx + 1}</span>
                      </div>
                      {isYou && isCallActive && (
                        <button
                          onClick={() => handleUserSpeak(node.data?.text)}
                          className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-900/60 hover:bg-indigo-700 px-2.5 py-1 rounded-md transition flex items-center gap-1"
                        >
                          Use Line <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-200 leading-relaxed">
                      {node.data?.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Rebuttal Vault */}
        {activeTab === 'rebuttals' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="bg-amber-950/40 border border-amber-600/30 rounded-xl p-3.5 text-xs text-amber-200 mb-2">
              <span className="font-bold">💡 Pro Tip for 50% Deposits & Contractor Deals:</span> Contractors fear losing control and clients fear runaway scope. Anchor value on concrete milestone deliverables (Milestone 1 prototype approval before final 50%).
            </div>

            {REBUTTALS.map((reb, i) => (
              <div key={i} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {reb.title}
                  </span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                    {reb.tag}
                  </span>
                </div>
                <div className="text-xs italic text-rose-300/90 mb-2 bg-slate-900/60 p-2 rounded">
                  {reb.objection}
                </div>
                <div className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 border border-slate-700/60 p-3 rounded-lg mb-2.5">
                  <span className="font-bold text-emerald-400">Battle Rebuttal: </span>
                  {reb.rebuttal}
                </div>
                {isCallActive && (
                  <button
                    onClick={() => handleUserSpeak(reb.rebuttal)}
                    className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>🎯</span> {reb.actionPrompt}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live Sales Coach HUD Bottom Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Sales Coach Intelligence
            </span>
          </div>
          <p className="text-xs text-indigo-200/90 bg-indigo-950/50 border border-indigo-800/50 rounded-lg p-2.5">
            {liveCoachTip}
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Live Call Simulator */}
      <div className="w-1/2 flex flex-col bg-slate-950">
        {/* Call Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${activeProspect.color || 'bg-indigo-600'} flex items-center justify-center text-xl shadow-lg overflow-hidden border border-slate-700`}>
              {activeProspect.image ? (
                <img src={activeProspect.image} alt={activeProspect.name} className="w-full h-full object-cover" />
              ) : (
                activeProspect.avatar || '👤'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{activeProspect.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {difficulty.toUpperCase()} RESISTANCE
                </span>
              </div>
              <p className="text-xs text-indigo-400 font-medium">{activeProspect.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {formatTime(callDuration)}
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-lg border transition ${
                isMuted
                  ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition"
            >
              Exit Arena
            </button>
          </div>
        </div>

        {/* Prospect Status Banner */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isCallActive ? 'bg-emerald-400 opacity-75' : 'bg-slate-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCallActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="text-slate-300 font-medium">
              {isCallActive ? (isProspectSpeaking ? '🔊 Prospect is speaking...' : '🟢 Call connected (In Progress)') : '⚪ Call disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {depositCloseAttempted && (
              <span className="text-[10px] bg-emerald-950 border border-emerald-600/40 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> 50% Deposit Pitched
              </span>
            )}
            {objectionsEncountered.length > 0 && (
              <span className="text-[10px] bg-amber-950 border border-amber-600/40 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                {objectionsEncountered.length} Objection(s) Handled
              </span>
            )}
          </div>
        </div>

        {/* Live Conversation Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {!isCallActive ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className={`w-20 h-20 rounded-2xl ${activeProspect.color || 'bg-indigo-600'} flex items-center justify-center text-3xl shadow-2xl mb-4 overflow-hidden border-2 border-indigo-500/40 ring-4 ring-indigo-500/20`}>
                {activeProspect.image ? (
                  <img src={activeProspect.image} alt={activeProspect.name} className="w-full h-full object-cover" />
                ) : (
                  activeProspect.avatar || '📞'
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Ready to Cold Call {activeProspect.name}?
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                {activeProspect.description}
              </p>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-w-md w-full mb-6 text-left">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Expected Buyer Friction:
                </div>
                <div className="text-xs text-amber-300 font-semibold mb-2">
                  "{activeProspect.objectionStyle}"
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Offering Match:
                </div>
                <div className="text-xs text-indigo-300">
                  {activeProspect.primaryPain || 'Needs streamlined operations and cash flow security.'}
                </div>
              </div>

              <button
                onClick={handleStartCall}
                className="py-3.5 px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-xl transition transform hover:scale-105 flex items-center gap-2"
              >
                <span>📞</span> Connect Call & Start Pitch
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <p className="text-sm font-semibold">Ringing phone...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isYou = msg.speaker === 'You';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-400">
                      {isYou ? '🎯 You (Sales Rep)' : `👤 ${msg.name}`}
                    </span>
                    <span className="text-[10px] text-slate-600">{msg.time}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-md leading-relaxed text-sm ${
                      isYou
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Call Controls & Microphone Area */}
        {isCallActive && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            {/* Quick-Prompt Response Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold whitespace-nowrap">
                Quick Lines:
              </span>
              <button
                onClick={() => handleUserSpeak("Hey, I know you're in the middle of a job—I'll be 20 seconds. We built a custom contractor management platform to stop change orders from slipping through the cracks.")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg whitespace-nowrap border border-slate-700 transition"
              >
                PaaS Pitch Hook
              </button>
              <button
                onClick={() => handleUserSpeak("Quick question: when you're under a sink and the phone rings, does that lead go to voicemail or to your competitor on Google? We set up a 24/7 AI Receptionist that books jobs directly.")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg whitespace-nowrap border border-slate-700 transition"
              >
                AI Receptionist Hook
              </button>
              <button
                onClick={() => handleUserSpeak("We structure our project with a 50% deposit to reserve your dedicated engineering sprint, with Milestone 1 demo verification before the remaining 50% is released.")}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 rounded-lg whitespace-nowrap transition"
              >
                Deploy 50% Deposit Close
              </button>
            </div>

            {/* Input Bar & Mic Buttons */}
            <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-xl border transition shadow-lg flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 border-rose-500 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-indigo-400 hover:text-white'
                }`}
                title={isListening ? 'Stop Listening' : 'Speak into Microphone'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isListening ? '🎙️ Listening to your voice... Speak now!' : 'Type your pitch line or click the microphone to speak...'}
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="submit"
                disabled={!userInput.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition"
                title="Send Speech"
              >
                <Send className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
              >
                <PhoneOff className="w-4 h-4" />
                End & Score
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

PracticePageSimple.propTypes = {
  onClose: PropTypes.func.isRequired,
  prospect: PropTypes.object,
  script: PropTypes.object,
  difficulty: PropTypes.string,
  setFeedback: PropTypes.func,
  setTranscript: PropTypes.func,
};
