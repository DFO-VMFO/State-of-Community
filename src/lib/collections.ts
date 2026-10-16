import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Generic records store for tickets, partners, broadcasts, payments and checklist gates.
// Local mode: browser storage. Cloud mode: the `records` table (see supabase/schema.sql).
const key = (n: string) => `soc.${n}.v1`
const readLocal = <T,>(n: string): T[] | null => { try { const v = localStorage.getItem(key(n)); return v ? JSON.parse(v) : null } catch { return null } }
const writeLocal = (n: string, v: unknown) => { try { localStorage.setItem(key(n), JSON.stringify(v)) } catch { /* storage blocked */ } }

export function useCollection<T extends { id: string }>(name: string, seed: () => T[], mergeNew = false) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    if (supabase) {
      const { data } = await supabase.from('soc_records').select('data').eq('collection', name)
      setItems((data ?? []).map(r => r.data as T))
    } else {
      let v = readLocal<T>(name); if (!v) { v = seed(); writeLocal(name, v) }
      else if (mergeNew) { const have = new Set(v.map(x => x.id)); const add = seed().filter(x => !have.has(x.id)); // A feature that shipped since this browser last loaded: replace its old "vote for it" card with the live one.
        const sd = seed() as unknown as { id: string; status?: string }[]; let changed = add.length > 0
        v = v.map(x => { const o = x as unknown as { id: string; status?: string }; const n = sd.find(y => y.id === o.id); if (n && o.status === 'interest' && n.status === 'live') { changed = true; return n as unknown as T } return x })
        if (changed) { v = [...v, ...add]; writeLocal(name, v) } }
      setItems(v)
    }
    setLoading(false)
  }, [name]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void reload() }, [reload])

  const save = useCallback(async (item: T) => {
    if (supabase) { const { error } = await supabase.from('soc_records').upsert({ collection: name, id: item.id, data: item }); if (error) throw new Error(error.message) }
    else { const all = readLocal<T>(name) ?? []; const i = all.findIndex(x => x.id === item.id); if (i >= 0) all[i] = item; else all.push(item); writeLocal(name, all) }
    setItems(prev => { const i = prev.findIndex(x => x.id === item.id); return i >= 0 ? prev.map(x => x.id === item.id ? item : x) : [...prev, item] })
  }, [name])
  const remove = useCallback(async (id: string) => {
    if (supabase) { const { error } = await supabase.from('soc_records').delete().eq('collection', name).eq('id', id); if (error) throw new Error(error.message) }
    else writeLocal(name, (readLocal<T>(name) ?? []).filter(x => x.id !== id))
    setItems(prev => prev.filter(x => x.id !== id))
  }, [name])
  const saveMany = useCallback(async (list: T[]) => { for (const x of list) await save(x) }, [save])
  return { items, loading, save, saveMany, remove, reload }
}

// Counts per key for shared, non-identifying collections (club members, RSVPs, waitlists).
// Cloud: SECURITY DEFINER rpc (members only ever read their own rows). Local: counted from storage.
export function useCounts(name: string, field: string, seed: () => { id: string }[], dep?: unknown) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    let live = true
    void (async () => {
      const out: Record<string, number> = {}
      if (supabase) {
        const { data } = await supabase.rpc('soc_public_counts', { p_collection: name, p_field: field })
        ;(data as { k: string; n: number }[] | null)?.forEach(r => { out[r.k] = Number(r.n) })
      } else {
        let v = readLocal<Record<string, unknown>>(name); if (!v) { v = seed() as Record<string, unknown>[]; writeLocal(name, v) }
        v.forEach(x => { const k = String(x[field]); out[k] = (out[k] ?? 0) + 1 })
      }
      if (live) setCounts(out)
    })()
    return () => { live = false }
  }, [name, field, dep]) // eslint-disable-line react-hooks/exhaustive-deps
  return counts
}
