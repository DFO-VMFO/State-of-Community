import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { seedHouseholds, seedPool } from './seed'
import type { Answers, Household, PoolEntry, Submission } from './types'

// Local mode (no env vars): data lives in this browser, seeded with demo households.
// Cloud mode (VITE_SUPABASE_URL set): data lives in Supabase tables from supabase/schema.sql.
const LS_H = 'soc.households.v1', LS_P = 'soc.pool.v1'
const read = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage blocked */ } }

export async function loadHouseholds(): Promise<Household[]> {
  if (supabase) {
    const { data, error } = await supabase.from('soc_households').select('data')
    if (error) throw error
    return (data ?? []).map(r => r.data as Household)
  }
  const stored = read<Household[] | null>(LS_H, null)
  if (stored) return stored
  const seeded = seedHouseholds(); write(LS_H, seeded); return seeded
}

export async function saveHousehold(h: Household): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('soc_households').upsert({ id: h.id, member_code: h.memberCode, status: h.status, tier: h.tier, data: h })
    if (error) throw error
    return
  }
  const all = read<Household[]>(LS_H, []); const i = all.findIndex(x => x.id === h.id)
  if (i >= 0) all[i] = h; else all.push(h); write(LS_H, all)
}

export async function deleteHousehold(id: string): Promise<void> {
  if (supabase) { const { error } = await supabase.from('soc_households').delete().eq('id', id); if (error) throw error; return }
  write(LS_H, read<Household[]>(LS_H, []).filter(x => x.id !== id))
}

export async function loadPool(): Promise<PoolEntry[]> {
  if (supabase) {
    const { data, error } = await supabase.from('soc_pool_entries').select('*').order('date')
    if (error) throw error
    return (data ?? []).map(r => ({ id: r.id, date: r.date, kind: r.kind, amount: Number(r.amount), note: r.note ?? '' }))
  }
  const stored = read<PoolEntry[] | null>(LS_P, null)
  if (stored) return stored
  const seeded = seedPool(); write(LS_P, seeded); return seeded
}

export async function addPoolEntry(e: PoolEntry): Promise<void> {
  if (supabase) { const { error } = await supabase.from('soc_pool_entries').insert({ date: e.date, kind: e.kind, amount: e.amount, note: e.note }); if (error) throw error; return }
  write(LS_P, [...(read<PoolEntry[] | null>(LS_P, null) ?? seedPool()), e])
}

// Public verification: returns only non-sensitive fields.
export interface Verified { memberCode: string; initials: string; tier: string; status: string; since: string }
export async function verifyMember(code: string): Promise<Verified | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc('soc_verify_member', { code })
    if (error || !data || !data.length) return null
    const r = data[0]; return { memberCode: r.member_code, initials: r.initials, tier: r.tier, status: r.status, since: r.since }
  }
  const h = read<Household[]>(LS_H, []).find(x => x.memberCode.toLowerCase() === code.toLowerCase())
  return h ? { memberCode: h.memberCode, initials: initials(h.headName), tier: h.tier, status: h.status, since: h.joinedAt } : null
}
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).map(p => p[0]!.toUpperCase()).slice(0, 2).join('') || '?'

export function useData(dep?: string) {
  const [households, setHouseholds] = useState<Household[] | null>(null)
  const [pool, setPool] = useState<PoolEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setHouseholds(await loadHouseholds()); setPool(await loadPool()); setError(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load data') }
  }, [])
  useEffect(() => { void refresh() }, [refresh, dep])
  return { households, pool, error, refresh }
}

// Public survey: anonymous visitors can only add a submission; staff review it before it becomes a household.
export async function submitSurvey(answers: Answers): Promise<void> {
  const sub: Submission = { id: crypto.randomUUID(), submittedAt: new Date().toISOString(), status: 'new', answers }
  if (supabase) { const { error } = await supabase.from('soc_records').insert({ collection: 'submissions', id: sub.id, data: sub }); if (error) throw error; return }
  write('soc.submissions.v1', [...read<Submission[]>('soc.submissions.v1', []), sub])
}

// Members can change only their own contact preferences.
export async function updateMyContact(h: Household, phone: string, whatsappOptIn: boolean): Promise<void> {
  if (supabase) { const { error } = await supabase.rpc('soc_update_my_contact', { p_phone: phone, p_opt: whatsappOptIn }); if (error) throw error; return }
  await saveHousehold({ ...h, phone, whatsappOptIn })
}
