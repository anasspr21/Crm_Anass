-- ================================================================
-- WorkOS CRM — Schema Update 004: Team Members
-- ================================================================

CREATE TABLE IF NOT EXISTS team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  role       text NOT NULL,
  email      text,
  status     text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  color      text DEFAULT '#4A62D8',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_team_members" ON team_members;
CREATE POLICY "auth_all_team_members" ON team_members FOR ALL USING (auth.role() = 'authenticated');
