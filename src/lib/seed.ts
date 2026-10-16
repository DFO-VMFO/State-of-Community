import { edition, incomeBands, remitBands, services } from './edition'
import { checklists, stageOrder, trackOf } from './partners'
import type { Household, Interest, Partner, Payment, PoolEntry, StaffMember, Ticket } from './types'

// Deterministic demo data so the dashboard has something to show before real surveys arrive.
export function rng(seed: number) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296 }
export function pick<T>(r: () => number, items: readonly T[], weights?: number[]): T {
  const w = weights ?? items.map(() => 1); const t = w.reduce((a, b) => a + b, 0)
  let x = r() * t; for (let i = 0; i < items.length; i++) { x -= w[i]; if (x <= 0) return items[i] }
  return items[items.length - 1]
}
const needs = ['Bereavement costs', 'Getting my degree recognized', 'Cross-border tax help', 'Senior care', 'Business capital', 'Life insurance', 'Youth mentorship']

export function seedHouseholds(n = 42): Household[] {
  const r = rng(7)
  return Array.from({ length: n }, (_, i) => {
    const priorities: Record<string, Interest> = {}
    services.forEach(s => {
      const base = s.id === 'bereavement' ? [4, 3, 1, 0, 0] : s.id === 'credential' ? [3, 3, 2, 1, 1] : [2, 3, 3, 2, 1]
      priorities[s.id] = pick(r, ['essential', 'high', 'medium', 'low', 'none'] as Interest[], base)
    })
    const tier = pick(r, ['basic', 'standard', 'premium'] as const, [3, 5, 1])
    return {
      id: `seed-${i + 1}`,
      memberCode: `${edition.codePrefix}-${String(i + 1).padStart(4, '0')}`,
      headName: `Demo household ${String(i + 1).padStart(2, '0')}`,
      email: `household${i + 1}@example.com`, phone: `+1 (214) 555-01${String(i + 10).padStart(2, '0')}`, city: pick(r, ['Dallas', 'Plano', 'Frisco', 'Irving', 'Arlington', 'Fort Worth', 'Garland']),
      tier, status: pick(r, ['active', 'active', 'active', 'pending'] as const),
      joinedAt: new Date(Date.now() - Math.floor(r() * 120) * 86400000).toISOString().slice(0, 10),
      generation: pick(r, ['1st', '2nd', '3rd+', 'ally'] as const, [7, 3, 1, 1]),
      adults: pick(r, [1, 2, 3], [2, 6, 1]), children: pick(r, [0, 1, 2, 3], [3, 3, 3, 1]), seniors: pick(r, [0, 1], [7, 2]),
      language: pick(r, edition.languages, [4, 5, 2, 1, 1, 1, 1]),
      sector: pick(r, edition.sectors, [9, 5, 4, 3, 3, 3, 2, 2, 1]),
      alignment: pick(r, ['aligned', 'overqualified', 'underemployed', 'na'] as const, [4, 2, 4, 1]),
      housing: pick(r, ['own-mortgage', 'own-free', 'rent', 'family'] as const, [4, 1, 5, 1]),
      incomeBand: pick(r, incomeBands, [2, 4, 3, 2, 1]),
      insurance: pick(r, ['employer', 'marketplace', 'public', 'uninsured'] as const, [6, 3, 1, 2]),
      lifeInsurance: pick(r, ['yes', 'no', 'unsure'] as const, [3, 6, 3]),
      remitBand: pick(r, remitBands, [1, 2, 4, 3, 1]),
      homelandProperty: r() < 0.55,
      unmetNeed: pick(r, needs, [5, 4, 3, 2, 2, 2, 1]),
      priorities, wtpMonthly: pick(r, [0, 10, 15, 20, 30], [1, 3, 4, 2, 1]),
      volunteer: r() < 0.3, consentData: true, whatsappOptIn: r() < 0.75,
    }
  })
}


const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
const H = 3600000, D = 24 * H
const monthKey = (d: Date) => d.toISOString().slice(0, 7)

