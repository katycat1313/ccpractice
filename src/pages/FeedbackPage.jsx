import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Navbar from '../components/Navbar';
import { ThumbsUp, TrendingUp, Send, User, Bot, Award, RotateCcw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/constants';

const FeedbackCard = ({ title, items, icon: Icon, color }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${color}`}>
        <Icon size={20} />
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

FeedbackCard.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
};

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
          <Bot size={18} />
        </div>
      )}
      <div className={`max-w-lg p-4 rounded-2xl text-sm leading-relaxed ${
        isUser 
          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-none shadow-md' 
          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none shadow-sm'
      }`}>
        <p>{message.text}</p>
      </div>
      {isUser && (
        <div className="bg-slate-700 p-2 rounded-xl text-slate-300">
          <User size={18} />
        </div>
      )}
    </div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    sender: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
};

export default function FeedbackPage({ feedback, transcript }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: "Great job completing your cold calling session! I'm your AI Sales Coach. Ask me how to sharpen your 50% deposit close, handle contractor skepticism, or pitch the AI Receptionist and Missed Call Text Back system." 
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userQuestion = input.trim();
    const userMessage = { sender: 'user', text: userQuestion };
    setInput('');

    // Dynamic sales coaching responses
    const lower = userQuestion.toLowerCase();
    let coachReply = "That's a key sales scenario. The secret with cold calling busy contractors or freelance clients is clarity, pattern interrupt, and removing upfront perceived risk.";

    if (lower.includes('deposit') || lower.includes('50%') || lower.includes('downpayment') || lower.includes('upfront') || lower.includes('cash')) {
      coachReply = "To close 50% deposits consistently: 1) Never apologize for the deposit—frame it as sprint reservation and dedicated engineering capacity. 2) Structure it with milestone escrow: 'You approve the staging build and database architecture at Milestone 1 before the final 50% is released.' 3) Remind them that shared financial commitment is what keeps the project on an aggressive 3-week delivery schedule.";
    } else if (lower.includes('contractor') || lower.includes('hank') || lower.includes('busy') || lower.includes('truck') || lower.includes('roof')) {
      coachReply = "When calling contractors in their truck: 1) Keep your opening under 20 seconds. 2) Mention unbilled change orders immediately—every contractor loses thousands when their crew does extra work on-site and forgets to document it. 3) Contrast your custom PaaS with Jobber/BuilderTrend: emphasize that your system only has 3 buttons so even tech-averse crews will actually use it.";
    } else if (lower.includes('receptionist') || lower.includes('ai phone') || lower.includes('robot') || lower.includes('voice')) {
      coachReply = "When prospects object that 'robots sound fake': Validate their concern! Say: 'You're 100% right, robotic 1-800 menus drive customers away. Our AI speaks in a warm, natural human cadence, gathers the job address and emergency photos, and alerts your cell immediately.' Then offer the instant proof: 'Can I text you our live demo number right now so you can test it on your cell?'";
    } else if (lower.includes('missed call') || lower.includes('text back') || lower.includes('sms')) {
      coachReply = "For Missed Call Text Back: Use the 90-second Google statistic. 85% of people looking for emergency trade services call the next competitor if they reach voicemail. Our automated 5-second SMS texts: 'Hey, sorry I missed your call—I'm on a job. What's the emergency?' Recovering just ONE $2,500 emergency job covers your software fee for the entire year.";
    } else if (lower.includes('email') || lower.includes('send me info')) {
      coachReply = "When a prospect says 'Just send me an email': Never just send the email! It gets buried. Say: 'I definitely can, but honestly you get 50 emails a day and it'll get lost. Give me 30 seconds: if it doesn't sound like it'll save your crew 5 hours a week, you can hang up. Fair enough?' This permission-based interrupt wins 70% of call continuations.";
    }

    setMessages((prev) => [...prev, userMessage, { sender: 'ai', text: coachReply }]);
  };

  const strengths = feedback?.strengths || [
    "Clear, direct introduction tailored to trade contractors",
    "Confident handling of objections without sounding defensive",
    "Framed the 50% deposit as a mutual milestone protection"
  ];

  const improvements = feedback?.improvements || [
    "Quantify the cost of missed calls earlier in the conversation ($3,000/week)",
    "Ask open-ended questions about how their crew currently logs change orders",
    "Close directly on the 10-minute screen share or live test number"
  ];

  const score = feedback?.score || 82;
  const prospectName = feedback?.prospect || 'Prospect';
  const duration = feedback?.duration || '01:45';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex-grow p-6 md:p-10 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-xs font-semibold text-emerald-300 mb-2">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Practice Session Performance Report
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Call Review: {prospectName}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Call Duration: <span className="text-indigo-400 font-mono font-bold">{duration}</span> • Pitch Score: <span className="text-emerald-400 font-bold">{score}/100</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.PRACTICE)}
              className="py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Practice Again
            </button>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="py-3 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Strengths & Improvements Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FeedbackCard 
            title="What You Executed Well" 
            items={strengths} 
            icon={ThumbsUp} 
            color="text-emerald-400" 
          />
          <FeedbackCard 
            title="Tactical Improvements for Next Call" 
            items={improvements} 
            icon={TrendingUp} 
            color="text-amber-400" 
          />
        </div>

        {/* Transcript Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200">
              Full Call Transcript
            </h3>
            <span className="text-xs text-slate-500">Recorded for training & coaching</span>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 max-h-60 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {transcript || 'No transcript generated for this session.'}
          </div>
        </div>

        {/* Interactive Conversational Coach */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ask Your AI Sales Coach</h2>
              <p className="text-xs text-slate-400">
                Ask how to handle specific contractor objections, negotiate 50% downpayments, or polish your script.
              </p>
            </div>
          </div>

          <div className="space-y-4 h-80 overflow-y-auto mb-4 p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-grow bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. How do I convince a skeptical contractor to pay 50% deposit upfront?"
            />
            <button
              onClick={handleSend}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl transition flex items-center justify-center shadow-lg"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

FeedbackPage.propTypes = {
  feedback: PropTypes.shape({
    score: PropTypes.number,
    strengths: PropTypes.arrayOf(PropTypes.string),
    improvements: PropTypes.arrayOf(PropTypes.string),
    objectionsHandled: PropTypes.arrayOf(PropTypes.string),
    depositPitched: PropTypes.bool,
    prospect: PropTypes.string,
    duration: PropTypes.string,
  }),
  transcript: PropTypes.string,
};
