import type { ReactNode } from 'react'
import { I18nProvider, LanguagePicker, useT } from './lib/i18n'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { edition } from './lib/edition'
import { cloudMode } from './lib/supabase'
import { useData } from './lib/store'
import { AuthProvider, useAuth, type Session } from './lib/auth'
import { allRoles, areaLabel, areaPath, can, navAreas, roleInfo, type Area } from './lib/roles'
import { useCollection } from './lib/collections'
import { seedSubmissions } from './lib/seed'
import type { Submission } from './lib/types'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import MemberForm from './pages/MemberForm'
import Card from './pages/Card'
import Verify from './pages/Verify'
import Projections from './pages/Projections'
import Login from './pages/Login'
import Dues from './pages/Dues'
import Support from './pages/Support'
import Partners from './pages/Partners'
import Broadcasts from './pages/Broadcasts'
import Status from './pages/Status'
import Survey from './pages/Survey'
import Submissions from './pages/Submissions'
import Community from './pages/Community'
import Finance from './pages/Finance'
import Investments from './pages/Investments'
import Engagement from './pages/Engagement'
import ContentEditor from './pages/ContentEditor'
import Legal from './pages/Legal'
import Portal from './pages/Portal'
import Staff from './pages/Staff'
import Report from './pages/Report'

type Data = ReturnType<typeof useData>
type StaffSession = Extract<Session, { kind: 'staff' }>

function Guard({ role, area, children }: { role: StaffSession['role']; area: Area; children: ReactNode }) {
  if (can(role, area)) return <>{children}</>
  return (
    <div className="panel mx-auto max-w-lg p-6 text-center"><h1 className="font-display text-2xl font-bold">Not available for your role</h1>
      <p className="mt-2 text-mute">{areaLabel[area]} is not part of the {roleInfo[role].label.toLowerCase()} role. Ask an operations lead if you need access.</p></div>
  )
}

function Header({ children, who, onOut }: { children?: ReactNode; who: string; onOut: () => void }) {
  const { t } = useT()
  return (
    <header className="bg-forest text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div><p className="font-display text-xl font-bold leading-none">State of Community</p><p className="mt-1 text-sm text-white/70">{edition.name}</p></div>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-white/80">{who}</span><LanguagePicker /><button className="rounded-md px-3 py-1.5 text-white/85 hover:bg-white/10" onClick={onOut}>{t('Sign out')}</button></div>
      </div>
      {children}
    </header>
  )
}

function StaffShell({ s, data }: { s: StaffSession; data: Data & { households: NonNullable<Data['households']> } }) {
  const { demoSignIn } = useAuth(); const go = useNavigate()
  const subs = useCollection<Submission>('submissions', seedSubmissions)
  const newReplies = subs.items.filter(x => x.status === 'new').length
  const { signOut } = useAuth()
  const { households, pool, refresh } = data
  const g = (area: Area, el: ReactNode) => <Guard role={s.role} area={area}>{el}</Guard>
  return (
    <div className="min-h-screen">
      <Header who={roleInfo[s.role].label} onOut={signOut}>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-3" aria-label="Main">
          {navAreas.filter(a => can(s.role, a)).map(a => (
            <NavLink key={a} to={areaPath[a]!} end={a === 'dashboard'} className={({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-sun text-ink' : 'text-white/85 hover:bg-white/10'}`}>
              {areaLabel[a]}{a === 'submissions' && newReplies > 0 && <span className="ml-1.5 rounded-full bg-crane px-1.5 text-xs text-white">{newReplies}</span>}</NavLink>))}
        </nav>
      </Header>
      {!cloudMode && (
        <div className="bg-sun-100 px-4 py-2 text-center text-sm text-ink">Demo mode: sample data stored in this browser. Viewing as
          <label className="sr-only" htmlFor="role">Switch role</label>
          <select id="role" className="mx-2 rounded border border-line bg-white px-1 py-0.5" value={s.role} onChange={e => { demoSignIn({ ...s, role: e.target.value as StaffSession['role'], email: `${e.target.value}@example.org`, name: `Demo ${roleInfo[e.target.value as StaffSession['role']].label.toLowerCase()}` }); go('/') }}>
            {allRoles.map(r => <option key={r} value={r}>{roleInfo[r].label}</option>)}</select>
          so you can see what each role gets.</div>)}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={can(s.role, 'dashboard') ? <Dashboard pool={pool} households={households} refresh={refresh} /> : <Navigate to={areaPath[navAreas.find(a => can(s.role, a))!]!} replace />} />
          <Route path="/members" element={g('members', <Members households={households} refresh={refresh} canDelete={can(s.role, 'delete')} newReplies={can(s.role, 'submissions') ? newReplies : 0} />)} />
          <Route path="/members/new" element={g('members', <MemberForm households={households} refresh={refresh} />)} />
          <Route path="/members/:id" element={g('members', <MemberForm households={households} refresh={refresh} />)} />
          <Route path="/submissions" element={g('submissions', <Submissions households={households} refresh={refresh} />)} />
          <Route path="/card/:id" element={g('members', <Card households={households} />)} />
          <Route path="/dues" element={g('dues', <Dues households={households} refresh={refresh} />)} />
          <Route path="/support" element={g('support', <Support households={households} pool={pool} refresh={refresh} />)} />
          <Route path="/partners" element={g('partners', <Partners />)} />
          <Route path="/broadcasts" element={g('broadcasts', <Broadcasts households={households} />)} />
          <Route path="/projections" element={g('projections', <Projections />)} />
          <Route path="/report" element={g('report', <Report households={households} pool={pool} />)} />
          <Route path="/status" element={g('status', <Status households={households} />)} />
          <Route path="/finance" element={g('finance', <Finance pool={pool} />)} />
          <Route path="/investments" element={g('investments', <Investments />)} />
          <Route path="/engagement" element={g('analytics', <Engagement households={households} />)} />
          <Route path="/content" element={g('content', <ContentEditor />)} />
          <Route path="/community" element={g('community', <Community />)} />
          <Route path="/staff" element={g('staff', <Staff />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function MemberShell({ householdId, data }: { householdId: string; data: Data & { households: NonNullable<Data['households']> } }) {
  const { signOut, session } = useAuth()
  const h = data.households.find(x => x.id === householdId)
  return (
    <div className="min-h-screen">
      <Header who={session?.email ?? ''} onOut={signOut} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {h ? <Portal household={h} refresh={data.refresh} /> : <p className="panel p-6">We could not find your household record. Contact the community team and mention the email address you signed in with.</p>}
      </main>
    </div>
  )
}

function Gate() {
  const { session, loading } = useAuth(); const data = useData(session?.email)
  if (loading) return <p className="p-6 text-mute">Loading…</p>
  if (!session) return <Login />
  if (data.error) return <p role="alert" className="m-6 rounded-md border border-crane bg-white p-3 text-sm text-crane">Could not load data: {data.error}. Check the Supabase URL and key, and that schema.sql has been run.</p>
  if (!data.households) return <p className="p-6 text-mute">Loading…</p>
  const d = { ...data, households: data.households }
  return session.kind === 'staff' ? <StaffShell s={session} data={d} /> : <MemberShell householdId={session.householdId} data={d} />
}

export default function App() {
  return (
    <I18nProvider><AuthProvider>
      <Routes>
        <Route path="/verify/:code" element={<Verify />} />
        <Route path="/survey" element={<Survey />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/legal/:slug" element={<Legal />} />
        <Route path="*" element={<Gate />} />
      </Routes>
    </AuthProvider></I18nProvider>
  )
}
