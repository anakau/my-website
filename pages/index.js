// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [candles, setCandles] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [modal, setModal] = useState({ open: false, index: null, id: null, text: '' });
  const [hovered, setHovered] = useState({ visible: false, x: 0, y: 0, text: '' });
  const containerRef = useRef(null);

  // Load recent candles
  useEffect(() => {
    (async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) setCandles(data);
    })();
  }, []);

  // Place a new candle
  const handleScreenClick = async (e) => {
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
    if (!error && Array.isArray(data)) {
      setCandles(prev => [...prev, ...data]);
    }
  };

  // Open & submit modal
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
      {/* scrollable 2D world */}
      <div
        ref={containerRef}
        onClick={handleScreenClick}
        style={{
          width: '100vw',
          height: '100vh',
          overflowX: 'auto',
          overflowY: 'auto',
          backgroundColor: '#fff',
          position: 'relative'
        }}
      >
        {/* large canvas */}
        <div style={{ width: 3000, height: 2000, position: 'relative' }}>
          {candles.map((c, i) => (
            <div
              key={c.id}
              onClick={e => { e.stopPropagation(); openModal(i, c.id); }}
              onMouseEnter={() => c.note && setHovered({ visible: true, x: c.x, y: c.y, text: c.note })}
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

          {/* tooltip */}
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

      {/* fixed central candle */}
      <div
        onClick={e => { e.stopPropagation(); setIsPlacing(true); }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <img src="/candle.gif" alt="" style={{ height: 120, width: 'auto' }} />
        <p style={{ margin: '8px 0 0', color: '#333' }}>
          Click to light your candle,<br/>
          place it anywhere in this world,<br/>
          write a note.
        </p>
      </div>

      {/* letter modal */}
      {modal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20
          }}
        >
          <div style={{
            background: '#fff',
            padding: 20,
            borderRadius: 8,
            width: '90%',
            maxWidth: 400
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
    </>
  );
}