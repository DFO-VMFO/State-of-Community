import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useCollection } from '../lib/collections'
import { DISCLAIMER, expiring, hasCheck, institutionKinds, introMessage, moveBlock, nextStage, professionalKinds, stageChecks, stageLabels, stageOrder, trackBlurb, trackOf } from '../lib/partners'
import { seedPartners } from '../lib/seed'
import type { Partner, PartnerComplaint, PartnerKind, PartnerStage, PartnerTrack } from '../lib/types'

const isLive = (p: Partner) => p.stage === 'listed' && (p.status ?? 'active') === 'active'
// The launch checklist needs at least 3 verified providers in each of these groups.
export const coverage = (ps: Partner[]) => ([
  ['Legal', ['Attorney']], ['Tax', ['CPA']], ['Health and repatriation', ['Insurance broker', 'Repatriation logistics', 'Counselor']],
] as [string, PartnerKind[]][]).map(([label, ks]) => ({ label, n: ps.filter(p => isLive(p) && ks.includes(p.kind)).length }))

const today = () => new Date().toISOString().slice(0, 10)
const trackLabel: Record<PartnerTrack, string> = { institution: 'Institution', professional: 'Professional' }

export default function Partners() {
  const { session } = useAuth(); const s = session?.kind === 'staff' ? session : null; const role = s?.role ?? 'partnerships'; const email = s?.email ?? ''
  const { items, save } = useCollection<Partner>('partners', seedPartners)
  const cx = useCollection<PartnerComplaint>('partner_complaints', () => [])
  const [sel, setSel] = useState<string | null>(null); const [adding, setAdding] = useState(false); const [filter, setFilter] = useState<'all' | PartnerTrack>('all'); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [n, setN] = useState(''); const [tr, setTr] = useState<PartnerTrack>('professional'); const [k, setK] = useState<PartnerKind>('Attorney')
  const [csum, setCsum] = useState(''); const [csev, setCsev] = useState<'minor' | 'serious'>('minor'); const [res, setRes] = useState<Record<string, string>>({})
  const shown = items.filter(p => filter === 'all' || trackOf(p) === filter); const p = items.find(x => x.id === sel)
  const labels = filter === 'all' ? stageLabels.professional : stageLabels[filter]
  const cov = coverage(items)
  const upd = async (x: Partner, patch: Partial<Partner>, okMsg?: string) => { try { await save({ ...x, ...patch }); if (okMsg) setMsg({ ok: true, t: okMsg }) } catch (e) { setMsg({ ok: false, t: (e as Error).message }) } }
  const setCheck = (x: Partner, key: string, v: boolean) => upd(x, { checks: { ...(x.checks ?? {}), [key]: v }, ...(key === 'license' ? { licenseVerified: v } : key === 'insurance' ? { insuranceVerified: v } : {}) })
  const attention = items.flatMap(x => [
    ...(x.stage === 'listed' ? expiring(x).map(e => ({ id: x.id, text: `${x.name}: ${e.what} ${e.left < 0 ? `expired ${-e.left} days ago` : `due in ${e.left} days`}`, bad: e.left <= 14 })) : []),
    ...(x.status === 'paused' ? [{ id: x.id, text: `${x.name} is paused`, bad: true }] : []),
  ]).concat(cx.items.filter(c => c.status === 'open').map(c => ({ id: c.partnerId, text: `Open ${c.severity} complaint: ${items.find(x => x.id === c.partnerId)?.name ?? ''}`, bad: c.severity === 'serious' })))
  const myComplaints = cx.items.filter(c => c.partnerId === sel).sort((a, b) => b.at.localeCompare(a.at))

  function advance(x: Partner) {
    const b = moveBlock(x, role, email); if (b) return setMsg({ ok: false, t: b })
    const nx = nextStage(x)!; const patch: Partial<Partner> = { stage: nx }
    if (nx === 'listed') Object.assign(patch, { approvedBy: email, approvedAt: new Date().toISOString(), status: 'active', reviewDue: x.reviewDue ?? new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10) })
    else patch.vettedBy = email
    void upd(x, patch, nx === 'listed' ? `${x.name} is now listed. Annual review set.` : `Moved to ${stageLabels[trackOf(x)][nx]}.`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold">Partner vetting</h1>
          <p className="max-w-3xl text-mute">Two tracks: <b>professionals</b> (a CPA, attorney or broker, who may be a member) and <b>institutions</b> (a bank, insurer or corporate sponsor). Each has its own checklist and approver. Names below are sample data.</p></div>
        <button className="btn-primary" onClick={() => setAdding(true)}>Add partner</button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Track">{([['all', 'All'], ['professional', 'Professionals'], ['institution', 'Institutions']] as const).map(([v, l]) => <button key={v} aria-pressed={filter === v} onClick={() => setFilter(v)} className={`rounded-full border px-3 py-1 text-sm font-medium ${filter === v ? 'border-forest bg-forest text-white' : 'border-line bg-white'}`}>{l}</button>)}</div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md p-2 text-sm font-medium ${msg.ok ? 'bg-forest-100' : 'border border-crane bg-white text-crane'}`}>{msg.t}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {cov.map(c => (
          <div key={c.label} className="panel p-3"><p className="text-sm text-mute">{c.label}</p>
            <p className="font-display text-2xl font-bold tabular-nums">{c.n} of 3 listed</p>
            <p className={`text-xs font-semibold ${c.n >= 3 ? 'text-forest' : 'text-crane'}`}>{c.n >= 3 ? 'Meets the launch minimum' : `${3 - c.n} more needed to launch`}</p></div>))}
      </div>
      {attention.length > 0 && <section className="panel p-3" aria-label="Needs attention"><h2 className="font-display text-lg font-semibold">Needs attention</h2>
        <ul className="mt-1 space-y-1 text-sm">{attention.map((a, i) => <li key={i}><button className={`underline ${a.bad ? 'text-crane' : ''}`} onClick={() => setSel(a.id)}>{a.text}</button></li>)}</ul></section>}
      {adding && (
        <form className="panel grid gap-3 p-4 sm:grid-cols-4 sm:items-end" onSubmit={e => { e.preventDefault(); if (!n.trim()) return; const id = crypto.randomUUID(); void upd({ id, name: n.trim(), kind: k, track: tr, contact: '', languages: 'English', license: '', stage: 'application', licenseVerified: false, insuranceVerified: false, discount: '', slaHours: 24, notes: '', checks: {}, referral: 'none', status: 'active', vettedBy: email } as Partner, {}); setN(''); setAdding(false); setSel(id) }}>
          <div><label className="label" htmlFor="pt">Track</label><select id="pt" className="input" value={tr} onChange={e => { const v = e.target.value as PartnerTrack; setTr(v); setK(v === 'institution' ? institutionKinds[0] : professionalKinds[0]) }}><option value="professional">Professional (CPA, attorney, broker…)</option><option value="institution">Institution (bank, insurer, sponsor)</option></select></div>
          <div><label className="label" htmlFor="pk">Type</label><select id="pk" className="input" value={k} onChange={e => setK(e.target.value as PartnerKind)}>{(tr === 'institution' ? institutionKinds : professionalKinds).map(x => <option key={x}>{x}</option>)}</select></div>
          <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" required value={n} onChange={e => setN(e.target.value)} /></div>
          <div className="flex gap-2"><button className="btn-primary">Add</button><button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
          <p className="text-xs text-mute sm:col-span-4">{trackBlurb[tr]}</p>
        </form>)}
      <div className="overflow-x-auto"><div className="grid min-w-[60rem] grid-cols-6 gap-3">
        {stageOrder.map(stg => (
          <section key={stg} aria-label={labels[stg]} className="rounded-lg bg-white/60 p-2">
            <h2 className="px-1 pb-2 font-display text-base font-semibold leading-tight">{labels[stg]} <span className="text-mute">({shown.filter(x => x.stage === stg).length})</span></h2>
            <ul className="space-y-2">
              {shown.filter(x => x.stage === stg).map(x => (
                <li key={x.id}><button onClick={() => setSel(x.id)} className={`panel w-full p-3 text-left hover:border-forest ${sel === x.id ? 'border-forest ring-2 ring-sun' : ''}`}>
                  <p className="text-sm font-medium">{x.name}</p><p className="text-xs text-mute">{x.kind}</p>
                  <span className={`mt-1 inline-block rounded px-1.5 text-[10px] font-bold uppercase ${trackOf(x) === 'institution' ? 'bg-forest text-white' : 'bg-sun-100 text-sun-700'}`}>{trackLabel[trackOf(x)]}</span>
                  {x.status === 'paused' && <span className="ml-1 inline-block rounded bg-crane px-1.5 text-[10px] font-bold uppercase text-white">Paused</span>}</button></li>))}
              {!shown.some(x => x.stage === stg) && <li className="px-1 text-xs text-mute">Nobody at this step.</li>}
            </ul></section>))}
      </div></div>

      {p && (() => { const t = trackOf(p); const cur = stageChecks(p, p.stage); const block = moveBlock(p, role, email); const nx = nextStage(p); const prevDone = stageOrder.slice(0, stageOrder.indexOf(p.stage)); return (
        <section className="panel space-y-4 p-4" aria-label="Partner detail">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{p.name}</h2><p className="text-sm text-mute">{p.kind} · {trackLabel[t]} track · {stageLabels[t][p.stage]}{p.approvedBy ? ` · approved by ${p.approvedBy}` : ''}</p></div><button className="btn-ghost" onClick={() => setSel(null)}>Close</button></div>
          <p className="rounded-md bg-field p-2 text-sm text-mute">{trackBlurb[t]}</p>

          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="label" htmlFor="ct">Contact</label><input id="ct" className="input" value={p.contact} onChange={e => void upd(p, { contact: e.target.value })} /></div>
            <div><label className="label" htmlFor="lg">Languages</label><input id="lg" className="input" value={p.languages} onChange={e => void upd(p, { languages: e.target.value })} /></div>
            <div><label className="label" htmlFor="ln">{t === 'institution' ? 'Charter or registration no.' : 'License number'}</label><input id="ln" className="input" value={p.license} onChange={e => void upd(p, { license: e.target.value })} /></div>
            <div><label className="label" htmlFor="ds">Member benefit or discount</label><input id="ds" className="input" placeholder="e.g. 15% off retainers" value={p.discount} onChange={e => void upd(p, { discount: e.target.value })} /></div>
            <div><label className="label" htmlFor="sl">Reply time target (hours)</label><input id="sl" className="input" type="number" min={1} value={p.slaHours} onChange={e => void upd(p, { slaHours: Number(e.target.value) || 24 })} /></div>
            <div><label className="label" htmlFor="ow">Our owner for this partner</label><input id="ow" className="input" value={p.owner ?? ''} onChange={e => void upd(p, { owner: e.target.value })} /></div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <fieldset className="space-y-2"><legend className="label">Conflicts and referral fees</legend>
              {t === 'professional' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.isMember} onChange={e => void upd(p, { isMember: e.target.checked })} />This provider is also a community member</label>}
              <label className="label" htmlFor="cf">Any tie to staff, board or other partners?</label><input id="cf" className="input" placeholder="None, or describe" value={p.conflict ?? ''} onChange={e => void upd(p, { conflict: e.target.value })} />
              <label className="label" htmlFor="rf">Referral payments</label>
              <select id="rf" className="input" value={p.referral ?? 'none'} onChange={e => void upd(p, { referral: e.target.value as Partner['referral'] })}><option value="none">None either way</option><option value="we-receive">We receive a fee or sponsorship</option><option value="they-receive">They receive a fee for referrals</option></select>
              {(p.referral ?? 'none') !== 'none' && <input aria-label="Referral details" className="input" placeholder="Describe the arrangement" value={p.referralNote ?? ''} onChange={e => void upd(p, { referralNote: e.target.value })} />}
              {(p.referral ?? 'none') !== 'none' && <p className="text-xs text-crane">Needs a lawyer’s sign-off before listing. Some fees are restricted for lawyers, CPAs, insurers and lenders.</p>}</fieldset>
            <fieldset className="space-y-2"><legend className="label">Agreement and paperwork dates</legend>
              <div className="flex items-center justify-between gap-2 text-sm"><label htmlFor="ag">Agreement status</label><select id="ag" className="input w-40 py-1" value={p.agreementStatus ?? 'none'} onChange={e => void upd(p, { agreementStatus: e.target.value as Partner['agreementStatus'] })}><option value="none">Not started</option><option value="draft">Drafting</option><option value="sent">Sent for signature</option><option value="signed">Signed</option></select></div>
              <p className="text-xs text-mute">Reminders start 60 days before each date.</p>
              {([['licenseExpires', 'License or registration expires'], ['insuranceExpires', 'Liability insurance expires'], ['agreementExpires', 'Agreement ends'], ['reviewDue', 'Annual review due']] as const).map(([f, l]) => <div key={f} className="flex items-center justify-between gap-2 text-sm"><label htmlFor={f}>{l}</label><input id={f} type="date" className="input w-40 py-1" value={p[f] ?? ''} onChange={e => void upd(p, { [f]: e.target.value || undefined })} /></div>)}</fieldset>
          </div>

          <div><h3 className="font-display text-lg font-semibold">Checklist for “{stageLabels[t][p.stage]}”</h3>
            <ul className="mt-1 space-y-1">{cur.map(c => <li key={c.key}><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={hasCheck(p, c.key)} onChange={e => void setCheck(p, c.key, e.target.checked)} /><span>{c.label}{c.help && <span className="block text-xs text-mute">{c.help}</span>}</span></label></li>)}
              {!cur.length && <li className="text-sm text-mute">{p.stage === 'listed' ? 'Listed. Keep the dates above current.' : 'Nothing required at this step.'}</li>}</ul>
            {prevDone.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-mute">Earlier steps</summary>
              {prevDone.map(sg => <div key={sg} className="mt-1"><p className="text-xs font-semibold uppercase text-mute">{stageLabels[t][sg]}</p><ul>{stageChecks(p, sg).map(c => <li key={c.key} className="flex gap-2"><span aria-hidden>{hasCheck(p, c.key) ? '✓' : '○'}</span><span className={hasCheck(p, c.key) ? '' : 'text-crane'}>{c.label}</span></li>)}</ul></div>)}</details>}</div>

          {(p.stage === 'pilot' || p.stage === 'listed') && <div className="space-y-1"><h3 className="font-display text-lg font-semibold">Introduction to the community</h3>
            <label className="label" htmlFor="im">Draft message (send it from Broadcasts after the board or operations lead approves)</label>
            <textarea id="im" readOnly className="input h-24 text-sm" value={introMessage(p)} />
            <button className="btn-ghost" onClick={() => void navigator.clipboard?.writeText(introMessage(p)).then(() => setMsg({ ok: true, t: 'Copied.' })).catch(() => setMsg({ ok: false, t: 'Select the text and copy it.' }))}>Copy</button>
            <p className="text-xs text-mute">Standard disclaimer (have your attorney review it): {DISCLAIMER}</p></div>}

          <div><label className="label" htmlFor="no">Notes</label><textarea id="no" className="input" rows={2} value={p.notes} onChange={e => void upd(p, { notes: e.target.value })} /></div>

          <div className="flex flex-wrap items-center gap-2">
            {nx && <button className="btn-primary" aria-disabled={!!block} onClick={() => advance(p)}>{nx === 'listed' ? (t === 'institution' ? 'Approve and list (board)' : 'Approve and list') : `Move to ${stageLabels[t][nx]}`}</button>}
            {p.stage !== 'application' && p.stage !== 'listed' && <button className="btn-ghost" onClick={() => void upd(p, { stage: stageOrder[stageOrder.indexOf(p.stage) - 1] as PartnerStage })}>Move back</button>}
            {p.stage === 'listed' && (p.status === 'paused' ? <button className="btn-ghost" onClick={() => void upd(p, { status: 'active' }, 'Resumed.')}>Resume</button> : <button className="btn-ghost" onClick={() => void upd(p, { status: 'paused' }, 'Paused. It no longer counts toward coverage or appears for referrals.')}>Pause</button>)}
            {block && <p className="w-full text-sm text-mute">{block}</p>}
          </div>

          <div><h3 className="font-display text-lg font-semibold">Complaints and concerns</h3>
            <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (!csum.trim()) return; void cx.save({ id: crypto.randomUUID(), partnerId: p.id, at: today(), summary: csum.trim(), severity: csev, status: 'open', by: email }).then(() => { if (csev === 'serious') return upd(p, { status: 'paused' }, 'Serious complaint logged. The partner is paused until it is resolved.'); setMsg({ ok: true, t: 'Logged.' }) }); setCsum('') }}>
              <div className="min-w-56 flex-1"><label className="label" htmlFor="cs">What happened</label><input id="cs" className="input" value={csum} onChange={e => setCsum(e.target.value)} /></div>
              <div><label className="label" htmlFor="cv">Severity</label><select id="cv" className="input" value={csev} onChange={e => setCsev(e.target.value as 'minor' | 'serious')}><option value="minor">Minor</option><option value="serious">Serious (pauses the partner)</option></select></div>
              <button className="btn-ghost">Log it</button></form>
            <ul className="mt-2 divide-y divide-line text-sm">{myComplaints.map(c => <li key={c.id} className="py-2"><p><b className={c.severity === 'serious' ? 'text-crane' : ''}>{c.severity}</b> · {c.at} · {c.summary} <span className="text-mute">· {c.status}</span></p>
              {c.status === 'open' ? <div className="mt-1 flex gap-2"><input aria-label="Resolution" className="input py-1" placeholder="How it was resolved" value={res[c.id] ?? ''} onChange={e => setRes({ ...res, [c.id]: e.target.value })} /><button className="btn-ghost px-2 py-1" onClick={() => { if (!res[c.id]?.trim()) return setMsg({ ok: false, t: 'Say how it was resolved.' }); void cx.save({ ...c, status: 'resolved', resolution: res[c.id].trim() }) }}>Resolve</button></div> : c.resolution && <p className="text-mute">Resolution: {c.resolution}</p>}</li>)}
              {!myComplaints.length && <li className="py-2 text-mute">No complaints logged.</li>}</ul></div>
        </section>) })()}
    </div>
  )
}
