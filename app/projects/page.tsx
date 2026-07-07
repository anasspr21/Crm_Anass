'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor, getDivisionLabel } from '@/lib/divisions';
import { Project, ProjectStatus, Priority } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  Plus, X, Trash2, Search, FolderOpen, Calendar, User,
  DollarSign, Tag, ChevronDown, AlertCircle, Clock, CheckCircle, PauseCircle,
  Filter, ArrowUpDown, Edit2
} from 'lucide-react';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: 'Actif',     color: '#1D9E75', icon: CheckCircle },
  paused:    { label: 'En pause',  color: '#888780', icon: PauseCircle },
  completed: { label: 'Terminé',   color: '#4A62D8', icon: CheckCircle },
  cancelled: { label: 'Annulé',    color: '#D85A30', icon: X },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:    { label: 'Basse',   color: '#888780' },
  medium: { label: 'Moyenne', color: '#378ADD' },
  high:   { label: 'Haute',   color: '#D85A30' },
  urgent: { label: 'Urgent',  color: '#C4517A' },
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ boxShadow: 'var(--inset-xs)', borderRadius: 99, height: 6, background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: `linear-gradient(90deg, ${color}, ${color}bb)`,
        borderRadius: 99,
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

const EMPTY_FORM: Partial<Project> = {
  division: 'agencement',
  name: '',
  client_name: '',
  description: '',
  status: 'active',
  priority: 'medium',
  start_date: '',
  end_date: '',
  budget: undefined,
  responsible: '',
  tags: [],
  notes: '',
};

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updated_at' | 'name' | 'progress' | 'end_date'>('updated_at');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('projects').select('*').order(sortBy, { ascending: sortBy === 'name' });
    if (activeDivision) q = q.eq('division', activeDivision);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setProjects((data ?? []).filter((p: any) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name ?? '').toLowerCase().includes(search.toLowerCase())
    ));
    setLoading(false);
  }, [activeDivision, statusFilter, sortBy, search, supabase]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const openCreate = () => {
    setEditingProject(null);
    setForm({ ...EMPTY_FORM, division: activeDivision ?? 'agencement' });
    setTagsInput('');
    setShowDrawer(true);
  };

  const openEdit = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(p);
    setForm(p);
    setTagsInput((p.tags ?? []).join(', '));
    setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
      budget: form.budget ? Number(form.budget) : null,
    };
    if (editingProject) {
      await supabase.from('projects').update(payload).eq('id', editingProject.id);
      await supabase.from('activity_log').insert({ entity_type: 'project', entity_id: editingProject.id, entity_name: form.name, action: 'updated' });
    } else {
      const { data } = await supabase.from('projects').insert({ ...payload, progress: 0 }).select().single();
      if (data) await supabase.from('activity_log').insert({ entity_type: 'project', entity_id: data.id, entity_name: form.name, action: 'created' });
    }
    setSaving(false);
    setShowDrawer(false);
    loadProjects();
  };

  const handleDelete = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le projet "${p.name}" ?`)) return;
    await supabase.from('projects').delete().eq('id', p.id);
    await supabase.from('activity_log').insert({ entity_type: 'project', entity_id: p.id, entity_name: p.name, action: 'deleted' });
    loadProjects();
  };

  const statusCounts = (Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => ({
    status: s,
    count: projects.filter(p => p.status === s).length,
  }));

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 className="heading" style={{ fontSize: '1.75rem', marginBottom: 4 }}>Projets</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {projects.length} projet{projects.length !== 1 ? 's' : ''} {activeDivision ? `· ${getDivisionLabel(activeDivision)}` : '· Toutes divisions'}
            </p>
          </div>
          <button className="nm-btn nm-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Nouveau projet
          </button>
        </div>

        {/* Status summary row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {statusCounts.map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                className="nm-btn"
                style={{
                  boxShadow: statusFilter === status ? 'var(--inset-sm)' : 'var(--raised-xs)',
                  color: statusFilter === status ? cfg.color : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  padding: '6px 14px',
                  gap: 6,
                }}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="nm-card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="nm-input" placeholder="Rechercher par nom, client…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: '100%' }} />
          </div>
          <select className="nm-input" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ width: 'auto' }}>
            <option value="updated_at">Trier : Récent</option>
            <option value="name">Trier : Nom</option>
            <option value="progress">Trier : Progression</option>
            <option value="end_date">Trier : Échéance</option>
          </select>
        </div>

        {/* Project cards grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Chargement…</div>
        ) : projects.length === 0 ? (
          <div className="nm-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
            <FolderOpen size={48} style={{ color: 'var(--text-light)', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
              {search || statusFilter !== 'all' ? 'Aucun projet correspondant.' : 'Aucun projet. Créez votre premier projet.'}
            </p>
            {!search && statusFilter === 'all' && (
              <button className="nm-btn nm-btn-primary" onClick={openCreate}><Plus size={14} /> Créer un projet</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map((p, i) => {
              const color = getDivisionColor(p.division);
              const statusCfg = STATUS_CONFIG[p.status];
              const priorityCfg = PRIORITY_CONFIG[p.priority];
              const isOverdue = p.end_date && new Date(p.end_date) < new Date() && p.status !== 'completed';
              return (
                <div
                  key={p.id}
                  className="nm-card fade-up"
                  style={{
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    animationDelay: `${i * 0.04}s`,
                  }}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--raised)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                >
                  {/* Color top bar */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

                  <div style={{ padding: '18px 20px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{getDivisionLabel(p.division)}</span>
                        </div>
                        <h3 className="truncate" style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 2 }}>{p.name}</h3>
                        {p.client_name && (
                          <p className="truncate" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.client_name}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                        <button className="nm-btn" style={{ padding: '5px', boxShadow: 'var(--raised-xs)' }}
                          onClick={e => openEdit(p, e)}>
                          <Edit2 size={11} />
                        </button>
                        <button className="nm-btn" style={{ padding: '5px', boxShadow: 'var(--raised-xs)', color: '#D85A30' }}
                          onClick={e => handleDelete(p, e)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: `${statusCfg.color}18`, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: `${priorityCfg.color}18`, color: priorityCfg.color }}>
                        {priorityCfg.label}
                      </span>
                      {isOverdue && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: '#C4517A18', color: '#C4517A' }}>
                          En retard
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Progression</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{p.progress}%</span>
                      </div>
                      <ProgressBar value={p.progress} color={color} />
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {p.responsible && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <User size={10} />{p.responsible}
                          </span>
                        )}
                        {p.end_date && (
                          <span style={{ fontSize: '0.65rem', color: isOverdue ? '#C4517A' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={10} />{new Date(p.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {p.budget && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <DollarSign size={10} />{Number(p.budget).toLocaleString('fr-FR')} MAD
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {(p.tags ?? []).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        {(p.tags ?? []).slice(0, 4).map(tag => (
                          <span key={tag} style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 99, background: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {showDrawer && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="nm-card"
            style={{ width: '100%', maxWidth: 440, height: '100%', borderRadius: '20px 0 0 20px', padding: '28px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="heading" style={{ fontSize: '1.25rem' }}>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</h2>
              <button className="nm-btn" style={{ padding: 8 }} onClick={() => setShowDrawer(false)}><X size={14} /></button>
            </div>

            {/* Division */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>DIVISION</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIVISIONS.map(d => (
                  <button key={d.key} className="nm-btn"
                    style={{ fontSize: '0.7rem', padding: '5px 10px', boxShadow: form.division === d.key ? 'var(--inset-sm)' : 'var(--raised-xs)', color: form.division === d.key ? d.color : 'var(--text-muted)', fontWeight: form.division === d.key ? 700 : 400 }}
                    onClick={() => setForm(f => ({ ...f, division: d.key }))}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, display: 'inline-block', marginRight: 4 }} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>NOM DU PROJET *</label>
              <input className="nm-input" placeholder="Ex: Rénovation Salon" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
            </div>

            {/* Client */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>CLIENT</label>
              <input className="nm-input" placeholder="Nom du client" value={form.client_name ?? ''} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} style={{ width: '100%' }} />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIPTION</label>
              <textarea className="nm-input" placeholder="Description du projet…" value={form.description ?? ''} rows={3}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            {/* Status + Priority row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>STATUT</label>
                <select className="nm-input" value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))} style={{ width: '100%' }}>
                  {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PRIORITÉ</label>
                <select className="nm-input" value={form.priority ?? 'medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} style={{ width: '100%' }}>
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                </select>
              </div>
            </div>

            {/* Dates row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DATE DÉBUT</label>
                <input type="date" className="nm-input" value={form.start_date ?? ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DATE FIN</label>
                <input type="date" className="nm-input" value={form.end_date ?? ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Budget + Responsible */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>BUDGET (MAD)</label>
                <input type="number" className="nm-input" placeholder="0" value={form.budget ?? ''} onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) || undefined }))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>RESPONSABLE</label>
                <input className="nm-input" placeholder="Nom" value={form.responsible ?? ''} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TAGS (séparés par virgule)</label>
              <input className="nm-input" placeholder="design, urgent, phase2" value={tagsInput} onChange={e => setTagsInput(e.target.value)} style={{ width: '100%' }} />
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>NOTES</label>
              <textarea className="nm-input" placeholder="Notes internes…" value={form.notes ?? ''} rows={3}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="nm-btn nm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave} disabled={saving || !form.name?.trim()}>
                {saving ? 'Enregistrement…' : editingProject ? 'Enregistrer' : 'Créer le projet'}
              </button>
              <button className="nm-btn" style={{ padding: '10px 20px' }} onClick={() => setShowDrawer(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
