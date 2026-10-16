import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useCollection } from '../lib/collections'
import { supabase } from '../lib/supabase'
import { counts, money, seedLedger, seedPayroll } from '../lib/finance'
import { FUND_NAME, allocation, assetTypes, policyChecks, seedHoldings, seedNav, seedPayouts, seedPolicy, seedTrades, targetSize, total, tradeBlock } from '../lib/invest'
import type { AssetType, AuditRow, FundPayout, FundPolicy, FundReport, Holding, LedgerEntry, NavPoint, Trade } from '../lib/types'

type Tab = 'overview' | 'holdings' | 'trades' | 'payouts' | 'policy' | 'report'
const today = () => new Date().toISOString().slice(0, 10)
const tabs: [Tab, string][] = [['overview', 'Overview'], ['holdings', 'Holdings'], ['trades', 'Trades'], ['payouts', 'Payouts to services'], ['policy', 'Policy'], ['report', 'Member report']]
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

export default function Investments() {
  const { session } = useAuth(); const s = session?.kind === 'staff' ? session : null; const role = s?.role ?? 'ops'; const email = s?.email ?? ''
  const hs = useCollection<Holding>('holdings', seedHoldings); const tr = useCollection<Trade>('trades', seedTrades); const nav = useCollection<NavPoint>('navs', seedNav)
  const po = useCollection<FundPayout>('fund_payouts', seedPayouts); const pol = useCollection<FundPolicy>('fund_policy', seedPolicy); const rep = useCollection<FundReport>('fund_reports', () => [])
  const led = useCollection<LedgerEntry>('ledger', seedLedger); const pay = useCollection<LedgerEntry>('payroll', seedPayroll); const audit = useCollection<AuditRow>('audit', () => [])
  const [tab, setTab] = useState<Tab>('overview'); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const p = pol.items[0] ?? seedPolicy()[0]; const board = role === 'board'
  const say = (ok: boolean, t: string) => setMsg({ ok, t })
  const act = hs.items.filter(h => h.active); const value = total(hs.items); const cost = act.reduce((a, h) => a + h.cost, 0)
  const navs = [...nav.items].sort((a, b) => a.id.localeCompare(b.id)); const lastNav = navs[navs.length - 1]; const contributed = lastNav?.contributed ?? cost
  const gain = contributed ? ((value - contributed) / contributed) * 100 : 0
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10)
  const servicesCost = [...led.items, ...pay.items].filter(e => counts(e) && e.kind === 'expense' && e.date >= yearAgo).reduce((a, e) => a + e.amount, 0)
  const target = targetSize(servicesCost, p.payoutPct); const cover = target ? Math.min(100, (value / target) * 100) : 0
  const payoutsYtd = po.items.filter(x => x.date.startsWith(String(new Date().getFullYear()))).reduce((a, x) => a + x.amount, 0)
  const alloc = allocation(hs.items); const checks = policyChecks(hs.items, p)
  async function log(action: string, id: string, status: string, amount: number, memo: string) { if (supabase) return; await audit.save({ id: crypto.randomUUID(), at: new Date().toISOString(), actor: email, action, collection: 'investments', entryId: id, status, amount, memo: memo.slice(0, 80) }) }
  const run = async (f: () => Promise<void>, ok: string) => { try { await f(); say(true, ok) } catch (e) { say(false, (e as Error).message) } }

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Investments</h1>
        <p className="max-w-3xl text-mute">{FUND_NAME}. Phase 1 is transparency: what the fund owns, who approved each trade, how it performs, and how much of the community’s services it could pay for. Figures are samples. The fund is not open to outside investors and nothing here is an offer.</p></div>
      <div className="flex flex-wrap gap-2" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${tab === k ? 'border-forest bg-forest text-white' : 'border-line bg-white'}`}>{l}{k === 'trades' && tr.items.some(t => t.status === 'proposed') && <span className="ml-1.5 rounded-full bg-crane px-1.5 text-xs text-white">{tr.items.filter(t => t.status === 'proposed').length}</span>}</button>)}</div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md p-2 text-sm font-medium ${msg.ok ? 'bg-forest-100' : 'border border-crane bg-white text-crane'}`}>{msg.t}</p>}

      {tab === 'overview' && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Fund value" value={money(value)} /><Stat label="Capital put in" value={money(contributed)} /><Stat label="Gain on capital" value={pct(gain)} tone={gain >= 0 ? 'text-forest' : 'text-crane'} /><Stat label="Paid to services (this year)" value={money(payoutsYtd)} /></div>
        <section className="panel space-y-2 p-4" aria-label="Nest egg progress"><h2 className="font-display text-lg font-semibold">The nest egg goal</h2>
          <p className="text-sm text-mute">Services cost about <b>{money(servicesCost)}</b> over the last 12 months. At a {p.payoutPct}% yearly payout, the fund needs about <b>{money(target)}</b> to pay for all of it from returns alone.</p>
          <div className="h-3 rounded bg-field" role="img" aria-label={`${Math.round(cover)} percent of the way`}><div className="h-3 rounded bg-forest" style={{ width: `${cover}%` }} /></div>
          <p className="text-sm"><b>{cover.toFixed(1)}%</b> of the way there. Today it could sustainably pay about <b>{money(value * (p.payoutPct / 100))}</b> a year.</p></section>
        <div className="grid gap-3 md:grid-cols-2">
          <section className="panel space-y-2 p-4" aria-label="Allocation"><h2 className="font-display text-lg font-semibold">What it owns</h2>
            <ul className="space-y-2">{alloc.map(a => <li key={a.type}><div className="flex justify-between text-sm"><span>{a.type}</span><span className="tabular-nums">{a.pct.toFixed(0)}%</span></div><div className="h-2 rounded bg-field"><div className="h-2 rounded bg-forest" style={{ width: `${a.pct}%` }} /></div></li>)}</ul></section>
          <section className="panel space-y-2 p-4" aria-label="Policy checks"><h2 className="font-display text-lg font-semibold">Policy checks</h2>
            <ul className="space-y-1 text-sm">{checks.map((c, i) => <li key={i} className={c.ok ? '' : 'text-crane'}><span aria-hidden>{c.ok ? '✓ ' : '! '}</span>{c.text}</li>)}</ul></section></div>
        <section className="panel p-4" aria-label="Value over time"><h2 className="font-display text-lg font-semibold">Fund value by month</h2><Chart pts={navs} />
          <p className="text-xs text-mute">The dashed line is capital put in. Value above it is gain. Month-end values are recorded by staff and published to members each quarter.</p>
          {(role === 'ops' || board) && <button className="btn-ghost mt-2" onClick={() => void run(async () => { const id = new Date().toISOString().slice(0, 7); await nav.save({ id, value, contributed, by: email }); await log('record', id, 'recorded', value, 'Month-end value') }, 'Month-end value recorded.')}>Record this month’s value ({money(value)})</button>}</section>
      </div>}

      {tab === 'holdings' && <Holdings {...{ hs, role, say, run, log, p, value }} />}
      {tab === 'trades' && <Trades {...{ tr, hs, role, email, say, run, log }} />}
      {tab === 'payouts' && <section className="space-y-3"><p className="max-w-3xl text-sm text-mute">Money the fund sends to the community’s services. Only the board records a payout, and only up to the policy limit: {p.payoutPct}% of the fund per year ({money(value * (p.payoutPct / 100))} today; {money(payoutsYtd)} used this year).</p>
        {board && <PayoutForm {...{ po, hs, value, p, payoutsYtd, email, say, run, log }} />}
        <div className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Payouts</caption><thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Date</th><th className="p-3">Purpose</th><th className="p-3 text-right">Amount</th><th className="p-3">Approved by</th></tr></thead>
          <tbody>{[...po.items].sort((a, b) => b.date.localeCompare(a.date)).map(x => <tr key={x.id} className="border-b border-line last:border-0"><td className="p-3">{x.date}</td><td className="p-3">{x.purpose}</td><td className="p-3 text-right tabular-nums">{money(x.amount)}</td><td className="p-3">{x.approvedBy}</td></tr>)}</tbody></table></div></section>}
      {tab === 'policy' && <PolicyTab {...{ pol, p, board, email, say, run, log }} />}
      {tab === 'report' && <Report {...{ rep, hs, value, contributed, gain, alloc, payoutsYtd, servicesCost, cover, email, say, run, log }} />}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) { return <div className="panel p-4"><p className={`font-display text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value}</p><p className="text-sm font-medium">{label}</p></div> }
function Chart({ pts }: { pts: NavPoint[] }) {
  if (pts.length < 2) return <p className="text-sm text-mute">Needs two months of values.</p>
  const w = 600, h = 160, max = Math.max(...pts.map(p => Math.max(p.value, p.contributed))) * 1.05, min = Math.min(...pts.map(p => Math.min(p.value, p.contributed))) * 0.95
  const x = (i: number) => (i / (pts.length - 1)) * (w - 20) + 10; const y = (v: number) => h - 10 - ((v - min) / (max - min || 1)) * (h - 20)
  const line = (f: (p: NavPoint) => number) => pts.map((p, i) => `${x(i)},${y(f(p))}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Fund value from ${money(pts[0].value)} to ${money(pts[pts.length - 1].value)}`}><polyline points={line(p => p.contributed)} fill="none" stroke="currentColor" strokeDasharray="4 4" className="text-mute" /><polyline points={line(p => p.value)} fill="none" strokeWidth="2.5" className="stroke-forest" />{pts.map((p, i) => <circle key={p.id} cx={x(i)} cy={y(p.value)} r="3" className="fill-forest"><title>{p.id}: {money(p.value)}</title></circle>)}</svg>
}

type Common = { say: (ok: boolean, t: string) => void; run: (f: () => Promise<void>, ok: string) => Promise<void>; log: (a: string, id: string, st: string, amt: number, memo: string) => Promise<void> }
function Holdings({ hs, role, p, value, run, log }: Common & { hs: ReturnType<typeof useCollection<Holding>>; role: string; p: FundPolicy; value: number }) {
  const [f, setF] = useState<Partial<Holding> | null>(null); const [edit, setEdit] = useState<Record<string, string>>({}); const can = role === 'ops' || role === 'board'
  return (<div className="space-y-3">
    <p className="max-w-3xl text-sm text-mute">Values are updated by staff from the broker statement or appraisal. Changes are logged. A holding tied to a staff member, board member or partner must say so: it then shows to members.</p>
    {can && <button className="btn-primary" onClick={() => setF({ type: 'Stock or ETF' })}>Add holding</button>}
    {f && <form className="panel grid gap-3 p-4 sm:grid-cols-4 sm:items-end" onSubmit={e => { e.preventDefault(); if (!f.name?.trim() || !f.value) return; void run(async () => { const h: Holding = { id: crypto.randomUUID(), name: f.name!.trim(), type: f.type as AssetType, cost: f.cost ?? f.value!, value: f.value!, asOf: today(), relatedParty: f.relatedParty?.trim() || undefined, active: true }; await hs.save(h); await log('insert', h.id, 'holding', h.value, h.name); setF(null) }, 'Holding added.') }}>
      <div><label className="label" htmlFor="hn">Name</label><input id="hn" className="input" value={f.name ?? ''} onChange={e => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label" htmlFor="ht">Type</label><select id="ht" className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value as AssetType })}>{assetTypes.map(t => <option key={t}>{t}</option>)}</select></div>
      <div><label className="label" htmlFor="hc">Cost ($)</label><input id="hc" type="number" min="0" className="input" value={f.cost ?? ''} onChange={e => setF({ ...f, cost: Number(e.target.value) })} /></div>
      <div><label className="label" htmlFor="hv">Value now ($)</label><input id="hv" type="number" min="0" className="input" value={f.value ?? ''} onChange={e => setF({ ...f, value: Number(e.target.value) })} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="hr">Related party (leave blank if none)</label><input id="hr" className="input" placeholder="Name of the person or business" value={f.relatedParty ?? ''} onChange={e => setF({ ...f, relatedParty: e.target.value })} /></div>
      <div className="flex gap-2"><button className="btn-primary">Add</button><button type="button" className="btn-ghost" onClick={() => setF(null)}>Cancel</button></div></form>}
    <div className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Holdings</caption><thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Holding</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Value</th><th className="p-3 text-right">Share</th><th className="p-3">Update value</th></tr></thead>
      <tbody>{hs.items.filter(h => h.active).map(h => { const share = (h.value / (value || 1)) * 100; return <tr key={h.id} className="border-b border-line align-top last:border-0">
        <td className="p-3"><b>{h.name}</b><span className="block text-xs text-mute">{h.type} · as of {h.asOf}{h.note ? ` · ${h.note}` : ''}</span>{h.relatedParty && <span className="mt-0.5 block w-fit rounded bg-crane px-1.5 text-xs font-bold text-white">Related party: {h.relatedParty}</span>}</td>
        <td className="p-3 text-right tabular-nums">{money(h.cost)}</td><td className="p-3 text-right tabular-nums">{money(h.value)}</td>
        <td className={`p-3 text-right tabular-nums ${h.type !== 'Cash' && share > p.maxSinglePct ? 'font-bold text-crane' : ''}`}>{share.toFixed(1)}%</td>
        <td className="p-3">{can && <div className="flex gap-1"><input aria-label={`New value for ${h.name}`} type="number" min="0" className="input w-28 py-1" value={edit[h.id] ?? ''} onChange={e => setEdit({ ...edit, [h.id]: e.target.value })} /><button className="btn-ghost px-2 py-1" onClick={() => { const v = Number(edit[h.id]); if (!edit[h.id] || Number.isNaN(v) || v < 0) return; void run(async () => { await hs.save({ ...h, value: v, asOf: today() }); await log('update', h.id, 'revalued', v, `${h.name}: ${money(h.value)} to ${money(v)}`); setEdit({ ...edit, [h.id]: '' }) }, 'Value updated.') }}>Save</button></div>}</td></tr> })}</tbody></table></div></div>)
}

function Trades({ tr, hs, role, email, run, log, say }: Common & { tr: ReturnType<typeof useCollection<Trade>>; hs: ReturnType<typeof useCollection<Holding>>; role: string; email: string }) {
  const [f, setF] = useState<Partial<Trade> | null>(null); const [why, setWhy] = useState<Record<string, string>>({}); const can = role === 'ops' || role === 'board'
  async function execute(t: Trade) {
    const cash = hs.items.find(h => h.active && h.type === 'Cash'); const h = hs.items.find(x => x.active && x.name === t.asset)
    if (t.action === 'buy' && (!cash || cash.value < t.amount)) throw new Error('Not enough cash in the fund for this purchase.')
    if (t.action === 'sell' && (!h || h.value < t.amount)) throw new Error('The fund does not hold that much of this asset.')
    if (cash) await hs.save({ ...cash, value: cash.value + (t.action === 'buy' ? -t.amount : t.amount), cost: cash.cost + (t.action === 'buy' ? -t.amount : t.amount), asOf: today() })
    if (t.action === 'buy') await hs.save(h ? { ...h, value: h.value + t.amount, cost: h.cost + t.amount, asOf: today() } : { id: crypto.randomUUID(), name: t.asset, type: t.type, cost: t.amount, value: t.amount, asOf: today(), relatedParty: t.relatedParty, active: true })
    else if (h) { const f2 = (h.value - t.amount) / h.value; await hs.save({ ...h, value: h.value - t.amount, cost: Math.round(h.cost * f2 * 100) / 100, asOf: today() }) }
    await tr.save({ ...t, status: 'executed', executedBy: email, executedAt: new Date().toISOString() }); await log('executed', t.id, 'executed', t.amount, `${t.action} ${t.asset}`)
  }
  return (<div className="space-y-3">
    <p className="max-w-3xl text-sm text-mute">Every buy or sell follows three steps: someone proposes it with a reason, the board treasurer (a different person) approves it, then it is recorded as executed and the holdings update. Nobody approves their own trade.</p>
    {can && <button className="btn-primary" onClick={() => setF({ action: 'buy', type: 'Stock or ETF', date: today() })}>Propose a trade</button>}
    {f && <form className="panel grid gap-3 p-4 sm:grid-cols-4 sm:items-end" onSubmit={e => { e.preventDefault(); if (!f.asset?.trim() || !f.amount || !f.rationale?.trim()) return say(false, 'Enter the asset, the amount and the reason.'); void run(async () => { const t: Trade = { id: crypto.randomUUID(), date: today(), action: f.action!, asset: f.asset!.trim(), type: f.type as AssetType, amount: f.amount!, rationale: f.rationale!.trim(), relatedParty: f.relatedParty?.trim() || undefined, status: 'proposed', proposedBy: email }; await tr.save(t); await log('propose', t.id, 'proposed', t.amount, `${t.action} ${t.asset}`); setF(null) }, 'Proposed. The board treasurer will review it.') }}>
      <div><label className="label" htmlFor="ta">Action</label><select id="ta" className="input" value={f.action} onChange={e => setF({ ...f, action: e.target.value as 'buy' | 'sell' })}><option value="buy">Buy</option><option value="sell">Sell</option></select></div>
      <div><label className="label" htmlFor="tn">Asset</label><input id="tn" list="assets" className="input" value={f.asset ?? ''} onChange={e => setF({ ...f, asset: e.target.value })} /><datalist id="assets">{hs.items.filter(h => h.active && h.type !== 'Cash').map(h => <option key={h.id} value={h.name} />)}</datalist></div>
      <div><label className="label" htmlFor="tt">Type</label><select id="tt" className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value as AssetType })}>{assetTypes.filter(t => t !== 'Cash').map(t => <option key={t}>{t}</option>)}</select></div>
      <div><label className="label" htmlFor="tm">Amount ($)</label><input id="tm" type="number" min="0" className="input" value={f.amount ?? ''} onChange={e => setF({ ...f, amount: Number(e.target.value) })} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="tr">Why (this is shown to members)</label><input id="tr" className="input" value={f.rationale ?? ''} onChange={e => setF({ ...f, rationale: e.target.value })} /></div>
      <div><label className="label" htmlFor="tp">Related party (if any)</label><input id="tp" className="input" value={f.relatedParty ?? ''} onChange={e => setF({ ...f, relatedParty: e.target.value })} /></div>
      <div className="flex gap-2"><button className="btn-primary">Propose</button><button type="button" className="btn-ghost" onClick={() => setF(null)}>Cancel</button></div></form>}
    <ul className="space-y-2">{[...tr.items].sort((a, b) => b.date.localeCompare(a.date)).map(t => { const ab = tradeBlock(t, 'approve', role, email); const eb = tradeBlock(t, 'execute', role, email); return (
      <li key={t.id} className="panel space-y-1 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{t.action === 'buy' ? 'Buy' : 'Sell'} {money(t.amount)} · {t.asset}</p><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.status === 'executed' ? 'bg-forest text-white' : t.status === 'rejected' ? 'bg-crane text-white' : 'bg-sun-100 text-sun-700'}`}>{t.status}</span></div>
        <p className="text-sm text-mute">{t.date} · {t.rationale} · proposed by {t.proposedBy}{t.approvedBy ? ` · approved by ${t.approvedBy}` : ''}{t.executedBy ? ` · executed by ${t.executedBy}` : ''}{t.rejectedReason ? ` · rejected: ${t.rejectedReason}` : ''}</p>
        {t.relatedParty && <p className="w-fit rounded bg-crane px-1.5 text-xs font-bold text-white">Related party: {t.relatedParty}</p>}
        {t.status === 'proposed' && <div className="flex flex-wrap items-center gap-2 pt-1"><button className="btn-primary px-3 py-1" aria-disabled={!!ab} onClick={() => { if (ab) return say(false, ab); void run(async () => { await tr.save({ ...t, status: 'approved', approvedBy: email }); await log('approve', t.id, 'approved', t.amount, t.asset) }, 'Approved.') }}>Approve</button>
          <input aria-label="Reason for rejecting" className="input w-56 py-1" placeholder="Reason, to reject" value={why[t.id] ?? ''} onChange={e => setWhy({ ...why, [t.id]: e.target.value })} />
          <button className="btn-ghost px-3 py-1" onClick={() => { if (role !== 'board' || t.proposedBy.toLowerCase() === email.toLowerCase()) return say(false, 'Only a board treasurer who did not propose it can reject.'); if (!why[t.id]?.trim()) return say(false, 'Give a reason.'); void run(async () => { await tr.save({ ...t, status: 'rejected', rejectedReason: why[t.id].trim() }); await log('reject', t.id, 'rejected', t.amount, t.asset) }, 'Rejected.') }}>Reject</button>{ab && <span className="text-xs text-mute">{ab}</span>}</div>}
        {t.status === 'approved' && <div className="pt-1"><button className="btn-primary px-3 py-1" aria-disabled={!!eb} onClick={() => { if (eb) return say(false, eb); void run(() => execute(t), 'Recorded as executed. Holdings updated.') }}>Record as executed</button></div>}
      </li>) })}</ul></div>)
}

