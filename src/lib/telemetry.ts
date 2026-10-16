import { supabase } from './supabase'
import { rng, seedHouseholds } from './seed'
import { services } from './edition'
import type { Telemetry } from './types'

// Product analytics. Records which screens are used and for how long, never what a member typed or uploaded.
// Members can turn it off in Account. Staff see only totals and household codes, never papers or answers.
const DAY = 86400000
const OFF = (pid: string) => `soc.notrack.${pid}`
export const trackingOff = (pid: string) => { try { return localStorage.getItem(OFF(pid)) === '1' } catch { return false } }
export const setTrackingOff = (pid: string, off: boolean) => { try { off ? localStorage.setItem(OFF(pid), '1') : localStorage.removeItem(OFF(pid)) } catch { /* blocked */ } }

export async function track(e: Omit<Telemetry, 'id' | 'at'>) {
  if (trackingOff(e.personId)) return
  const row: Telemetry = { ...e, id: crypto.randomUUID(), at: new Date().toISOString() }
  try {
    if (supabase) { await supabase.from('soc_records').insert({ collection: 'telemetry', id: row.id, data: row }); return }
    const k = 'soc.telemetry.v1'; const cur = JSON.parse(localStorage.getItem(k) ?? 'null') as Telemetry[] | null ?? seedTelemetry()
    cur.push(row); localStorage.setItem(k, JSON.stringify(cur.slice(-6000)))
  } catch { /* analytics must never break the app */ }
}

const screens = ['home', 'services', 'goals', 'events', 'clubs', 'toolkit', 'account', 'about']
export function seedTelemetry(): Telemetry[] {
  const r = rng(99); const out: Telemetry[] = []; const hh = seedHouseholds(42).filter(h => h.status === 'active')
  hh.forEach((h, hi) => {
    const joined = Math.max(0, Math.floor((Date.now() - Date.parse(h.joinedAt)) / DAY))
    const habit = r() // 0..1: how engaged this household is
    const dropAt = habit < 0.25 ? Math.floor(r() * 40) : 999 // some households fade out
    for (let d = Math.min(89, joined); d >= 0; d--) {
      if (joined - d > dropAt) break
      if (r() > 0.04 + habit * 0.3) continue
      const day = Date.now() - d * DAY; const pid = `p-${h.id}`
      const push = (type: Telemetry['type'], screen: string, ms?: number, ref?: string) => out.push({ id: `t${out.length}`, at: new Date(day + Math.floor(r() * 12 * 3600000)).toISOString(), householdId: h.id, personId: pid, type, screen, ms, ref })
      push('login', 'login')
      const n = 1 + Math.floor(r() * 4)
      for (let k = 0; k < n; k++) { const s = screens[Math.floor(Math.pow(r(), 1.6) * screens.length)]; push('view', s, Math.floor(15000 + r() * (s === 'toolkit' ? 240000 : s === 'services' ? 150000 : 70000))) }
      if (r() < 0.06 + habit * 0.05) push('vote', 'services', undefined, services[(hi + d) % services.length].id)
    }
  })
  return out.sort((a, b) => a.at.localeCompare(b.at)).map((e, i) => ({ ...e, id: `t${i}` }))
}
