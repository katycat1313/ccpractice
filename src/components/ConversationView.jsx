import React, { useEffect, useRef } from 'react';
import { User, UserCircle, Sparkles } from 'lucide-react';

/**
 * ConversationView
 *
 * Displays the live conversation in a chat-like interface
 * Shows both user and prospect messages as they happen
 * Supports zoom and scroll functionality
 */
export default function ConversationView({
  conversation = [],
  isRecording = false,
  liveTranscript = '',
  isAIThinking = false,
  zoom = 100,
  prospectName = 'Prospect'
}) {
  const conversationEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length, liveTranscript]);

  const fontSize = `${zoom}%`;

  return (
    <div
      ref={containerRef}
      className="flex-grow overflow-y-auto overflow-x-hidden relative p-6"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10" style={{ fontSize }}>
        {/* Empty state */}
        {conversation.length === 0 && !liveTranscript && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Sparkles size={64} className="text-indigo-400 relative z-10 mb-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Practice!</h3>
            <p className="text-gray-400 max-w-md">
              Click the Record button below to start your practice session.
              Your conversation will appear here in real-time.
            </p>
          </div>
        )}

        {/* Conversation History */}
        {conversation.map((message, index) => (
          <ConversationMessage
            key={message.id || index}
            message={message}
            prospectName={prospectName}
            zoom={zoom}
            index={index}
          />
        ))}

        {/* Live User Transcription */}
        {isRecording && liveTranscript && (
          <ConversationMessage
            message={{
              speaker: 'You',
              text: liveTranscript,
              isLive: true,
            }}
            prospectName={prospectName}
            zoom={zoom}
          />
        )}

        {/* AI Thinking Indicator */}
        {isAIThinking && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <UserCircle size={24} className="text-white" />
            </div>
            <div className="flex-grow">
              <div className="bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 inline-block">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm">{prospectName} is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={conversationEndRef} />
      </div>
    </div>
  );
}

/**
 * Individual conversation message
 */
function ConversationMessage({ message, prospectName, zoom, index }) {
  const isUser = message.speaker === 'You';
  const isLive = message.isLive;

  const alignment = isUser ? 'flex-row-reverse' : 'flex-row';
  const borderRadius = isUser ? 'rounded-3xl rounded-tr-md' : 'rounded-3xl rounded-tl-md';
  const textAlign = isUser ? 'text-right' : 'text-left';
  const displayName = isUser ? 'You' : prospectName;

  return (
    <div
      className={`flex items-start gap-4 ${alignment} opacity-0 animate-fadeIn`}
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`absolute inset-0 ${isUser ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} rounded-full blur-md opacity-50`}></div>
        <div className={`w-12 h-12 rounded-full ${isUser ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-lg`}>
          {isUser ? (
            <User size={22} className="text-white" />
          ) : (
            <UserCircle size={22} className="text-white" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-grow max-w-[75%]">
        <div className={`text-xs font-medium mb-2 ${textAlign} flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className={`${isUser ? 'text-blue-300' : 'text-green-300'}`}>{displayName}</span>
          {message.timestamp && (
            <span className="text-gray-500">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
        <div className={`${borderRadius} px-5 py-4 inline-block relative shadow-xl transform transition-all hover:scale-[1.02] ${isLive ? 'animate-pulse' : ''}`}
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            border: isUser ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(75, 85, 99, 0.3)',
          }}
        >
          <p className="text-white leading-relaxed whitespace-pre-wrap font-['OpenDyslexic']">
            {message.text}
            {isLive && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
          </p>
        </div>
        {isLive && (
          <div className="text-xs text-indigo-400 mt-2 italic flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
            Speaking...
          </div>
        )}
      </div>
    </div>
  );
}
