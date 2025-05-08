// pages/index.js
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

// prepare country list
countries.registerLocale(enLocale)
const COUNTRY_LIST = Object.entries(
  countries.getNames('en', { select: 'official' })
).sort((a, b) => a[1].localeCompare(b[1]))

// country code → flag
function flagEmoji(cc) {
  return cc
    .toUpperCase()
    .replace(/./g, c =>
      String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))
    )
}

export default function Home() {
  const [candles, setCandles]     = useState([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [dragPos, setDragPos]     = useState({ x: 0, y: 0 })
  const [modal, setModal]         = useState({
    open: false, index: null, id: null,
    text: '', country: '', x: 0, y: 0
  })
  const [hover, setHover]         = useState({
    visible: false, x: 0, y: 0, text: '', date: ''
  })
  const [showInfo, setShowInfo]   = useState(false)
  const worldRef = useRef(null)

  // load all candles
  useEffect(() => {
    supabase
      .from('candles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCandles(data)
      })
  }, [])

  // center canvas
  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth)/2
      el.scrollTop  = (el.scrollHeight - el.clientHeight)/2
    })
  }, [])

  // ghost‑candle follow
  useEffect(() => {
    function onMove(e) {
      if (isPlacing) setDragPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [isPlacing])

  // drop new candle
  const handleWorldClick = async e => {
    if (!isPlacing) return
    setIsPlacing(false)
    const rect = worldRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + worldRef.current.scrollLeft
    const y = e.clientY - rect.top  + worldRef.current.scrollTop

    const oldLen = candles.length
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '', country_code: '' }])
      .select()
    if (!error && data?.length) {
      const row = data[0]
      setCandles(prev => [...prev, row])
      // open modal right above that point
      setModal({
        open: true,
        index: oldLen,
        id: row.id,
        text: '',
        country: '',
        x: e.clientX,
        y: e.clientY
      })
    }
  }

  // submit letter + flag
  const submitModal = async () => {
    const { index, id, text, country } = modal
    setCandles(prev => {
      const cp = [...prev]
      cp[index].note = text
      cp[index].country_code = country
      return cp
    })
    await supabase
      .from('candles')
      .update({ note: text, country_code: country })
      .eq('id', id)
    setModal({ open:false,index:null,id:null,text:'',country:'',x:0,y:0 })
  }

  return (
    <>
      <Head>
        <title>Light a Candle · space</title>
      </Head>

      {/* ============== Info Button ============== */}
      <button
        onClick={() => setShowInfo(v => !v)}
        style={{
          position:'fixed', top:12, left:12, zIndex:1000,
          padding:'8px 12px',
          background:'#fff', color:'#d2691e',
          border:'none', textDecoration:'underline',
          fontFamily:'Noto Sans,sans-serif', fontSize:16,
          cursor:'pointer'
        }}
      >
        light a candle . space
      </button>
      {showInfo && (
        <div style={{ position:'fixed', inset:0, zIndex:900 }}>
          <div
            onClick={()=>setShowInfo(false)}
            style={{ position:'absolute', inset:0 }}
          />
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'absolute',
              top:48, left:12,
              width:300,
              background:'#f2f2f2',
              borderRadius:6,
              padding:16,
              fontFamily:'Noto Sans,sans-serif',
              fontSize:14, lineHeight:1.4, color:'#333'
            }}
          >
            <p style={{margin:0}}>
              Prolonged war, deep loss, grief, fear, hope and eternal love…
            </p>
            <p style={{marginTop:12,fontSize:12,color:'#555'}}>
              Created with ❤️ by Anahat Kaur<br/>2025 Berlin
            </p>
          </div>
        </div>
      )}

      {/* ============== World Canvas ============== */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        style={{
          width:'100vw', height:'100vh',
          overflow:'auto', background:'#fff',
          cursor:isPlacing?'crosshair':'default'
        }}
      >
        <div style={{ width:3000, height:2000, position:'relative' }}>
          {candles.map((c,i)=>(
            <div
              key={c.id}
              onMouseEnter={()=>{ if(!c.note) return; setHover({
                visible:true,
                x:c.x,y:c.y,
                text:c.note,
                date:new Date(c.created_at).toLocaleString()
              })}}
              onMouseLeave={()=>setHover(h=>({...h,visible:false}))}
              style={{
                position:'absolute',
                left:c.x, top:c.y,
                transform:'translate(-50%,-100%)',
                display:'flex',
                flexDirection:'column',
                alignItems:'center'
              }}
            >
              <img
                src="/candle.gif"
                alt="User Candle"
                style={{height:60,width:'auto'}}
              />
              {c.country_code && (
                <div style={{fontSize:18,marginTop:4}}>
                  {flagEmoji(c.country_code)}
                </div>
              )}
            </div>
          ))}

          {/* Hover Tooltip */}
          {hover.visible && (
            <div
              style={{
                position:'absolute',
                left:hover.x,
                top:hover.y,
                transform:'translate(-50%,-120%)',
                background:'#f2f2f2',
                color:'#5a3e2b',
                padding:'12px 16px',
                borderRadius:8,
                pointerEvents:'none',
                maxWidth:200,
                fontFamily:'Noto Sans,sans-serif',
                fontSize:14,
                lineHeight:1.4,
                zIndex:400
              }}
            >
              <div style={{
                position:'absolute',
                bottom:-8,
                left:'50%',
                transform:'translateX(-50%)',
                borderLeft:'8px solid transparent',
                borderRight:'8px solid transparent',
                borderTop:'8px solid #f2f2f2'
              }} />
              <div style={{marginBottom:4}}>{hover.text}</div>
              <div style={{fontSize:12,opacity:0.8}}>{hover.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* ============== Ghost Candle ============== */}
      {isPlacing && (
        <img
          src="/candle.gif"
          alt=""
          style={{
            position:'fixed',
            left:dragPos.x,
            top:dragPos.y,
            height:60,
            width:'auto',
            pointerEvents:'none',
            opacity:0.6,
            transform:'translate(-50%,-50%)',
            zIndex:1001
          }}
        />
      )}

      {/* ============== Central Candle ============== */}
      <div
        onClick={e=>{e.stopPropagation();setIsPlacing(true)}}
        style={{
          position:'fixed',
          top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          textAlign:'center',
          cursor:'grab',
          zIndex:500
        }}
      >
        {/* sunburst */}
        <svg
          viewBox="0 0 100 100"
          style={{
            position:'absolute',
            top:0,left:0,
            width:140,height:140,
            pointerEvents:'none',
            transform:'translate(-20px,-20px)'
          }}
        >
          {[...Array(24)].map((_,i)=>{
            const angle=(i/24)*Math.PI*2
            const inner=30
            const outer=inner + Math.random()*20 + 10
            const x1=50+Math.cos(angle)*inner
            const y1=50+Math.sin(angle)*inner
            const x2=50+Math.cos(angle)*outer
            const y2=50+Math.sin(angle)*outer
            return (
              <line
                key={i}
                x1={x1} y1={y1}
                x2={x2} y2={y2}
                stroke="#ddd"
                strokeWidth={0.5}
              />
            )
          })}
        </svg>
        <img
          src="/candle.gif"
          alt="Main Candle"
          style={{height:60,width:'auto',position:'relative',zIndex:1}}
        />
        <p style={{
          position:'relative',zIndex:2,
          marginTop:8,
          fontFamily:'Noto Sans,sans-serif',
          fontSize:15,
          lineHeight:1.4,
          color:'#333'
        }}>
          Click to grab a candle
        </p>
      </div>

      {/* ============== Total Counter ============== */}
      <div style={{
        position:'fixed',
        bottom:12,right:12,
        background:'rgba(255,255,255,0.8)',
        padding:'6px 10px',
        borderRadius:4,
        fontFamily:'Noto Sans,sans-serif',
        fontSize:14,
        zIndex:1000
      }}>
        Total candles: {candles.length}
      </div>

      {/* ============== Letter Modal ============== */}
      {modal.open && (
        <>
          {/* backdrop */}
          <div
            onClick={()=>setModal({
              open:false,index:null,id:null,
              text:'',country:'',x:0,y:0
            })}
            style={{position:'fixed',inset:0,zIndex:800}}
          />
          {/* bubble above candle */}
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'fixed',
              left:modal.x,
              top:modal.y - 100,
              transform:'translate(-50%,0)',
              background:'#f2f2f2',
              borderRadius:8,
              padding:16,
              maxWidth:280,
              fontFamily:'Noto Sans,sans-serif',
              zIndex:900
            }}
          >
            <div style={{
              position:'absolute',
              bottom:-8,
              left:'50%',
              transform:'translateX(-50%)',
              borderLeft:'8px solid transparent',
              borderRight:'8px solid transparent',
              borderTop:'8px solid #f2f2f2'
            }} />
            <h4 style={{margin:'0 0 8px',fontWeight:400,color:'#333'}}>
              Write your message (you cannot undo)
            </h4>
            <textarea
              rows={4}
              placeholder="Your message…"
              value={modal.text}
              onChange={e=>setModal(m=>({
                ...m,text:e.target.value.slice(0,200)
              }))}
              style={{
                width:'100%',
                padding:8,
                marginBottom:8,
                border:'1px solid #ddd',
                borderRadius:4,
                background:'#fff',
                color:'#000'
              }}
            />
            <div style={{
              textAlign:'right',
              fontSize:12,
              color:'#666',
              marginBottom:8
            }}>
              {modal.text.length}/200
            </div>
            <select
              value={modal.country}
              onChange={e=>setModal(m=>({
                ...m,country:e.target.value
              }))}
              style={{
                width:'100%',
                padding:6,
                border:'1px solid #ddd',
                borderRadius:4,
                background:'#fff',
                color:'#000',
                marginBottom:8
              }}
            >
              <option value="">— Select country —</option>
              {COUNTRY_LIST.map(([code,name])=>(
                <option key={code} value={code}>
                  {flagEmoji(code)} {name}
                </option>
              ))}
            </select>
            <button
              onClick={submitModal}
              style={{
                display:'block',
                margin:'0 auto',
                padding:'6px 16px',
                background:'#d2691e',
                color:'#fff',
                border:'none',
                borderRadius:4,
                cursor:'pointer'
              }}
            >
              Share Letter
            </button>
          </div>
        </>
      )}
    </>
  )
}