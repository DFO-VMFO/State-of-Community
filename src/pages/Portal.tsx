import { useState } from 'react'
import { useT } from '../lib/i18n'
import type { Household } from '../lib/types'
import About from './portal/About'
import Account from './portal/Account'
import Clubs from './portal/Clubs'
import Events from './portal/Events'
import Goals from './portal/Goals'
import Home from './portal/Home'
import Services from './portal/Services'
import Toolkit from './portal/Toolkit'
import type { Tab } from './portal/shared'
import { useEffect, useRef } from 'react'
import { track } from '../lib/telemetry'
import { MeProvider, useMe } from '../lib/me'
import { LegalLinks } from './Legal'
import ConsentGate from './portal/ConsentGate'

const tabs: [Tab, string, string][] = [['home', 'Home', '⌂'], ['services', 'Services', '✦'], ['goals', 'Goals', '◎'], ['events', 'Events', '▦'], ['clubs', 'Clubs', '☺'], ['toolkit', 'Toolkit', '✚'], ['account', 'Account', '☰']]

// What a signed-in member sees: only their own household.
export default function Portal(props: { household: Household; refresh: () => Promise<void> }) { return <MeProvider h={props.household}><ConsentGate h={props.household}><PortalInner {...props} /></ConsentGate></MeProvider> }
function PortalInner({ household: h, refresh }: { household: Household; refresh: () => Promise<void> }) {
  const { t } = useT(); const me = useMe(); const [tab, setTab] = useState<Tab>('home'); const [cat, setCat] = useState<string | undefined>()
  const since = useRef(Date.now()); const shown = useRef<Tab>('home')
  useEffect(() => { try { if (!sessionStorage.getItem('soc.sess.' + me.personId)) { sessionStorage.setItem('soc.sess.' + me.personId, '1'); void track({ householdId: h.id, personId: me.personId, type: 'login', screen: 'login' }) } } catch { /* ignore */ } }, [me.personId, h.id])
  useEffect(() => { const prev = shown.current; const ms = Date.now() - since.current; if (prev !== tab) { void track({ householdId: h.id, personId: me.personId, type: 'view', screen: prev, ms }); shown.current = tab; since.current = Date.now() } }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => { if (document.visibilityState === 'hidden') { void track({ householdId: h.id, personId: me.personId, type: 'view', screen: shown.current, ms: Date.now() - since.current }); since.current = Date.now() } }; document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [h.id, me.personId])
  const go = (t: Tab, o?: { cat?: string }) => { setCat(o?.cat); setTab(t); window.scrollTo?.({ top: 0 }) }
  return (
    <div className="mx-auto max-w-5xl pb-20 sm:pb-0">
      <nav aria-label="Member sections" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white sm:static sm:z-auto sm:mb-6 sm:border-0 sm:bg-transparent">
        <ul className="mx-auto flex max-w-5xl justify-around gap-1 p-1 sm:justify-start sm:p-0">
          {tabs.map(([k, label, icon]) => (
            <li key={k} className="min-w-0 flex-1 sm:flex-none"><button onClick={() => go(k)} aria-current={tab === k ? 'page' : undefined}
              className={`flex w-full flex-col items-center rounded-lg px-0 py-1.5 text-[10px] tracking-tighter font-semibold sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-4 sm:py-1.5 sm:text-sm ${tab === k ? 'bg-forest text-white' : 'text-mute hover:bg-white'}`}>
              <span aria-hidden className="text-base leading-none">{icon}</span>{t(label)}</button></li>))}
        </ul>
      </nav>
      {tab === 'home' && <Home h={h} go={go} />}
      {tab === 'services' && <Services h={h} go={go} />}
      {tab === 'goals' && <Goals h={h} go={go} />}
      {tab === 'events' && <Events h={h} go={go} />}
      {tab === 'clubs' && <Clubs h={h} go={go} />}
      {tab === 'toolkit' && <Toolkit key={cat} h={h} go={go} focus={cat} />}
      {tab === 'about' && <About h={h} go={go} />}
      {tab === 'account' && <Account key={cat} h={h} refresh={refresh} initialCat={cat} />}
      <LegalLinks className="mt-8 text-center text-xs text-mute" />
    </div>
  )
}
