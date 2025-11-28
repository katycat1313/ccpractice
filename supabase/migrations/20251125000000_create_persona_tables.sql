-- ============================================
-- PERSONA LEARNING SYSTEM
-- Creates tables for user communication style learning
-- ============================================

-- ============================================
-- 1. USER PERSONAS TABLE
-- Stores the learned communication profile for each user
-- ============================================
CREATE TABLE IF NOT EXISTS user_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Communication Style Attributes
  vocabulary_level TEXT CHECK (vocabulary_level IN ('conversational', 'professional', 'technical')) DEFAULT 'conversational',
  avg_sentence_length DECIMAL(5,2) DEFAULT 15.0,
  persuasion_style TEXT CHECK (persuasion_style IN ('consultative', 'direct', 'storytelling', 'analytical')) DEFAULT 'consultative',
  energy_level TEXT CHECK (energy_level IN ('high', 'moderate', 'calm')) DEFAULT 'moderate',
  formality_level TEXT CHECK (formality_level IN ('casual', 'professional', 'formal')) DEFAULT 'professional',

  -- Extracted Patterns (JSON)
  common_phrases JSONB DEFAULT '[]'::jsonb, -- [{phrase: "let me ask you", frequency: 15}, ...]
  favorite_openers JSONB DEFAULT '[]'::jsonb, -- Most successful opening lines
  objection_responses JSONB DEFAULT '{}'::jsonb, -- Successful objection handling patterns
  signature_words TEXT[] DEFAULT '{}', -- Unique vocabulary
  filler_words JSONB DEFAULT '{}'::jsonb, -- {um: 5, uh: 3, like: 8}

  -- Performance Metrics
  avg_conversation_length INT DEFAULT 0, -- seconds
  success_rate DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
  strongest_skills TEXT[] DEFAULT '{}', -- ['rapport_building', 'closing', ...]
  areas_for_growth TEXT[] DEFAULT '{}', -- ['objection_handling', 'urgency_creation', ...]

  -- Learning State
  total_practices INT DEFAULT 0,
  learning_confidence DECIMAL(3,2) DEFAULT 0 CHECK (learning_confidence >= 0 AND learning_confidence <= 1), -- 0-1, how well we know this user
  last_analyzed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USER SPEECH PATTERNS TABLE
-- Granular linguistic data from each practice session
-- ============================================
CREATE TABLE IF NOT EXISTS user_speech_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  practice_session_id UUID, -- Will reference practice_sessions table

  -- Raw Data
  transcript TEXT NOT NULL,
  word_count INT DEFAULT 0,
  unique_words INT DEFAULT 0,

  -- Filler Words Analysis
  filler_word_count INT DEFAULT 0,
  filler_words_detail JSONB DEFAULT '{}'::jsonb, -- {um: 5, uh: 3, like: 8}

  -- Linguistic Features
  sentence_structures JSONB DEFAULT '[]'::jsonb, -- ['statement', 'question', 'command']
  question_ratio DECIMAL(3,2) DEFAULT 0, -- % of sentences that are questions
  active_voice_ratio DECIMAL(3,2) DEFAULT 0,
  technical_terms TEXT[] DEFAULT '{}',
  power_words TEXT[] DEFAULT '{}', -- persuasive vocabulary

  -- Extracted Phrases (n-grams)
  bigrams JSONB DEFAULT '[]'::jsonb, -- 2-word phrases
  trigrams JSONB DEFAULT '[]'::jsonb, -- 3-word phrases

  -- Analysis Results
  detected_style TEXT,
  detected_energy TEXT,
  insights TEXT, -- Natural language insights about this session

  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ENHANCED PRACTICE SESSIONS TABLE
-- Track all practice sessions with persona learning data
-- ============================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  script_id UUID, -- Can reference a scripts table if you have one

  -- Session Data
  full_transcript TEXT,
  conversation_history JSONB DEFAULT '[]'::jsonb, -- [{speaker, text, timestamp}, ...]
  duration_seconds INT DEFAULT 0,

  -- Prospect/Scenario Info
  prospect_name TEXT,
  difficulty_level TEXT,
  scenario_type TEXT, -- 'cold_call', 'follow_up', 'objection_handling'

  -- AI Feedback
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  overall_score DECIMAL(5,2) DEFAULT 0, -- 0-100

  -- Persona Learning Contribution
  contributed_to_persona BOOLEAN DEFAULT FALSE,
  personality_insights JSONB DEFAULT '{}'::jsonb, -- What we learned about the user from this session

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SKILL TRACKING TABLE
-- Track user performance in specific skill areas over time
-- ============================================
CREATE TABLE IF NOT EXISTS user_skill_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL, -- 'rapport_building', 'objection_handling', 'closing', etc.

  -- Performance Metrics
  current_level DECIMAL(5,2) DEFAULT 0, -- 0-100 score
  practice_count INT DEFAULT 0,
  improvement_rate DECIMAL(5,2) DEFAULT 0, -- Rate of improvement
  last_practiced_at TIMESTAMPTZ,

  -- Historical Data
  score_history JSONB DEFAULT '[]'::jsonb, -- [{date, score}, ...]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, skill_name)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_personas_user_id ON user_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_patterns_user_id ON user_speech_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_patterns_session_id ON user_speech_patterns(practice_session_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_tracking_user_id ON user_skill_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_tracking_skill_name ON user_skill_tracking(user_id, skill_name);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_speech_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_tracking ENABLE ROW LEVEL SECURITY;

-- User Personas Policies
CREATE POLICY "Users can view their own persona" ON user_personas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona" ON user_personas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persona" ON user_personas
  FOR UPDATE USING (auth.uid() = user_id);

-- Speech Patterns Policies
CREATE POLICY "Users can view their own speech patterns" ON user_speech_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own speech patterns" ON user_speech_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Practice Sessions Policies
CREATE POLICY "Users can view their own practice sessions" ON practice_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions" ON practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions" ON practice_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Skill Tracking Policies
CREATE POLICY "Users can view their own skill tracking" ON user_skill_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skill tracking" ON user_skill_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill tracking" ON user_skill_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS for Auto-updating
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_personas_updated_at
  BEFORE UPDATE ON user_personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_tracking_updated_at
  BEFORE UPDATE ON user_skill_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function to initialize persona for new users
-- ============================================
CREATE OR REPLACE FUNCTION initialize_user_persona()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_personas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create persona when user signs up
CREATE TRIGGER on_user_created_initialize_persona
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_persona();

-- ============================================
-- COMMENTS for Documentation
-- ============================================
COMMENT ON TABLE user_personas IS 'Stores learned communication style and personality traits for each user';
COMMENT ON TABLE user_speech_patterns IS 'Granular linguistic analysis data from each practice session';
COMMENT ON TABLE practice_sessions IS 'Complete practice session records with transcripts and feedback';
COMMENT ON TABLE user_skill_tracking IS 'Tracks user performance in specific sales skills over time';
