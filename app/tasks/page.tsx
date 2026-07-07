'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { Task, TaskStatus, Priority, TaskComment, Project } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  Plus, X, CheckCircle2, Circle, Clock, AlertTriangle,
  MessageSquare, Send, Trash2, Edit2, Filter, Search,
  User, Calendar, Flag, Hash, ChevronDown
} from 'lucide-react';

const STATUS_COLS: { key: TaskStatus; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'todo',        label: 'À faire',   color: '#888780', icon: Circle },
  { key: 'in_progress', label: 'En cours',  color: '#378ADD', icon: Clock },
  { key: 'done',        label: 'Terminé',   color: '#1D9E75', icon: CheckCircle2 },
  { key: 'blocked',     label: 'Bloqué',    color: '#C4517A', icon: AlertTriangle },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:    { label: 'Basse',   color: '#888780' },
  medium: { label: 'Moyenne', color: '#378ADD' },
  high:   { label: 'Haute',   color: '#D85A30' },
  urgent: { label: 'Urgent',  color: '#C4517A' },
};

interface TaskWithProject extends Task {
  project?: { name: string; division: string } | null;
}

export default function TasksPage() {
  const supabase = createSupabaseClient();
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'today' | 'week'>('all');

  // Task detail / create drawer
  const [drawerTask, setDrawerTask] = useState<TaskWithProject | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('todo');
  const [createForm, setCreateForm] = useState<Partial<Task>>({ priority: 'medium', status: 'todo' });
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: taskData }, { data: projData }] = await Promise.all([
      supabase.from('tasks').select('*, project:project_id(name, division)').order('sort_order'),
      supabase.from('projects').select('id, name, division').order('name'),
    ]);
    setProjects((projData ?? []) as Project[]);
    let filtered = (taskData ?? []) as TaskWithProject[];
    if (activeDivision) filtered = filtered.filter(t => t.project?.division === activeDivision);
    if (projectFilter !== 'all') filtered = filtered.filter(t => t.project_id === projectFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
    if (deadlineFilter !== 'all') {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 7);
      filtered = filtered.filter(t => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return deadlineFilter === 'today' ? d <= today : d <= endOfWeek;
      });
    }
    if (search) filtered = filtered.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    setTasks(filtered);
    setLoading(false);
  }, [activeDivision, projectFilter, priorityFilter, deadlineFilter, search, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadComments = async (taskId: string) => {
    const { data } = await supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at');
    setComments(data ?? []);
  };

  const openTask = (task: TaskWithProject) => {
    setDrawerTask(task);
    setShowCreateDrawer(false);
    loadComments(task.id);
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    await supabase.from('tasks').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', taskId);
    setDrawerTask(prev => prev && prev.id === taskId ? { ...prev, status } : prev);
    loadData();
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    setDrawerTask(null);
    loadData();
  };

  const addComment = async () => {
    if (!newComment.trim() || !drawerTask) return;
    await supabase.from('task_comments').insert({ task_id: drawerTask.id, body: newComment.trim() });
    setNewComment('');
    loadComments(drawerTask.id);
  };

  const createTask = async () => {
    if (!createForm.title?.trim()) return;
    setSaving(true);
    await supabase.from('tasks').insert({
      ...createForm,
      status: createStatus,
      is_recurring: false,
    });
    setSaving(false);
    setShowCreateDrawer(false);
    setCreateForm({ priority: 'medium', status: 'todo' });
    loadData();
  };

  const today = new Date(); today.setHours(23, 59, 59, 999);

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 className="heading" style={{ fontSize: '1.75rem' }}>Tâches</h1>
            <button className="nm-btn nm-btn-primary" onClick={() => { setShowCreateDrawer(true); setDrawerTask(null); }}>
              <Plus size={14} /> Nouvelle tâche
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="nm-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, width: 180 }} />
            </div>
            <select className="nm-input" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">Tous les projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="nm-input" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | 'all')} style={{ width: 'auto' }}>
              <option value="all">Toutes priorités</option>
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>
            <select className="nm-input" value={deadlineFilter} onChange={e => setDeadlineFilter(e.target.value as 'all' | 'today' | 'week')} style={{ width: 'auto' }}>
              <option value="all">Toutes échéances</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
            </select>
          </div>
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px', display: 'flex', gap: 16 }}>
          {STATUS_COLS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            const Icon = col.icon;
            return (
              <div key={col.key} style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column' }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
                  <Icon size={14} style={{ color: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${col.color}18`, color: col.color }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task cards */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                  {colTasks.map(task => {
                    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
                    const projectColor = task.project?.division ? getDivisionColor(task.project.division) : '#888780';
                    return (
                      <div key={task.id} className="nm-card"
                        style={{ padding: '14px 16px', cursor: 'pointer', transition: 'transform 0.1s', borderLeft: `3px solid ${projectColor}` }}
                        onClick={() => openTask(task)}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
                        <p style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
                        {task.project?.name && (
                          <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, background: `${projectColor}18`, color: projectColor, fontWeight: 600, display: 'inline-block', marginBottom: 8 }}>
                            {task.project.name}
                          </span>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, background: `${PRIORITY_CONFIG[task.priority].color}18`, color: PRIORITY_CONFIG[task.priority].color, fontWeight: 600 }}>
                            {PRIORITY_CONFIG[task.priority].label}
                          </span>
                          {task.deadline && (
                            <span style={{ fontSize: '0.62rem', color: isOverdue ? '#C4517A' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Calendar size={9} />{new Date(task.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                        {task.assigned_to && (
                          <div style={{ marginTop: 8, fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <User size={9} />{task.assigned_to}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.75rem', borderRadius: 12, border: '2px dashed rgba(0,0,0,0.08)' }}>
                      Aucune tâche
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Task Detail Drawer ── */}
      {drawerTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setDrawerTask(null)}>
          <div className="nm-card" style={{ width: 420, height: '100%', borderRadius: '20px 0 0 20px', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.4, flex: 1, marginRight: 10 }}>{drawerTask.title}</h2>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="nm-btn" style={{ padding: 6, color: '#D85A30' }} onClick={() => deleteTask(drawerTask.id)}><Trash2 size={13} /></button>
                <button className="nm-btn" style={{ padding: 6 }} onClick={() => setDrawerTask(null)}><X size={13} /></button>
              </div>
            </div>

            {/* Status buttons */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>STATUT</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {STATUS_COLS.map(s => (
                  <button key={s.key} className="nm-btn" style={{
                    fontSize: '0.68rem', padding: '4px 10px',
                    boxShadow: drawerTask.status === s.key ? 'var(--inset-sm)' : 'var(--raised-xs)',
                    color: drawerTask.status === s.key ? s.color : 'var(--text-muted)',
                    fontWeight: drawerTask.status === s.key ? 700 : 400,
                  }} onClick={() => updateTaskStatus(drawerTask.id, s.key)}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Meta info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {drawerTask.project?.name && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-dark)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>PROJET</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{drawerTask.project.name}</div>
                </div>
              )}
              {drawerTask.priority && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-dark)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>PRIORITÉ</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: PRIORITY_CONFIG[drawerTask.priority].color }}>{PRIORITY_CONFIG[drawerTask.priority].label}</div>
                </div>
              )}
              {drawerTask.deadline && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-dark)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>ÉCHÉANCE</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{new Date(drawerTask.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
                </div>
              )}
              {drawerTask.assigned_to && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-dark)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>ASSIGNÉ À</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{drawerTask.assigned_to}</div>
                </div>
              )}
              {(drawerTask.estimated_hours || drawerTask.actual_hours) && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-dark)', borderRadius: 10, gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>HEURES</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {drawerTask.actual_hours ?? 0}h réelles / {drawerTask.estimated_hours ?? '?'}h estimées
                  </div>
                </div>
              )}
            </div>

            {drawerTask.description && (
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIPTION</label>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{drawerTask.description}</p>
              </div>
            )}

            {/* Comments */}
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                COMMENTAIRES ({comments.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 250, overflowY: 'auto' }}>
                {comments.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Aucun commentaire.</p>
                )}
                {comments.map(c => (
                  <div key={c.id} style={{ padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: 10 }}>
                    <p style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{c.body}</p>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="nm-input" style={{ flex: 1 }} placeholder="Ajouter un commentaire…" value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()} />
                <button className="nm-btn nm-btn-primary" style={{ padding: '8px 12px' }} onClick={addComment}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Task Drawer ── */}
      {showCreateDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setShowCreateDrawer(false)}>
          <div className="nm-card" style={{ width: 400, height: '100%', borderRadius: '20px 0 0 20px', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="heading" style={{ fontSize: '1.1rem' }}>Nouvelle tâche</h2>
              <button className="nm-btn" style={{ padding: 7 }} onClick={() => setShowCreateDrawer(false)}><X size={13} /></button>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>TITRE *</label>
              <input className="nm-input" style={{ width: '100%' }} placeholder="Titre de la tâche" value={createForm.title ?? ''}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>DESCRIPTION</label>
              <textarea className="nm-input" rows={2} style={{ width: '100%', resize: 'vertical' }} value={createForm.description ?? ''}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PROJET</label>
              <select className="nm-input" style={{ width: '100%' }} value={createForm.project_id ?? ''}
                onChange={e => setCreateForm(f => ({ ...f, project_id: e.target.value || undefined }))}>
                <option value="">Aucun projet</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>STATUT</label>
                <select className="nm-input" style={{ width: '100%' }} value={createStatus}
                  onChange={e => setCreateStatus(e.target.value as TaskStatus)}>
                  {STATUS_COLS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PRIORITÉ</label>
                <select className="nm-input" style={{ width: '100%' }} value={createForm.priority ?? 'medium'}
                  onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>ASSIGNÉ À</label>
                <input className="nm-input" style={{ width: '100%' }} placeholder="Nom" value={createForm.assigned_to ?? ''}
                  onChange={e => setCreateForm(f => ({ ...f, assigned_to: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>ÉCHÉANCE</label>
                <input type="date" className="nm-input" style={{ width: '100%' }} value={createForm.deadline ?? ''}
                  onChange={e => setCreateForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>HEURES EST.</label>
                <input type="number" className="nm-input" style={{ width: '100%' }} placeholder="0" value={createForm.estimated_hours ?? ''}
                  onChange={e => setCreateForm(f => ({ ...f, estimated_hours: Number(e.target.value) }))} />
              </div>
            </div>
            <button className="nm-btn nm-btn-primary" style={{ justifyContent: 'center', marginTop: 8 }} onClick={createTask} disabled={saving || !createForm.title?.trim()}>
              {saving ? 'Création…' : 'Créer la tâche'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
