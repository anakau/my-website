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

  // Load recent candles
  useEffect(() => {
    (async () => {
      const cutoff = new Date(Date.now() - 24*60*60*1000).toISOString();
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) setCandles(data);
    })();
  }, []);

  // Place a new candle
  const handleScreenClick = async e => {
    if (!isPlacing) return;
    setIsPlacing(false);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '' }])
      .select();
    if (!error && Array.isArray(data)) setCandles(prev => [...prev, ...data]);
  };

  // Modal open/submit
  const openModal = (idx, id) => {
    setModal({ open: true, index: idx, id, text: candles[idx].note || '' });
  };
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
        {/* Google Font: Oooh Baby */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oooh+Baby&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Light a Candle Info Button */}
      <button
        className="oooh-baby"
        onClick={() => setShowInfo(true)}
        style={{
          position: 'fixed', top: 12, left: 12,
          padding: '8px 12px',
          backgroundColor: '#d2691e',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          zIndex: 30,
        }}
      >
        Light a Candle
      </button>

      {/* Info Modal */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 40
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              width: '90%',
              maxWidth: 400,
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
          >
            <h2 className="oooh-baby" style={{ marginTop: 0 }}>About This Project</h2>
            <p>
              This is a communal candle‐lighting web app built with Next.js and Supabase.
              Place virtual candles across an infinite canvas and share your messages.
            </p>
            <p style={{ fontStyle: 'italic', marginTop: 12 }}>
              © 2025 Anahat Kaur
            </p>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  backgroundColor: '#eee',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable 2D world */}
      <div
        ref={containerRef}
        onClick={handleScreenClick}
        style={{
          width: '100vw', height: '100vh',
          overflowX: 'auto', overflowY: 'auto',
          backgroundColor: '#fff', position: 'relative'
        }}
      >
        <div style={{ width: 3000, height: 2000, position: 'relative' }}>
          {candles.map((c, i) => (
            <div
              key={c.id}
              onClick={e => { e.stopPropagation(); openModal(i, c.id); }}
              onMouseEnter={() =>
                c.note && setHovered({ visible: true, x: c.x, y: c.y, text: c.note })
              }
              onMouseLeave={() => setHovered(h => ({ ...h, visible: false }))}
              style={{
                position: 'absolute',
                left: c.x, top: c.y,
                transform: 'translate(-50%, -100%)',
                cursor: 'pointer'
              }}
            >
              <img src="/candle.gif" alt="" style={{ height: 60, width: 'auto' }} />
            </div>
          ))}

          {/* Tooltip */}
          {hovered.visible && (
            <div
              style={{
                position: 'absolute',
                left: hovered.x + 20,
                top: hovered.y - 30,
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 4,
                pointerEvents: 'none',
                maxWidth: 120,
                fontSize: 12,
                whiteSpace: 'normal'
              }}
            >
              {hovered.text}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Central Candle */}
      <div
        onClick={e => { e.stopPropagation(); setIsPlacing(true); }}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          cursor: 'pointer',
          zIndex: 20
        }}
      >
        <img src="/candle.gif" alt="" style={{ height: 120, width: 'auto' }} />
        <p style={{ margin: '8px 0 0', color: '#333', fontFamily: 'sans-serif' }}>
          Click to light your candle,<br/>
          place it anywhere in this world,<br/>
          write a note.
        </p>
      </div>

      {/* Letter Modal */}
      {modal.open && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 30
          }}
        >
          <div style={{
            background: '#fff',
            padding: 20,
            borderRadius: 8,
            width: '90%',
            maxWidth: 400,
            fontFamily: 'sans-serif'
          }}>
            <h3 style={{ marginTop: 0 }}>Write your letter</h3>
            <textarea
              value={modal.text}
              onChange={e => {
                const t = e.target.value;
                if (t.length <= 100) setModal(m => ({ ...m, text: t }));
              }}
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: 8, fontSize: 14 }}
            />
            <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: '#666' }}>
              {modal.text.length}/100
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button
                onClick={() => setModal({ open: false, index: null, id: null, text: '' })}
                style={{ marginRight: 8 }}
              >
                Cancel
              </button>
              <button onClick={handleModalSubmit}>Share Letter</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Font Style */}
      <style jsx global>{`
        .oooh-baby {
          font-family: "Oooh Baby", cursive;
          font-weight: 400;
          font-style: normal;
        }
      `}</style>
    </>
  );
}