import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveTransportPreference,
  saveProfileType,
  getOnboardingStatus,
  type OnboardingTransportType,
  type OnboardingProfileType,
} from '@/services/onboardingService';
import { TRANSPORT_TYPE_COLOR } from '@/components/transportMarkerIcon';

import authVideo from '@/assets/videos/auth.mov';
import rutinLogo from '@/assets/images/logo-rutein.svg';
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

  @keyframes alertShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
  }
  .auth-alert { animation: authFadeDown 0.3s ease forwards, alertShake 0.4s ease 0.05s; }
  .auth-alert-info { animation: authFadeDown 0.3s ease forwards; }

  .auth-input::placeholder { color: #9A9A9A; }
  .auth-input:focus { outline: none; border-color: ${C.primary}; }

  .auth-logo-link {
    display: inline-flex;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  .auth-logo-link:hover { transform: translateY(-2px); opacity: 0.85; }
  .auth-logo-link:focus-visible {
    outline: 2px solid ${C.primary};
    outline-offset: 4px;
    border-radius: 8px;
  }

  /* ---------------- Responsive ---------------- */
  .auth-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .auth-shell-inner { width: 100%; }

  @media (max-width: 520px) {
    .auth-actions { flex-direction: column; }
    .auth-actions > button { width: 100%; }
    .profile-option { width: 100% !important; max-width: 260px; }
    .chip-row { gap: 8px !important; }
  }

  @media (max-width: 360px) {
    .auth-input { padding: 14px 20px !important; font-size: 15px !important; }
  }
`;

/**
 * Background video used on every auth/onboarding screen.
 *
 * `frozen = false` (Login): the video autoplays once, no `loop`, so it
 * naturally settles on its final frame once playback finishes.
 *
 * `frozen = true` (TransportPreference / ProfileSelect): the video is
 * never played — as soon as its metadata loads we jump straight to the
 * last frame and pause, so it renders as a static "already finished"
 * backdrop the instant these screens mount, matching what the user sees
 * right after logging in / signing up.
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
        padding: 'clamp(16px, 6vw, 40px) 20px',
        boxSizing: 'border-box',
      }}
    >
      <style>{sharedStyles}</style>
      <AuthVideoBackground frozen={frozenVideo} />
      <div className="auth-shell-inner" style={{ position: 'relative', zIndex: 2, maxWidth, textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/** Small centered loading state shown while we check onboarding status,
 * so the onboarding form never flashes before an already-onboarded user
 * gets redirected home. */
function AuthLoadingScreen() {
  return (
    <AuthShell frozenVideo>
      <p style={{ ...bodyFont, color: C.textMuted, fontSize: 14 }}>Memuat…</p>
    </AuthShell>
  );
}

/**
 * Small clickable brand mark shown above the Login heading. Takes the
 * user back to the marketing landing page — kept as its own component
 * so it can be dropped onto other auth-adjacent screens later without
 * duplicating the markup/behavior.
 */
function AuthLogoLink({ delay = '0ms' }: { delay?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="auth-logo-link auth-fade"
      style={{ marginBottom: 22, animationDelay: delay }}
      onClick={() => navigate('/')}
      aria-label="Kembali ke halaman utama Rutein"
    >
      <img src={rutinLogo} alt="Rutein" style={{ height: 34, width: 'auto', display: 'block' }} />
    </button>
  );
}

/**
 * Styled message banner used for both hard errors ("email atau password
 * salah") and softer informational notices (e.g. "cek email kamu").
 * `tone="error"` gets a firmer shake-in and warning icon; `tone="info"`
 * is the same shape without the shake, so success-ish copy doesn't read
 * as alarming.
 */
function AuthAlert({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'info' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={tone === 'error' ? 'auth-alert' : 'auth-alert-info'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 14,
        border: `1.5px solid ${tone === 'error' ? C.primary : C.border}`,
        background: tone === 'error' ? 'rgba(218,54,42,0.08)' : 'rgba(183,168,151,0.14)',
        textAlign: 'left',
      }}
    >
      <AlertTriangle
        size={16}
        strokeWidth={2.25}
        color={tone === 'error' ? C.primary : C.textMuted}
        style={{ flexShrink: 0, marginTop: 1 }}
      />
      <span style={{ ...bodyFont, fontSize: 13, lineHeight: 1.45, color: tone === 'error' ? C.text : C.textMuted }}>
        {children}
      </span>
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
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, fullName);

    if (result.error) {
      setSubmitting(false);
      setError(result.error.message);
      return;
    }

    if (mode === 'signup') {
      setSubmitting(false);
      if (!result.session) {
        setNotice('Akun berhasil dibuat. Cek email kamu untuk konfirmasi sebelum masuk.');
        return;
      }
      // Brand-new account — always send straight to onboarding.
      navigate('/onboarding/transport');
      return;
    }

    // Sign in: only send returning users through onboarding if they
    // genuinely haven't finished it yet (checked against the real
    // `user_preferences.onboarding_completed_at` column, not client
    // auth metadata, which nothing in the app ever sets).
    try {
      const status = result.user ? await getOnboardingStatus(result.user.id) : { completed: false };
      navigate(status.completed ? '/' : '/onboarding/transport');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <AuthLogoLink />

      <h1
        className="font-jockey auth-fade"
        style={{ fontSize: 'clamp(30px, 8vw, 46px)', margin: '0 0 34px', color: C.text, animationDelay: '40ms' }}
      >
        {mode === 'signin' ? 'Login Rutein' : 'Daftar Rutein'}
      </h1>

      {/* key={mode} forces every field below to fully remount on each
          Masuk/Daftar toggle, so the whole form fades down together and
          consistently. */}
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

        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        {notice && <AuthAlert tone="info">{notice}</AuthAlert>}

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
            setNotice(null);
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

/**
 * Shared guard for the two onboarding screens: if the signed-in user has
 * already finished onboarding (real DB check, not metadata), redirect
 * home immediately instead of showing the form again — covers direct
 * links, browser back/forward, and bookmarks.
 */
function useOnboardingGuard(): boolean {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setChecking(false);
      return;
    }

    getOnboardingStatus(user.id).then((status) => {
      if (cancelled) return;
      if (status.completed) {
        navigate('/', { replace: true });
        return;
      }
      setChecking(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  return checking;
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
  const checking = useOnboardingGuard();
  const [selected, setSelected] = useState<Set<OnboardingTransportType>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (checking) return <AuthLoadingScreen />;

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
      <h1 className="font-jockey auth-fade" style={{ fontSize: 'clamp(24px, 6vw, 34px)', margin: '8px 0 12px', color: C.text, animationDelay: '60ms' }}>
        Kamu biasa naik apa?
      </h1>
      <p className="auth-fade" style={{ ...bodyFont, color: C.textMuted, marginBottom: 34, fontSize: 14, animationDelay: '120ms' }}>
        Pilih moda transportasi favoritmu — boleh lebih dari satu.
      </p>

      <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
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

      {error && (
        <div style={{ marginTop: 20 }}>
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}

      <div className="auth-actions" style={{ marginTop: 36 }}>
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
  const checking = useOnboardingGuard();
  const [selected, setSelected] = useState<OnboardingProfileType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (checking) return <AuthLoadingScreen />;

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
      <h1 className="font-jockey auth-fade" style={{ fontSize: 'clamp(24px, 6vw, 34px)', margin: '8px 0 12px', color: C.text, animationDelay: '60ms' }}>
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
              className="profile-fly-in profile-option"
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

      {error && (
        <div style={{ marginTop: 20 }}>
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}

      <div className="auth-actions" style={{ marginTop: 36 }}>
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