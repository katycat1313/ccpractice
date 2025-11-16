-- SQL to create scripts table for Supabase/Postgres
-- Run this in your Supabase SQL editor or psql connected to the DB

CREATE TABLE IF NOT EXISTS public.scripts -- Create table if not exists (safe)
CREATE TABLE IF NOT EXISTS public.scripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  nodes jsonb,
  edges jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to update updated_at (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_scripts_updated_at ON public.scripts;
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (safe to run even if already enabled)
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Policies (CREATE POLICY will fail if duplicate names exist; if you prefer idempotency,
-- drop existing policies first or use psql with conditional logic. For Supabase SQL editor,
-- running duplicate CREATE POLICY will produce an error. If you see that, run the DROP POLICY lines)
-- Allow authenticated users to SELECT only their own scripts
DROP POLICY IF EXISTS "Users can select their own scripts" ON public.scripts;
CREATE POLICY "Users can select their own scripts" ON public.scripts
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to INSERT, but enforce that user_id equals authenticated user
DROP POLICY IF EXISTS "Users can insert their own scripts" ON public.scripts;
CREATE POLICY "Users can insert their own scripts" ON public.scripts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to UPDATE their own scripts
DROP POLICY IF EXISTS "Users can update their own scripts" ON public.scripts;
CREATE POLICY "Users can update their own scripts" ON public.scripts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to DELETE their own scripts
DROP POLICY IF EXISTS "Users can delete their own scripts" ON public.scripts;
CREATE POLICY "Users can delete their own scripts" ON public.scripts
  FOR DELETE
  USING (user_id = auth.uid());

-- Optional helper: ensure `user_id` is populated from the authenticated user on INSERT.
-- Prevents malicious clients from inserting rows for other users by omitting or spoofing user_id.
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid()::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_id_before_insert ON public.scripts;
CREATE TRIGGER set_user_id_before_insert
BEFORE INSERT ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id();