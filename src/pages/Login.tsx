import { LegalLinks } from './Legal'
import { LanguagePicker, useT } from '../lib/i18n'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { edition } from '../lib/edition'
import { useAuth } from '../lib/auth'
import { allRoles, roleInfo } from '../lib/roles'

export default function Login() {
  const { t } = useT()
  const { demoSignIn, noAccess, signOut } = useAuth()
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [hh, setHh] = useState('seed-3'); const [who, setWho] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } })
    if (error) setErr(error.message); else setSent(true); setBusy(false)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-forest px-4 py-8">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h1 className="font-display text-2xl font-bold">{t("Sign in")}</h1>
        <p className="mb-4 mt-1 text-sm text-mute">{edition.name}</p>
        {supabase ? (
          noAccess ? (
            <div role="alert" className="space-y-3 text-sm"><p>We could not find a membership or staff account for <strong>{noAccess}</strong>. Use the email address on your membership, or ask staff to add you.</p><button className="btn-ghost" onClick={signOut}>Try another email</button></div>
          ) : sent ? <p role="status" className="text-sm">Check <strong>{email}</strong> for a sign-in link. You can close this tab.</p> : (
            <form onSubmit={send}>
              <label className="label" htmlFor="em">Email address</label>
              <input id="em" className="input mb-3" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              {err && <p role="alert" className="mb-3 text-sm text-crane">{err}</p>}
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
              <p className="mt-3 text-xs text-mute">Members and staff both sign in here. There is no password to remember.</p>
            </form>
          )
        ) : (
          <div className="space-y-5">
            <p className="rounded-md bg-sun-100 p-2 text-xs">Demo mode: pick who to sign in as. No password needed. Real sign-in is email-link based once Supabase is connected.</p>
            <div><h2 className="font-display text-lg font-semibold">Staff</h2>
              <ul className="mt-2 space-y-2">
                {allRoles.map(r => (
                  <li key={r}><button className="btn-ghost w-full flex-col items-start gap-0 text-left" onClick={() => demoSignIn({ kind: 'staff', role: r, email: `${r}@example.org`, name: `Demo ${roleInfo[r].label.toLowerCase()}` })}>
                    <span>{roleInfo[r].label}</span><span className="text-xs font-normal text-mute">{roleInfo[r].blurb}</span></button></li>))}
              </ul></div>
            <div><h2 className="font-display text-lg font-semibold">Member</h2>
              <div className="mt-2 flex gap-2"><label className="sr-only" htmlFor="mh">Household</label>
                <select id="mh" className="input" value={hh} onChange={e => { setHh(e.target.value); setWho('') }}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={`seed-${i + 1}`}>Demo household {String(i + 1).padStart(2, '0')}</option>)}</select>
                {(hh === 'seed-3' || hh === 'seed-5') && <><label className="sr-only" htmlFor="mw">Person</label><select id="mw" className="input" value={who} onChange={e => setWho(e.target.value)}><option value="">Head</option><option value="p">Partner</option></select></>}
                <button className="btn-primary whitespace-nowrap" onClick={() => demoSignIn(who ? { kind: 'member', householdId: hh, email: `household${hh.split('-')[1]}b@example.com`, personId: `p-partner-${hh}` } : { kind: 'member', householdId: hh, email: `household${hh.split('-')[1]}@example.com` })}>{t("Sign in")}</button></div></div>
          </div>
        )}
        <p className="mt-4 text-center"><LanguagePicker /></p>
        <LegalLinks className="mt-2 text-center" />
      </div>
    </div>
  )
}
