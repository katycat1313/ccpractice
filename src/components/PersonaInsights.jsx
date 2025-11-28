import React from 'react';
import { TrendingUp, Zap, MessageCircle, Target, Award, Brain } from 'lucide-react';

/**
 * PersonaInsights Component
 * Displays the user's learned communication style and personality traits
 *
 * Shows:
 * - Learning confidence (how well we know the user)
 * - Communication style badges
 * - Signature phrases
 * - Strongest skills
 * - Areas for growth
 */
export default function PersonaInsights({ persona, compact = false }) {
  if (!persona) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-indigo-400" size={28} />
          <h3 className="text-xl font-bold text-white">Your Communication Style</h3>
        </div>
        <div className="text-gray-400 text-center py-8">
          <p className="mb-2">Complete a practice session to start learning your style!</p>
          <p className="text-sm">The AI will analyze your communication patterns.</p>
        </div>
      </div>
    );
  }

  const {
    vocabulary_level,
    persuasion_style,
    energy_level,
    formality_level,
    common_phrases = [],
    strongest_skills = [],
    areas_for_growth = [],
    total_practices = 0,
    learning_confidence = 0,
  } = persona;

  // Format learning confidence as percentage
  const confidencePercent = Math.round(learning_confidence * 100);

  // Style badge configurations
  const styleBadges = [
    {
      icon: <MessageCircle size={16} />,
      label: vocabulary_level || 'Learning...',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    },
    {
      icon: <Target size={16} />,
      label: persuasion_style || 'Analyzing...',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    },
    {
      icon: <Zap size={16} />,
      label: `${energy_level || 'moderate'} energy`,
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    },
    {
      icon: <TrendingUp size={16} />,
      label: formality_level || 'professional',
      color: 'bg-green-500/20 text-green-400 border-green-500/50',
    },
  ];

  // Get top signature phrases
  const topPhrases = common_phrases.slice(0, compact ? 3 : 6);

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-lg p-4 border border-indigo-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="text-indigo-400" size={20} />
            <h4 className="text-sm font-semibold text-white">Your Style</h4>
          </div>
          <div className="text-xs text-indigo-300 font-medium">
            {confidencePercent}% trained
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {styleBadges.map((badge, idx) => (
            <span
              key={idx}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}
            >
              {badge.icon}
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-3 rounded-lg">
            <Brain className="text-indigo-400" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Your Communication Style</h3>
            <p className="text-sm text-gray-400">Learned from {total_practices} practice sessions</p>
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Persona Learning</span>
          <span className="text-sm font-bold text-indigo-400">{confidencePercent}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500 relative"
            style={{ width: `${confidencePercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {confidencePercent < 50 && 'Keep practicing to improve personalization'}
          {confidencePercent >= 50 && confidencePercent < 80 && 'Good progress! Your scripts are getting more personalized'}
          {confidencePercent >= 80 && 'Excellent! Scripts are highly personalized to your style'}
        </p>
      </div>

      {/* Style Badges */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Style Profile</h4>
        <div className="grid grid-cols-2 gap-2">
          {styleBadges.map((badge, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${badge.color} transition-all hover:scale-105`}
            >
              {badge.icon}
              <span className="text-sm font-medium capitalize">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Phrases */}
      {topPhrases.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-indigo-400" />
            Your Signature Phrases
          </h4>
          <div className="flex flex-wrap gap-2">
            {topPhrases.map((phraseObj, idx) => {
              const phrase = typeof phraseObj === 'string' ? phraseObj : phraseObj.phrase;
              return (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-full text-sm border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors"
                >
                  "{phrase}"
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Strongest Skills */}
      {strongest_skills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Award size={16} className="text-green-400" />
            Your Strengths
          </h4>
          <div className="flex flex-wrap gap-2">
            {strongest_skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-green-500/10 text-green-300 rounded-lg text-sm border border-green-500/30 font-medium"
              >
                ✓ {skill.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Areas for Growth */}
      {areas_for_growth.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-400" />
            Areas to Practice
          </h4>
          <div className="flex flex-wrap gap-2">
            {areas_for_growth.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-orange-500/10 text-orange-300 rounded-lg text-sm border border-orange-500/30"
              >
                → {area.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      {confidencePercent < 100 && (
        <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
          <p className="text-sm text-indigo-300">
            💡 <strong>Tip:</strong> Complete {Math.max(0, 10 - total_practices)} more practice sessions to unlock fully personalized script generation!
          </p>
        </div>
      )}
    </div>
  );
}
