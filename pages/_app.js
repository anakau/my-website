// pages/_app.js
import { useEffect } from 'react'
import '../styles/globals.css'
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 1) Define the callback Google will call once its script loads
    window.googleTranslateElementInit = () => {
      /* global google */
      new google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        },
        'google_translate_element'
      )
    }

    // 2) Dynamically inject Google's Translate script
    const script = document.createElement('script')
    script.src =
      '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    document.body.appendChild(script)

    // 3) Clean up on unmount
    return () => {
      delete window.googleTranslateElementInit
      document.body.removeChild(script)
    }
  }, [])

  return (
    <>
      {/* Google Translate target */}
      <div
        id="google_translate_element"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 999,
          background: 'white',
          padding: '4px',
          borderRadius: '4px'
        }}
      />

      {/* Your page content */}
      <Component {...pageProps} />

      {/* Vercel Edge Analytics */}
      <Analytics />
    </>
  )
}