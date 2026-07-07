'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS } from '@/lib/divisions';
import { TrendingUp, TrendingDown, Users, CheckCircle, Clock, Zap } from 'lucide-react';

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
function TaskItem({ label, done, color }: { label: string; done: boolean; color: string }) {
  const [checked, setChecked] = useState(done);
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
      <div className={`nm-checkbox ${checked ? 'checked' : ''}`} onClick={() => setChecked(!checked)}
        style={checked ? { '--checkmark-color': color } as React.CSSProperties : undefined}
      />
      <span
        style={{
          fontSize: '0.8125rem',
          color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: checked ? 'line-through' : 'none',
          fontWeight: checked ? 300 : 400,
        }}
      >
        {label}
      </span>
      <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
    </div>
  );
}

// ── Project hero card (column A) ───────────────────────────────────────────────
function ProjectCard({ delay }: { delay: number }) {
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
          EN COURS
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
          Rénovation Showroom Casablanca
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          Projet Agencement · Phase 2
        </p>
      </div>

      {/* Card body */}
      <div style={{ padding: '24px 28px' }}>
        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avancement global</span>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.9rem', color: 'var(--text-primary)' }}>68%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '68%' }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Tâches', value: '24 / 35' },
            { label: 'Jours restants', value: '12' },
            { label: 'Documents', value: '48' },
            { label: 'Réunions', value: '6' },
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
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem' }}>{value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="avatar-stack">
            {['AE', 'MB', 'KD', 'SL'].map((initials, i) => (
              <div
                key={i}
                className="avatar"
                style={{
                  background: `linear-gradient(135deg, ${['#4A62D8','#1D9E75','#D85A30','#7F77DD'][i]}, ${['#7254C8','#378ADD','#C4517A','#1D9E75'][i]})`,
                }}
              >
                {initials}
              </div>
            ))}
            <div
              className="avatar"
              style={{ background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '0.65rem', boxShadow: 'var(--raised-xs)' }}
            >
              +2
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>6 membres</span>
        </div>
      </div>
    </div>
  );
}

