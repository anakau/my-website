// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { supabase } from '../lib/supabaseClient';

// register English country names
countries.registerLocale(enLocale);
// build [ { code, name }, … ] sorted array
const COUNTRIES = Object.entries(
  countries.getNames('en', { select: 'official' })
)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// "US" → 🇺🇸
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
  const [hover, setHover] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    date: '',
    country: '',
  });
  const [showInfo, setShowInfo] = useState(false);
  const worldRef = useRef(null);

  // fetch all candles (no expiry)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) setCandles(data);
    })();
  }, []);

  // center the scrollable world on mount
  useEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    });
  }, []);

  // place a new candle
  const handleWorldClick = async (e) => {
    if (!isPlacing) return setIsPlacing(false);
    setIsPlacing(false);
    const rect = worldRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + worldRef.current.scrollLeft;
    const y = e.clientY - rect.top + worldRef.current.scrollTop;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '', country_code: '' }])
      .select();
    if (!error && Array.isArray(data)) {
      setCandles((prev) => [...prev, ...data]);
    }
  };

  // open letter modal
  const openModal = (idx, id) => {
    const c = candles[idx];
    setModal({
      open: true,
      index: idx,
      id,
      text: c.note || '',
      country: c.country_code || '',
    });
  };

  // submit letter + country
  const submitModal = async () => {
    const { index, id, text, country } = modal;
    setCandles((prev) => {
      const cp = [...prev];
      cp[index].note = text;
      cp[index].country_code = country;
      return cp;
    });
    await supabase
      .from('candles')
      .update({ note: text, country_code: country })
      .eq('id', id);
    setModal({ open: false, index: null, id: null, text: '', country: '' });
  };

  return (
    <>
      <Head>
        <title>Light a Candle • space</title>
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

      {/* Info Button */}
      <button
        onClick={() => setShowInfo((v) => !v)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          padding: '8px 12px',
          background: '#fff',
          color: '#d2691e',
          border: 'none',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontFamily: 'Noto Sans, sans-serif',
          fontSize: '0.9rem',
          zIndex: 1000,
        }}
      >
        light a candle . space
      </button>

      {/* Info Pop‑over */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 48,
              left: 12,
              background: '#fff',
              padding: 16,
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              width: 300,
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '0.9rem',
              color: '#333',
            }}
          >
            <p style={{ margin: 0 }}>
              Prolonged war, deep loss, grief, fear, hope and eternal love. I feel so
              much every day, especially given the state of affairs of the world.
              This is an attempt to create a digital space for global solidarity and
              accessing communal power in a small way. Light a Candle is a scream
              into the void.
            </p>
            <p
              style={{
                marginTop: 12,
                fontSize: '0.75rem',
                color: '#555',
              }}
            >
              Created with ❤️ by Anahat Kaur<br />
              2025 Berlin
            </p>
          </div>
        </div>
      )}

      {/* Scrollable World */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          background: '#fff',
          position: 'relative',
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
              onMouseEnter={() => {
                if (!c.note) return;
                setHover({
                  visible: true,
                  x: c.x,
                  y: c.y,
                  text: c.note,
                  date: new Date(c.created_at).toLocaleString(),
                  country: c.country_code,
                });
              }}
              onMouseLeave={() =>
                setHover((h) => ({ ...h, visible: false }))
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
                alt="User Candle"
                style={{ height: 60, width: 'auto' }}
              />
              {c.country_code && (
                <div style={{ fontSize: 18, marginTop: 4 }}>
                  {flagEmoji(c.country_code)}
                </div>
              )}
            </div>
          ))}

          {/* Hover Tooltip */}
          {hover.visible && (
            <div
              style={{
                position: 'absolute',
                left: hover.x + 20,
                top: hover.y - 30,
                background: '#f9f5f0',
                color: '#5a3e2b',
                padding: '12px 16px',
                borderRadius: 6,
                pointerEvents: 'none',
                maxWidth: 220,
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: 14,
                lineHeight: 1.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ marginBottom: 6 }}>{hover.text}</div>
              {hover.country && (
                <div style={{ fontSize: 16, marginBottom: 6 }}>
                  {flagEmoji(hover.country)}
                </div>
              )}
              <div style={{ fontSize: 12, opacity: 0.8 }}>{hover.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* Central Candle (Fixed) */}
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
          zIndex: 500,
        }}
      >
        {/* optional SVG sunburst here… */}
        <img
          src="/candle.gif"
          alt="Main Candle"
          style={{ height: 60, width: 'auto', zIndex: 1 }}
        />
        <p
          style={{
            marginTop: 8,
            color: '#333',
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '0.95rem',
            lineHeight: 1.4,
            zIndex: 2,
          }}
        >
          Click to light your candle,
          <br />
          place it anywhere in this space,
          <br />
          write a note or read one.
        </p>
      </div>

      {/* Letter Modal */}
      {modal.open && (
        <div
          onClick={() =>
            setModal({ open: false, index: null, id: null, text: '', country: '' })
          }
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: '32px 40px',
              width: '90%',
              maxWidth: 480,
              boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
              fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            {/* close × */}
            <button
              onClick={() =>
                setModal({ open: false, index: null, id: null, text: '', country: '' })
              }
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#666',
              }}
            >
              &times;
            </button>

            {/* country selector */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              Your country:
              <select
                value={modal.country}
                onChange={(e) =>
                  setModal((m) => ({ ...m, country: e.target.value }))
                }
                style={{
                  marginLeft: 8,
                  padding: '6px 10px',
                  fontFamily: 'inherit',
                }}
              >
                <option value="">— pick —</option>
                {COUNTRIES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {flagEmoji(code)} {name}
                  </option>
                ))}
              </select>
            </label>

            {/* letter heading */}
            <h3
              style={{
                margin: '0 0 12px',
                fontWeight: 400,
                fontSize: '1.2rem',
                color: '#333',
              }}
            >
              Write your letter
            </h3>
            <p
              style={{
                margin: '0 0 24px',
                fontSize: '0.9rem',
                color: '#555',
              }}
            >
              This letter cannot be deleted once you share it.
            </p>

            {/* message textarea */}
            <textarea
              rows={5}
              placeholder="Your message…"
              value={modal.text}
              onChange={(e) => {
                const t = e.target.value.slice(0, 200);
                setModal((m) => ({ ...m, text: t }));
              }}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #eee',
                borderRadius: 6,
                background: '#f9f9f9',
                color: '#000',
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 16,
                resize: 'vertical',
                fontFamily: 'inherit',
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

            {/* share letter */}
            <button
              onClick={submitModal}
              style={{
                padding: '10px 18px',
                background: '#d2691e',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                float: 'right',
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