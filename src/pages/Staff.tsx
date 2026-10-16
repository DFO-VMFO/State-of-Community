import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { allRoles, areaLabel, can, navAreas, roleInfo, type Area } from '../lib/roles'
import { useStaff } from '../lib/staff'
import { supabase } from '../lib/supabase'
import type { Role } from '../lib/types'

export default function Staff() {
  const { session } = useAuth(); const { items, save, remove } = useStaff()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState<Role>('support'); const [confirm, setConfirm] = useState<string | null>(null); const [err, setErr] = useState('')
  const me = session?.kind === 'staff' ? session.email.toLowerCase() : ''
  const ops = items.filter(s => s.role === 'ops')
  const areas = [...navAreas.filter(a => a !== 'staff'), 'staff', 'delete'] as Area[]

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (items.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) return setErr('That email already has access. Change their role in the table instead.')
    await save({ id: email.trim().toLowerCase(), email: email.trim().toLowerCase(), name: name.trim(), role }); setName(''); setEmail('')
  }
  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl font-bold">Staff and roles</h1>
        <p className="max-w-2xl text-mute">Each person sees only the parts of the app their job needs. {supabase ? 'People sign in with an email link sent to the address below.' : 'Demo mode: staff here are samples.'}</p></div>
      <div className="panel overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-field text-mute"><tr><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Role</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-line">
          {items.map(s => { const self = s.email.toLowerCase() === me; const lastOps = s.role === 'ops' && ops.length <= 1; return (
            <tr key={s.id}><td className="p-3 font-medium">{s.name || '–'}{self && <span className="ml-2 text-xs text-mute">(you)</span>}</td><td className="p-3">{s.email}</td>
              <td className="p-3"><select aria-label={`Role for ${s.email}`} className="input w-56 py-1" value={s.role} disabled={lastOps} onChange={e => void save({ ...s, role: e.target.value as Role })}>{allRoles.map(r => <option key={r} value={r}>{roleInfo[r].label}</option>)}</select></td>
              <td className="whitespace-nowrap p-3 text-right">{lastOps || self ? <span className="text-xs text-mute">{self ? 'Cannot remove yourself' : 'Last operations lead'}</span>
                : confirm === s.id ? (<><button className="mr-2 font-semibold text-crane underline" onClick={() => { void remove(s.id); setConfirm(null) }}>Remove access</button><button className="underline" onClick={() => setConfirm(null)}>Keep</button></>)
                  : <button className="text-crane underline" onClick={() => setConfirm(s.id)}>Remove</button>}</td></tr>) })}
        </tbody></table></div>
      <form onSubmit={add} className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-40 flex-1"><label className="label" htmlFor="sn">Name</label><input id="sn" className="input" required value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="min-w-48 flex-1"><label className="label" htmlFor="se">Email</label><input id="se" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="sr">Role</label><select id="sr" className="input" value={role} onChange={e => setRole(e.target.value as Role)}>{allRoles.map(r => <option key={r} value={r}>{roleInfo[r].label}</option>)}</select></div>
        <button className="btn-primary">Add staff member</button>{err && <p role="alert" className="w-full text-sm text-crane">{err}</p>}
      </form>
      <section className="panel overflow-x-auto p-4" aria-label="What each role can open"><h2 className="font-display text-xl font-semibold">What each role can open</h2>
        <table className="mt-3 w-full text-left text-sm"><thead><tr><th className="py-2 pr-4 font-medium text-mute">Area</th>{allRoles.map(r => <th key={r} className="px-2 py-2 text-center font-medium">{roleInfo[r].label}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{areas.map(a => <tr key={a}><td className="py-1.5 pr-4">{areaLabel[a]}</td>{allRoles.map(r => <td key={r} className="px-2 py-1.5 text-center">{can(r, a) ? <span className="font-semibold text-forest" aria-label="Allowed">Yes</span> : <span className="text-mute" aria-label="Not allowed">–</span>}</td>)}</tr>)}</tbody></table>
        <p className="mt-2 text-xs text-mute">Members sign in to a separate portal and see only their own household.</p></section>
    </div>
  )
}
