'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { DIVISIONS, DivisionKey } from '@/lib/divisions';
import {
  LayoutDashboard,
  FolderOpen,
  GanttChartSquare,
  Calendar,
  PenTool,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/files',     label: 'Fichiers',        icon: FolderOpen },
  { href: '/gantt',     label: 'Gantt',            icon: GanttChartSquare },
  { href: '/calendar',  label: 'Calendrier',       icon: Calendar },
  { href: '/canvas',    label: 'Canvas',           icon: PenTool },
];

interface AppShellProps {
  children: React.ReactNode;
  activeDivision?: DivisionKey | null;
  onDivisionChange?: (div: DivisionKey | null) => void;
}

export default function AppShell({ children, activeDivision, onDivisionChange }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{ width: collapsed ? 64 : 220 }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '20px 0' : '20px 16px',
            borderBottom: '1px solid var(--sidebar-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            flexShrink: 0,
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #4A62D8, #7254C8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                  WorkOS
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--sidebar-muted)', lineHeight: 1 }}>
                  by Anass Elhafdaoui
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 6,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--sidebar-muted)',
              flexShrink: 0,
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {!collapsed && (
            <div className="sidebar-section-label">Navigation</div>
          )}
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div
                  className={`sidebar-item ${active ? 'active' : ''}`}
                  title={collapsed ? label : undefined}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{label}</span>}
                </div>
              </Link>
            );
          })}

          {/* Division filter */}
          <div style={{ marginTop: 20 }}>
            {!collapsed && (
              <div className="sidebar-section-label">Divisions</div>
            )}
            {/* All divisions */}
            <div
              className={`sidebar-item ${!activeDivision ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer' }}
              onClick={() => onDivisionChange?.(null)}
              title={collapsed ? 'Toutes les divisions' : undefined}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4A62D8, #C4517A)',
                flexShrink: 0,
              }} />
              {!collapsed && <span>Toutes</span>}
            </div>

            {DIVISIONS.map((div) => (
              <div
                key={div.key}
                className={`sidebar-item ${activeDivision === div.key ? 'active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer' }}
                onClick={() => onDivisionChange?.(div.key)}
                title={collapsed ? div.label : undefined}
              >
                <div
                  className="sidebar-dot"
                  style={{ background: div.color, opacity: activeDivision === div.key ? 1 : 0.5 }}
                />
                {!collapsed && <span className="truncate">{div.label}</span>}
              </div>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--sidebar-border)' }}>
          <button
            onClick={handleLogout}
            className="sidebar-item"
            style={{
              width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
              border: 'none',
              cursor: 'pointer',
              background: 'none',
            }}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut size={14} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main
        className="main-content-wrapper"
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none', flex: 1 }}>
              <div className={`bottom-nav-item ${active ? 'active' : ''}`}>
                <Icon size={20} />
                <span>{label.split(' ')[0]}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
