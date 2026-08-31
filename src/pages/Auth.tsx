import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveTransportPreference,
  saveProfileType,
  type OnboardingTransportType,
  type OnboardingProfileType,
} from '@/services/onboardingService';
import { TRANSPORT_TYPE_COLOR } from '@/components/transportMarkerIcon';

import authVideo from '@/assets/videos/auth.mov';
import profileSchoolSvg from '@/assets/images/profile-school.svg';
import profileTravelSvg from '@/assets/images/profile-travel.svg';
import profileWorkSvg from '@/assets/images/profile-work.svg';

// ============================================================
// Shared design tokens — exact colors from the Rutein brand /
// landing page (cream background, red accent), used across
// Login, TransportPreference, and ProfileSelect so the whole
// auth + onboarding flow reads as one continuous experience.
// ============================================================
const C = {
  bg: '#FCF4ED',
  surface: '#FFFDF9',
  border: '#B7A897',
  text: '#1E1E1E',
  textMuted: '#7A6F62',
  primary: '#DA362A',
  primaryHover: '#C22B20',
};

const bodyFont: React.CSSProperties = { fontFamily: "'Aileron', sans-serif" };

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Aileron:wght@400;600;700&display=swap');

  @keyframes authFadeDown {
    from { opacity: 0; transform: translateY(-16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .auth-fade { opacity: 0; animation: authFadeDown 0.55s ease forwards; }

  @keyframes chipGrowIn {
    0% { opacity: 0; transform: scale(0.3) rotate(-8deg); }
    60% { opacity: 1; transform: scale(1.08) rotate(3deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  .chip-grow { opacity: 0; animation: chipGrowIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

  @keyframes profileFlyIn {
    0% { opacity: 0; transform: translateY(28px) scale(0.85); }
    60% { opacity: 1; transform: translateY(-4px) scale(1.03); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .profile-fly-in { opacity: 0; animation: profileFlyIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

  @keyframes profileIconBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .profile-icon-bounce { animation: profileIconBounce 1.1s ease-in-out infinite; }

  .auth-input::placeholder { color: #9A9A9A; }
  .auth-input:focus { outline: none; border-color: ${C.primary}; }
`;

/**
 * Background video used on every auth/onboarding screen.
 * Video opacity is set to 100% (overlay removed).
 */
function AuthVideoBackground({ frozen = false }: { frozen?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !frozen) return;

    function freezeAtEnd() {
      if (!video) return;
      video.pause();
      video.currentTime = Math.max(0, video.duration - 0.05);
    }

    if (video.readyState >= 1) {
      freezeAtEnd();
    } else {
      video.addEventListener('loadedmetadata', freezeAtEnd, { once: true });
      return () => video.removeEventListener('loadedmetadata', freezeAtEnd);
    }
  }, [frozen]);

  return (
    <video
      ref={videoRef}
      className="auth-bg-video"
      src={authVideo}
      autoPlay={!frozen}
      muted
      playsInline
      preload="auto"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
        opacity: 1, // Full 100% opacity
      }}
    />
  );
}

function AuthShell({
  children,
  maxWidth = 420,
  frozenVideo = false,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  frozenVideo?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <style>{sharedStyles}</style>
      <AuthVideoBackground frozen={frozenVideo} />
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth, textAlign: 'center' }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '18px 26px',
  borderRadius: 999,
  border: `1.5px solid ${C.border}`,
  background: C.surface,
  color: C.text,
  fontSize: 16,
  fontFamily: "'Aileron', sans-serif",
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px 0',
  borderRadius: 16,
  border: 'none',
  background: C.primary,
  color: '#FFFFFF',
  fontSize: 18,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

// ============================================================
// LOGIN / SIGN UP
// ============================================================
export function Login() {
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
    
    if (mode === 'signup') {
      if (!result.session) {
        setError('Akun berhasil dibuat. Cek email kamu untuk konfirmasi sebelum masuk.');
        return;
      }
      navigate('/onboarding/transport');
      return;
    }

    // For Sign In: Check if preferences/profile are set. 
    // Assuming user metadata or object has onboarding flags (e.g., hasCompletedOnboarding)
    const hasCompletedOnboarding = result.user?.user_metadata?.has_completed_onboarding;
    if (!hasCompletedOnboarding) {
      navigate('/onboarding/transport');
      return;
    }

    navigate('/');
  }

  return (
    <AuthShell>
      <h1
        className="font-jockey auth-fade"
        style={{ fontSize: 46, margin: '0 0 34px', color: C.text, animationDelay: '0ms' }}
      >
        {mode === 'signin' ? 'Login Rutein' : 'Daftar Rutein'}
      </h1>

      <form key={mode} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {mode === 'signup' && (
          <input
            className="auth-input auth-fade"
            style={{ ...inputStyle, animationDelay: '0ms' }}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama lengkap"
            required
          />
        )}
        <input
          className="auth-input auth-fade"
          style={{ ...inputStyle, animationDelay: mode === 'signup' ? '60ms' : '0ms' }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          className="auth-input auth-fade"
          style={{ ...inputStyle, animationDelay: mode === 'signup' ? '120ms' : '60ms' }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          minLength={6}
          required
        />

        {error && (
          <p className="auth-fade" style={{ ...bodyFont, color: C.primary, fontSize: 13, margin: 0, animationDelay: '150ms' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="font-jockey auth-fade"
          style={{
            ...buttonStyle,
            fontSize: 18,
            animationDelay: mode === 'signup' ? '180ms' : '120ms',
            opacity: submitting ? 0.7 : 1,
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = C.primaryHover)}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = C.primary)}
        >
          {submitting ? 'Mohon tunggu…' : mode === 'signin' ? 'Masuk ke akun' : 'Buat akun'}
        </button>
      </form>

      <p className="auth-fade" style={{ ...bodyFont, color: C.textMuted, fontSize: 14, marginTop: 24, animationDelay: '220ms' }}>
        {mode === 'signin' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === 'signin' ? 'signup' : 'signin');
          }}
          style={{ background: 'none', border: 'none', padding: 0, color: C.primary, fontWeight: 700, cursor: 'pointer', ...bodyFont, fontSize: 14 }}
        >
          {mode === 'signin' ? 'Daftar' : 'Masuk'}
        </button>
      </p>
    </AuthShell>
  );
}

// ============================================================
// ONBOARDING · STEP 1 — TRANSPORT PREFERENCE
// ============================================================
const TRANSPORT_OPTIONS: { value: OnboardingTransportType; label: string }[] = [
  { value: 'transjakarta', label: 'TransJakarta' },
  { value: 'bus', label: 'Bus Kota' },
  { value: 'krl', label: 'KRL Commuter' },
  { value: 'mrt', label: 'MRT' },
  { value: 'lrt', label: 'LRT' },
  { value: 'train', label: 'Kereta Antarkota' },
  { value: 'airport_rail', label: 'Kereta Bandara' },
  { value: 'ferry', label: 'Kapal Feri' },
  { value: 'terminal', label: 'Terminal Bus' },
];

export function TransportPreference() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<OnboardingTransportType>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(value: OnboardingTransportType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleNext() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveTransportPreference(user.id, Array.from(selected));
      navigate('/onboarding/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan preferensi. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthShell maxWidth={580} frozenVideo>
      <span className="font-jockey auth-fade" style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.primary, fontWeight: 700, animationDelay: '0ms' }}>
        Langkah 1 dari 2
      </span>
      <h1 className="font-jockey auth-fade" style={{ fontSize: 34, margin: '8px 0 12px', color: C.text, animationDelay: '60ms' }}>
        Kamu biasa naik apa?
      </h1>
      <p className="auth-fade" style={{ ...bodyFont, color: C.textMuted, marginBottom: 34, fontSize: 14, animationDelay: '120ms' }}>
        Pilih moda transportasi favoritmu — boleh lebih dari satu.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {TRANSPORT_OPTIONS.map((opt, i) => {
          const active = selected.has(opt.value);
          const dot = TRANSPORT_TYPE_COLOR[opt.value] ?? C.primary;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="chip-grow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Aileron', sans-serif",
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                animationDelay: `${i * 70}ms`,
                border: `1.5px solid ${active ? C.primary : C.border}`,
                background: active ? 'rgba(218,54,42,0.10)' : C.surface,
                color: active ? C.primary : C.text,
                transform: active ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
              {opt.label}
              {active && <Check size={14} strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {error && <p style={{ ...bodyFont, color: C.primary, fontSize: 13, marginTop: 20 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 36 }}>
        <button
          type="button"
          onClick={() => navigate('/onboarding/profile')}
          disabled={saving}
          className="font-jockey"
          style={{
            fontSize: 15,
            padding: '14px 24px',
            borderRadius: 14,
            border: `1.5px solid ${C.border}`,
            background: 'transparent',
            color: C.text,
            cursor: 'pointer',
          }}
        >
          Nanti saja
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="font-jockey"
          style={{ ...buttonStyle, fontSize: 15, width: 'auto', minWidth: 150, padding: '14px 32px', opacity: saving ? 0.7 : 1 }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = C.primaryHover)}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = C.primary)}
        >
          {saving ? 'Menyimpan…' : 'Lanjut'}
        </button>
      </div>
    </AuthShell>
  );
}

// ============================================================
// ONBOARDING · STEP 2 — PROFILE SELECT
// ============================================================
const PROFILES: { value: OnboardingProfileType; label: string; sub: string; icon: string }[] = [
  { value: 'school', label: 'Pelajar', sub: 'Berangkat ke sekolah/kampus', icon: profileSchoolSvg },
  { value: 'travel', label: 'Penjelajah', sub: 'Suka jalan-jalan & eksplorasi', icon: profileTravelSvg },
  { value: 'work', label: 'Pekerja', sub: 'Commuting ke kantor', icon: profileWorkSvg },
];

export function ProfileSelect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<OnboardingProfileType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(profileType: OnboardingProfileType | null) {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfileType(user.id, profileType);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthShell maxWidth={640} frozenVideo>
      <span className="font-jockey auth-fade" style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.primary, fontWeight: 700, animationDelay: '0ms' }}>
        Langkah 2 dari 2
      </span>
      <h1 className="font-jockey auth-fade" style={{ fontSize: 34, margin: '8px 0 12px', color: C.text, animationDelay: '60ms' }}>
        Profil mana yang paling cocok buatmu?
      </h1>
      <p className="auth-fade" style={{ ...bodyFont, color: C.textMuted, marginBottom: 36, fontSize: 14, animationDelay: '120ms' }}>
        Ini membantu RUTEIN memahami gaya perjalananmu — boleh dilewati.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PROFILES.map((p, i) => {
          const active = selected === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setSelected(p.value)}
              className="profile-fly-in"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 168,
                padding: '28px 16px',
                borderRadius: 22,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, background 0.2s ease, border-color 0.2s ease',
                animationDelay: `${i * 140}ms`,
                border: `1.5px solid ${active ? C.primary : C.border}`,
                background: active ? 'rgba(218,54,42,0.10)' : C.surface,
                transform: active ? 'translateY(-6px) scale(1.03)' : 'translateY(0) scale(1)',
              }}
            >
              <img
                src={p.icon}
                alt={p.label}
                className={active ? 'profile-icon-bounce' : undefined}
                style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }}
              />
              <strong className="font-jockey" style={{ fontSize: 20, color: C.text }}>
                {p.label}
              </strong>
              <span style={{ ...bodyFont, fontSize: 12, color: C.textMuted, marginTop: 4 }}>{p.sub}</span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ ...bodyFont, color: C.primary, fontSize: 13, marginTop: 20 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 36 }}>
        <button
          type="button"
          onClick={() => finish(null)}
          disabled={saving}
          className="font-jockey"
          style={{
            fontSize: 15,
            padding: '14px 24px',
            borderRadius: 14,
            border: `1.5px solid ${C.border}`,
            background: 'transparent',
            color: C.text,
            cursor: 'pointer',
          }}
        >
          Nanti saja
        </button>
        <button
          type="button"
          onClick={() => finish(selected)}
          disabled={saving || !selected}
          className="font-jockey"
          style={{
            ...buttonStyle,
            fontSize: 15,
            width: 'auto',
            minWidth: 150,
            padding: '14px 32px',
            opacity: saving || !selected ? 0.6 : 1,
            cursor: !selected ? 'not-allowed' : 'pointer',
          }}
          onMouseOver={(e) => selected && (e.currentTarget.style.backgroundColor = C.primaryHover)}
          onMouseOut={(e) => selected && (e.currentTarget.style.backgroundColor = C.primary)}
        >
          {saving ? 'Menyimpan…' : 'Selesai'}
        </button>
      </div>
    </AuthShell>
  );
}