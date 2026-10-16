import { pick, rng, seedHouseholds } from './seed'
import type { Club, EventItem, Goal, GoalKind, Membership, RemitRate, Rsvp, Service, Waitlist } from './types'

export const hueHex = { forest: '#0F3D3A', sun: '#F2B705', crane: '#C8372D', teal: '#1F7A8C', plum: '#6B3F69' } as const
export const pillars = ['Cross-border', 'Careers', 'Wealth', 'Family', 'Safety net', 'Community']

export const seedServices = (): Service[] => [
  { id: 'bereavement', name: 'Bereavement and repatriation pool', pillar: 'Cross-border', blurb: 'Monthly contributions into a protected pool, so no family has to fundraise to bring a loved one home.', status: 'soon', opens: 'Early 2027', surveyed: true, ticketCategory: 'bereavement', motif: 0 },
  { id: 'taxlegal', name: 'Cross-border tax and estate advice', pillar: 'Cross-border', blurb: 'Discounted consults with Texas CPAs and attorneys who handle U.S. and home-country tax, land and inheritance.', status: 'soon', opens: 'Spring 2027', surveyed: true, ticketCategory: 'legal', motif: 1 },
  { id: 'credential', name: 'Credential and licensing network', pillar: 'Careers', blurb: 'Mentors who have been through Texas licensing boards and credential evaluation, plus small grants for fees.', status: 'live', surveyed: true, ticketCategory: 'credential', motif: 2 },
  { id: 'susu', name: 'Digital susu and community loan pool', pillar: 'Wealth', blurb: 'A modern savings circle that builds U.S. credit and opens the door to low-interest loans.', status: 'interest', surveyed: true, motif: 3 },
  { id: 'incubator', name: 'Business incubator and angel fund', pillar: 'Wealth', blurb: 'Pitch nights, mentors and seed funding for members starting a business here or back home.', status: 'interest', surveyed: true, motif: 4 },
  { id: 'health', name: 'Culturally attuned health and senior care', pillar: 'Family', blurb: 'Therapists, aides and day programs who understand our languages, food and family structure.', status: 'interest', surveyed: true, motif: 5 },
  { id: 'youth', name: 'Youth heritage and immersion fellowships', pillar: 'Family', blurb: 'Language classes, mentors and summer placements back home for college students.', status: 'interest', surveyed: true, motif: 0 },
  { id: 'mutualaid', name: 'Emergency mutual aid fund', pillar: 'Safety net', blurb: 'Fast help when a medical crisis, injury or job loss hits a member household.', status: 'soon', opens: 'Early 2027', surveyed: true, ticketCategory: 'income', motif: 1 },
  { id: 'card', name: 'Digital member card', pillar: 'Community', blurb: 'Your ID for partner discounts and community benefits. Scan it to confirm your membership.', status: 'live', surveyed: false, motif: 2 },
  { id: 'clubs', name: 'Member clubs', pillar: 'Community', blurb: 'Join a club built around your goals, from building wealth to women’s mentorship.', status: 'live', surveyed: false, motif: 3 },
  { id: 'directory', name: 'Business directory and B2B network', pillar: 'Wealth', blurb: 'List your business and find member-owned vendors for group purchasing deals.', status: 'soon', opens: 'Winter 2026', surveyed: false, motif: 4 },
  { id: 'consular', name: 'Consular and document clinics', pillar: 'Cross-border', blurb: 'Visiting passport and document sessions, so you do not travel out of state for renewals.', status: 'interest', surveyed: false, motif: 5 },
  { id: 'mentorship', name: 'Career mentorship', pillar: 'Careers', blurb: 'Pairing second-generation members and newcomers with established leaders in medicine, tech, finance and law.', status: 'interest', surveyed: false, motif: 0 },
  { id: 'archive', name: 'Oral history archive', pillar: 'Community', blurb: 'Record elders’ stories on video and audio so the next generation can hear them.', status: 'interest', surveyed: false, motif: 1 },
  { id: 'remit', name: 'Remittance savings', pillar: 'Cross-border', blurb: 'Compare what it costs to send money home, and find the cheapest licensed option for the amount you send. We compare and refer. We never hold your money.', status: 'live', surveyed: false, motif: 2 },
  { id: 'immigration', name: 'Immigration reminders', pillar: 'Cross-border', blurb: 'Keep your renewal dates in one private place and get nudges at 180, 90 and 30 days. Includes referrals to vetted attorneys. Reminders only, not legal advice.', status: 'live', surveyed: false, ticketCategory: 'legal', motif: 3 },
  { id: 'vault', name: 'Family document vault', pillar: 'Family', blurb: 'A private checklist of the papers every family needs (wills, IDs, land titles, insurance, immigration papers): which you have, where the originals are kept, when they expire, and an “if something happens” page for someone you trust. We keep the locations, never the documents themselves.', status: 'live', surveyed: false, motif: 4 },
  { id: 'credit', name: 'Credit builder and home-buyer track', pillar: 'Wealth', blurb: 'A step-by-step path to a strong U.S. credit score and your first home: a checklist, a card-balance check and a down-payment planner, plus an introduction to lenders when you are ready. We never see your credit report, and nothing you enter is visible to staff.', status: 'live', ticketCategory: 'other', surveyed: false, motif: 5 },
  { id: 'scholar', name: 'Scholarships and college help', pillar: 'Family', blurb: 'College application tracker, FAFSA nights and a community scholarship fund for students.', status: 'interest', surveyed: false, motif: 0 },
  { id: 'jobs', name: 'Job board and referrals', pillar: 'Careers', blurb: 'Members hiring members, plus referral introductions inside trusted employers.', status: 'interest', surveyed: false, motif: 1 },
  { id: 'caregiving', name: 'Caregiving across borders', pillar: 'Family', blurb: 'Coordinate care for parents back home or here: shared updates, visit scheduling and trusted local helpers.', status: 'interest', surveyed: false, motif: 2 },
  { id: 'proasks', name: 'Ask a professional office hours', pillar: 'Community', blurb: 'A monthly open session with a CPA, an attorney and a doctor from our community.', status: 'interest', surveyed: false, motif: 3 },
]