// Payments for the last three months, then the pool ledger derived from paid pool portions.
export function seedPayments(): Payment[] {
  const r = rng(11); const out: Payment[] = []
  const now = new Date(); const months = [2, 1, 0].map(k => monthKey(new Date(now.getFullYear(), now.getMonth() - k, 1)))
  seedHouseholds().filter(h => h.status === 'active').forEach(h => {
    months.forEach((m, mi) => {
      const t = edition.tiers[h.tier]; const current = mi === months.length - 1
      const roll = r(); const status: Payment['status'] = current ? (roll < 0.62 ? 'paid' : roll < 0.9 ? 'due' : 'failed') : (roll < 0.93 ? 'paid' : 'due')
      out.push({ id: `pay-${h.id}-${m}`, householdId: h.id, month: m, amount: t.monthly, poolPortion: t.poolShare, status, method: status === 'paid' ? (r() < 0.8 ? 'Card (Stripe)' : 'Zelle') : '', paidAt: status === 'paid' ? `${m}-0${1 + Math.floor(r() * 8)}` : undefined })
    })
  })
  return out
}
export function seedPool(): PoolEntry[] {
  const byMonth = new Map<string, number>()
  seedPayments().filter(p => p.status === 'paid').forEach(p => byMonth.set(p.month, (byMonth.get(p.month) ?? 0) + p.poolPortion))
  return [{ id: 'p-open', date: '2026-07-31', kind: 'contribution' as const, amount: 3000, note: 'Opening balance (demo)' }, ...[...byMonth.entries()].sort().map(([m, amount], i) => ({ id: `p${i}`, date: `${m}-08`, kind: 'contribution' as const, amount, note: `Dues pool share, ${m}` }))]
}

export function seedTickets(): Ticket[] {
  const mk = (n: number, hh: number, p: Partial<Ticket>): Ticket => ({ id: `t${n}`, createdAt: iso(H), householdId: `seed-${hh}`, category: 'other', priority: 'normal', status: 'new', summary: '', owner: 'Support manager', checks: { member: false, docs: false, call: false }, log: [], ...p })
  return [
    mk(1, 4, { category: 'bereavement', priority: 'urgent', summary: 'Father passed away. Family asking about repatriation to Kampala.', createdAt: iso(1.2 * H), log: [{ at: iso(1.2 * H), text: 'Request submitted via member portal.' }] }),
    mk(2, 9, { category: 'legal', priority: 'urgent', summary: 'Visa status adjustment: notice received, needs attorney this week.', createdAt: iso(5 * H), log: [{ at: iso(5 * H), text: 'Request submitted by WhatsApp.' }] }),
    mk(3, 12, { category: 'medical', priority: 'high', summary: 'Hospital bill after emergency surgery; asking about mutual aid.', status: 'verifying', createdAt: iso(20 * H), firstResponseAt: iso(18 * H), checks: { member: true, docs: false, call: false }, log: [{ at: iso(20 * H), text: 'Request submitted.' }, { at: iso(18 * H), text: 'Support manager replied, requested hospital statement.' }] }),
    mk(4, 17, { category: 'credential', summary: 'Nurse trained at Makerere; needs Texas BON licensing guidance.', status: 'dispatched', owner: 'Partnerships coordinator', createdAt: iso(2 * D), firstResponseAt: iso(2 * D - 3 * H), partnerId: 'partner-4', checks: { member: true, docs: true, call: true }, log: [{ at: iso(2 * D), text: 'Request submitted.' }, { at: iso(1 * D), text: 'Referred to credential mentor.' }] }),
    mk(5, 21, { category: 'income', priority: 'high', summary: 'Lost job; short on rent for one month.', status: 'resolved', createdAt: iso(4 * D), firstResponseAt: iso(4 * D - 1.5 * H), disbursement: 400, checks: { member: true, docs: true, call: true }, log: [{ at: iso(4 * D), text: 'Request submitted.' }, { at: iso(3 * D), text: '$400 disbursed from the mutual aid pool.' }] }),
  ]
}

