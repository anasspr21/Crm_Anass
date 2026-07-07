'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { CalendarEvent } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  X, MapPin, Users, Bell, ExternalLink, Plus, Clock,
  CalendarDays, Copy, Check, ChevronRight, Trash2,
  AlignLeft, Zap, AlertCircle,
} from 'lucide-react';

// ── Dynamically import FullCalendar (SSR-safe) ─────────────────────────────
const FullCalendar = nextDynamic(() => import('@fullcalendar/react'), { ssr: false });

// ── Project type ───────────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  division: DivisionKey;
}

// ── Extended CalendarEvent with project ───────────────────────────────────
interface ExtendedCalendarEvent extends Omit<CalendarEvent, 'priority'> {
  project_id?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'medium' | 'urgent' | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toLocalDatetimeString(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toGcalDate(iso: string): string {
  // Format: YYYYMMDDTHHmmss
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function buildGCalUrl(event: ExtendedCalendarEvent): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams({
    text: event.title,
    dates: `${toGcalDate(event.start_at)}/${toGcalDate(event.end_at)}`,
  });
  if (event.notes) params.set('details', event.notes);
  if (event.location) params.set('location', event.location);
  return `${base}&${params.toString()}`;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
}

// ── Avatar chip ─────────────────────────────────────────────────────────────

function AvatarChip({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  const colors = ['#4A62D8', '#1D9E75', '#D85A30', '#7254C8', '#378ADD', '#888780'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', borderRadius: 999, boxShadow: 'var(--raised-xs)', background: 'var(--bg)', fontSize: '0.7rem', fontWeight: 500 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 700, flexShrink: 0 }}>
        {initials}
      </div>
      {name}
    </div>
  );
}

// ── iCal copy box ─────────────────────────────────────────────────────────

function ICalBox() {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/api/calendar/ical?token=anass-crm-ical-secret-123`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, boxShadow: 'var(--inset-xs)', background: 'var(--bg)', marginTop: 4 }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <CalendarDays size={12} /> Abonnement iCal (iPhone / Google)
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          readOnly
          value={url}
          className="nm-input"
          style={{ fontSize: '0.65rem', padding: '6px 10px', flex: 1 }}
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <button className="nm-btn" style={{ padding: '6px 10px', flexShrink: 0, color: copied ? '#1D9E75' : 'var(--text-primary)' }} onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── Upcoming events mini-card ─────────────────────────────────────────────

function UpcomingCard({ event, onClick }: { event: ExtendedCalendarEvent; onClick: () => void }) {
  const color = getDivisionColor(event.division);
  const start = new Date(event.start_at);
  return (
    <div
      style={{ padding: '10px 14px', borderRadius: 12, boxShadow: 'var(--raised-xs)', background: 'var(--bg)', cursor: 'pointer', transition: 'box-shadow 0.2s', borderLeft: `3px solid ${color}` }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--raised-sm)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--raised-xs)')}
      onClick={onClick}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }} className="truncate">{event.title}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={10} />
        {formatRelativeDate(event.start_at)} · {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      {event.location && (
        <div style={{ fontSize: '0.62rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <MapPin size={9} /> {event.location}
        </div>
      )}
    </div>
  );
}

// ── Event Form Drawer ─────────────────────────────────────────────────────

interface EventFormProps {
  event?: ExtendedCalendarEvent | null;
  defaultDate?: string;
  projects: Project[];
  onSave: () => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

function EventFormDrawer({ event, defaultDate, projects, onSave, onClose, onDelete }: EventFormProps) {
  const supabase = createSupabaseClient();

  const [title, setTitle] = useState(event?.title ?? '');
  const [division, setDivision] = useState<DivisionKey>(event?.division ?? 'agencement');
  const [projectId, setProjectId] = useState<string>(event?.project_id ?? '');
  const [startAt, setStartAt] = useState(event ? toLocalDatetimeString(event.start_at) : (defaultDate ?? ''));
  const [endAt, setEndAt] = useState(event ? toLocalDatetimeString(event.end_at) : '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [participants, setParticipants] = useState(event?.participants?.join(', ') ?? '');
  const [reminder, setReminder] = useState<number>(event?.reminder_minutes ?? 30);
  const [priority, setPriority] = useState<string>(event?.priority ?? 'normal');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const filteredProjects = division ? projects.filter(p => p.division === division) : projects;

  const handleSave = async () => {
    if (!title.trim()) { setTitleError(true); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      division,
      project_id: projectId || null,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt || startAt).toISOString(),
      location: location.trim() || null,
      participants: participants.split(',').map(s => s.trim()).filter(Boolean),
      reminder_minutes: reminder,
      priority: priority || null,
      notes: notes.trim() || null,
    };
    if (event) {
      await supabase.from('events').update(payload).eq('id', event.id);
    } else {
      await supabase.from('events').insert(payload);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  const color = getDivisionColor(division);

  // Google Calendar deeplink
  const gcalUrl = startAt ? buildGCalUrl({
    id: event?.id ?? '',
    title, division, project_id: projectId || null,
    start_at: new Date(startAt).toISOString(),
    end_at: new Date(endAt || startAt).toISOString(),
    location: location || null,
    participants: participants.split(',').map(s => s.trim()).filter(Boolean),
    notes: notes || null,
    reminder_minutes: reminder,
    created_at: '',
  } as ExtendedCalendarEvent) : '';

  const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 900, backdropFilter: 'blur(2px)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 1000,
        background: 'var(--bg)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Color accent */}
        <div style={{ height: 4, background: color, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 className="heading" style={{ fontSize: '1.1rem', margin: 0 }}>
              {event ? "Modifier l'événement" : 'Nouvel événement'}
            </h2>
          </div>
          <button className="nm-btn" style={{ padding: '6px 8px', flexShrink: 0 }} onClick={onClose}><X size={14} /></button>
        </div>

        {/* Scrollable form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Title */}
            <div>
              <label style={labelStyle}>Titre *</label>
              <input
                className="nm-input"
                placeholder="Titre de l'événement"
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleError(false); }}
                style={{ borderBottom: titleError ? '2px solid #D85A30' : undefined }}
                autoFocus
              />
              {titleError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: '0.7rem', color: '#D85A30' }}>
                  <AlertCircle size={11} /> Le titre est requis
                </div>
              )}
            </div>

            {/* Division - colored buttons */}
            <div>
              <label style={labelStyle}>Division</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {DIVISIONS.map(d => (
                  <button
                    key={d.key}
                    onClick={() => { setDivision(d.key); setProjectId(''); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: division === d.key ? d.color : 'var(--bg)',
                      color: division === d.key ? '#fff' : 'var(--text-muted)',
                      boxShadow: division === d.key ? `0 2px 8px ${d.color}66` : 'var(--raised-xs)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Project */}
            {filteredProjects.length > 0 && (
              <div>
                <label style={labelStyle}>Projet</label>
                <select
                  className="nm-input"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— Aucun projet —</option>
                  {filteredProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Début</label>
                <input className="nm-input" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} style={{ fontSize: '0.8rem' }} />
              </div>
              <div>
                <label style={labelStyle}>Fin</label>
                <input className="nm-input" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} style={{ fontSize: '0.8rem' }} />
              </div>
            </div>

            {/* Location */}
            <div>
              <label style={labelStyle}>Lieu</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="nm-input" placeholder="Lieu de l'événement" value={location} onChange={e => setLocation(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
            </div>

            {/* Participants */}
            <div>
              <label style={labelStyle}>Participants</label>
              <div style={{ position: 'relative' }}>
                <Users size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="nm-input"
                  placeholder="Anass, Mariam, Karim…"
                  value={participants}
                  onChange={e => setParticipants(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
              </div>
              {/* Preview chips */}
              {participants.trim() && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {participants.split(',').map(s => s.trim()).filter(Boolean).map(p => (
                    <AvatarChip key={p} name={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Reminder */}
            <div>
              <label style={labelStyle}>Rappel</label>
              <div style={{ position: 'relative' }}>
                <Bell size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select className="nm-input" value={reminder} onChange={e => setReminder(Number(e.target.value))} style={{ paddingLeft: 32, cursor: 'pointer' }}>
                  <option value={15}>15 minutes avant</option>
                  <option value={30}>30 minutes avant</option>
                  <option value={60}>1 heure avant</option>
                  <option value={120}>2 heures avant</option>
                  <option value={1440}>1 jour avant</option>
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label style={labelStyle}>Priorité</label>
              <div style={{ display: 'flex', gap: 7 }}>
                {[
                  { value: 'low', label: 'Basse', color: '#1D9E75' },
                  { value: 'normal', label: 'Normale', color: '#378ADD' },
                  { value: 'high', label: 'Haute', color: '#D85A30' },
                ].map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      background: priority === p.value ? p.color : 'var(--bg)',
                      color: priority === p.value ? '#fff' : 'var(--text-muted)',
                      boxShadow: priority === p.value ? `0 2px 8px ${p.color}55` : 'var(--raised-xs)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes / Ordre du jour</label>
              <div style={{ position: 'relative' }}>
                <AlignLeft size={13} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <textarea
                  className="nm-input"
                  placeholder="Détails, ordre du jour, liens utiles…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  style={{ paddingLeft: 32, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
            </div>

            {/* iCal box */}
            <ICalBox />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Google Calendar deeplink */}
          {startAt && (
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nm-btn"
              style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
            >
              <ExternalLink size={14} /> Ajouter à Google Calendar
            </a>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="nm-btn nm-btn-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Enregistrement…' : (event ? 'Mettre à jour' : 'Créer l\'événement')}
            </button>
            {event && onDelete && (
              <button
                className="nm-btn"
                style={{ padding: '11px 14px', color: '#D85A30', flexShrink: 0 }}
                onClick={() => { onDelete(event.id); onClose(); }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Event Detail Drawer ────────────────────────────────────────────────────

function EventDetailDrawer({ event, onClose, onEdit, onDelete }: {
  event: ExtendedCalendarEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = getDivisionColor(event.division);
  const div = DIVISIONS.find(d => d.key === event.division);
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 900 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 380, zIndex: 1000,
        background: 'var(--bg)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ height: 4, background: color, flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="division-pill" style={{ background: color, marginBottom: 10, display: 'inline-flex' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
                {div?.label}
              </div>
              <h2 className="heading" style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.3 }}>{event.title}</h2>
            </div>
            <button className="nm-btn" style={{ padding: '6px 8px', flexShrink: 0, marginLeft: 10 }} onClick={onClose}>
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Date/time */}
            <div style={{ padding: '14px 16px', borderRadius: 12, boxShadow: 'var(--inset-xs)', background: 'var(--bg)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date et heure</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 10, boxShadow: 'var(--raised-xs)', background: 'var(--bg)' }}>
                <MapPin size={14} style={{ color, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: '0.825rem' }}>{event.location}</span>
              </div>
            )}

            {/* Participants */}
            {event.participants && event.participants.length > 0 && (
              <div style={{ padding: '12px 14px', borderRadius: 10, boxShadow: 'var(--raised-xs)', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Users size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Participants</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {event.participants.map(p => <AvatarChip key={p} name={p} />)}
                </div>
              </div>
            )}

            {/* Priority */}
            {event.priority && event.priority !== 'normal' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Zap size={13} style={{ color: event.priority === 'high' ? '#D85A30' : '#1D9E75' }} />
                <span style={{ fontSize: '0.78rem', color: event.priority === 'high' ? '#D85A30' : '#1D9E75', fontWeight: 600 }}>
                  Priorité {event.priority === 'high' ? 'haute' : 'basse'}
                </span>
              </div>
            )}

            {/* Reminder */}
            {event.reminder_minutes && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Bell size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Rappel {event.reminder_minutes >= 60 ? `${event.reminder_minutes / 60}h` : `${event.reminder_minutes} min`} avant
                </span>
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <div style={{ padding: '14px 16px', borderRadius: 12, boxShadow: 'var(--inset-xs)', background: 'var(--bg)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notes</div>
                <p style={{ fontSize: '0.825rem', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.notes}</p>
              </div>
            )}

            {/* Google Calendar */}
            <a
              href={buildGCalUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="nm-btn"
              style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
            >
              <ExternalLink size={13} /> Ajouter à Google Calendar
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', gap: 8 }}>
          <button className="nm-btn nm-btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '10px' }} onClick={onEdit}>
            Modifier
          </button>
          <button className="nm-btn" style={{ padding: '10px 14px', color: '#D85A30', flexShrink: 0 }} onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Calendar Page ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const supabase = createSupabaseClient();

  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [events, setEvents] = useState<ExtendedCalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plugins, setPlugins] = useState<unknown[]>([]);

  // Drawer state
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<ExtendedCalendarEvent | null>(null);
  const [viewEvent, setViewEvent] = useState<ExtendedCalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState('');

  // Load FullCalendar plugins client-side (avoids SSR issues)
  useEffect(() => {
    Promise.all([
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/timegrid'),
      import('@fullcalendar/list'),
      import('@fullcalendar/interaction'),
    ]).then(([dg, tg, ls, int]) => {
      setPlugins([dg.default, tg.default, ls.default, int.default]);
    });
  }, []);

  // Load projects
  useEffect(() => {
    supabase.from('projects').select('id, name, division').order('name').then(({ data }: { data: Project[] | null }) => {
      setProjects(data ?? []);
    });
  }, [supabase]);

  // Load events
  const loadEvents = useCallback(async () => {
    let q = supabase.from('events').select('*').order('start_at');
    if (activeDivision) q = q.eq('division', activeDivision);
    const { data } = await q;
    setEvents(data ?? []);
  }, [activeDivision, supabase]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleDeleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setViewEvent(null);
    setEditEvent(null);
    setShowForm(false);
    loadEvents();
  };

  // FullCalendar event objects
  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start_at,
    end: e.end_at,
    backgroundColor: getDivisionColor(e.division),
    borderColor: getDivisionColor(e.division),
    textColor: '#fff',
    extendedProps: { event: e },
  }));

  // Upcoming events (next 5 from now)
  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.start_at) >= now)
    .slice(0, 5);

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── Main Calendar Area ─────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 0 20px 20px', overflow: 'hidden', minWidth: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingRight: 20, flexShrink: 0 }}>
            <div>
              <h1 className="heading" style={{ fontSize: '1.6rem', margin: 0 }}>Calendrier</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Réunions, échéances et événements
              </p>
            </div>
            <button
              className="nm-btn nm-btn-primary"
              style={{ padding: '9px 18px', gap: 6 }}
              onClick={() => { setEditEvent(null); setDefaultDate(''); setShowForm(true); }}
            >
              <Plus size={15} /> Nouvel événement
            </button>
          </div>

          {/* Calendar card */}
          <div className="nm-card" style={{ flex: 1, padding: '16px 20px', overflow: 'hidden', marginRight: 20 }}>
            {plugins.length > 0 && (
              <FullCalendar
                plugins={plugins as any[]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridThreeDay,listWeek',
                }}
                views={{
                  timeGridThreeDay: {
                    type: 'timeGrid',
                    duration: { days: 3 },
                    buttonText: '3 jours',
                  },
                }}
                events={fcEvents}
                locale="fr"
                height="100%"
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={3}
                nowIndicator={true}
                select={(info) => {
                  setDefaultDate(info.startStr.slice(0, 16));
                  setEditEvent(null);
                  setShowForm(true);
                }}
                eventClick={(info) => {
                  const ev = info.event.extendedProps.event as ExtendedCalendarEvent;
                  setViewEvent(ev);
                  setShowForm(false);
                }}
                eventDrop={async (info) => {
                  const ev = info.event.extendedProps.event as ExtendedCalendarEvent;
                  await supabase.from('events').update({
                    start_at: info.event.startStr,
                    end_at: info.event.endStr || info.event.startStr,
                  }).eq('id', ev.id);
                  loadEvents();
                }}
                eventResize={async (info) => {
                  const ev = info.event.extendedProps.event as ExtendedCalendarEvent;
                  await supabase.from('events').update({
                    start_at: info.event.startStr,
                    end_at: info.event.endStr,
                  }).eq('id', ev.id);
                  loadEvents();
                }}
              />
            )}
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────────── */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 20px 20px 0',
            gap: 14,
            overflowY: 'auto',
          }}
        >
          {/* Upcoming events */}
          <div className="nm-card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CalendarDays size={15} style={{ color: 'var(--text-muted)' }} />
              <h3 className="heading" style={{ fontSize: '0.95rem', margin: 0 }}>Prochains événements</h3>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-light)' }}>
                <CalendarDays size={24} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: '0.75rem' }}>Aucun événement à venir</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingEvents.map(ev => (
                  <UpcomingCard
                    key={ev.id}
                    event={ev}
                    onClick={() => { setViewEvent(ev); setShowForm(false); }}
                  />
                ))}
                {events.filter(e => new Date(e.start_at) >= now).length > 5 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                    + {events.filter(e => new Date(e.start_at) >= now).length - 5} autres événements
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Division legend */}
          <div className="nm-card-sm" style={{ padding: '16px' }}>
            <h3 className="heading" style={{ fontSize: '0.9rem', margin: '0 0 12px' }}>Divisions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DIVISIONS.map(d => {
                const count = events.filter(e => e.division === d.key).length;
                return (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => setActiveDivision(activeDivision === d.key ? null : d.key)}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0, opacity: (!activeDivision || activeDivision === d.key) ? 1 : 0.3 }} />
                    <span style={{ fontSize: '0.75rem', flex: 1, color: activeDivision === d.key ? d.color : 'var(--text-primary)', fontWeight: activeDivision === d.key ? 600 : 400 }}>{d.label}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 999, boxShadow: 'var(--raised-xs)' }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {activeDivision && (
              <button
                className="nm-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: '0.72rem', padding: '6px' }}
                onClick={() => setActiveDivision(null)}
              >
                Toutes les divisions
              </button>
            )}
          </div>

          {/* iCal subscription */}
          <div className="nm-card-sm" style={{ padding: '16px' }}>
            <ICalBox />
          </div>
        </div>
      </div>

      {/* ── Event Form Drawer ─────────────────────────────── */}
      {showForm && (
        <EventFormDrawer
          event={editEvent}
          defaultDate={defaultDate}
          projects={projects}
          onSave={loadEvents}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* ── Event Detail Drawer ───────────────────────────── */}
      {viewEvent && !showForm && (
        <EventDetailDrawer
          event={viewEvent}
          onClose={() => setViewEvent(null)}
          onEdit={() => { setEditEvent(viewEvent); setViewEvent(null); setShowForm(true); }}
          onDelete={() => handleDeleteEvent(viewEvent.id)}
        />
      )}
    </AppShell>
  );
}
