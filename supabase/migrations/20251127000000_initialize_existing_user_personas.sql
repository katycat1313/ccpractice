-- Initialize personas for existing users
-- This handles users that were created before the persona system was added

INSERT INTO user_personas (user_id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_personas)
ON CONFLICT (user_id) DO NOTHING;

-- Log how many were created
DO $$
DECLARE
  created_count INT;
BEGIN
  SELECT COUNT(*) INTO created_count FROM user_personas;
  RAISE NOTICE 'Total personas in database: %', created_count;
END $$;
