import { useMemo, useState } from 'react'
import { edition } from '../lib/edition'
import { snapshot } from '../lib/stats'
import { buildReport } from '../lib/report'
import type { Household, PoolEntry } from '../lib/types'

export default function Report({ households, pool }: { households: Household[]; pool: PoolEntry[] }) {
  const s = useMemo(() => snapshot(households), [households]); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  const sample = households.some(h => h.id.startsWith('seed-'))
  const embedded = window.self !== window.top
  const received = pool.filter(e => e.kind === 'contribution').reduce((a, e) => a + e.amount, 0); const paidOut = pool.filter(e => e.kind === 'claim').reduce((a, e) => a + e.amount, 0)

  async function download() {
    setBusy(true); setMsg('')
    try { const doc = await buildReport({ edition, snap: s, pool: { received, paidOut }, sample, date: new Date() }); doc.save(`state-of-community-${new Date().toISOString().slice(0, 7)}.pdf`); setMsg('Report downloaded.') }
    catch { setMsg('Could not build the report. Reload the page and try again.') }
    setBusy(false)
  }
  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">PDF report</h1>
        <p className="max-w-2xl text-mute">A three-page report for town halls, vendors and grant applications. It uses the same anonymous totals as the dashboard.</p></div>
      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">What is inside</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm"><li>Page 1: key numbers, and what members want against what exists</li><li>Page 2: work, income, housing, insurance, generation and biggest missing service</li><li>Page 3: the community fund, what to build first, and how to read the numbers</li></ul>
        <p className="text-sm text-mute">Built from {s.n} consenting households. {s.kReady ? '' : `Needs at least ${edition.kMin * 2} to show statistics.`}{sample ? ' The report will be marked SAMPLE DATA because these households are demo records.' : ''}</p>
        <div className="flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={busy || !s.kReady || embedded} onClick={() => void download()}>{busy ? 'Building…' : 'Download PDF'}</button>
          {embedded && <span className="text-sm text-mute">Downloads are blocked inside this preview. Open the app on its own page to download.</span>}{msg && <span role="status" className="text-sm font-medium text-forest">{msg}</span>}</div>
      </section>
    </div>
  )
}
