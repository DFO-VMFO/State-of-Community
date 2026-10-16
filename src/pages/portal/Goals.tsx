import { useState } from 'react'
import { goalTemplates } from '../../lib/catalog'
import { useCollection } from '../../lib/collections'
import { seedGoals } from '../../lib/catalog'
import { Ring } from '../../components/Motif'
import type { Goal, GoalKind } from '../../lib/types'
import { fmtGoal, goalPct, longDate, money, type PortalProps } from './shared'

export function useGoals(householdId: string) {
  const c = useCollection<Goal>('goals', seedGoals)
  return { ...c, mine: c.items.filter(g => g.householdId === householdId) }
}

function Spark({ g }: { g: Goal }) {
  const pts = [{ value: g.start }, ...g.updates.map(u => ({ value: u.value }))]
  const lo = Math.min(...pts.map(p => p.value)), hi = Math.max(...pts.map(p => p.value)), span = hi - lo || 1
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, pts.length - 1)) * 120} ${28 - ((p.value - lo) / span) * 24}`).join(' ')
  return <svg width="120" height="32" aria-hidden><path d={d} fill="none" stroke="#0F3D3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export default function Goals({ h }: PortalProps) {
  const { mine, save, remove } = useGoals(h.id)
  const [adding, setAdding] = useState(false); const [kind, setKind] = useState<GoalKind>('savings')
  const [title, setTitle] = useState(''); const [start, setStart] = useState(''); const [target, setTarget] = useState(''); const [due, setDue] = useState('')
  const [edit, setEdit] = useState<string | null>(null); const [val, setVal] = useState(''); const [note, setNote] = useState(''); const [del, setDel] = useState<string | null>(null); const [msg, setMsg] = useState('')
  const tpl = goalTemplates[kind]

  async function create(e: React.FormEvent) {
    e.preventDefault(); const s = Number(start || 0), t = kind === 'debt' ? 0 : Number(target)
    if (kind !== 'debt' && !(t > s)) return setMsg('Your target must be higher than where you are starting.')
    if (kind === 'debt' && !(s > 0)) return setMsg('Enter what you owe today.')
    await save({ id: crypto.randomUUID(), householdId: h.id, kind, title: title.trim() || tpl.title, unit: tpl.unit, label: tpl.label, start: s, target: t, current: s, due: due || undefined, createdAt: new Date().toISOString(), updates: [] })
    setAdding(false); setTitle(''); setStart(''); setTarget(''); setDue(''); setMsg('Goal added. Update it whenever you make progress.')
  }
  async function update(g: Goal) {
    const v = Number(val); if (Number.isNaN(v) || val === '') return
    const before = goalPct(g); const next = { ...g, current: v, updates: [...g.updates, { at: new Date().toISOString(), value: v, note: note.trim() || undefined }] }
    await save(next); setEdit(null); setVal(''); setNote('')
    const after = goalPct(next); setMsg(after >= 1 ? 'Goal reached. Congratulations!' : Math.floor(after * 4) > Math.floor(before * 4) ? `Milestone: you passed ${Math.floor(after * 4) * 25}%.` : 'Progress saved.')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold">Your goals</h1><p className="text-mute">Pick a target, update it as you go, and celebrate each quarter of the way. Your goals stay private to you and the operations lead.</p></div>
        <button className="btn-primary" onClick={() => setAdding(a => !a)} aria-expanded={adding}>{adding ? 'Close' : 'New goal'}</button>
      </div>
      {msg && <p role="status" className="rounded-md bg-forest-100 p-2 text-sm font-medium">{msg}</p>}
      {adding && (
        <form onSubmit={create} className="panel space-y-3 p-4" aria-label="New goal">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Goal type">
            {(Object.keys(goalTemplates) as GoalKind[]).map(k => (
              <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${kind === k ? 'border-forest bg-forest text-white' : 'border-line bg-white'}`}>{k === 'networth' ? 'Net worth' : k === 'home' ? 'Home' : k[0].toUpperCase() + k.slice(1)}</button>))}
          </div>
          <p className="text-sm text-mute">{tpl.hint}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-4"><label className="label" htmlFor="gt">Name your goal</label><input id="gt" className="input" placeholder={tpl.title} value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><label className="label" htmlFor="gs">{kind === 'debt' ? 'I owe today' : 'Starting point'} {tpl.unit === 'usd' ? '($)' : ''}</label><input id="gs" className="input" type="number" min="0" value={start} onChange={e => setStart(e.target.value)} /></div>
            {kind !== 'debt' && <div><label className="label" htmlFor="gg">Target {tpl.unit === 'usd' ? '($)' : '(steps)'}</label><input id="gg" className="input" type="number" min="1" required value={target} onChange={e => setTarget(e.target.value)} /></div>}
            <div><label className="label" htmlFor="gd">Target date (optional)</label><input id="gd" className="input" type="date" value={due} onChange={e => setDue(e.target.value)} /></div>
          </div>
          <button className="btn-primary">Add goal</button>
        </form>)}
      <div className="grid gap-4 md:grid-cols-2">
        {mine.map(g => { const p = goalPct(g); const done = p >= 1; return (
          <section key={g.id} className="panel p-4" aria-label={g.title}>
            <div className="flex items-center gap-4">
              <Ring pct={p} size={84} />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold leading-tight">{g.title}</h2>
                <p className="text-sm text-mute">{g.kind === 'debt' ? `${fmtGoal(g, g.current)} left of ${fmtGoal(g, g.start)}` : `${fmtGoal(g, g.current)} of ${fmtGoal(g, g.target)}`}</p>
                {g.due && <p className="text-xs text-mute">Target date {longDate(g.due)}</p>}
                <div className="mt-1 flex items-center gap-1" aria-label="Milestones">
                  {[0.25, 0.5, 0.75, 1].map(m => <span key={m} className={`h-2 w-8 rounded-full ${p >= m ? 'bg-sun' : 'bg-line'}`} />)}
                  {done && <span className="ml-1 text-xs font-bold text-sun-700">Reached!</span>}
                </div>
              </div>
              <Spark g={g} />
            </div>
            {edit === g.id ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div><label className="label" htmlFor={`v${g.id}`}>{g.kind === 'debt' ? 'I owe now' : 'Where I am now'}</label><input id={`v${g.id}`} className="input w-32" type="number" value={val} onChange={e => setVal(e.target.value)} autoFocus /></div>
                <div className="min-w-0 flex-1"><label className="label" htmlFor={`n${g.id}`}>Note (optional)</label><input id={`n${g.id}`} className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
                <button className="btn-primary" onClick={() => void update(g)}>Save</button><button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              </div>) : (
              <div className="mt-3 flex gap-2">
                <button className="btn-ghost" onClick={() => { setEdit(g.id); setVal(String(g.current)) }}>Update progress</button>
                {del === g.id ? <><button className="btn-ghost text-crane" onClick={() => void remove(g.id)}>Yes, delete</button><button className="btn-ghost" onClick={() => setDel(null)}>Keep</button></>
                  : <button className="btn-ghost" onClick={() => setDel(g.id)}>Delete</button>}
              </div>)}
            {g.updates.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-mute">History ({g.updates.length})</summary>
              <ul className="mt-1 space-y-0.5 text-mute">{[...g.updates].reverse().slice(0, 6).map((u, i) => <li key={i}>{new Date(u.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {g.unit === 'usd' ? money(u.value) : u.value}{u.note ? ` · ${u.note}` : ''}</li>)}</ul></details>}
          </section>) })}
        {!mine.length && !adding && <div className="panel col-span-full p-8 text-center"><p className="font-display text-xl font-semibold">No goals yet</p><p className="mt-1 text-mute">Start with an emergency fund or your net worth. Small, specific goals work best.</p><button className="btn-primary mt-3" onClick={() => setAdding(true)}>Set my first goal</button></div>}
      </div>
    </div>
  )
}