export const VOTES_PER_HOUSEHOLD = 5

export const seedRates = (): RemitRate[] => [
  { id: 'r1', provider: 'Licensed partner A (sample)', flatFee: 3.99, fxMarginPct: 0.8, speed: 'Minutes', note: 'Sample numbers. Staff replaces these with checked partner rates.' },
  { id: 'r2', provider: 'Licensed partner B (sample)', flatFee: 0, fxMarginPct: 2.1, speed: 'Same day' },
  { id: 'r3', provider: 'Licensed partner C (sample)', flatFee: 7.5, fxMarginPct: 0.4, speed: '1 to 2 days' },
  { id: 'r4', provider: 'Typical bank wire (sample)', flatFee: 35, fxMarginPct: 3, speed: '2 to 4 days' },
]
export const seedClubs = (): Club[] => [
  { id: 'wealth', name: 'Wealth Builders', tagline: 'Grow net worth together', about: 'Monthly sessions on budgeting, investing basics, buying a first home, life insurance and estate planning. Members share what worked and set goals together.', meets: 'First Thursday, 7:00 pm, online', lead: 'Sample club lead', focus: ['Budgeting', 'Investing', 'Homebuying', 'Estate planning'], motif: 0, hue: 'forest', note: 'This month: build a 3-month emergency fund.' },
  { id: 'wew', name: 'Women Empowering Women', tagline: 'Mentorship, careers and wellbeing', about: 'A circle for women in our community to trade advice on careers, caregiving, money and health. Open to any woman who wants to join.', meets: 'Second Saturday, 10:30 am brunch', lead: 'Sample club lead', focus: ['Mentorship', 'Careers', 'Wellbeing', 'Leadership'], motif: 3, hue: 'plum' },
  { id: 'health', name: 'Healthcare Network', tagline: 'Nurses, doctors, techs and students', about: 'Study groups and licensing help for members working in or entering healthcare, with a mentor roster for Texas boards and exams.', meets: 'Third Tuesday, 6:30 pm, online', lead: 'Sample club lead', focus: ['Licensing', 'Exams', 'Job leads'], motif: 2, hue: 'teal' },
  { id: 'young', name: 'Young Professionals', tagline: 'Second and third generation connections', about: 'Networking, career swaps and community service for members under 40. Helps build the next generation of leaders.', meets: 'Last Friday, 7:30 pm', lead: 'Sample club lead', focus: ['Networking', 'Volunteering', 'Careers'], motif: 4, hue: 'sun' },
  { id: 'founders', name: 'Entrepreneurs Table', tagline: 'Owners helping owners', about: 'Business owners swap referrals, test pitches and plan group purchasing. A feeder for the incubator and the business directory.', meets: 'Fourth Wednesday, 6:00 pm', lead: 'Sample club lead', focus: ['Referrals', 'Pitching', 'Group buying'], motif: 5, hue: 'crane' },
  { id: 'elders', name: 'Elders’ Circle', tagline: 'Stories, heritage and company', about: 'A welcoming evening for seniors to share stories, record oral history and meet neighbors. Rides can be arranged.', meets: 'Second Sunday, 3:00 pm', lead: 'Sample club lead', focus: ['Oral history', 'Company', 'Rides'], motif: 1, hue: 'forest' },
]

