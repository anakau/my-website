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

// Convert country code to flag emoji
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
  const [modal, setModal]         = useState({
    open: false,
    index: null,
    id: null,
    text: '',
    country: '',
    worldX: 0,
    worldY: 0,
  })
  const [hover, setHover]         = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    date: '',
  })
  const [showInfo, setShowInfo]   = useState(false)
  const worldRef                  = useRef(null)

  // 1) Load all candles
  useEffect(() => {
    supabase
      .from('candles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCandles(data)
      })
  }, [])

  // 2) Center the scrollable world
  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop  = (el.scrollHeight - el.clientHeight) / 2
    })
  }, [])

  // 3) Place a new candle
  const handleWorldClick = async e => {
    if (!isPlacing) return
    setIsPlacing(false)

    const rect = worldRef.current.getBoundingClientRect()
    const worldX = e.clientX - rect.left + worldRef.current.scrollLeft
    const worldY = e.clientY - rect.top  + worldRef.current.scrollTop

    const oldLen = candles.length
    const { data, error } = await supabase
      .from('candles')
      .insert([{ x: worldX, y: worldY, note: '', country_code: '' }])
      .select()

    if (!error && data?.length) {
      const row = data[0]
      setCandles(prev => {
        // open the modal right at that candle
        setModal({
          open: true,
          index: oldLen,
          id: row.id,
          text: '',
          country: '',
          worldX,
          worldY,
        })
        return [...prev, row]
      })
    }
  }

  // 4) Submit letter + flag
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
      open: false,
      index: null,
      id: null,
      text: '',
      country: '',
      worldX: 0,
      worldY: 0,
    })
  }

  // Helper to compute bubble position
  const computeBubble = () => {
    const { worldX, worldY } = modal
    const rect = worldRef.current.getBoundingClientRect()
    // screen coords
    let x = rect.left + worldX - worldRef.current.scrollLeft
    let y = rect.top  + worldY - worldRef.current.scrollTop
    // center bubble above candle
    const bubbleW = 280, bubbleH = 200
    let left = x - bubbleW / 2
    let top  = y - bubbleH - 16
    // clamp
    left = Math.max(8, Math.min(left, window.innerWidth - bubbleW - 8))
    top  = Math.max(8, Math.min(top, window.innerHeight - bubbleH - 8))
    return { left, top }
  }

  return (
    <>
      <Head>
        <title>Light a Candle · space</title>
      </Head>

      {/* Info toggle */}
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

      {/* About popover */}
      {showInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900 }}>
          <div
            onClick={() => setShowInfo(false)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 48, left: 12,
              width: 300, background: '#f2f2f2',
              borderRadius: 8, padding: 16,
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: 14, lineHeight: 1.4, color: '#333'
            }}
          >
            Prolonged war, deep loss, grief, fear, hope and eternal love...
            <br/><br/>
            Created with ❤️ by Anahat Kaur<br/>2025 Berlin
          </div>
        </div>
      )}

      {/* Scrollable world */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        style={{
          width: '100vw', height: '100vh',
          overflow: 'auto', background: '#fff',
          cursor: isPlacing ? 'crosshair' : 'default',
        }}
      >
        <div style={{ width: 3000, height: 2000, position: 'relative' }}>
          {candles.map((c, i) => (
            <div
              key={c.id}
              onMouseEnter={() => {
                if (!c.note) return
                setHover({
                  visible: true,
                  x: c.x, y: c.y,
                  text: c.note,
                  date: new Date(c.created_at).toLocaleString()
                })
              }}
              onMouseLeave={() => setHover(h => ({ ...h, visible: false }))}
              style={{
                position: 'absolute',
                left: c.x, top: c.y,
                transform: 'translate(-50%, -100%)',
                textAlign: 'center'
              }}
            >
              <img src="/candle.gif" alt="" style={{ height: 60, width: 'auto' }} />
              {/* flag under each candle, tighter spacing */}
              {c.country_code && (
                <div style={{ fontSize: 18, marginTop: 2 }}>
                  {flagEmoji(c.country_code)}
                </div>
              )}
            </div>
          ))}

          {/* hover tooltip */}
          {hover.visible && (
            <div
              style={{
                position: 'absolute',
                left: hover.x,
                top: hover.y - 80,
                transform: 'translate(-50%, 0)',
                background: '#f2f2f2',
                color: '#5a3e2b',
                padding: '12px 16px',
                borderRadius: 8,
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: 14,
                lineHeight: 1.4,
                zIndex: 400,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid #f2f2f2',
                }}
              />
              {hover.text}
              <br/>
              <small style={{ opacity: 0.7 }}>{hover.date}</small>
            </div>
          )}
        </div>
      </div>

      {/* Central candle */}
      <div
        onClick={e => { e.stopPropagation(); setIsPlacing(true) }}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', zIndex: 500,
        }}
      >
        <img src="/candle.gif" alt="" style={{ height: 60, width: 'auto' }} />
        <p
          style={{
            marginTop: 8,
            color: '#333',
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: 15,
            lineHeight: 1.4
          }}
        >
          Click to light your candle,<br/>
          place it anywhere in this space,<br/>
          write a note or read one.
        </p>
      </div>

      {/* Total count */}
      <div
        style={{
          position: 'fixed', bottom: 12, right: 12,
          background: 'rgba(255,255,255,0.8)',
          padding: '6px 10px', borderRadius: 4,
          fontFamily: 'Noto Sans, sans-serif', fontSize: 14,
          zIndex: 1000
        }}
      >
        Total candles: {candles.length}
      </div>

      {/* Letter modal bubble */}
      {modal.open && (() => {
        const { left, top } = computeBubble()
        return (
          <div>
            {/* backdrop */}
            <div
              onClick={() => setModal({
                open: false, index: null, id: null,
                text: '', country: '',
                worldX:0, worldY:0
              })}
              style={{ position:'fixed', inset:0, zIndex:800 }}
            />
            {/* bubble */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position:'fixed',
                left, top,
                width:280,
                background:'#f2f2f2',
                borderRadius:16,
                padding:16,
                fontFamily:'Noto Sans, sans-serif',
                fontSize:14,
                lineHeight:1.4,
                zIndex:801
              }}
            >
              <div
                style={{
                  position:'absolute',
                  bottom:-8,
                  left:'50%',
                  transform:'translateX(-50%)',
                  borderLeft:'8px solid transparent',
                  borderRight:'8px solid transparent',
                  borderTop:'8px solid #f2f2f2'
                }}
              />
              <h4 style={{ margin:'0 0 8px', fontWeight:400 }}>
                Write your message (you cannot undo this)
              </h4>
              <textarea
                rows={4}
                placeholder="Your message…"
                value={modal.text}
                onChange={e =>
                  setModal(m => ({ ...m, text: e.target.value.slice(0,200) }))
                }
                style={{
                  width:'100%',
                  padding:8,
                  border:'1px solid #ddd',
                  borderRadius:4,
                  marginBottom:12,
                  background:'#fff',
                  color:'#000'
                }}
              />
              <div style={{ textAlign:'right', fontSize:12, color:'#666', marginBottom:12 }}>
                {modal.text.length}/200
              </div>
              <select
                value={modal.country}
                onChange={e => setModal(m => ({ ...m, country: e.target.value }))}
                style={{
                  width:'100%',
                  padding:6,
                  border:'1px solid #ddd',
                  borderRadius:4,
                  marginBottom:12,
                  background:'#fff'
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
            </div>
          </div>
        )
      })()}
    </>
  )
}