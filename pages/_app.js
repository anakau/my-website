// pages/_app.js
import { useEffect } from 'react'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // This function gets called by Google’s script once it loads
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

    // Dynamically inject the Google Translate script
    const script = document.createElement('script')
    script.src =
      '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    document.body.appendChild(script)

    // Cleanup if the component ever unmounts
    return () => {
      delete window.googleTranslateElementInit
      document.body.removeChild(script)
    }
  }, [])

  return (
    <>
      {/* Placeholder for the language selector */}
      <div
        id="google_translate_element"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 999,
          background: 'white',
          padding: '4px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
        }}
      />
      <Component {...pageProps} />
    </>
  )
}