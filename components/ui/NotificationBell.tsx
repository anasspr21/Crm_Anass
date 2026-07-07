'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  Bell,
  X,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FolderOpen,
  FileText,
  Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;        // 'info' | 'warning' | 'success' | 'task' | 'project' | 'event'
  entity_type: string | null; // 'project' | 'task' | 'event' | 'file' | 'note'
  entity_id: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

function NotifIcon({ type, entityType }: { type: string | null; entityType: string | null }) {
  const size = 14;
  const t = type ?? entityType ?? 'info';
  if (t === 'warning')  return <AlertTriangle size={size} style={{ color: '#D85A30' }} />;
  if (t === 'success')  return <CheckCircle   size={size} style={{ color: '#1D9E75' }} />;
  if (t === 'project' || entityType === 'project') return <FolderOpen size={size} style={{ color: '#378ADD' }} />;
  if (t === 'task'    || entityType === 'task')    return <CheckCircle size={size} style={{ color: '#7F77DD' }} />;
  if (t === 'event'   || entityType === 'event')   return <Calendar    size={size} style={{ color: '#1D9E75' }} />;
  if (entityType === 'file')  return <FileText size={size} style={{ color: '#888780' }} />;
  if (entityType === 'note')  return <FileText size={size} style={{ color: '#D85A30' }} />;
  return <Info size={size} style={{ color: '#378ADD' }} />;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const supabase = createSupabaseClient();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Mount + realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, supabase]);

  // ── Click outside to close ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ── Mark one as read ───────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = async () => {
    setMarkingAll(true);
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  // ── Click notification ─────────────────────────────────────────────────────
  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) await markAsRead(notif.id);
    if (notif.link) {
      router.push(notif.link);
      setOpen(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'var(--bg)',
          border: 'none',
          boxShadow: open ? 'var(--inset-sm)' : 'var(--raised-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s',
          flexShrink: 0,
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} style={{ color: 'var(--text-muted)' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.55rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 340,
            background: 'var(--bg)',
            borderRadius: 16,
            boxShadow: 'var(--raised)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px 12px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.7rem',
                    color: '#378ADD',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                  title="Tout marquer comme lu"
                >
                  <CheckCheck size={12} />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Chargement…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <Zap size={28} style={{ color: 'var(--text-light)', margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aucune notification</div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 18px',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    cursor: notif.link ? 'pointer' : 'default',
                    background: notif.is_read ? 'transparent' : 'rgba(55,138,221,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (notif.link) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.03)'; }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = notif.is_read ? 'transparent' : 'rgba(55,138,221,0.04)';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--bg)',
                      boxShadow: 'var(--raised-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <NotifIcon type={notif.type} entityType={notif.entity_type} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.775rem',
                        fontWeight: notif.is_read ? 400 : 600,
                        color: 'var(--text-primary)',
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notif.title}
                    </div>
                    {notif.body && (
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 4,
                        }}
                      >
                        {notif.body}
                      </div>
                    )}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-light)' }}>
                      {relativeTime(notif.created_at)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#378ADD',
                        flexShrink: 0,
                        marginTop: 8,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
