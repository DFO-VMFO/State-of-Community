import { edition, incomeBands, incomeMid, remitBands, services } from './edition'
import type { Household, Interest, SurveySection } from './types'

export interface Slice { name: string; value: number; hidden?: boolean }

// Counts per category. Any group smaller than kMin is folded into "Other (small groups)"
// so no chart can single out a few households.
export function distribution(rows: Household[], get: (h: Household) => string, order?: string[]): Slice[] {
  const counts = new Map<string, number>()
  rows.forEach(h => counts.set(get(h), (counts.get(get(h)) ?? 0) + 1))
  const keys = order ? order.filter(k => counts.has(k)) : [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!)
  const out: Slice[] = []; let small = 0
  keys.forEach(k => { const v = counts.get(k)!; if (v >= edition.kMin) out.push({ name: k, value: v }); else small += v })
  if (small) out.push({ name: 'Other (small groups)', value: small, hidden: true })
  return out
}
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

export function snapshot(all: Household[]) {
  const rows = all.filter(h => h.consentData && h.status !== 'lapsed')
  const n = rows.length
  const people = rows.reduce((a, h) => a + h.adults + h.children + h.seniors, 0)
  const owners = rows.filter(h => h.housing.startsWith('own')).length
  const ans = (s: SurveySection) => rows.filter(h => !h.skipped?.includes(s))
  const W = ans('work'), H = ans('health'), P = ans('help')
  const uninsured = H.filter(h => h.insurance === 'uninsured').length
  const noLife = H.filter(h => h.lifeInsurance !== 'yes').length
  const foreignEdu = W.filter(h => h.alignment !== 'na')
  const mismatch = foreignEdu.filter(h => h.alignment === 'underemployed' || h.alignment === 'overqualified').length
  const sorted = W.map(h => incomeMid[incomeBands.indexOf(h.incomeBand)] ?? 0).sort((a, b) => a - b)
  const medianBand = W.length ? incomeBands[Math.max(0, incomeMid.indexOf(sorted[Math.floor(W.length / 2)]))] : '–'
  const remitters = W.filter(h => h.remitBand !== remitBands[0]).length
  const dependents = rows.reduce((a, h) => a + h.children + h.seniors, 0)
  const workers = rows.reduce((a, h) => a + h.adults, 0)
  const demand = services.map(s => {
    const want = P.filter(h => (['essential', 'high'] as Interest[]).includes(h.priorities[s.id])).length
    return { id: s.id, name: s.name, pillar: s.pillar, launched: s.launched, demandPct: pct(want, P.length), households: want }
  }).sort((a, b) => b.demandPct - a.demandPct)
  const wtp = P.filter(h => h.wtpMonthly >= 10)
  return {
    n, people, kReady: n >= edition.kMin * 2,
    homeownership: pct(owners, n), uninsured: pct(uninsured, H.length), lifeGap: pct(noLife, H.length),
    mismatch: pct(mismatch, foreignEdu.length), medianBand, remitters: pct(remitters, W.length),
    homeland: pct(W.filter(h => h.homelandProperty).length, W.length),
    dependency: workers ? Math.round((dependents / workers) * 100) : 0,
    volunteers: rows.filter(h => h.volunteer).length,
    wtpPct: pct(wtp.length, P.length),
    avgWtp: wtp.length ? Math.round(wtp.reduce((a, h) => a + h.wtpMonthly, 0) / wtp.length) : 0,
    sector: distribution(W, h => h.sector),
    insurance: distribution(H, h => ({ employer: 'Employer', marketplace: 'Marketplace', public: 'Medicare/Medicaid', uninsured: 'Uninsured' }[h.insurance])),
    housing: distribution(rows, h => ({ 'own-mortgage': 'Own (mortgage)', 'own-free': 'Own (free & clear)', rent: 'Rent', family: 'With family/friends' }[h.housing])),
    generation: distribution(rows, h => ({ '1st': '1st generation', '2nd': '2nd generation', '3rd+': '3rd+ generation', ally: 'Ally' }[h.generation])),
    income: distribution(W, h => h.incomeBand, incomeBands),
    needs: distribution(P, h => h.unmetNeed),
    demand,
  }
}

export type Snapshot = ReturnType<typeof snapshot>

// Financial model from the planning doc (annual).
export function projection(p: { households: number; standardShare: number; premiumShare: number; basicPrice: number; standardPrice: number; premiumPrice: number; commissionPerHh: number; utilization: number; listings: number; listingPrice: number; sponsorships: number; fixedCosts: number; staff: number; events: number; feeRate: number }) {
  const premium = Math.round(p.households * p.premiumShare), standard = Math.round(p.households * p.standardShare)
  const basic = Math.max(0, p.households - premium - standard)
  const dues = (basic * p.basicPrice + standard * p.standardPrice + premium * p.premiumPrice) * 12
  const commissions = Math.round(p.households * p.utilization * p.commissionPerHh)
  const listings = p.listings * p.listingPrice * 12
  const revenue = dues + commissions + listings + p.sponsorships
  const fees = Math.round(revenue * p.feeRate)
  const expenses = p.fixedCosts + p.staff + p.events + fees
  return { basic, standard, premium, dues, commissions, listings, revenue, fees, expenses, noi: revenue - expenses, margin: revenue ? Math.round(((revenue - expenses) / revenue) * 100) : 0 }
}
