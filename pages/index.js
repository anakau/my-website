// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

// Minimal list—add more country codes/names as desired
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
];

// Convert "US" → 🇺🇸
function flagEmoji(cc) {
  return cc
    .toUpperCase()
    .replace(/./g, char =>
      String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0))
    );
}

export default function Home() {
  const [candles, setCandles] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    index: null,
    id: null,
    text: '',
    country: '',
  });
  const [hovered, setHovered] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    date: '',
    country: '',
  });
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef(null);

  // Fetch all candles
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) setCandles(data);
    })();
  }, []);

  // Center the scrollable canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    });
  }, []);

  // Place a new candle
  const handleScreenClick = async (e) => {
    if (!isPlacing) return setIsPlacing(false);
    setIsPlacing(false);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '', country_code: '' }])
      .select();
    if (!error && Array.isArray(data)) {
      setCandles((prev) => [...prev, ...data]);
    }
  };

  // Open modal and preload text & country
  const openModal = (index, id) => {
    const c = candles[index];
    setModal({
      open: true,
      index,
      id,
      text: c.note || '',
      country: c.country_code || '',
    });
  };

  // Submit text + country
  const handleModalSubmit = async () => {
    const { index, id, text, country } = modal;
    // Optimistic UI
    setCandles((prev) => {
      const cp = [...prev];
      cp[index].note = text;
      cp[index].country_code = country;
      return cp;
    });
    // Persist
    await supabase
      .from('candles')
      .update({ note: text, country_code: country })
      .eq('id', id);
    setModal({ open: false, index: null, id: null, text: '', country: '' });
  };

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Info button */}
      <button
        onClick={() => setShowInfo((v) => !v)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          width: 160,
          padding: '10px 0',
          background: '#fff',
          color: '#d2691e',
          border: 'none',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontFamily: 'Noto Sans, sans-serif',
          fontSize: '1rem',
          zIndex: 101,
        }}
      >
        light a candle . space
      </button>

      {/* Info pop‑over */}
      {showInfo && (
        <div style={{ position: 'fixed', top: 48, left: 12, zIndex: 100 }}>
          <div
            onClick={() => setShowInfo(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 18,
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              width: 300,
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '0.95rem',
              lineHeight: 1.4,
              color: '#333',
            }}
          >
            <p style={{ margin: 0 }}>
              Prolonged war, deep loss, grief, fear, hope and eternal love. I feel
              so much every day, especially given the state of affairs of the
              world. This is an attempt to create a digital space for global
              solidarity and accessing communal power in a small way. Light a
              Candle is a scream into the void.
            </p>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: '0.8rem',
                color: '#555',
              }}
            >
              Created with ❤️ by Anahat Kaur
              <br />
              2025 Berlin
            </p>
          </div>
        </div>
      )}

      {/* Scrollable world */}
      <div
        ref={containerRef}
        onClick={handleScreenClick}
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          background: '#fff',
          position: 'relative',
          fontFamily: 'Noto Sans, sans-serif',
        }}
      >
        <div style={{ width: 3000, height: 2000, position: 'relative' }}>
          {candles.map((c, i) => (
            <div
              key={c.id}
              onClick={(e) => {
                e.stopPropagation();
                openModal(i, c.id);
              }}
              onMouseEnter={() =>
                c.note &&
                setHovered({
                  visible: true,
                  x: c.x,
                  y: c.y,
                  text: c.note,
                  date: new Date(c.created_at).toLocaleString(),
                  country: c.country_code,
                })
              }
              onMouseLeave={() =>
                setHovered((h) => ({ ...h, visible: false }))
              }
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                transform: 'translate(-50%, -100%)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <img
                src="/candle.gif"
                alt=""
                style={{ height: 60, width: 'auto' }}
              />
              {c.country_code && (
                <div style={{ fontSize: 18, marginTop: 4 }}>
                  {flagEmoji(c.country_code)}
                </div>
              )}
            </div>
          ))}

          {/* Tooltip */}
          {hovered.visible && (
            <div
              style={{
                position: 'absolute',
                left: hovered.x + 20,
                top: hovered.y - 30,
                background: '#f9f5f0',
                color: '#5a3e2b',
                padding: '12px 16px',
                borderRadius: 6,
                pointerEvents: 'none',
                maxWidth: 200,
                fontSize: 14,
                lineHeight: 1.6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ marginBottom: 8 }}>{hovered.text}</div>
              {hovered.country && (
                <div style={{ fontSize: 16 }}>{flagEmoji(hovered.country)}</div>
              )}
              <div style={{ fontSize: 12, color: '#7f5d4b' }}>
                {hovered.date}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Central candle + sunburst */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsPlacing(true);
        }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          cursor: 'pointer',
          zIndex: 50,
        }}
      >
        {/* ... your existing sunburst + central candle code ... */}
      </div>

      {/* Letter Modal */}
      {modal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() =>
            setModal({ open: false, index: null, id: null, text: '' })
          }
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: '#fff',
              padding: '40px 48px',
              borderRadius: 10,
              width: '90%',
              maxWidth: 480,
              boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
            }}
          >
            <button
              onClick={() =>
                setModal({ open: false, index: null, id: null, text: '' })
              }
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 24,
                height: 24,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#666',
              }}
            >
              &times;
            </button>

            <label
              style={{
                display: 'block',
                marginBottom: 12,
                fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              Your country:
              <select
                value={modal.country}
                onChange={(e) =>
                  setModal((m) => ({ ...m, country: e.target.value }))
                }
                style={{
                  marginLeft: 8,
                  padding: '4px 8px',
                  fontFamily: 'Noto Sans, sans-serif',
                }}
              >
                <option value="">— pick —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {flagEmoji(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </label>

            <h3
              style={{
                margin: '0 0 16px',
                fontSize: '1.3rem',
                fontWeight: 400,
                lineHeight: 1.3,
                color: '#333',
                fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              Write your letter
            </h3>
            <textarea
              value={modal.text}
              onChange={(e) => {
                const t = e.target.value.slice(0, 200);
                setModal((m) => ({ ...m, text: t }));
              }}
              rows={4}
              placeholder="Your message…"
              style={{
                width: '100%',
                padding: 12,
                fontSize: 14,
                border: '1px solid #eee',
                borderRadius: 6,
                backgroundColor: '#f9f9f9',
                color: '#000',
                resize: 'vertical',
                marginBottom: 16,
                fontFamily: 'Noto Sans, sans-serif',
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: 12,
                color: '#888',
                marginBottom: 24,
              }}
            >
              {modal.text.length}/200
            </div>

            <button
              onClick={handleModalSubmit}
              style={{
                padding: '10px 18px',
                background: '#fff',
                color: '#d2691e',
                border: '1px solid #d2691e',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                float: 'right',
                fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              Share Letter
            </button>
          </div>
        </div>
      )}
    </>
  );
}