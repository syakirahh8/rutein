import React, { useEffect, useRef, useState } from 'react';
import { debounce, searchPlaces } from '@/services/geocodingService';
import type { PlaceResult } from '@/types/domain.types';

interface Props {
  placeholder?: string;
  value?: string;
  variant?: 'light' | 'dark';
  onSelect: (place: PlaceResult) => void;
}

export default function PlaceSearchInput({ placeholder = 'Search a place…', value, variant = 'light', onSelect }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useRef(
    debounce(async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchPlaces(q);
        setResults(res);
        setOpen(true);
      } catch (err) {
        setError('Pencarian gagal. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    }, 450)
  ).current;

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      debouncedSearch(query);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query]);

  const isLight = variant === 'light';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: isLight ? '#FDF0ED' : 'var(--color-surface-raised)',
          border: isLight ? '1.5px solid #E5D5C5' : '1px solid var(--color-border)',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 600,
          color: isLight ? '#1E1E1E' : 'var(--color-text)',
          outline: 'none',
          fontFamily: 'var(--font-inter)',
          transition: 'all 0.15s ease',
          boxShadow: isLight ? 'inset 0 1px 2px rgba(0,0,0,0.02)' : 'none',
        }}
      />
      {loading && (
        <span style={{ position: 'absolute', right: 14, top: 12, fontSize: 13, color: isLight ? '#888888' : 'var(--color-text-muted)' }}>
          …
        </span>
      )}
      {open && (results.length > 0 || error) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            background: isLight ? '#FFFFFF' : 'var(--color-surface-raised)',
            border: isLight ? '1.5px solid #E5D5C5' : '1px solid var(--color-border)',
            borderRadius: 14,
            boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.1)' : 'var(--shadow-card)',
            zIndex: 50,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {error && <div style={{ padding: 12, color: '#DA362A', fontSize: 13 }}>{error}</div>}
          {results.map((r) => (
            <button
              key={r.placeId ?? `${r.lat},${r.lng}`}
              type="button"
              onMouseDown={() => {
                setQuery(r.label);
                setOpen(false);
                onSelect(r);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '11px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: isLight ? '1px solid #F0E2D5' : '1px solid var(--color-border)',
                color: isLight ? '#1E1E1E' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: isLight ? '#1E1E1E' : 'var(--color-text)' }}>{r.label}</div>
              <div style={{ fontSize: 12, color: isLight ? '#666666' : 'var(--color-text-muted)' }}>{r.address}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}