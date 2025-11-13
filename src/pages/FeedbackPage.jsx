import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { ThumbsUp, TrendingUp, Send, User, Bot } from 'lucide-react';

const FeedbackCard = ({ title, items, icon, color }) => {
  const Icon = icon;
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className={`text-lg font-semibold mb-4 flex items-center ${color}`}>
        <Icon className="mr-2" size={20} />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-gray-300">{item}</li>
        ))}
      </ul>
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <div className="bg-indigo-600 p-2 rounded-full"><Bot size={20} /></div>}
      <div className={`max-w-md p-4 rounded-lg ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
        <p>{message.text}</p>
      </div>
      {isUser && <div className="bg-blue-600 p-2 rounded-full"><User size={20} /></div>}
    </div>
  );
};

export default function FeedbackPage({ setPage }) {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Ready to dive deeper into your feedback? Ask me anything about the session or for specific advice!" },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = { sender: 'user', text: input };
    // Placeholder AI response
    const aiResponse = { sender: 'ai', text: "That's a great question. Let's break that down..." };

    setMessages([...messages, userMessage, aiResponse]);
    setInput('');
  };

  const strengths = ["Clear and confident opening.", "Good use of the customer's name.", "Strong closing statement."];
  const improvements = ["Try to ask more open-ended questions.", "Pace was a bit fast during the closing.", "Listen for buying signals more actively."];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-open-dyslexic">
      <Navbar setPage={setPage} />
      <div className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Practice Session Feedback</h1>
          
          {/* Summary Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <FeedbackCard title="What Went Well" items={strengths} icon={ThumbsUp} color="text-green-400" />
            <FeedbackCard title="Areas for Improvement" items={improvements} icon={TrendingUp} color="text-yellow-400" />
          </div>

          {/* Conversational Coach Section */}
          <h2 className="text-3xl font-bold mb-6 text-center">Conversational Coach</h2>
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto">
            <div className="space-y-6 h-96 overflow-y-auto mb-4 pr-4">
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="flex-grow bg-gray-700 rounded-full py-3 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ask the AI coach a question..."
              />
              <button onClick={handleSend} className="bg-indigo-600 p-3 rounded-full hover:bg-indigo-500">
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
