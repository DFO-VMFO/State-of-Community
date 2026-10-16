import { useState } from 'react'
import { Link } from 'react-router-dom'
import { edition } from '../lib/edition'
import { useCollection } from '../lib/collections'
import { seedSubmissions } from '../lib/seed'
import { saveHousehold } from '../lib/store'
import type { Household, Submission, Tier } from '../lib/types'

export default function Submissions({ households, refresh }: { households: Household[]; refresh: () => Promise<void> }) {
  const { items, save } = useCollection<Submission>('submissions', seedSubmissions)
  const [show, setShow] = useState<'new' | 'done'>('new'); const [msg, setMsg] = useState('')
  const rows = items.filter(s => (show === 'new') === (s.status === 'new')).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const dup = (s: Submission) => s.answers.email && households.some(h => h.email.toLowerCase() === s.answers.email.toLowerCase())
  const link = `${location.origin}${location.pathname}#/survey`

  async function approve(s: Submission) {
    const next = Math.max(0, ...households.map(h => Number(h.memberCode.split('-').pop()) || 0)) + 1
    const code = `${edition.codePrefix}-${String(next).padStart(4, '0')}`
    const tier: Tier = s.answers.wtpMonthly >= 30 ? 'premium' : s.answers.wtpMonthly >= 15 ? 'standard' : 'basic'
    await saveHousehold({ ...s.answers, id: crypto.randomUUID(), memberCode: code, status: 'active', tier, joinedAt: new Date().toISOString().slice(0, 10) })
    await save({ ...s, status: 'approved', memberCode: code }); await refresh()
    setMsg(`${s.answers.headName} is now member ${code} on the ${edition.tiers[tier].label} plan.`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold">Survey replies</h1>
          <p className="max-w-2xl text-mute">People who filled in the public survey. Review each reply, then approve to create the member or reject to discard it.</p></div>
        <Link className="btn-ghost" to="/survey" target="_blank">Open the survey</Link>
      </div>
      <p className="rounded-md bg-forest-100 p-2 text-sm">Share this link with members: <span className="select-all font-mono text-xs">{link}</span></p>
      <div className="flex gap-2" role="group" aria-label="Filter">
        <button className={show === 'new' ? 'btn bg-sun text-ink' : 'btn-ghost'} aria-pressed={show === 'new'} onClick={() => setShow('new')}>To review ({items.filter(s => s.status === 'new').length})</button>
        <button className={show === 'done' ? 'btn bg-sun text-ink' : 'btn-ghost'} aria-pressed={show === 'done'} onClick={() => setShow('done')}>Reviewed ({items.filter(s => s.status !== 'new').length})</button>
      </div>
      {msg && <p role="status" className="text-sm font-medium text-forest">{msg}</p>}
      <ul className="space-y-3">
        {rows.map(s => (
          <li key={s.id} className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-display text-lg font-semibold">{s.answers.headName}</p>
                <p className="text-sm text-mute">{s.answers.email || s.answers.phone} · {s.answers.city || 'No city'} · {new Date(s.submittedAt).toLocaleDateString()}</p></div>
              {s.status === 'new' ? <div className="flex gap-2"><button className="btn-primary" onClick={() => void approve(s)}>Approve as member</button><button className="btn-ghost" onClick={() => void save({ ...s, status: 'rejected' })}>Reject</button></div>
                : <span className={`rounded px-2 py-0.5 text-xs font-semibold ${s.status === 'approved' ? 'bg-forest-100 text-forest' : 'bg-field text-crane'}`}>{s.status === 'approved' ? `Approved ${s.memberCode ?? ''}` : 'Rejected'}</span>}
            </div>
            {dup(s) && <p className="mt-2 rounded bg-sun-100 p-2 text-sm">A member with this email already exists. Check before approving to avoid a duplicate.</p>}
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {([['Household', `${s.answers.adults} adults, ${s.answers.children} children, ${s.answers.seniors} seniors`], ['Work', s.answers.sector], ['Income', s.answers.incomeBand], ['Health cover', s.answers.insurance], ['Biggest need', s.answers.unmetNeed], ['Would pay', `$${s.answers.wtpMonthly}/month`], ['Counted in statistics', s.answers.consentData ? 'Yes' : 'No'], ['OK to message', s.answers.whatsappOptIn ? 'Yes' : 'No']] as const).map(([k, v]) => (
                <div key={k}><dt className="inline text-mute">{k}: </dt><dd className="inline">{v}</dd></div>))}
            </dl>
          </li>))}
        {!rows.length && <li className="panel p-6 text-center text-mute">{show === 'new' ? 'No replies waiting. Share the survey link to collect more.' : 'Nothing reviewed yet.'}</li>}
      </ul>
    </div>
  )
}
