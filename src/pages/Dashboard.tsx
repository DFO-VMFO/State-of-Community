import { useMemo, useState } from 'react'
import { edition } from '../lib/edition'
import { snapshot } from '../lib/stats'
import { addPoolEntry } from '../lib/store'
import { useCollection } from '../lib/collections'
import { seedServices } from '../lib/catalog'
import type { Household, PoolEntry, Service } from '../lib/types'
import BarList from '../components/BarList'
import Ladder from '../components/Ladder'

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-mute">{hint}</p>}
    </div>
  )
}

export default function Dashboard({ households, pool, refresh }: { households: Household[]; pool: PoolEntry[]; refresh: () => Promise<void> }) {
  const s = useMemo(() => snapshot(households), [households])
  const svc = useCollection<Service>('services', seedServices, true).items
  const balance = pool.reduce((a, e) => a + (e.kind === 'contribution' ? e.amount : -e.amount), 0)
  const [amt, setAmt] = useState(''); const [kind, setKind] = useState<'contribution' | 'claim'>('contribution'); const [note, setNote] = useState('')

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(amt); if (!(amount > 0)) return
    await addPoolEntry({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), kind, amount, note }); setAmt(''); setNote(''); await refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{edition.tagline}</h1>
        <p className="mt-1 max-w-2xl text-mute">Anonymous totals from households who agreed to be counted. Groups smaller than {edition.kMin} are combined so no household can be picked out.</p>
      </div>
      <Ladder n={s.n} />
      {!s.kReady ? (
        <p className="panel p-4 text-sm">Statistics appear once at least {edition.kMin * 2} households have consented. Add households under Members.</p>
      ) : (<>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="People in these households" value={String(s.people)} />
          <Kpi label="Typical household income" value={s.medianBand} hint="Median income band" />
          <Kpi label="Own their home" value={`${s.homeownership}%`} />
          <Kpi label="Without health insurance" value={`${s.uninsured}%`} />
          <Kpi label="Without own life insurance" value={`${s.lifeGap}%`} hint="No policy beyond employer cover" />
          <Kpi label="Degree and job don’t match" value={`${s.mismatch}%`} hint="Of foreign-educated members" />
          <Kpi label="Send money home" value={`${s.remitters}%`} hint={`${s.homeland}% hold property in ${edition.country}`} />
          <Kpi label="Would pay for membership" value={`${s.wtpPct}%`} hint={s.avgWtp ? `Average ${money(s.avgWtp)}/month` : undefined} />
        </div>

        <section className="panel p-4" aria-label="Demand versus supply">
          <h2 className="font-display text-xl font-semibold">What members want vs. what exists</h2>
          <p className="text-sm text-mute">Share of households rating each service essential or high priority.</p>
          <ul className="mt-3 space-y-3">
            {s.demand.map(d0 => { const sv = svc.find(x => x.id === d0.id); const d = { ...d0, launched: sv ? sv.status === 'live' : d0.launched, soon: sv?.status === 'soon' }; return (
              <li key={d.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{d.name} <span className="text-mute">· {d.pillar}</span></span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{d.demandPct}% ({d.households})</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${d.launched ? 'bg-forest-100 text-forest' : 'bg-sun-100 text-ink'}`}>{d.launched ? 'Offered' : d.soon ? 'Opening soon' : 'Gap: not offered yet'}</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-field"><div className="h-full rounded-full bg-sun" style={{ width: `${d.demandPct}%` }} /></div>
              </li>
            )})}
          </ul>
        </section>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <BarList title="Work" data={s.sector} />
          <BarList title="Household income" data={s.income} />
          <BarList title="Housing" data={s.housing} />
          <BarList title="Health insurance" data={s.insurance} />
          <BarList title="Generation" data={s.generation} />
          <BarList title="Biggest missing service" data={s.needs} note="Single answer per household" />
        </div>
      </>)}

      <section className="panel p-4" aria-label="Bereavement pool">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Bereavement pool ledger</h2>
            <p className="max-w-xl text-sm text-mute">Pooled contributions and claims, kept apart from operating money. Repatriation to {edition.country} commonly costs $10,000–$15,000, so the balance is shown against that target. Confirm legal structure with a licensed Texas insurance broker before collecting dues.</p>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums">{money(balance)}<span className="ml-1 text-sm font-normal text-mute">of {money(12500)}</span></p>
        </div>
        <div className="mt-3 h-3 rounded-full bg-field"><div className="h-full rounded-full bg-forest" style={{ width: `${Math.min(100, Math.max(0, (balance / 12500) * 100))}%` }} /></div>
        <form onSubmit={addEntry} className="mt-4 flex flex-wrap items-end gap-2">
          <div><label className="label" htmlFor="pk">Entry</label>
            <select id="pk" className="input" value={kind} onChange={e => setKind(e.target.value as 'contribution' | 'claim')}><option value="contribution">Contribution</option><option value="claim">Claim paid</option></select></div>
          <div><label className="label" htmlFor="pa">Amount ($)</label><input id="pa" className="input w-28" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} /></div>
          <div className="min-w-48 flex-1"><label className="label" htmlFor="pn">Note</label><input id="pn" className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
          <button className="btn-primary">Add entry</button>
        </form>
        <ul className="mt-3 divide-y divide-line text-sm">
          {[...pool].reverse().slice(0, 6).map(e => (
            <li key={e.id} className="flex justify-between py-1.5"><span>{e.date} · {e.note || e.kind}</span><span className={`tabular-nums ${e.kind === 'claim' ? 'text-crane' : ''}`}>{e.kind === 'claim' ? '−' : '+'}{money(e.amount)}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
