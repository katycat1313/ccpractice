import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Mic, StopCircle, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useDeepgramVoiceAgent } from '../hooks/useDeepgramVoiceAgent';

export default function PracticePageSimple({ onClose, prospect, script, difficulty }) {
  const { startConversation, stopConversation, isConnected, messages, error } = useDeepgramVoiceAgent();
  const [scriptZoom, setScriptZoom] = useState(1);
  
  const GEMINI_API_KEY = 'AIzaSyDGmyhHc4mkY6f-Cs28lbcK0AZBYywvEh4';

  const DEFAULT_PROSPECT = {
    name: 'Jamie Taylor',
    title: 'Homeowner',
    description: 'Professional and pragmatic. Polite but cautious with unsolicited calls.',
    personality: 'Professional & Neutral',
    objectionStyle: 'Asks clarifying questions, wants to understand value'
  };

  const buildPersonaPrompt = () => {
    const activeProspect = prospect || DEFAULT_PROSPECT;
    const activeDifficulty = difficulty || 'medium';

    let prompt = `ROLE: You are ${activeProspect.name}, a ${activeProspect.title}. You're receiving a COLD CALL from a salesperson - you didn't expect this call.

PERSONALITY: ${activeProspect.description}
- Communication style: ${activeProspect.personality}
- How you handle objections: ${activeProspect.objectionStyle}

CRITICAL RULES:
1. Answer the phone casually: Just say "Hello?" - you're answering your personal phone, not a business line
2. ONLY output what you would actually SAY out loud - no thoughts, no internal dialogue, no narration
3. Keep responses extremely brief (1-2 sentences max) like a real phone call
4. Sound like a real person answering an unexpected call at home or work
5. You don't know who's calling or what they want - react naturally as they explain`;

    if (activeDifficulty === 'easy') {
      prompt += '\n6. Be friendly and open to hearing what they have to say';
    } else if (activeDifficulty === 'medium') {
      prompt += '\n6. Be polite but skeptical - make them work for your interest';
    } else if (activeDifficulty === 'hard') {
      prompt += '\n6. Be busy and annoyed - you get lots of sales calls and don\'t have time';
    }

    prompt += '\n\nEXAMPLES OF GOOD RESPONSES:\n- "Hello?"\n- "Who is this?"\n- "I\'m actually pretty busy right now."\n- "What company did you say you\'re with?"\n- "How did you get my number?"\n- "What\'s this about?"\n\nEXAMPLES OF BAD RESPONSES (NEVER DO THIS):\n- "Hi, thanks for calling Peak Industries, my name is..." (NO - you\'re receiving the call, not a receptionist!)\n- "I\'m thinking about whether to trust this caller..." (NO THOUGHTS)\n- "*pauses to consider*" (NO NARRATION)\n- "My internal feelings are..." (NO INTERNAL DIALOGUE)';

    return prompt;
  };

  const handleStart = async () => {
    const personaPrompt = buildPersonaPrompt();
    const success = await startConversation(GEMINI_API_KEY, personaPrompt);
    if (!success) {
      alert('Failed to start conversation. Check console for errors.');
    }
  };

  const handleStop = () => {
    stopConversation();
  };

  const prospectName = prospect ? prospect.name : DEFAULT_PROSPECT.name;

  const renderScript = () => {
    if (!script) {
      return <div className="text-white text-center mt-20">No script loaded - practice cold calling!</div>;
    }

    let nodes = [];
    try {
      if (script.nodes) {
        nodes = script.nodes;
      } else if (script.content) {
        const parsed = JSON.parse(script.content);
        nodes = parsed.nodes || [];
      }
    } catch (e) {
      console.error('Error parsing script:', e);
    }

    if (nodes.length === 0) {
      return <div className="text-white text-center mt-20">No script content - practice cold calling!</div>;
    }

    return (
      <div style={{ transform: `scale(${scriptZoom})`, transformOrigin: 'top left' }}>
        <div className="space-y-3">
          {nodes.map((node, index) => (
            <div key={node.id || index} className={`rounded-lg p-3 ${
              node.data.speaker === 'You' ? 'bg-blue-500/20 border-l-4 border-blue-400' : 'bg-purple-500/20 border-l-4 border-purple-400'
            }`}>
              <div className="text-xs font-bold text-white/80 mb-1">
                {node.data.speaker === 'You' ? '🎯 YOU SAY:' : '👤 PROSPECT SAYS:'}
              </div>
              <div className="text-white font-medium">{node.data.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex bg-gray-900">
      <div className="w-1/2 bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 p-8 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Your Script</h2>
          <div className="flex gap-2">
            <button onClick={() => setScriptZoom(Math.max(0.5, scriptZoom - 0.1))} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white">
              <ZoomOut size={20} />
            </button>
            <button onClick={() => setScriptZoom(Math.min(2, scriptZoom + 0.1))} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white">
              <ZoomIn size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          {renderScript()}
        </div>
      </div>

      <div className="w-1/2 bg-white flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Live Call</h2>
              <p className="text-sm opacity-90">Calling: {prospectName}</p>
              {prospect && <p className="text-xs opacity-75">{prospect.title}</p>}
              {!prospect && <p className="text-xs opacity-75">{DEFAULT_PROSPECT.title}</p>}
            </div>
            <div className="flex gap-2 items-center">
              <div className="text-xs">{isConnected ? '🟢 Connected' : '⚪ Not connected'}</div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg font-semibold">Ready to practice?</p>
              <p className="text-sm mt-2">Click "Start Call" below</p>
              <p className="text-xs mt-4 text-gray-400">💡 Follow your script on the left</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.speaker === 'Prospect' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.speaker === 'Prospect' ? 'bg-purple-100 text-purple-900' : 'bg-blue-500 text-white'}`}>
                  <p className="text-xs opacity-70 mb-1">{msg.speaker === 'Prospect' ? prospectName : 'You'}</p>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex justify-center">
            <button
              onClick={isConnected ? handleStop : handleStart}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold shadow-xl transform hover:scale-105 transition-all ${isConnected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
              {isConnected ? (<><StopCircle size={24} /><span>End Call</span></>) : (<><Mic size={24} /><span>Start Call</span></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PracticePageSimple.propTypes = {
  onClose: PropTypes.func.isRequired,
  prospect: PropTypes.object,
  script: PropTypes.object,
  difficulty: PropTypes.string,
};
