import type { AssetType, FundPayout, FundPolicy, Holding, NavPoint, Trade } from './types'

export const FUND_NAME = 'Sample Community Fund, LLC (illustration)'
export const assetTypes: AssetType[] = ['Stock or ETF', 'Bond or Treasury fund', 'Real estate', 'Cash']
const ymBack = (n: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7) }
const dayBack = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)

export const seedPolicy = (): FundPolicy[] => [{ id: 'policy', mission: 'Grow a pool of capital that, over time, pays for the services our community uses, while protecting the principal. Returns, not principal, fund services.', payoutPct: 4, maxSinglePct: 25, minCashPct: 5, committee: 'Board treasurer, operations lead and one elected member', updatedBy: 'board@example.org', updatedAt: dayBack(120) + 'T12:00:00Z' }]
export const seedHoldings = (): Holding[] => [
  { id: 'h1', name: 'Total market index fund (sample)', type: 'Stock or ETF', cost: 20000, value: 22400, asOf: dayBack(2), active: true },
  { id: 'h2', name: 'Dividend ETF (sample)', type: 'Stock or ETF', cost: 8000, value: 8500, asOf: dayBack(2), active: true },
  { id: 'h3', name: 'Short-term Treasury fund (sample)', type: 'Bond or Treasury fund', cost: 8000, value: 8100, asOf: dayBack(2), active: true },
  { id: 'h4', name: 'Small rental property share (sample)', type: 'Real estate', cost: 12000, value: 12500, asOf: dayBack(40), note: 'Value from the latest appraisal', active: true },
  { id: 'h5', name: 'Cash', type: 'Cash', cost: 7000, value: 7000, asOf: dayBack(2), active: true },
]
export const seedNav = (): NavPoint[] => {
  const g = [0, 0.8, 1.5, 1.1, 2.4, 3.0, 3.9, 3.5, 4.8, 5.6, 6.0]
  return [...g.map((x, i) => { const c = i < 6 ? 50000 : 55000; return { id: ymBack(11 - i), value: Math.round(c * (1 + x / 100)), contributed: c, by: 'board@example.org' } }), { id: ymBack(0), value: 58500, contributed: 55000, by: 'board@example.org' }]
}
export const seedTrades = (): Trade[] => [
  { id: 't1', date: dayBack(70), action: 'buy', asset: 'Dividend ETF (sample)', type: 'Stock or ETF', amount: 3000, rationale: 'Steady income to support the payout.', status: 'executed', proposedBy: 'ops@example.org', approvedBy: 'board@example.org', executedBy: 'ops@example.org', executedAt: dayBack(68) + 'T12:00:00Z' },
  { id: 't2', date: dayBack(1), action: 'buy', asset: 'Total market index fund (sample)', type: 'Stock or ETF', amount: 2000, rationale: 'Add monthly to the core holding.', status: 'proposed', proposedBy: 'ops@example.org' },
]
export const seedPayouts = (): FundPayout[] => [{ id: 'po1', date: dayBack(60), amount: 200, purpose: 'Spring mixer: venue and food', approvedBy: 'board@example.org' }]

export const total = (hs: Holding[]) => hs.filter(h => h.active).reduce((a, h) => a + h.value, 0)
export const allocation = (hs: Holding[]) => { const t = total(hs) || 1; return assetTypes.map(type => ({ type, pct: (hs.filter(h => h.active && h.type === type).reduce((a, h) => a + h.value, 0) / t) * 100 })).filter(a => a.pct > 0) }
// How big the fund must be to cover a year of services at the policy payout rate.
export const targetSize = (servicesPerYear: number, payoutPct: number) => payoutPct > 0 ? servicesPerYear / (payoutPct / 100) : 0

export function policyChecks(hs: Holding[], p: FundPolicy): { ok: boolean; text: string }[] {
  const t = total(hs) || 1; const act = hs.filter(h => h.active); const out: { ok: boolean; text: string }[] = []
  const big = act.filter(h => h.type !== 'Cash' && (h.value / t) * 100 > p.maxSinglePct)
  out.push(big.length ? { ok: false, text: `${big.map(h => h.name).join(', ')} is over the ${p.maxSinglePct}% single-holding limit.` } : { ok: true, text: `No holding is over ${p.maxSinglePct}% of the fund.` })
  const cash = (act.filter(h => h.type === 'Cash').reduce((a, h) => a + h.value, 0) / t) * 100
  out.push(cash < p.minCashPct ? { ok: false, text: `Cash is ${cash.toFixed(1)}%, under the ${p.minCashPct}% minimum.` } : { ok: true, text: `Cash is ${cash.toFixed(1)}%, above the ${p.minCashPct}% minimum.` })
  const rp = act.filter(h => h.relatedParty)
  out.push(rp.length ? { ok: false, text: `${rp.length} holding${rp.length > 1 ? 's' : ''} involve${rp.length > 1 ? '' : 's'} a related party (${rp.map(h => h.relatedParty).join(', ')}). Disclosed to members.` } : { ok: true, text: 'No holdings involve a related party.' })
  return out
}

// A trade is proposed by one person, approved by the board (never the proposer), then recorded as executed.
export function tradeBlock(t: Trade, action: 'approve' | 'execute', role: string, email: string): string | null {
  if (action === 'approve') {
    if (t.status !== 'proposed') return 'Only proposed trades can be approved.'
    if (role !== 'board') return 'Only the board treasurer approves trades.'
    if (t.proposedBy.toLowerCase() === email.toLowerCase()) return 'You proposed this trade, so someone else must approve it.'
    return null
  }
  if (t.status !== 'approved') return 'Only approved trades can be recorded as executed.'
  if (role !== 'ops' && role !== 'board') return 'Only the operations lead or the board records execution.'
  return null
}
