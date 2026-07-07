'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import nextDynamic from 'next/dynamic';
import AppShell from '@/components/layout/AppShell';
import { DivisionKey, DIVISIONS, getDivisionColor } from '@/lib/divisions';
import { CalendarEvent } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import { X, MapPin, Users, Bell, ExternalLink } from 'lucide-react';

// Dynamically import FullCalendar (client only)
const FullCalendar = nextDynamic(() => import('@fullcalendar/react'), { ssr: false });

// ── Event form ─────────────────────────────────────────────────────────────────
function EventFormDialog({
  event,
  defaultDate,
  onSave,
  onClose,
  onDelete,
}: {
  event?: CalendarEvent | null;
  defaultDate?: string;
  onSave: () => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [division, setDivision] = useState<DivisionKey>(event?.division ?? 'agencement');
  const [startAt, setStartAt] = useState(event?.start_at?.slice(0, 16) ?? (defaultDate ?? ''));
  const [endAt, setEndAt] = useState(event?.end_at?.slice(0, 16) ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [participants, setParticipants] = useState(event?.participants?.join(', ') ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [reminderMinutes, setReminderMinutes] = useState(event?.reminder_minutes ?? 30);
  const [saving, setSaving] = useState(false);
  const supabase = createSupabaseClient();

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      title,
      division,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt || startAt).toISOString(),
      location: location || null,
      participants: participants.split(',').map(s => s.trim()).filter(Boolean),
      notes: notes || null,
      reminder_minutes: reminderMinutes,
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
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="nm-card"
        style={{ width: '100%', maxWidth: 520, padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Color accent top border */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: '20px 20px 0 0' }} />

        <button className="nm-btn" style={{ position: 'absolute', top: 16, right: 16, padding: '6px 8px' }} onClick={onClose}>
          <X size={14} />
        </button>

        <h2 className="heading" style={{ fontSize: '1.2rem', marginBottom: 24, marginTop: 8 }}>
          {event ? 'Modifier l\'événement' : 'Nouvel événement'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="nm-input" placeholder="Titre de l'événement" value={title} onChange={e => setTitle(e.target.value)} />

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Division</label>
            <select
              className="nm-input"
              value={division}
              onChange={e => setDivision(e.target.value as DivisionKey)}
              style={{ cursor: 'pointer' }}
            >
              {DIVISIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Début</label>
              <input className="nm-input" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Fin</label>
              <input className="nm-input" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <MapPin size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="nm-input" placeholder="Lieu" value={location} onChange={e => setLocation(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>

          <div style={{ position: 'relative' }}>
            <Users size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="nm-input" placeholder="Participants (séparés par virgule)" value={participants} onChange={e => setParticipants(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Rappel</label>
            <select className="nm-input" value={reminderMinutes} onChange={e => setReminderMinutes(Number(e.target.value))} style={{ cursor: 'pointer' }}>
              <option value={15}>15 minutes avant</option>
              <option value={30}>30 minutes avant</option>
              <option value={60}>1 heure avant</option>
              <option value={1440}>1 jour avant</option>
            </select>
          </div>

          <textarea className="nm-input" placeholder="Notes / ordre du jour…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="nm-btn nm-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {event && onDelete && (
              <button
                className="nm-btn"
                style={{ padding: '10px 16px', color: '#D85A30' }}
                onClick={() => { onDelete(event.id); onClose(); }}
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Event detail drawer ───────────────────────────────────────────────────────
function EventDrawer({
  event,
  onClose,
  onEdit,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
}) {
  const color = getDivisionColor(event.division);
  const div = DIVISIONS.find(d => d.key === event.division);
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z${event.location ? `&location=${encodeURIComponent(event.location)}` : ''}${event.notes ? `&details=${encodeURIComponent(event.notes)}` : ''}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        className="nm-card"
        style={{
          width: 380,
          height: '100%',
          borderRadius: '20px 0 0 20px',
          padding: '32px 28px',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Color bar */}
        <div style={{ height: 4, background: color, borderRadius: 2, marginBottom: 24 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="heading" style={{ fontSize: '1.25rem', margin: 0, flex: 1, marginRight: 12 }}>{event.title}</h2>
          <button className="nm-btn" style={{ padding: '6px 8px', flexShrink: 0 }} onClick={onClose}><X size={14} /></button>
        </div>

        <div
          className="division-pill"
          style={{ background: color, display: 'inline-flex', marginBottom: 20 }}
        >
          {div?.label}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', borderRadius: 12, boxShadow: 'var(--inset-xs)', background: 'var(--bg)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Date et heure</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {start.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {event.location && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: '0.825rem' }}>{event.location}</span>
            </div>
          )}

          {event.participants?.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Users size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {event.participants.map(p => (
                  <span key={p} style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 999, boxShadow: 'var(--raised-xs)', background: 'var(--bg)', fontWeight: 500 }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.notes && (
            <div style={{ padding: '14px 16px', borderRadius: 12, boxShadow: 'var(--inset-xs)', background: 'var(--bg)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Notes</div>
              <p style={{ fontSize: '0.825rem', margin: 0, lineHeight: 1.6 }}>{event.notes}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="nm-btn nm-btn-primary" onClick={onEdit} style={{ flex: 1, justifyContent: 'center' }}>
              Modifier
            </button>
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nm-btn"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ExternalLink size={13} /> Google Cal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar page ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [activeDivision, setActiveDivision] = useState<DivisionKey | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [viewEvent, setViewEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState('');
  const [plugins, setPlugins] = useState<unknown[]>([]);
  const supabase = createSupabaseClient();

  // Load FullCalendar plugins client-side
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

  const loadEvents = useCallback(async () => {
    let q = supabase.from('events').select('*').order('start_at');
    if (activeDivision) q = q.eq('division', activeDivision);
    const { data } = await q;
    setEvents(data ?? []);
  }, [activeDivision, supabase]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleDeleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    loadEvents();
  };

  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start_at,
    end: e.end_at,
    backgroundColor: getDivisionColor(e.division),
    borderColor: getDivisionColor(e.division),
    extendedProps: { event: e },
  }));

  return (
    <AppShell activeDivision={activeDivision} onDivisionChange={setActiveDivision}>
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <h1 className="heading" style={{ fontSize: '1.5rem', marginBottom: 2 }}>Calendrier</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Réunions et événements
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a
              href="/api/calendar/ical"
              className="nm-btn"
              style={{ textDecoration: 'none', fontSize: '0.75rem' }}
              target="_blank"
            >
              <Bell size={13} /> Abonnement iCal
            </a>
            <button
              className="nm-btn nm-btn-primary"
              onClick={() => { setEditEvent(null); setShowForm(true); setDefaultDate(''); }}
            >
              + Nouvel événement
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="nm-card" style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
          {plugins.length > 0 && (
            <FullCalendar
              plugins={plugins as any}
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
              dayMaxEvents={true}
              select={(info) => {
                setDefaultDate(info.startStr.slice(0, 16));
                setEditEvent(null);
                setShowForm(true);
              }}
              eventClick={(info) => {
                const ev = info.event.extendedProps.event as CalendarEvent;
                setViewEvent(ev);
              }}
              eventDrop={async (info) => {
                const ev = info.event.extendedProps.event as CalendarEvent;
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

      {/* Event form */}
      {(showForm || editEvent) && (
        <EventFormDialog
          event={editEvent}
          defaultDate={defaultDate}
          onSave={loadEvents}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Event drawer */}
      {viewEvent && (
        <EventDrawer
          event={viewEvent}
          onClose={() => setViewEvent(null)}
          onEdit={() => { setEditEvent(viewEvent); setViewEvent(null); setShowForm(true); }}
        />
      )}
    </AppShell>
  );
}
