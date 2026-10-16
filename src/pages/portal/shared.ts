import type { Household, Goal } from '../../lib/types'
export type Tab = 'home' | 'services' | 'goals' | 'events' | 'clubs' | 'toolkit' | 'account' | 'about'
export interface PortalProps { h: Household; go: (t: Tab, opts?: { cat?: string }) => void }
export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
export const goalPct = (g: Goal) => g.target === g.start ? 0 : Math.max(0, Math.min(1, (g.current - g.start) / (g.target - g.start)))
export const fmtGoal = (g: Goal, v: number) => g.unit === 'usd' ? money(v) : `${v}${g.label ? ' ' + g.label.replace(/^steps /, '') : ''}`
export const longDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const clock = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}` }
export const embedded = typeof window !== 'undefined' && window.self !== window.top
export const daysUntil = (d: string) => Math.ceil((new Date(d + 'T12:00:00').getTime() - Date.now()) / 86400000)
