import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useCollection } from '../lib/collections'
import { supabase } from '../lib/supabase'
import { BOARD_LIMIT, COMMUNITY, allExpenseCats, approveBlock, counts, csv, final, incomeCats, isPay, money, recId, seedAccounts, seedLedger, seedLocks, seedPayees, seedPayroll, seedProjects, seedRecs, statusStyle, ymOf } from '../lib/finance'
import type { AuditRow, LedgerEntry, MonthLock, Payee, PoolEntry, Project, BankAccount, Coi, Recon, Role, Transparency } from '../lib/types'

type Tab = 'overview' | 'ledger' | 'people' | 'projects' | 'close' | 'reports' | 'audit' | 'coi'
const today = () => new Date().toISOString().slice(0, 10)
const monthsBack = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7) })
const blank = (): Partial<LedgerEntry> => ({ accountId: undefined, kind: 'expense', date: today(), category: 'Venue', amount: undefined, payee: '', memo: '', project: '' })

export default function Finance({ pool }: { pool: PoolEntry[] }) {
  const { session } = useAuth(); const s = session?.kind === 'staff' ? session : null
  const role = s?.role ?? 'support'; const email = s?.email ?? ''; const priv = role === 'ops' || role === 'board'
  const ledger = useCollection<LedgerEntry>('ledger', seedLedger); const payroll = useCollection<LedgerEntry>('payroll', seedPayroll)
  const payees = useCollection<Payee>('payees', seedPayees); const projects = useCollection<Project>('projects', seedProjects)
  const recs = useCollection<Recon>('recs', seedRecs); const locks = useCollection<MonthLock>('locks', seedLocks); const audit = useCollection<AuditRow>('audit', () => [])
  const pub = useCollection<Transparency>('transparency', () => [])
  const accounts = useCollection<BankAccount>('accounts', seedAccounts)
  const cois = useCollection<Coi>('coi', () => [])
  const related = cois.items.flatMap(c => c.parties.map(party => ({ party: party.trim().toLowerCase(), who: c.name || c.email }))).filter(r => r.party)
  const [tab, setTab] = useState<Tab>('overview'); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const all = useMemo(() => [...ledger.items, ...(priv ? payroll.items : [])], [ledger.items, payroll.items, priv])
  const locked = new Set(locks.items.map(l => l.id)); const poolBalance = pool.reduce((a, e) => a + (e.kind === 'contribution' ? e.amount : -e.amount), 0)
  const year = String(new Date().getFullYear())
  const ytd = all.filter(e => counts(e) && e.date.startsWith(year))
  const inc = ytd.filter(e => e.kind === 'income').reduce((a, e) => a + e.amount, 0); const exp = ytd.filter(e => e.kind === 'expense').reduce((a, e) => a + e.amount, 0)
  const pending = all.filter(e => e.status === 'pending')
  const mine = pending.filter(e => !approveBlock(e, role, email))

  const colOf = (e: Pick<LedgerEntry, 'category'>) => (isPay(e.category) ? payroll : ledger)
  const say = (ok: boolean, t: string) => setMsg({ ok, t })
  async function log(action: string, e: LedgerEntry) {
    if (supabase) return // the database writes the audit log itself
    await audit.save({ id: crypto.randomUUID(), at: new Date().toISOString(), actor: email, action, collection: isPay(e.category) ? 'payroll' : 'ledger', entryId: e.id, status: e.status, amount: e.amount, memo: (e.memo || e.payee).slice(0, 80) })
  }
  async function change(e: LedgerEntry, patch: Partial<LedgerEntry>, action: string, okMsg: string) {
    const next = { ...e, ...patch }
    try {
      if (locked.has(ymOf(e.date))) throw new Error('That month is locked.')
      if (final(e.status)) throw new Error('Paid and void entries are final.')
      await colOf(e).save(next); await log(action, next); say(true, okMsg)
    } catch (x) { say(false, (x as Error).message) }
  }
  const approve = (e: LedgerEntry) => { const b = approveBlock(e, role, email); if (b) return say(false, b); void change(e, { status: 'approved', approvedBy: email, approvedAt: new Date().toISOString() }, 'approve', 'Approved.') }

  const tabs: [Tab, string, boolean][] = [['overview', 'Overview', true], ['ledger', 'Ledger', true], ['people', 'People and pay', priv], ['projects', 'Events and projects', true], ['close', 'Month close', priv], ['reports', 'Member report', priv], ['audit', 'Audit log', priv], ['coi', 'Conflicts', true]]
  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Finance</h1>
        <p className="max-w-3xl text-mute">The community’s day-to-day books. Every entry needs a second person to approve it, approved entries are never edited (only voided), and every change is logged. Your accountant’s system (QuickBooks or similar) stays the official record: export from here each month.</p></div>
      <div className="flex flex-wrap gap-2" role="tablist">{tabs.filter(t => t[2]).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${tab === k ? 'border-forest bg-forest text-white' : 'border-line bg-white'}`}>{l}{k === 'overview' && mine.length > 0 && <span className="ml-1.5 rounded-full bg-crane px-1.5 text-xs text-white">{mine.length}</span>}</button>)}</div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md p-2 text-sm font-medium ${msg.ok ? 'bg-forest-100' : 'border border-crane bg-white text-crane'}`}>{msg.t}</p>}

      {tab === 'overview' && <Overview {...{ inc, exp, pending, mine, approve, all, ytd, poolBalance, locks: locks.items.length, setTab, priv }} />}
      {tab === 'ledger' && <Ledger {...{ accounts: accounts.items, related, all, role, email, ledger, payroll, payees: payees.items, projects: projects.items, locked, change, approve, log, say, colOf }} />}
      {tab === 'people' && priv && <People {...{ payees, all, year }} />}
      {tab === 'projects' && <Projects {...{ projects, all }} />}
      {tab === 'close' && priv && <Close {...{ all, accounts, recs, locks, role, email, say, log: audit }} />}
      {tab === 'reports' && priv && <Reports {...{ all, pub, poolBalance, email, say }} />}
      {tab === 'coi' && <Conflicts {...{ cois, email, name: s?.name ?? email, say }} />}
      {tab === 'audit' && priv && <Audit rows={audit.items} />}
    </div>
  )
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return <div className="panel p-4"><p className={`font-display text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value}</p><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-mute">{hint}</p>}</div>
}

type Chg = (e: LedgerEntry, p: Partial<LedgerEntry>, a: string, m: string) => Promise<void>

function Overview({ inc, exp, pending, mine, approve, ytd, poolBalance, locks, setTab, all }: { inc: number; exp: number; pending: LedgerEntry[]; mine: LedgerEntry[]; approve: (e: LedgerEntry) => void; ytd: LedgerEntry[]; poolBalance: number; locks: number; setTab: (t: Tab) => void; all: LedgerEntry[]; priv: boolean }) {
  const cats = Object.entries(ytd.filter(e => e.kind === 'expense').reduce<Record<string, number>>((m, e) => ({ ...m, [e.category]: (m[e.category] ?? 0) + e.amount }), {})).sort((a, b) => b[1] - a[1])
  const max = cats[0]?.[1] ?? 1
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Income this year" value={money(inc)} hint="Approved and paid" /><Kpi label="Spending this year" value={money(exp)} />
        <Kpi label="Net" value={money(inc - exp)} tone={inc - exp < 0 ? 'text-crane' : ''} /><Kpi label="Waiting for approval" value={String(pending.length)} hint={`${mine.length} you can approve`} />
        <Kpi label="Bereavement pool" value={money(poolBalance)} hint={`${locks} month${locks === 1 ? '' : 's'} locked`} />
      </div>
      <section className="panel p-4" aria-label="Needs your approval"><h2 className="font-display text-xl font-semibold">Needs your approval</h2>
        <ul className="mt-2 divide-y divide-line text-sm">{mine.map(e => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{money(e.amount)}</b> · {e.payee} · {e.category}{e.project ? ` · ${e.project}` : ''} <span className="text-mute">· entered by {e.createdBy}</span></span><button className="btn-primary px-3 py-1" onClick={() => approve(e)}>Approve</button></li>)}
          {!mine.length && <li className="py-2 text-mute">Nothing waiting for you.{pending.length > 0 && ` ${pending.length} pending entr${pending.length === 1 ? 'y needs' : 'ies need'} someone else (for example the board for $${BOARD_LIMIT.toLocaleString()}+ and payroll).`}</li>}</ul>
        {pending.length > 0 && <button className="mt-1 text-sm underline" onClick={() => setTab('ledger')}>Open the ledger</button>}</section>
      <section className="panel p-4" aria-label="Spending by category"><h2 className="font-display text-xl font-semibold">Where the money went this year</h2>
        <ul className="mt-2 space-y-2">{cats.map(([c, v]) => <li key={c}><div className="flex justify-between text-sm"><span>{c}</span><span className="tabular-nums">{money(v)}</span></div><div className="h-2 rounded bg-field"><div className="h-2 rounded bg-forest" style={{ width: `${(v / max) * 100}%` }} /></div></li>)}
          {!cats.length && <li className="text-mute">No approved spending yet.</li>}</ul>
        <p className="mt-2 text-xs text-mute">{all.length} entries in view. Compare with the Financial model page to see how actuals track against the plan.</p></section>
    </div>
  )
}

function Ledger({ accounts, related, all, role, email, ledger, payroll, payees, projects, locked, change, approve, log, say, colOf }: {
  accounts: BankAccount[]; related: { party: string; who: string }[]; all: LedgerEntry[]; role: Role; email: string; ledger: ReturnType<typeof useCollection<LedgerEntry>>; payroll: ReturnType<typeof useCollection<LedgerEntry>>; payees: Payee[]; projects: Project[]
  locked: Set<string>; change: Chg; approve: (e: LedgerEntry) => void; log: (a: string, e: LedgerEntry) => Promise<void>; say: (ok: boolean, t: string) => void; colOf: (e: Pick<LedgerEntry, 'category'>) => typeof ledger }) {
  const [f, setF] = useState<Partial<LedgerEntry> | null>(null); const [month, setMonth] = useState('all'); const [st, setSt] = useState('all'); const [reason, setReason] = useState<{ id: string; kind: 'reject' | 'void' } | null>(null); const [why, setWhy] = useState('')
  const [acct, setAcct] = useState('all'); const names = Object.fromEntries(accounts.map(a => [a.id, a.name])); const [pay, setPay] = useState<string | null>(null); const [ref, setRef] = useState(''); const [exp, setExp] = useState(false)
  const months = monthsBack(8); const priv = role === 'ops' || role === 'board'
  const rows = all.filter(e => (month === 'all' || ymOf(e.date) === month) && (st === 'all' || e.status === st) && (acct === 'all' || e.accountId === acct)).sort((a, b) => b.date.localeCompare(a.date))
  const cats = f?.kind === 'income' ? incomeCats : priv ? allExpenseCats : allExpenseCats.filter(c => !isPay(c))
  async function submit(status: 'draft' | 'pending') {
    if (!f || !f.amount || f.amount <= 0 || !f.payee?.trim()) return say(false, 'Enter an amount and who it is from or to.')
    if (!f.accountId) return say(false, 'Choose which bank account this goes through.')
    if (locked.has(ymOf(f.date ?? today()))) return say(false, 'That month is locked.')
    const e: LedgerEntry = { id: crypto.randomUUID(), date: f.date ?? today(), kind: f.kind ?? 'expense', amount: Math.round(f.amount * 100) / 100, category: f.category ?? 'Other expense', community: COMMUNITY, accountId: f.accountId, project: f.project || undefined, payee: f.payee.trim(), payeeId: f.payeeId, memo: f.memo?.trim() || undefined, receipt: f.receipt?.trim() || undefined, status, createdBy: email, createdAt: new Date().toISOString() }
    try { await colOf(e).save(e); await log('insert', e); setF(null); say(true, status === 'pending' ? 'Submitted for approval.' : 'Saved as a draft.') } catch (x) { say(false, (x as Error).message) }
  }
  async function del(e: LedgerEntry) { try { await colOf(e).remove(e.id); await log('delete', e); say(true, 'Draft deleted.') } catch (x) { say(false, (x as Error).message) } }
  const exportRows = rows.filter(e => counts(e) && e.kind != null)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <button className="btn-primary" onClick={() => setF(blank())}>New entry</button>
        <div><label className="label" htmlFor="fm">Month</label><select id="fm" className="input py-1" value={month} onChange={e => setMonth(e.target.value)}><option value="all">All</option>{months.map(m => <option key={m}>{m}</option>)}</select></div>
        <div><label className="label" htmlFor="fs">Status</label><select id="fs" className="input py-1" value={st} onChange={e => setSt(e.target.value)}><option value="all">All</option>{['draft', 'pending', 'approved', 'paid', 'rejected', 'void'].map(x => <option key={x}>{x}</option>)}</select></div>
        <div><label className="label" htmlFor="fa">Bank account</label><select id="fa" className="input py-1" value={acct} onChange={e => setAcct(e.target.value)}><option value="all">All</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        {priv && <button className="btn-ghost" onClick={() => setExp(x => !x)} aria-expanded={exp}>Export for QuickBooks</button>}
      </div>
      {exp && <div className="panel space-y-2 p-3"><p className="text-sm text-mute">Approved and paid entries in the filter above ({exportRows.length}). Copy into a spreadsheet and import to QuickBooks, or send it to your bookkeeper.</p>
        <textarea readOnly className="input h-32 font-mono text-xs" value={csv([...exportRows], names)} aria-label="CSV export" />
        <button className="btn-ghost" onClick={() => { void navigator.clipboard?.writeText(csv([...exportRows], names)).then(() => say(true, 'Copied.')).catch(() => say(false, 'Select the text and copy it.')) }}>Copy</button></div>}
      {f && <form className="panel grid gap-3 p-4 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); void submit('pending') }} aria-label="New entry">
        <div><label className="label" htmlFor="nk">Type</label><select id="nk" className="input" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as 'income' | 'expense', category: e.target.value === 'income' ? 'Dues' : 'Venue' })}><option value="expense">Money out</option><option value="income">Money in</option></select></div>
        <div><label className="label" htmlFor="nd">Date</label><input id="nd" type="date" className="input" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
        <div><label className="label" htmlFor="na">Amount ($)</label><input id="na" type="number" min="0" step="0.01" className="input" value={f.amount ?? ''} onChange={e => setF({ ...f, amount: Number(e.target.value) })} /></div>
        <div><label className="label" htmlFor="nb">Bank account</label><select id="nb" className="input" value={f.accountId ?? ''} onChange={e => setF({ ...f, accountId: e.target.value })}><option value="">Choose…</option>{accounts.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name} ····{a.last4}</option>)}</select></div>
        <div><label className="label" htmlFor="nc">Category</label><select id="nc" className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="np">{f.kind === 'income' ? 'From' : 'Paid to'}</label>
          {isPay(f.category ?? '') ? <select id="np" className="input" value={f.payeeId ?? ''} onChange={e => { const p = payees.find(x => x.id === e.target.value); setF({ ...f, payeeId: p?.id, payee: p?.name ?? '' }) }}><option value="">Choose a person (add them under People and pay)</option>{payees.filter(p => p.type !== 'vendor').map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}</select>
            : <input id="np" className="input" value={f.payee} onChange={e => setF({ ...f, payee: e.target.value })} />}</div>
        <div><label className="label" htmlFor="nj">Event or project</label><input id="nj" list="proj" className="input" value={f.project} onChange={e => setF({ ...f, project: e.target.value })} /><datalist id="proj">{projects.map(p => <option key={p.id} value={p.name} />)}</datalist></div>
        <div><label className="label" htmlFor="nr">Receipt or invoice no.</label><input id="nr" className="input" placeholder="Where the receipt is filed" value={f.receipt ?? ''} onChange={e => setF({ ...f, receipt: e.target.value })} /></div>
        <div className="sm:col-span-4"><label className="label" htmlFor="nm">What it was for</label><input id="nm" className="input" value={f.memo} onChange={e => setF({ ...f, memo: e.target.value })} /></div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-4"><button className="btn-primary">Submit for approval</button><button type="button" className="btn-ghost" onClick={() => void submit('draft')}>Save draft</button><button type="button" className="btn-ghost" onClick={() => setF(null)}>Cancel</button>
          <span className="text-xs text-mute">You can’t approve your own entry. {money(BOARD_LIMIT)}+ and payroll need the board.</span></div></form>}
      <div className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Ledger</caption>
        <thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Date</th><th className="p-3">What</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{rows.map(e => { const b = approveBlock(e, role, email); const isMine = e.createdBy.toLowerCase() === email.toLowerCase(); return (
          <tr key={e.id} className="border-b border-line align-top last:border-0">
            <td className="p-3 whitespace-nowrap">{e.date}</td>
            <td className="p-3"><b>{e.payee}</b> <span className="text-mute">· {e.category}{e.project ? ` · ${e.project}` : ''}</span>{e.memo && <span className="block text-xs text-mute">{e.memo}</span>}{related.filter(r => e.payee.toLowerCase().includes(r.party)).map(r => <span key={r.who} className="mt-0.5 block w-fit rounded bg-crane px-1.5 text-xs font-bold text-white">Disclosed tie: {r.who}. Needs an independent approver.</span>)}<span className="block text-xs text-mute">{names[e.accountId ?? ''] ?? 'No account'} · by {e.createdBy}{e.approvedBy ? ` · approved by ${e.approvedBy}` : ''}{e.rejectedReason ? ` · rejected: ${e.rejectedReason}` : ''}{e.voidReason ? ` · void: ${e.voidReason}` : ''}{e.receipt ? ` · receipt: ${e.receipt}` : ''}</span></td>
            <td className={`p-3 text-right tabular-nums ${e.kind === 'income' ? 'text-forest' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(e.amount)}</td>
            <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[e.status]}`}>{e.status}</span></td>
            <td className="p-3">
              {reason?.id === e.id ? <span className="flex flex-wrap items-center gap-1"><input aria-label="Reason" className="input w-40 py-1" placeholder="Reason" value={why} onChange={x => setWhy(x.target.value)} />
                <button className="btn-ghost px-2 py-1" onClick={() => { if (!why.trim()) return say(false, 'A reason is required.'); void change(e, reason.kind === 'void' ? { status: 'void', voidReason: why.trim() } : { status: 'rejected', rejectedReason: why.trim() }, reason.kind, reason.kind === 'void' ? 'Voided.' : 'Rejected.'); setReason(null); setWhy('') }}>Confirm</button><button className="btn-ghost px-2 py-1" onClick={() => setReason(null)}>Cancel</button></span>
              : pay === e.id ? <span className="flex flex-wrap items-center gap-1"><input aria-label="Payment reference" className="input w-40 py-1" placeholder="Check or transfer no." value={ref} onChange={x => setRef(x.target.value)} /><button className="btn-ghost px-2 py-1" onClick={() => { void change(e, { status: 'paid', paidAt: today(), paidRef: ref.trim() || undefined }, 'paid', 'Marked paid.'); setPay(null); setRef('') }}>Mark paid</button><button className="btn-ghost px-2 py-1" onClick={() => setPay(null)}>Cancel</button></span>
              : <span className="flex flex-wrap gap-1">
                {e.status === 'draft' && isMine && <><button className="btn-primary px-2 py-1" onClick={() => void change(e, { status: 'pending' }, 'submit', 'Submitted for approval.')}>Submit</button><button className="btn-ghost px-2 py-1" onClick={() => void del(e)}>Delete</button></>}
                {e.status === 'rejected' && isMine && <><button className="btn-ghost px-2 py-1" onClick={() => void change(e, { status: 'pending', rejectedReason: undefined }, 'resubmit', 'Resubmitted.')}>Resubmit</button><button className="btn-ghost px-2 py-1" onClick={() => void del(e)}>Delete</button></>}
                {e.status === 'pending' && (b ? <span className="text-xs text-mute" title={b}>{isMine ? 'Waiting for someone else' : priv ? b : 'Waiting for approval'}</span> : <><button className="btn-primary px-2 py-1" onClick={() => approve(e)}>Approve</button><button className="btn-ghost px-2 py-1" onClick={() => setReason({ id: e.id, kind: 'reject' })}>Reject</button></>)}
                {e.status === 'approved' && priv && <><button className="btn-ghost px-2 py-1" onClick={() => setPay(e.id)}>Mark paid</button><button className="btn-ghost px-2 py-1" onClick={() => setReason({ id: e.id, kind: 'void' })}>Void</button></>}
              </span>}
            </td></tr>) })}
          {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-mute">No entries match.</td></tr>}</tbody></table></div>
    </div>
  )
}

function People({ payees, all, year }: { payees: ReturnType<typeof useCollection<Payee>>; all: LedgerEntry[]; year: string }) {
  const [n, setN] = useState(''); const [t, setT] = useState<Payee['type']>('contractor')
  const paid = (id: string) => all.filter(e => e.payeeId === id && counts(e) && e.date.startsWith(year)).reduce((a, e) => a + e.amount, 0)
  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm text-mute">Employees should be paid through a payroll provider; the ledger records the totals. Contractors need a W-9 on file before the first payment, and a 1099 is usually due for contractors paid above the IRS threshold in a year. Ask your CPA for the current threshold. Only the operations lead and the board can see this page.</p>
      <form className="panel flex flex-wrap items-end gap-3 p-3" onSubmit={e => { e.preventDefault(); if (!n.trim()) return; void payees.save({ id: crypto.randomUUID(), name: n.trim(), type: t, w9: false }); setN('') }}>
        <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={n} onChange={e => setN(e.target.value)} /></div>
        <div><label className="label" htmlFor="pt">Type</label><select id="pt" className="input" value={t} onChange={e => setT(e.target.value as Payee['type'])}><option value="employee">Employee</option><option value="contractor">Contractor</option><option value="vendor">Vendor</option></select></div>
        <button className="btn-primary">Add person</button></form>
      <div className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">People and vendors</caption>
        <thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">W-9 on file</th><th className="p-3 text-right">Paid this year</th><th className="p-3">Flag</th></tr></thead>
        <tbody>{payees.items.map(p => { const y = paid(p.id); return (
          <tr key={p.id} className="border-b border-line last:border-0"><td className="p-3 font-medium">{p.name}</td><td className="p-3 capitalize">{p.type}</td>
            <td className="p-3"><label className="flex items-center gap-2"><input type="checkbox" checked={p.w9} onChange={e => void payees.save({ ...p, w9: e.target.checked })} />Yes</label></td>
            <td className="p-3 text-right tabular-nums">{money(y)}</td>
            <td className="p-3 text-xs">{p.type !== 'employee' && !p.w9 && y > 0 ? <span className="rounded bg-crane px-2 py-0.5 font-bold text-white">Paid without a W-9</span> : p.type === 'contractor' && p.w9 && y >= 600 ? <span className="text-mute">Likely 1099 at year end</span> : ''}</td></tr>) })}</tbody></table></div>
    </div>
  )
}

function Projects({ projects, all }: { projects: ReturnType<typeof useCollection<Project>>; all: LedgerEntry[] }) {
  const [n, setN] = useState(''); const [b, setB] = useState('')
  const spent = (name: string) => all.filter(e => e.project === name && e.kind === 'expense' && e.status !== 'void' && e.status !== 'rejected' && e.status !== 'draft').reduce((a, e) => a + e.amount, 0)
  const raised = (name: string) => all.filter(e => e.project === name && e.kind === 'income' && counts(e)).reduce((a, e) => a + e.amount, 0)
  return (
    <div className="space-y-3">
      <form className="panel flex flex-wrap items-end gap-3 p-3" onSubmit={e => { e.preventDefault(); if (!n.trim()) return; void projects.save({ id: crypto.randomUUID(), name: n.trim(), community: COMMUNITY, budget: Number(b) || 0 }); setN(''); setB('') }}>
        <div><label className="label" htmlFor="jn">Event or project</label><input id="jn" className="input" value={n} onChange={e => setN(e.target.value)} /></div>
        <div><label className="label" htmlFor="jb">Budget ($)</label><input id="jb" type="number" min="0" className="input w-32" value={b} onChange={e => setB(e.target.value)} /></div>
        <button className="btn-primary">Add</button></form>
      <ul className="grid gap-3 md:grid-cols-2">{projects.items.map(p => { const sp = spent(p.name); const over = sp > p.budget && p.budget > 0; return (
        <li key={p.id} className="panel p-4"><div className="flex justify-between gap-2"><b>{p.name}</b><span className={`text-sm font-semibold ${over ? 'text-crane' : ''}`}>{money(sp)} of {money(p.budget)}</span></div>
          <div className="mt-2 h-2 rounded bg-field"><div className={`h-2 rounded ${over ? 'bg-crane' : 'bg-forest'}`} style={{ width: `${p.budget ? Math.min(100, (sp / p.budget) * 100) : 0}%` }} /></div>
          <p className="mt-1 text-xs text-mute">{over ? `Over budget by ${money(sp - p.budget)}. ` : ''}Raised {money(raised(p.name))} · Spending includes entries waiting for approval.</p></li>) })}</ul>
    </div>
  )
}

function Close({ all, accounts, recs, locks, role, email, say }: { all: LedgerEntry[]; accounts: ReturnType<typeof useCollection<BankAccount>>; recs: ReturnType<typeof useCollection<Recon>>; locks: ReturnType<typeof useCollection<MonthLock>>; role: string; email: string; say: (ok: boolean, t: string) => void; log: unknown }) {
  const [bank, setBank] = useState<Record<string, string>>({}); const [by, setBy] = useState<Record<string, string>>({}); const [un, setUn] = useState<string | null>(null)
  const [na, setNa] = useState({ name: '', bank: '', last4: '', purpose: '' }); const [adding, setAdding] = useState(false)
  const accts = accounts.items.filter(a => a.active)
  const net = (m: string, id: string) => all.filter(e => ymOf(e.date) === m && counts(e) && e.accountId === id).reduce((x, e) => x + (e.kind === 'income' ? e.amount : -e.amount), 0)
  const balance = (id: string) => all.filter(e => counts(e) && e.accountId === id).reduce((x, e) => x + (e.kind === 'income' ? e.amount : -e.amount), 0)
  const unassigned = all.filter(e => !e.accountId).length
  function addAccount(e: React.FormEvent) {
    e.preventDefault(); if (!na.name.trim() || !/^\d{4}$/.test(na.last4)) return say(false, 'Enter a name and the last 4 digits of the account number. Never enter the full number.')
    void accounts.save({ id: crypto.randomUUID(), community: COMMUNITY, name: na.name.trim(), bank: na.bank.trim(), last4: na.last4, purpose: na.purpose.trim(), active: true }).then(() => { setNa({ name: '', bank: '', last4: '', purpose: '' }); setAdding(false); say(true, 'Account added.') }).catch(x => say(false, (x as Error).message))
  }
  return (
    <div className="space-y-3">
      <section className="panel space-y-2 p-4" aria-label="Bank accounts">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Bank accounts for {COMMUNITY}</h2><button className="btn-ghost" onClick={() => setAdding(x => !x)}>Add account</button></div>
        <p className="text-sm text-mute">Each community keeps its own accounts in its own name, never mixed with another community or with personal money. Every ledger entry is tagged to one account, and each account is reconciled on its own.</p>
        {adding && <form className="grid gap-2 sm:grid-cols-5 sm:items-end" onSubmit={addAccount}>
          <div><label className="label" htmlFor="an">Name</label><input id="an" className="input" value={na.name} onChange={e => setNa({ ...na, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="ab">Bank</label><input id="ab" className="input" value={na.bank} onChange={e => setNa({ ...na, bank: e.target.value })} /></div>
          <div><label className="label" htmlFor="al">Last 4 digits</label><input id="al" className="input" inputMode="numeric" maxLength={4} value={na.last4} onChange={e => setNa({ ...na, last4: e.target.value })} /></div>
          <div><label className="label" htmlFor="ap">What it is for</label><input id="ap" className="input" value={na.purpose} onChange={e => setNa({ ...na, purpose: e.target.value })} /></div>
          <button className="btn-primary">Save</button></form>}
        <ul className="divide-y divide-line text-sm">{accts.map(a => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{a.name}</b> · {a.bank} ····{a.last4}<span className="block text-xs text-mute">{a.purpose}</span></span><span className="flex items-center gap-3"><b className="tabular-nums">{money(balance(a.id))}</b><button className="btn-ghost px-2 py-1 text-xs" onClick={() => void accounts.save({ ...a, active: false }).then(() => say(true, 'Account closed. Past entries keep their tag.'))}>Close account</button></span></li>)}</ul>
        {unassigned > 0 && <p className="text-sm text-crane">{unassigned} older entr{unassigned === 1 ? 'y has' : 'ies have'} no bank account and are left out of these balances.</p>}
      </section>
      <p className="max-w-3xl text-sm text-mute">Each month: someone who does not handle the money compares every bank statement with the ledger, then the month is locked. Locked months accept no new or changed entries. Only the board can unlock one.</p>
      <ul className="space-y-3">{monthsBack(6).map(m => {
        const lock = locks.items.find(l => l.id === m); const open = all.filter(e => ymOf(e.date) === m && (e.status === 'pending' || e.status === 'draft')).length
        const rows = accts.map(a => { const rec = recs.items.find(r => r.id === recId(m, a.id)); return { a, rec, diff: rec ? Math.round((rec.bankBalance - rec.ledgerBalance) * 100) / 100 : 0 } })
        const done = rows.every(r => r.rec); const clean = rows.every(r => r.diff === 0)
        return (<li key={m} className="panel p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{m}</b>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${lock ? 'bg-forest text-white' : 'bg-field text-mute'}`}>{lock ? 'Locked' : 'Open'}</span></div>
          {open > 0 && <p className="text-sm text-crane">{open} entr{open === 1 ? 'y' : 'ies'} still pending or in draft</p>}
          <ul className="mt-1 divide-y divide-line">{rows.map(({ a, rec, diff }) => { const k = recId(m, a.id); return (
            <li key={a.id} className="py-2 text-sm"><p><b>{a.name}</b> · ledger net <b>{money(net(m, a.id))}</b></p>
              {rec ? <p>Bank statement net {money(rec.bankBalance)} · reconciled by <b>{rec.reconciledBy}</b>{diff !== 0 ? <span className="text-crane"> · difference {money(diff)}: explain before locking</span> : ' · matches the ledger'}</p>
                : !lock && <div className="mt-1 flex flex-wrap items-end gap-2"><div><label className="label" htmlFor={`b${k}`}>Statement net for {a.name} ($)</label><input id={`b${k}`} type="number" className="input w-40" value={bank[k] ?? ''} onChange={e => setBank({ ...bank, [k]: e.target.value })} /></div>
                  <div><label className="label" htmlFor={`r${k}`}>Reconciled by (not the person who enters entries)</label><input id={`r${k}`} className="input w-64" value={by[k] ?? ''} onChange={e => setBy({ ...by, [k]: e.target.value })} /></div>
                  <button className="btn-ghost" onClick={() => { const v = Number(bank[k]); if (Number.isNaN(v) || bank[k] === undefined || bank[k] === '' || !by[k]?.trim()) return say(false, 'Enter the bank figure and who reconciled it.'); void recs.save({ id: k, accountId: a.id, bankBalance: v, ledgerBalance: net(m, a.id), reconciledBy: by[k].trim(), at: new Date().toISOString() }).then(() => say(true, 'Reconciliation saved.')).catch(x => say(false, (x as Error).message)) }}>Save reconciliation</button></div>}</li>) })}</ul>
          <div className="mt-2 flex gap-2">
            {!lock && <button className="btn-primary" onClick={() => { if (!done) return say(false, 'Reconcile every bank account first.'); if (open > 0) return say(false, 'Approve, reject or delete the pending entries first.'); if (!clean) return say(false, 'A bank and the ledger differ. Fix or explain the difference first.'); void locks.save({ id: m, by: email, at: new Date().toISOString() }).then(() => say(true, `${m} is locked.`)).catch(x => say(false, (x as Error).message)) }}>Lock month</button>}
            {lock && role === 'board' && (un === m ? <><button className="btn-ghost text-crane" onClick={() => void locks.remove(m).then(() => { setUn(null); say(true, `${m} unlocked. It is recorded in the audit log.`) }).catch(x => say(false, (x as Error).message))}>Confirm unlock</button><button className="btn-ghost" onClick={() => setUn(null)}>Keep locked</button></> : <button className="btn-ghost" onClick={() => setUn(m)}>Unlock (board)</button>)}
            {lock && role !== 'board' && <span className="text-xs text-mute">Locked by {lock.by}. Only the board can unlock.</span>}</div></li>) })}</ul>
    </div>
  )
}

