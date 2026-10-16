import { useState } from 'react'
import { useT } from '../../lib/i18n'
import { useMe } from '../../lib/me'
import type { Household } from '../../lib/types'

// Household members: each adult has their own sign-in and private space. Dues, card, goals, clubs and events stay shared.
export default function People({ h }: { h: Household }) {
  const { t } = useT(); const me = useMe(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [err, setErr] = useState(''); const [del, setDel] = useState<string | null>(null)
  const taken = (e: string) => me.people.some(p => p.email.toLowerCase() === e.toLowerCase())
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter a name and a valid email.')
    if (taken(email.trim())) return setErr('That email is already in your household.')
    try { await me.savePerson({ id: `p-${crypto.randomUUID()}`, householdId: h.id, name: name.trim(), email: email.trim().toLowerCase(), role: 'partner', status: 'invited', invitedBy: me.personId, at: new Date().toISOString().slice(0, 10) }); setName(''); setEmail('') }
    catch { setErr('Could not add this person. The email may belong to another household.') }
  }
  return (
    <section className="panel space-y-3 p-4" aria-label="People in your household">
      <h2 className="font-display text-xl font-semibold">{t('People in your household')}</h2>
      <p className="text-sm text-mute">Each adult signs in with their own email. Dues, your member card, family goals, clubs and events are shared. Immigration dates, papers, credit goals, service votes and setup progress stay private to each person.</p>
      <ul className="divide-y divide-line text-sm">{me.people.map(p => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><b>{p.name}</b>{p.id === me.personId && ' (you)'} <span className="text-mute">· {p.email} · {p.role === 'head' ? 'Head of household' : 'Adult'} · {p.status === 'invited' ? 'Invited, not signed in yet' : 'Active'}</span></span>
          {me.isHead && p.role !== 'head' && (del === p.id
            ? <span className="flex gap-2"><button className="btn-ghost text-crane" onClick={async () => { await me.removePerson(p.id); setDel(null) }}>Confirm remove</button><button className="btn-ghost" onClick={() => setDel(null)}>Cancel</button></span>
            : <button className="btn-ghost" onClick={() => setDel(p.id)}>{t('Remove')}</button>)}
        </li>))}</ul>
      {me.isHead ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="label" htmlFor="pe">Email</label><input id="pe" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <button className="btn-primary">{t('Add adult')}</button>
          {err && <p role="alert" className="w-full text-sm text-crane">{err}</p>}
        </form>) : <p className="text-xs text-mute">Only the head of household can add or remove people. To move the head role or split into two households, contact the community team.</p>}
    </section>
  )
}
