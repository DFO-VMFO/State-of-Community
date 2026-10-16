import { seedClubs, seedMemberships, seedWaitlist } from '../../lib/catalog'
import { useCollection } from '../../lib/collections'
import { ownerOf, useMe } from '../../lib/me'
import { Ring } from '../../components/Motif'
import type { Club, Membership, Onboarding as Ob, Reminder, VaultItem, Waitlist } from '../../lib/types'
import { useGoals } from './Goals'
import type { PortalProps } from './shared'

interface Step { id: string; title: string; why: string; cta: string; go: () => void; auto?: boolean; optional?: boolean }

export default function OnboardingCard({ h, go }: PortalProps) {
  const ob = useCollection<Ob>('onboarding', () => []); const { mine: goals } = useGoals(h.id)
  const ms = useCollection<Membership>('memberships', seedMemberships); const wl = useCollection<Waitlist>('waitlist', seedWaitlist)
  const rem = useCollection<Reminder>('reminders', () => []); const vault = useCollection<VaultItem>('vault', () => []); const clubs = useCollection<Club>('clubs', seedClubs)
  const me = useMe(); const cur = ob.items.find(o => o.householdId === h.id && ownerOf(o) === me.personId) ?? { id: `ob:${me.personId}`, householdId: h.id, personId: me.personId, done: {} as Record<string, boolean> }
  if (cur.dismissed || cur.finishedAt) return null
  const mark = (k: string, v = true) => ob.save({ ...cur, done: { ...cur.done, [k]: v } })
  const steps: Step[] = [
    { id: 'welcome', title: 'Why we are here', why: 'One minute on what this community is for and what we promise you.', cta: 'Read about us', go: () => { void mark('welcome'); go('about') } },
    { id: 'contact', title: 'Check your contact details', why: 'So you get event reminders and invoices the way you prefer.', cta: 'Open my account', go: () => { void mark('contact'); go('account') } },
    { id: 'goal', title: 'Pick your first goal', why: 'An emergency fund, a home, a credential. We cheer every milestone.', cta: 'Choose a goal', go: () => go('goals'), auto: goals.length > 0 },
    { id: 'club', title: 'Join a club', why: 'The easiest way to meet people with shared interests.', cta: 'Browse clubs', go: () => go('clubs'), auto: clubs.items.some(c => ms.items.some(m => m.clubId === c.id && m.householdId === h.id)) },
    { id: 'vote', title: 'Vote on what we build next', why: 'You have a few votes. Use them on the services you want most.', cta: 'Vote on services', go: () => go('services'), auto: wl.items.some(w => w.householdId === h.id && ownerOf(w) === me.personId) },
    { id: 'safety', title: 'Set up your safety net', why: 'Add an immigration date or list where your important papers are kept. Private to you.', cta: 'Open the toolkit', go: () => go('toolkit'), auto: rem.items.some(r => r.householdId === h.id && ownerOf(r) === me.personId) || vault.items.some(v => v.householdId === h.id && ownerOf(v) === me.personId), optional: true },
  ]
  const isDone = (s: Step) => !!s.auto || !!cur.done[s.id]
  const n = steps.filter(isDone).length; const next = steps.find(s => !isDone(s))
  if (!next) return (
    <section aria-label="Setup complete" className="panel flex flex-wrap items-center justify-between gap-3 border-sun bg-sun-100 p-4"><p className="font-medium">You are all set. Welcome to the community!</p><button className="btn-primary" onClick={() => void ob.save({ ...cur, finishedAt: new Date().toISOString() })}>Done</button></section>)
  return (
    <section aria-label="Getting started" className="panel space-y-3 p-4">
      <div className="flex items-center gap-4"><Ring pct={n / steps.length} size={64} label={`${n} of ${steps.length}`} />
        <div className="min-w-0 flex-1"><h2 className="font-display text-xl font-semibold">Getting started</h2><p className="text-sm text-mute">A few minutes to make this yours. Next: <b>{next.title}</b>.</p></div>
        <button className="btn-ghost shrink-0 text-sm" onClick={() => void ob.save({ ...cur, dismissed: true })}>Skip for now</button></div>
      <ol className="space-y-2">{steps.map(s => { const d = isDone(s); const isNext = s === next; return (
        <li key={s.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 ${isNext ? 'bg-forest-100' : ''}`}>
          <div className="min-w-0"><p className="font-medium"><span aria-hidden>{d ? '✓ ' : '○ '}</span><span className={d ? 'text-mute line-through' : ''}>{s.title}</span>{s.optional && <span className="ml-1 text-xs text-mute">(optional)</span>}</p>{isNext && <p className="text-sm text-mute">{s.why}</p>}</div>
          {!d && <span className="flex gap-2">{isNext && <button className="btn-primary px-3 py-1" onClick={s.go}>{s.cta}</button>}<button className="btn-ghost px-3 py-1 text-sm" onClick={() => void mark(s.id)}>{isNext ? 'Mark done' : 'Done'}</button></span>}
        </li>) })}</ol>
    </section>)
}
