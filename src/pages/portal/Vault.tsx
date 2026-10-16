import { useState } from 'react'
import { useCollection } from '../../lib/collections'
import { ownerOf, useMe } from '../../lib/me'
import type { VaultContact, VaultItem } from '../../lib/types'
import { daysUntil, longDate, type PortalProps } from './shared'

// Standard papers every family should be able to find in a hurry. We store where things are, not the documents.
export const vaultKinds = ['Will or trust', 'Power of attorney', 'Life insurance policy', 'Health insurance card', 'Passports', 'Birth and marriage certificates', 'Immigration papers (green card, visa, naturalization)', 'Social Security cards', 'Land title or deed (U.S.)', 'Land title or deed (home country)', 'Bank and retirement accounts list', 'Car title and insurance', 'Tax returns (last 3 years)']
const expiryKinds = new Set(['Passports', 'Immigration papers (green card, visa, naturalization)', 'Health insurance card', 'Car title and insurance', 'Life insurance policy'])

export default function Vault({ h }: Pick<PortalProps, 'h'>) {
  const items = useCollection<VaultItem>('vault', () => []); const cts = useCollection<VaultContact>('vault_contacts', () => [])
  const me = useMe()
  const mine = items.items.filter(i => i.householdId === h.id && ownerOf(i) === me.personId); const contact = cts.items.find(c => c.householdId === h.id && ownerOf(c) === me.personId)
  const [edit, setEdit] = useState<string | null>(null); const [f, setF] = useState<Partial<VaultItem>>({}); const [cf, setCf] = useState({ name: '', relationship: '', phone: '' }); const [editC, setEditC] = useState(false); const [msg, setMsg] = useState('')
  const [custom, setCustom] = useState(''); const [shown, setShown] = useState(false)
  const kinds = [...vaultKinds, ...mine.map(i => i.kind).filter(k => !vaultKinds.includes(k))]
  const of = (k: string) => mine.find(i => i.kind === k)
  const have = mine.filter(i => i.have).length
  async function save() { if (!edit) return; const cur = of(edit); try { await items.save({ id: cur?.id ?? crypto.randomUUID(), householdId: h.id, personId: me.personId, kind: edit, have: f.have ?? true, where: (f.where ?? '').trim(), copyWith: f.copyWith?.trim() || undefined, expires: f.expires || undefined, note: f.note?.trim() || undefined }); setEdit(null); setF({}) } catch (e) { setMsg((e as Error).message) } }
  const summary = [`If something happens: ${h.headName}'s family papers`, ...kinds.map(k => { const i = of(k); return i?.have ? `- ${k}: ${i.where || 'location not written down'}${i.copyWith ? ` (copy with ${i.copyWith})` : ''}` : null }).filter(Boolean) as string[], contact ? `Call first: ${contact.name} (${contact.relationship}) ${contact.phone}` : ''].filter(Boolean).join('\n')
  return (
    <section id="vault" className="space-y-3" aria-label="Family document vault">
      <h2 className="font-display text-2xl font-semibold">Family document vault</h2>
      <p className="text-sm text-mute">A private checklist of where your important papers are. <b>We do not store the documents themselves</b>, only notes like “fireproof box, bedroom closet”. Staff cannot see this. Never type account numbers or passwords here.</p>
      <div className="panel p-3 text-sm"><b>{have} of {kinds.length}</b> papers located. <span className="text-mute">Tap a row to fill it in. An expiry date is optional and shows a warning when it is near.</span></div>
      {msg && <p role="alert" className="rounded-md border border-crane bg-white p-2 text-sm text-crane">{msg}</p>}
      <ul className="space-y-2">{kinds.map(k => { const i = of(k); const d = i?.expires ? daysUntil(i.expires) : null; const open = edit === k; return (
        <li key={k} className="panel p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-medium"><span aria-hidden>{i?.have ? '✓ ' : '○ '}</span>{k}</p>
              <p className="text-sm text-mute">{i?.have ? <>{i.where || 'Location not written down'}{i.copyWith ? ` · copy with ${i.copyWith}` : ''}{i.expires ? ` · expires ${longDate(i.expires)}` : ''}</> : i ? 'Marked as not available yet' : 'Not filled in'}</p></div>
            <div className="flex items-center gap-2">{d !== null && d <= 90 && <span className="rounded-full bg-crane px-2.5 py-0.5 text-xs font-bold text-white">{d < 0 ? 'Expired' : `Expires in ${d} days`}</span>}
              <button className="btn-ghost" aria-expanded={open} onClick={() => { setEdit(open ? null : k); setF(i ?? { have: true }) }}>{open ? 'Close' : i ? 'Edit' : 'Fill in'}</button></div></div>
          {open && <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void save() }}>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.have ?? true} onChange={e => setF({ ...f, have: e.target.checked })} />I have this</label>
            <div><label className="label" htmlFor="vw">Where the original is kept</label><input id="vw" className="input" placeholder="e.g. Fireproof box, bedroom closet" value={f.where ?? ''} onChange={e => setF({ ...f, where: e.target.value })} /></div>
            <div><label className="label" htmlFor="vc">Who has a copy</label><input id="vc" className="input" placeholder="e.g. my attorney, my sister" value={f.copyWith ?? ''} onChange={e => setF({ ...f, copyWith: e.target.value })} /></div>
            {expiryKinds.has(k) && <div><label className="label" htmlFor="ve">Expires</label><input id="ve" type="date" className="input" value={f.expires ?? ''} onChange={e => setF({ ...f, expires: e.target.value })} /></div>}
            <div className={expiryKinds.has(k) ? '' : 'sm:col-span-1'}><label className="label" htmlFor="vn">Note (optional)</label><input id="vn" className="input" value={f.note ?? ''} onChange={e => setF({ ...f, note: e.target.value })} /></div>
            <div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Save</button>{i && <button type="button" className="btn-ghost text-crane" onClick={() => void items.remove(i.id).then(() => setEdit(null))}>Clear this row</button>}</div></form>}
        </li>) })}</ul>
      <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); const k = custom.trim(); if (!k || kinds.includes(k)) return; void items.save({ id: crypto.randomUUID(), householdId: h.id, personId: me.personId, kind: k, have: false, where: '' }).then(() => { setCustom(''); setEdit(k); setF({ have: true }) }) }}>
        <div><label className="label" htmlFor="vk">Add another kind of paper</label><input id="vk" className="input w-72" value={custom} onChange={e => setCustom(e.target.value)} /></div><button className="btn-ghost">Add</button></form>

      <div className="panel space-y-2 p-4"><h3 className="font-display text-lg font-semibold">If something happens</h3>
        <p className="text-sm text-mute">One person who knows where everything is, and a page they can use. Tell them this page exists and give them a printed copy.</p>
        {contact && !editC ? <p className="text-sm"><b>{contact.name}</b> ({contact.relationship}) · {contact.phone} <button className="ml-2 underline" onClick={() => { setCf({ name: contact.name, relationship: contact.relationship, phone: contact.phone }); setEditC(true) }}>Change</button></p>
          : <form className="grid gap-2 sm:grid-cols-4 sm:items-end" onSubmit={e => { e.preventDefault(); if (!cf.name.trim()) return; void cts.save({ id: contact?.id ?? crypto.randomUUID(), householdId: h.id, personId: me.personId, name: cf.name.trim(), relationship: cf.relationship.trim(), phone: cf.phone.trim() }).then(() => setEditC(false)) }}>
            <div><label className="label" htmlFor="cn1">Trusted person</label><input id="cn1" className="input" value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="cr1">Relationship</label><input id="cr1" className="input" value={cf.relationship} onChange={e => setCf({ ...cf, relationship: e.target.value })} /></div>
            <div><label className="label" htmlFor="cp1">Phone</label><input id="cp1" className="input" value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} /></div>
            <button className="btn-primary">Save</button></form>}
        <button className="btn-ghost" aria-expanded={shown} onClick={() => setShown(x => !x)}>{shown ? 'Hide' : 'Show'} the page to share</button>
        {shown && <><textarea readOnly aria-label="Page to share" className="input h-40 font-mono text-xs" value={summary} />
          <button className="btn-ghost" onClick={() => void navigator.clipboard?.writeText(summary).then(() => setMsg('')).catch(() => setMsg('Select the text and copy it.'))}>Copy</button></>}
        <p className="text-xs text-mute">This is a locator, not legal advice. A will or power of attorney only works if it is properly signed: talk to an attorney.</p></div>
    </section>
  )
}
