import { useState } from 'react'
import { Ring } from '../../components/Motif'
import { useCollection } from '../../lib/collections'
import { ownerOf, useMe } from '../../lib/me'
import type { CreditPlan } from '../../lib/types'
import { money, type PortalProps } from './shared'

export const creditPhases: { title: string; blurb: string; steps: { id: string; text: string; help?: string }[] }[] = [
  { title: '1. Get set up', blurb: 'Know where you stand before you change anything.', steps: [
    { id: 'id', text: 'Have a Social Security number or an ITIN', help: 'Some banks and lenders accept an ITIN. Ask before you apply.' },
    { id: 'reports', text: 'Pull your free credit reports from annualcreditreport.com', help: 'This is the official site. Beware of look-alikes that ask for payment.' },
    { id: 'errors', text: 'Check each report for accounts you do not recognize and dispute mistakes with the bureau', help: 'A mistake is the fastest fix there is.' },
    { id: 'debts', text: 'List every debt with its balance, rate and minimum payment' }] },
  { title: '2. Build history', blurb: 'Lenders want to see months of on-time payments.', steps: [
    { id: 'secured', text: 'Open one starter account that reports to the three bureaus, such as a secured card or credit-builder loan from a bank or credit union', help: 'Confirm that it reports to Equifax, Experian and TransUnion.' },
    { id: 'autopay', text: 'Turn on autopay for at least the minimum, so no payment is ever late', help: 'On-time payment is the biggest factor in most scores.' },
    { id: 'util', text: 'Keep card balances well under 30% of the limit (under 10% is better)' },
    { id: 'keepold', text: 'Keep your oldest account open and in use' }] },
  { title: '3. Grow steadily', blurb: 'Boring and consistent beats clever.', steps: [
    { id: 'six', text: 'Reach 6 months of on-time payments' },
    { id: 'fewapps', text: 'Avoid opening several new accounts close together' },
    { id: 'twelve', text: 'Reach 12 months of on-time payments and check your reports again' }] },
  { title: '4. Get ready for a home', blurb: 'Most of the work is saving and paperwork.', steps: [
    { id: 'counsel', text: 'Meet a HUD-approved housing counselor (free or low cost) at hud.gov', help: 'They explain loan types and local assistance programs.' },
    { id: 'down', text: 'Save for the down payment, closing costs and a cushion', help: 'Use the planner below.' },
    { id: 'income', text: 'Ask each lender how they count your income, including any second job or family support', help: 'Lenders differ. Have 2 years of tax returns and pay records ready.' },
    { id: 'quotes', text: 'Get quotes from at least 2 lenders within a few weeks and compare their Loan Estimates' }] },
]
const all = creditPhases.flatMap(p => p.steps)

