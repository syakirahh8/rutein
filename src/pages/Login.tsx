import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, fullName);
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === 'signup' && !result.session) {
      setError('Account created. Check your email to confirm before signing in.');
      return;
    }
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 26 }}>Rutein</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 24, fontSize: 14 }}>
          Transit that meets you where you're standing — and where you're lost.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className="btn"
            style={{ flex: 1, background: mode === 'signin' ? 'var(--color-primary)' : 'var(--color-surface-raised)', color: mode === 'signin' ? '#071023' : 'var(--color-text)' }}
            onClick={() => setMode('signin')}
            type="button"
          >
            Sign in
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: mode === 'signup' ? 'var(--color-primary)' : 'var(--color-surface-raised)', color: mode === 'signup' ? '#071023' : 'var(--color-text)' }}
            onClick={() => setMode('signup')}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label className="label">Full name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
          </div>

          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>
          )}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
