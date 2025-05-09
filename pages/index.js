import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

// ---------------------------------------------
//  Prepare country list & flag helper
// ---------------------------------------------
countries.registerLocale(enLocale)
const COUNTRY_LIST = Object.entries(
  countries.getNames('en', { select: 'official' })
).sort((a, b) => a[1].localeCompare(b[1]))

function flagEmoji(cc) {
  return cc
    .toUpperCase()
    .replace(/./g, c =>
      String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))
    )
}

// ---------------------------------------------
//  Main component
// ---------------------------------------------
export default function Home() {
  // world data
  const [candles, setCandles]     = useState([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [dragPos, setDragPos]     = useState(null)
  // modal state
  const [modal, setModal] = useState({
    open: false,
    index: null,
    id: null,
    text: '',
    country: '',
    x: 0,
    y: 0,
  })
  // hover tooltip
  const [hover, setHover] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    date: '',
  })
  // about pop‑over
  const [showInfo, setShowInfo] = useState(false)

  const worldRef = useRef(null)
  const textRef = useRef(null)

  // 1) fetch all candles
  useEffect(() => {
    supabase
      .from('candles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCandles(data)
      })
  }, [])

  // 2) center scrollable world
  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop  = (el.scrollHeight - el.clientHeight) / 2
    })
  }, [])

  // 3) start placing mode
  const startPlacing = e => {
    e.stopPropagation()
    setIsPlacing(true)
  }

  // 4) ghost preview under cursor
  const handleMouseMove = e => {
    if (!isPlacing) return
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  // 5) place new candle in DB & open modal
  const handleWorldClick = async e => {
    if (!isPlacing) return
    setIsPlacing(false)
    setDragPos(null)

    const rect = worldRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + worldRef.current.scrollLeft
    const y = e.clientY - rect.top  + worldRef.current.scrollTop

    const idxBefore = candles.length
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x, y, note: '', country_code: '' }])
      .select()

    if (!error && Array.isArray(data)) {
      const newRow = data[0]
      setCandles(prev => {
        // open modal anchored at the flag position
        setModal({
          open: true,
          index: idxBefore,
          id: newRow.id,
          text: '',
          country: '',
          // position modal under flag:
          x: e.clientX,
          y: e.clientY + 20 + 18 // 20px flag + 18px margin
        })
        return [...prev, newRow]
      })
    } else {
      console.error('Insert error', error)
    }
  }

  // 6) submit letter + country
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
      text: '', country: '', x: 0, y: 0
    })
  }

  // 7) show hover tooltip
  const showTooltip = c => {
    setHover({
      visible: true,
      x: c.x,
      y: c.y,
      text: c.note,
      date: new Date(c.created_at).toLocaleString()
    })
  }
  const hideTooltip = () => setHover(h => ({ ...h, visible: false }))

  return (
    <>
      <Head>
        <title>Light a Candle · space</title>
      </Head>

      {/* Info button (top‑left) */}
      <button
        onClick={() => setShowInfo(v => !v)}
        style={{
          position: 'fixed', top: 12, left: 12,
          padding: '8px 12px',
          background: '#fff', color: '#d2691e',
          border: 'none', textDecoration: 'underline',
          cursor: 'pointer',
          fontFamily: 'Noto Sans, sans-serif', fontSize: 16,
          zIndex: 1000,
        }}
      >
        light a candle . space
      </button>
      {/* Info pop‑over */}
      {showInfo && (
        <div style={{ position:'fixed', inset:0, zIndex:900 }}>
          <div
            onClick={()=>setShowInfo(false)}
            style={{ position:'absolute', inset:0 }}
          />
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'absolute', top:48, left:12, width:300,
              background:'#f2f2f2', borderRadius:6, padding:16,
              boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
              fontFamily:'Noto Sans, sans-serif',
              fontSize:14, lineHeight:1.4, color:'#333'
            }}
          >
            Prolonged war, deep loss, grief, fear, hope and eternal love. I feel so much every
            day, especially given the state of affairs of the world. This is an attempt to create a
            digital space for global solidarity and accessing communal power in a small way. Light
            a Candle is a scream into the void.
            <div style={{marginTop:12, fontSize:12, color:'#555'}}>
              Created with ❤️ by Anahat Kaur • 2025 Berlin
            </div>
          </div>
        </div>
      )}

      {/* world (scrollable) */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        onMouseMove={handleMouseMove}
        style={{
          width:'100vw', height:'100vh',
          overflow:'auto', background:'#fff',
          cursor: isPlacing ? 'crosshair' : 'default'
        }}
      >
        <div style={{ width:3000, height:2000, position:'relative' }}>
          {candles.map((c,i)=>(
            <div
              key={c.id}
              onMouseEnter={()=>c.note&&showTooltip(c)}
              onMouseLeave={hideTooltip}
              style={{
                position:'absolute',
                left:c.x, top:c.y,
                transform:'translate(-50%,-100%)',
                textAlign:'center'
              }}
            >
              <img src="/candle.gif" alt="" style={{height:60,width:'auto'}}/>
              {c.country_code && (
                <div style={{
                  fontSize:18,
                  marginTop:2,   // very tight
                  lineHeight:1
                }}>
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
                left:hover.x, top:hover.y,
                transform:'translate(-50%,-180%)',
                background:'#f2f2f2', color:'#5a3e2b',
                padding:'12px 16px', borderRadius:8,
                pointerEvents:'none', maxWidth:200,
                fontFamily:'Noto Sans, sans-serif',
                fontSize:14, lineHeight:1.4,
                zIndex:400
              }}
            >
              <div style={{
                position:'absolute',
                bottom:-10, left:'50%',
                transform:'translateX(-50%)',
                width:0, height:0,
                borderLeft:'8px solid transparent',
                borderRight:'8px solid transparent',
                borderTop:'10px solid #f2f2f2'
              }}/>
              <div style={{marginBottom:6}}>{hover.text}</div>
              <div style={{fontSize:12,opacity:0.8}}>{hover.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* central candle + sunburst */}
      <div
        onClick={startPlacing}
        style={{
          position:'fixed', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          textAlign:'center', zIndex:500
        }}
      >
        <div style={{position:'relative',width:60,height:60,margin:'0 auto'}}>
          <svg
            viewBox="0 0 100 100"
            style={{
              position:'absolute',top:'50%',left:'50%',
              transform:'translate(-50%,-50%)',
              width:140,height:140,pointerEvents:'none'
            }}
          >
            {[...Array(24)].map((_,i)=> {
              const angle = (i/24)*Math.PI*2
              const inner = 30, outer = inner + Math.random()*30 + 10
              const x1=50+Math.cos(angle)*inner
              const y1=50+Math.sin(angle)*inner
              const x2=50+Math.cos(angle)*outer
              const y2=50+Math.sin(angle)*outer
              return (
                <line key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#ddd" strokeWidth={0.5}
                />
              )
            })}
          </svg>
          <img src="/candle.gif" alt="" style={{position:'relative',height:60,width:'auto',zIndex:1}}/>
        </div>
        <p style={{
          marginTop:8, color:'#333',
          fontFamily:'Noto Sans, sans-serif',
          fontSize:15, lineHeight:1.4,
          zIndex:2
        }}>
          Click to light your candle,<br/>
          place it anywhere in this space,<br/>
          write a note or read one.
        </p>
      </div>

      {/* ghost preview */}
      {isPlacing && dragPos && (
        <img
          src="/candle.gif" alt="Ghost"
          style={{
            position:'fixed',
            left:dragPos.x, top:dragPos.y,
            transform:'translate(-50%,-100%)',
            height:60,width:'auto',
            opacity:0.6,pointerEvents:'none',
            zIndex:450
          }}
        />
      )}

      {/* total counter */}
      <div style={{
        position:'fixed', bottom:12, right:12,
        background:'rgba(255,255,255,0.9)',
        padding:'6px 10px', borderRadius:4,
        fontFamily:'Noto Sans, sans-serif',
        fontSize:14, color:'#000',
        zIndex:1000
      }}>
        Total candles: {candles.length}
      </div>

      {/* letter modal */}
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
          {/* bubble under flag */}
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              position:'fixed',
              left:modal.x, top:modal.y,
              transform:'translate(-50%,0)',
              background:'#f2f2f2',
              borderRadius:12,
              padding:16,
              maxWidth:300,
              fontFamily:'Noto Sans, sans-serif',
              fontSize:14,
              zIndex:810
            }}
          >
            <div style={{
              position:'absolute',top:-10,left:'50%',
              transform:'translateX(-50%)',
              width:0,height:0,
              borderLeft:'8px solid transparent',
              borderRight:'8px solid transparent',
              borderBottom:'10px solid #f2f2f2'
            }}/>

            <h4 style={{margin:'0 0 8px',fontWeight:400,color:'#333'}}>
              Write a letter
            </h4>
            <div style={{margin:'0 0 12px',color:'#555'}}>
              This cannot be undone
            </div>

            <textarea
              ref={textRef}
              rows={4}
              placeholder="Your message…"
              value={modal.text}
              onChange={e=>
                setModal(m=>({...m,text:e.target.value.slice(0,200)}))
              }
              style={{
                width:'100%',padding:8,
                border:'1px solid #ddd',borderRadius:4,
                background:'#fff',color:'#000',
                marginBottom:8,resize:'vertical'
              }}
            />

            {/* emoji button */}
            <button
              onClick={()=>textRef.current.focus()}
              style={{
                background:'transparent',
                border:'none',
                fontSize:20,
                cursor:'pointer',
                marginBottom:12
              }}
            >
              😊
            </button>

            <div style={{textAlign:'right',fontSize:12,color:'#666',marginBottom:12}}>
              {modal.text.length}/200
            </div>

            <select
              value={modal.country}
              onChange={e=>setModal(m=>({...m,country:e.target.value}))}
              style={{
                width:'100%',padding:6,
                border:'0.5px solid rgba(0,0,0,0.5)',
                borderRadius:4,background:'#fff',
                marginBottom:12,appearance:'none'
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
                display:'block',margin:'0 auto',
                padding:'8px 16px',
                background:'#000',color:'#fff',
                border:'none',borderRadius:4,
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