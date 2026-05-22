CREATE TABLE IF NOT EXISTS trial_email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, email_id)
);

CREATE INDEX idx_trial_email_log_user ON trial_email_log(user_id);

-- Backfill: 12 users who already received emails 1-3 (Welcome, Power Rankings, Matchups)
-- These users were sent emails manually before automation was set up.
INSERT INTO trial_email_log (user_id, email_id)
SELECT p.id, e.email_id
FROM profiles p
CROSS JOIN (VALUES ('trial_welcome'), ('trial_power_rankings'), ('trial_matchups')) AS e(email_id)
WHERE p.email IN (
  'juniordamien77@gmail.com',
  'issaccraig812@gmail.com',
  'tjntj1@gmail.com',
  'josh@getinthelimelight.com',
  'abdelfaradjyaya03@gmail.com',
  'washingtonkimberly183@gmail.com',
  'scruffs-wires6s@icloud.com',
  'glassjx@gmail.com',
  'puffmcdragon@yahoo.ca',
  'kenn_wood@mail.com',
  'jdaniel@focalpointchurch.com',
  'grantgwynne@gmail.com'
)
ON CONFLICT (user_id, email_id) DO NOTHING;