function PayoutForm({ po, hs, value, p, payoutsYtd, email, say, run, log }: Common & { po: ReturnType<typeof useCollection<FundPayout>>; hs: ReturnType<typeof useCollection<Holding>>; value: number; p: FundPolicy; payoutsYtd: number; email: string }) {
  const [a, setA] = useState(''); const [why, setWhy] = useState('')
  return <form className="panel flex flex-wrap items-end gap-3 p-4" onSubmit={e => { e.preventDefault(); const n = Number(a); const cash = hs.items.find(h => h.active && h.type === 'Cash')
    if (!n || n <= 0 || !why.trim()) return say(false, 'Enter an amount and what it paid for.')
    if (payoutsYtd + n > value * (p.payoutPct / 100)) return say(false, `That is over the yearly limit of ${money(value * (p.payoutPct / 100))}. Change the policy first if the board agrees.`)
    if (!cash || cash.value < n) return say(false, 'Not enough cash in the fund.')
    void run(async () => { const x: FundPayout = { id: crypto.randomUUID(), date: today(), amount: n, purpose: why.trim(), approvedBy: email }; await po.save(x); await hs.save({ ...cash, value: cash.value - n, cost: cash.cost - n, asOf: today() }); await log('payout', x.id, 'paid', n, why); setA(''); setWhy('') }, 'Payout recorded. Enter the matching deposit in the Finance ledger as income.') }}>
    <div><label className="label" htmlFor="pa">Amount ($)</label><input id="pa" type="number" min="0" className="input w-32" value={a} onChange={e => setA(e.target.value)} /></div>
    <div className="min-w-64 flex-1"><label className="label" htmlFor="pw">What it pays for</label><input id="pw" className="input" value={why} onChange={e => setWhy(e.target.value)} /></div><button className="btn-primary">Record payout</button></form>
}

