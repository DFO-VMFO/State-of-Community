import type { ReactNode } from 'react'

export function Field({ label, children, id, hint }: { label: string; children: ReactNode; id: string; hint?: string }) {
  return <div><label className="label" htmlFor={id}>{label}</label>{children}{hint && <p className="mt-1 text-xs text-mute">{hint}</p>}</div>
}
export function Sel<T extends string>({ id, value, onChange, options }: { id: string; value: T; onChange: (v: T) => void; options: readonly (readonly [string, string])[] | readonly string[] }) {
  return (
    <select id={id} className="input" value={value} onChange={e => onChange(e.target.value as T)}>
      {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o[0]} value={o[0]}>{o[1]}</option>)}
    </select>
  )
}
