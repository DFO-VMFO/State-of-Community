import { useEffect, useState } from 'react'
import { useT } from '../../lib/i18n'

interface BIP extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

// "Add to Home Screen": one tap on Android and desktop Chrome, a short how-to on iPhone.
export default function Install() {
  const { t } = useT(); const [ev, setEv] = useState<BIP | null>(null); const [done, setDone] = useState(standalone())
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEv(e as BIP) }; const ok = () => setDone(true)
    window.addEventListener('beforeinstallprompt', on); window.addEventListener('appinstalled', ok)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', ok) }
  }, [])
  if (done) return null
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return (
    <section className="panel space-y-2 p-4" aria-label="Install the app">
      <h2 className="font-display text-xl font-semibold">{t('Put it on your home screen')}</h2>
      <p className="text-sm text-mute">Open your membership like an app: one tap, full screen, and it still opens when your signal is weak.</p>
      {ev && <button className="btn-primary" onClick={() => void ev.prompt().then(() => ev.userChoice).then(c => { if (c.outcome === 'accepted') setDone(true); setEv(null) })}>{t('Install app')}</button>}
      {!ev && ios && <p className="text-sm">On iPhone: tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>.</p>}
      {!ev && !ios && <p className="text-sm text-mute">On Android: open the browser menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p>}
    </section>
  )
}
