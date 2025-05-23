// pages/index.js
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabaseClient'
import EmojiPicker from 'emoji-picker-react'

// Load emoji picker only on client
const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false })

export default function Home() {
  const [candles, setCandles]     = useState([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [dragPos, setDragPos]     = useState(null)
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [modal, setModal]         = useState({
    open: false,
    index: null,
    id: null,
    text: '',
    emoji: '',
    showEmojiPicker: false,
    x: 0,
    y: 0
  })
  const [hover, setHover]         = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    date: ''
  })
  const [showInfo, setShowInfo]   = useState(false)
  const worldRef                  = useRef(null)

  // 1) fetch all candles
  useEffect(() => {
    supabase
      .from('candles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setCandles(data)
      })
  }, [])

  // 2) center on mount
  useEffect(() => {
    const el = worldRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop  = (el.scrollHeight - el.clientHeight) / 2
    })
  }, [])

  // 3) click main candle → placing mode
  const startPlacing = (style, e) => {
    console.log('Starting placement with style:', style)
    e.stopPropagation()
    setSelectedStyle(style)
    setIsPlacing(true)
  }

  // 4) ghost follows pointer
  const handleMouseMove = e => {
    if (!isPlacing) return
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  // 5) place and open modal (only clear state on success)
  const handleWorldClick = async e => {
    console.log('World clicked. isPlacing:', isPlacing, 'selectedStyle:', selectedStyle)
    if (!isPlacing || !selectedStyle) return

    // compute world coords
    const rect = worldRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + worldRef.current.scrollLeft
    const y = e.clientY - rect.top + worldRef.current.scrollTop

    console.log('Attempting to place candle at:', { x, y, style: selectedStyle })

    const before = candles.length
    const { data, error } = await supabase
      .from('candles')
      .insert([{ 
        x, 
        y, 
        note: '', 
        emoji: '',
        style: selectedStyle
      }])
      .select()

    if (error) {
      console.error('Insert failed:', error)
      return
    }

    if (data?.length) {
      setIsPlacing(false)
      setDragPos(null)
      setSelectedStyle(null)

      const newCandle = data[0]
      setCandles(prev => {
        setModal({
          open: true,
          index: before,
          id: newCandle.id,
          text: '',
          emoji: '',
          showEmojiPicker: false,
          x: e.clientX,
          y: e.clientY
        })
        return [...prev, newCandle]
      })
    }
  }

  // 6) submit note + emoji
  const submitModal = async () => {
    const { index, id, text, emoji } = modal
    console.log('Submitting modal with:', { index, id, text, emoji })

    try {
      const { data, error } = await supabase
        .from('candles')
        .update({
          note: text,
          emoji: emoji
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        alert('Failed to save your candle')
        return
      }

      console.log('Supabase response:', data)

      setCandles(prev => {
        const copy = [...prev]
        copy[index] = {
          ...copy[index],
          note: text,
          emoji: emoji
        }
        return copy
      })

      setModal({
        open: false,
        index: null,
        id: null,
        text: '',
        emoji: '',
        showEmojiPicker: false,
        x: 0,
        y: 0
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An error occurred while saving')
    }
  }

  // 7) tooltip handlers
  const showTooltip = c =>
    setHover({
      visible: true,
      x: c.x,
      y: c.y - 100,
      text: c.note,
      date: new Date(c.created_at).toLocaleString()
    })
  const hideTooltip = () => setHover(h => ({ ...h, visible: false }))

  const getCandleStyle = (style) => {
    switch(style) {
      case 'tall':
        return { 
          height: '80px', 
          transform: 'scale(1)',
          imagePath: '/lighter.gif'
        }
      case 'wide':
        return { 
          height: '60px', 
          transform: 'scale(1.3)',
          imagePath: '/dia.gif'
        }
      case 'regular':
      default:
        return { 
          height: '60px', 
          transform: 'scale(1)',
          imagePath: '/candle.gif'
        }
    }
  }

  // Add debug logging
  console.log('Selected style:', selectedStyle)
  console.log('Candles:', candles)

  return (
    <>
      <Head>
        <title>Light a Candle · space</title>
      </Head>

      {/* Info toggle */}
      <button
        onClick={() => setShowInfo(v => !v)}
        style={{
          position:'fixed', top:12, left:12,
          padding:'8px 12px',
          background:'transparent',
          color:'#f2f2f2',
          border:'none',
          textDecoration:'underline',
          cursor:'pointer',
          fontFamily:'Noto Sans, sans-serif',
          fontSize:16,
          zIndex:1000
        }}
      >
        light a candle . space
      </button>

      {/* About pop-over */}
      {showInfo && (
        <div style={{ position:'fixed', inset:0, zIndex:900 }}>
          <div onClick={() => setShowInfo(false)} style={{ position:'absolute', inset:0 }}/>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position:'absolute', top:48, left:12,
              width:300, background:'#2a2a2a',
              borderRadius:6, padding:16,
              fontFamily:'Noto Sans, sans-serif',
              fontSize:14, lineHeight:1.4, color:'#f2f2f2'
            }}
          >
            Prolonged war, deep loss, grief, fear, hope and eternal love. I feel so much every
            day, especially given the state of affairs of the world. This is an attempt to create
            a digital space for global solidarity and accessing communal power in a small way.
            Light a Candle is a scream into the void.
            <div style={{ marginTop:12, fontSize:12, color:'#999' }}>
              Created with ❤️ by Anahat Kaur • 2025 Berlin
            </div>
          </div>
        </div>
      )}

      {/* Scrollable world (click & move) */}
      <div
        ref={worldRef}
        onClick={handleWorldClick}
        onMouseMove={handleMouseMove}
        style={{
          width:'100vw', height:'100vh',
          overflow:'auto', background:'#1a1a1a',
          cursor:isPlacing ? 'crosshair' : 'default'
        }}
      >
        <div style={{ width:3000, height:2000, position:'relative' }}>
          {candles.map((c,i) => (
            <div
              key={c.id}
              onMouseEnter={() => c.note && showTooltip(c)}
              onMouseLeave={hideTooltip}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                transform: 'translate(-50%,-100%)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <img 
                src={getCandleStyle(c.style || 'regular').imagePath}
                alt="" 
                style={{ 
                  height: getCandleStyle(c.style || 'regular').height,
                  width: 'auto',
                  transform: getCandleStyle(c.style || 'regular').transform,
                  display: 'block'
                }}
              />
              <div 
                style={{ 
                  fontSize: 24,
                  lineHeight: 1,
                  minHeight: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 4px'
                }}
              >
                {c.emoji}
              </div>
            </div>
          ))}

          {/* Hover tooltip */}
          {hover.visible && (
            <div
              style={{
                position: 'absolute',
                left: hover.x,
                top: hover.y,
                transform: 'translate(-50%, -100%)',
                background: '#2a2a2a',
                color: '#f2f2f2',
                padding: '12px 16px',
                borderRadius: 8,
                pointerEvents: 'none',
                maxWidth: 240,
                minWidth: 120,
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: 14,
                lineHeight: 1.5,
                zIndex: 400,
                marginBottom: 20
              }}
            >
              <div style={{
                position: 'absolute',
                bottom: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #2a2a2a',
                filter: 'none'
              }}/>
              <div style={{ 
                marginBottom: 6,
                wordBreak: 'break-word'
              }}>
                {hover.text}
              </div>
              <div style={{ 
                fontSize: 12, 
                opacity: 0.6,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: 6,
                marginTop: 6
              }}>
                {hover.date}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candle Options */}
      <div style={{
        position: 'fixed',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '40px',
        justifyContent: 'center',
        zIndex: 500
      }}>
        {/* Option 1: Regular Candle */}
        <div
          onClick={(e) => startPlacing('regular', e)}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            padding: '20px',
            borderRadius: '12px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ position:'relative', width:60, height:60, margin:'0 auto' }}>
            <svg viewBox="0 0 100 100" style={{
              position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              width:140, height:140, pointerEvents:'none'
            }}>
              {[...Array(24)].map((_,i)=>{
                const angle=(i/24)*Math.PI*2
                const inner=30, outer=inner+Math.random()*30+10
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
            <img src="/candle.gif" alt="" style={{
              position:'relative', height:60, width:'auto', zIndex:1,
              transform: 'scale(1)'
            }}/>
          </div>
          <p style={{
            marginTop:8, color:'#f2f2f2',
            fontFamily:'Noto Sans, sans-serif',
            fontSize:14, lineHeight:1.4
          }}>
            Traditional Candle
          </p>
        </div>

        {/* Option 2: Tall Candle */}
        <div
          onClick={(e) => startPlacing('tall', e)}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            padding: '20px',
            borderRadius: '12px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ position:'relative', width:60, height:80, margin:'0 auto' }}>
            <svg viewBox="0 0 100 100" style={{
              position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              width:140, height:140, pointerEvents:'none'
            }}>
              {[...Array(24)].map((_,i)=>{
                const angle=(i/24)*Math.PI*2
                const inner=30, outer=inner+Math.random()*35+15
                const x1=50+Math.cos(angle)*inner
                const y1=50+Math.sin(angle)*inner
                const x2=50+Math.cos(angle)*outer
                const y2=50+Math.sin(angle)*outer
                return (
                  <line key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#e0c07f" strokeWidth={0.5}
                  />
                )
              })}
            </svg>
            <img src="/lighter.gif" alt="" style={{
              position:'relative', height:80, width:'auto', zIndex:1
            }}/>
          </div>
          <p style={{
            marginTop:8, color:'#f2f2f2',
            fontFamily:'Noto Sans, sans-serif',
            fontSize:14, lineHeight:1.4
          }}>
            Lighter Candle
          </p>
        </div>

        {/* Option 3: Wide Candle */}
        <div
          onClick={(e) => startPlacing('wide', e)}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            padding: '20px',
            borderRadius: '12px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ position:'relative', width:80, height:60, margin:'0 auto' }}>
            <svg viewBox="0 0 100 100" style={{
              position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              width:160, height:140, pointerEvents:'none'
            }}>
              {[...Array(24)].map((_,i)=>{
                const angle=(i/24)*Math.PI*2
                const inner=30, outer=inner+Math.random()*25+15
                const x1=50+Math.cos(angle)*inner
                const y1=50+Math.sin(angle)*inner
                const x2=50+Math.cos(angle)*outer
                const y2=50+Math.sin(angle)*outer
                return (
                  <line key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#ffd700" strokeWidth={0.5}
                  />
                )
              })}
            </svg>
            <img src="/dia.gif" alt="" style={{
              position:'relative', height:60, width:'auto', transform:'scale(1.3)', zIndex:1
            }}/>
          </div>
          <p style={{
            marginTop:8, color:'#f2f2f2',
            fontFamily:'Noto Sans, sans-serif',
            fontSize:14, lineHeight:1.4
          }}>
            Diya Candle
          </p>
        </div>
      </div>

      {/* Instructions text */}
      <div style={{
        position: 'fixed',
        top: 200,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: '#f2f2f2',
        fontFamily: 'Noto Sans, sans-serif',
        fontSize: 15,
        lineHeight: 1.4,
        zIndex: 2
      }}>
        Choose a candle style,<br/>
        place it anywhere in this space,<br/>
        write a note or read one.
      </div>

      {/* Ghost preview */}
      {isPlacing && dragPos && (
        <img 
          src={getCandleStyle(selectedStyle || 'regular').imagePath}
          alt="Ghost"
          style={{
            position:'fixed',
            left:dragPos.x,
            top:dragPos.y,
            transform: `translate(-50%,-100%) ${getCandleStyle(selectedStyle || 'regular').transform}`,
            width: 'auto',
            height: getCandleStyle(selectedStyle || 'regular').height,
            opacity:0.6,
            pointerEvents:'none',
            zIndex:450
          }}
        />
      )}

      {/* Total count */}
      <div style={{
        position:'fixed', bottom:12, right:12,
        background:'rgba(42,42,42,0.9)',
        padding:'6px 10px', borderRadius:4,
        fontFamily:'Noto Sans, sans-serif',
        fontSize:14, color:'#f2f2f2', zIndex:1000
      }}>
        Total candles: {candles.length}
      </div>

      {/* Write-letter bubble */}
      {modal.open && (
        <>
          <div
            onClick={() => setModal({
              open:false, index:null, id:null,
              text:'', emoji:'', showEmojiPicker:false,
              x:0, y:0
            })}
            style={{ position:'fixed', inset:0, zIndex:800 }}
          />

          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: modal.x,
              top: modal.y + 24,
              transform: 'translate(-50%,0)',
              background: '#2a2a2a',
              borderRadius: 12,
              padding: 20,
              maxWidth: 320,
              width: '90vw',
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: 14,
              zIndex: 810
            }}
          >
            {/* arrow */}
            <div style={{
              position:'absolute',
              top:-10, left:'50%',
              transform:'translateX(-50%)',
              borderLeft:'8px solid transparent',
              borderRight:'8px solid transparent',
              borderBottom:'10px solid #2a2a2a'
            }}/>

            <h4 style={{margin:'0 0 8px',fontWeight:400,color:'#f2f2f2'}}>
              Write a letter
            </h4>
            <div style={{margin:'0 0 12px', color:'#999'}}>
              This cannot be deleted
            </div>

            <textarea rows={4}
              placeholder="Your message…"
              value={modal.text}
              onChange={e => setModal(m => ({ ...m, text: e.target.value.slice(0,200) }))}
              style={{
                width:'100%', padding:8,
                border:'1px solid #404040',
                borderRadius:4,
                background:'#1a1a1a',
                color:'#f2f2f2',
                marginBottom:12,
                resize:'vertical'
              }}
            />

            {/* emoji picker */}
            <div style={{marginBottom:12, position:'relative'}}>
              <button
                onClick={() => setModal(m => ({ ...m, showEmojiPicker: !m.showEmojiPicker }))}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 20,
                  minWidth: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  ':hover': {
                    borderColor: '#bbb',
                    background: '#fafafa'
                  }
                }}
              >
                {modal.emoji || '😊'}
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  transform: modal.showEmojiPicker ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease'
                }}>
                  ▼
                </span>
              </button>
              {modal.showEmojiPicker && (
                <div 
                  style={{ 
                    position:'absolute', 
                    top:'100%', 
                    left:0, 
                    zIndex:1001,
                    marginTop: '5px'
                  }}
                >
                  <EmojiPicker
                    onEmojiClick={(emojiObj) => {
                      console.log('Emoji clicked:', emojiObj)
                      setModal(m => ({
                        ...m,
                        emoji: emojiObj.emoji,
                        showEmojiPicker: false
                      }))
                    }}
                    autoFocusSearch={false}
                    width={300}
                    height={400}
                    lazyLoadEmojis={true}
                    theme="light"
                  />
                </div>
              )}
            </div>

            <div style={{
              textAlign:'right', fontSize:12,
              color:'#666', marginBottom:12
            }}>
              {modal.text.length}/200
            </div>

            <button
              onClick={submitModal}
              style={{
                display: 'block',
                margin: '16px auto 0',
                padding: '10px 24px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                ':hover': {
                  background: '#333'
                }
              }}
            >
              SHARE
            </button>
          </div>
        </>
      )}
    </>
  )
}