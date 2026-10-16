import { edition } from '../../lib/edition'
import { useT } from '../../lib/i18n'
import { seedClubs, seedEvents, seedMemberships, seedServices, seedWaitlist } from '../../lib/catalog'
import { useCollection } from '../../lib/collections'
import { seedPayments } from '../../lib/seed'
import { Motif, Ring } from '../../components/Motif'
import type { Club, EventItem, FundReport, Membership, Payment, Reminder, Rsvp, Service, Transparency, Waitlist } from '../../lib/types'
import { MemberCard } from '../Card'
import { useGoals } from './Goals'
import OnboardingCard from './Onboarding'
import { ownerOf, useMe } from '../../lib/me'
import { clock, daysUntil, goalPct, longDate, type PortalProps } from './shared'

export default function Home({ h, go }: PortalProps) {
  const ev = useCollection<EventItem>('events', seedEvents); const rs = useCollection<Rsvp>('rsvps', () => []); const ms = useCollection<Membership>('memberships', seedMemberships)
  const clubs = useCollection<Club>('clubs', seedClubs); const svc = useCollection<Service>('services', seedServices, true); const wl = useCollection<Waitlist>('waitlist', seedWaitlist)
  const tr = useCollection<Transparency>('transparency', () => []); const rem = useCollection<Reminder>('reminders', () => []); const fr = useCollection<FundReport>('fund_reports', () => []); const pays = useCollection<Payment>('payments', seedPayments); const { mine: goals } = useGoals(h.id)
  const me = useMe(); const { t } = useT()
  const today = new Date().toISOString().slice(0, 10)
  const next = ev.items.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const myClubs = clubs.items.filter(c => ms.items.some(m => m.clubId === c.id && m.householdId === h.id))
  const going = new Set(rs.items.filter(r => r.householdId === h.id && r.status === 'going').map(r => r.eventId))
  const onList = svc.items.filter(s => wl.items.some(w => w.serviceId === s.id && w.householdId === h.id && ownerOf(w) === me.personId))
  const due = pays.items.filter(p => p.householdId === h.id && p.status !== 'paid')
  const latest = [...tr.items].sort((a, b) => b.id.localeCompare(a.id))[0]
  const fund = [...fr.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]
  const dueSoon = rem.items.filter(r => r.householdId === h.id && (ownerOf(r) === me.personId || r.shared) && daysUntil(r.date) <= 180).sort((a, b) => a.date.localeCompare(b.date))[0]
  const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const live = svc.items.filter(s => s.status === 'live')
  const soon = svc.items.filter(s => s.status === 'soon').sort((a, b) => (a.opens ?? '').localeCompare(b.opens ?? ''))[0]

  return (
    <div className="min-w-0 space-y-6">
      <section className="weave relative overflow-hidden rounded-2xl bg-forest p-6 text-white sm:p-8">
        <div className="absolute inset-y-0 left-0 w-2 bg-sun" aria-hidden />
        <p className="text-sm text-white/70">{edition.name}</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t(greet)}, {me.name.split(' ')[0]}</h1>
        <p className="mt-1 max-w-xl text-white/80">{edition.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-1">{edition.tiers[h.tier].label} household</span>
          <span className="rounded-full bg-white/15 px-3 py-1">Member since {h.joinedAt.slice(0, 4)}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{myClubs.length} club{myClubs.length === 1 ? '' : 's'}</span>
          <button onClick={() => go('about')} className="rounded-full bg-sun px-3 py-1 font-semibold text-ink">About us</button>
        </div>
      </section>

      <OnboardingCard h={h} go={go} />

      {due.length > 0 && <button onClick={() => go('account')} className="flex w-full items-center justify-between rounded-xl border border-sun bg-sun-100 p-3 text-left text-sm font-medium"><span>You have {due.length} invoice{due.length > 1 ? 's' : ''} waiting.</span><span className="underline">Pay now</span></button>}

      {dueSoon && <button onClick={() => go('toolkit', { cat: 'immigration' })} className="flex w-full items-center justify-between rounded-xl border border-crane bg-white p-3 text-left text-sm font-medium"><span>Reminder: {dueSoon.kind} for {dueSoon.person} {daysUntil(dueSoon.date) < 0 ? 'is past due' : `is due in ${daysUntil(dueSoon.date)} days`}.</span><span className="underline">Open</span></button>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section aria-label="Coming up"><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">{t('Coming up')}</h2><button className="text-sm underline" onClick={() => go('events')}>Full calendar</button></div>
            <ul className="space-y-2">{next.map(e => (
              <li key={e.id} className="panel flex items-center gap-3 p-3"><div className="w-12 shrink-0 rounded-lg bg-field text-center"><p className="text-[10px] font-semibold uppercase text-mute">{new Date(e.date + 'T12:00').toLocaleDateString('en-US', { month: 'short' })}</p><p className="font-display text-xl font-bold leading-none">{e.date.slice(8)}</p></div>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{e.title}</p><p className="truncate text-sm text-mute">{longDate(e.date)}, {clock(e.start)} · {e.place}</p></div>
                {going.has(e.id) && <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold">Going</span>}</li>))}
              {!next.length && <li className="panel p-4 text-mute">Nothing scheduled yet.</li>}</ul></section>

          <section aria-label="Your goals"><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">{t('Your goals')}</h2><button className="text-sm underline" onClick={() => go('goals')}>{goals.length ? 'Update' : 'Set a goal'}</button></div>
            {goals.length ? <div className="grid gap-3 sm:grid-cols-2">{goals.slice(0, 4).map(g => <button key={g.id} onClick={() => go('goals')} className="panel flex items-center gap-3 p-3 text-left"><Ring pct={goalPct(g)} size={56} /><span className="font-medium leading-tight">{g.title}</span></button>)}</div>
              : <button onClick={() => go('goals')} className="panel w-full p-5 text-left"><p className="font-display font-semibold">Pick a goal: emergency fund, home, credential, business</p><p className="text-sm text-mute">Takes a minute. We cheer every milestone.</p></button>}</section>

          {latest && <section aria-label="Where our money went"><h2 className="mb-2 font-display text-xl font-semibold">Where our money went · {latest.label}</h2>
            <div className="panel space-y-3 p-4"><div className="flex flex-wrap gap-6 text-sm"><span>Income <b className="font-display text-lg">${Math.round(latest.income).toLocaleString('en-US')}</b></span><span>Spending <b className="font-display text-lg">${Math.round(latest.expenses).toLocaleString('en-US')}</b></span><span>Bereavement pool <b className="font-display text-lg">${Math.round(latest.poolBalance).toLocaleString('en-US')}</b></span></div>
              <ul className="space-y-1.5">{latest.byCategory.map(c => <li key={c.category}><div className="flex justify-between text-sm"><span>{c.category}</span><span className="tabular-nums">${Math.round(c.amount).toLocaleString('en-US')}</span></div><div className="h-1.5 rounded bg-field"><div className="h-1.5 rounded bg-forest" style={{ width: `${(c.amount / (latest.byCategory[0]?.amount || 1)) * 100}%` }} /></div></li>)}</ul>
              {latest.note && <p className="text-sm">{latest.note}</p>}<p className="text-xs text-mute">Published {latest.publishedAt.slice(0, 10)}. Individual pay is never shown, only the combined staff and contractor line.</p></div></section>}

          {fund && <section aria-label="Our investment fund"><h2 className="mb-2 font-display text-xl font-semibold">Our investment fund · {fund.label}</h2>
            <div className="panel space-y-3 p-4"><div className="flex flex-wrap gap-6 text-sm"><span>Value <b className="font-display text-lg">${Math.round(fund.total).toLocaleString('en-US')}</b></span><span>Gain on capital <b className="font-display text-lg">{fund.returnPct >= 0 ? '+' : ''}{fund.returnPct.toFixed(1)}%</b></span><span>Paid to services this year <b className="font-display text-lg">${Math.round(fund.payoutsYtd).toLocaleString('en-US')}</b></span></div>
              <div><p className="text-sm">Goal: grow the fund until its returns pay for our services. <b>{fund.coveragePct.toFixed(1)}%</b> of the way.</p><div className="mt-1 h-2 rounded bg-field" role="img" aria-label={`${Math.round(fund.coveragePct)} percent of the way`}><div className="h-2 rounded bg-forest" style={{ width: `${fund.coveragePct}%` }} /></div></div>
              <ul className="space-y-1 text-sm">{fund.holdings.map(h => <li key={h.name} className="flex justify-between gap-3"><span>{h.name} <span className="text-mute">· {h.type}</span></span><span className="tabular-nums">${Math.round(h.value).toLocaleString('en-US')}</span></li>)}</ul>
              {fund.note && <p className="text-sm">{fund.note}</p>}
              <p className="text-xs text-mute">Published {fund.publishedAt.slice(0, 10)}. This is a transparency report, not an offer to invest. The fund is not open to outside investors. Past results do not predict future returns.</p></div></section>}

          <section aria-label="Services"><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">{t('What’s available and what’s coming')}</h2><button className="text-sm underline" onClick={() => go('services')}>All services</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {live.slice(0, 2).map(s => <div key={s.id} className="panel relative overflow-hidden p-3 pl-5"><Motif n={s.motif} hue="forest" className="absolute inset-y-0 left-0 w-2" /><p className="text-xs font-bold uppercase text-forest">Open now</p><p className="font-medium leading-tight">{s.name}</p></div>)}
              {soon && <div className="panel relative overflow-hidden p-3 pl-5"><Motif n={soon.motif} hue="sun" className="absolute inset-y-0 left-0 w-2" /><p className="text-xs font-bold uppercase text-sun-700">Opening {soon.opens}</p><p className="font-medium leading-tight">{soon.name}</p></div>}
              {onList.length > 0 && <div className="panel p-3"><p className="text-xs font-bold uppercase text-mute">You’re on the list for</p><p className="font-medium leading-tight">{onList.slice(0, 2).map(s => s.name).join(', ')}{onList.length > 2 ? ` +${onList.length - 2}` : ''}</p></div>}
            </div></section>
        </div>

        <aside className="space-y-6">
          <MemberCard h={h} />
          <section aria-label="Your clubs"><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">{t('Your clubs')}</h2><button className="text-sm underline" onClick={() => go('clubs')}>Browse</button></div>
            {myClubs.length ? <ul className="space-y-2">{myClubs.map(c => <li key={c.id} className="panel relative overflow-hidden p-3 pl-5"><Motif n={c.motif} hue={c.hue} className="absolute inset-y-0 left-0 w-2" /><p className="font-medium leading-tight">{c.name}</p><p className="text-xs text-mute">{c.meets}</p>{c.note && <p className="mt-1 text-xs font-medium text-forest">📌 {c.note}</p>}</li>)}</ul>
              : <button onClick={() => go('clubs')} className="panel w-full p-4 text-left text-sm"><b>Wealth Builders, Women Empowering Women</b> and more. Find your people.</button>}</section>
        </aside>
      </div>
    </div>
  )
}
