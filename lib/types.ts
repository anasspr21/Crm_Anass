// ─── Shared TypeScript Types for WorkOS ──────────────────────────────────────

import { DivisionKey } from './divisions';

// ── File Manager ─────────────────────────────────────────────────────────────
export interface Folder {
  id: string;
  parent_id: string | null;
  name: string;
  division: DivisionKey;
  created_at: string;
  children?: Folder[];
}

export interface FileRecord {
  id: string;
  folder_id: string;
  name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  division: DivisionKey;
  created_at: string;
}

// ── Gantt ─────────────────────────────────────────────────────────────────────
export type GanttStatus = 'not_started' | 'in_progress' | 'done' | 'blocked';

export interface GanttTask {
  id: string;
  division: DivisionKey;
  parent_id: string | null;
  title: string;
  start_date: string; // ISO date
  end_date: string;
  progress: number; // 0–100
  status: GanttStatus;
  notes: string | null;
  sort_order: number;
  created_at: string;
  children?: GanttTask[];
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  division: DivisionKey;
  start_at: string; // ISO timestamptz
  end_at: string;
  location: string | null;
  participants: string[];
  notes: string | null;
  reminder_minutes: number;
  created_at: string;
}

// ── Canvas ────────────────────────────────────────────────────────────────────
export interface Canvas {
  id: string;
  division: DivisionKey;
  name: string;
  canvas_json: object;
  thumbnail_url: string | null;
  updated_at: string;
  created_at: string;
}

// ── Push Notifications ────────────────────────────────────────────────────────
export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  subscription: PushSubscriptionJSON;
  created_at: string;
}