function PolicyTab({ pol, p, board, email, say, run, log }: Common & { pol: ReturnType<typeof useCollection<FundPolicy>>; p: FundPolicy; board: boolean; email: string }) {
  const [f, setF] = useState(p)
  return (<div className="space-y-3"><p className="max-w-3xl text-sm text-mute">The written rules the fund runs by. Only the board treasurer changes them, and every change is logged and shown to members.</p>
    <form className="panel grid gap-3 p-4 sm:grid-cols-3" onSubmit={e => { e.preventDefault(); if (!board) return say(false, 'Only the board treasurer can change the policy.'); void run(async () => { await pol.save({ ...f, id: 'policy', updatedBy: email, updatedAt: new Date().toISOString() }); await log('policy', 'policy', 'changed', 0, 'Investment policy updated') }, 'Policy saved.') }}>
      <div className="sm:col-span-3"><label className="label" htmlFor="pm">Purpose</label><textarea id="pm" disabled={!board} className="input" rows={3} value={f.mission} onChange={e => setF({ ...f, mission: e.target.value })} /></div>
      <div><label className="label" htmlFor="pp">Yearly payout to services (% of fund)</label><input id="pp" type="number" min="0" max="10" step="0.5" disabled={!board} className="input" value={f.payoutPct} onChange={e => setF({ ...f, payoutPct: Number(e.target.value) })} /></div>
      <div><label className="label" htmlFor="ps">Largest single holding (% of fund)</label><input id="ps" type="number" min="1" max="100" disabled={!board} className="input" value={f.maxSinglePct} onChange={e => setF({ ...f, maxSinglePct: Number(e.target.value) })} /></div>
      <div><label className="label" htmlFor="pc">Minimum cash (% of fund)</label><input id="pc" type="number" min="0" max="100" disabled={!board} className="input" value={f.minCashPct} onChange={e => setF({ ...f, minCashPct: Number(e.target.value) })} /></div>
      <div className="sm:col-span-3"><label className="label" htmlFor="pi">Who sits on the investment committee</label><input id="pi" disabled={!board} className="input" value={f.committee} onChange={e => setF({ ...f, committee: e.target.value })} /></div>
      {board ? <div><button className="btn-primary">Save policy</button></div> : <p className="text-sm text-mute sm:col-span-3">Read only. Last changed {p.updatedAt.slice(0, 10)} by {p.updatedBy}. Sign in as the board treasurer to edit.</p>}</form></div>)
}

