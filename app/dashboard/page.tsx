'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey } from '@/lib/divisions';
import { TrendingUp, TrendingDown, Users, CheckCircle, Clock, Zap, Plus, X } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { Project, Task } from '@/lib/types';

// ── Types for Dashboard ────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  status: 'online' | 'offline' | 'away';
  color: string;
}

// ── Neumorphic stat tile ───────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  trend,
  trendUp,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  return (
    <div
      className={`nm-card-sm fade-up fade-up-${delay}`}
      style={{ padding: '20px 22px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--inset-sm)',
            background: 'var(--bg)',
          }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className={`trend-pill ${trendUp ? 'trend-up' : 'trend-down'}`}>
          {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend}
        </span>
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ── Task with neumorphic checkbox ──────────────────────────────────────────────
function TaskItem({ task, onToggle }: { task: Task; onToggle: (t: Task) => void }) {
  const done = task.status === 'done';
  const color = task.priority === 'high' || task.priority === 'urgent' ? '#D85A30' : '#378ADD';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <div className={`nm-checkbox ${done ? 'checked' : ''}`} onClick={() => onToggle(task)}
        style={done ? { '--checkmark-color': color } as React.CSSProperties : undefined}
      />
      <span
        style={{
          fontSize: '0.8125rem',
          color: done ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: done ? 'line-through' : 'none',
          fontWeight: done ? 300 : 400,
        }}
      >
        {task.title}
      </span>
      <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
    </div>
  );
}

// ── Project hero card (column A) ───────────────────────────────────────────────
function ProjectCard({ delay, projects }: { delay: number; projects: Project[] }) {
  const latestProject = projects.length > 0 ? projects[0] : null;

  return (
    <div
      className={`nm-card fade-up fade-up-${delay}`}
      style={{ padding: 0, overflow: 'hidden', gridRow: 'span 2' }}
    >
      {/* Gradient hero */}
      <div
        style={{
          background: 'linear-gradient(145deg, #4A62D8, #7254C8, #C4517A)',
          padding: '32px 28px 40px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 220,
        }}
      >
        {/* Decorative blobs */}
        {[
          { size: 160, top: -40, right: -30, opacity: 0.08 },
          { size: 100, top: 60, right: 40, opacity: 0.06 },
          { size: 80,  top: 10, left: -20, opacity: 0.05 },
        ].map((blob, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: blob.size,
              height: blob.size,
              borderRadius: '50%',
              background: 'white',
              opacity: blob.opacity,
              top: blob.top,
              right: 'right' in blob ? blob.right : undefined,
              left: 'left' in blob ? blob.left : undefined,
            }}
          />
        ))}
        {/* Frosted badge */}
        <div
          className="glass"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            marginBottom: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'white',
          }}
        >
          <Zap size={10} />
          {latestProject ? (latestProject.status === 'active' ? 'EN COURS' : 'PROJET') : 'AUCUN PROJET'}
        </div>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '1.5rem',
            color: 'white',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}
        >
          {latestProject?.name || 'Créer un projet pour commencer'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          {latestProject ? `Projet ${latestProject.division} · Client: ${latestProject.client_name || 'N/A'}` : 'Veuillez ajouter un projet depuis l\'onglet Projets.'}
        </p>
      </div>

      {/* Card body */}
      <div style={{ padding: '24px 28px' }}>
        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avancement global</span>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.9rem', color: 'var(--text-primary)' }}>{latestProject?.progress || 0}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${latestProject?.progress || 0}%` }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Projets totaux', value: projects.length.toString() },
            { label: 'Statut', value: latestProject?.status || 'N/A' },
            { label: 'Priorité', value: latestProject?.priority || 'N/A' },
            { label: 'Budget', value: latestProject?.budget ? `${latestProject.budget} DH` : '-' },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '10px 14px',
                boxShadow: 'var(--raised-xs)',
              }}
            >
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Team roster (column C) ────────────────────────────────────────────────────
function TeamRosterCard({ delay, members, onDelete }: { delay: number; members: TeamMember[]; onDelete: (id: string) => void }) {
  return (
    <div className={`nm-card-sm fade-up fade-up-${delay}`} style={{ padding: '22px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Users size={16} style={{ color: 'var(--text-muted)' }} />
        <h3 className="heading" style={{ fontSize: '1rem', margin: 0 }}>Équipe</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
            Aucun membre. Invitez quelqu'un !
          </div>
        ) : members.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--inset-sm)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${m.color}, ${m.color}99)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                {m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div
                className={`status-dot status-${m.status}`}
                style={{ position: 'absolute', bottom: 0, right: 0 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: '0.775rem', fontWeight: 500 }}>
                {m.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.role}</div>
            </div>
            <button
              onClick={() => onDelete(m.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Roadmap timeline (section 2) ──────────────────────────────────────────────
const MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

const todayPct = `${(new Date().getMonth() / 11) * 100}%`;

function RoadmapCard({ projects }: { projects: Project[] }) {
  // Translate projects into roadmap items spanning some width
  // This is a simple visual approximation for the dashboard
  const ROADMAP_ITEMS = projects.slice(0, 6).map((p, index) => {
    const colors = ['#4A62D8', '#7254C8', '#1D9E75', '#D85A30', '#C4517A'];
    const color = colors[index % colors.length];
    return {
      label: p.name,
      left: `${(index * 10) % 60}%`, // Fake staggered start
      width: `${20 + (p.progress || 0) / 2}%`, // Fake width based on progress
      color,
      division: p.division,
    };
  });

  return (
    <div className="nm-card fade-up fade-up-4" style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 className="heading" style={{ fontSize: '1.1rem', margin: 0 }}>Feuille de route des projets</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2026</span>
      </div>

      {/* Month headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', marginBottom: 8 }}>
        {MONTHS.map((m) => (
          <div key={m} style={{ fontSize: '0.65rem', color: 'var(--text-light)', fontWeight: 500, textAlign: 'center' }}>
            {m}
          </div>
        ))}
      </div>

      {/* Timeline container */}
      <div style={{ position: 'relative' }}>
        {/* Today marker */}
        <div className="today-marker" style={{ left: todayPct }}>
          <div className="today-chip">Auj.</div>
        </div>

        {/* Month grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            pointerEvents: 'none',
          }}
        >
          {MONTHS.map((m, i) => (
            <div
              key={m}
              style={{
                borderLeft: i > 0 ? '1px dashed rgba(0,0,0,0.06)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 28, minHeight: 100 }}>
          {ROADMAP_ITEMS.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>Aucun projet pour la feuille de route.</div>
          ) : ROADMAP_ITEMS.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 110, flexShrink: 0 }}>
                <div className="truncate" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{item.division}</div>
              </div>
              <div className="timeline-bar-track" style={{ flex: 1 }}>
                <div
                  className="timeline-bar-segment"
                  style={{
                    left: item.left,
                    width: item.width,
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}bb)`,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Integration grid ──────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { name: 'Supabase',    icon: '🗄️',  connected: true,  color: '#3ECF8E' },
  { name: 'Vercel',      icon: '▲',   connected: true,  color: '#000' },
  { name: 'GitHub',      icon: '🐙',  connected: true,  color: '#333' },
  { name: 'Google Cal',  icon: '📅',  connected: false, color: '#4285F4' },
];

function IntegrationGrid() {
  const [states, setStates] = useState(INTEGRATIONS.map(i => i.connected));
  return (
    <div className="nm-card-sm" style={{ padding: '22px 20px' }}>
      <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 18 }}>Intégrations</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {INTEGRATIONS.map((item, i) => (
          <div
            key={item.name}
            className={`integration-tile ${states[i] ? 'connected' : ''}`}
            style={{ padding: '16px 8px', borderRadius: 12 }}
            onClick={() => setStates(s => { const n = [...s]; n[i] = !n[i]; return n; })}
          >
            <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center' }}>
              {item.name}
            </div>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: states[i] ? item.color : 'var(--bg-dark)',
                boxShadow: states[i] ? `0 0 6px ${item.color}66` : 'none',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Invite card ───────────────────────────────────────────────────────────────
function InviteCard({ onAdd }: { onAdd: (name: string, role: string, email: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (name && role) {
      onAdd(name, role, email);
      setName('');
      setRole('');
      setEmail('');
    }
  };

  return (
    <div className="nm-card-sm" style={{ padding: '22px 20px' }}>
      <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 6 }}>Ajouter un membre</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 18 }}>
        Gérez votre équipe directement ici.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <input
          className="nm-input"
          type="text"
          placeholder="Nom complet"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="nm-input"
          type="text"
          placeholder="Rôle (ex: Architecte)"
          value={role}
          onChange={e => setRole(e.target.value)}
        />
        <input
          className="nm-input"
          type="email"
          placeholder="Email (optionnel)"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button
          className="nm-btn nm-btn-primary"
          style={{ justifyContent: 'center' }}
          onClick={handleSubmit}
          disabled={!name || !role}
        >
          <Plus size={16} style={{ marginRight: 6 }}/> Ajouter à l'équipe
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Fetch Projects
      let pQuery = supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (activeDivision) pQuery = pQuery.eq('division', activeDivision);
      const { data: pData } = await pQuery;
      
      // Fetch Tasks
      let tQuery = supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5);
      const { data: tData } = await tQuery;

      // Fetch Members
      const { data: mData } = await supabase.from('team_members').select('*').order('created_at', { ascending: true });

      if (pData) setProjects(pData as Project[]);
      if (tData) setTasks(tData as Task[]);
      if (mData) setMembers(mData as TeamMember[]);

      setIsLoading(false);
    };
    fetchData();
  }, [activeDivision]);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  };

  const handleAddMember = async (name: string, role: string, email: string) => {
    const colors = ['#4A62D8', '#1D9E75', '#D85A30', '#7F77DD', '#378ADD'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const newMember = { name, role, email, status: 'online', color };
    
    const { data } = await supabase.from('team_members').insert([newMember]).select().single();
    if (data) {
      setMembers([...members, data as TeamMember]);
    }
  };

  const handleDeleteMember = async (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    await supabase.from('team_members').delete().eq('id', id);
  };

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ padding: '32px 32px 48px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {/* Page header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 className="heading" style={{ fontSize: '2rem', marginBottom: 4 }}>
            Tableau de bord
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Bienvenue, Anass · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* ── Section 1 — 3-column bento ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: 18,
            marginBottom: 18,
            opacity: isLoading ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {/* Column A — Project card (tall) */}
          <ProjectCard delay={1} projects={projects} />

          {/* Column B — Stat tiles + task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <StatTile label="Projets actifs"    value={projects.filter(p => p.status === 'active').length.toString()}    trend=""  trendUp icon={CheckCircle} color="#1D9E75" delay={2} />
            <StatTile label="Tâches récentes" value={tasks.length.toString()}   trend=""  trendUp icon={Clock}       color="#378ADD" delay={3} />
            <StatTile label="Membres équipe"  value={members.length.toString()} trend="" trendUp icon={Users} color="#D85A30" delay={4} />

            {/* Task list */}
            <div className="nm-card-sm fade-up fade-up-5" style={{ padding: '20px 22px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle size={14} style={{ color: 'var(--text-muted)' }} />
                <h3 className="heading" style={{ fontSize: '0.95rem', margin: 0 }}>Dernières tâches</h3>
              </div>
              <div>
                {tasks.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 0' }}>Aucune tâche.</div>
                ) : tasks.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={toggleTask} />
                ))}
              </div>
            </div>
          </div>

          {/* Column C — Team roster */}
          <TeamRosterCard delay={2} members={members} onDelete={handleDeleteMember} />
        </div>

        {/* ── Section 2 — Roadmap ── */}
        <div style={{ marginBottom: 18 }}>
          <RoadmapCard projects={projects} />
        </div>

        {/* ── Section 3 — Integrations + Invite ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <IntegrationGrid />
          <InviteCard onAdd={handleAddMember} />
        </div>
      </div>
    </AppShell>
  );
}
