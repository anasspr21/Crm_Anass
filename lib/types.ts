// ================================================================
// WorkOS CRM — Shared TypeScript Types
// ================================================================

export type DivisionKey = 'agencement' | 'developpement' | 'divers' | 'importation' | 'etude_technique';

// ── Projects ──────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  division: DivisionKey;
  name: string;
  client_name?: string | null;
  description?: string | null;
  status: ProjectStatus;
  priority: Priority;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  responsible?: string | null;
  tags?: string[];
  notes?: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

// ── Objectives ────────────────────────────────────────────────
export type ObjectiveStatus = 'not_started' | 'in_progress' | 'done';

export interface Objective {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  deadline?: string | null;
  progress: number;
  status: ObjectiveStatus;
  completed_at?: string | null;
  sort_order: number;
  created_at: string;
}

// ── Tasks ─────────────────────────────────────────────────────
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface Task {
  id: string;
  objective_id?: string | null;
  project_id?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  assigned_to?: string | null;
  deadline?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  is_recurring: boolean;
  recurrence_rule?: string | null;
  completed_at?: string | null;
  sort_order: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  body: string;
  created_at: string;
}

// ── Notes ─────────────────────────────────────────────────────
export interface Note {
  id: string;
  project_id?: string | null;
  division?: DivisionKey | null;
  title: string;
  content: { text?: string; [key: string]: unknown };
  updated_at: string;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────
export type NotificationType = 'deadline' | 'meeting' | 'task' | 'file' | 'comment' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Activity Log ──────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  entity_name?: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── File Manager ──────────────────────────────────────────────
export interface Folder {
  id: string;
  parent_id?: string | null;
  project_id?: string | null;
  name: string;
  division: DivisionKey;
  created_at: string;
  children?: Folder[];
}

export interface FileRecord {
  id: string;
  folder_id?: string | null;
  project_id?: string | null;
  name: string;
  storage_path: string;
  size_bytes?: number | null;
  mime_type?: string | null;
  division: DivisionKey;
  created_at: string;
}

// ── Gantt ─────────────────────────────────────────────────────
export type GanttStatus = 'not_started' | 'in_progress' | 'done' | 'blocked';

export interface GanttTask {
  id: string;
  division: DivisionKey;
  project_id?: string | null;
  parent_id?: string | null;
  title: string;
  start_date: string;
  end_date: string;
  progress: number;
  status: GanttStatus;
  assigned_to?: string | null;
  priority?: Priority;
  notes?: string | null;
  sort_order: number;
  created_at: string;
  children?: GanttTask[];
}

// ── Calendar ──────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  division: DivisionKey;
  project_id?: string | null;
  start_at: string;
  end_at: string;
  location?: string | null;
  participants?: string[];
  notes?: string | null;
  reminder_minutes?: number;
  priority?: Priority;
  created_at: string;
}

// ── Canvas ────────────────────────────────────────────────────
export interface Canvas {
  id: string;
  division: DivisionKey;
  project_id?: string | null;
  name: string;
  canvas_json: Record<string, unknown>;
  thumbnail_url?: string | null;
  updated_at: string;
  created_at: string;
}
