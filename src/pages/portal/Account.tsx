import { useState } from 'react'
import { useT } from '../../lib/i18n'
import { edition } from '../../lib/edition'
import { useCollection } from '../../lib/collections'
import { seedPayments, seedTickets } from '../../lib/seed'
import { addPoolEntry, updateMyContact } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { catLabel, catPriority } from '../../lib/tickets'
import { MemberCard } from '../Card'
import People from './People'
import Install from './Install'
import { useMe } from '../../lib/me'
import { setTrackingOff, trackingOff } from '../../lib/telemetry'
import { slaState } from '../Support'
import type { Household, Payment, Ticket, TicketCategory } from '../../lib/types'

const money = (n: number) => '$' + n.toLocaleString('en-US')
const statusLabel: Record<Ticket['status'], string> = { new: 'Received', verifying: 'We are checking details', dispatched: 'In progress', resolved: 'Resolved' }

export default function Account({ h, refresh, initialCat }: { h: Household; refresh: () => Promise<void>; initialCat?: string }) {
  const { t } = useT(); const pays = useCollection<Payment>('payments', seedPayments); const tix = useCollection<Ticket>('tickets', seedTickets)
  const mine = pays.items.filter(p => p.householdId === h.id).sort((a, b) => b.month.localeCompare(a.month))
  const myTix = tix.items.filter(t => t.householdId === h.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [cat, setCat] = useState<TicketCategory>((initialCat as TicketCategory) || 'other'); const [sum, setSum] = useState(''); const [phone, setPhone] = useState(h.phone); const [opt, setOpt] = useState(h.whatsappOptIn); const [msg, setMsg] = useState('')

  async function ask(e: React.FormEvent) {
    e.preventDefault(); if (!sum.trim()) return
    await tix.save({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), householdId: h.id, category: cat, priority: catPriority[cat], status: 'new', summary: sum.trim(), owner: 'Support manager', checks: { member: false, docs: false, call: false }, log: [{ at: new Date().toISOString(), text: 'Request submitted by the member in the portal.' }] })
    setSum(''); setMsg(cat === 'bereavement' || cat === 'legal' ? 'We received your request. Urgent requests get a reply within 2 hours.' : 'We received your request and will reply soon.')
  }
  async function pay(p: Payment) {
    if (supabase) {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { paymentId: p.id, householdId: p.householdId, amount: p.amount, month: p.month } })
      if (error) return setMsg('Payment is not available yet. Please contact us to pay.')
      window.open((data as { url: string }).url, '_blank'); return
    }
    await pays.save({ ...p, status: 'paid', method: 'Card (Stripe)', paidAt: new Date().toISOString().slice(0, 10) })
    if (p.poolPortion > 0) await addPoolEntry({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), kind: 'contribution', amount: p.poolPortion, note: `Dues pool share, ${h.headName}` })
    setMsg(`Demo: ${money(p.amount)} paid. No card was charged.`)
  }
  async function saveContact(e: React.FormEvent) { e.preventDefault(); await updateMyContact(h, phone, opt); await refresh(); setMsg('Contact preferences saved.') }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="font-display text-3xl font-bold">{t('Account and help')}</h1>
        <p className="text-mute">{edition.tiers[h.tier].label} plan · {edition.tiers[h.tier].perks}</p></div>
      {msg && <p role="status" className="rounded-md bg-forest-100 p-2 text-sm font-medium">{msg}</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-3"><h2 className="font-display text-xl font-semibold">{t('Your card')}</h2><MemberCard h={h} />
          <p className="text-xs text-mute">Show this at partner offices. Scanning it confirms your membership and nothing else.</p></div>
        <section className="panel p-4" aria-label="Dues"><h2 className="font-display text-xl font-semibold">{t('Your dues')}</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {mine.slice(0, 6).map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2"><span>{p.month} · {money(p.amount)}</span>
                {p.status === 'paid' ? <span className="rounded bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest">Paid</span>
                  : <button className="btn-primary px-3 py-1" onClick={() => void pay(p)}>Pay {money(p.amount)}</button>}</li>))}
            {!mine.length && <li className="py-2 text-mute">No invoices yet. Your first one appears after your membership starts.</li>}
          </ul></section>
      </div>
      <section className="panel space-y-3 p-4" aria-label="Help requests">
        <h2 className="font-display text-xl font-semibold">{t('Ask for help')}</h2>
        <form onSubmit={ask} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <div><label className="label" htmlFor="rc">What is it about?</label><select id="rc" className="input" value={cat} onChange={e => setCat(e.target.value as TicketCategory)}>{(Object.keys(catLabel) as TicketCategory[]).map(c => <option key={c} value={c}>{catLabel[c]}</option>)}</select></div>
          <div><label className="label" htmlFor="rs">Tell us what happened</label><input id="rs" className="input" value={sum} onChange={e => setSum(e.target.value)} /></div>
          <button className="btn-primary">Send request</button></form>
        <ul className="divide-y divide-line text-sm">
          {myTix.map(t => { const s = slaState(t); return (
            <li key={t.id} className="py-2"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{catLabel[t.category]}</span><span className="text-mute">{statusLabel[t.status]}{s.tone === 'bad' ? '' : ''}</span></div><p className="text-mute">{t.summary}</p></li>) })}
          {!myTix.length && <li className="py-2 text-mute">You have no open requests.</li>}
        </ul>
      </section>
      <People h={h} />
      <Install />
      <Usage />
      <form onSubmit={saveContact} className="panel space-y-3 p-4" aria-label="Contact preferences">
        <h2 className="font-display text-xl font-semibold">{t('How we reach you')}</h2>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="ce">Email</label><input id="ce" className="input bg-field" readOnly value={h.email} /></div>
          <div><label className="label" htmlFor="cp">Phone or WhatsApp</label><input id="cp" className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={opt} onChange={e => setOpt(e.target.checked)} />OK to message me on WhatsApp or by text</label>
        <button className="btn-primary">{t('Save preferences')}</button>
      </form>
    </div>
  )
}

function Usage() {
  const { t } = useT(); const me = useMe(); const [off, setOff] = useState(trackingOff(me.personId))
  return (
    <section className="panel space-y-2 p-4" aria-label="Usage data">
      <h2 className="font-display text-xl font-semibold">{t('Help us improve the portal')}</h2>
      <p className="text-sm text-mute">We count which screens people use and for how long, so we can fix what is confusing and build what you vote for. We never record what you type or upload, and staff see totals only.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!off} onChange={e => { setOff(!e.target.checked); setTrackingOff(me.personId, !e.target.checked) }} />Share anonymous usage data</label>
    </section>
  )
}
