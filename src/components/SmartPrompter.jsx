import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Info, Sparkles } from 'lucide-react';

/**
 * SmartPrompter
 *
 * Intelligently displays the next suggested line from the script
 * Automatically navigates branches based on conversation context
 * Shows why this line was suggested and offers alternatives
 */
export default function SmartPrompter({
  suggestedLine = null,
  detectedIntent = null,
  confidence = 0,
  alternatives = [],
  onSelectAlternative = () => {},
  isVisible = true,
  onToggleVisibility = () => {},
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!suggestedLine) {
    return (
      <div className="border-t border-purple-200 p-6" style={{
        background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.6) 0%, rgba(221, 214, 254, 0.6) 100%)',
      }}>
        <div className="max-w-4xl mx-auto text-center">
          <Lightbulb size={32} className="inline-block mb-3 text-purple-400 opacity-50" />
          <p className="text-sm text-purple-600 font-semibold">Start recording to see smart suggestions</p>
        </div>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div className="border-t border-purple-200 p-2" style={{
        background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.6) 0%, rgba(221, 214, 254, 0.6) 100%)',
      }}>
        <button
          onClick={onToggleVisibility}
          className="w-full text-purple-600 hover:text-purple-800 flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
        >
          <ChevronUp size={16} />
          Show Smart Prompter
        </button>
      </div>
    );
  }

  const confidenceColor =
    confidence >= 80 ? 'text-green-400' :
    confidence >= 50 ? 'text-yellow-400' :
    'text-orange-400';

  const confidenceLabel =
    confidence >= 80 ? 'High Confidence' :
    confidence >= 50 ? 'Medium Confidence' :
    'Low Confidence';

  return (
    <div className="relative border-t border-purple-200" style={{
      background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.8) 0%, rgba(221, 214, 254, 0.8) 100%)',
    }}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-400/10 to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="relative px-6 py-4 flex items-center justify-between border-b border-purple-300/40" style={{
        background: 'linear-gradient(90deg, rgba(224, 242, 254, 0.9) 0%, rgba(221, 214, 254, 0.9) 100%)',
      }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-md opacity-30"></div>
            <Sparkles size={22} className="text-purple-600 relative z-10 animate-pulse" />
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            SMART PROMPTER
          </span>
          {detectedIntent && (
            <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/40 text-purple-700 font-semibold">
              {detectedIntent}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50">
            <div className={`w-2.5 h-2.5 rounded-full ${confidenceColor.replace('text-', 'bg-')} animate-pulse shadow-lg`}></div>
            <span className={`text-xs font-bold ${confidenceColor}`}>
              {confidenceLabel}
            </span>
            <span className="text-xs text-purple-600">({confidence}%)</span>
          </div>
          <button
            onClick={onToggleVisibility}
            className="text-purple-600 hover:text-purple-800 transition-colors p-1.5 hover:bg-white/50 rounded-lg"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* Suggested Line */}
      <div className="relative p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-40 animate-pulse"></div>
              <Lightbulb size={32} className="text-yellow-500 relative z-10" />
            </div>
            <div className="flex-grow">
              <div className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-3">
                <span>YOUR NEXT LINE</span>
                {confidence < 80 && alternatives.length > 0 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 transition-all shadow-sm"
                  >
                    <Info size={14} />
                    Why this?
                  </button>
                )}
              </div>
              <div className="relative p-6 rounded-2xl shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  border: '2px solid rgba(147, 51, 234, 0.2)',
                }}
              >
                <p className="text-2xl leading-relaxed text-gray-800 font-['OpenDyslexic'] font-semibold">
                  {suggestedLine}
                </p>
              </div>

              {/* Explanation */}
              {showDetails && detectedIntent && (
                <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold text-indigo-400">Why this suggestion:</span>
                    {' '}The prospect expressed <span className="text-yellow-400">{detectedIntent}</span>.
                    This response is designed to handle that specific situation.
                  </p>
                </div>
              )}

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
                  >
                    {showAlternatives ? (
                      <>
                        <ChevronUp size={14} />
                        Hide alternatives
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        Show {alternatives.length} alternative response{alternatives.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>

                  {showAlternatives && (
                    <div className="mt-3 space-y-2">
                      {alternatives.map((alt, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            onSelectAlternative(alt);
                            setShowAlternatives(false);
                          }}
                          className="w-full text-left p-3 bg-gray-900 hover:bg-gray-850 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors group"
                        >
                          <div className="text-xs text-gray-500 mb-1 group-hover:text-indigo-400">
                            Alternative {index + 1}
                            {alt.intent && <span className="ml-2">({alt.intent})</span>}
                          </div>
                          <p className="text-white">{alt.text}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
