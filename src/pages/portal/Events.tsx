import { useMemo, useState } from 'react'
import { seedEvents, seedRsvps, seedClubs } from '../../lib/catalog'
import { useCollection, useCounts } from '../../lib/collections'
import type { Club, EventItem, EventKind, Rsvp } from '../../lib/types'
import { clock, embedded, longDate, type PortalProps } from './shared'

const kindStyle: Record<EventKind, string> = { 'town hall': 'bg-forest text-white', workshop: 'bg-sun text-ink', clinic: 'bg-[#1F7A8C] text-white', social: 'bg-[#6B3F69] text-white', club: 'bg-forest-100 text-forest', fundraiser: 'bg-crane text-white' }
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function ics(e: EventItem) {
  const t = (d: string, h: string) => d.replace(/-/g, '') + 'T' + h.replace(':', '') + '00'
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:${e.id}@state-of-community`, `DTSTART:${t(e.date, e.start)}`, `DTEND:${t(e.date, e.end)}`, `SUMMARY:${e.title}`, `LOCATION:${e.place}`, `DESCRIPTION:${e.about}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
}

export default function Events({ h }: PortalProps) {
  const ev = useCollection<EventItem>('events', seedEvents); const rs = useCollection<Rsvp>('rsvps', seedRsvps); const clubs = useCollection<Club>('clubs', seedClubs)
  const counts = useCounts('rsvps', 'eventId', seedRsvps, rs.items.length)
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d }); const [day, setDay] = useState<string | null>(null)
  const mine = (id: string) => rs.items.find(r => r.eventId === id && r.householdId === h.id)
  const byDay = useMemo(() => { const m: Record<string, EventItem[]> = {}; ev.items.forEach(e => (m[e.date] ??= []).push(e)); return m }, [ev.items])
  const first = new Date(month); const pad = first.getDay(); const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: pad + days }, (_, i) => (i < pad ? null : new Date(first.getFullYear(), first.getMonth(), i - pad + 1)))
  const today = ymd(new Date()); const clubName = (id?: string) => clubs.items.find(c => c.id === id)?.name
  const shown = (day ? (byDay[day] ?? []) : ev.items.filter(e => e.date >= today && e.date.slice(0, 7) >= ymd(month).slice(0, 7)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)).slice().sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  const rsvp = async (e: EventItem, status: Rsvp['status'] | null, guests = 0) => {
    const id = `${e.id}:${h.id}`; if (!status) await rs.remove(id); else await rs.save({ id, eventId: e.id, householdId: h.id, status, guests })
  }

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Community calendar</h1><p className="text-mute">Town halls, workshops, clinics, club meetings and gatherings. Say you’re coming so we can plan seats and food.</p></div>
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <section className="panel h-fit p-4" aria-label="Calendar">
          <div className="mb-2 flex items-center justify-between">
            <button className="btn-ghost px-2" aria-label="Previous month" onClick={() => { setDay(null); setMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1)) }}>‹</button>
            <h2 className="font-display text-lg font-semibold">{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-ghost px-2" aria-label="Next month" onClick={() => { setDay(null); setMonth(new Date(first.getFullYear(), first.getMonth() + 1, 1)) }}>›</button></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-mute">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => { if (!d) return <span key={i} />; const k = ymd(d); const es = byDay[k] ?? []; const going = es.some(e => mine(e.id)?.status === 'going')
              return (
                <button key={i} onClick={() => setDay(day === k ? null : k)} aria-label={`${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${es.length ? `, ${es.length} event${es.length > 1 ? 's' : ''}` : ''}`} aria-pressed={day === k}
                  className={`relative aspect-square rounded-md text-sm ${day === k ? 'bg-forest text-white' : k === today ? 'border border-sun font-bold' : es.length ? 'bg-forest-100 font-semibold' : 'hover:bg-field'}`}>
                  {d.getDate()}{es.length > 0 && <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${going ? 'bg-sun' : day === k ? 'bg-white' : 'bg-forest'}`} />}
                </button>) })}
          </div>
          <p className="mt-2 text-xs text-mute"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sun" />Gold dot: you are going.</p>
        </section>
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">{day ? longDate(day) : 'Coming up'}</h2>
          {shown.map(e => { const r = mine(e.id); const n = counts[e.id] ?? 0; return (
            <article key={e.id} className="panel flex gap-4 p-4">
              <div className="w-14 shrink-0 rounded-lg bg-field p-1 text-center"><p className="text-xs font-semibold uppercase text-mute">{new Date(e.date + 'T12:00').toLocaleDateString('en-US', { month: 'short' })}</p><p className="font-display text-2xl font-bold leading-none">{e.date.slice(8)}</p></div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${kindStyle[e.kind]}`}>{e.kind}</span>{clubName(e.clubId) && <span className="text-xs text-mute">{clubName(e.clubId)}</span>}</div>
                <h3 className="font-display text-lg font-semibold leading-tight">{e.title}</h3>
                <p className="text-sm text-mute">{longDate(e.date)}, {clock(e.start)} to {clock(e.end)} · {e.place}</p>
                <p className="text-sm">{e.about}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button aria-pressed={r?.status === 'going'} className={r?.status === 'going' ? 'btn-primary' : 'btn-ghost'} onClick={() => void rsvp(e, r?.status === 'going' ? null : 'going', r?.guests ?? 0)}>{r?.status === 'going' ? '✓ Going' : 'I’m going'}</button>
                  <button aria-pressed={r?.status === 'maybe'} className={r?.status === 'maybe' ? 'btn-primary' : 'btn-ghost'} onClick={() => void rsvp(e, r?.status === 'maybe' ? null : 'maybe', r?.guests ?? 0)}>Maybe</button>
                  {r && <label className="flex items-center gap-1 text-sm">Guests<select className="input w-16 py-1" value={r.guests} onChange={x => void rsvp(e, r.status, Number(x.target.value))}>{[0, 1, 2, 3, 4, 5].map(g => <option key={g}>{g}</option>)}</select></label>}
                  {!embedded && <a className="btn-ghost" download={`${e.title}.ics`} href={ics(e)}>Add to my calendar</a>}
                  {n >= 5 && <span className="text-xs text-mute">{n} households going</span>}
                </div>
              </div>
            </article>) })}
          {!shown.length && <p className="panel p-6 text-center text-mute">{day ? 'Nothing is scheduled that day.' : 'No upcoming events yet. Check back soon.'}</p>}
        </div>
      </div>
    </div>
  )
}
