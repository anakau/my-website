// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [candles, setCandles] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [modal, setModal] = useState({ open: false, index: null, id: null, text: '' });
  const [hovered, setHovered] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef(null);

  // load last-24h candles
  useEffect(() => {
    (async () => {
      const cutoff = new Date(Date.now() - 86400_000).toISOString();
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) setCandles(data);
    })();
  }, []);

  // place a new candle
  const handleScreenClick = async e => {
    if (!isPlacing) return setIsPlacing(false);
    setIsPlacing(false);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '' }])
      .select();
    if (!error && Array.isArray(data)) setCandles(prev => [...prev, ...data]);
  };

  // open & submit note modal
  const openModal = (i, id) =>
    setModal({ open: true, index: i, id, text: candles[i].note || '' });
  const handleModalSubmit = async () => {
    const { index, id, text } = modal;
    setCandles(prev => {
      const copy = [...prev];
      copy[index].note = text;
      return copy;
    });
    await supabase.from('candles').update({ note: text }).eq('id', id);
    setModal({ open: false, index: null, id: null, text: '' });
  };

  return (
    <>
      <Head>
        {/* Noto Sans for global language support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Light a Candle . space button */}
      <button
        onClick={() => setShowInfo(v => !v)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          padding: '10px 0',
          background: '#fff',
          color: '#d2691e',
          border: 'none',
          textDecoration: 'underline',
          cursor: 'pointer',
          zIndex: 101,
          fontFamily: 'Noto Sans, sans-serif',
          fontSize: '1rem',
          width: 160
        }}
      >
        light a candle . space
      </button>

      {/* Info pop-over */}
      {showInfo && (
        <div style={{ position: 'fixed', top: 48, left: 12, zIndex: 100 }}>
          {/* backdrop to close */}
          <div
            onClick={() => setShowInfo(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh'
            }}
          />
          {/* pop-over content */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 18,
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              width: 300,
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '1rem',
              lineHeight: 1.5,
              color: '#333'
            }}
          >
            <p style={{ margin: 0 }}>
              Prolonged war, deep loss, grief, fear, hope and eternal love. I feel
              so much every day, especially given the state of affairs of the world.
              This is an attempt to create a digital space for global solidarity by
              creating a pixel of hope and accessing communal power in a small way.
              Light a Candle is a scream into the void.
            </p>
            <p style={{ margin: '12px 0 0', fontSize: '0.85rem' }}>
              Created with ❤️ by Anahat Kaur in her little apartment in Berlin 🇩🇪
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
              Thanks to ChatGPT to help me code
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
          overflowX: 'auto',
          overflowY: 'auto',
          background: '#fff',
          position: 'relative',
          fontFamily: 'Noto Sans, sans-serif'
        }}
      >
        <div style={{ width: 3000, height: 2000, position: 'relative' }}>
          {candles.map((c, i) => (
            <div
              key={c.id}
              onClick={e => {
                e.stopPropagation();
                openModal(i, c.id);
              }}
              onMouseEnter={() =>
                c.note && setHovered({ visible: true, x: c.x, y: c.y, text: c.note })
              }
              onMouseLeave={() => setHovered(h => ({ ...h, visible: false }))}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                transform: 'translate(-50%, -100%)',
                cursor: 'pointer'
              }}
            >
              <img src="/candle.gif" alt="" style={{ height: 60, width: 'auto' }} />
            </div>
          ))}
          {hovered.visible && (
            <div
              style={{
                position: 'absolute',
                left: hovered.x + 20,
                top: hovered.y - 30,
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 4,
                pointerEvents: 'none',
                maxWidth: 140,
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: 14,
                whiteSpace: 'normal'
              }}
            >
              {hovered.text}
            </div>
          )}
        </div>
      </div>

      {/* Fixed central candle */}
      <div
        onClick={e => {
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
          zIndex: 50
        }}
      >
        <img src="/candle.gif" alt="" style={{ height: 120, width: 'auto' }} />
        <p
          style={{
            margin: '10px 0 0',
            color: '#333',
            fontSize: '1rem',
            lineHeight: 1.5,
            fontFamily: 'Noto Sans, sans-serif'
          }}
        >
          Click to light your candle,
          <br />
          place it anywhere in this space,
          <br />
          write a note or read one.
        </p>
      </div>

      {/* Letter modal */}
      {modal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              width: '90%',
              maxWidth: 420,
              fontFamily: 'Noto Sans, sans-serif'
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Write your letter</h3>
            <textarea
              value={modal.text}
              onChange={e => {
                const t = e.target.value;
                if (t.length <= 100) setModal(m => ({ ...m, text: t }));
              }}
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 10,
                fontSize: 14,
                fontFamily: 'Noto Sans, sans-serif',
                lineHeight: 1.5
              }}
            />
            <div style={{ textAlign: 'right', marginTop: 6, fontSize: 14, color: '#666' }}>
              {modal.text.length}/100
            </div>
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button
                onClick={() => setModal({ open: false, index: null, id: null, text: '' })}
                style={{
                  marginRight: 10,
                  padding: '6px 12px',
                  fontFamily: 'Noto Sans, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                style={{ padding: '6px 12px', fontFamily: 'Noto Sans, sans-serif' }}
              >
                Share Letter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}