import { useMemo, useState } from 'react'
import { edition } from '../lib/edition'
import { useCollection } from '../lib/collections'
import { seedPayments } from '../lib/seed'
import { addPoolEntry } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Household, Payment } from '../lib/types'

const money = (n: number) => '$' + n.toLocaleString('en-US')
const thisMonth = new Date().toISOString().slice(0, 7)
const methods = ['Card (Stripe)', 'Zelle', 'Cash', 'Check']
const chip = { paid: 'bg-forest-100 text-forest', due: 'bg-sun-100 text-ink', failed: 'bg-crane text-white' }

export default function Dues({ households, refresh }: { households: Household[]; refresh: () => Promise<void> }) {
  const { items, save, saveMany } = useCollection<Payment>('payments', seedPayments)
  const [month, setMonth] = useState(thisMonth); const [note, setNote] = useState('')
  const months = useMemo(() => [...new Set([...items.map(p => p.month), thisMonth])].sort().reverse(), [items])
  const rows = items.filter(p => p.month === month)
  const active = households.filter(h => h.status === 'active')
  const name = (id: string) => households.find(h => h.id === id)?.headName ?? 'Unknown'
  const tier = (id: string) => households.find(h => h.id === id)?.tier ?? 'basic'
  const expected = active.reduce((a, h) => a + edition.tiers[h.tier].monthly, 0)
  const collected = rows.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0)
  const outstanding = rows.filter(p => p.status !== 'paid').reduce((a, p) => a + p.amount, 0)
  const poolIn = rows.filter(p => p.status === 'paid').reduce((a, p) => a + p.poolPortion, 0)
  const rate = rows.length ? Math.round((rows.filter(p => p.status === 'paid').length / rows.length) * 100) : 0

  async function generate() {
    const missing = active.filter(h => !items.some(p => p.householdId === h.id && p.month === month))
    await saveMany(missing.map(h => ({ id: `pay-${h.id}-${month}`, householdId: h.id, month, amount: edition.tiers[h.tier].monthly, poolPortion: edition.tiers[h.tier].poolShare, status: 'due' as const, method: '' })))
    setNote(missing.length ? `Created ${missing.length} invoices for ${month}.` : `Every active household already has an invoice for ${month}.`)
  }
  async function markPaid(p: Payment, method: string) {
    await save({ ...p, status: 'paid', method, paidAt: new Date().toISOString().slice(0, 10) })
    if (p.poolPortion > 0) await addPoolEntry({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), kind: 'contribution', amount: p.poolPortion, note: `Dues pool share, ${name(p.householdId)}` })
    await refresh()
  }
  async function sendLink(p: Payment) {
    if (!supabase) return setNote(`Demo: a Stripe payment link for ${money(p.amount)} would be texted to ${name(p.householdId)}. Use "Simulate card payment" to see the result.`)
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { paymentId: p.id, householdId: p.householdId, amount: p.amount, month: p.month } })
    if (error) return setNote(`Could not create a payment link: ${error.message}. Deploy create-checkout first (see README).`)
    window.open((data as { url: string }).url, '_blank')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold">Dues</h1>
          <p className="max-w-2xl text-mute">Monthly membership by plan. Standard and Premium include {money(edition.tiers.standard.poolShare)} that goes to the bereavement pool, not to operations.</p></div>
        <div><label className="label" htmlFor="mo">Month</label><select id="mo" className="input" value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m}>{m}</option>)}</select></div>
      </div>
      <p className={`rounded-md p-2 text-sm ${supabase ? 'bg-forest-100' : 'bg-sun-100'}`}>{supabase ? 'Connected: payment links come from your Stripe checkout function.' : 'Demo mode: Stripe is simulated. No real card is charged. Real payments need the Stripe setup in the README.'}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([['Expected per month', money(expected)], ['Collected', money(collected)], ['Outstanding', money(outstanding)], ['Paid on time', `${rate}%`]] as const).map(([l, v]) => (
          <div key={l} className="panel p-4"><p className="font-display text-3xl font-bold tabular-nums">{v}</p><p className="text-sm">{l}</p></div>))}
      </div>
      <p className="text-sm text-mute">{money(poolIn)} of this month’s collected dues went to the bereavement pool.</p>
      <div className="flex flex-wrap items-center gap-3"><button className="btn-ghost" onClick={() => void generate()}>Create invoices for {month}</button>{note && <p role="status" className="text-sm font-medium text-forest">{note}</p>}</div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-field text-mute"><tr><th className="p-3 font-medium">Household</th><th className="p-3 font-medium">Plan</th><th className="p-3 font-medium">Amount</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Paid by</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.sort((a, b) => name(a.householdId).localeCompare(name(b.householdId))).map(p => (
              <tr key={p.id}><td className="p-3 font-medium">{name(p.householdId)}</td><td className="p-3 capitalize">{tier(p.householdId)}</td><td className="p-3 tabular-nums">{money(p.amount)}</td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${chip[p.status]}`}>{p.status === 'failed' ? 'Card failed' : p.status}</span></td>
                <td className="p-3">{p.method || '–'}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  {p.status !== 'paid' && (<>
                    <button className="mr-3 text-forest underline" onClick={() => void sendLink(p)}>{p.status === 'failed' ? 'Resend link' : 'Send link'}</button>
                    {!supabase && <button className="mr-3 text-forest underline" onClick={() => void markPaid(p, 'Card (Stripe)')}>Simulate card payment</button>}
                    <select aria-label={`Record manual payment for ${name(p.householdId)}`} className="rounded border border-line bg-white px-1 py-0.5 text-xs" value="" onChange={e => e.target.value && void markPaid(p, e.target.value)}>
                      <option value="">Record payment…</option>{methods.slice(1).map(m => <option key={m}>{m}</option>)}</select></>)}
                </td></tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-mute">No invoices for {month}. Select “Create invoices for {month}” to bill active members.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
