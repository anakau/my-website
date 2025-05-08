// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [candles, setCandles] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [modal, setModal] = useState({ open: false, index: null, id: null, text: '', country: '' });
  const [hover, setHover] = useState({ visible: false, x: 0, y: 0, text: '', date: '' });
  const worldRef = useRef(null);

  // fetch all candles once
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error) setCandles(data);
    })();
  }, []);

  // center the scrollable world
  useEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    });
  }, []);

  // place new candle & immediately open modal
  const handleWorldClick = async (e) => {
    if (!isPlacing) return setIsPlacing(false);
    setIsPlacing(false);
    const rect = worldRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + worldRef.current.scrollLeft;
    const y = e.clientY - rect.top + worldRef.current.scrollTop;

    // remember length before insert
    const prevLen = candles.length;

    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '', country_code: '' }])
      .select();
    if (error || !data) return console.error(error);

    // append and then open modal on that new index
    setCandles((prev) => {
      const next = [...prev, ...data];
      // open the modal on newly inserted candle
      setModal({
        open: true,
        index: prevLen,
        id: data[0].id,
        text: '',
        country: '',
      });
      return next;
    });
  };

  // submit letter (initial only)
  const submitModal = async () => {
    const { index, id, text, country } = modal;
    // optimistic UI
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
      </Head>

      {/* Scrollable world */}
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
              onMouseEnter={() => {
                if (!c.note) return;
                setHover({
                  visible: true,
                  x: c.x,
                  y: c.y,
                  text: c.note,
                  date: new Date(c.created_at).toLocaleString(),
                });
              }}
              onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                transform: 'translate(-50%, -100%)',
                cursor: 'default',
                textAlign: 'center',
              }}
            >
              <img src="/candle.gif" style={{ height: 60, width: 'auto' }} />
            </div>
          ))}

          {/* Hover tooltip */}
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
                maxWidth: 200,
                fontFamily: 'sans-serif',
                fontSize: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ marginBottom: 6 }}>{hover.text}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{hover.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* Central candle (fixed) */}
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
        <img src="/candle.gif" style={{ height: 60, width: 'auto' }} />
        <p style={{ marginTop: 8, color: '#333', fontFamily: 'sans-serif' }}>
          Click to light your candle,<br />
          place it anywhere in this space,<br />
          write a note or read one.
        </p>
      </div>

      {/* Modal only for new placements */}
      {modal.open && (
        <div
          onClick={() => setModal({ open: false, index: null, id: null, text: '', country: '' })}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
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
              padding: '24px',
              width: '90%',
              maxWidth: 400,
              fontFamily: 'sans-serif',
            }}
          >
            <h3 style={{ margin: '0 0 12px' }}>Write your letter</h3>

            {/* Country dropdown (optional) */}
            <select
              value={modal.country}
              onChange={(e) => setModal((m) => ({ ...m, country: e.target.value }))}
              style={{ marginBottom: 16, width: '100%', padding: 8 }}
            >
              <option value="">— Select country —</option>
              {/* hard‑coded or generated list here */}
            </select>

            <textarea
              rows={4}
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
                marginBottom: 12,
                resize: 'vertical',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 12, marginBottom: 16 }}>
              {modal.text.length}/200
            </div>
            <button
              onClick={submitModal}
              style={{
                float: 'right',
                padding: '8px 16px',
                background: '#d2691e',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
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