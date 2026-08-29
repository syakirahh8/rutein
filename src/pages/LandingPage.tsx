import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Menu, X } from 'lucide-react';

import logoRuteinSvg from '@/assets/images/logo-rutein.svg';
import logoNontextSvg from '@/assets/images/logo-nontext.svg';
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
    <div style={{ 
      minHeight: '100vh', 
      background: '#FCF4ED', 
      color: '#1E1E1E', 
      fontFamily: 'var(--font-body)',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      
      {/* --- STATIC TOP HEADER (Logo top-left directly on page background, NO background pill) --- */}
      <header 
        className="static-header"
        style={{
          padding: '24px 32px 10px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Logo (Left, static directly on page background with safe left margin) */}
        <div 
          onClick={scrollToTop} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: 4 }}
        >
          <img 
            src={logoRuteinSvg} 
            alt="Rutein Logo" 
            style={{ height: 32, objectFit: 'contain', display: 'block' }} 
          />
        </div>
      </header>

      {/* --- DESKTOP FULL PILL NAVBAR (Shown ONLY on screens > 1024px) --- */}
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
          gap: 10
        }}
      >
        {/* Red Circle Button with Home Icon -> Scroll to Top */}
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
            transition: 'transform 0.15s ease',
            flexShrink: 0
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="Kembali ke Atas"
        >
          <Home size={19} color="#FFFFFF" />
        </button>

        {/* Full Pill Navigation Links */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '2px solid #DA362A',
            borderRadius: 999,
            padding: '4px 6px',
            background: '#FCF4ED',
            boxShadow: '0 6px 20px rgba(218, 54, 42, 0.15)'
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
              whiteSpace: 'nowrap'
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
              whiteSpace: 'nowrap'
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
              whiteSpace: 'nowrap'
            }}
          >
            {user ? 'Dashboard' : 'Mulai'}
          </button>
        </div>
      </div>

      {/* --- MOBILE & TABLET HAMBURGER BUTTONS GROUP (Pointers to TOP RIGHT CORNER <= 1024px, NO background pill) --- */}
      <div 
        className="hamburger-nav-group"
        style={{
          position: 'fixed',
          top: 20,
          right: 24,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        {/* Standalone Red Home Button */}
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
            color: '#FFFFFF'
          }}
          title="Ke Atas"
        >
          <Home size={19} color="#FFFFFF" />
        </button>

        {/* Standalone Red Hamburger Button */}
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
            color: '#FFFFFF'
          }}
          title="Menu Navigasi"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Smooth Dropdown Overlay Menu Sliding Below Top-Right Buttons */}
        {isMobileMenuOpen && (
          <div style={{
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
            animation: 'fadeIn 0.2s ease-out'
          }}>
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
                cursor: 'pointer'
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
                cursor: 'pointer'
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
                boxShadow: '0 4px 12px rgba(218, 54, 42, 0.3)'
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
          position: 'relative'
        }}
      >
        {/* HERO GRID: On Desktop (>1024px) Image on RIGHT (order: 2), Text on LEFT (order: 1). On Mobile & Tablet (<=1024px) Image on TOP (order: 1), Text BELOW (order: 2). */}
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
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Hero Text Column */}
          <div className="hero-text-col" style={{ zIndex: 2 }}>
            <h1 className="font-jockey" style={{
              fontSize: 'clamp(34px, 4.8vw, 60px)',
              lineHeight: 1.08,
              fontWeight: 900,
              color: '#1E1E1E',
              margin: '0 0 20px 0',
              letterSpacing: '0.01em'
            }}>
              Navigasi transportasi<br />
              publik, <span style={{ color: '#DA362A' }}>tanpa ribet.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(14px, 1.4vw, 16px)',
              lineHeight: 1.65,
              color: '#4A4A4A',
              marginBottom: 32,
              maxWidth: 540
            }}>
              <strong style={{ color: '#DA362A' }}>RUTEIN</strong> membantu kamu merencanakan perjalanan dengan transportasi publik berdasarkan waktu, biaya, dan preferensi perjalanan, lalu memandumu secara real-time sampai tujuan.
            </p>

            {/* Main Action Button */}
            <div style={{ marginBottom: 36 }}>
              <button 
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
                  transition: 'transform 0.15s ease, background-color 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#C22B20')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#DA362A')}
              >
                Mulai Perjalanan
              </button>
            </div>

            {/* Transport Modes Cards */}
            <div className="transport-cards-row" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16
            }}>
              {/* Bus */}
              <div style={{
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <img src={busSvg} alt="Bus" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>Bus</span>
              </div>

              {/* MRT */}
              <div style={{
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <img src={mrtSvg} alt="MRT" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>MRT</span>
              </div>

              {/* KRL */}
              <div style={{
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <img src={krlSvg} alt="KRL" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>KRL</span>
              </div>

              {/* Jalan Kaki */}
              <div style={{
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <img src={jalanKakiSvg} alt="Jalan Kaki" style={{ height: 28, width: 28, objectFit: 'contain' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A' }}>Jalan Kaki</span>
              </div>
            </div>

            {/* Tagline note with Star */}
            <div className="tagline-star-row" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666666' }}>
              <img src={bintangSvg} alt="Star" style={{ width: 14, height: 14 }} />
              <span>Satu tujuan. <strong>Banyak cara</strong> untuk sampai.</span>
            </div>

          </div>

        </div>
      </section>

      {/* --- REL LINE ILLUSTRATION 1 --- */}
      <div style={{ 
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        marginTop: 40,
        marginBottom: 60,
        overflow: 'hidden',
        lineHeight: 0
      }}>
        <img 
          src={relSvg} 
          alt="Rel Ilustrasi" 
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            minWidth: '100vw'
          }} 
        />
      </div>

      {/* --- SECTION 2: KAMI MUDAHKAN PERJALANANMU! --- */}
      <section id="tentang" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '20px 40px 80px'
      }}>
        {/* Header Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
          marginBottom: 48
        }}>
          {/* Big Red Location Pin (location.svg) + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img 
              src={locationSvg} 
              alt="Location Pin" 
              style={{ height: 68, width: 'auto', objectFit: 'contain' }} 
            />
            <h2 className="font-jockey" style={{
              fontSize: 'clamp(32px, 4.2vw, 52px)',
              lineHeight: 1.05,
              fontWeight: 900,
              color: '#1E1E1E',
              margin: 0
            }}>
              Kami mudahkan<br />
              <span style={{ color: '#DA362A' }}>perjalananmu!</span>
            </h2>
          </div>

          {/* 5K+ Stats Card Badge */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E5D5C5',
            borderRadius: 16,
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#FDF0ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6
            }}>
              <img src={locationSvg} alt="Pin" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
            </div>
            <div>
              <div className="font-jockey" style={{ fontSize: 32, color: '#DA362A', lineHeight: 1 }}>5K+</div>
              <div style={{ fontSize: 13, color: '#555555', fontWeight: 700, fontFamily: 'var(--font-inter)' }}>
                Rute Transportasi<br />Terhubung
              </div>
            </div>
          </div>
        </div>

        {/* 3 Cards Grid (Tentang 1, 2, 3 - On Tablet: Row 1 has 2 cards, Row 2 has 1 card centered!) */}
        <div className="tentang-cards-grid">
          {/* Card 1: Transit Lebih Mudah */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E5D5C5',
            borderRadius: 20,
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <img 
                src={tentang1Svg} 
                alt="Transit Lebih Mudah" 
                style={{ width: '100%', maxHeight: 170, objectFit: 'contain' }} 
              />
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <h3 className="font-jockey" style={{ fontSize: 24, color: '#1E1E1E', margin: '0 0 10px 0' }}>
                Transit lebih mudah
              </h3>
              <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                Gabungkan beberapa moda transportasi<br />publik dalam satu perjalanan
              </p>
            </div>
          </div>

          {/* Card 2: Bandingkan Sebelum Berangkat */}
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #DA362A',
            borderRadius: 20,
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(218, 54, 42, 0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <img 
                src={tentang2Svg} 
                alt="Bandingkan Sebelum Berangkat" 
                style={{ width: '100%', maxHeight: 170, objectFit: 'contain' }} 
              />
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <h3 className="font-jockey" style={{ fontSize: 24, color: '#1E1E1E', margin: '0 0 10px 0' }}>
                Bandingkan sebelum<br />berangkat
              </h3>
              <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                Lihat waktu, biaya, dan jumlah transit<br />sebelum memilih perjalanan
              </p>
            </div>
          </div>

          {/* Card 3: Tahu Kondisi Perjalanan (SINGLE LINE TITLE & Centered on Tablet Row 2) */}
          <div 
            className="tentang-card-3"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 20,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <img 
                src={tentang3Svg} 
                alt="Tahu Kondisi Perjalanan" 
                style={{ width: '100%', maxHeight: 170, objectFit: 'contain' }} 
              />
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              {/* Single line title as requested: "one line saja foto nomor 1" */}
              <h3 className="font-jockey" style={{ fontSize: 24, color: '#1E1E1E', margin: '0 0 10px 0', whiteSpace: 'nowrap' }}>
                Tahu Kondisi Perjalanan
              </h3>
              <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                Pantau jadwal dan informasi perjalanan<br />sebelum kamu berangkat
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 3: CARA KERJA & FOOTER CALLOUT --- */}
      <section id="cara-kerja" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '40px 40px 60px'
      }}>
        {/* Timeline Container (Desktop Horizontal SVG vs Mobile Vertical Stack) */}
        <div style={{ maxWidth: 1080, margin: '0 auto 90px', position: 'relative' }}>
          
          {/* DESKTOP HORIZONTAL TIMELINE (> 1024px) */}
          <div className="cara-kerja-desktop">
            {/* 1. TITLES ABOVE THE RED RAIL LINE */}
            <div style={{
              position: 'relative',
              height: 95,
              marginBottom: 0
            }}>
              {/* Title 1 */}
              <div style={{ 
                position: 'absolute', 
                left: '-60px', 
                bottom: 8, 
                width: 300, 
                textAlign: 'center' 
              }}>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 26, margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  Masukkan Tujuan
                </h4>
              </div>

              {/* Title 2 */}
              <div style={{ 
                position: 'absolute', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                top: 0, 
                width: 380, 
                textAlign: 'center' 
              }}>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 26, margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  RUTEIN carikan pilihan<br />perjalanan
                </h4>
              </div>

              {/* Title 3 */}
              <div style={{ 
                position: 'absolute', 
                right: '-60px', 
                bottom: 8, 
                width: 300, 
                textAlign: 'center' 
              }}>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 26, margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
                  Pilih dan mulai<br />perjalanan
                </h4>
              </div>
            </div>

            {/* 2. SVG RED RAIL LINE GRAPHIC */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '0' }}>
              <img 
                src={caraKerjaSvg} 
                alt="Cara Kerja Timeline" 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
            </div>

            {/* 3. PARAGRAPHS BELOW THE RED RAIL LINE */}
            <div style={{
              position: 'relative',
              height: 125,
              marginTop: 18
            }}>
              {/* Paragraph 1 */}
              <div style={{ 
                position: 'absolute', 
                left: '-60px', 
                top: 0, 
                width: 300, 
                textAlign: 'center' 
              }}>
                <p style={{ fontSize: 17, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                  Pilih lokasi awal dan<br />tujuan akhir kamu
                </p>
              </div>

              {/* Paragraph 2 */}
              <div style={{ 
                position: 'absolute', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                top: 0, 
                width: 380, 
                textAlign: 'center' 
              }}>
                <p style={{ fontSize: 17, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                  Kami hitung rute terbaik<br />
                  berdasarkan waktu, biaya,<br />
                  transit, dan kondisi live
                </p>
              </div>

              {/* Paragraph 3 */}
              <div style={{ 
                position: 'absolute', 
                right: '-60px', 
                top: 0, 
                width: 300, 
                textAlign: 'center' 
              }}>
                <p style={{ fontSize: 17, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                  Pilih rute favoritmu dan<br />
                  berangkat dengan<br />
                  percaya diri
                </p>
              </div>
            </div>
          </div>

          {/* MOBILE & TABLET VERTICAL STEP CARDS (<= 1024px) */}
          <div className="cara-kerja-mobile" style={{ display: 'none', flexDirection: 'column', gap: 18 }}>
            {/* Step 1 */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div className="font-jockey" style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#DA362A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0
              }}>1</div>
              <div>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 20, margin: '0 0 4px 0' }}>Masukkan Tujuan</h4>
                <p style={{ fontSize: 14, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontFamily: 'var(--font-inter)' }}>Pilih lokasi awal dan tujuan akhir kamu</p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div className="font-jockey" style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#DA362A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0
              }}>2</div>
              <div>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 20, margin: '0 0 4px 0' }}>RUTEIN carikan pilihan perjalanan</h4>
                <p style={{ fontSize: 14, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontFamily: 'var(--font-inter)' }}>Kami hitung rute terbaik berdasarkan waktu, biaya, transit, dan kondisi live</p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5D5C5',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div className="font-jockey" style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#DA362A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0
              }}>3</div>
              <div>
                <h4 className="font-jockey" style={{ color: '#DA362A', fontSize: 20, margin: '0 0 4px 0' }}>Pilih dan mulai perjalanan</h4>
                <p style={{ fontSize: 14, color: '#4A4A4A', margin: 0, lineHeight: 1.45, fontFamily: 'var(--font-inter)' }}>Pilih rute favoritmu dan berangkat dengan percaya diri</p>
              </div>
            </div>
          </div>

        </div>

        {/* Giant Footer Callout Heading & Bird (Responsive Flex Layout) */}
        <div style={{ textAlign: 'center', padding: '20px 0 50px' }}>
          
          {/* Line 1: Bird + Rutein */}
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

          {/* Line 2: perjalananmu + Train People */}
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

          {/* Line 3: bintang.svg + biar gampang. */}
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

          {/* Red Action Button */}
          <div style={{ marginTop: 36 }}>
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="font-jockey"
              style={{
                background: '#DA362A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 14,
                padding: '16px 72px',
                fontSize: 24,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(218, 54, 42, 0.35)',
                transition: 'transform 0.15s ease, background-color 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#C22B20')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#DA362A')}
            >
              Mulai
            </button>
          </div>
        </div>
      </section>

      {/* --- BOTTOM EDGE TO EDGE REL LINE --- */}
      <div style={{ 
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        marginTop: 20,
        overflow: 'hidden',
        lineHeight: 0
      }}>
        <img 
          src={relBawahSvg} 
          alt="Rel Bawah Ilustrasi" 
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            minWidth: '100vw'
          }} 
        />
      </div>

      {/* --- FOOTER SECTION --- */}
      <footer style={{
        background: '#FCF4ED',
        color: '#1E1E1E',
        padding: '50px 40px 30px',
        maxWidth: 1280,
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40,
          alignItems: 'flex-start',
          marginBottom: 44
        }}>
          {/* Column 1: Logo & Tagline */}
          <div>
            <img src={logoRuteinSvg} alt="Rutein Logo" style={{ height: 38, objectFit: 'contain', marginBottom: 14 }} />
            <p style={{ fontSize: 13, color: '#555555', margin: 0, lineHeight: 1.55, fontFamily: 'var(--font-inter)' }}>
              Temukan rute. Pilih perjalanan.<br />
              Sampai tujuan
            </p>
          </div>

          {/* Column 2: Quick Links (Smooth Scroll & Route Navigation) */}
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
                textAlign: 'left'
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
              {/* Instagram SVG */}
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Instagram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              {/* Facebook SVG */}
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Facebook">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              {/* TikTok SVG */}
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 1 1-2.896-2.896c.244 0 .484.03.714.088V9.387a6.34 6.34 0 1 0 5.627 6.285V8.636a8.216 8.216 0 0 0 4.77 1.495V6.686z"/>
                </svg>
              </a>
              {/* X / Twitter SVG */}
              <a href="#" style={{ color: '#1E1E1E', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="X">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 4: Newsletter Form */}
          <div>
            <h4 className="font-jockey" style={{ fontSize: 18, color: '#1E1E1E', margin: '0 0 14px 0', letterSpacing: '0.02em' }}>
              Dapatkan Informasi Perjalanan Terbaru !
            </h4>
            <form onSubmit={(e) => { e.preventDefault(); alert('Terima kasih sudah mendaftar!'); }} style={{ display: 'flex', maxWidth: 360 }}>
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
                  fontFamily: 'var(--font-inter)'
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
                  justifyContent: 'center'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Divider & Copyright with literal © copyright symbol */}
        <div style={{
          borderTop: '1px solid #E5D5C5',
          paddingTop: 20,
          textAlign: 'center',
          fontSize: 13,
          color: '#666666',
          fontFamily: 'var(--font-inter)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E1E1E' }}>©</span>
          <span style={{ fontWeight: 600, color: '#1E1E1E' }}>2026 RUTEIN</span>
        </div>
      </footer>

    </div>
  );
}
