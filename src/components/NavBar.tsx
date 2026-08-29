import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/map', label: 'Map', icon: '⌖' },
  { to: '/routes', label: 'Routes', icon: '⇄' },
  { to: '/budget', label: 'Budget', icon: '฿' },
  { to: '/schedule', label: 'Schedule', icon: '⏱' },
  { to: '/disruptions', label: 'Alerts', icon: '⚠' },
  { to: '/confused', label: 'Confused?', icon: '?' },
  { to: '/places', label: 'Places', icon: '★' },
  { to: '/profile', label: 'Profile', icon: '☺' },
];

export default function NavBar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <>
      <header style={topBar}>
        <div style={brand}>
          <span style={{ color: 'var(--color-primary)' }}>Rutein</span>
        </div>
        <nav style={desktopNav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                ...navLink,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-outline" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <nav style={bottomNav} className="mobile-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              ...bottomNavItem,
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            })}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 10 }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

const topBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 24px',
  borderBottom: '1px solid var(--color-border)',
  background: 'rgba(11,18,32,0.85)',
  backdropFilter: 'blur(8px)',
  position: 'sticky',
  top: 0,
  zIndex: 20,
};

const brand: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 20,
};

const desktopNav: React.CSSProperties = {
  display: 'flex',
  gap: 20,
};

const navLink: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
};

const bottomNav: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'none',
  justifyContent: 'space-around',
  padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
  background: 'var(--color-surface)',
  borderTop: '1px solid var(--color-border)',
  zIndex: 20,
};

const bottomNavItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  textDecoration: 'none',
  minWidth: 44,
};
