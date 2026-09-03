import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sliders,
  Bookmark,
  Settings,
  User,
  Check,
  MapPin,
  Globe,
} from 'lucide-react';
import {
  TRANSPORT_TYPE_LABELS,
  type IndonesiaTransportType,
} from '@/data/indonesiaTransportData';
import { TRANSPORT_TYPE_COLOR } from '@/components/transportMarkerIcon';
import { listSavedPlaces } from '@/services/savedPlacesService';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedPlace } from '@/types/database.types';

const ALL_TRANSPORT_TYPES = Object.keys(
  TRANSPORT_TYPE_LABELS
) as IndonesiaTransportType[];

type ActiveSection = 'operators' | 'stops' | 'saved' | null;

interface MapSidebarProps {
  activeTypes: Set<IndonesiaTransportType>;
  onToggleType: (type: IndonesiaTransportType) => void;
  onShowAllTypes: () => void;
  onSelectSavedPlace: (lat: number, lng: number) => void;
}

export default function MapSidebar({
  activeTypes,
  onToggleType,
  onShowAllTypes,
  onSelectSavedPlace,
}: MapSidebarProps) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('operators');
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [lang, setLang] = useState<'ID' | 'EN'>('ID');

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Nael Muna';

  useEffect(() => {
    if (!user) return;
    setLoadingSaved(true);
    listSavedPlaces(user.id)
      .then(setSavedPlaces)
      .catch(() => setSavedPlaces([]))
      .finally(() => setLoadingSaved(false));
  }, [user]);

  const toggleSection = (section: ActiveSection) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setActiveSection(section);
      return;
    }
    setActiveSection((prev) => (prev === section ? null : section));
  };

  return (
    <aside style={sidebarContainer(isCollapsed)}>
      {/* Header / Brand & ID/EN Toggle & Expand/Collapse */}
      <div style={headerStyle(isCollapsed)}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={brandText}>Rutein</span>
            {/* Language Switcher Pill */}
            <div style={langSwitchContainer}>
              <button
                style={langBtnStyle(lang === 'ID')}
                onClick={() => setLang('ID')}
              >
                ID
              </button>
              <button
                style={langBtnStyle(lang === 'EN')}
                onClick={() => setLang('EN')}
              >
                EN
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          style={toggleBtnStyle}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Main Navigation Sections */}
      <div style={contentStyle}>
        {/* Operators Section */}
        <div style={sectionWrapperStyle}>
          <button
            onClick={() => toggleSection('operators')}
            style={navItemStyle(activeSection === 'operators' && !isCollapsed)}
            title="Operators"
          >
            <div style={navItemLabelGroup}>
              <Sliders size={18} />
              {!isCollapsed && <span>Operators</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown
                size={16}
                style={{
                  transform: activeSection === 'operators' ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            )}
          </button>

          {!isCollapsed && activeSection === 'operators' && (
            <div style={accordionContentStyle}>
              <div style={operatorsListStyle}>
                {ALL_TRANSPORT_TYPES.map((type) => {
                  const isChecked = activeTypes.has(type);
                  return (
                    <label key={type} style={operatorRowStyle}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleType(type)}
                        style={checkboxStyle}
                      />
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: TRANSPORT_TYPE_COLOR[type],
                          flexShrink: 0,
                        }}
                      />
                      <span style={operatorLabelStyle}>{TRANSPORT_TYPE_LABELS[type]}</span>
                    </label>
                  );
                })}
              </div>

              <button onClick={onShowAllTypes} style={showAllBtnStyle}>
                <Check size={14} /> Show All
              </button>
            </div>
          )}
        </div>

        {/* Transit Stops Section (Disabled / Held) */}
        <div style={sectionWrapperStyle}>
          <button
            style={disabledNavItemStyle}
            title="Transit Stops (Hold / Coming Soon)"
          >
            <div style={navItemLabelGroup}>
              <MapPin size={18} />
              {!isCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Transit Stops</span>
                  <span style={comingSoonBadge}>Hold</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Saved Places Section */}
        <div style={sectionWrapperStyle}>
          <button
            onClick={() => toggleSection('saved')}
            style={navItemStyle(activeSection === 'saved' && !isCollapsed)}
            title="Saved Places"
          >
            <div style={navItemLabelGroup}>
              <Bookmark size={18} />
              {!isCollapsed && <span>Saved Places</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown
                size={16}
                style={{
                  transform: activeSection === 'saved' ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            )}
          </button>

          {!isCollapsed && activeSection === 'saved' && (
            <div style={accordionContentStyle}>
              {loadingSaved ? (
                <div style={mutedTextStyle}>Loading saved places...</div>
              ) : savedPlaces.length === 0 ? (
                <div style={mutedTextStyle}>No saved places found.</div>
              ) : (
                <div style={savedListStyle}>
                  {savedPlaces.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => onSelectSavedPlace(place.latitude, place.longitude)}
                      style={savedItemStyle}
                      title={place.name}
                    >
                      <div style={savedItemName}>{place.name}</div>
                      {place.address && <div style={savedItemAddress}>{place.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Anchored at the VERY Bottom */}
      <div style={bottomFooterStyle}>
        {/* Settings Link */}
        <Link to="/preferences" style={navLinkItemStyle} title="Settings">
          <div style={navItemLabelGroup}>
            <Settings size={18} />
            {!isCollapsed && <span>Settings</span>}
          </div>
        </Link>

        {/* Profile Link with Avatar/User Name */}
        <Link to="/profile" style={profileLinkStyle} title="Profile">
          <div style={navItemLabelGroup}>
            <div style={avatarStyle}>
              <User size={14} color="var(--color-sidebar-text)" />
            </div>
            {!isCollapsed && (
              <div style={profileTextGroup}>
                <span style={userNameStyle}>{userName}</span>
                <span style={userSubtextStyle}>View Profile</span>
              </div>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}

// STYLES — STRICTLY USING CSS VARIABLES DEFINED FOR SIDEBAR
const sidebarContainer = (isCollapsed: boolean): React.CSSProperties => ({
  width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
  minWidth: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
  height: '100vh',
  backgroundColor: 'var(--color-sidebar)',
  color: 'var(--color-sidebar-text)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 'var(--z-panel)',
  boxShadow: '4px 0 16px rgba(0, 0, 0, 0.25)',
  userSelect: 'none',
});

const headerStyle = (isCollapsed: boolean): React.CSSProperties => ({
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: isCollapsed ? 'center' : 'space-between',
  padding: isCollapsed ? '0 12px' : '0 16px',
  borderBottom: '1px solid rgba(251, 244, 238, 0.15)',
});

const brandText: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--color-sidebar-text)',
  letterSpacing: '-0.02em',
};

const langSwitchContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 14,
  padding: 2,
};

const langBtnStyle = (isActive: boolean): React.CSSProperties => ({
  border: 'none',
  background: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
  color: isActive ? '#C94535' : 'var(--color-sidebar-text)',
  borderRadius: 12,
  padding: '2px 7px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const toggleBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-sidebar-text)',
  cursor: 'pointer',
  padding: 6,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  backgroundColor: isActive ? 'var(--color-sidebar-hover)' : 'transparent',
  color: 'var(--color-sidebar-text)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
});

const disabledNavItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  backgroundColor: 'transparent',
  color: 'var(--color-sidebar-text-muted)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'not-allowed',
  opacity: 0.7,
};

const comingSoonBadge: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '2px 5px',
  borderRadius: 4,
  background: 'rgba(251, 244, 238, 0.15)',
  color: 'var(--color-sidebar-text-muted)',
};

const navLinkItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  borderRadius: 8,
  backgroundColor: 'transparent',
  color: 'var(--color-sidebar-text)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'background-color 0.15s ease',
};

const profileLinkStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: '8px 14px',
  borderRadius: 8,
  backgroundColor: 'var(--color-sidebar-hover)',
  color: 'var(--color-sidebar-text)',
  textDecoration: 'none',
  marginTop: 4,
  transition: 'opacity 0.15s ease',
};

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'rgba(251, 244, 238, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const profileTextGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginLeft: 2,
};

const userNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-sidebar-text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 140,
};

const userSubtextStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--color-sidebar-text-muted)',
};

const navItemLabelGroup: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const accordionContentStyle: React.CSSProperties = {
  padding: '8px 12px 12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const operatorsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 280,
  overflowY: 'auto',
};

const operatorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  padding: '4px 0',
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  cursor: 'pointer',
  accentColor: 'var(--color-sidebar-active-bg)',
};

const operatorLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-sidebar-text)',
};

const showAllBtnStyle: React.CSSProperties = {
  background: 'var(--color-sidebar-hover)',
  border: 'none',
  borderRadius: 6,
  color: 'var(--color-sidebar-text)',
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginTop: 4,
  transition: 'opacity 0.15s ease',
};

const savedListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 220,
  overflowY: 'auto',
};

const savedItemStyle: React.CSSProperties = {
  background: 'var(--color-sidebar-hover)',
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  color: 'var(--color-sidebar-text)',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
};

const savedItemName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const savedItemAddress: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-sidebar-text-muted)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  marginTop: 2,
};

const mutedTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-sidebar-text-muted)',
  fontStyle: 'italic',
};

const bottomFooterStyle: React.CSSProperties = {
  marginTop: 'auto',
  padding: '12px 10px 16px 10px',
  borderTop: '1px solid rgba(251, 244, 238, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};
