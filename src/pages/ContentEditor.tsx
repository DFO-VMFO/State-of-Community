import { useState } from 'react'
import Markdown from '../components/Markdown'
import { useAuth } from '../lib/auth'
import { useCollection } from '../lib/collections'
import { useContent } from '../lib/content'
import type { ContentDoc, ContentHistory } from '../lib/types'

const canEdit = (role: string, d: ContentDoc) => role === 'ops' || (role === 'support' && d.kind === 'page')

export default function ContentEditor() {
  const { session } = useAuth(); const s = session?.kind === 'staff' ? session : null; const role = s?.role ?? 'support'; const email = s?.email ?? ''
  const { items, save, vars } = useContent(); const hist = useCollection<ContentHistory>('content_history', () => [])
  const [sel, setSel] = useState<string>('about'); const d = items.find(x => x.id === sel)
  const [title, setTitle] = useState(''); const [intro, setIntro] = useState(''); const [body, setBody] = useState(''); const [loaded, setLoaded] = useState(''); const [prev, setPrev] = useState(false)
  const [reviewer, setReviewer] = useState(''); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  if (d && loaded !== d.id + d.version) { setLoaded(d.id + d.version); setTitle(d.title); setIntro(d.intro ?? ''); setBody(d.body); setReviewer(d.reviewedBy ?? '') }
  const dirty = !!d && (title !== d.title || intro !== (d.intro ?? '') || body !== d.body)
  const mine = hist.items.filter(h => h.slug === sel).sort((a, b) => b.version - a.version)
  const groups: [string, ContentDoc[]][] = [['Pages', items.filter(x => x.kind === 'page')], ['Legal documents', items.filter(x => x.kind === 'legal')], ['Settings', items.filter(x => x.kind === 'settings')]]

  async function publish() {
    if (!d) return
    if (d.kind === 'legal' && !reviewer.trim() && dirty) return setMsg({ ok: false, t: 'Enter who reviewed this legal text (for example, your attorney) before publishing, or leave the old version in place.' })
    try {
      await hist.save({ id: `${d.id}@${d.version}`, slug: d.id, version: d.version, title: d.title, intro: d.intro, body: d.body, updatedBy: d.updatedBy, updatedAt: d.updatedAt })
      await save({ ...d, title: title.trim() || d.title, intro: intro.trim() || undefined, body, version: d.version + 1, reviewedBy: d.kind === 'legal' ? reviewer.trim() || undefined : undefined, updatedBy: email, updatedAt: new Date().toISOString() })
      setMsg({ ok: true, t: d.kind === 'legal' ? `Published version ${d.version + 1}. Members are asked to accept the new Terms or Privacy Policy when they next sign in.` : `Published version ${d.version + 1}.` })
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }) }
  }
  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl font-bold">Content</h1><p className="max-w-3xl text-mute">Edit the About us page and the legal documents without a code change. Every save keeps the previous version. Legal text should be reviewed by an attorney before you publish it: until a reviewer is named, members see a “draft” notice on it.</p></div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md p-2 text-sm font-medium ${msg.ok ? 'bg-forest-100' : 'border border-crane bg-white text-crane'}`}>{msg.t}</p>}
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Documents" className="space-y-3">{groups.map(([g, ds]) => <div key={g}><p className="text-xs font-bold uppercase text-mute">{g}</p><ul>{ds.map(x => <li key={x.id}><button onClick={() => { setSel(x.id); setMsg(null) }} aria-current={sel === x.id} className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${sel === x.id ? 'bg-forest text-white' : 'hover:bg-white'}`}>{x.title.length > 34 ? x.title.slice(0, 32) + '…' : x.title}<span className="block text-[11px] opacity-70">v{x.version}{x.kind === 'legal' && !x.reviewedBy ? ' · not reviewed' : ''}</span></button></li>)}</ul></div>)}</nav>
        {d && <section className="panel space-y-3 p-4" aria-label="Editor">
          {!canEdit(role, d) && <p className="rounded-md bg-field p-2 text-sm">You can read this but not change it. Ask an operations lead.</p>}
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="ct">Title</label><input id="ct" className="input" disabled={!canEdit(role, d)} value={title} onChange={e => setTitle(e.target.value)} /></div>
            {d.kind !== 'settings' && <div><label className="label" htmlFor="ci">Short summary</label><input id="ci" className="input" disabled={!canEdit(role, d)} value={intro} onChange={e => setIntro(e.target.value)} /></div>}</div>
          <div><div className="flex items-center justify-between"><label className="label" htmlFor="cb">Text</label><button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setPrev(p => !p)}>{prev ? 'Edit' : 'Preview'}</button></div>
            {prev ? <div className="rounded-md border border-line bg-white p-3"><Markdown text={body} vars={vars} /></div> : <textarea id="cb" className="input h-96 font-mono text-sm" disabled={!canEdit(role, d)} value={body} onChange={e => setBody(e.target.value)} />}
            <p className="text-xs text-mute">Use # and ## for headings, - for bullets, **bold**, and [text](https://link). {d.kind === 'legal' ? 'Words like {{legal_name}} fill in from Organization details.' : ''}</p></div>
          {d.kind === 'legal' && canEdit(role, d) && <div><label className="label" htmlFor="cr">Reviewed by (attorney or firm)</label><input id="cr" className="input max-w-sm" value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Required when you change legal text" /></div>}
          {canEdit(role, d) && <div className="flex items-center gap-3"><button className="btn-primary" disabled={!dirty && !(d.kind === 'legal' && reviewer !== (d.reviewedBy ?? ''))} onClick={() => void publish()}>Publish version {d.version + 1}</button>{dirty && <button className="btn-ghost" onClick={() => { setTitle(d.title); setIntro(d.intro ?? ''); setBody(d.body) }}>Discard changes</button>}</div>}
          <details><summary className="cursor-pointer text-sm font-medium">Version history ({mine.length})</summary>
            <ul className="mt-2 divide-y divide-line text-sm">{mine.map(h => <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>v{h.version} · {h.updatedAt.slice(0, 10)} · {h.updatedBy}</span>{canEdit(role, d) && <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => { setTitle(h.title); setIntro(h.intro ?? ''); setBody(h.body); setMsg({ ok: true, t: `Loaded version ${h.version} into the editor. Publish to make it current.` }) }}>Load into editor</button>}</li>)}{!mine.length && <li className="py-2 text-mute">No earlier versions yet.</li>}</ul></details>
        </section>}
      </div>
    </div>
  )
}
