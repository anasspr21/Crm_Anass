'use client';

import { useState, useTransition } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74,98,216,0.06) 0%, transparent 70%)',
            top: '-200px',
            right: '-100px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(127,119,221,0.05) 0%, transparent 70%)',
            bottom: '-150px',
            left: '-100px',
          }}
        />
      </div>

      <div
        className="nm-card fade-up"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '48px 40px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #4A62D8, #7254C8)',
              boxShadow: '4px 4px 12px rgba(74,98,216,0.35), -2px -2px 8px rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="10" height="10" rx="3" fill="white" opacity="0.9"/>
              <rect x="15" y="3" width="10" height="10" rx="3" fill="white" opacity="0.6"/>
              <rect x="3" y="15" width="10" height="10" rx="3" fill="white" opacity="0.6"/>
              <rect x="15" y="15" width="10" height="10" rx="3" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h1 className="heading" style={{ fontSize: '1.75rem', marginBottom: 4 }}>WorkOS</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            by Anass Elhafdaoui
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              className="nm-input"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="nm-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(216,90,48,0.08)',
                border: '1px solid rgba(216,90,48,0.2)',
                color: '#D85A30',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="nm-btn nm-btn-primary"
            disabled={isPending}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px 20px',
              fontSize: '0.9rem',
              marginTop: 8,
            }}
          >
            {isPending ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