const iso = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
export const seedEvents = (): EventItem[] => [
  { id: 'e1', title: 'Budgeting night', kind: 'club', date: iso(3), start: '19:00', end: '20:30', place: 'Online', about: 'Wealth Builders: set up a simple monthly budget and a 3-month emergency fund target.', clubId: 'wealth' },
  { id: 'e2', title: 'First State of Community results', kind: 'town hall', date: iso(6), start: '10:00', end: '12:00', place: 'Community hall, Plano (sample venue)', about: 'We share the first community totals, what members asked for, and what we build first. Questions welcome.' },
  { id: 'e3', title: 'Texas nursing licensing basics', kind: 'workshop', date: iso(9), start: '18:30', end: '20:00', place: 'Online', about: 'A mentor walks through credential evaluation, the board application and exam planning.', clubId: 'health' },
  { id: 'e4', title: 'Brunch and mentorship circle', kind: 'club', date: iso(12), start: '10:30', end: '12:30', place: 'Frisco (sample venue)', about: 'Women Empowering Women: bring a goal for the next six months and meet a mentor.', clubId: 'wew' },
  { id: 'e5', title: 'Passport and document clinic', kind: 'clinic', date: iso(17), start: '09:00', end: '15:00', place: 'Dallas (sample venue)', about: 'Sample event: visiting consular staff help with passport renewals and document notarization. Bring ID and photos.' },
  { id: 'e6', title: 'Pitch practice night', kind: 'club', date: iso(22), start: '18:00', end: '20:00', place: 'Irving (sample venue)', about: 'Entrepreneurs Table: five-minute pitches and honest feedback.', clubId: 'founders' },
  { id: 'e7', title: 'Community fundraiser dinner', kind: 'fundraiser', date: iso(30), start: '18:00', end: '21:00', place: 'Arlington (sample venue)', about: 'An evening to top up the mutual aid pool. Every dollar and payout is reported to members.' },
  { id: 'e8', title: 'Heritage evening', kind: 'social', date: iso(38), start: '15:00', end: '17:00', place: 'Garland (sample venue)', about: 'Elders share stories and we record oral history for the archive. Rides available.', clubId: 'elders' },
]

const goalTemplates: Record<GoalKind, { title: string; unit: Goal['unit']; label?: string; hint: string }> = {
  networth: { title: 'Grow my net worth', unit: 'usd', hint: 'Assets minus debts. Update it once a quarter.' },
  savings: { title: 'Build an emergency fund', unit: 'usd', hint: 'Three to six months of expenses.' },
  home: { title: 'Save a home down payment', unit: 'usd', hint: 'Typically 3 to 20 percent of the price.' },
  education: { title: 'Finish my credential', unit: 'count', label: 'steps done', hint: 'Count courses, exams or application steps.' },
  business: { title: 'Launch my business', unit: 'count', label: 'steps done', hint: 'Entity, bank account, first customer, and so on.' },
  debt: { title: 'Pay off a debt', unit: 'usd', hint: 'Enter what you owe now. The goal counts down to zero.' },
  custom: { title: 'My own goal', unit: 'count', hint: 'Anything you want to track.' },
}
export { goalTemplates }

export function seedGoals(): Goal[] {
  const r = rng(23); const out: Goal[] = []
  const hs = seedHouseholds(42)
  hs.forEach((h, i) => {
    const kinds = [pick(r, ['networth', 'savings', 'home', 'debt'] as GoalKind[]), pick(r, ['education', 'business', 'savings'] as GoalKind[])]
    kinds.slice(0, i % 3 === 0 ? 2 : 1).forEach((kind, j) => {
      const t = goalTemplates[kind]; const usd = t.unit === 'usd'
      const owed = pick(r, [3000, 8000, 15000]); const target0 = usd ? pick(r, [5000, 10000, 25000, 50000]) : pick(r, [6, 8, 10])
      const debt = kind === 'debt'
      const start = debt ? owed : usd ? Math.round(target0 * 0.1) : 0; const target = debt ? 0 : target0
      const end = debt ? Math.round(owed * (0.3 + r() * 0.3)) : Math.round(start + (target - start) * (0.25 + r() * 0.55))
      const steps = 4; const updates = Array.from({ length: steps }, (_, k) => ({ at: new Date(Date.now() - (steps - k) * 21 * 86400000).toISOString(), value: Math.round(start + ((end - start) * (k + 1)) / steps) }))
      out.push({ id: `goal-${h.id}-${j}`, householdId: h.id, kind, title: t.title, unit: t.unit, label: t.label, start, target, current: end, due: iso(120 + Math.floor(r() * 240)), createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), updates })
    })
  })
  return out
}

export function seedMemberships(): Membership[] {
  const r = rng(31); const out: Membership[] = []; const cl = seedClubs()
  seedHouseholds(42).forEach(h => cl.forEach(c => { if (r() < 0.22) out.push({ id: `${c.id}:${h.id}`, clubId: c.id, householdId: h.id, joinedAt: iso(-Math.floor(r() * 80)) }) }))
  return out
}
export function seedRsvps(): Rsvp[] {
  const r = rng(41); const out: Rsvp[] = []
  seedHouseholds(42).forEach(h => seedEvents().forEach(e => { if (r() < 0.25) out.push({ id: `${e.id}:${h.id}`, eventId: e.id, householdId: h.id, status: r() < 0.8 ? 'going' : 'maybe', guests: Math.floor(r() * 3) }) }))
  return out
}
export function seedWaitlist(): Waitlist[] {
  const r = rng(53); const out: Waitlist[] = []
  seedHouseholds(42).forEach(h => { let n = 0; seedServices().filter(s => s.status !== 'live').forEach(s => { if (n < VOTES_PER_HOUSEHOLD && r() < 0.2) { n++; out.push({ id: `${s.id}:${h.id}`, serviceId: s.id, householdId: h.id, at: iso(-Math.floor(r() * 60)) }) } }) })
  return out
}