export function seedPartners(): Partner[] {
  const iso = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
  // tick every checklist item for the stages before `upTo`, as if the earlier steps were completed
  const done = (p: Partner, upTo: Partner['stage']): Record<string, boolean> => {
    const out: Record<string, boolean> = {}; const lim = stageOrder.indexOf(upTo)
    checklists[trackOf(p)].forEach(c => { if (stageOrder.indexOf(c.stage) < lim) out[c.key] = true }); return out }
  const mk = (n: number, name: string, kind: Partner['kind'], stage: Partner['stage'], x: Partial<Partner> = {}): Partner => {
    const base: Partner = { id: `partner-${n}`, name, kind, contact: '', languages: 'English, Luganda', license: '', stage, licenseVerified: false, insuranceVerified: false, discount: '', slaHours: 24, notes: '', referral: 'none', status: 'active', vettedBy: 'partners@example.org', ...x }
    return { ...base, checks: { ...done(base, stage), ...(x.checks ?? {}) } }
  }
  return [
    mk(1, 'Sample Estate Law (demo)', 'Attorney', 'listed', { license: 'TX-000001', licenseVerified: true, insuranceVerified: true, discount: '15% off retainers', licenseExpires: iso(300), insuranceExpires: iso(40), agreementExpires: iso(200), reviewDue: iso(150), approvedBy: 'ops@example.org', checks: { intro: true, feedback: true } }),
    mk(2, 'Sample CPA Group (demo)', 'CPA', 'agreement', { license: 'TX-CPA-0002', licenseVerified: true, insuranceVerified: true, discount: 'Free first consult', isMember: true, conflict: 'Owner is a community member. No tie to staff or board.', licenseExpires: iso(400), insuranceExpires: iso(220), checks: { agreement: true } }),
    mk(3, 'Sample Cross-Border Tax (demo)', 'CPA', 'interview', { license: 'TX-CPA-0003', licenseVerified: true, insuranceVerified: true, referral: 'they-receive', referralNote: 'Offers a thank-you fee per referral. Waiting on lawyer review.' }),
    mk(4, 'Sample Nursing Mentors (demo)', 'Credential mentor', 'listed', { licenseVerified: true, insuranceVerified: true, discount: 'Free mentorship', slaHours: 48, approvedBy: 'ops@example.org', checks: { intro: true, feedback: true } }),
    mk(5, 'Sample Repatriation Services (demo)', 'Repatriation logistics', 'verification', { license: 'FD-0005' }),
    mk(6, 'Sample Insurance Brokerage (demo)', 'Insurance broker', 'application'),
    mk(7, 'Sample Community Bank (demo)', 'Bank or credit union', 'verification', { track: 'institution', languages: 'English', checks: { standing: true, complaints: true }, notes: 'Interested in sponsoring financial-literacy sessions and offering a member account.' }),
    mk(8, 'Sample Insurance Carrier (demo)', 'Insurance carrier', 'agreement', { track: 'institution', languages: 'English', discount: 'Group rate for the bereavement pool (pending broker)', referral: 'they-receive', referralNote: 'Commission to the licensed broker only', checks: { referral: true, legal: true } }),
  ]
}

export function seedStaff(): StaffMember[] {
  return [
    { id: 'ops@example.org', email: 'ops@example.org', name: 'Demo operations lead', role: 'ops' },
    { id: 'support@example.org', email: 'support@example.org', name: 'Demo support manager', role: 'support' },
    { id: 'data@example.org', email: 'data@example.org', name: 'Demo data specialist', role: 'data' },
    { id: 'partners@example.org', email: 'partners@example.org', name: 'Demo partnerships coordinator', role: 'partnerships' },
  ]
}

export function seedSubmissions(): import('./types').Submission[] {
  return seedHouseholds(45).slice(42).map((h, i) => {
    const { id: _id, memberCode: _m, status: _s, tier: _t, joinedAt: _j, ...answers } = h
    return { id: `sub-${i + 1}`, submittedAt: new Date(Date.now() - (i + 1) * 5 * 3600000).toISOString(), status: 'new' as const, answers: { ...answers, headName: `Sample respondent ${i + 1}`, email: `respondent${i + 1}@example.com` } }
  })
}
