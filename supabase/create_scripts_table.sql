-- SQL to create scripts table for Supabase/Postgres
-- Run this in your Supabase SQL editor or psql connected to the DB

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

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- SECURITY: enable Row Level Security (RLS) and add restrictive policies
-- Supabase/PostgREST will warn if RLS is not enabled on public tables.
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT only their own scripts
CREATE POLICY "Users can select their own scripts" ON public.scripts
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to INSERT, but enforce that user_id equals authenticated user
CREATE POLICY "Users can insert their own scripts" ON public.scripts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to UPDATE their own scripts
CREATE POLICY "Users can update their own scripts" ON public.scripts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to DELETE their own scripts
CREATE POLICY "Users can delete their own scripts" ON public.scripts
  FOR DELETE
  USING (user_id = auth.uid());

-- Optional helper: ensure `user_id` is populated from the authenticated user on INSERT.
-- This prevents malicious clients from inserting rows for other users by omitting or spoofing user_id.
-- After adding this, run the full SQL in the Supabase SQL editor to apply the function and trigger.
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id wasn't provided, set it to the authenticated user's id
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid()::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_id_before_insert
BEFORE INSERT ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id();
