import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { edition, incomeBands, remitBands, services } from '../lib/edition'
import { saveHousehold } from '../lib/store'
import { Field, Sel } from '../components/fields'
import type { Household, Interest } from '../lib/types'

const interests: [Interest, string][] = [['essential', 'Essential'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['none', 'Not needed']]

function blank(all: Household[]): Household {
  const next = Math.max(0, ...all.map(h => Number(h.memberCode.split('-').pop()) || 0)) + 1
  return {
    id: crypto.randomUUID(), memberCode: `${edition.codePrefix}-${String(next).padStart(4, '0')}`, headName: '', email: '', phone: '', city: 'Dallas',
    tier: 'standard', status: 'pending', joinedAt: new Date().toISOString().slice(0, 10), generation: '1st', adults: 2, children: 0, seniors: 0,
    language: 'English', sector: edition.sectors[0], alignment: 'na', housing: 'rent', incomeBand: incomeBands[1], insurance: 'employer', lifeInsurance: 'unsure',
    remitBand: remitBands[0], homelandProperty: false, unmetNeed: '', priorities: Object.fromEntries(services.map(s => [s.id, 'medium' as Interest])),
    wtpMonthly: 15, volunteer: false, consentData: false, whatsappOptIn: false,
  }
}

export default function MemberForm({ households, refresh }: { households: Household[]; refresh: () => Promise<void> }) {
  const { id } = useParams(); const nav = useNavigate()
  const [h, setH] = useState<Household>(() => households.find(x => x.id === id) ?? blank(households))
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = <K extends keyof Household>(k: K, v: Household[K]) => setH(p => ({ ...p, [k]: v }))
  const num = (k: 'adults' | 'children' | 'seniors') => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Math.max(0, Number(e.target.value) || 0))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!h.headName.trim()) return setErr('Enter the household contact name.')
    setBusy(true); setErr('')
    try { await saveHousehold({ ...h, status: h.status === 'pending' && h.consentData ? 'active' : h.status }); await refresh(); nav('/members') }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not save'); setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{id ? h.headName || 'Edit household' : 'Add household'}</h1>
        <p className="font-mono text-sm text-mute">{h.memberCode}</p>
      </div>

      <fieldset className="panel space-y-3 p-4">
        <legend className="px-1 font-display text-lg font-semibold">Contact</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="nm" label="Contact name"><input id="nm" className="input" required value={h.headName} onChange={e => set('headName', e.target.value)} /></Field>
          <Field id="ci" label="City"><input id="ci" className="input" value={h.city} onChange={e => set('city', e.target.value)} /></Field>
          <Field id="em" label="Email"><input id="em" className="input" type="email" value={h.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field id="ph" label="Phone or WhatsApp"><input id="ph" className="input" type="tel" value={h.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field id="tr" label="Plan"><Sel id="tr" value={h.tier} onChange={v => set('tier', v)} options={Object.entries(edition.tiers).map(([k, t]) => [k, `${t.label} · $${t.monthly}/month`] as const)} /></Field>
          <Field id="ss" label="Status"><Sel id="ss" value={h.status} onChange={v => set('status', v)} options={[['pending', 'Pending'], ['active', 'Active'], ['lapsed', 'Lapsed']]} /></Field>
        </div>
      </fieldset>

      <fieldset className="panel space-y-3 p-4">
        <legend className="px-1 font-display text-lg font-semibold">Household</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="ad" label="Adults (18–64)"><input id="ad" className="input" type="number" min={0} value={h.adults} onChange={num('adults')} /></Field>
          <Field id="ch" label="Children under 18"><input id="ch" className="input" type="number" min={0} value={h.children} onChange={num('children')} /></Field>
          <Field id="se" label="Seniors 65+"><input id="se" className="input" type="number" min={0} value={h.seniors} onChange={num('seniors')} /></Field>
          <Field id="ge" label="Generation"><Sel id="ge" value={h.generation} onChange={v => set('generation', v)} options={[['1st', '1st (immigrant)'], ['2nd', '2nd (born in U.S.)'], ['3rd+', '3rd or later'], ['ally', 'Ally']]} /></Field>
          <Field id="la" label="Language at home"><Sel id="la" value={h.language} onChange={v => set('language', v)} options={edition.languages} /></Field>
          <Field id="ho" label="Housing"><Sel id="ho" value={h.housing} onChange={v => set('housing', v)} options={[['own-mortgage', 'Own (mortgage)'], ['own-free', 'Own (free and clear)'], ['rent', 'Rent'], ['family', 'Live with family or friends']]} /></Field>
        </div>
      </fieldset>

      <fieldset className="panel space-y-3 p-4">
        <legend className="px-1 font-display text-lg font-semibold">Work, money and health</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="sc" label="Work sector"><Sel id="sc" value={h.sector} onChange={v => set('sector', v)} options={edition.sectors} /></Field>
          <Field id="al" label="Does your job match your foreign education?"><Sel id="al" value={h.alignment} onChange={v => set('alignment', v)} options={[['aligned', 'Yes, fully'], ['overqualified', 'Overqualified'], ['underemployed', 'Underemployed'], ['na', 'Not applicable']]} /></Field>
          <Field id="in" label="Household income"><Sel id="in" value={h.incomeBand} onChange={v => set('incomeBand', v)} options={incomeBands} /></Field>
          <Field id="re" label={`Sent to ${edition.country} each year`}><Sel id="re" value={h.remitBand} onChange={v => set('remitBand', v)} options={remitBands} /></Field>
          <Field id="hi" label="Health insurance"><Sel id="hi" value={h.insurance} onChange={v => set('insurance', v)} options={[['employer', 'Employer plan'], ['marketplace', 'Private or marketplace'], ['public', 'Medicare or Medicaid'], ['uninsured', 'Uninsured']]} /></Field>
          <Field id="li" label="Life insurance beyond employer cover"><Sel id="li" value={h.lifeInsurance} onChange={v => set('lifeInsurance', v)} options={[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Unsure what I need']]} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={h.whatsappOptIn} onChange={e => set('whatsappOptIn', e.target.checked)} /> OK to message this household on WhatsApp or by text</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={h.homelandProperty} onChange={e => set('homelandProperty', e.target.checked)} /> Owns land or property in {edition.country}</label>
      </fieldset>

      <fieldset className="panel space-y-3 p-4">
        <legend className="px-1 font-display text-lg font-semibold">What would help most</legend>
        <ul className="divide-y divide-line">
          {services.map(s => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <label htmlFor={`p-${s.id}`} className="text-sm">{s.name}</label>
              <Sel id={`p-${s.id}`} value={h.priorities[s.id] ?? 'medium'} onChange={v => set('priorities', { ...h.priorities, [s.id]: v })} options={interests} />
            </li>
          ))}
        </ul>
        <Field id="un" label="Single biggest missing service"><input id="un" className="input" value={h.unmetNeed} onChange={e => set('unmetNeed', e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="wt" label="What would you pay per month for group benefits?"><Sel id="wt" value={String(h.wtpMonthly)} onChange={v => set('wtpMonthly', Number(v))} options={[['0', '$0'], ['10', '$10'], ['15', '$15'], ['20', '$20'], ['30', '$30 or more']]} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={h.volunteer} onChange={e => set('volunteer', e.target.checked)} /> Willing to volunteer or join an advisory committee</label>
        </div>
      </fieldset>

      <fieldset className="panel border-sun p-4">
        <legend className="px-1 font-display text-lg font-semibold">Privacy consent</legend>
        <label className="flex items-start gap-2 text-sm">
          <input className="mt-1" type="checkbox" checked={h.consentData} onChange={e => set('consentData', e.target.checked)} />
          <span>The household agrees that its answers may be counted in anonymous community statistics. Names and contact details are never shown on the dashboard, and groups under {edition.kMin} households are hidden. Nothing is sold to outside parties.</span>
        </label>
        <p className="mt-2 text-xs text-mute">Without consent the household still gets a member card, but its answers are left out of the dashboard.</p>
      </fieldset>

      {err && <p role="alert" className="text-sm text-crane">{err}</p>}
      <div className="flex gap-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save household'}</button><button type="button" className="btn-ghost" onClick={() => nav('/members')}>Cancel</button></div>
    </form>
  )
}
