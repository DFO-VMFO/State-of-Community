import type { Slice } from '../lib/stats'

// Accessible horizontal bars (plain HTML, no chart library needed).
export default function BarList({ title, data, note }: { title: string; data: Slice[]; note?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <section className="panel p-4" aria-label={title}>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {note && <p className="text-xs text-mute">{note}</p>}
      <ul className="mt-3 space-y-2">
        {data.map(d => (
          <li key={d.name}>
            <div className="flex justify-between text-sm"><span className={d.hidden ? 'text-mute' : ''}>{d.name}</span><span className="tabular-nums text-mute">{Math.round((d.value / total) * 100)}%</span></div>
            <div className="mt-1 h-2.5 rounded-full bg-field"><div className={`h-full rounded-full ${d.hidden ? 'bg-line' : 'bg-forest'}`} style={{ width: `${(d.value / max) * 100}%` }} /></div>
          </li>
        ))}
        {!data.length && <li className="text-sm text-mute">Not enough responses yet to show this safely.</li>}
      </ul>
    </section>
  )
}
