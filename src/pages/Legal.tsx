import { Link, useParams } from 'react-router-dom'
import Markdown from '../components/Markdown'
import { legalSlugs, useContent } from '../lib/content'
import { edition } from '../lib/edition'

export function LegalLinks({ className = '' }: { className?: string }) {
  return <p className={`text-xs text-mute ${className}`}>{(['privacy', 'terms', 'guidelines', 'messaging'] as const).map((s, i) => <span key={s}>{i > 0 && ' · '}<Link className="underline" to={`/legal/${s}`}>{{ privacy: 'Privacy', terms: 'Terms', guidelines: 'Guidelines', messaging: 'Messaging' }[s]}</Link></span>)}</p>
}

export default function Legal() {
  const { slug } = useParams(); const { byId, vars, loading } = useContent(); const d = slug ? byId(slug) : undefined
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-4 text-sm"><Link className="underline" to="/">← {edition.name}</Link></p>
      {loading ? <p className="text-mute">Loading…</p> : !d || d.kind === 'settings' ? (
        <div className="panel space-y-2 p-5"><h1 className="font-display text-2xl font-bold">Our policies</h1><ul className="list-disc pl-6">{legalSlugs.map(s => { const x = byId(s); return x ? <li key={s}><Link className="underline" to={`/legal/${s}`}>{x.title}</Link></li> : null })}</ul></div>
      ) : (
        <article className="panel space-y-3 p-5 sm:p-8">
          {d.kind === 'legal' && !d.reviewedBy && <p role="note" className="rounded-md bg-sun-100 p-2 text-sm font-medium">Draft: this document is waiting for review by our attorney and is not final.</p>}
          <h1 className="font-display text-3xl font-bold">{d.title}</h1>
          <p className="text-xs text-mute">Version {d.version} · updated {d.updatedAt.slice(0, 10)}{d.reviewedBy ? ` · reviewed by ${d.reviewedBy}` : ''}</p>
          <Markdown text={d.body.replace(/^# .*\n/, '')} vars={vars} />
        </article>)}
    </div>
  )
}
