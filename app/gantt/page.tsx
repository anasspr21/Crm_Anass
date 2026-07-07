'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { GanttTask, GanttStatus } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Plus, ChevronDown, ChevronRight, X, Grip } from 'lucide-react';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<GanttStatus, string> = {
  not_started: 'Non démarré',
  in_progress: 'En cours',
  done: 'Terminé',
  blocked: 'Bloqué',
};

const STATUS_COLORS: Record<GanttStatus, string> = {
  not_started: '#888780',
  in_progress: '#378ADD',
  done: '#1D9E75',
  blocked: '#ef4444',
};

// ── Task form dialog ──────────────────────────────────────────────────────────
function TaskFormDialog({
  task,
  division,
  parentId,
  onSave,
  onClose,
}: {
  task?: GanttTask | null;
  division: DivisionKey;
  parentId?: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [startDate, setStartDate] = useState(task?.start_date ?? format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(task?.end_date ?? format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [status, setStatus] = useState<GanttStatus>(task?.status ?? 'not_started');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const supabase = createSupabaseClient();

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (task) {
      await supabase.from('gantt_tasks').update({ title, start_date: startDate, end_date: endDate, progress, status, notes }).eq('id', task.id);
    } else {
      await supabase.from('gantt_tasks').insert({ title, start_date: startDate, end_date: endDate, progress, status, notes, division, parent_id: parentId ?? null, sort_order: 0 });
    }
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="nm-card"
        style={{ width: 480, padding: '32px', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="nm-btn"
          style={{ position: 'absolute', top: 16, right: 16, padding: '6px 8px' }}
          onClick={onClose}
        >
          <X size={14} />
        </button>
        <h2 className="heading" style={{ fontSize: '1.2rem', marginBottom: 24 }}>
          {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="nm-input" placeholder="Titre de la tâche" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Début</label>
              <input className="nm-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Fin</label>
              <input className="nm-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Avancement: {progress}%</label>
            <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))}
              style={{ width: '100%', accentColor: getDivisionColor(division) }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Statut</label>
            <select
              className="nm-input"
              value={status}
              onChange={e => setStatus(e.target.value as GanttStatus)}
              style={{ cursor: 'pointer' }}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea
            className="nm-input"
            placeholder="Notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <button className="nm-btn nm-btn-primary" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gantt chart row ───────────────────────────────────────────────────────────
function GanttRow({
  task,
  color,
  timeStart,
  timeEnd,
  dayWidth,
  level,
  onEdit,
  onAddChild,
  onToggle,
  expanded,
  hasChildren,
}: {
  task: GanttTask;
  color: string;
  timeStart: Date;
  timeEnd: Date;
  dayWidth: number;
  level: number;
  onEdit: (t: GanttTask) => void;
  onAddChild: (parentId: string) => void;
  onToggle: (id: string) => void;
  expanded: boolean;
  hasChildren: boolean;
}) {
  const totalDays = differenceInDays(timeEnd, timeStart);
  const taskStart = parseISO(task.start_date);
  const taskEnd = parseISO(task.end_date);
  const leftPct = Math.max(0, differenceInDays(taskStart, timeStart)) / totalDays * 100;
  const widthPct = Math.max(0.5, differenceInDays(taskEnd, taskStart) + 1) / totalDays * 100;

  return (
    <div style={{ display: 'flex', height: 44, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      {/* Task name column */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `0 8px 0 ${8 + level * 16}px`,
          borderRight: '1px solid rgba(0,0,0,0.06)',
          height: '100%',
          cursor: 'pointer',
        }}
        onClick={() => onEdit(task)}
      >
        {hasChildren && (
          <button
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        {!hasChildren && <div style={{ width: 12 }} />}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: STATUS_COLORS[task.status],
            flexShrink: 0,
          }}
        />
        <span className="truncate" style={{ fontSize: '0.775rem', fontWeight: level === 0 ? 600 : 400, flex: 1 }}>
          {task.title}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{task.progress}%</span>
      </div>

      {/* Timeline bar area */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <div className="gantt-bar">
            {/* Background */}
            <div className="gantt-bar-bg" style={{ background: color }} />
            {/* Blocked pattern */}
            {task.status === 'blocked' && <div className="gantt-bar-blocked" style={{ position: 'absolute', inset: 0 }} />}
            {/* Progress fill */}
            <div
              className="gantt-bar-fill"
              style={{ width: `${task.progress}%`, background: color }}
            />
            {/* Label */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {task.title}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function flattenTasks(tasks: GanttTask[], expanded: Set<string>, level = 0): Array<{ task: GanttTask; level: number }> {
  const result: Array<{ task: GanttTask; level: number }> = [];
  for (const t of tasks) {
    result.push({ task: t, level });
    if (t.children && expanded.has(t.id)) {
      result.push(...flattenTasks(t.children, expanded, level + 1));
    }
  }
  return result;
}

// ── Main Gantt page ───────────────────────────────────────────────────────────
export default function GanttPage() {
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>('agencement');
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editTask, setEditTask] = useState<GanttTask | null | undefined>(undefined);
  const [newParentId, setNewParentId] = useState<string | null | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month');
  const supabase = createSupabaseClient();

  const timeRange = {
    week:    { months: 1,  label: 'Semaine' },
    month:   { months: 3,  label: 'Mois'    },
    quarter: { months: 12, label: 'Trimestre' },
  }[viewMode];

  const timeStart = startOfMonth(new Date());
  const timeEnd = endOfMonth(addDays(timeStart, timeRange.months * 30));
  const months = eachMonthOfInterval({ start: timeStart, end: timeEnd });

  const loadTasks = useCallback(async () => {
    if (!activeDivision) return;
    const { data } = await supabase.from('gantt_tasks').select('*').eq('division', activeDivision).order('sort_order');
    if (!data) return;
    const map: Record<string, GanttTask> = {};
    data.forEach((t: any) => { map[t.id] = { ...t, children: [] }; });
    const roots: GanttTask[] = [];
    data.forEach((t: any) => {
      if (t.parent_id && map[t.parent_id]) {
        map[t.parent_id].children!.push(map[t.id]);
      } else if (!t.parent_id) {
        roots.push(map[t.id]);
      }
    });
    setTasks(roots);
  }, [activeDivision, supabase]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const divColor = getDivisionColor(activeDivision ?? 'agencement');
  const totalDays = differenceInDays(timeEnd, timeStart);
  const todayPct = differenceInDays(new Date(), timeStart) / totalDays * 100;
  const flat = flattenTasks(tasks, expanded);

  // Overall progress
  const allTasks = flat.map(f => f.task);
  const overallProgress = allTasks.length ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length) : 0;

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={d => setActiveDivision(d as DivisionKey)}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexShrink: 0 }}>
          <div>
            <h1 className="heading" style={{ fontSize: '1.5rem', marginBottom: 2 }}>Gantt</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {activeDivision ? DIVISIONS.find(d => d.key === activeDivision)?.label : 'Toutes divisions'}
            </p>
          </div>
          {/* Progress badge */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              borderRadius: 999,
              boxShadow: 'var(--raised-xs)',
              background: 'var(--bg)',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: divColor }} />
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem' }}>{overallProgress}%</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>avancement</span>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['week', 'month', 'quarter'] as const).map(m => (
              <button
                key={m}
                className="nm-btn"
                style={{
                  boxShadow: viewMode === m ? 'var(--inset-sm)' : 'var(--raised-xs)',
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                }}
                onClick={() => setViewMode(m)}
              >
                {timeRange.label}
              </button>
            ))}
          </div>

          <button
            className="nm-btn nm-btn-primary"
            onClick={() => { setNewParentId(null); setEditTask(null); }}
          >
            <Plus size={14} /> Nouvelle tâche
          </button>
        </div>

        {/* Gantt body */}
        <div className="nm-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Month header */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            <div style={{ width: 220, flexShrink: 0, padding: '10px 12px', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tâche
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {months.map(m => (
                <div
                  key={m.toISOString()}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderRight: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  {format(m, 'MMM yyyy', { locale: fr })}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable rows */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {/* Today line */}
            <div
              className="today-line"
              style={{
                left: `calc(220px + ${Math.max(0, todayPct)}% * (100% - 220px) / 100)`,
              }}
            />

            {flat.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune tâche. Créez votre première tâche.</p>
              </div>
            ) : (
              flat.map(({ task, level }) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  color={divColor}
                  timeStart={timeStart}
                  timeEnd={timeEnd}
                  dayWidth={0}
                  level={level}
                  onEdit={t => { setEditTask(t); setNewParentId(undefined); }}
                  onAddChild={pid => { setNewParentId(pid); setEditTask(null); }}
                  onToggle={toggleExpand}
                  expanded={expanded.has(task.id)}
                  hasChildren={Boolean(task.children?.length)}
                />
              ))
            )}
          </div>
        </div>

        {/* Task form dialog */}
        {(editTask !== undefined || newParentId !== undefined) && (
          <TaskFormDialog
            task={editTask}
            division={activeDivision ?? 'divers'}
            parentId={newParentId}
            onSave={loadTasks}
            onClose={() => { setEditTask(undefined); setNewParentId(undefined); }}
          />
        )}
      </div>
    </AppShell>
  );
}
