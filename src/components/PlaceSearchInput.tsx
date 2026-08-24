import React, { useEffect, useRef, useState } from 'react';
import { debounce, searchPlaces } from '@/services/geocodingService';
import type { PlaceResult } from '@/types/domain.types';

interface Props {
  placeholder?: string;
  value?: string;
  onSelect: (place: PlaceResult) => void;
}

export default function PlaceSearchInput({ placeholder = 'Search a place…', value, onSelect }: Props) {
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
        setError('Search failed. Check your connection.');
      } finally {
        setLoading(false);
      }
    }, 450)
  ).current;

  useEffect(() => {
    if (query.trim().length >= 2) {
      debouncedSearch(query);
    } else {
      setResults([]);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && (
        <span style={{ position: 'absolute', right: 12, top: 11, fontSize: 12, color: 'var(--color-text-muted)' }}>…</span>
      )}
      {open && (results.length > 0 || error) && (
        <div style={dropdown}>
          {error && <div style={{ padding: 10, color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
          {results.map((r) => (
            <button
              key={r.placeId ?? `${r.lat},${r.lng}`}
              type="button"
              style={resultRow}
              onMouseDown={() => {
                setQuery(r.label);
                setOpen(false);
                onSelect(r);
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.address}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const dropdown: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'var(--shadow-card)',
  zIndex: 30,
  maxHeight: 260,
  overflowY: 'auto',
};

const resultRow: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--color-border)',
  color: 'var(--color-text)',
};
