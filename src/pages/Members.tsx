import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { edition } from '../lib/edition'
import { deleteHousehold } from '../lib/store'
import type { Household } from '../lib/types'

export default function Members({ households, refresh, canDelete, newReplies }: { households: Household[]; refresh: () => Promise<void>; canDelete: boolean; newReplies: number }) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all')
  const rows = useMemo(() => households.filter(h =>
    (status === 'all' || h.status === status) &&
    (`${h.headName} ${h.memberCode} ${h.city} ${h.email}`.toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => a.memberCode.localeCompare(b.memberCode)), [households, q, status])
  const mrr = households.filter(h => h.status === 'active').reduce((a, h) => a + edition.tiers[h.tier].monthly, 0)

  const [confirmId, setConfirmId] = useState<string | null>(null)
  async function remove(h: Household) { await deleteHousehold(h.id); setConfirmId(null); await refresh() }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Members</h1>
          <p className="text-mute">{households.length} households · ${mrr.toLocaleString()}/month in active dues</p>
        </div>
        <div className="flex gap-2">{newReplies > 0 && <Link to="/submissions" className="btn-ghost">{newReplies} new survey {newReplies === 1 ? 'reply' : 'replies'}</Link>}<Link to="/members/new" className="btn-primary">Add household</Link></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div><label className="label" htmlFor="q">Search</label><input id="q" className="input w-64" placeholder="Name, card number or city" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div><label className="label" htmlFor="st">Status</label>
          <select id="st" className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All</option><option value="active">Active</option><option value="pending">Pending</option><option value="lapsed">Lapsed</option>
          </select></div>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-field text-mute"><tr>
            <th className="p-3 font-medium">Household</th><th className="p-3 font-medium">Card</th><th className="p-3 font-medium">City</th>
            <th className="p-3 font-medium">Plan</th><th className="p-3 font-medium">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(h => (
              <tr key={h.id}>
                <td className="p-3 font-medium"><Link className="underline decoration-line underline-offset-2 hover:decoration-forest" to={`/members/${h.id}`}>{h.headName}</Link></td>
                <td className="p-3 font-mono text-xs">{h.memberCode}</td><td className="p-3">{h.city}</td>
                <td className="p-3 capitalize">{h.tier}</td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${h.status === 'active' ? 'bg-forest-100 text-forest' : h.status === 'pending' ? 'bg-sun-100 text-ink' : 'bg-field text-crane'}`}>{h.status}</span></td>
                <td className="whitespace-nowrap p-3 text-right">
                  <Link className="mr-3 text-forest underline" to={`/card/${h.id}`}>ID card</Link>
                  {!canDelete ? null : confirmId === h.id ? (<><button className="mr-2 font-semibold text-crane underline" onClick={() => void remove(h)}>Delete household and answers</button><button className="underline" onClick={() => setConfirmId(null)}>Keep</button></>)
                    : <button className="text-crane underline" onClick={() => setConfirmId(h.id)}>Delete</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-mute">No households match. Clear the search or add a household.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
