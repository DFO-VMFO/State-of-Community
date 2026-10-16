import { useState } from 'react'
import { useT } from '../../lib/i18n'
import { edition } from '../../lib/edition'
import { ownerOf, useMe } from '../../lib/me'
import { track } from '../../lib/telemetry'
import { pillars, seedServices, seedWaitlist, VOTES_PER_HOUSEHOLD } from '../../lib/catalog'
import { useCollection, useCounts } from '../../lib/collections'
import { Motif } from '../../components/Motif'
import type { Hue, Interest, Service, Suggestion, Waitlist } from '../../lib/types'
import type { PortalProps } from './shared'

const hues: Hue[] = ['forest', 'teal', 'plum', 'crane', 'sun']
const badge = { live: ['Open now', 'bg-forest text-white'], soon: ['Opening soon', 'bg-sun-100 text-sun-700'], interest: ['Up for a vote', 'bg-field text-mute'] } as const
const said: Record<Interest, string> = { essential: 'You said: essential', high: 'You said: high priority', medium: 'You said: somewhat useful', low: 'You said: low priority', none: '' }
const toolFor: Record<string, 'toolkit'> = { remit: 'toolkit', immigration: 'toolkit', vault: 'toolkit', credit: 'toolkit' }

export default function Services({ h, go }: PortalProps) {
  const svc = useCollection<Service>('services', seedServices, true); const wl = useCollection<Waitlist>('waitlist', seedWaitlist); const sg = useCollection<Suggestion>('suggestions', () => [])
  const counts = useCounts('waitlist', 'serviceId', seedWaitlist, wl.items.length)
  const [pillar, setPillar] = useState('All'); const [open, setOpen] = useState<string | null>(null); const [idea, setIdea] = useState(''); const [msg, setMsg] = useState('')
  const me = useMe(); const { t } = useT()
  const mine = new Set(wl.items.filter(w => w.householdId === h.id && ownerOf(w) === me.personId).map(w => w.serviceId))
  const left = VOTES_PER_HOUSEHOLD - [...mine].filter(id => svc.items.find(s => s.id === id && s.status !== 'live')).length
  const list = svc.items.filter(s => pillar === 'All' || s.pillar === pillar)
  const order = { live: 0, soon: 1, interest: 2 }
  const top = svc.items.filter(s => s.status !== 'live' && (counts[s.id] ?? 0) >= edition.kMin).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)).slice(0, 5)
  const toggle = async (s: Service) => {
    const id = `${s.id}:${me.personId}`
    if (mine.has(s.id)) { await wl.remove(wl.items.find(w => w.serviceId === s.id && w.householdId === h.id && ownerOf(w) === me.personId)?.id ?? id); setMsg('Vote removed. You can use it on another service.') }
    else if (left <= 0) setMsg(`You have used all ${VOTES_PER_HOUSEHOLD} votes. Remove one to vote for something else.`)
    else { await wl.save({ id, serviceId: s.id, householdId: h.id, personId: me.personId, at: new Date().toISOString().slice(0, 10) }); track({ householdId: h.id, personId: me.personId, type: 'vote', screen: 'services', ref: s.id }); setMsg(`Vote added. ${left - 1} left.`) }
  }
  async function suggest(e: React.FormEvent) {
    e.preventDefault(); if (!idea.trim()) return
    await sg.save({ id: crypto.randomUUID(), householdId: h.id, text: idea.trim(), at: new Date().toISOString().slice(0, 10), status: 'new' }); setIdea(''); setMsg('Thank you. The team reads every suggestion.')
  }
  const live = svc.items.filter(s => s.status === 'live').length

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">{t('Services and benefits')}</h1>
        <p className="text-mute">{live} are open now. For the rest, you decide what we build first: you have {VOTES_PER_HOUSEHOLD} votes to spend.</p></div>
      <div className="panel flex flex-wrap items-center gap-3 p-3" aria-label="Your votes">
        <span className="font-display font-semibold">Your votes</span>
        <span className="flex gap-1" aria-label={`${left} of ${VOTES_PER_HOUSEHOLD} left`}>{Array.from({ length: VOTES_PER_HOUSEHOLD }, (_, i) => <span key={i} className={`h-4 w-4 rounded-full ${i < left ? 'bg-sun' : 'bg-line'}`} />)}</span>
        <span className="text-sm text-mute">{left} left</span>
      </div>
      {top.length > 0 && <div className="panel p-3 text-sm"><b>Most wanted right now:</b> {top.map((s, i) => `${i + 1}. ${s.name}`).join('  ·  ')}</div>}
      {msg && <p role="status" className="rounded-md bg-forest-100 p-2 text-sm font-medium">{msg}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by area">
        {['All', ...pillars].map(p => <button key={p} aria-pressed={pillar === p} onClick={() => setPillar(p)} className={`rounded-full border px-3 py-1 text-sm font-medium ${pillar === p ? 'border-forest bg-forest text-white' : 'border-line bg-white'}`}>{p}</button>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...list].sort((a, b) => order[a.status] - order[b.status]).map(s => {
          const n = counts[s.id] ?? 0; const b = badge[s.status]; const pr = h.priorities[s.id]; const on = mine.has(s.id)
          return (
            <article key={s.id} className="panel flex flex-col overflow-hidden">
              <div className="relative h-20"><Motif n={s.motif} hue={hues[s.motif % hues.length]} className="absolute inset-0" />
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-bold ${b[1]}`}>{b[0]}{s.status === 'soon' && s.opens ? ` · ${s.opens}` : ''}</span></div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-mute">{s.pillar}</p>
                <h2 className="font-display text-lg font-semibold leading-snug">{s.name}</h2>
                <p className="text-sm text-mute">{open === s.id ? s.blurb : s.blurb.slice(0, 90) + (s.blurb.length > 90 ? '…' : '')}{s.blurb.length > 90 && <button className="ml-1 underline" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? 'less' : 'more'}</button>}</p>
                {pr && pr !== 'none' && s.surveyed && <p className="text-xs font-medium text-forest">{said[pr]}</p>}
                {s.status !== 'live' && n >= edition.kMin && <p className="text-xs text-mute">{n} households voted for this</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {s.status === 'live'
                    ? s.id === 'card' ? <button className="btn-primary" onClick={() => go('account')}>Show my card</button>
                      : s.id === 'clubs' ? <button className="btn-primary" onClick={() => go('clubs')}>Browse clubs</button>
                      : toolFor[s.id] ? <button className="btn-primary" onClick={() => go('toolkit', { cat: s.id })}>Open tool</button>
                      : <button className="btn-primary" onClick={() => go('account', { cat: s.ticketCategory })}>Ask for help</button>
                    : <button aria-pressed={on} disabled={!on && left <= 0} className={on ? 'btn-ghost border-forest text-forest' : 'btn-primary disabled:opacity-50'} onClick={() => void toggle(s)}>{on ? '✓ Voted. Tap to undo' : 'Use a vote'}</button>}
                  {s.status !== 'live' && s.ticketCategory && <button className="btn-ghost" onClick={() => go('account', { cat: s.ticketCategory })}>I need this now</button>}
                </div>
              </div>
            </article>)
        })}
      </div>
      <form onSubmit={suggest} className="panel flex flex-wrap items-end gap-3 p-4" aria-label="Suggest a service">
        <div className="min-w-0 flex-1"><label className="label" htmlFor="idea">Not on the list? Suggest a service</label><input id="idea" className="input" placeholder="What would help your family most?" value={idea} onChange={e => setIdea(e.target.value)} /></div>
        <button className="btn-primary">Send idea</button>
      </form>
    </div>
  )
}
