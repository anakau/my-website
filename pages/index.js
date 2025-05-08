// pages/index.js
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

// Prepare country list
countries.registerLocale(enLocale)
const COUNTRY_LIST = Object.entries(
  countries.getNames('en', { select: 'official' })
).sort((a, b) => a[1].localeCompare(b[1]))

// Country code → emoji
function flagEmoji(cc) {
  return cc.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))
  )
}

export default function Home() {
  const [candles, setCandles]     = useState([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [modal, setModal]         = useState({
    open: false, index: null, id: null,
    text: '', country: '',
    screenX: 0, screenY: 0
  })
  const [hover, setHover]         = useState({
    visible: false, x: 0, y: 0,
    text: '', date: ''
  })
  const [preview, setPreview]     = useState({ x: 0, y: 0 })
  const [showInfo, setShowInfo]   = useState(false)
  const worldRef                  = useRef(null)

  // 1) load all candles
  useEffect(() => {
    supabase
      .from('candles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setCandles(data) })
  }, [])

  // 2) center canvas
  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop  = (el.scrollHeight - el.clientHeight) / 2
    })
  }, [])

  // 3) ghost‐preview on cursor while placing
  useEffect(() => {
    function onMove(e) {
      if (isPlacing) setPreview({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [isPlacing])

  // 4) place new candle
  const handleWorldClick = async e => {
    if (!isPlacing) return
    setIsPlacing(false)

    // world coords:
    const rect = worldRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + worldRef.current.scrollLeft
    const y = e.clientY - rect.top  + worldRef.current.scrollTop

    const oldLen = candles.length
    const { data } = await supabase
      .from('candles')
      .insert([{ x, y, note: '', country_code: '' }])
      .select()

    if (data?.length) {
      const row = data[0]
      setCandles(prev => [...prev, row])
      // open modal right _below_ the flag/candle
      setModal({
        open: true,
        index: oldLen,
        id: row.id,
        text: '',
        country: '',
        screenX: e.clientX,
        // vertical position: drop _below_ flag by ~20px
        screenY: e.clientY + 60 + 20
      })
    }
  }

  // 5) submit note + country
  const submitModal = async () => {
    const { index, id, text, country } = modal
    setCandles(prev => {
      const cp = [...prev]
      cp[index].note         = text
      cp[index].country_code = country
      return cp
    })
    await supabase
      .from('candles')
      .update({ note: text, country_code: country })
      .eq('id', id)
    setModal({
      open: false, index: null, id: null,
      text: '', country: '',
      screenX: 0, screenY: 0
    })
  }

  return (
    <>
      <Head>
        <title>Light a Candle · space</title>
      </Head>

      {/* Info button */}
      <button
        onClick={() => setShowInfo(v => !v)}
        style={{
          position: 'fixed', top: 12, left: 12,
          padding: '8px 12px',
          background: '#fff', color: '#d2691e',
          border: 'none', textDecoration: 'underline',
          cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
          fontSize: 16, zIndex: 1000
        }}
      >
        light a candle . space
      </button>

      {/* Info popover */}
      {showInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900 }}>
          <div onClick={() => setShowInfo(false)} style={{ position:'absolute', inset:0 }} />
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'absolute', top:48, left:12,
              width:300, background:'#f2f2f2',
              borderRadius:6, padding:16,
              fontFamily:'Noto Sans, sans-serif',
              fontSize:14, lineHeight:1.4, color:'#333'
            }}
          >
            <p style={{margin:0}}>
              Prolonged war, deep loss, grief, fear, hope and eternal love…
            </p>
            <p style={{marginTop:12,fontSize:12,color:'#555'}}>
              Created with ❤️ by Anahat Kaur<br/>2025 Berlin
            </p>
          </div>
        </div>
      )}

      {/* World */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        style={{
          width:'100vw',height:'100vh',
          overflow:'auto',background:'#fff',
          cursor:isPlacing?'crosshair':'default'
        }}
      >
        <div style={{ width:3000,height:2000,position:'relative' }}>
          {candles.map((c,i)=>(
            <div
              key={c.id}
              onMouseEnter={()=>setHover({
                visible:true, x:c.x, y:c.y,
                text:c.note,
                date:new Date(c.created_at).toLocaleString()
              })}
              onMouseLeave={()=>setHover(h=>({...h,visible:false}))}
              style={{
                position:'absolute',
                left:c.x, top:c.y,
                transform:'translate(-50%,-100%)',
                textAlign:'center'
              }}
            >
              <img src="/candle.gif" alt="" style={{height:60,width:'auto'}}/>
              {c.country_code && (
                <div style={{fontSize:18,marginTop:-4}}>
                  {flagEmoji(c.country_code)}
                </div>
              )}
            </div>
          ))}

          {/* hover tooltip */}
          {hover.visible && (
            <div
              style={{
                position:'absolute',
                left:hover.x,
                top:hover.y,
                transform:'translate(-50%, calc(-100% - 24px))',
                background:'#f2f2f2',
                color:'#5a3e2b',
                padding:'12px 16px',
                borderRadius:8,
                pointerEvents:'none',
                maxWidth:200,
                fontFamily:'Noto Sans, sans-serif',
                fontSize:14,
                lineHeight:1.4,
                zIndex:400
              }}
            >
              <div style={{
                position:'absolute',
                bottom:-12,left:'50%',
                transform:'translateX(-50%)',
                borderLeft:'8px solid transparent',
                borderRight:'8px solid transparent',
                borderTop:'12px solid #f2f2f2'
              }} />
              <div style={{marginBottom:6}}>{hover.text}</div>
              <div style={{fontSize:12,opacity:0.8}}>{hover.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* Ghost preview */}
      {isPlacing && (
        <img
          src="/candle.gif"
          style={{
            position:'fixed',
            left:preview.x,
            top:preview.y,
            transform:'translate(-50%,-80%)',
            opacity:0.4,
            width:40,
            pointerEvents:'none',
            zIndex:500
          }}
        />
      )}

      {/* Central candle + sunburst */}
      <div
        onClick={e=>{e.stopPropagation();setIsPlacing(true)}}
        style={{
          position:'fixed',top:'50%',left:'50%',
          transform:'translate(-50%,-50%)',
          textAlign:'center',zIndex:600
        }}
      >
        <div style={{ position:'relative',width:60,height:60,margin:'0 auto' }}>
          <svg
            viewBox="0 0 100 100"
            style={{
              position:'absolute',
              top:'50%',left:'50%',
              transform:'translate(-50%,-50%)',
              width:140,height:140,
              pointerEvents:'none'
            }}
          >
            {[...Array(24)].map((_,i)=>{
              const a = (i/24)*Math.PI*2
              const r1 = 30, r2 = r1 + 10 + Math.random()*20
              const x1=50+Math.cos(a)*r1, y1=50+Math.sin(a)*r1
              const x2=50+Math.cos(a)*r2, y2=50+Math.sin(a)*r2
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
          <img src="/candle.gif" alt="" style={{position:'relative',height:60,width:'auto',zIndex:1}}/>
        </div>
        <p style={{
          marginTop:8,
          color:'#333',
          fontFamily:'Noto Sans, sans-serif',
          fontSize:15,
          lineHeight:1.4,
          zIndex:2,
          position:'relative'
        }}>
          Click to light your candle,<br/>
          place it anywhere in this space,<br/>
          write a note or read one.
        </p>
      </div>

      {/* Total count */}
      <div style={{
        position:'fixed',bottom:12,right:12,
        background:'rgba(255,255,255,0.8)',
        padding:'6px 10px',
        borderRadius:4,
        fontFamily:'Noto Sans, sans-serif',
        fontSize:14,
        zIndex:1000
      }}>
        Total candles: {candles.length}
      </div>

      {/* Modal bubble _below_ flag */}
      {modal.open && (
        <>
          <div
            onClick={()=>setModal({open:false,index:null,id:null,text:'',country:'',screenX:0,screenY:0})}
            style={{position:'fixed',inset:0,zIndex:800}}
          />
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'fixed',
              left:modal.screenX,
              top:modal.screenY,
              transform:'translate(-50%,0)',
              background:'#f2f2f2',
              borderRadius:16,
              padding:16,
              maxWidth:280,
              fontFamily:'Noto Sans, sans-serif',
              fontSize:14,
              lineHeight:1.4,
              zIndex:900
            }}
          >
            <select
              value={modal.country}
              onChange={e=>setModal(m=>({...m,country:e.target.value}))}
              style={{
                width:'100%',
                padding:6,
                border:'1px solid #ddd',
                borderRadius:4,
                marginBottom:12,
                background:'#fff',
                appearance:'none',
                fontSize:14
              }}
            >
              <option value="">— Select country —</option>
              {COUNTRY_LIST.map(([c,n])=>(
                <option key={c} value={c}>{flagEmoji(c)} {n}</option>
              ))}
            </select>
            <textarea
              rows={4}
              placeholder="Your message…"
              value={modal.text}
              onChange={e=>setModal(m=>({...m,text:e.target.value.slice(0,200)}))}
              style={{
                width:'100%',
                padding:8,
                border:'1px solid #ddd',
                borderRadius:4,
                marginBottom:12,
                resize:'vertical',
                background:'#fff',
                color:'#000',
                fontSize:14
              }}
            />
            <div style={{textAlign:'right',fontSize:12,color:'#666',marginBottom:12}}>
              {modal.text.length}/200
            </div>
            <button
              onClick={submitModal}
              style={{
                float:'right',
                padding:'6px 12px',
                background:'#d2691e',
                color:'#fff',
                border:'none',
                borderRadius:4,
                cursor:'pointer'
              }}
            >
              Share Letter
            </button>
            {/* pointer arrow */}
            <div style={{
              position:'absolute',
              top:'100%',
              left:'50%',
              transform:'translateX(-50%)',
              width:0,height:0,
              borderLeft:'8px solid transparent',
              borderRight:'8px solid transparent',
              borderTop:'12px solid #f2f2f2'
            }} />
          </div>
        </>
      )}
    </>
  )
}