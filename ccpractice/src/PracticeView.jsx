import React from 'react';
import { Send } from 'lucide-react';

export default function PracticeView({
  currentScript,
  setPage,
  currentNodeId,
  setCurrentNodeId,
  conversation,
  practiceStarted,
  setPracticeStarted,
  speak,
  userInput,
  setUserInput,
  submitUserLine,
  isAiResponding,
  isSpeaking,
}) {
  const currentNode = currentScript.nodes.find(n => n.id === currentNodeId);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{currentScript.name}</h1>
        <button onClick={() => setPage('dashboard')} className="bg-gray-400 text-white py-2 px-4 rounded">Exit</button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow p-6">
          {!practiceStarted ? (
            <button onClick={() => { setPracticeStarted(true); const greeting = 'Hi, how can I help?'; speak(greeting); }} className="w-full bg-green-600 text-white font-bold py-6 rounded text-xl hover:bg-green-700">Start Call</button>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto border-2 border-gray-200">
                {conversation.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className={`max-w-xs p-3 rounded ${msg.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>{msg.text}</div>
                  </div>
                ))}
                {isAiResponding && (
                  <div className="flex justify-start mb-3">
                    <div className="max-w-xs p-3 rounded bg-gray-200 text-gray-500">...</div>
                  </div>
                )}
              </div>
              <textarea disabled={isAiResponding || isSpeaking} value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="What do you say?" className="w-full px-3 py-2 border-2 rounded h-20" />
              <button onClick={submitUserLine} disabled={isAiResponding || isSpeaking} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:bg-indigo-400">
                {isAiResponding ? '...' : <><Send size={18} /> Say</>}
              </button>
              <button onClick={() => setPage('dashboard')} className="w-full bg-red-600 text-white font-semibold py-2 rounded hover:bg-red-700">End Call</button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 sticky top-8">
          <h3 className="text-lg font-bold mb-4 text-center">Teleprompter</h3>
          {currentNode ? (
            <div>
              <div className="bg-gray-800 text-white rounded-lg p-6 mb-6 text-center">
                {conversation.length > 0 && conversation[conversation.length - 1].type === 'ai' && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 uppercase tracking-wider">Customer Said</p>
                    <p className="text-lg italic text-gray-300">"{conversation[conversation.length - 1].text}"</p>
                  </div>
                )}
                <p className="text-sm text-indigo-400 uppercase tracking-wider">Your Next Line</p>
                <p className="text-2xl font-bold leading-tight">{currentNode.content}</p>
              </div>

              {conversation.length > 0 && !isAiResponding && currentNode.branches.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Choose Your Path</p>
                  <div className="space-y-2">
                    {currentNode.branches.map(branch => (
                      <button key={branch.id} onClick={() => setCurrentNodeId(branch.nextNodeId)} disabled={!branch.nextNodeId} className="w-full text-left p-3 rounded bg-gray-100 hover:bg-indigo-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <p className="text-sm font-semibold">{branch.condition}</p>
                        <p className="text-xs text-gray-500">→ Go to node: "{currentScript.nodes.find(n => n.id === branch.nextNodeId)?.content.substring(0, 20) || 'Not Linked'}..."</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-gray-600 text-sm">Practice session ended or script has no nodes.</p>}
        </div>
      </div>
    </div>
  );
}