function Reports({ all, pub, poolBalance, email, say }: { all: LedgerEntry[]; pub: ReturnType<typeof useCollection<Transparency>>; poolBalance: number; email: string; say: (ok: boolean, t: string) => void }) {
  const now = new Date(); const [q, setQ] = useState(`${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`); const [note, setNote] = useState(''); const [ask, setAsk] = useState(false)
  const [yr, qn] = [q.slice(0, 4), Number(q.slice(-1))]; const inQ = (d: string) => d.startsWith(yr) && Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1 === qn
  const rows = all.filter(e => counts(e) && inQ(e.date)); const income = rows.filter(e => e.kind === 'income').reduce((a, e) => a + e.amount, 0)
  const by: Record<string, number> = {}; rows.filter(e => e.kind === 'expense').forEach(e => { const c = isPay(e.category) ? 'Staff and contractors' : e.category; by[c] = (by[c] ?? 0) + e.amount })
  const byCategory = Object.entries(by).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount); const expenses = byCategory.reduce((a, c) => a + c.amount, 0)
  const qs = [0, 1, 2, 3, 4, 5].map(i => { const d = new Date(); d.setMonth(d.getMonth() - i * 3); return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}` }).filter((v, i, a) => a.indexOf(v) === i)
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-mute">Publish a quarterly summary that every member sees on their Home page: income, spending by category and the pool balance. Salaries and individual payments are never shown, only a combined “Staff and contractors” line.</p>
      <div className="panel space-y-3 p-4"><div className="flex flex-wrap items-end gap-3"><div><label className="label" htmlFor="rq">Quarter</label><select id="rq" className="input py-1" value={q} onChange={e => setQ(e.target.value)}>{qs.map(x => <option key={x}>{x}</option>)}</select></div></div>
        <p className="text-sm">Income <b>{money(income)}</b> · Spending <b>{money(expenses)}</b> · Pool balance <b>{money(poolBalance)}</b></p>
        <ul className="text-sm text-mute">{byCategory.map(c => <li key={c.category}>{c.category}: {money(c.amount)}</li>)}{!byCategory.length && <li>No approved entries in this quarter.</li>}</ul>
        <div><label className="label" htmlFor="rn">Note to members (optional)</label><input id="rn" className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
        {ask ? <div className="flex gap-2"><button className="btn-primary" onClick={() => void pub.save({ id: q, label: q.replace('-', ' '), income, expenses, byCategory, poolBalance, note: note.trim() || undefined, publishedBy: email, publishedAt: new Date().toISOString() }).then(() => { setAsk(false); say(true, 'Published. Members can now see it on their Home page.') }).catch(x => say(false, (x as Error).message))}>Yes, publish to all members</button><button className="btn-ghost" onClick={() => setAsk(false)}>Cancel</button></div>
          : <button className="btn-primary" onClick={() => setAsk(true)}>Publish to members</button>}</div>
      <h2 className="font-display text-lg font-semibold">Published</h2>
      <ul className="panel divide-y divide-line text-sm">{pub.items.map(p => <li key={p.id} className="flex justify-between gap-2 p-3"><span><b>{p.label}</b> · income {money(p.income)} · spending {money(p.expenses)}</span><span className="text-mute">{p.publishedAt.slice(0, 10)} by {p.publishedBy}</span></li>)}{!pub.items.length && <li className="p-3 text-mute">Nothing published yet.</li>}</ul>
    </div>
  )
}

function Audit({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="space-y-2"><p className="max-w-3xl text-sm text-mute">Every entry, approval, void, lock and unlock. Nobody can edit or delete this list. In the live database it is written automatically by the database itself.</p>
      <div className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Audit log</caption>
        <thead><tr className="border-b border-line text-left text-mute"><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">What</th></tr></thead>
        <tbody>{[...rows].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100).map(r => <tr key={r.id} className="border-b border-line last:border-0"><td className="p-3 whitespace-nowrap">{r.at.slice(0, 16).replace('T', ' ')}</td><td className="p-3">{r.actor}</td><td className="p-3">{r.action} {r.collection}{r.status ? ` (${r.status})` : ''}{r.amount != null ? ` · ${money(Number(r.amount))}` : ''}{r.memo ? ` · ${r.memo}` : ''}</td></tr>)}
          {!rows.length && <tr><td colSpan={3} className="p-6 text-center text-mute">Nothing yet. Actions you take here appear in this list.</td></tr>}</tbody></table></div></div>
  )
}

function Conflicts({ cois, email, name, say }: { cois: ReturnType<typeof useCollection<Coi>>; email: string; name: string; say: (ok: boolean, t: string) => void }) {
  const year = new Date().getFullYear(); const mine = cois.items.find(c => c.email.toLowerCase() === email.toLowerCase() && c.year === year)
  const [none, setNone] = useState(true); const [parties, setParties] = useState(''); const [notes, setNotes] = useState('')
  async function sign(e: React.FormEvent) {
    e.preventDefault(); const list = parties.split(',').map(x => x.trim()).filter(Boolean)
    if (!none && !list.length) return say(false, 'List the people or businesses, or choose “I have no conflicts”.')
    try { await cois.save({ id: `${email.toLowerCase()}-${year}`, email, name, year, none, parties: none ? [] : list, notes: notes.trim() || undefined, signedAt: new Date().toISOString() }); say(true, 'Signed. Thank you.') } catch (er) { say(false, (er as Error).message) }
  }
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-mute">Everyone who touches money signs once a year. If you are related to, or own part of, a business we might pay, list it. Any ledger entry to a listed name is then flagged for an independent approver.</p>
      {mine ? <p className="panel p-3 text-sm" role="status">You signed your {year} disclosure on {mine.signedAt.slice(0, 10)}.{mine.none ? ' No conflicts.' : ` Listed: ${mine.parties.join(', ')}.`} Disclosures cannot be edited. If something changes, tell the board.</p>
        : <form className="panel space-y-3 p-4" onSubmit={sign}>
          <h2 className="font-display text-lg font-semibold">{year} conflict-of-interest disclosure</h2>
          <fieldset className="space-y-1"><legend className="sr-only">Conflicts</legend>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="n" checked={none} onChange={() => setNone(true)} />I have no conflicts to disclose</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="n" checked={!none} onChange={() => setNone(false)} />I have a family, ownership or financial tie to a person or business</label></fieldset>
          {!none && <div><label className="label" htmlFor="cp">Names, separated by commas</label><input id="cp" className="input" value={parties} onChange={e => setParties(e.target.value)} /></div>}
          <div><label className="label" htmlFor="cn">Anything else (optional)</label><input id="cn" className="input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <button className="btn-primary">Sign disclosure</button></form>}
      <div className="panel overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Disclosures</caption>
        <thead><tr className="border-b border-line text-left text-mute"><th className="p-3">Person</th><th className="p-3">Year</th><th className="p-3">Disclosed ties</th></tr></thead>
        <tbody>{cois.items.sort((a, b) => b.year - a.year).map(c => <tr key={c.id} className="border-b border-line last:border-0"><td className="p-3">{c.name || c.email}</td><td className="p-3">{c.year}</td><td className="p-3">{c.none ? 'None' : c.parties.join(', ')}</td></tr>)}
          {!cois.items.length && <tr><td colSpan={3} className="p-6 text-center text-mute">No one has signed yet.</td></tr>}</tbody></table></div>
    </div>)
}
