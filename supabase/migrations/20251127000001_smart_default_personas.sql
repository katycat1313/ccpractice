-- ============================================
-- SMART DEFAULT PERSONA SYSTEM
-- Creates intelligent starting personas that evolve with usage
-- ============================================

-- Drop the old basic trigger function
DROP TRIGGER IF EXISTS on_user_created_initialize_persona ON auth.users;
DROP FUNCTION IF EXISTS initialize_user_persona();

-- Create new smart initialization function with defaults
CREATE OR REPLACE FUNCTION initialize_user_persona()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_personas (
    user_id,
    vocabulary_level,
    avg_sentence_length,
    persuasion_style,
    energy_level,
    formality_level,
    common_phrases,
    favorite_openers,
    signature_words,
    strongest_skills,
    areas_for_growth,
    total_practices,
    learning_confidence,
    last_analyzed_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'professional', -- Start with professional vocabulary
    15.0, -- Average sentence length
    'consultative', -- Consultative selling approach
    'moderate', -- Balanced energy
    'professional', -- Professional tone
    '[]'::jsonb, -- Will populate as they practice
    '[]'::jsonb,
    ARRAY['value', 'solution', 'help', 'understand', 'benefit'], -- Common sales words
    ARRAY['rapport_building', 'active_listening'], -- Basic starting skills
    ARRAY['objection_handling', 'closing', 'urgency_creation'], -- Common growth areas
    0, -- No practices yet
    0.0, -- No confidence yet (0-1 scale)
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger with smart defaults
CREATE TRIGGER on_user_created_initialize_persona
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_persona();

-- Update existing personas with smart defaults if they're still at system defaults
UPDATE user_personas
SET
  signature_words = ARRAY['value', 'solution', 'help', 'understand', 'benefit'],
  strongest_skills = ARRAY['rapport_building', 'active_listening'],
  areas_for_growth = ARRAY['objection_handling', 'closing', 'urgency_creation'],
  updated_at = NOW()
WHERE
  total_practices = 0
  AND learning_confidence = 0
  AND (signature_words IS NULL OR signature_words = '{}');

-- Log the update
DO $$
DECLARE
  updated_count INT;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM user_personas WHERE total_practices = 0;
  RAISE NOTICE 'Personas with smart defaults applied: %', updated_count;
END $$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION initialize_user_persona() IS 'Auto-creates persona with intelligent defaults for new users. Persona evolves as they practice.';
