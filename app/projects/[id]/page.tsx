'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, getDivisionColor, getDivisionLabel, DIVISIONS } from '@/lib/divisions';
import { Project, Objective, Task, Priority, ProjectStatus, ObjectiveStatus } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  ChevronLeft, Edit2, Trash2, Plus, X, CheckCircle2,
  Circle, Clock, AlertCircle, Target, CheckSquare,
  FolderOpen, FileText, BarChart2, Pen, User, Calendar,
  DollarSign, Flag, Tag
} from 'lucide-react';

const TABS = ['Aperçu', 'Objectifs', 'Tâches', 'Gantt', 'Fichiers', 'Notes', 'Canvas'] as const;
type Tab = typeof TABS[number];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Actif', paused: 'En pause', completed: 'Terminé', cancelled: 'Annulé'
};
const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: '#1D9E75', paused: '#888780', completed: '#4A62D8', cancelled: '#D85A30'
};
const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgent'
};
const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#888780', medium: '#378ADD', high: '#D85A30', urgent: '#C4517A'
};
const OBJ_STATUS_LABEL: Record<ObjectiveStatus, string> = {
  not_started: 'Non démarré', in_progress: 'En cours', done: 'Terminé'
};

function ProgressRing({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dy={5}
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: 14, fontWeight: 700, fill: color }}>
        {value}%
      </text>
    </svg>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Aperçu');
  const [loading, setLoading] = useState(true);

  // Objective form
  const [showObjDrawer, setShowObjDrawer] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [objForm, setObjForm] = useState<Partial<Objective>>({});
  const [expandedObjs, setExpandedObjs] = useState<Set<string>>(new Set());
  const [objTasks, setObjTasks] = useState<Record<string, Task[]>>({});

  // Task form
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [taskForObj, setTaskForObj] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<Task>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: objs }, { data: tsks }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('objectives').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('tasks').select('*').eq('project_id', id).order('sort_order'),
    ]);
    setProject(proj);
    setObjectives(objs ?? []);
    setTasks(tsks ?? []);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  const loadObjTasks = async (objId: string) => {
    const { data } = await supabase.from('tasks').select('*').eq('objective_id', objId).order('sort_order');
    setObjTasks(prev => ({ ...prev, [objId]: data ?? [] }));
  };

  const toggleObj = (objId: string) => {
    setExpandedObjs(prev => {
      const next = new Set(prev);
      if (next.has(objId)) { next.delete(objId); } else { next.add(objId); loadObjTasks(objId); }
      return next;
    });
  };

  const saveObjective = async () => {
    if (!objForm.title?.trim()) return;
    const payload = { ...objForm, project_id: id };
    if (editingObj) {
      await supabase.from('objectives').update(payload).eq('id', editingObj.id);
    } else {
      await supabase.from('objectives').insert({ ...payload, progress: 0, status: 'not_started' });
    }
    setShowObjDrawer(false);
    load();
  };

  const deleteObjective = async (objId: string) => {
    if (!window.confirm('Supprimer cet objectif et toutes ses tâches ?')) return;
    await supabase.from('objectives').delete().eq('id', objId);
    load();
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }).eq('id', task.id);
    if (task.objective_id) {
      const { data: allTasks } = await supabase.from('tasks').select('status').eq('objective_id', task.objective_id);
      const done = (allTasks ?? []).filter((t: any) => t.status === 'done' || (t.id === task.id && newStatus === 'done')).length;
      const pct = allTasks?.length ? Math.round((done / allTasks.length) * 100) : 0;
      await supabase.from('objectives').update({ progress: pct, status: pct === 100 ? 'done' : pct > 0 ? 'in_progress' : 'not_started' }).eq('id', task.objective_id);
    }
    load();
    if (task.objective_id) loadObjTasks(task.objective_id);
  };

  const saveTask = async () => {
    if (!taskForm.title?.trim()) return;
    await supabase.from('tasks').insert({ ...taskForm, project_id: id, objective_id: taskForObj, status: 'todo' });
    setShowTaskDrawer(false);
    setTaskForm({});
    load();
    if (taskForObj) loadObjTasks(taskForObj);
  };

  if (loading || !project) {
    return (
      <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
        <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Chargement…</div>
      </AppShell>
    );
  }

  const color = getDivisionColor(project.division);
  const doneObjectives = objectives.filter(o => o.status === 'done').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ height: '100%', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', background: `linear-gradient(135deg, ${color}10, ${color}05)`, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="nm-btn" style={{ marginBottom: 16, padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => router.push('/projects')}>
            <ChevronLeft size={13} /> Projets
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            {/* Title + meta */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{getDivisionLabel(project.division)}</span>
                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99, background: `${STATUS_COLOR[project.status]}18`, color: STATUS_COLOR[project.status], fontWeight: 600 }}>
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
              <h1 className="heading" style={{ fontSize: '2rem', marginBottom: 4 }}>{project.name}</h1>
              {project.client_name && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{project.client_name}</p>
              )}
            </div>

            {/* Progress ring */}
            <ProgressRing value={project.progress} color={color} size={90} />
          </div>

          {/* Info tiles */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {project.responsible && (
              <div className="nm-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={12} style={{ color }} />
                <span style={{ fontSize: '0.72rem' }}>{project.responsible}</span>
              </div>
            )}
            {project.end_date && (
              <div className="nm-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={12} style={{ color }} />
                <span style={{ fontSize: '0.72rem' }}>{new Date(project.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {project.budget && (
              <div className="nm-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={12} style={{ color }} />
                <span style={{ fontSize: '0.72rem' }}>{Number(project.budget).toLocaleString('fr-FR')} MAD</span>
              </div>
            )}
            <div className="nm-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag size={12} style={{ color: PRIORITY_COLOR[project.priority] }} />
              <span style={{ fontSize: '0.72rem', color: PRIORITY_COLOR[project.priority] }}>{PRIORITY_LABEL[project.priority]}</span>
            </div>
            <div className="nm-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={12} style={{ color }} />
              <span style={{ fontSize: '0.72rem' }}>{doneObjectives}/{objectives.length} objectifs</span>
            </div>
            <div className="nm-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={12} style={{ color }} />
              <span style={{ fontSize: '0.72rem' }}>{doneTasks}/{tasks.length} tâches</span>
            </div>
          </div>

          {/* Tags */}
          {(project.tags ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
              {(project.tags ?? []).map(tag => (
                <span key={tag} style={{ fontSize: '0.65rem', padding: '3px 9px', borderRadius: 99, background: `${color}18`, color }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, overflow: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? color : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? `2px solid ${color}` : '2px solid transparent',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px' }}>

          {/* ── Aperçu ── */}
          {activeTab === 'Aperçu' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {project.description && (
                <div className="nm-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
                  <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 10 }}>Description</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{project.description}</p>
                </div>
              )}
              {project.notes && (
                <div className="nm-card" style={{ padding: 24 }}>
                  <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 10 }}>Notes</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{project.notes}</p>
                </div>
              )}
              <div className="nm-card" style={{ padding: 24 }}>
                <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 14 }}>Objectifs ({objectives.length})</h3>
                {objectives.slice(0, 4).map(obj => (
                  <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {obj.status === 'done' ? <CheckCircle2 size={14} style={{ color: '#1D9E75', flexShrink: 0 }} /> : <Circle size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />}
                    <span className="truncate" style={{ fontSize: '0.8rem', flex: 1 }}>{obj.title}</span>
                    <span style={{ fontSize: '0.65rem', color, fontWeight: 600, flexShrink: 0 }}>{obj.progress}%</span>
                  </div>
                ))}
                {objectives.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aucun objectif.</p>}
                <button className="nm-btn" style={{ marginTop: 10, fontSize: '0.72rem', padding: '6px 12px' }} onClick={() => setActiveTab('Objectifs')}>
                  Voir tous les objectifs →
                </button>
              </div>
            </div>
          )}

          {/* ── Objectifs ── */}
          {activeTab === 'Objectifs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="heading" style={{ fontSize: '1.2rem' }}>Objectifs ({objectives.length})</h2>
                <button className="nm-btn nm-btn-primary" onClick={() => { setEditingObj(null); setObjForm({ priority: 'medium', status: 'not_started' }); setShowObjDrawer(true); }}>
                  <Plus size={13} /> Nouvel objectif
                </button>
              </div>

              {objectives.length === 0 ? (
                <div className="nm-card" style={{ padding: '50px', textAlign: 'center' }}>
                  <Target size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>Aucun objectif pour ce projet.</p>
                  <button className="nm-btn nm-btn-primary" onClick={() => { setEditingObj(null); setObjForm({ priority: 'medium', status: 'not_started' }); setShowObjDrawer(true); }}>
                    <Plus size={13} /> Créer un objectif
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {objectives.map(obj => {
                    const isExpanded = expandedObjs.has(obj.id);
                    const objTaskList = objTasks[obj.id] ?? [];
                    return (
                      <div key={obj.id} className="nm-card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                          onClick={() => toggleObj(obj.id)}>
                          {obj.status === 'done'
                            ? <CheckCircle2 size={18} style={{ color: '#1D9E75', flexShrink: 0 }} />
                            : obj.status === 'in_progress'
                              ? <Clock size={18} style={{ color: '#D85A30', flexShrink: 0 }} />
                              : <Circle size={18} style={{ color: 'var(--text-light)', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span className="truncate" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{obj.title}</span>
                              <span style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 99, background: `${PRIORITY_COLOR[obj.priority]}18`, color: PRIORITY_COLOR[obj.priority], fontWeight: 600, flexShrink: 0 }}>
                                {PRIORITY_LABEL[obj.priority]}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ flex: 1, maxWidth: 200, boxShadow: 'var(--inset-xs)', borderRadius: 99, height: 5, background: 'var(--bg)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${obj.progress}%`, background: color, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: '0.65rem', color, fontWeight: 700 }}>{obj.progress}%</span>
                              {obj.deadline && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Calendar size={9} />{new Date(obj.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="nm-btn" style={{ padding: 5 }} onClick={e => { e.stopPropagation(); setEditingObj(obj); setObjForm(obj); setShowObjDrawer(true); }}>
                              <Edit2 size={11} />
                            </button>
                            <button className="nm-btn" style={{ padding: 5, color: '#D85A30' }} onClick={e => { e.stopPropagation(); deleteObjective(obj.id); }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '12px 20px 16px' }}>
                            {obj.description && (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>{obj.description}</p>
                            )}
                            {objTaskList.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                {objTaskList.map(task => (
                                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, marginBottom: 3, background: task.status === 'done' ? 'rgba(29,158,117,0.05)' : 'transparent' }}>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                      onClick={() => toggleTask(task)}>
                                      {task.status === 'done'
                                        ? <CheckCircle2 size={15} style={{ color: '#1D9E75' }} />
                                        : <Circle size={15} style={{ color: 'var(--text-light)' }} />}
                                    </button>
                                    <span className="truncate" style={{ flex: 1, fontSize: '0.8rem', textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                      {task.title}
                                    </span>
                                    {task.assigned_to && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{task.assigned_to}</span>}
                                    {task.deadline && <span style={{ fontSize: '0.65rem', color: new Date(task.deadline) < new Date() && task.status !== 'done' ? '#C4517A' : 'var(--text-muted)' }}>{new Date(task.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            <button className="nm-btn" style={{ fontSize: '0.72rem', padding: '5px 12px' }}
                              onClick={() => { setTaskForObj(obj.id); setTaskForm({ priority: 'medium' }); setShowTaskDrawer(true); }}>
                              <Plus size={11} /> Ajouter une tâche
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Other tabs ── */}
          {activeTab === 'Tâches' && (
            <div className="nm-card" style={{ padding: 32, textAlign: 'center' }}>
              <CheckSquare size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Voir le tableau global des tâches pour ce projet.</p>
              <a href="/tasks" className="nm-btn" style={{ display: 'inline-flex', marginTop: 12 }}>Ouvrir les tâches</a>
            </div>
          )}
          {activeTab === 'Gantt' && (
            <div className="nm-card" style={{ padding: 32, textAlign: 'center' }}>
              <BarChart2 size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Diagramme Gantt pour ce projet.</p>
              <a href="/gantt" className="nm-btn" style={{ display: 'inline-flex', marginTop: 12 }}>Ouvrir le Gantt</a>
            </div>
          )}
          {activeTab === 'Fichiers' && (
            <div className="nm-card" style={{ padding: 32, textAlign: 'center' }}>
              <FolderOpen size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestion des fichiers pour ce projet.</p>
              <a href="/files" className="nm-btn" style={{ display: 'inline-flex', marginTop: 12 }}>Ouvrir les fichiers</a>
            </div>
          )}
          {activeTab === 'Notes' && (
            <div className="nm-card" style={{ padding: 32, textAlign: 'center' }}>
              <FileText size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Notes et documents liés à ce projet.</p>
              <a href="/notes" className="nm-btn" style={{ display: 'inline-flex', marginTop: 12 }}>Ouvrir les notes</a>
            </div>
          )}
          {activeTab === 'Canvas' && (
            <div className="nm-card" style={{ padding: 32, textAlign: 'center' }}>
              <Pen size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tableaux de dessin liés à ce projet.</p>
              <a href="/canvas" className="nm-btn" style={{ display: 'inline-flex', marginTop: 12 }}>Ouvrir le canvas</a>
            </div>
          )}
        </div>
      </div>

      {/* ── Objective Drawer ── */}
      {showObjDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setShowObjDrawer(false)}>
          <div className="nm-card" style={{ width: 380, height: '100%', borderRadius: '20px 0 0 20px', padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="heading" style={{ fontSize: '1.1rem' }}>{editingObj ? 'Modifier' : 'Nouvel objectif'}</h2>
              <button className="nm-btn" style={{ padding: 7 }} onClick={() => setShowObjDrawer(false)}><X size={13} /></button>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>TITRE *</label>
              <input className="nm-input" style={{ width: '100%' }} placeholder="Titre de l'objectif" value={objForm.title ?? ''}
                onChange={e => setObjForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>DESCRIPTION</label>
              <textarea className="nm-input" rows={3} style={{ width: '100%', resize: 'vertical' }} value={objForm.description ?? ''}
                onChange={e => setObjForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PRIORITÉ</label>
                <select className="nm-input" style={{ width: '100%' }} value={objForm.priority ?? 'medium'}
                  onChange={e => setObjForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                  <option value="low">Basse</option><option value="medium">Moyenne</option>
                  <option value="high">Haute</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>ÉCHÉANCE</label>
                <input type="date" className="nm-input" style={{ width: '100%' }} value={objForm.deadline ?? ''}
                  onChange={e => setObjForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <button className="nm-btn nm-btn-primary" style={{ justifyContent: 'center', marginTop: 8 }} onClick={saveObjective}>
              {editingObj ? 'Enregistrer' : 'Créer l\'objectif'}
            </button>
          </div>
        </div>
      )}

      {/* ── Task Drawer ── */}
      {showTaskDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setShowTaskDrawer(false)}>
          <div className="nm-card" style={{ width: 380, height: '100%', borderRadius: '20px 0 0 20px', padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="heading" style={{ fontSize: '1.1rem' }}>Nouvelle tâche</h2>
              <button className="nm-btn" style={{ padding: 7 }} onClick={() => setShowTaskDrawer(false)}><X size={13} /></button>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>TITRE *</label>
              <input className="nm-input" style={{ width: '100%' }} placeholder="Titre de la tâche" value={taskForm.title ?? ''}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>DESCRIPTION</label>
              <textarea className="nm-input" rows={2} style={{ width: '100%', resize: 'vertical' }} value={taskForm.description ?? ''}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PRIORITÉ</label>
                <select className="nm-input" style={{ width: '100%' }} value={taskForm.priority ?? 'medium'}
                  onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                  <option value="low">Basse</option><option value="medium">Moyenne</option>
                  <option value="high">Haute</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>ÉCHÉANCE</label>
                <input type="date" className="nm-input" style={{ width: '100%' }} value={taskForm.deadline ?? ''}
                  onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>ASSIGNÉ À</label>
                <input className="nm-input" style={{ width: '100%' }} placeholder="Nom" value={taskForm.assigned_to ?? ''}
                  onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>HEURES EST.</label>
                <input type="number" className="nm-input" style={{ width: '100%' }} placeholder="0" value={taskForm.estimated_hours ?? ''}
                  onChange={e => setTaskForm(f => ({ ...f, estimated_hours: Number(e.target.value) }))} />
              </div>
            </div>
            <button className="nm-btn nm-btn-primary" style={{ justifyContent: 'center', marginTop: 8 }} onClick={saveTask}>
              Créer la tâche
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
