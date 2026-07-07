-- ================================================================
-- WorkOS CRM — COMPLETE SCHEMA MIGRATION
-- Run this in your Supabase SQL Editor to build the entire DB
-- ================================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Projects (Core Table) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division        text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  name            text NOT NULL,
  client_name     text,
  description     text,
  status          text DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  priority        text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  start_date      date,
  end_date        date,
  budget          numeric(14,2),
  responsible     text,
  tags            text[] DEFAULT '{}',
  notes           text,
  progress        integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_division_idx ON projects(division);
CREATE INDEX IF NOT EXISTS projects_status_idx   ON projects(status);

-- ── Folders (File Manager) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid REFERENCES folders(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name       text NOT NULL,
  division   text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS folders_parent_idx  ON folders(parent_id);
CREATE INDEX IF NOT EXISTS folders_division_idx ON folders(division);

-- ── Files ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id    uuid REFERENCES folders(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  name         text NOT NULL,
  storage_path text NOT NULL,
  size_bytes   bigint,
  mime_type    text,
  division     text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS files_folder_idx ON files(folder_id);

-- ── Objectives ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS objectives (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  priority        text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  deadline        date,
  progress        integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status          text DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done')),
  completed_at    timestamptz,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS objectives_project_idx ON objectives(project_id);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id    uuid REFERENCES objectives(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  status          text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  priority        text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to     text,
  deadline        date,
  estimated_hours numeric(6,1),
  actual_hours    numeric(6,1),
  is_recurring    boolean DEFAULT false,
  recurrence_rule text,
  completed_at    timestamptz,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_objective_idx ON tasks(objective_id);
CREATE INDEX IF NOT EXISTS tasks_project_idx   ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx    ON tasks(status);

-- ── Task Comments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Gantt Tasks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gantt_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division   text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES gantt_tasks(id) ON DELETE CASCADE,
  title      text NOT NULL,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  progress   integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status     text DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done','blocked')),
  assigned_to text,
  priority   text DEFAULT 'medium',
  notes      text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_division_idx ON gantt_tasks(division);
CREATE INDEX IF NOT EXISTS gantt_parent_idx   ON gantt_tasks(parent_id);

-- ── Calendar Events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  division         text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  location         text,
  participants     text[] DEFAULT '{}',
  notes            text,
  priority         text DEFAULT 'medium',
  reminder_minutes integer DEFAULT 30,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_start_idx    ON events(start_at);
CREATE INDEX IF NOT EXISTS events_division_idx ON events(division);

-- ── Notes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  division   text CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  title      text NOT NULL DEFAULT 'Note sans titre',
  content    jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_project_idx ON notes(project_id);

-- ── Drawing Canvases ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canvases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division      text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  canvas_json   jsonb NOT NULL DEFAULT '{}',
  thumbnail_url text,
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canvases_division_idx ON canvases(division);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('deadline','meeting','task','file','comment','system')),
  title      text NOT NULL,
  body       text,
  link       text,
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Activity Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   uuid,
  entity_name text,
  action      text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC);

-- ── Push Subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security (single-user: any authenticated user)
-- ============================================================

ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE files               ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "auth_all_projects"            ON projects;
DROP POLICY IF EXISTS "auth_all_folders"             ON folders;
DROP POLICY IF EXISTS "auth_all_files"               ON files;
DROP POLICY IF EXISTS "auth_all_objectives"          ON objectives;
DROP POLICY IF EXISTS "auth_all_tasks"               ON tasks;
DROP POLICY IF EXISTS "auth_all_task_comments"       ON task_comments;
DROP POLICY IF EXISTS "auth_all_gantt_tasks"         ON gantt_tasks;
DROP POLICY IF EXISTS "auth_all_events"              ON events;
DROP POLICY IF EXISTS "auth_all_notes"               ON notes;
DROP POLICY IF EXISTS "auth_all_canvases"            ON canvases;
DROP POLICY IF EXISTS "auth_all_notifications"       ON notifications;
DROP POLICY IF EXISTS "auth_all_activity_log"        ON activity_log;
DROP POLICY IF EXISTS "auth_own_push_subscriptions"  ON push_subscriptions;

-- Authenticated user can do everything
CREATE POLICY "auth_all_projects"            ON projects            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_folders"             ON folders             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_files"               ON files               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_objectives"          ON objectives          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_tasks"               ON tasks               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_task_comments"       ON task_comments       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_gantt_tasks"         ON gantt_tasks         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_events"              ON events              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_notes"               ON notes               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_canvases"            ON canvases            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_notifications"       ON notifications       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_activity_log"        ON activity_log        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_own_push_subscriptions"  ON push_subscriptions  FOR ALL USING (auth.uid() = user_id);

-- ── Helper function: auto-update project progress from objectives ──
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET progress = (
    SELECT COALESCE(AVG(progress)::integer, 0)
    FROM objectives
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_progress ON objectives;
CREATE TRIGGER trg_project_progress
  AFTER INSERT OR UPDATE OR DELETE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_project_progress();

-- ── Helper function: auto-update updated_at ──
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated_at ON notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- Done! 
-- ============================================================
