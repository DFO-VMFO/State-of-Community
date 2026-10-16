import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../lib/collections'
import { seedPartners, seedTickets } from '../lib/seed'
import { addPoolEntry } from '../lib/store'
import { catLabel, catPriority } from '../lib/tickets'
import type { Household, Partner, PoolEntry, Ticket, TicketCategory } from '../lib/types'

const cols = [['new', 'New'], ['verifying', 'Verifying'], ['dispatched', 'In progress'], ['resolved', 'Resolved']] as const
const slaHrs = { urgent: 2, high: 8, normal: 24 }
const owners = ['Support manager', 'Operations lead', 'Partnerships coordinator', 'Data specialist']
const money = (n: number) => '$' + n.toLocaleString('en-US')
const fmt = (ms: number) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m` }

export function slaState(t: Ticket, now = Date.now()) {
  if (t.status === 'resolved' || t.firstResponseAt) return { label: 'Responded', tone: 'ok' as const }
  const left = new Date(t.createdAt).getTime() + slaHrs[t.priority] * 3600000 - now
  return left < 0 ? { label: `Overdue by ${fmt(-left)}`, tone: 'bad' as const } : { label: `Reply within ${fmt(left)}`, tone: left < 3600000 ? ('warn' as const) : ('ok' as const) }
}
const tone = { ok: 'bg-forest-100 text-forest', warn: 'bg-sun-100 text-ink', bad: 'bg-crane text-white' }

export default function Support({ households, pool, refresh }: { households: Household[]; pool: PoolEntry[]; refresh: () => Promise<void> }) {
  const nav = useNavigate()
  const { items: tickets, save } = useCollection<Ticket>('tickets', seedTickets)
  const { items: partners } = useCollection<Partner>('partners', seedPartners)
  const [sel, setSel] = useState<string | null>(null); const [adding, setAdding] = useState(false)
  const [amt, setAmt] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState('')
  const name = (id: string) => households.find(h => h.id === id)?.headName ?? 'Household (details restricted)'
  const balance = pool.reduce((a, e) => a + (e.kind === 'contribution' ? e.amount : -e.amount), 0)
  const t = tickets.find(x => x.id === sel)
  const now = Date.now()
  const open = tickets.filter(x => x.status !== 'resolved')
  const overdue = open.filter(x => slaState(x, now).tone === 'bad').length

  const upd = (x: Ticket, patch: Partial<Ticket>, text?: string) => save({ ...x, ...patch, log: text ? [...x.log, { at: new Date().toISOString(), text }] : x.log })
  const respond = (x: Ticket) => x.firstResponseAt ? {} : { firstResponseAt: new Date().toISOString() }

  async function disburse(x: Ticket) {
    const a = Number(amt); setMsg('')
    if (!(a > 0)) return setMsg('Enter an amount greater than zero.')
    if (a > balance) return setMsg(`The pool holds ${money(balance)}, less than ${money(a)}. Send a fundraising broadcast or partner with a nonprofit to co-fund (escalate to the Operations lead).`)
    await addPoolEntry({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), kind: 'claim', amount: a, note: `Ticket ${x.id.slice(0, 6)}: ${catLabel[x.category]}` })
    await upd(x, { disbursement: (x.disbursement ?? 0) + a }, `${money(a)} disbursed from the pool.`); setAmt(''); await refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Support and mutual aid</h1>
          <p className="text-mute">{open.length} open · {overdue ? <span className="font-semibold text-crane">{overdue} past their reply target</span> : 'all within reply targets'} · pool balance {money(balance)}</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>New request</button>
      </div>
      <p className="text-sm text-mute">Reply targets: urgent 2 hours, high 8 hours, normal 24 hours. A request moves to In progress only after membership, documents and a verification call are confirmed.</p>

      {adding && <NewTicket households={households} onCancel={() => setAdding(false)} onSave={async x => { await save(x); setAdding(false); setSel(x.id) }} />}

      <div className="grid gap-3 lg:grid-cols-4">
        {cols.map(([k, label]) => (
          <section key={k} aria-label={label} className="rounded-lg bg-white/60 p-2">
            <h2 className="px-1 pb-2 font-display text-base font-semibold">{label} <span className="text-mute">({tickets.filter(x => x.status === k).length})</span></h2>
            <ul className="space-y-2">
              {tickets.filter(x => x.status === k).sort((a, b) => (a.priority === 'urgent' ? 0 : 1) - (b.priority === 'urgent' ? 0 : 1) || a.createdAt.localeCompare(b.createdAt)).map(x => {
                const s = slaState(x, now)
                return (
                  <li key={x.id}>
                    <button onClick={() => setSel(x.id)} className={`panel w-full p-3 text-left hover:border-forest ${sel === x.id ? 'border-forest ring-2 ring-sun' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{catLabel[x.category]}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${x.priority === 'urgent' ? 'bg-crane text-white' : x.priority === 'high' ? 'bg-sun text-ink' : 'bg-field text-mute'}`}>{x.priority}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium">{name(x.householdId)}</p>
                      <p className="line-clamp-2 text-xs text-mute">{x.summary}</p>
                      <span className={`mt-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${tone[s.tone]}`}>{s.label}</span>
                    </button>
                  </li>
                )
              })}
              {!tickets.some(x => x.status === k) && <li className="px-1 text-xs text-mute">Nothing here.</li>}
            </ul>
          </section>
        ))}
      </div>

      {t && (
        <section className="panel space-y-4 p-4" aria-label="Request detail">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold">{catLabel[t.category]} · {name(t.householdId)}</h2>
              <p className="text-sm text-mute">{t.summary}</p>
            </div>
            <button className="btn-ghost" onClick={() => setSel(null)}>Close</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <fieldset><legend className="label">Verification checklist</legend>
                {([['member', 'Membership confirmed'], ['docs', 'Documents received (e.g. death certificate, statement)'], ['call', 'Verification call done']] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" checked={t.checks[k]} onChange={e => void upd(t, { checks: { ...t.checks, [k]: e.target.checked } }, `${l}: ${e.target.checked ? 'yes' : 'no'}`)} />{l}</label>
                ))}
              </fieldset>
              <div><label className="label" htmlFor="ow">Owner</label>
                <select id="ow" className="input" value={t.owner} onChange={e => void upd(t, { owner: e.target.value }, `Assigned to ${e.target.value}.`)}>{owners.map(o => <option key={o}>{o}</option>)}</select></div>
              <div className="flex flex-wrap gap-2">
                {!t.firstResponseAt && <button className="btn-ghost" onClick={() => void upd(t, respond(t), 'First response sent.')}>Log first reply</button>}
                {t.status === 'new' && <button className="btn-primary" onClick={() => void upd(t, { status: 'verifying', ...respond(t) }, 'Verification started.')}>Start verification</button>}
                {t.status === 'verifying' && <button className="btn-primary" disabled={!Object.values(t.checks).every(Boolean)} onClick={() => void upd(t, { status: 'dispatched' }, 'Verified. Moved to in progress.')}>Mark verified</button>}
                {t.status === 'dispatched' && <button className="btn-primary" onClick={() => void upd(t, { status: 'resolved' }, 'Resolved.')}>Resolve</button>}
                {t.status === 'resolved' && <button className="btn-ghost" onClick={() => void upd(t, { status: 'dispatched' }, 'Reopened.')}>Reopen</button>}
              </div>
              {t.status === 'verifying' && !Object.values(t.checks).every(Boolean) && <p className="text-xs text-mute">Complete all three checks to continue.</p>}
            </div>

            <div className="space-y-3">
              {(t.status === 'dispatched' || t.status === 'resolved') && (<>
                <div><p className="label">Pay from the pool {t.disbursement ? <span className="font-normal text-mute">(paid so far {money(t.disbursement)})</span> : null}</p>
                  <div className="flex gap-2"><input aria-label="Amount in dollars" className="input w-32" inputMode="decimal" placeholder="Amount $" value={amt} onChange={e => setAmt(e.target.value)} /><button className="btn-ghost" onClick={() => void disburse(t)}>Disburse</button></div>
                  {msg && <p role="alert" className="mt-2 text-sm text-crane">{msg} {msg.startsWith('The pool') && <button className="underline" onClick={() => nav('/broadcasts?preset=fundraise')}>Draft fundraising message</button>}</p>}
                </div>
                <div><label className="label" htmlFor="pr">Refer to a listed partner</label>
                  <select id="pr" className="input" value={t.partnerId ?? ''} onChange={e => void upd(t, { partnerId: e.target.value || undefined }, `Referred to ${partners.find(p => p.id === e.target.value)?.name ?? 'no one'}.`)}>
                    <option value="">None</option>{partners.filter(p => p.stage === 'listed').map(p => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
                  </select></div>
              </>)}
              <div><label className="label" htmlFor="nt">Add a note</label>
                <div className="flex gap-2"><input id="nt" className="input" value={note} onChange={e => setNote(e.target.value)} /><button className="btn-ghost" onClick={() => { if (note.trim()) { void upd(t, {}, note.trim()); setNote('') } }}>Add</button></div></div>
            </div>
          </div>
          <div><p className="label">Activity</p>
            <ul className="space-y-1 text-sm">{[...t.log].reverse().map((l, i) => <li key={i}><span className="text-mute">{new Date(l.at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span> {l.text}</li>)}{!t.log.length && <li className="text-mute">No activity yet.</li>}</ul></div>
        </section>
      )}
    </div>
  )
}

function NewTicket({ households, onSave, onCancel }: { households: Household[]; onSave: (t: Ticket) => Promise<void>; onCancel: () => void }) {
  const [hh, setHh] = useState(households[0]?.id ?? ''); const [cat, setCat] = useState<TicketCategory>('bereavement'); const [pr, setPr] = useState<Ticket['priority']>('urgent'); const [sum, setSum] = useState('')
  const sorted = useMemo(() => [...households].sort((a, b) => a.headName.localeCompare(b.headName)), [households])
  return (
    <form className="panel grid gap-3 p-4 md:grid-cols-4" onSubmit={e => { e.preventDefault(); if (!sum.trim()) return; void onSave({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), householdId: hh, category: cat, priority: pr, status: 'new', summary: sum.trim(), owner: 'Support manager', checks: { member: false, docs: false, call: false }, log: [{ at: new Date().toISOString(), text: 'Request logged by staff.' }] }) }}>
      <div><label className="label" htmlFor="nh">Household</label><select id="nh" className="input" value={hh} onChange={e => setHh(e.target.value)}>{sorted.map(h => <option key={h.id} value={h.id}>{h.headName}</option>)}</select></div>
      <div><label className="label" htmlFor="nc">Type</label><select id="nc" className="input" value={cat} onChange={e => { const c = e.target.value as TicketCategory; setCat(c); setPr(catPriority[c]) }}>{(Object.keys(catLabel) as TicketCategory[]).map(c => <option key={c} value={c}>{catLabel[c]}</option>)}</select></div>
      <div><label className="label" htmlFor="np">Priority</label><select id="np" className="input" value={pr} onChange={e => setPr(e.target.value as Ticket['priority'])}><option value="urgent">Urgent (2h)</option><option value="high">High (8h)</option><option value="normal">Normal (24h)</option></select></div>
      <div className="md:col-span-4"><label className="label" htmlFor="ns">What happened?</label><input id="ns" className="input" required value={sum} onChange={e => setSum(e.target.value)} /></div>
      <div className="flex gap-2 md:col-span-4"><button className="btn-primary">Create request</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  )
}
