import { useState, type ReactNode } from 'react'
import { useT } from '../../lib/i18n'
import { Link } from 'react-router-dom'
import { useCollection } from '../../lib/collections'
import { consentSlugs, useContent } from '../../lib/content'
import { useMe } from '../../lib/me'
import type { Consent, Household } from '../../lib/types'

// Each adult accepts the Terms and Privacy Policy once, and again whenever staff publish a new version.
export default function ConsentGate({ h, children }: { h: Household; children: ReactNode }) {
  const { t } = useT(); const me = useMe(); const content = useContent(); const cons = useCollection<Consent>('consents', () => [])
  const [ok, setOk] = useState(false); const [err, setErr] = useState('')
  if (content.loading || cons.loading) return <p className="p-6 text-mute">Loading…</p>
  const docs = consentSlugs.map(s => content.byId(s)).filter((d): d is NonNullable<typeof d> => !!d)
  const pending = docs.filter(d => !cons.items.some(c => c.personId === me.personId && c.slug === d.id && c.version >= d.version))
  if (!pending.length) return <>{children}</>
  async function accept() {
    try { for (const d of pending) await cons.save({ id: `${me.personId}:${d.id}:${d.version}`, householdId: h.id, personId: me.personId, slug: d.id, version: d.version, at: new Date().toISOString() }) }
    catch { setErr('Could not save your acceptance. Try again.') }
  }
  return (
    <div className="panel mx-auto max-w-lg space-y-3 p-6" role="dialog" aria-label="Review and accept">
      <h1 className="font-display text-2xl font-bold">{t('Before you continue')}</h1>
      <p className="text-sm text-mute">{me.name.split(' ')[0]}, please read and accept the following. We ask again only when they change.</p>
      <ul className="list-disc pl-5 text-sm">{pending.map(d => <li key={d.id}><Link className="underline" to={`/legal/${d.id}`} target="_blank">{d.title}</Link> (version {d.version})</li>)}</ul>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={ok} onChange={e => setOk(e.target.checked)} />{t('I have read and agree to the documents above.')}</label>
      {err && <p role="alert" className="text-sm text-crane">{err}</p>}
      <button className="btn-primary" disabled={!ok} aria-disabled={!ok} onClick={() => ok && void accept()}>{t('Accept and continue')}</button>
    </div>
  )
}
