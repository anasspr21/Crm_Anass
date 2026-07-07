-- ============================================================
-- WorkOS — Supabase Migration 001: Initial Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Folders (File Manager) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid REFERENCES folders(id) ON DELETE CASCADE,
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
  name         text NOT NULL,
  storage_path text NOT NULL,
  size_bytes   bigint,
  mime_type    text,
  division     text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS files_folder_idx ON files(folder_id);

-- ── Gantt Tasks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gantt_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division   text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  parent_id  uuid REFERENCES gantt_tasks(id) ON DELETE CASCADE,
  title      text NOT NULL,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  progress   integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status     text DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done','blocked')),
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
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  location         text,
  participants     text[] DEFAULT '{}',
  notes            text,
  reminder_minutes integer DEFAULT 30,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_start_idx    ON events(start_at);
CREATE INDEX IF NOT EXISTS events_division_idx ON events(division);

-- ── Drawing Canvases ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canvases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division      text NOT NULL CHECK (division IN ('agencement','developpement','divers','importation','etude_technique')),
  name          text NOT NULL,
  canvas_json   jsonb NOT NULL DEFAULT '{}',
  thumbnail_url text,
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canvases_division_idx ON canvases(division);

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

ALTER TABLE folders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE files             ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "auth_all_folders"            ON folders;
DROP POLICY IF EXISTS "auth_all_files"              ON files;
DROP POLICY IF EXISTS "auth_all_gantt_tasks"        ON gantt_tasks;
DROP POLICY IF EXISTS "auth_all_events"             ON events;
DROP POLICY IF EXISTS "auth_all_canvases"           ON canvases;
DROP POLICY IF EXISTS "auth_own_push_subscriptions" ON push_subscriptions;

-- Authenticated user can do everything
CREATE POLICY "auth_all_folders" ON folders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_all_files" ON files
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_all_gantt_tasks" ON gantt_tasks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_all_events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_all_canvases" ON canvases
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_own_push_subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Supabase Storage Buckets
-- (Run separately or via Supabase Dashboard > Storage)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('files',    'files',    false, 104857600, NULL),   -- 100MB, any type
--   ('canvases', 'canvases', true,  10485760,  ARRAY['image/png','image/svg+xml']);

-- Storage RLS for 'files' bucket
-- CREATE POLICY "auth_storage_files" ON storage.objects
--   FOR ALL USING (auth.role() = 'authenticated' AND bucket_id = 'files');

-- Storage RLS for 'canvases' bucket (public thumbnails)
-- CREATE POLICY "public_canvases_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'canvases');
-- CREATE POLICY "auth_canvases_write" ON storage.objects
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'canvases');

-- ============================================================
-- Done! 
-- Next steps:
-- 1. Create 'files' and 'canvases' storage buckets in Supabase Dashboard
-- 2. Enable the RLS storage policies above (uncomment and run)
-- 3. Create your user account via Supabase Auth > Users > Add user
-- ============================================================
