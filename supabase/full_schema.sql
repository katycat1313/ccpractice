-- ==============================================================================
-- ScriptMaster AI Cold Calling Coach - Complete Supabase Database Schema
-- Run this in your Supabase project's SQL Editor (or via `supabase db push` / CLI)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. REUSABLE TRIGGER FUNCTION: update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. PROFILES TABLE (User Profiles & API Key Settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  role text DEFAULT 'Sales Representative',
  company text,
  gemini_api_key text,
  deepgram_api_key text,
  preferences jsonb DEFAULT '{"voice": "aura-asteria-en", "difficulty": "medium", "auto_speak": true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-provision profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales Representative')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. SCRIPTS TABLE (Interactive Node/Edge Cold Call Scripts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  nodes jsonb DEFAULT '[]'::jsonb,
  edges jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own scripts" ON public.scripts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own scripts" ON public.scripts
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own scripts" ON public.scripts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own scripts" ON public.scripts
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Automatically enforce user_id on insert if omitted
CREATE OR REPLACE FUNCTION public.set_script_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid()::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_script_user_id_before_insert ON public.scripts;
CREATE TRIGGER set_script_user_id_before_insert
BEFORE INSERT ON public.scripts
FOR EACH ROW EXECUTE FUNCTION public.set_script_user_id();

-- ==============================================================================
-- 5. PRACTICE SESSIONS TABLE (Call Recordings, Transcripts & Scores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  persona_name text,
  persona_prompt text,
  difficulty text DEFAULT 'medium',
  duration_seconds integer DEFAULT 0,
  transcript text,
  score integer DEFAULT 0,
  strengths jsonb DEFAULT '[]'::jsonb,
  improvements jsonb DEFAULT '[]'::jsonb,
  objections_handled jsonb DEFAULT '[]'::jsonb,
  deposit_pitched boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own practice sessions" ON public.practice_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own practice sessions" ON public.practice_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own practice sessions" ON public.practice_sessions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own practice sessions" ON public.practice_sessions
  FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_session_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid()::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_session_user_id_before_insert ON public.practice_sessions;
CREATE TRIGGER set_session_user_id_before_insert
BEFORE INSERT ON public.practice_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_session_user_id();

-- ==============================================================================
-- 6. COACH CONVERSATIONS TABLE (Pitch Brainstorming & Research History)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT 'Pitch Brainstorming',
  messages jsonb DEFAULT '[]'::jsonb,
  custom_persona_prompt text,
  business_research jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own coach conversations" ON public.coach_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own coach conversations" ON public.coach_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own coach conversations" ON public.coach_conversations
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own coach conversations" ON public.coach_conversations
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_coach_conversations_updated_at
BEFORE UPDATE ON public.coach_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON public.scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON public.practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_id ON public.coach_conversations(user_id);
