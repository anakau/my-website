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
      const cutoff = new Date(Date.now() - 24*60*60*1000).toISOString();
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
    if (!isPlacing) return;
    setIsPlacing(false);
    const box = containerRef.current.getBoundingClientRect();
    const x = e.clientX - box.left + containerRef.current.scrollLeft;
    const y = e.clientY - box.top  + containerRef.current.scrollTop;
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '' }])
      .select();
    if (!error && Array.isArray(data)) setCandles(prev => [...prev, ...data]);
  };

  // note-modal
  const openModal = (i,id) => setModal({ open:true, index:i, id, text:candles[i].note||'' });
  const handleModalSubmit = async () => {
    const { index, id, text } = modal;
    setCandles(prev => {
      const c = [...prev]; c[index].note = text; return c;
    });
    await supabase.from('candles').update({ note:text }).eq('id', id);
    setModal({ open:false, index:null, id:null, text:'' });
  };

  return (
    <>
      <Head>
        {/* Oooh Baby font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oooh+Baby&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Info button */}
      <button
        onClick={()=>setShowInfo(!showInfo)}
        style={{
          position:'fixed', top:12, left:12,
          padding:'8px 12px',
          background:'#d2691e', color:'#fff',
          border:'none', borderRadius:4,
          cursor:'pointer', zIndex:100,
          fontFamily:'sans-serif'
        }}
      >
        Light a Candle
      </button>

      {/* Info popover */}
      {showInfo && (
        <div
          onClick={()=>setShowInfo(false)}
          style={{
            position:'fixed', top:48, left:12,
            background:'#fff', padding:16,
            borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
            width:280, zIndex:100, fontFamily:'sans-serif'
          }}
        >
          <h2 style={{margin:0,marginBottom:8,fontSize:'1.2rem'}}>About This Project</h2>
          <p style={{margin:0,lineHeight:1.4,fontSize:'0.9rem'}}>
            This communal candle-lighting app is built with Next.js & Supabase.  
            Place candles across a scrollable canvas and share your messages.
          </p>
          <p style={{margin:'12px 0 0',fontStyle:'italic',fontSize:'0.85rem'}}>
            © 2025 Anahat Kaur
          </p>
          <button
            onClick={()=>setShowInfo(false)}
            style={{
              marginTop:8,padding:'6px 10px',
              background:'#eee', border:'none',
              borderRadius:4, cursor:'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* world container (white) */}
      <div
        ref={containerRef}
        onClick={handleScreenClick}
        style={{
          width:'100vw', height:'100vh',
          overflowX:'auto', overflowY:'auto',
          background:'#fff', position:'relative'
        }}
      >
        <div style={{ width:3000, height:2000, position:'relative' }}>
          {candles.map((c,i)=>(
            <div
              key={c.id}
              onClick={e=>{e.stopPropagation(); openModal(i,c.id)}}
              onMouseEnter={()=>c.note&&setHovered({visible:true,x:c.x,y:c.y,text:c.note})}
              onMouseLeave={()=>setHovered(h=>({...h,visible:false}))}
              style={{
                position:'absolute',
                left:c.x, top:c.y,
                transform:'translate(-50%,-100%)',
                cursor:'pointer'
              }}
            >
              <img src="/candle.gif" alt="" style={{height:60,width:'auto'}}/>
            </div>
          ))}
          {hovered.visible && (
            <div
              style={{
                position:'absolute',
                left:hovered.x+20, top:hovered.y-30,
                background:'rgba(0,0,0,0.75)',
                color:'#fff', padding:'4px 8px',
                borderRadius:4, pointerEvents:'none',
                maxWidth:120, fontSize:12, whiteSpace:'normal'
              }}
            >
              {hovered.text}
            </div>
          )}
        </div>
      </div>

      {/* fixed central candle */}
      <div
        onClick={e=>{e.stopPropagation();setIsPlacing(true)}}
        style={{
          position:'fixed',
          top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          textAlign:'center', cursor:'pointer', zIndex:50
        }}
      >
        <img src="/candle.gif" alt="" style={{height:120,width:'auto'}}/>
        <p className="oooh-baby" style={{margin:'8px 0 0',color:'#333'}}>
          Click to light your candle,<br/>
          place it anywhere in this space,<br/>
          write a note or read one.
        </p>
      </div>

      {/* letter modal */}
      {modal.open && (
        <div
          style={{
            position:'fixed',top:0,left:0,
            width:'100vw',height:'100vh',
            background:'rgba(0,0,0,0.5)',
            display:'flex',alignItems:'center',justifyContent:'center',zIndex:200
          }}
        >
          <div style={{
            background:'#fff',padding:20,borderRadius:8,
            width:'90%',maxWidth:400,fontFamily:'sans-serif'
          }}>
            <h3 style={{marginTop:0}}>Write your letter</h3>
            <textarea
              value={modal.text}
              onChange={e=>{
                const t=e.target.value;
                if(t.length<=100) setModal(m=>({...m,text:t}));
              }}
              rows={4}
              style={{width:'100%',boxSizing:'border-box',padding:8,fontSize:14}}
            />
            <div style={{textAlign:'right',marginTop:4,fontSize:12,color:'#666'}}>
              {modal.text.length}/100
            </div>
            <div style={{marginTop:12,textAlign:'right'}}>
              <button
                onClick={()=>setModal({open:false,index:null,id:null,text:''})}
                style={{marginRight:8}}
              >
                Cancel
              </button>
              <button onClick={handleModalSubmit}>Share Letter</button>
            </div>
          </div>
        </div>
      )}

      {/* global styles */}
      <style jsx global>{`
        body {
          margin: 0;
          background: #fff;
        }
        .oooh-baby {
          font-family: "Oooh Baby", cursive;
        }
      `}</style>
    </>
  );
}