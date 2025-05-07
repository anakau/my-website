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

  // 1) Load last‑24h candles
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

  // 2) Center the scrollable container on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Wait a tick for layout
    requestAnimationFrame(() => {
      const centerX = (el.scrollWidth - el.clientWidth) / 2;
      const centerY = (el.scrollHeight - el.clientHeight) / 2;
      el.scrollLeft = centerX;
      el.scrollTop  = centerY;
    });
  }, [containerRef.current]);

  // Place a new candle
  const handleScreenClick = async e => {
    if (!isPlacing) return setIsPlacing(false);
    setIsPlacing(false);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top  + containerRef.current.scrollTop;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '' }])
      .select();
    if (!error && Array.isArray(data)) {
      setCandles(prev => [...prev, ...data]);
    }
  };

  // Open & submit letter modal
  const openModal = (idx, id) =>
    setModal({ open: true, index: idx, id, text: candles[idx].note || '' });

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
        {/* Noto Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Light a Candle . space */}
      <button
        onClick={() => setShowInfo(v => !v)}
        style={{
          position: 'fixed', top: 12, left: 12,
          width: 160, padding: '10px 0',
          background: '#fff', color: '#d2691e',
          border: 'none', textDecoration: 'underline',
          cursor: 'pointer', zIndex: 101,
          fontFamily: 'Noto Sans, sans-serif', fontSize: '1rem'
        }}
      >
        light a candle . space
      </button>

      {/* Info pop‑over */}
      {showInfo && (
        <div style={{ position: 'fixed', top: 48, left: 12, zIndex: 100 }}>
          <div
            onClick={() => setShowInfo(false)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', padding: 18, borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: 300,
              fontFamily: 'Noto Sans, sans-serif', fontSize: '0.95rem',
              lineHeight: 1.4, color: '#333'
            }}
          >
            <p style={{margin:0}}>
              Prolonged war, deep loss, grief, fear, hope and eternal love. I feel so much every
              day, especially given the state of affairs of the world. This attempt to create a
              digital space for global solidarity by creating a pixel of hope and accessing
              communal power in a small way. Light a Candle is a scream into the void.
            </p>
            <p style={{margin:'12px 0 0', fontSize:'0.8rem', fontWeight:400, color:'#555'}}>
              Created with ❤️ by Anahat Kaur in her little studio apartment in Berlin 🇩🇪
            </p>
            <p style={{margin:'6px 0 0',  fontSize:'0.8rem', fontWeight:400, color:'#555'}}>
              Would not have been possible without ChatGPT
            </p>
          </div>
        </div>
      )}

      {/* Scrollable world */}
      <div
        ref={containerRef}
        onClick={handleScreenClick}
        style={{
          width:'100vw', height:'100vh',
          overflow:'auto', background:'#fff',
          position:'relative', fontFamily:'Noto Sans, sans-serif'
        }}
      >
        <div style={{ width:3000, height:2000, position:'relative' }}>
          {candles.map((c,i) => (
            <div
              key={c.id}
              onClick={e => { e.stopPropagation(); openModal(i,c.id) }}
              onMouseEnter={() => c.note && setHovered({ visible:true, x:c.x, y:c.y, text:c.note })}
              onMouseLeave={() => setHovered(h=>({...h,visible:false}))}
              style={{ position:'absolute', left:c.x, top:c.y, transform:'translate(-50%,-100%)', cursor:'pointer' }}
            >
              <img src="/candle.gif" alt="" style={{height:60,width:'auto'}}/>
            </div>
          ))}
          {hovered.visible && (
            <div
              style={{
                position:'absolute', left:hovered.x+20, top:hovered.y-30,
                background:'rgba(0,0,0,0.75)', color:'#fff',
                padding:'6px 10px', borderRadius:4,
                pointerEvents:'none', maxWidth:140,
                fontSize:13, lineHeight:1.4
              }}
            >
              {hovered.text}
            </div>
          )}
        </div>
      </div>

      {/* Fixed central candle */}
      <div
        onClick={e=>{e.stopPropagation(); setIsPlacing(true)}}
        style={{
          position:'fixed', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          textAlign:'center', cursor:'pointer', zIndex:50
        }}
      >
        <img src="/candle.gif" alt="" style={{height:120,width:'auto'}}/>
        <p style={{
          margin:'10px 0 0', color:'#333',
          fontSize:'0.95rem', lineHeight:1.4
        }}>
          Click to light your candle,<br/>
          place it anywhere in this space,<br/>
          write a note or read one.
        </p>
      </div>

      {/* Letter Modal (calmer, centered on open) */}
      {modal.open && (
        <div
          style={{
            position:'fixed', top:0, left:0,
            width:'100vw', height:'100vh',
            background:'rgba(0,0,0,0.4)', backdropFilter:'blur(3px)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:200
          }}
          onClick={()=>setModal({open:false,index:null,id:null,text:''})}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'relative',
              background:'#fff',
              padding:'40px 48px',
              borderRadius:10,
              width:'90%', maxWidth:480,
              boxShadow:'0 6px 20px rgba(0,0,0,0.1)'
            }}
          >
            {/* Close × */}
            <button
              onClick={()=>setModal({open:false,index:null,id:null,text:''})}
              style={{
                position:'absolute', top:16, right:16,
                width:24, height:24,
                background:'transparent', border:'none',
                fontSize:20, cursor:'pointer', color:'#666'
              }}
            >
              &times;
            </button>

            <h3 style={{
              margin:'0 0 24px',
              fontSize:'1.3rem',
              fontWeight:400,
              lineHeight:1.3,
              color:'#333'
            }}>
              Write anything you want to share with the world or let go.
            </h3>
            <p style={{
              margin:'0 0 32px',
              fontSize:'0.95rem',
              lineHeight:1.5,
              color:'#555'
            }}>
              This letter cannot be deleted once you share it.
            </p>

            <textarea
              value={modal.text}
              onChange={e=>{
                const t=e.target.value.slice(0,200);
                setModal(m=>({...m,text:t}));
              }}
              rows={6}
              placeholder="Your message…"
              style={{
                width:'100%',
                padding:'16px',
                fontSize:15,
                border:'1px solid #eee',
                borderRadius:6,
                backgroundColor:'#f9f9f9',
                resize:'vertical',
                marginBottom:32,
                lineHeight:1.5
              }}
            />
            <div style={{
              textAlign:'right',
              fontSize:13,
              color:'#888',
              marginBottom:32
            }}>
              {modal.text.length}/200
            </div>

            <button
              onClick={handleModalSubmit}
              style={{
                padding:'10px 18px',
                background:'#fff',
                color:'#d2691e',
                border:'1px solid #d2691e',
                borderRadius:6,
                cursor:'pointer',
                fontSize:14,
                float:'right'
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