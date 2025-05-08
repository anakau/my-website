// pages/index.js
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

// Register English locale and build sorted [code, name] list
countries.registerLocale(enLocale)
const COUNTRY_LIST = Object.entries(
  countries.getNames('en', { select: 'official' })
).sort((a, b) => a[1].localeCompare(b[1]))

// Helper: "US" → 🇺🇸
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
    open: false, index: null, id: null, text: '', country: ''
  })
  const [hover, setHover]         = useState({
    visible: false, x: 0, y: 0, text: '', date: ''
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
        if (!error) setCandles(data)
      })
  }, [])

  // 2) Center the scroll area
  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop  = (el.scrollHeight - el.clientHeight) / 2
    })
  }, [])

  // 3) Place a new candle when in “placing” mode
  const handleWorldClick = async (e) => {
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

    if (!error && Array.isArray(data)) {
      setCandles(prev => {
        const next = [...prev, ...data]
        // open modal on that new candle
        setModal({
          open: true,
          index: oldLen,
          id: data[0].id,
          text: '',
          country: ''
        })
        return next
      })
    } else {
      console.error('Insert error:', error)
    }
  }

  // 4) Submit note + country for the just-placed candle
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
    setModal({ open: false, index: null, id: null, text: '', country: '' })
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
          background: '#fff', color: '#d2691e',
          border: 'none', textDecoration: 'underline',
          padding: '8px 12px', cursor: 'pointer',
          fontFamily: 'Noto Sans, sans-serif', fontSize: 16,
          zIndex: 1000
        }}
      >
        light a candle . space
      </button>

      {/* Info popover */}
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
              width: 300, background: '#fff',
              borderRadius: 6, padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: 14, lineHeight: 1.4, color: '#333'
            }}
          >
            <p style={{ margin: 0 }}>
              Prolonged war, deep loss, grief, fear, hope and eternal love. I feel
              so much every day, especially given the state of affairs of the world.
              This is an attempt to create a digital space for global solidarity and
              accessing communal power in a small way. Light a Candle is a scream
              into the void.
            </p>
            <p style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
              Created with ❤️ by Anahat Kaur<br/>2025 Berlin
            </p>
          </div>
        </div>
      )}

      {/* Scrollable world area */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        style={{
          width: '100vw', height: '100vh',
          overflow: 'auto', background: '#fff',
          position: 'relative',
          cursor: isPlacing ? 'crosshair' : 'default'
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
              <img
                src="/candle.gif"
                alt="User Candle"
                style={{ height: 60, width: 'auto' }}
              />
              {/* flag under each candle */}
              {c.country_code && (
                <div style={{ fontSize: 18, marginTop: 4 }}>
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
                left: hover.x + 20,
                top: hover.y - 30,
                background: '#f9f5f0',
                color: '#5a3e2b',
                padding: '12px 16px',
                borderRadius: 6,
                pointerEvents: 'none',
                maxWidth: 200,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: 14,
                lineHeight: 1.4
              }}
            >
              <div style={{ marginBottom: 6 }}>{hover.text}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{hover.date}</div>
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
          textAlign: 'center',
          cursor: 'pointer',
          zIndex: 500
        }}
      >
        <img
          src="/candle.gif"
          alt="Main Candle"
          style={{ height: 60, width: 'auto' }}
        />
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

      {/* total counter */}
      <div
        style={{
          position: 'fixed',
          bottom: 12, right: 12,
          background: 'rgba(255,255,255,0.8)',
          padding: '6px 10px',
          borderRadius: 4,
          fontFamily: 'Noto Sans, sans-serif',
          fontSize: 14,
          zIndex: 1000
        }}
      >
        Total candles: {candles.length}
      </div>

      {/* letter modal */}
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
            zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 400,
              fontFamily: 'Noto Sans, sans-serif'
            }}
          >
            <h3 style={{ margin: '0 0 12px' }}>Write your letter</h3>

            <select
              value={modal.country}
              onChange={e => setModal(m => ({ ...m, country: e.target.value }))}
              style={{ width: '100%', padding: 8, marginBottom: 16 }}
            >
              <option value="">— Select country —</option>
              {COUNTRY_LIST.map(([code, name]) => (
                <option key={code} value={code}>
                  {flagEmoji(code)} {name}
                </option>
              ))}
            </select>

            <textarea
              rows={4}
              placeholder="Your message…"
              value={modal.text}
              onChange={e => setModal(m => ({ ...m, text: e.target.value.slice(0,200) }))}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #eee',
                borderRadius: 6,
                marginBottom: 12,
                resize: 'vertical'
              }}
            />
            <div style={{ textAlign: 'right', marginBottom: 16, fontSize: 12 }}>
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
                cursor: 'pointer'
              }}
            >
              Share Letter
            </button>
          </div>
        </div>
      )}
    </>
  )
}