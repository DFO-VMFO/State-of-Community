import { useEffect, useState } from 'react'
import { seedRates } from '../../lib/catalog'
import { useCollection } from '../../lib/collections'
import type { Reminder, ReminderKind, RemitRate } from '../../lib/types'
import Credit from './Credit'
import Vault from './Vault'
import { ownerOf, useMe } from '../../lib/me'
import { daysUntil, longDate, money, type PortalProps } from './shared'

const kinds: ReminderKind[] = ['Green card', 'Work permit', 'Visa or I-94', 'Naturalization', 'Passport', 'Driver’s license', 'Other']
const cost = (r: RemitRate, amt: number) => r.flatFee + (amt * r.fxMarginPct) / 100
const stage = (d: number) => d < 0 ? ['Past due', 'bg-crane text-white'] : d <= 30 ? ['30 days or less', 'bg-crane text-white'] : d <= 90 ? ['90 days or less', 'bg-sun text-ink'] : d <= 180 ? ['180 days or less', 'bg-sun-100 text-sun-700'] : ['On track', 'bg-forest-100 text-forest']

export default function Toolkit({ h, go, focus }: PortalProps & { focus?: string }) {
  const rates = useCollection<RemitRate>('remit_rates', seedRates); const rem = useCollection<Reminder>('reminders', () => [])
  const [amt, setAmt] = useState('300'); const [perYear, setPerYear] = useState('12')
  const [kind, setKind] = useState<ReminderKind>('Green card'); const [person, setPerson] = useState(h.headName.split(' ')[0]); const [date, setDate] = useState(''); const [note, setNote] = useState(''); const [del, setDel] = useState<string | null>(null)
  useEffect(() => { if (focus) document.getElementById(focus)?.scrollIntoView?.({ block: 'start' }) }, [focus])
  const a = Math.max(0, Number(amt) || 0); const n = Math.max(0, Number(perYear) || 0)
  const ranked = [...rates.items].map(r => ({ r, c: cost(r, a) })).sort((x, y) => x.c - y.c)
  const worst = ranked.length ? ranked[ranked.length - 1].c : 0; const best = ranked[0]
  const me = useMe(); const [share, setShare] = useState(false)
  const mine = rem.items.filter(r => r.householdId === h.id && (ownerOf(r) === me.personId || r.shared)).sort((x, y) => x.date.localeCompare(y.date))
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!date) return
    await rem.save({ id: crypto.randomUUID(), householdId: h.id, personId: me.personId, shared: share || undefined, kind, person: person.trim() || 'Me', date, note: note.trim() || undefined }); setDate(''); setNote('')
  }

  return (
    <div className="space-y-8">
      <div><h1 className="font-display text-3xl font-bold">Toolkit</h1><p className="text-mute">Practical tools for families with ties across borders.</p></div>

      <section id="remit" className="space-y-3" aria-label="Remittance savings">
        <h2 className="font-display text-2xl font-semibold">Remittance savings</h2>
        <p className="text-sm text-mute">See what each option costs for the amount you send. We compare and refer. We never hold or move your money.</p>
        <div className="panel flex flex-wrap items-end gap-3 p-4">
          <div><label className="label" htmlFor="ra">Amount per transfer ($)</label><input id="ra" type="number" min="0" className="input w-36" value={amt} onChange={e => setAmt(e.target.value)} /></div>
          <div><label className="label" htmlFor="rn">Transfers per year</label><input id="rn" type="number" min="0" className="input w-32" value={perYear} onChange={e => setPerYear(e.target.value)} /></div>
          {best && a > 0 && <p className="rounded-md bg-forest-100 p-2 text-sm font-medium">Cheapest: {best.r.provider} at {money(best.c)} per transfer. Versus the costliest, that saves about <b>{money((worst - best.c) * n)}</b> a year.</p>}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">{ranked.map(({ r, c }, i) => (
          <li key={r.id} className={`panel p-4 ${i === 0 ? 'ring-2 ring-sun' : ''}`}>
            <div className="flex items-baseline justify-between gap-2"><p className="font-medium">{r.provider}</p>{i === 0 && <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold">Lowest cost</span>}</div>
            <p className="font-display text-2xl font-bold">{money(c)}<span className="text-sm font-normal text-mute"> per transfer</span></p>
            <p className="text-sm text-mute">Fee {money(r.flatFee)} + exchange-rate margin {r.fxMarginPct}% · Arrives: {r.speed}</p>
            {r.note && <p className="mt-1 text-xs text-mute">{r.note}</p>}
          </li>))}</ul>
        <p className="text-xs text-mute">Figures are examples until the team loads checked partner rates. Rates change daily: confirm the final quote with the provider before sending.</p>
      </section>

      <section id="immigration" className="space-y-3" aria-label="Immigration reminders">
        <h2 className="font-display text-2xl font-semibold">Immigration reminders</h2>
        <p className="text-sm text-mute">Add the dates you need to remember. You get nudges 180, 90 and 30 days before. These dates are private: staff cannot see them. This is a reminder tool, not legal advice. For your case, check the official government site or talk to an attorney.</p>
        <form onSubmit={add} className="panel grid gap-3 p-4 sm:grid-cols-5 sm:items-end" aria-label="New reminder">
          <div><label className="label" htmlFor="ik">What</label><select id="ik" className="input" value={kind} onChange={e => setKind(e.target.value as ReminderKind)}>{kinds.map(k => <option key={k}>{k}</option>)}</select></div>
          <div><label className="label" htmlFor="ip">For whom</label><input id="ip" className="input" value={person} onChange={e => setPerson(e.target.value)} /></div>
          <div><label className="label" htmlFor="id">Expires or due</label><input id="id" type="date" required className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="label" htmlFor="in">Note (optional)</label><input id="in" className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} />Share with my household</label>
          <button className="btn-primary">Add reminder</button>
        </form>
        <ul className="space-y-2">{mine.map(r => { const d = daysUntil(r.date); const st = stage(d); return (
          <li key={r.id} className="panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div><p className="font-medium">{r.kind} · {r.person}</p><p className="text-sm text-mute">{longDate(r.date)}{d >= 0 ? ` · ${d} days left` : ` · ${-d} days ago`}{r.note ? ` · ${r.note}` : ''}</p></div>
            <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st[1]}`}>{st[0]}</span>
              {d <= 180 && <button className="btn-ghost" onClick={() => go('account', { cat: 'legal' })}>Find an attorney</button>}
              {del === r.id ? <><button className="btn-ghost text-crane" onClick={() => void rem.remove(r.id)}>Confirm</button><button className="btn-ghost" onClick={() => setDel(null)}>Keep</button></> : <button className="btn-ghost" onClick={() => setDel(r.id)}>Remove</button>}</div>
          </li>) })}
          {!mine.length && <li className="panel p-4 text-mute">No reminders yet. Start with the date that matters most.</li>}</ul>
      </section>

      <Credit h={h} go={go} />

      <Vault h={h} />
    </div>
  )
}
