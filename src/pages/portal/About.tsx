import { edition } from '../../lib/edition'
import { pillars } from '../../lib/catalog'
import { Motif } from '../../components/Motif'
import { useCollection } from '../../lib/collections'
import type { Onboarding } from '../../lib/types'
import { useContent } from '../../lib/content'
import Markdown from '../../components/Markdown'
import { useMe } from '../../lib/me'
import type { PortalProps } from './shared'

const pillarText: Record<string, string> = {
  'Cross-border': 'Sending money home, immigration dates, repatriation and estates that span two countries.',
  Careers: 'Getting credentials recognized, finding jobs and mentors who have been through the same boards.',
  Wealth: 'Credit, savings circles, a first home and small-business capital.',
  Family: 'Papers in order, care for elders, scholarships and keeping our children connected to home.',
  'Safety net': 'Help that arrives fast when a crisis hits a member household.',
  Community: 'Clubs, events and each other.',
}

export default function About({ h, go }: PortalProps) {
  const ob = useCollection<Onboarding>('onboarding', () => [])
  const me = useMe(); const doc = useContent().byId('about'); const vars = useContent().vars
  const redo = () => void ob.save({ id: `ob:${me.personId}`, householdId: h.id, personId: me.personId, done: {}, dismissed: false }).then(() => go('home'))
  return (
    <div className="space-y-6">
      <section className="weave relative overflow-hidden rounded-2xl bg-forest p-6 text-white sm:p-8">
        <div className="absolute inset-y-0 left-0 w-2 bg-sun" aria-hidden />
        <p className="text-sm text-white/70">About us</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{doc?.title ?? `Why the ${edition.name} exists`}</h1>
        <p className="mt-2 max-w-2xl text-lg text-white/90">{doc?.intro ?? ''}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Our purpose">
        {[['See ourselves', 'The State of Community report counts who we are and what we need, anonymously, so the services we build match real needs.'],
          ['Pool our strength', 'Group rates, vetted professionals and shared funds that a single household could not get.'],
          ['Build lasting security', 'Over time, a community fund whose returns help pay for our services, so the work outlasts any one person.']].map(([t, d]) => (
          <div key={t} className="panel p-4"><h2 className="font-display text-lg font-semibold">{t}</h2><p className="mt-1 text-sm text-mute">{d}</p></div>))}
      </section>

      <section aria-label="What we work on"><h2 className="mb-2 font-display text-xl font-semibold">What we work on</h2>
        <ul className="grid gap-3 sm:grid-cols-2">{pillars.map((p, i) => <li key={p} className="panel relative overflow-hidden p-3 pl-5"><Motif n={i} hue="forest" className="absolute inset-y-0 left-0 w-2" /><p className="font-medium">{p}</p><p className="text-sm text-mute">{pillarText[p]}</p></li>)}</ul></section>

      <section className="panel p-4" aria-label="Our promises">{doc && <Markdown text={doc.body} vars={vars} />}</section>

      <section className="panel space-y-2 p-4" aria-label="How to take part"><h2 className="font-display text-xl font-semibold">How to take part</h2>
        <div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => go('services')}>Vote on services</button><button className="btn-ghost" onClick={() => go('events')}>See events</button><button className="btn-ghost" onClick={() => go('clubs')}>Join a club</button><button className="btn-ghost" onClick={() => go('account')}>Ask us anything</button></div></section>

      <p className="text-sm text-mute">Want a refresher on getting set up? <button className="underline" onClick={redo}>Replay the welcome checklist</button></p>
    </div>
  )
}
