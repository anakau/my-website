import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [candles, setCandles] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [modal, setModal] = useState({ open: false, index: null, id: null, text: '' });
  const [hovered, setHovered] = useState({ visible: false, x: 0, y: 0, text: '' });

  // 1) Fetch only user-placed candles from the last 24 hours
  useEffect(() => {
    (async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) setCandles(data);
      else if (error) console.error('Fetch error:', error);
    })();
  }, []);

  // Open the letter modal
  const openModal = (idx, id) => {
    setModal({ open: true, index: idx, id, text: candles[idx].note || '' });
  };

  // Submit a letter
  const handleModalSubmit = async () => {
    const { index, id, text } = modal;
    // Optimistic UI update
    setCandles(prev => {
      const copy = [...prev];
      copy[index].note = text;
      return copy;
    });
    // Persist
    const { error } = await supabase.from('candles').update({ note: text }).eq('id', id);
    if (error) console.error('Update error:', error);
    setModal({ open: false, index: null, id: null, text: '' });
  };

  // Place a new candle on click
  const handleScreenClick = async e => {
    if (!isPlacing) return;
    setIsPlacing(false);
    const x = e.clientX;
    const y = e.clientY;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '' }])
      .select();
    if (!error && Array.isArray(data)) setCandles(prev => [...prev, ...data]);
    else if (error) console.error('Insert error:', error);
  };

  return (
    <div
      onClick={handleScreenClick}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
        cursor: isPlacing ? 'crosshair' : 'default',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Central Candle (always visible) */}
      <div
        onClick={e => {
          e.stopPropagation();
          setIsPlacing(true);
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <img
          src="/candle.gif"
          alt="Main Candle"
          style={{ height: '120px', width: 'auto' }}
        />
        <p>click to light your candle, place it and write a note </p>
      </div>

      {/* User-Placed Candles */}
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
          onMouseLeave={() =>
            hovered.visible && setHovered(h => ({ ...h, visible: false }))
          }
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <img
            src="/candle.gif"
            alt="User Candle"
            style={{ height: '60px', width: 'auto' }}
          />
        </div>
      ))}

      {/* Hover Tooltip */}
      {hovered.visible && (
        <div
          style={{
            position: 'absolute',
            left: hovered.x + 30,
            top: hovered.y - 30,
            backgroundColor: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            pointerEvents: 'none',
            maxWidth: 120,
            fontSize: 12,
            wordWrap: 'break-word',
          }}
        >
          {hovered.text}
        </div>
      )}

      {/* Letter Modal */}
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
            zIndex: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              width: '90%',
              maxWidth: 400,
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Write your letter</h3>
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
                padding: 8,
                fontSize: 14,
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: 12,
                color: '#666',
                marginTop: 4,
              }}
            >
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
    </div>
  );
}