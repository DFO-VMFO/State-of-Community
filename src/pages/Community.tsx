import { useState } from 'react'
import { seedRates, seedClubs, seedEvents, seedMemberships, seedRsvps, seedServices, seedWaitlist } from '../lib/catalog'
import { useCollection, useCounts } from '../lib/collections'
import type { Club, EventItem, EventKind, Hue, RemitRate, Service, ServiceStatus, Suggestion } from '../lib/types'

const kinds: EventKind[] = ['town hall', 'workshop', 'clinic', 'social', 'club', 'fundraiser']
const hues: Hue[] = ['forest', 'sun', 'crane', 'teal', 'plum']
const blank = (): EventItem => ({ id: '', title: '', kind: 'workshop', date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), start: '18:30', end: '20:00', place: '', about: '' })

// Staff side of the member portal: what services show as open, the calendar, and the clubs.
export default function Community() {
  const [tab, setTab] = useState<'services' | 'events' | 'clubs' | 'ideas' | 'rates'>('services')
  const svc = useCollection<Service>('services', seedServices, true); const ev = useCollection<EventItem>('events', seedEvents); const clubs = useCollection<Club>('clubs', seedClubs)
  const wl = useCollection('waitlist', seedWaitlist); const ms = useCollection('memberships', seedMemberships); const rs = useCollection('rsvps', seedRsvps)
  const waitN = useCounts('waitlist', 'serviceId', seedWaitlist, wl.items.length); const clubN = useCounts('memberships', 'clubId', seedMemberships, ms.items.length); const rsN = useCounts('rsvps', 'eventId', seedRsvps, rs.items.length)
  const [draft, setDraft] = useState<EventItem | null>(null); const [del, setDel] = useState<string | null>(null)
  const sg = useCollection<Suggestion>('suggestions', () => []); const rates = useCollection<RemitRate>('remit_rates', seedRates)
  const [cdraft, setCdraft] = useState<Club | null>(null)

  async function saveEvent(e: React.FormEvent) { e.preventDefault(); if (!draft) return; await ev.save({ ...draft, id: draft.id || crypto.randomUUID() }); setDraft(null) }
  async function saveClub(e: React.FormEvent) { e.preventDefault(); if (!cdraft) return; await clubs.save({ ...cdraft, id: cdraft.id || crypto.randomUUID(), focus: cdraft.focus }); setCdraft(null) }

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Community programs</h1><p className="text-mute">What members see in their portal. Changes show up immediately.</p></div>
      <div className="flex gap-2" role="tablist">{(['services', 'events', 'clubs', 'ideas', 'rates'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? 'border-forest bg-forest text-white' : 'border-line bg-white'}`}>{t}</button>)}</div>

      {tab === 'services' && <section className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Service catalog</caption>
        <thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Opens</th><th className="p-3 text-right">Votes</th></tr></thead>
        <tbody>{svc.items.map(s => (
          <tr key={s.id} className="border-b border-line last:border-0"><td className="p-3 font-medium">{s.name}<span className="block text-xs font-normal text-mute">{s.pillar}</span></td>
            <td className="p-3"><label className="sr-only" htmlFor={`st${s.id}`}>Status of {s.name}</label><select id={`st${s.id}`} className="input py-1" value={s.status} onChange={e => void svc.save({ ...s, status: e.target.value as ServiceStatus })}><option value="live">Open now</option><option value="soon">Opening soon</option><option value="interest">Gathering interest</option></select></td>
            <td className="p-3"><label className="sr-only" htmlFor={`op${s.id}`}>Opening date of {s.name}</label><input id={`op${s.id}`} className="input w-32 py-1" placeholder="Spring 2027" value={s.opens ?? ''} onChange={e => void svc.save({ ...s, opens: e.target.value })} /></td>
            <td className="p-3 text-right tabular-nums">{waitN[s.id] ?? 0}</td></tr>))}</tbody></table>
        <p className="p-3 text-xs text-mute">Members have 5 votes each. Setting a service to “Open now” also marks it Offered on the dashboard’s “What members want vs. what exists”.</p></section>}

      {tab === 'ideas' && <ul className="panel divide-y divide-line">{[...sg.items].sort((a, b) => b.at.localeCompare(a.at)).map(x => (
        <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{x.text} <span className="text-mute">· {x.at}</span></span>
          <button className="btn-ghost" onClick={() => void sg.save({ ...x, status: x.status === 'new' ? 'reviewed' : 'new' })}>{x.status === 'new' ? 'Mark reviewed' : 'Reviewed ✓'}</button></li>))}
        {!sg.items.length && <li className="p-4 text-mute">No suggestions yet. Members send them from the Services page.</li>}</ul>}

      {tab === 'rates' && <section className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Remittance partner rates</caption>
        <thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Provider</th><th className="p-3">Flat fee ($)</th><th className="p-3">FX margin (%)</th><th className="p-3">Speed</th></tr></thead>
        <tbody>{rates.items.map(r => (<tr key={r.id} className="border-b border-line last:border-0">
          <td className="p-3"><label className="sr-only" htmlFor={`rp${r.id}`}>Provider</label><input id={`rp${r.id}`} className="input py-1" value={r.provider} onChange={e => void rates.save({ ...r, provider: e.target.value })} /></td>
          <td className="p-3"><label className="sr-only" htmlFor={`rf${r.id}`}>Flat fee</label><input id={`rf${r.id}`} type="number" step="0.01" className="input w-24 py-1" value={r.flatFee} onChange={e => void rates.save({ ...r, flatFee: Number(e.target.value) })} /></td>
          <td className="p-3"><label className="sr-only" htmlFor={`rm${r.id}`}>FX margin</label><input id={`rm${r.id}`} type="number" step="0.1" className="input w-24 py-1" value={r.fxMarginPct} onChange={e => void rates.save({ ...r, fxMarginPct: Number(e.target.value) })} /></td>
          <td className="p-3"><label className="sr-only" htmlFor={`rs${r.id}`}>Speed</label><input id={`rs${r.id}`} className="input w-32 py-1" value={r.speed} onChange={e => void rates.save({ ...r, speed: e.target.value })} /></td></tr>))}</tbody></table>
        <p className="p-3 text-xs text-mute">These are the numbers members see in the Remittance savings tool. Use checked partner rates and update them often. Replace the sample rows before launch.</p></section>}

      {tab === 'events' && <div className="space-y-3">
        <button className="btn-primary" onClick={() => setDraft(blank())}>New event</button>
        {draft && <form onSubmit={saveEvent} className="panel grid gap-3 p-4 sm:grid-cols-4" aria-label="Event">
          <div className="sm:col-span-2"><label className="label" htmlFor="et">Title</label><input id="et" required className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
          <div><label className="label" htmlFor="ek">Type</label><select id="ek" className="input" value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as EventKind })}>{kinds.map(k => <option key={k}>{k}</option>)}</select></div>
          <div><label className="label" htmlFor="ec">Club (optional)</label><select id="ec" className="input" value={draft.clubId ?? ''} onChange={e => setDraft({ ...draft, clubId: e.target.value || undefined })}><option value="">None</option>{clubs.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="ed">Date</label><input id="ed" type="date" required className="input" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></div>
          <div><label className="label" htmlFor="es">Starts</label><input id="es" type="time" className="input" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></div>
          <div><label className="label" htmlFor="ee">Ends</label><input id="ee" type="time" className="input" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} /></div>
          <div><label className="label" htmlFor="ep">Place</label><input id="ep" required className="input" value={draft.place} onChange={e => setDraft({ ...draft, place: e.target.value })} /></div>
          <div className="sm:col-span-4"><label className="label" htmlFor="ea">About</label><textarea id="ea" className="input" rows={2} value={draft.about} onChange={e => setDraft({ ...draft, about: e.target.value })} /></div>
          <div className="flex gap-2 sm:col-span-4"><button className="btn-primary">Save event</button><button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button></div></form>}
        <ul className="panel divide-y divide-line">{[...ev.items].sort((a, b) => a.date.localeCompare(b.date)).map(e => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span><b>{e.title}</b> · {e.date} · {e.kind} · {e.place}</span>
            <span className="flex items-center gap-2"><span className="text-mute">{rsN[e.id] ?? 0} RSVPs</span><button className="btn-ghost" onClick={() => setDraft(e)}>Edit</button>
              {del === e.id ? <><button className="btn-ghost text-crane" onClick={() => void ev.remove(e.id)}>Confirm delete</button><button className="btn-ghost" onClick={() => setDel(null)}>Keep</button></> : <button className="btn-ghost" onClick={() => setDel(e.id)}>Delete</button>}</span></li>))}</ul></div>}

      {tab === 'clubs' && <div className="space-y-3">
        <button className="btn-primary" onClick={() => setCdraft({ id: '', name: '', tagline: '', about: '', meets: '', lead: '', focus: [], motif: 0, hue: 'forest' })}>New club</button>
        {cdraft && <form onSubmit={saveClub} className="panel grid gap-3 p-4 sm:grid-cols-2" aria-label="Club">
          <div><label className="label" htmlFor="cn">Name</label><input id="cn" required className="input" value={cdraft.name} onChange={e => setCdraft({ ...cdraft, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="ct">Tagline</label><input id="ct" className="input" value={cdraft.tagline} onChange={e => setCdraft({ ...cdraft, tagline: e.target.value })} /></div>
          <div><label className="label" htmlFor="cm">When it meets</label><input id="cm" className="input" value={cdraft.meets} onChange={e => setCdraft({ ...cdraft, meets: e.target.value })} /></div>
          <div><label className="label" htmlFor="cl">Club lead</label><input id="cl" className="input" value={cdraft.lead} onChange={e => setCdraft({ ...cdraft, lead: e.target.value })} /></div>
          <div><label className="label" htmlFor="cf">Topics (comma separated)</label><input id="cf" className="input" value={cdraft.focus.join(', ')} onChange={e => setCdraft({ ...cdraft, focus: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></div>
          <div><label className="label" htmlFor="cc">Color</label><select id="cc" className="input" value={cdraft.hue} onChange={e => setCdraft({ ...cdraft, hue: e.target.value as Hue })}>{hues.map(x => <option key={x}>{x}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ca">About</label><textarea id="ca" className="input" rows={2} value={cdraft.about} onChange={e => setCdraft({ ...cdraft, about: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="cno">Pinned note for members (optional)</label><input id="cno" className="input" value={cdraft.note ?? ''} onChange={e => setCdraft({ ...cdraft, note: e.target.value || undefined })} /></div>
          <div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Save club</button><button type="button" className="btn-ghost" onClick={() => setCdraft(null)}>Cancel</button></div></form>}
        <ul className="panel divide-y divide-line">{clubs.items.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span><b>{c.name}</b> · {c.meets}</span><span className="flex items-center gap-2"><span className="text-mute">{clubN[c.id] ?? 0} households</span><button className="btn-ghost" onClick={() => setCdraft(c)}>Edit</button></span></li>)}</ul></div>}
    </div>
  )
}
