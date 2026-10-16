import { useMemo, useState } from 'react'
import { projection } from '../lib/stats'

type P = Parameters<typeof projection>[0]
const presets: Record<string, P> = {
  'Pilot (50 households)': { households: 50, standardShare: 0, premiumShare: 0, basicPrice: 10, standardPrice: 15, premiumPrice: 30, commissionPerHh: 0, utilization: 0, listings: 0, listingPrice: 50, sponsorships: 1200, fixedCosts: 2400, staff: 0, events: 0, feeRate: 0 },
  'Threshold (200 households)': { households: 200, standardShare: 1, premiumShare: 0, basicPrice: 10, standardPrice: 15, premiumPrice: 30, commissionPerHh: 100, utilization: 0.6, listings: 10, listingPrice: 50, sponsorships: 0, fixedCosts: 6000, staff: 6000, events: 2500, feeRate: 0 },
  'DFW scale (500 households)': { households: 500, standardShare: 0.7, premiumShare: 0.3, basicPrice: 10, standardPrice: 15, premiumPrice: 30, commissionPerHh: 50, utilization: 1, listings: 25, listingPrice: 50, sponsorships: 18000, fixedCosts: 11200, staff: 24000, events: 8000, feeRate: 0.03 },
}
const money = (n: number) => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US')

function Num({ id, label, v, set, step = 1, pct }: { id: string; label: string; v: number; set: (n: number) => void; step?: number; pct?: boolean }) {
  return (
    <div><label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" type="number" min={0} step={step} value={pct ? Math.round(v * 100) : v} onChange={e => set(pct ? Number(e.target.value) / 100 : Number(e.target.value))} /></div>
  )
}

export default function Projections() {
  const [name, setName] = useState(Object.keys(presets)[1]); const [p, setP] = useState<P>(presets[name])
  const r = useMemo(() => projection(p), [p])
  const up = <K extends keyof P>(k: K) => (n: number) => setP(x => ({ ...x, [k]: n }))
  const rows: [string, number][] = [['Membership dues', r.dues], ['Vendor referral commissions', r.commissions], ['Business directory listings', r.listings], ['Sponsorships and other income', p.sponsorships]]
  const costs: [string, number][] = [['Software, legal and admin', p.fixedCosts], ['Staff and assistants', p.staff], ['Events and outreach', p.events], ['Payment processing', r.fees]]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Financial model</h1>
        <p className="max-w-2xl text-mute">Annual revenue, expenses and net operating income. Presets reproduce the three stages in the planning document; change any number to test your own assumptions.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Presets">
        {Object.keys(presets).map(k => (
          <button key={k} className={k === name ? 'btn bg-sun text-ink' : 'btn-ghost'} aria-pressed={k === name} onClick={() => { setName(k); setP(presets[k]) }}>{k}</button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <section className="panel space-y-3 p-4" aria-label="Assumptions">
          <h2 className="font-display text-xl font-semibold">Assumptions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Num id="hh" label="Households" v={p.households} set={up('households')} />
            <Num id="std" label="Standard share (%)" v={p.standardShare} set={up('standardShare')} pct />
            <Num id="prm" label="Premium share (%)" v={p.premiumShare} set={up('premiumShare')} pct />
            <Num id="bp" label="Basic price ($/mo)" v={p.basicPrice} set={up('basicPrice')} />
            <Num id="sp" label="Standard price ($/mo)" v={p.standardPrice} set={up('standardPrice')} />
            <Num id="pp" label="Premium price ($/mo)" v={p.premiumPrice} set={up('premiumPrice')} />
            <Num id="cm" label="Commission per household ($/yr)" v={p.commissionPerHh} set={up('commissionPerHh')} />
            <Num id="ut" label="Households using vendors (%)" v={p.utilization} set={up('utilization')} pct />
            <Num id="ls" label="Business listings" v={p.listings} set={up('listings')} />
            <Num id="lp" label="Listing price ($/mo)" v={p.listingPrice} set={up('listingPrice')} />
            <Num id="so" label="Sponsorships and other ($/yr)" v={p.sponsorships} set={up('sponsorships')} />
            <Num id="fc" label="Software, legal, admin ($/yr)" v={p.fixedCosts} set={up('fixedCosts')} />
            <Num id="sf" label="Staff ($/yr)" v={p.staff} set={up('staff')} />
            <Num id="ev" label="Events and outreach ($/yr)" v={p.events} set={up('events')} />
            <Num id="fr" label="Processing fee (% of revenue)" v={p.feeRate} set={up("feeRate")} pct />
          </div>
          <p className="text-xs text-mute">Mix: {r.basic} basic · {r.standard} standard · {r.premium} premium.</p>
        </section>
        <section className="panel p-4" aria-label="Results">
          <h2 className="font-display text-xl font-semibold">Results (per year)</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {rows.map(([a, b]) => <tr key={a}><td className="py-1.5">{a}</td><td className="py-1.5 text-right tabular-nums">{money(b)}</td></tr>)}
              <tr className="font-semibold"><td className="py-2">Total revenue</td><td className="py-2 text-right tabular-nums">{money(r.revenue)}</td></tr>
              {costs.map(([a, b]) => <tr key={a}><td className="py-1.5 text-mute">{a}</td><td className="py-1.5 text-right tabular-nums text-mute">({money(b)})</td></tr>)}
              <tr className="font-semibold"><td className="py-2">Total expenses</td><td className="py-2 text-right tabular-nums">({money(r.expenses)})</td></tr>
            </tbody>
          </table>
          <div className={`mt-4 rounded-md p-4 ${r.noi >= 0 ? 'bg-forest text-white' : 'bg-crane text-white'}`}>
            <p className="text-sm text-white/80">Net operating income</p>
            <p className="font-display text-4xl font-extrabold tabular-nums">{money(r.noi)}</p>
            <p className="text-sm text-white/80">{r.margin}% margin before founder pay or reinvestment</p>
          </div>
          <p className="mt-3 text-xs text-mute">The planning document’s summary line for the 200-household stage ($48,000 revenue, $39,500 NOI) conflicts with its detailed table ($54,000 revenue, $39,500 NOI). The presets use the detailed tables. Bereavement pool contributions are held separately and are not revenue.</p>
        </section>
      </div>
    </div>
  )
}
