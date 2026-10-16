import { Link } from 'react-router-dom'
import { useCollection } from '../lib/collections'
import { cloudMode } from '../lib/supabase'
import { seedPartners, seedPayments, seedTickets } from '../lib/seed'
import { slaState } from './Support'
import { coverage } from './Partners'
import type { Gate, Household, Partner, Payment, Ticket } from '../lib/types'

type Item = { id: string; label: string; auto?: boolean; done?: boolean; hint?: string }
const thisMonth = new Date().toISOString().slice(0, 7)

export default function Status({ households }: { households: Household[] }) {
  const { items: gates, save } = useCollection<Gate>('gates', () => [])
  const { items: partners } = useCollection<Partner>('partners', seedPartners)
  const { items: tickets } = useCollection<Ticket>('tickets', seedTickets)
  const { items: pays } = useCollection<Payment>('payments', seedPayments)
  const manual = (id: string) => gates.find(g => g.id === id)?.done ?? false
  const cov = coverage(partners)
  const activeN = households.filter(h => h.status === 'active').length
  const M = (id: string, label: string, hint?: string): Item => ({ id, label, hint, done: manual(id) })

  const phases: { title: string; items: Item[] }[] = [
    { title: 'Month 1: Set up', items: [
      M('entity', 'Legal entity formed, or fiscal sponsor signed', 'LLC or 501(c)(3) with a separate bank account for the pool'),
      M('privacy', 'Privacy policy and terms of service published', 'Covers income, health and household data'),
      M('opslead', 'First operations lead added to the staff table', 'One SQL line, in supabase/schema.sql'),
      M('tech', 'End-to-end test done: survey to member to welcome message'),
      M('stripe', 'Stripe live keys connected', 'See README, Stripe section'),
      M('wa', 'WhatsApp message templates approved by Meta'),
    ] },
    { title: 'Month 2: Pilot cohort', items: [
      { id: 'n50', label: `50 active households (now ${activeN})`, auto: true, done: activeN >= 50 },
      M('elders', 'Church and community elders briefed', 'Trusted voices raise survey participation'),
      M('link', 'Survey link shared with the first 25 households'),
      M('advisory', 'Advisory council formed (elders and 2nd-generation professionals)'),
    ] },
    { title: 'Month 3: First benefits', items: [
      { id: 'legal', label: `3 listed attorneys (now ${cov[0].n})`, auto: true, done: cov[0].n >= 3 },
      { id: 'tax', label: `3 listed CPAs (now ${cov[1].n})`, auto: true, done: cov[1].n >= 3 },
      { id: 'health', label: `3 listed health or repatriation providers (now ${cov[2].n})`, auto: true, done: cov[2].n >= 3 },
      M('broker', 'Licensed Texas insurance broker engaged for the bereavement pool', 'Pooled coverage needs a licensed partner'),
      M('sop', 'Mutual aid verification and payout steps written down'),
    ] },
  ]
  const all = phases.flatMap(p => p.items); const pct = Math.round((all.filter(i => i.done).length / all.length) * 100)

  const open = tickets.filter(t => t.status !== 'resolved'); const overdue = open.filter(t => slaState(t).tone === 'bad').length
  const mp = pays.filter(p => p.month === thisMonth); const rate = mp.length ? Math.round((mp.filter(p => p.status === 'paid').length / mp.length) * 100) : 0
  const optIn = households.length ? Math.round((households.filter(h => h.whatsappOptIn).length / households.length) * 100) : 0

  const build: [string, 'live' | 'demo' | 'todo', string, string?][] = [
    ['Community dashboard with privacy limits', 'live', 'Anonymous totals, resource gaps, pool ledger', '/'],
    ['Members, consent and digital ID card', 'live', 'Printable card, public verify page', '/members'],
    ['Support and mutual-aid requests', 'live', 'Reply clocks, verification checklist, pool payouts', '/support'],
    ['Partner vetting pipeline', 'live', 'Checks block each step; launch minimums tracked', '/partners'],
    ['Dues ledger with pool split', 'live', 'Invoices, manual payments, collection rate', '/dues'],
    ['Financial model', 'live', 'The three planning stages, editable', '/projections'],
    ['Stripe card payments', 'demo', 'Simulated here. Function code written, not yet tested with live keys'],
    ['WhatsApp, text and email sending', 'demo', 'Simulated here. Function code written, not yet tested with live keys'],
    ['Public survey, English', 'live', 'Consent first, staff review every reply before it becomes a member', '/submissions'],
    ['Member portal', 'live', 'Own card, dues, help requests and contact preferences', '/staff'],
    ['PDF report export', 'live', 'Three pages for town halls, vendors and grants', '/report'],
    ['Staff roles', 'live', 'Four roles; database rules tested against a real Postgres', '/staff'],
    ['Email-link sign-in', 'demo', 'Demo uses a role picker. Real sign-in turns on when Supabase is connected'],
    ['Survey in other languages', 'todo', 'English only for now'],
    ['Members see the community dashboard', 'todo', 'Members cannot see the totals yet'],
  ]
  const tag = { live: ['Working', 'bg-forest-100 text-forest'], demo: ['Simulated', 'bg-sun-100 text-ink'], todo: ['Not built', 'bg-field text-mute'] } as const

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-bold">Where we are</h1>
        <p className="max-w-2xl text-mute">Launch checklist from the planning document, and what the software can do today. Tick items as you finish them outside the app.</p></div>
      <section className="overflow-hidden rounded-lg bg-forest text-white" aria-label="Launch progress">
        <div className="p-5"><p className="font-display text-5xl font-extrabold tabular-nums">{pct}%</p><p className="text-white/80">of the launch checklist is done ({all.filter(i => i.done).length} of {all.length})</p>
          <div className="mt-3 h-3 rounded-full bg-white/20"><div className="h-full rounded-full bg-sun" style={{ width: `${pct}%` }} /></div></div>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {([['Open requests', String(open.length), overdue ? `${overdue} past reply target` : 'all on time'], ['Listed partners', String(partners.filter(p => p.stage === 'listed').length), `${partners.length} in pipeline`], ['Dues paid this month', `${rate}%`, `${mp.length} invoices`], ['Message opt-in', `${optIn}%`, 'of households'], ['Active households', String(activeN), 'goal 50 for pilot']] as const).map(([l, v, h]) => (
          <div key={l} className="panel p-4"><p className="font-display text-3xl font-bold tabular-nums">{v}</p><p className="text-sm font-medium">{l}</p><p className="text-xs text-mute">{h}</p></div>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {phases.map(ph => (
          <section key={ph.title} className="panel p-4"><h2 className="font-display text-lg font-semibold">{ph.title}</h2>
            <ul className="mt-2 space-y-2">
              {ph.items.map(i => (
                <li key={i.id}><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={!!i.done} disabled={i.auto} onChange={e => void save({ id: i.id, done: e.target.checked })} />
                  <span><span className={i.done ? 'text-mute line-through' : ''}>{i.label}</span>{i.auto && <span className="ml-1 text-xs text-mute">(updates itself)</span>}{i.hint && <span className="block text-xs text-mute">{i.hint}</span>}</span></label></li>))}
            </ul></section>))}
      </div>
      <section className="panel p-4"><h2 className="font-display text-lg font-semibold">What the software does today</h2>
        <ul className="mt-2 divide-y divide-line">
          {build.map(([l, s, n, to]) => (
            <li key={l} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span><span className="font-medium">{to ? <Link className="underline decoration-line underline-offset-2 hover:decoration-forest" to={to}>{l}</Link> : l}</span><span className="block text-xs text-mute">{n}</span></span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tag[s][1]}`}>{tag[s][0]}</span></li>))}
        </ul>
        <p className="mt-3 text-xs text-mute">Storage: {cloudMode ? 'Supabase' : 'this browser only (demo mode)'}.</p></section>
    </div>
  )
}
