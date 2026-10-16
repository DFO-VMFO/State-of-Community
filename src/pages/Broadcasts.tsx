import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCollection } from '../lib/collections'
import { supabase } from '../lib/supabase'
import type { Broadcast, Household } from '../lib/types'

type Channel = Broadcast['channel']
const audiences: [string, string, (h: Household) => boolean][] = [
  ['active', 'All active members', h => h.status === 'active'],
  ['pending', 'Pending enrollments', h => h.status === 'pending'],
  ['lapsed', 'Lapsed members (dues overdue)', h => h.status === 'lapsed'],
  ['standard', 'Standard plan', h => h.tier === 'standard'],
  ['premium', 'Premium plan', h => h.tier === 'premium'],
  ['uninsured', 'No health insurance', h => h.insurance === 'uninsured'],
  ['nolife', 'No life insurance', h => h.lifeInsurance !== 'yes'],
  ['credential', 'Foreign-educated, job mismatch', h => h.alignment === 'underemployed' || h.alignment === 'overqualified'],
  ['bereave', 'Wants the bereavement pool', h => ['essential', 'high'].includes(h.priorities.bereavement)],
  ['seniors', 'Households with seniors', h => h.seniors > 0],
  ['volunteers', 'Volunteers', h => h.volunteer],
]
const templates: Record<string, { name: string; subject: string; body: string; audience: string }> = {
  survey: { name: 'Survey reminder', subject: 'Help us count our community', audience: 'pending', body: 'Hello {name}, our community snapshot takes 5 minutes and answers stay anonymous. Please finish it this week so we can negotiate better group rates for everyone.' },
  benefit: { name: 'Benefit announcement', subject: 'A new member benefit is open', audience: 'active', body: 'Hello {name}, group legal and tax consultations are now open to members at a discount. Reply YES and we will book your slot.' },
  urgent: { name: 'Urgent alert', subject: 'Important update', audience: 'active', body: 'Hello {name}, we have an important update for members. Please reply or call the support line today.' },
  event: { name: 'Town hall invite', subject: 'Join our community town hall', audience: 'active', body: 'Hello {name}, you are invited to our community town hall. We will share the first State of Community results. Reply to confirm how many are coming.' },
  fundraise: { name: 'Pool top-up request', subject: 'A member family needs our help', audience: 'active', body: 'Hello {name}, a member family is facing a bereavement and the mutual aid pool needs a top-up. Any amount helps. Reply and we will send a secure payment link.' },
}
const eligible = (h: Household, c: Channel) => c === 'email' ? !!h.email : h.whatsappOptIn && !!h.phone