// ── Team roster (column C) ────────────────────────────────────────────────────
function TeamRosterCard({ delay }: { delay: number }) {
  const members = [
    { name: 'Anass Elhafdaoui', role: 'Chef de projet', hours: '42h', status: 'online',  color: '#4A62D8' },
    { name: 'Mariam Benali',    role: 'Architecte',     hours: '38h', status: 'online',  color: '#1D9E75' },
    { name: 'Karim Daoudi',     role: 'Ingénieur',      hours: '35h', status: 'away',    color: '#D85A30' },
    { name: 'Sofia Lahlou',     role: 'Designer',       hours: '28h', status: 'offline', color: '#7F77DD' },
    { name: 'Youssef Amrani',   role: 'Commercial',     hours: '31h', status: 'online',  color: '#378ADD' },
  ];

  return (
    <div className={`nm-card-sm fade-up fade-up-${delay}`} style={{ padding: '22px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Users size={16} style={{ color: 'var(--text-muted)' }} />
        <h3 className="heading" style={{ fontSize: '1rem', margin: 0 }}>Équipe</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.map((m) => (
          <div
            key={m.name}
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
                {m.name.split(' ').map(n => n[0]).join('')}
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
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '3px 8px',
                borderRadius: 6,
                boxShadow: 'var(--raised-xs)',
                background: 'var(--bg)',
                flexShrink: 0,
              }}
            >
              {m.hours}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Roadmap timeline (section 2) ──────────────────────────────────────────────
const MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

const ROADMAP_ITEMS = [
  { label: 'Conception',        left: '0%',   width: '18%', color: '#4A62D8', division: 'Développement' },
  { label: 'Prototype',         left: '16%',  width: '22%', color: '#7254C8', division: 'Étude Technique' },
  { label: 'Agencement Phase 1',left: '8%',   width: '30%', color: '#1D9E75', division: 'Agencement' },
  { label: 'Import matériaux',  left: '32%',  width: '20%', color: '#D85A30', division: 'Importation' },
  { label: 'Finitions',         left: '48%',  width: '25%', color: '#C4517A', division: 'Divers' },
  { label: 'Livraison',         left: '70%',  width: '15%', color: '#1D9E75', division: 'Agencement' },
];

const todayPct = `${(new Date().getMonth() / 11) * 100}%`;

function RoadmapCard() {
  return (
    <div className="nm-card fade-up fade-up-4" style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 className="heading" style={{ fontSize: '1.1rem', margin: 0 }}>Feuille de route</h3>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 28 }}>
          {ROADMAP_ITEMS.map((item) => (
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
  { name: 'Slack',       icon: '💬',  connected: false, color: '#4A154B' },
  { name: 'Notion',      icon: '📝',  connected: false, color: '#000' },
  { name: 'Figma',       icon: '🎨',  connected: true,  color: '#F24E1E' },
  { name: 'Drive',       icon: '📁',  connected: false, color: '#0F9D58' },
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
const PENDING = [
  { email: 'hamid.benali@mail.com', since: 'Il y a 2j' },
  { email: 'nadia.tazi@corp.ma',    since: 'Il y a 5j' },
];

function InviteCard() {
  const [email, setEmail] = useState('');
  return (
    <div className="nm-card-sm" style={{ padding: '22px 20px' }}>
      <h3 className="heading" style={{ fontSize: '1rem', marginBottom: 6 }}>Inviter un membre</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 18 }}>
        Partagez l&apos;accès à votre espace de travail
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <input
          className="nm-input"
          type="email"
          placeholder="email@exemple.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button
          className="nm-btn nm-btn-primary"
          style={{ justifyContent: 'center' }}
          onClick={() => setEmail('')}
        >
          Envoyer l&apos;invitation
        </button>
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          En attente
        </div>
        {PENDING.map((p) => (
          <div
            key={p.email}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              boxShadow: 'var(--raised-xs)',
              marginBottom: 6,
              background: 'var(--bg)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: '0.775rem', fontWeight: 500 }}>
                {p.email}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.since}</div>
            </div>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.7rem',
                color: '#378ADD',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
            >
              Renvoyer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);

  const tasks = [
    { label: 'Valider les plans d\'agencement', done: true,  color: '#1D9E75' },
    { label: 'Commander les matériaux Phase 2', done: true,  color: '#D85A30' },
    { label: 'Réunion client — maquette 3D',    done: false, color: '#378ADD' },
    { label: 'Réviser le budget prévisionnel',   done: false, color: '#7F77DD' },
    { label: 'Déposer dossier technique mairie', done: false, color: '#D85A30' },
  ];

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
          }}
        >
          {/* Column A — Project card (tall) */}
          <ProjectCard delay={1} />

          {/* Column B — Stat tiles + task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <StatTile label="Projets actifs"    value="7"    trend="+2"  trendUp icon={CheckCircle} color="#1D9E75" delay={2} />
            <StatTile label="Tâches cette sem." value="24"   trend="+8"  trendUp icon={Clock}       color="#378ADD" delay={3} />
            <StatTile label="Heures facturées"  value="168h" trend="-4h" trendUp={false} icon={Zap} color="#D85A30" delay={4} />

            {/* Task list */}
            <div className="nm-card-sm fade-up fade-up-5" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle size={14} style={{ color: 'var(--text-muted)' }} />
                <h3 className="heading" style={{ fontSize: '0.95rem', margin: 0 }}>Tâches du jour</h3>
              </div>
              <div>
                {tasks.map((t) => (
                  <TaskItem key={t.label} label={t.label} done={t.done} color={t.color} />
                ))}
              </div>
            </div>
          </div>

          {/* Column C — Team roster */}
          <TeamRosterCard delay={2} />
        </div>

        {/* ── Section 2 — Roadmap ── */}
        <div style={{ marginBottom: 18 }}>
          <RoadmapCard />
        </div>

        {/* ── Section 3 — Integrations + Invite ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <IntegrationGrid />
          <InviteCard />
        </div>
      </div>
    </AppShell>
  );
}