export default function Credit({ h, go }: Pick<PortalProps, 'h' | 'go'>) {
  const plans = useCollection<CreditPlan>('credit_plan', () => []); const me = useMe(); const cur = plans.items.find(p => p.householdId === h.id && ownerOf(p) === me.personId)
  const plan: CreditPlan = cur ?? { id: `credit:${me.personId}`, householdId: h.id, personId: me.personId, done: {} }
  const [bal, setBal] = useState(''); const [lim, setLim] = useState(''); const [open, setOpen] = useState<string | null>(null); const [err, setErr] = useState('')
  const put = async (patch: Partial<CreditPlan>) => { try { await plans.save({ ...plan, ...patch }); setErr('') } catch (e) { setErr((e as Error).message) } }
  const doneN = all.filter(s => plan.done[s.id]).length
  const util = Number(lim) > 0 ? (Number(bal) / Number(lim)) * 100 : null
  const need = plan.homePrice ? Math.round(plan.homePrice * 0.035 * 100) / 100 : 0; const left = Math.max(0, need - (plan.saved ?? 0)); const months = plan.monthly && plan.monthly > 0 && left > 0 ? Math.ceil(left / plan.monthly) : null
  const num = (v: string) => v === '' ? undefined : Math.max(0, Number(v))
  return (
    <section id="credit" className="space-y-3" aria-label="Credit builder">
      <h2 className="font-display text-2xl font-semibold">Credit builder and first-home track</h2>
      <p className="text-sm text-mute">Four steps from no credit history to a mortgage application. Everything here is private, and you enter it yourself: we never see your credit report or score. This is education, not financial advice.</p>
      {err && <p role="alert" className="rounded-md border border-crane bg-white p-2 text-sm text-crane">{err}</p>}
      <div className="panel flex flex-wrap items-center gap-4 p-4"><Ring pct={doneN / all.length} label={`${doneN} of ${all.length}`} />
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="cs">Your score now (optional)</label><input id="cs" type="number" min={300} max={850} className="input" value={plan.score ?? ''} onChange={e => void put({ score: num(e.target.value), scoreAt: new Date().toISOString().slice(0, 10) })} /></div>
          <div><label className="label" htmlFor="ct">Target score</label><input id="ct" type="number" min={300} max={850} className="input" value={plan.targetScore ?? ''} onChange={e => void put({ targetScore: num(e.target.value) })} /></div>
          <p className="self-end text-sm text-mute">{plan.score && plan.targetScore ? (plan.score >= plan.targetScore ? 'You have reached your target.' : `${plan.targetScore - plan.score} points to go.`) : 'Scores move slowly. Track every few months, not every day.'}</p></div></div>
      <ol className="space-y-3">{creditPhases.map(ph => (
        <li key={ph.title} className="panel p-4"><h3 className="font-display text-lg font-semibold">{ph.title}</h3><p className="text-sm text-mute">{ph.blurb}</p>
          <ul className="mt-2 space-y-2">{ph.steps.map(s => <li key={s.id}><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!plan.done[s.id]} onChange={e => void put({ done: { ...plan.done, [s.id]: e.target.checked } })} /><span>{s.text}{s.help && <span className="block text-xs text-mute">{s.help}</span>}</span></label></li>)}</ul></li>))}</ol>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="panel space-y-2 p-4"><h3 className="font-display text-lg font-semibold">Card balance check</h3>
          <div className="flex gap-3"><div><label className="label" htmlFor="ub">Balance ($)</label><input id="ub" type="number" min="0" className="input w-32" value={bal} onChange={e => setBal(e.target.value)} /></div><div><label className="label" htmlFor="ul">Credit limit ($)</label><input id="ul" type="number" min="0" className="input w-32" value={lim} onChange={e => setLim(e.target.value)} /></div></div>
          {util !== null && <p className={`text-sm font-medium ${util > 30 ? 'text-crane' : 'text-forest'}`}>You are using {Math.round(util)}% of your limit. {util > 30 ? `To get under 30%, bring the balance down to ${money(Number(lim) * 0.3)}.` : util > 10 ? `Under 10% (${money(Number(lim) * 0.1)}) is even better.` : 'That is a strong range.'}</p>}
          <p className="text-xs text-mute">Many people pay the balance down just before the statement date. The card is for small, regular purchases you repay in full.</p></div>
        <div className="panel space-y-2 p-4"><h3 className="font-display text-lg font-semibold">Down-payment planner</h3>
          <div className="grid grid-cols-3 gap-2"><div><label className="label" htmlFor="hp">Home price ($)</label><input id="hp" type="number" min="0" className="input" value={plan.homePrice ?? ''} onChange={e => void put({ homePrice: num(e.target.value) })} /></div><div><label className="label" htmlFor="hs">Saved so far ($)</label><input id="hs" type="number" min="0" className="input" value={plan.saved ?? ''} onChange={e => void put({ saved: num(e.target.value) })} /></div><div><label className="label" htmlFor="hm">Save per month ($)</label><input id="hm" type="number" min="0" className="input" value={plan.monthly ?? ''} onChange={e => void put({ monthly: num(e.target.value) })} /></div></div>
          {plan.homePrice ? <p className="text-sm">A 3.5% down payment on {money(plan.homePrice)} is <b>{money(need)}</b>; a 20% down payment is <b>{money(plan.homePrice * 0.2)}</b>. {left > 0 ? (months ? <>At {money(plan.monthly ?? 0)} a month you reach the 3.5% figure in about <b>{months} months</b>.</> : 'Enter a monthly amount to see the timeline.') : 'You have reached the 3.5% figure.'} Add closing costs, usually a few percent of the price.</p> : <p className="text-sm text-mute">Enter a price you are aiming for. Down-payment minimums depend on the loan type, so confirm with a lender.</p>}</div></div>
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4"><p className="max-w-xl text-sm"><b>Ready to talk to a lender?</b> We introduce members to banks and credit unions we have checked. They are independent, we do not endorse them, and any referral arrangement is disclosed to you.</p><button className="btn-primary" onClick={() => go('account', { cat: 'other' })}>Ask for an introduction</button></div>
    </section>
  )
}
