import { edition } from '../lib/edition'

// Pilot progress: the three thresholds from the launch plan.
export default function Ladder({ n }: { n: number }) {
  const top = edition.milestones[edition.milestones.length - 1].n
  const next = edition.milestones.find(m => n < m.n)
  return (
    <section className="panel overflow-hidden" aria-label="Enrollment progress">
      <div className="bg-forest px-5 py-4 text-white">
        <p className="font-display text-5xl font-extrabold leading-none tabular-nums">{n}<span className="ml-2 text-lg font-medium text-white/70">households in the snapshot</span></p>
        <p className="mt-2 text-sm text-white/80">{next ? `${next.n - n} more to reach “${next.label}”: ${next.note.toLowerCase()}.` : 'Every milestone reached.'}</p>
      </div>
      <div className="relative px-5 pb-5 pt-9">
        <div className="h-3 rounded-full bg-field">
          <div className="h-full rounded-full bg-sun" style={{ width: `${Math.min(100, (n / top) * 100)}%` }} role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={top} aria-label="Households enrolled" />
        </div>
        {edition.milestones.map(m => (
          <div key={m.n} className="absolute top-3" style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${m.n / top})`, transform: 'translateX(-100%)' }}>
            <p className={`pr-1 text-right text-xs font-semibold ${n >= m.n ? 'text-forest' : 'text-mute'}`}>{m.n}</p>
          </div>
        ))}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {edition.milestones.map(m => (
            <p key={m.n} className={`text-sm ${n >= m.n ? 'text-ink' : 'text-mute'}`}><span className="font-semibold">{m.label}.</span> {m.note}.</p>
          ))}
        </div>
      </div>
    </section>
  )
}
