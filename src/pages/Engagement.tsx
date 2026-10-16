import { useState } from 'react'
import { useCollection } from '../lib/collections'
import { seedTelemetry } from '../lib/telemetry'
import type { OutboxItem } from '../lib/outbox'
import { services } from '../lib/edition'
import type { Household, Telemetry } from '../lib/types'

const DAY = 86400000
const label: Record<string, string> = { home: 'Home', services: 'Services', goals: 'Goals', events: 'Events', clubs: 'Clubs', toolkit: 'Toolkit', account: 'Account', about: 'About us' }
const mins = (ms: number) => ms >= 60000 ? `${(ms / 60000).toFixed(1)} min` : `${Math.round(ms / 1000)} s`
function Bars({ rows, max, unit = '' }: { rows: [string, number][]; max?: number; unit?: string }) {
  const m = max ?? Math.max(1, ...rows.map(r => r[1]))
  return <ul className="space-y-1.5 text-sm">{rows.map(([k, v]) => <li key={k} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2"><span className="truncate">{k}</span><span className="h-3 rounded bg-line"><span className="block h-3 rounded bg-forest" style={{ width: `${(v / m) * 100}%` }} /></span><span className="text-right text-mute">{v}{unit}</span></li>)}</ul>
}

// Aggregates only. Households appear by member code; nobody sees what a member typed or uploaded.
export default function Engagement({ households }: { households: Household[] }) {
  const tel = useCollection<Telemetry>('telemetry', seedTelemetry); const out = useCollection<OutboxItem>('outbox', () => [])
  const [msg, setMsg] = useState(''); const now = Date.now(); const ev = tel.items
  const uniq = (days: number) => new Set(ev.filter(e => now - Date.parse(e.at) < days * DAY && e.type !== 'action').map(e => e.personId)).size
  const [dau, wau, mau] = [uniq(1), uniq(7), uniq(30)]
  const weeks = Array.from({ length: 12 }, (_, w) => { const to = now - w * 7 * DAY, from = to - 7 * DAY; return [new Date(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), new Set(ev.filter(e => { const t = Date.parse(e.at); return t >= from && t < to }).map(e => e.householdId)).size] as [string, number] }).reverse()
  const everSeen = new Set(ev.map(e => e.householdId)); const active30 = new Set(ev.filter(e => now - Date.parse(e.at) < 30 * DAY).map(e => e.householdId))
  const voted = new Set(ev.filter(e => e.type === 'vote').map(e => e.householdId)); const used = (s: string) => new Set(ev.filter(e => e.screen === s).map(e => e.householdId)).size
  const members = households.filter(h => h.status === 'active').length
  const funnel: [string, number][] = [['Active members', members], ['Signed in at least once', everSeen.size], ['Active in last 30 days', active30.size], ['Cast a service vote', voted.size], ['Used the Toolkit', used('toolkit')]]
  const views = ev.filter(e => e.type === 'view' && e.ms); const byScreen = Object.keys(label).map(s => { const v = views.filter(e => e.screen === s); return { s, total: v.reduce((a, e) => a + (e.ms ?? 0), 0), avg: v.length ? v.reduce((a, e) => a + (e.ms ?? 0), 0) / v.length : 0, n: v.length } }).sort((a, b) => b.total - a.total)
  const months = [2, 1, 0].map(k => { const d = new Date(); d.setMonth(d.getMonth() - k, 1); return d.toISOString().slice(0, 7) })
  const voteRows = services.map(s => { const v = ev.filter(e => e.type === 'vote' && e.ref === s.id); return { name: s.name, by: months.map(m => v.filter(e => e.at.startsWith(m)).length), total: v.length } }).filter(r => r.total).sort((a, b) => b.total - a.total).slice(0, 10)
  const last = new Map<string, number>(); ev.forEach(e => last.set(e.householdId, Math.max(last.get(e.householdId) ?? 0, Date.parse(e.at))))
  const slipping = households.filter(h => h.status === 'active').map(h => ({ h, days: last.has(h.id) ? Math.floor((now - last.get(h.id)!) / DAY) : null })).filter(x => x.days === null || x.days >= 21).sort((a, b) => (b.days ?? 999) - (a.days ?? 999))
  async function nudge(h: Household) {
    const key = `checkin:${h.id}:${new Date().toISOString().slice(0, 7)}`
    if (out.items.some(o => o.key === key)) return setMsg(`A check-in for ${h.memberCode} is already queued this month.`)
    await out.save({ id: key, key, householdId: h.id, channel: h.whatsappOptIn && h.phone ? 'whatsapp' : 'email', kind: 'checkin', subject: 'Thinking of you', body: 'We have missed you. Here is what is new this month, and a person you can talk to if anything has changed for your family.', sendOn: new Date().toISOString().slice(0, 10), status: 'queued' })
    setMsg(`Private check-in queued for ${h.memberCode}. It goes out with the next send. You can cancel it below.`)
  }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-bold">Engagement</h1><p className="text-mute">How members use the portal. Totals and member codes only. We do not rank households, and members can turn tracking off in Account.</p></div>
      <section className="grid gap-3 sm:grid-cols-4" aria-label="Active people">
        {[['Today', dau], ['Last 7 days', wau], ['Last 30 days', mau], ['Stickiness', mau ? Math.round((dau / mau) * 100) + '%' : '–']].map(([k, v]) => <div key={k} className="panel p-4"><p className="text-sm text-mute">{k}</p><p className="font-display text-3xl font-bold">{v}</p></div>)}</section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel space-y-2 p-4" aria-label="Weekly households"><h2 className="font-display text-xl font-semibold">Households active each week</h2><Bars rows={weeks} /></section>
        <section className="panel space-y-2 p-4" aria-label="Funnel"><h2 className="font-display text-xl font-semibold">Where members drop off</h2><Bars rows={funnel} max={members || 1} /></section>
        <section className="panel space-y-2 p-4" aria-label="Screen time"><h2 className="font-display text-xl font-semibold">Screen time (last 90 days)</h2>
          <table className="w-full text-sm"><thead><tr className="text-left text-mute"><th>Screen</th><th>Total</th><th>Per visit</th><th>Visits</th></tr></thead><tbody>{byScreen.map(r => <tr key={r.s} className="border-t border-line"><td className="py-1">{label[r.s]}</td><td>{mins(r.total)}</td><td>{mins(r.avg)}</td><td>{r.n}</td></tr>)}</tbody></table></section>
        <section className="panel space-y-2 p-4" aria-label="Votes by service"><h2 className="font-display text-xl font-semibold">Service votes over time</h2>
          <table className="w-full text-sm"><thead><tr className="text-left text-mute"><th>Service</th>{months.map(m => <th key={m}>{new Date(m + '-15').toLocaleDateString('en-US', { month: 'short' })}</th>)}<th>All</th></tr></thead><tbody>{voteRows.map(r => <tr key={r.name} className="border-t border-line"><td className="py-1 pr-2">{r.name}</td>{r.by.map((n, i) => <td key={i}>{n}</td>)}<td className="font-medium">{r.total}</td></tr>)}{!voteRows.length && <tr><td className="py-2 text-mute" colSpan={5}>No votes yet.</td></tr>}</tbody></table></section>
      </div>
      <section className="panel space-y-2 p-4" aria-label="Slipping away"><h2 className="font-display text-xl font-semibold">Quiet for three weeks or more ({slipping.length})</h2>
        <p className="text-sm text-mute">A private, personal check-in works better than a public ranking. This queues one message for review, never a leaderboard.</p>
        {msg && <p role="status" className="rounded-md bg-forest-100 p-2 text-sm">{msg}</p>}
        <ul className="divide-y divide-line text-sm">{slipping.slice(0, 12).map(({ h, days }) => <li key={h.id} className="flex items-center justify-between gap-2 py-2"><span><b>{h.memberCode}</b> <span className="text-mute">· {days === null ? 'never signed in' : `last seen ${days} days ago`}</span></span><button className="btn-ghost" onClick={() => void nudge(h)}>Queue check-in</button></li>)}
          {!slipping.length && <li className="py-2 text-mute">Everyone has been in recently.</li>}</ul></section>
      <section className="panel space-y-2 p-4" aria-label="Waiting to send"><h2 className="font-display text-xl font-semibold">Waiting to send ({out.items.filter(o => o.status === 'queued').length})</h2>
        <ul className="divide-y divide-line text-sm">{out.items.filter(o => o.status === 'queued').slice(0, 20).map(o => <li key={o.id} className="flex items-center justify-between gap-2 py-2"><span><b>{households.find(h => h.id === o.householdId)?.memberCode ?? o.householdId}</b> <span className="text-mute">· {o.kind} · {o.channel} · {o.subject}</span></span><button className="btn-ghost" onClick={() => void out.save({ ...o, status: 'skipped', reason: 'Cancelled by staff' })}>Cancel</button></li>)}
          {!out.items.some(o => o.status === 'queued') && <li className="py-2 text-mute">Nothing is waiting.</li>}</ul></section>
    </div>
  )
}
