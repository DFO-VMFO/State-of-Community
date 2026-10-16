import { useState } from 'react'
import { edition } from '../../lib/edition'
import { seedClubs, seedEvents, seedMemberships } from '../../lib/catalog'
import { useCollection, useCounts } from '../../lib/collections'
import { Motif } from '../../components/Motif'
import type { Club, EventItem, Membership } from '../../lib/types'
import { clock, longDate, type PortalProps } from './shared'

export default function Clubs({ h, go }: PortalProps) {
  const clubs = useCollection<Club>('clubs', seedClubs); const ms = useCollection<Membership>('memberships', seedMemberships); const ev = useCollection<EventItem>('events', seedEvents)
  const counts = useCounts('memberships', 'clubId', seedMemberships, ms.items.length)
  const mine = new Set(ms.items.filter(m => m.householdId === h.id).map(m => m.clubId)); const [sel, setSel] = useState<string | null>(null); const [msg, setMsg] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const toggle = async (c: Club) => {
    const id = `${c.id}:${h.id}`
    if (mine.has(c.id)) { await ms.remove(id); setMsg(`You left ${c.name}.`) } else { await ms.save({ id, clubId: c.id, householdId: h.id, joinedAt: today }); setMsg(`Welcome to ${c.name}! See the next meeting below.`) }
  }
  const sorted = [...clubs.items].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)))
  const c = clubs.items.find(x => x.id === sel)

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Clubs</h1><p className="text-mute">Small groups built around what you want to do. Join as many as you like, and leave any time.</p></div>
      {msg && <p role="status" className="rounded-md bg-forest-100 p-2 text-sm font-medium">{msg}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(k => { const n = counts[k.id] ?? 0; const on = mine.has(k.id); return (
          <article key={k.id} className={`panel overflow-hidden ${sel === k.id ? 'ring-2 ring-sun' : ''}`}>
            <div className="relative h-24"><Motif n={k.motif} hue={k.hue} className="absolute inset-0" />
              {on && <span className="absolute right-3 top-3 rounded-full bg-sun px-2.5 py-0.5 text-xs font-bold text-ink">Member</span>}
              <h2 className="absolute bottom-2 left-3 right-3 font-display text-xl font-bold leading-tight text-white drop-shadow">{k.name}</h2></div>
            <div className="space-y-2 p-4">
              <p className="text-sm font-medium">{k.tagline}</p>
              <p className="text-xs text-mute">{k.meets}{n >= edition.kMin ? ` · ${n} households` : ' · New club'}</p>
              <div className="flex flex-wrap gap-1">{k.focus.map(f => <span key={f} className="rounded bg-field px-2 py-0.5 text-xs">{f}</span>)}</div>
              <div className="flex gap-2 pt-1">
                <button aria-pressed={on} className={on ? 'btn-ghost' : 'btn-primary'} onClick={() => void toggle(k)}>{on ? 'Leave club' : 'Join club'}</button>
                <button className="btn-ghost" aria-expanded={sel === k.id} onClick={() => setSel(sel === k.id ? null : k.id)}>{sel === k.id ? 'Close' : 'Details'}</button></div>
            </div>
          </article>) })}
      </div>
      {c && (
        <section className="panel space-y-3 p-5" aria-label={`${c.name} details`}>
          <h2 className="font-display text-2xl font-bold">{c.name}</h2><p>{c.about}</p>
          {c.note && <p className="rounded-md bg-sun-100 p-2 text-sm font-medium">📌 {c.note}</p>}
          <p className="text-sm text-mute">Meets: {c.meets} · Led by {c.lead}</p>
          <h3 className="font-display text-lg font-semibold">Coming up</h3>
          <ul className="divide-y divide-line text-sm">
            {ev.items.filter(e => e.clubId === c.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).map(e => <li key={e.id} className="flex justify-between gap-2 py-2"><span><b>{e.title}</b> · {longDate(e.date)}, {clock(e.start)}</span><button className="underline" onClick={() => go('events')}>See event</button></li>)}
            {!ev.items.some(e => e.clubId === c.id && e.date >= today) && <li className="py-2 text-mute">No meetings are scheduled yet.</li>}
          </ul>
        </section>)}
    </div>
  )
}