function Report({ rep, hs, value, contributed, gain, alloc, payoutsYtd, servicesCost, cover, email, run, log }: Common & { rep: ReturnType<typeof useCollection<FundReport>>; hs: ReturnType<typeof useCollection<Holding>>; value: number; contributed: number; gain: number; alloc: { type: string; pct: number }[]; payoutsYtd: number; servicesCost: number; cover: number; email: string }) {
  const now = new Date(); const q = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`; const [note, setNote] = useState(''); const [ask, setAsk] = useState(false)
  const latest = [...rep.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]
  return (<div className="space-y-3"><p className="max-w-3xl text-sm text-mute">Publishing shows members the totals, allocation, holdings and how much of services the fund could cover. Members never see staff names on trades or any account numbers. Publish once a quarter.</p>
    <div className="panel space-y-2 p-4"><p className="text-sm">Quarter <b>{q}</b>: value <b>{money(value)}</b>, gain <b>{pct(gain)}</b>, {cover.toFixed(1)}% of the services goal.</p>
      <label className="label" htmlFor="rn">Note to members (what changed and why)</label><textarea id="rn" className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} />
      {!ask ? <button className="btn-primary" onClick={() => setAsk(true)}>Publish to members</button> : <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Members will see this. Publish?</span><button className="btn-primary" onClick={() => void run(async () => { const r: FundReport = { id: q, label: q, total: value, contributed, returnPct: gain, allocation: alloc.map(a => ({ type: a.type, pct: Math.round(a.pct * 10) / 10 })), holdings: hs.items.filter(h => h.active).map(h => ({ name: h.name, type: h.type, value: h.value })), payoutsYtd, servicesCost, coveragePct: cover, note: note.trim() || undefined, publishedBy: email, publishedAt: new Date().toISOString() }; await rep.save(r); await log('publish', q, 'published', value, 'Quarterly fund report'); setAsk(false) }, 'Published.')}>Yes, publish</button><button className="btn-ghost" onClick={() => setAsk(false)}>Cancel</button></div>}</div>
    {latest && <p className="text-sm text-mute">Latest published: {latest.label} on {latest.publishedAt.slice(0, 10)}.</p>}</div>)
}
