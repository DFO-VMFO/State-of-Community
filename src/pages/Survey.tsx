import { useState } from 'react'
import { useT, LanguagePicker } from '../lib/i18n'
import { edition, incomeBands, needsList, remitBands, services } from '../lib/edition'
import { submitSurvey } from '../lib/store'
import { Field, Sel } from '../components/fields'
import { Link } from 'react-router-dom'
import { LegalLinks } from './Legal'
import type { Answers, Interest, SurveySection } from '../lib/types'

const interests: [Interest, string][] = [['essential', 'Essential'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['none', 'Not needed']]
const empty: Answers = {
  headName: '', email: '', phone: '', city: '', generation: '1st', adults: 2, children: 0, seniors: 0, language: 'English', sector: edition.sectors[0],
  alignment: 'na', housing: 'rent', incomeBand: incomeBands[1], insurance: 'employer', lifeInsurance: 'unsure', remitBand: remitBands[0], homelandProperty: false,
  unmetNeed: needsList[0], priorities: Object.fromEntries(services.map(s => [s.id, 'medium' as Interest])), wtpMonthly: 15, volunteer: false, consentData: true, whatsappOptIn: false,
}
type Stage = 'intro' | 'you' | 'home' | 'need' | 'touch' | 'choice' | SurveySection
const titles: Record<Stage, string> = { intro: 'Before we start', you: 'About you', home: 'Your household', need: 'What you need most', touch: 'Staying in touch', choice: 'Almost done', work: 'Work and money (optional)', health: 'Health and protection (optional)', help: 'What would help (optional)' }
const core: Stage[] = ['intro', 'you', 'home', 'need', 'touch', 'choice']

// Public page. Anyone with the link can fill it in; staff review each reply before it becomes a member.
export default function Survey() {
  const { t } = useT(); const [a, setA] = useState<Answers>(empty); const [i, setI] = useState(0); const [more, setMore] = useState(false); const [kept, setKept] = useState<SurveySection[]>([]); const [agree, setAgree] = useState(false)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [trap, setTrap] = useState('')
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA(p => ({ ...p, [k]: v }))
  const num = (k: 'adults' | 'children' | 'seniors') => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Math.max(0, Math.min(20, Number(e.target.value) || 0)))

  const steps: Stage[] = more ? [...core, 'work', 'health', 'help'] : core
  const stage = steps[i]
  const skipAll: SurveySection[] = ['work', 'health', 'help']
  const isOpt = stage === 'work' || stage === 'health' || stage === 'help'
  function advance(answer: boolean) {
    const final = answer && isOpt && !kept.includes(stage as SurveySection) ? [...kept, stage as SurveySection] : kept
    setKept(final); if (i < steps.length - 1) setI(i + 1); else void submit(final)
  }
  function next() {
    setErr('')
    if (stage === 'intro' && !agree) return setErr('Tick the box to confirm you have read this, then continue.')
    if (stage === 'you' && !a.headName.trim()) return setErr('Enter your name so we can set up your membership.')
    if (stage === 'you' && !a.email.trim() && !a.phone.trim()) return setErr('Enter an email address or a phone number so we can reach you.')
    if (stage === 'you' && a.email.trim() && !/^\S+@\S+\.\S+$/.test(a.email.trim())) return setErr('That email address does not look right. Check it and try again.')
    setI(i + 1)
  }
  async function submit(final: SurveySection[]) {
    if (trap) return setDone(true) // bots fill hidden fields; pretend it worked
    setBusy(true); setErr('')
    const skipped = skipAll.filter(x => !final.includes(x))
    try { await submitSurvey({ ...a, skipped, headName: a.headName.trim(), email: a.email.trim().toLowerCase() }); setDone(true) }
    catch { setErr('We could not send your answers. Check your connection and try again.') }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-field">
      <header className="bg-forest px-4 py-4 text-white"><div className="mx-auto flex max-w-xl items-start justify-between gap-3"><div><p className="font-display text-xl font-bold">{edition.name}</p><p className="text-sm text-white/70">Community survey</p></div><LanguagePicker /></div></header>
      <main className="mx-auto max-w-xl px-4 py-6">
        {done ? (
          <div className="panel space-y-3 p-6"><h1 className="font-display text-2xl font-bold">Thank you</h1>
            <p>Your answers are in. A member of our team will review them and reach out about your membership, usually within a few days.</p>
            <p className="text-sm text-mute">If something is urgent, such as a bereavement, contact us directly rather than waiting.</p></div>
        ) : (<>
          <div className="mb-4" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={i} aria-label="Survey progress">
            <div className="flex justify-between text-sm"><span className="font-medium">{titles[stage]}</span><span className="text-mute">Step {i + 1} of {steps.length}</span></div>
            <div className="mt-1 h-2 rounded-full bg-line"><div className="h-full rounded-full bg-sun" style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div></div>
          <form className="panel space-y-4 p-5" onSubmit={e => { e.preventDefault(); if (stage === 'choice') return; if (isOpt) advance(true); else if (i < steps.length - 1) next(); else void submit(kept) }}>
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" value={trap} onChange={e => setTrap(e.target.value)} />
            {stage === 'intro' && (<>
              <h1 className="font-display text-2xl font-bold">{t('Help us count our community')}</h1>
              <p>The first part takes about 2 minutes. Your answers help us negotiate group rates for insurance, legal help and other benefits, and show what services are missing.</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Your name and contact details are never shown in community statistics.</li>
                <li>We only publish totals. Any group smaller than {edition.kMin} households is combined with others.</li>
                <li>We never sell your information.</li>
                <li>Only the first part is required. You can say "prefer not to say" to any optional section, and ask us to delete your answers at any time.</li>
              </ul>
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />I have read this and the <Link className="underline" to="/legal/survey-consent" target="_blank">survey consent</Link> and <Link className="underline" to="/legal/privacy" target="_blank">privacy policy</Link>, and want to continue.</label>
            </>)}
            {stage === 'you' && (<>
              <Field id="nm" label="Your name"><input id="nm" className="input" autoComplete="name" value={a.headName} onChange={e => set('headName', e.target.value)} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="em" label="Email"><input id="em" className="input" type="email" autoComplete="email" value={a.email} onChange={e => set('email', e.target.value)} /></Field>
                <Field id="ph" label="Phone or WhatsApp"><input id="ph" className="input" type="tel" autoComplete="tel" value={a.phone} onChange={e => set('phone', e.target.value)} /></Field>
                <Field id="ci" label="City"><input id="ci" className="input" autoComplete="address-level2" value={a.city} onChange={e => set('city', e.target.value)} /></Field>
                <Field id="ge" label="Which best describes you?"><Sel id="ge" value={a.generation} onChange={v => set('generation', v)} options={[['1st', 'I immigrated (1st generation)'], ['2nd', 'Born in the U.S. (2nd generation)'], ['3rd+', '3rd generation or later'], ['ally', 'Friend or ally of the community']]} /></Field>
              </div>
            </>)}
            {stage === 'home' && (<>
              <p className="text-sm text-mute">Including yourself, who lives in your home?</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="ad" label="Adults (18–64)"><input id="ad" className="input" type="number" min={0} value={a.adults} onChange={num('adults')} /></Field>
                <Field id="ch" label="Children under 18"><input id="ch" className="input" type="number" min={0} value={a.children} onChange={num('children')} /></Field>
                <Field id="se" label="Seniors 65+"><input id="se" className="input" type="number" min={0} value={a.seniors} onChange={num('seniors')} /></Field>
              </div>
              <Field id="la" label="Language spoken most at home"><Sel id="la" value={a.language} onChange={v => set('language', v)} options={edition.languages} /></Field>
              <Field id="ho" label="Do you own or rent?"><Sel id="ho" value={a.housing} onChange={v => set('housing', v)} options={[['own-mortgage', 'Own (with a mortgage)'], ['own-free', 'Own (no mortgage)'], ['rent', 'Rent'], ['family', 'Live with family or friends']]} /></Field>
            </>)}
            {stage === 'work' && (<>
              <Field id="sc" label="What kind of work do you do?"><Sel id="sc" value={a.sector} onChange={v => set('sector', v)} options={edition.sectors} /></Field>
              <Field id="al" label="If you studied outside the U.S., does your job match your training?"><Sel id="al" value={a.alignment} onChange={v => set('alignment', v)} options={[['aligned', 'Yes, fully'], ['overqualified', 'No, I am overqualified'], ['underemployed', 'No, I am working below my training'], ['na', 'Does not apply to me']]} /></Field>
              <Field id="in" label="Yearly household income before taxes"><Sel id="in" value={a.incomeBand} onChange={v => set('incomeBand', v)} options={incomeBands} /></Field>
              <Field id="re" label={`About how much do you send to ${edition.country} each year?`}><Sel id="re" value={a.remitBand} onChange={v => set('remitBand', v)} options={remitBands} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.homelandProperty} onChange={e => set('homelandProperty', e.target.checked)} />I own land or property in {edition.country}</label>
            </>)}
            {stage === 'health' && (<>
              <Field id="hi" label="How is your household covered for health insurance?"><Sel id="hi" value={a.insurance} onChange={v => set('insurance', v)} options={[['employer', 'Through an employer'], ['marketplace', 'Private or marketplace plan'], ['public', 'Medicare or Medicaid'], ['uninsured', 'Not covered']]} /></Field>
              <Field id="li" label="Do you have life insurance beyond what your employer provides?"><Sel id="li" value={a.lifeInsurance} onChange={v => set('lifeInsurance', v)} options={[['yes', 'Yes'], ['no', 'No'], ['unsure', 'I am not sure what I need']]} /></Field>
            </>)}
            {stage === 'help' && (<>
              <p className="text-sm text-mute">How important would each of these be to your household?</p>
              <ul className="divide-y divide-line">{services.map(s => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><label htmlFor={`p-${s.id}`} className="text-sm">{s.name}</label>
                  <Sel id={`p-${s.id}`} value={a.priorities[s.id]} onChange={v => set('priorities', { ...a.priorities, [s.id]: v })} options={interests} /></li>))}</ul>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.volunteer} onChange={e => set('volunteer', e.target.checked)} />I would help as a volunteer or on an advisory committee</label>
            </>)}
            {stage === 'need' && (<>
              <p className="text-sm text-mute">Two quick questions. They tell us what to build first.</p>
              <Field id="un" label="What is the single biggest service missing today?"><Sel id="un" value={a.unmetNeed} onChange={v => set('unmetNeed', v)} options={needsList} /></Field>
              <Field id="wt" label="What would you pay each month for group benefits?" hint="This helps us set fair prices. It is not a commitment."><Sel id="wt" value={String(a.wtpMonthly)} onChange={v => set('wtpMonthly', Number(v))} options={[['0', '$0'], ['10', '$10'], ['15', '$15'], ['20', '$20'], ['30', '$30 or more']]} /></Field>
            </>)}
            {stage === 'choice' && (<>
              <h2 className="font-display text-xl font-semibold">You can send this now</h2>
              <p className="text-sm">That is all we need to set up your membership. If you have a few more minutes, three optional sections (work and money, health and protection, what would help) let us shape services around your family. You can say "prefer not to say" to any of them.</p>
              <div className="flex flex-wrap gap-2"><button type="button" className="btn-primary" disabled={busy} onClick={() => void submit([])}>{busy ? 'Sending…' : t('Send my answers now')}</button><button type="button" className="btn-ghost" onClick={() => { setMore(true); setI(i + 1) }}>Add more details (about 3 minutes)</button></div>
            </>)}
            {stage === 'touch' && (<>
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={a.whatsappOptIn} onChange={e => set('whatsappOptIn', e.target.checked)} />You may send me updates by WhatsApp or text message. I can stop them at any time.</label>
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={a.consentData} onChange={e => set('consentData', e.target.checked)} />Count my answers in the anonymous community statistics. If you leave this off, we still set up your membership but leave your answers out of the totals.</label>
            </>)}
            {err && <p role="alert" className="text-sm text-crane">{err}</p>}
            {stage !== 'choice' && <div className="flex flex-wrap justify-between gap-2 pt-1">
              {i > 0 ? <button type="button" className="btn-ghost" onClick={() => { setErr(''); setI(i - 1) }}>{t('Back')}</button> : <span />}
              <span className="flex gap-2">{isOpt && <button type="button" className="btn-ghost" disabled={busy} onClick={() => advance(false)}>{t('Prefer not to say')}</button>}
                <button className="btn-primary" disabled={busy}>{i === steps.length - 1 ? (busy ? 'Sending…' : t('Send my answers')) : t('Continue')}</button></span>
            </div>}
          </form>
        </>)}
        <LegalLinks className="mt-6 text-center" />
      </main>
    </div>
  )
}
