import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Menu, X } from 'lucide-react';

import logoRuteinSvg from '@/assets/images/logo-rutein.svg';
import locationSvg from '@/assets/images/location.svg';
import heroImgSvg from '@/assets/images/hero-img.svg';
import busSvg from '@/assets/images/bus.svg';
import mrtSvg from '@/assets/images/MRT.svg';
import krlSvg from '@/assets/images/KRL.svg';
import jalanKakiSvg from '@/assets/images/jalan-kaki.svg';
import bintangSvg from '@/assets/images/bintang.svg';
import relSvg from '@/assets/images/rel.svg';
import relBawahSvg from '@/assets/images/rel-bawah.svg';
import tentang1Svg from '@/assets/images/tentang1.svg';
import tentang2Svg from '@/assets/images/tentang2.svg';
import tentang3Svg from '@/assets/images/tentang3.svg';
import caraKerjaSvg from '@/assets/images/cara-kerja.svg';
import merpatiSvg from '@/assets/images/merpati-terbang.svg';
import trainPeopleSvg from '@/assets/images/train-people.svg';

// --- REACT BITS ANIMATION COMPONENTS ---

/** 1. Blur Text Reveal Component for Hero Titles */
function BlurText({ text, highlight }: { text: string; highlight?: string }) {
  const words = text.split(' ');
  return (
    <span style={{ display: 'inline-block' }}>
      {words.map((word, idx) => {
        const isHighlight = highlight && word.toLowerCase().includes(highlight.toLowerCase());
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              opacity: 0,
              animation: 'blurReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              animationDelay: `${idx * 0.07}s`,
              color: isHighlight ? '#DA362A' : 'inherit',
              marginRight: '0.28em',
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

/** 2. Spotlight Card Glow Component */
function SpotlightCard({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 12px 32px rgba(218, 54, 42, 0.15)' : style?.boxShadow || '0 4px 16px rgba(0,0,0,0.03)',
        ...style,
      }}
    >
      {isHovered && (
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, rgba(218, 54, 42, 0.12), transparent 80%)`,
            zIndex: 1,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}

/** 3. Animated Number Counter Component (0 -> 5K+) */
function AnimatedCounter({ target = 5000, suffix = '+' }: { target?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 1800;
          const startTime = performance.now();

          const updateCount = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeProgress * target));

            if (progress < 1) {
              requestAnimationFrame(updateCount);
            }
          };

          requestAnimationFrame(updateCount);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-jockey" style={{ fontSize: 32, color: '#DA362A', lineHeight: 1 }}>
      {count >= 1000 ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K${suffix}` : `${count}${suffix}`}
    </div>
  );
}

/** 4. Magnet Button Effect Component */
function MagnetButton({
  children,
  onClick,
  style,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.25;
    const deltaY = (e.clientY - centerY) * 0.25;
    setTransform({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setTransform({ x: 0, y: 0 });
  };

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      className={className}
      title={title}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

/** 5. Moving Rail Illustration Component */
function MovingRail({ src }: { src: string }) {
  return (
    <div
      style={{
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        marginTop: 40,
        marginBottom: 60,
        overflow: 'hidden',
        lineHeight: 0,
      }}
    >
      <img
        src={src}
        alt="Rel Ilustrasi"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          minWidth: '100vw',
          animation: 'railPulse 4s ease-in-out infinite alternate',
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FCF4ED',
        color: '#1E1E1E',
        fontFamily: 'var(--font-body)',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes blurReveal {
          0% {
            opacity: 0;
            filter: blur(12px);
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0);
          }
        }

        @keyframes railPulse {
          0% {
            transform: scale(1);
            opacity: 0.92;
          }
          100% {
            transform: scale(1.015);
            opacity: 1;
          }
        }
      `}</style>

      {/* --- STATIC TOP HEADER --- */}
      <header
        className="static-header"
        style={{
          padding: '24px 32px 10px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div onClick={scrollToTop} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
          <img src={logoRuteinSvg} alt="Rutein Logo" style={{ height: 32, objectFit: 'contain', display: 'block' }} />
        </div>
      </header>

      {/* --- DESKTOP FULL PILL NAVBAR --- */}
      <div
        className="desktop-nav-pill"
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <MagnetButton
          onClick={scrollToTop}
          title="Kembali ke Atas"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#DA362A',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(218, 54, 42, 0.35)',
            flexShrink: 0,
          }}
        >
          <Home size={19} color="#FFFFFF" />
        </MagnetButton>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '2px solid #DA362A',
            borderRadius: 999,
            padding: '4px 6px',
            background: '#FCF4ED',
            boxShadow: '0 6px 20px rgba(218, 54, 42, 0.15)',
          }}
        >
          <button
            onClick={() => scrollToSection('tentang')}
            className="font-jockey"
            style={{
              padding: '6px 22px',
              borderRadius: 999,
              color: '#1E1E1E',
              background: 'none',
              border: 'none',
              fontSize: 17,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Tentang
          </button>

          <button
            onClick={() => scrollToSection('cara-kerja')}
            className="font-jockey"
            style={{
              padding: '6px 22px',
              borderRadius: 999,
              color: '#1E1E1E',
              background: 'none',
              border: 'none',
              fontSize: 17,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Cara Kerja
          </button>

          <button
            onClick={() => navigate(user ? '/dashboard' : '/login')}
            className="font-jockey"
            style={{
              padding: '6px 26px',
              borderRadius: 999,
              background: '#DA362A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 17,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(218, 54, 42, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {user ? 'Dashboard' : 'Mulai'}
          </button>
        </div>
      </div>

      {/* --- MOBILE HAMBURGER BUTTONS GROUP --- */}
      <div
        className="hamburger-nav-group"
        style={{
          position: 'fixed',
          top: 20,
          right: 24,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={scrollToTop}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#DA362A',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(218, 54, 42, 0.35)',
            color: '#FFFFFF',
          }}
          title="Ke Atas"
        >
          <Home size={19} color="#FFFFFF" />
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#DA362A',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(218, 54, 42, 0.35)',
            color: '#FFFFFF',
          }}
          title="Menu Navigasi"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {isMobileMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 50,
              right: 0,
              background: '#FCF4ED',
              border: '2px solid #DA362A',
              borderRadius: 20,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              minWidth: 190,
              boxShadow: '0 12px 32px rgba(218, 54, 42, 0.25)',
              zIndex: 1001,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <button
              onClick={() => scrollToSection('tentang')}
              className="font-jockey"
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                color: '#1E1E1E',
                background: '#FDF0ED',
                border: '1px solid #E5D5C5',
                fontSize: 18,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              Tentang
            </button>

            <button
              onClick={() => scrollToSection('cara-kerja')}
              className="font-jockey"
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                color: '#1E1E1E',
                background: '#FDF0ED',
                border: '1px solid #E5D5C5',
                fontSize: 18,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              Cara Kerja
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate(user ? '/dashboard' : '/login');
              }}
              className="font-jockey"
              style={{
                padding: '12px 20px',
                borderRadius: 999,
                background: '#DA362A',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 18,
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(218, 54, 42, 0.3)',
              }}
            >
              {user ? 'Dashboard' : 'Mulai'}
            </button>
          </div>
        )}
      </div>

      {/* --- HERO SECTION --- */}
      <section
        className="hero-container"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '40px 32px 0px',
          position: 'relative',
        }}
      >
        <div className="hero-grid">
          {/* Hero Image Column */}
          <div className="hero-img-col">
            <img
              src={heroImgSvg}
              alt="Peta Rutein"
              style={{
                width: '100%',
                maxWidth: 520,
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Hero Text Column */}
          <div className="hero-text-col" style={{ zIndex: 2 }}>
            <h1
              className="font-jockey"
              style={{
                fontSize: 'clamp(34px, 4.8vw, 60px)',
                lineHeight: 1.08,
                fontWeight: 900,
                color: '#1E1E1E',
                margin: '0 0 20px 0',
                letterSpacing: '0.01em',
              }}
            >
              <BlurText text="Navigasi transportasi publik," />
              <br />
              <span style={{ color: '#DA362A' }}>
                <BlurText text="tanpa ribet." highlight="ribet." />
              </span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(14px, 1.4vw, 16px)',
                lineHeight: 1.65,
                color: '#4A4A4A',
                marginBottom: 32,
                maxWidth: 540,
              }}
            >
              <strong style={{ color: '#DA362A' }}>RUTEIN</strong> membantu kamu merencanakan perjalanan dengan transportasi publik berdasarkan waktu, biaya, dan preferensi perjalanan, lalu memandumu secara real-time sampai tujuan.
            </p>

            {/* Magnet Main Action Button */}
            <div style={{ marginBottom: 36 }}>
              <MagnetButton
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="font-jockey"
                style={{
                  background: '#DA362A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 40px',
                  fontSize: 20,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(218, 54, 42, 0.35)',
                }}
              >
                Mulai Perjalanan
              </MagnetButton>
            </div>

            {/* Transport Modes Cards with Spotlight */}
            <div
              className="transport-cards-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              {/* Bus */}
              <SpotlightCard
                style={{
                  width: 72,
                  height: 72,
                  background: '#FFFFFF',
                  border: '1.5px solid #E5D5C5',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <img src={busSvg} alt="Bus" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>Bus</span>
              </SpotlightCard>

              {/* MRT */}
              <SpotlightCard
                style={{
                  width: 72,
                  height: 72,
                  background: '#FFFFFF',
                  border: '1.5px solid #E5D5C5',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <img src={mrtSvg} alt="MRT" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>MRT</span>
              </SpotlightCard>

              {/* KRL */}
              <SpotlightCard
                style={{
                  width: 72,
                  height: 72,
                  background: '#FFFFFF',
                  border: '1.5px solid #E5D5C5',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <img src={krlSvg} alt="KRL" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>KRL</span>
              </SpotlightCard>

              {/* Jalan Kaki */}
              <SpotlightCard
                style={{
                  width: 72,
                  height: 72,
                  background: '#FFFFFF',
                  border: '1.5px solid #E5D5C5',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <img src={jalanKakiSvg} alt="Jalan Kaki" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>Jalan Kaki</span>
              </SpotlightCard>
            </div>

            {/* Tagline note with Star */}
            <div className="tagline-star-row" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666666' }}>
              <img src={bintangSvg} alt="Star" style={{ width: 14, height: 14 }} />
              <span>
                Satu tujuan. <strong>Banyak cara</strong> untuk sampai.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- REL LINE ILLUSTRATION 1 WITH MOVING RAIL --- */}
      <MovingRail src={relSvg} />

      {/* --- SECTION 2: KAMI MUDAHKAN PERJALANANMU! --- */}
      <section
        id="tentang"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '20px 40px 80px',
        }}
      >
        {/* Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
            marginBottom: 48,
          }}
        >
          {/* Big Red Location Pin + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img src={locationSvg} alt="Location Pin" style={{ height: 68, width: 'auto', objectFit: 'contain' }} />
            <h2
              className="font-jockey"
              style={{
                fontSize: 'clamp(32px, 4.2vw, 52px)',
                lineHeight: 1.05,
                fontWeight: 900,
                color: '#1E1E1E',
                margin: 0,
              }}
            >
              Kami mudahkan
              <br />
              <span style={{ color: '#DA362A' }}>perjalananmu!</span>
            </h2>
          </div>

          {/* 5K+ Stats Card Badge with Animated Counter */}
          <SpotlightCard
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 16,
              padding: '14px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#FDF0ED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
              }}
            >
              <img src={locationSvg} alt="Pin" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
            </div>
            <div>
              <AnimatedCounter target={5000} suffix="+" />
              <div style={{ fontSize: 13, color: '#555555', fontWeight: 700, fontFamily: 'var(--font-inter)' }}>
                Rute Transportasi
                <br />
                Terhubung
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* 3 Cards Grid with Spotlight */}
        <div className="tentang-cards-grid">
          {/* Card 1: Transit Lebih Mudah */}
          <SpotlightCard
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 20,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <img src={tentang1Svg} alt="Transit Lebih Mudah" style={{ width: '100%', maxHeight: 170, objectFit: 'contain' }} />
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <h3 className="font-jockey" style={{ fontSize: 24, color: '#1E1E1E', margin: '0 0 10px 0' }}>
                Transit lebih mudah
              </h3>
              <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                Gabungkan beberapa moda transportasi
                <br />
                publik dalam satu perjalanan
              </p>
            </div>
          </SpotlightCard>

          {/* Card 2: Bandingkan Sebelum Berangkat */}
          <SpotlightCard
            style={{
              background: '#FFFFFF',
              border: '2px solid #DA362A',
              borderRadius: 20,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(218, 54, 42, 0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <img src={tentang2Svg} alt="Bandingkan Sebelum Berangkat" style={{ width: '100%', maxHeight: 170, objectFit: 'contain' }} />
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <h3 className="font-jockey" style={{ fontSize: 24, color: '#1E1E1E', margin: '0 0 10px 0' }}>
                Bandingkan sebelum
                <br />
                berangkat
              </h3>
              <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                Lihat waktu, biaya, dan jumlah transit
                <br />
                sebelum memilih perjalanan
              </p>
            </div>
          </SpotlightCard>

          {/* Card 3: Tahu Kondisi Perjalanan */}
          <SpotlightCard
            className="tentang-card-3"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 20,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <img src={tentang3Svg} alt="Tahu Kondisi Perjalanan" style={{ width: '100%', maxHeight: 170, objectFit: 'contain' }} />
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <h3 className="font-jockey" style={{ fontSize: 24, color: '#1E1E1E', margin: '0 0 10px 0', whiteSpace: 'nowrap' }}>
                Tahu Kondisi Perjalanan
              </h3>
              <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                Pantau jadwal dan informasi perjalanan
                <br />
                sebelum kamu berangkat
              </p>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* --- SECTION 3: CARA KERJA & FOOTER CALLOUT --- */}
      <section
        id="cara-kerja"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '40px 40px 60px',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto 90px', position: 'relative' }}>
          <div className="cara-kerja-desktop">
            <div style={{ position: 'relative', height: 95, marginBottom: 0 }}>
              <div style={{ position: 'absolute', left: '-60px', bottom: 8, width: 300, textAlign: 'center' }}>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 26, margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  Masukkan Tujuan
                </h4>
              </div>

              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, width: 380, textAlign: 'center' }}>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 26, margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  RUTEIN carikan pilihan
                  <br />
                  perjalanan
                </h4>
              </div>

              <div style={{ position: 'absolute', right: '-60px', bottom: 8, width: 300, textAlign: 'center' }}>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 26, margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  Pilih dan mulai
                  <br />
                  perjalanan
                </h4>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '0' }}>
              <img src={caraKerjaSvg} alt="Cara Kerja Timeline" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            <div style={{ position: 'relative', height: 125, marginTop: 18 }}>
              <div style={{ position: 'absolute', left: '-60px', top: 0, width: 300, textAlign: 'center' }}>
                <p style={{ fontSize: 17, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                  Pilih lokasi awal dan
                  <br />
                  tujuan akhir kamu
                </p>
              </div>

              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, width: 380, textAlign: 'center' }}>
                <p style={{ fontSize: 17, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                  Kami hitung rute terbaik
                  <br />
                  berdasarkan waktu, biaya,
                  <br />
                  transit, dan kondisi live
                </p>
              </div>

              <div style={{ position: 'absolute', right: '-60px', top: 0, width: 300, textAlign: 'center' }}>
                <p style={{ fontSize: 17, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                  Pilih rute favoritmu dan
                  <br />
                  berangkat dengan
                  <br />
                  percaya diri
                </p>
              </div>
            </div>
          </div>

          <div className="cara-kerja-mobile" style={{ display: 'none', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5D5C5',
                borderRadius: 16,
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="font-jockey"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#DA362A',
                  color: '#FFFFFF',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 20, margin: '0 0 4px 0' }}>
                  Masukkan Tujuan
                </h4>
                <p style={{ fontSize: 14, color: '#4A4A4A', margin: 0, fontFamily: 'var(--font-inter)' }}>
                  Pilih lokasi awal dan tujuan akhir kamu
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5D5C5',
                borderRadius: 16,
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="font-jockey"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#DA362A',
                  color: '#FFFFFF',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 20, margin: '0 0 4px 0' }}>
                  RUTEIN Carikan Pilihan
                </h4>
                <p style={{ fontSize: 14, color: '#4A4A4A', margin: 0, fontFamily: 'var(--font-inter)' }}>
                  Kami hitung rute terbaik berdasarkan waktu, biaya, transit, dan kondisi live
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5D5C5',
                borderRadius: 16,
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="font-jockey"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#DA362A',
                  color: '#FFFFFF',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 20, margin: '0 0 4px 0' }}>
                  Pilih dan Mulai Perjalanan
                </h4>
                <p style={{ fontSize: 14, color: '#4A4A4A', margin: 0, fontFamily: 'var(--font-inter)' }}>
                  Pilih rute favoritmu dan berangkat dengan percaya diri
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Giant Footer Callout Heading & Bird */}
        <div style={{ textAlign: 'center', padding: '20px 0 50px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <img
              src={merpatiSvg}
              alt="Merpati Terbang"
              style={{ height: 'clamp(36px, 6vw, 82px)', width: 'auto', objectFit: 'contain' }}
            />
            <span className="font-jockey" style={{ fontSize: 'clamp(44px, 8vw, 102px)', color: '#DA362A', lineHeight: 0.95 }}>
              Rutein
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: -4, flexWrap: 'wrap' }}>
            <span className="font-jockey" style={{ fontSize: 'clamp(40px, 7.5vw, 96px)', color: '#1E1E1E', lineHeight: 0.95 }}>
              perjalananmu
            </span>
            <img
              src={trainPeopleSvg}
              alt="Train People"
              style={{ height: 'clamp(32px, 5.5vw, 70px)', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: -4, flexWrap: 'wrap' }}>
            <img
              src={bintangSvg}
              alt="Bintang"
              style={{ height: 'clamp(26px, 4.5vw, 56px)', width: 'auto', objectFit: 'contain' }}
            />
            <span className="font-jockey" style={{ fontSize: 'clamp(40px, 7.5vw, 96px)', color: '#1E1E1E', lineHeight: 0.95 }}>
              biar <span style={{ color: '#DA362A', fontStyle: 'italic' }}>gampang.</span>
            </span>
          </div>

          <div style={{ marginTop: 36 }}>
            <MagnetButton
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="font-jockey"
              style={{
                background: '#DA362A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: '16px 44px',
                fontSize: 22,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(218, 54, 42, 0.35)',
              }}
            >
              Mulai Perjalanan
            </MagnetButton>
          </div>
        </div>
      </section>

      {/* --- BOTTOM EDGE TO EDGE REL LINE --- */}
      <MovingRail src={relBawahSvg} />

      {/* --- FOOTER SECTION --- */}
      <footer
        style={{
          background: '#FCF4ED',
          color: '#1E1E1E',
          padding: '50px 40px 30px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 40,
            alignItems: 'flex-start',
            marginBottom: 44,
          }}
        >
          {/* Column 1: Logo & Tagline */}
          <div>
            <img src={logoRuteinSvg} alt="Rutein Logo" style={{ height: 38, objectFit: 'contain', marginBottom: 14 }} />
            <p style={{ fontSize: 13, color: '#555555', margin: 0, lineHeight: 1.55, fontFamily: 'var(--font-inter)' }}>
              Temukan rute. Pilih perjalanan.
              <br />
              Sampai tujuan
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => scrollToSection('tentang')}
              className="font-jockey"
              style={{ color: '#1E1E1E', background: 'none', border: 'none', padding: 0, fontSize: 20, letterSpacing: '0.02em', cursor: 'pointer', textAlign: 'left' }}
            >
              Tentang
            </button>
            <button
              onClick={() => scrollToSection('cara-kerja')}
              className="font-jockey"
              style={{ color: '#1E1E1E', background: 'none', border: 'none', padding: 0, fontSize: 20, letterSpacing: '0.02em', cursor: 'pointer', textAlign: 'left' }}
            >
              Cara Kerja
            </button>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="font-jockey"
              style={{
                color: '#1E1E1E',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 20,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Mulai
            </button>
          </div>

          {/* Column 3: Social Media */}
          <div>
            <h4 className="font-jockey" style={{ fontSize: 18, color: '#1E1E1E', margin: '0 0 14px 0', letterSpacing: '0.02em' }}>
              Ikuti Perjalanan Kami !
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Instagram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Facebook">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 1 1-2.896-2.896c.244 0 .484.03.714.088V9.387a6.34 6.34 0 1 0 5.627 6.285V8.636a8.216 8.216 0 0 0 4.77 1.495V6.686z" />
                </svg>
              </a>
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="X">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 4: Newsletter Form */}
          <div>
            <h4 className="font-jockey" style={{ fontSize: 18, color: '#1E1E1E', margin: '0 0 14px 0', letterSpacing: '0.02em' }}>
              Dapatkan Informasi Perjalanan Terbaru !
            </h4>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Terima kasih sudah mendaftar!');
              }}
              style={{ display: 'flex', maxWidth: 360 }}
            >
              <input
                type="email"
                placeholder="Masukkan email kamu"
                required
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px 0 0 10px',
                  border: '1.5px solid #D5C5B5',
                  borderRight: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'var(--font-inter)',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#DA362A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0 10px 10px 0',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div
          style={{
            borderTop: '1px solid #E5D5C5',
            paddingTop: 20,
            textAlign: 'center',
            fontSize: 13,
            color: '#666666',
            fontFamily: 'var(--font-inter)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E1E1E' }}>©</span>
          <span style={{ fontWeight: 600, color: '#1E1E1E' }}>2026 RUTEIN</span>
        </div>
      </footer>
    </div>
  );
}