export default function Broadcasts({ households }: { households: Household[] }) {
  const [params] = useSearchParams()
  const { items, save } = useCollection<Broadcast>('broadcasts', () => [])
  const [tpl, setTpl] = useState('survey'); const [channel, setChannel] = useState<Channel>('whatsapp')
  const [aud, setAud] = useState('pending'); const [subject, setSubject] = useState(templates.survey.subject); const [body, setBody] = useState(templates.survey.body)
  const [status, setStatus] = useState(''); const [confirming, setConfirming] = useState(false)
  const pick = (k: string) => { setTpl(k); const t = templates[k]; setSubject(t.subject); setBody(t.body); setAud(t.audience) }
  useEffect(() => { const p = params.get('preset'); if (p && templates[p]) pick(p) }, [params])

  const group = useMemo(() => households.filter(audiences.find(a => a[0] === aud)![2]), [households, aud])
  const to = group.filter(h => eligible(h, channel))
  const preview = body.replace('{name}', (to[0] ?? group[0])?.headName.split(' ')[0] ?? 'Name')

  async function send() {
    if (!to.length) return setStatus('No one in this audience can receive messages on this channel.')
    setConfirming(false)
    let simulated = true
    if (supabase) {
      const { error } = await supabase.functions.invoke('soc-send-broadcast', { body: { channel, subject, body, recipients: to.map(h => ({ name: h.headName, phone: h.phone, email: h.email })) } })
      if (error) return setStatus(`Not sent: ${error.message}. Deploy the soc-send-broadcast function first (see README).`)
      simulated = false
    }
    await save({ id: crypto.randomUUID(), sentAt: new Date().toISOString(), channel, audience: audiences.find(a => a[0] === aud)![1], subject, body, recipients: to.length, skipped: group.length - to.length, simulated })
    setStatus(simulated ? `Simulated send to ${to.length} households. Nothing left this app.` : `Sent to ${to.length} households.`)
  }
  const optIn = households.length ? Math.round((households.filter(h => h.whatsappOptIn).length / households.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Broadcasts</h1>
        <p className="max-w-2xl text-mute">Message members on WhatsApp, text or email. Only households who agreed to be messaged are included ({optIn}% have so far).</p></div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="panel space-y-3 p-4" aria-label="Compose">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Templates">
            {Object.entries(templates).map(([k, t]) => <button key={k} aria-pressed={tpl === k} className={tpl === k ? 'btn bg-sun text-ink' : 'btn-ghost'} onClick={() => pick(k)}>{t.name}</button>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="ch">Channel</label><select id="ch" className="input" value={channel} onChange={e => setChannel(e.target.value as Channel)}><option value="whatsapp">WhatsApp</option><option value="sms">Text message</option><option value="email">Email</option></select></div>
            <div><label className="label" htmlFor="au">Audience</label><select id="au" className="input" value={aud} onChange={e => setAud(e.target.value)}>{audiences.map(a => <option key={a[0]} value={a[0]}>{a[1]}</option>)}</select></div>
          </div>
          {channel === 'email' && <div><label className="label" htmlFor="su">Subject</label><input id="su" className="input" value={subject} onChange={e => setSubject(e.target.value)} /></div>}
          <div><label className="label" htmlFor="bd">Message</label><textarea id="bd" className="input" rows={5} value={body} onChange={e => setBody(e.target.value)} /><p className="mt-1 text-xs text-mute">{'{name}'} becomes each household’s first name. Write in plain English; add a Luganda or Swahili line for elders.</p></div>
          {channel === 'whatsapp' && <p className="rounded-md bg-sun-100 p-2 text-xs">WhatsApp only lets businesses start a conversation with a pre-approved template. Submit each template above to Meta for approval before live sends.</p>}
          <div className="flex flex-wrap items-center gap-3">{confirming
              ? (<><button className="btn-primary" onClick={() => void send()}>Confirm: send to {to.length} by {channel}</button><button className="btn-ghost" onClick={() => setConfirming(false)}>Cancel</button></>)
              : <button className="btn-primary" onClick={() => { setStatus(''); to.length ? setConfirming(true) : setStatus('No one in this audience can receive messages on this channel.') }}>Send to {to.length}</button>}
            <span className="text-sm text-mute">{group.length} in audience · {group.length - to.length} skipped (no consent or no {channel === 'email' ? 'email' : 'phone'})</span></div>
          {status && <p role="status" className="text-sm font-medium text-forest">{status}</p>}
        </section>
        <section className="panel p-4" aria-label="Preview">
          <h2 className="font-display text-lg font-semibold">Preview</h2>
          <div className="mt-3 max-w-sm rounded-2xl rounded-tl-sm bg-forest-100 p-3 text-sm">{channel === 'email' && <p className="mb-1 font-semibold">{subject}</p>}{preview}</div>
          <h2 className="mt-6 font-display text-lg font-semibold">Sent</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {[...items].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).map(b => (
              <li key={b.id} className="py-2"><p className="font-medium">{b.subject}</p>
                <p className="text-xs text-mute">{new Date(b.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · {b.channel} · {b.audience} · {b.recipients} sent{b.skipped ? `, ${b.skipped} skipped` : ''}{b.simulated ? ' · simulated' : ''}</p></li>
            ))}
            {!items.length && <li className="py-2 text-mute">Nothing sent yet. Your sends will be listed here.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
