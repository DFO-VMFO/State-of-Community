import type { BankAccount, LedgerEntry, LedgerStatus, MonthLock, Payee, Project, Recon, Role } from './types'

export const COMMUNITY = 'UG-DFW'
export const BOARD_LIMIT = 1000 // entries at or above this, and all payroll, need the board
export const incomeCats = ['Dues', 'Sponsorships', 'Event tickets', 'Donations', 'Grants', 'Other income']
export const expenseCats = ['Venue', 'Food and drink', 'Marketing', 'Software', 'Legal and professional', 'Insurance', 'Travel', 'Supplies', 'Bank and payment fees', 'Other expense']
export const payCats = ['Payroll', 'Contractors']
export const allExpenseCats = [...expenseCats, ...payCats]
export const isPay = (cat: string) => payCats.includes(cat)
export const money = (n: number) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
export const ymOf = (d: string) => d.slice(0, 7)
export const final = (s: LedgerStatus) => s === 'paid' || s === 'void'
export const counts = (e: LedgerEntry) => e.status === 'approved' || e.status === 'paid'
export const statusStyle: Record<LedgerStatus, string> = { draft: 'bg-field text-mute', pending: 'bg-sun-100 text-sun-700', approved: 'bg-forest-100 text-forest', rejected: 'bg-crane text-white', paid: 'bg-forest text-white', void: 'bg-line text-mute line-through' }

// Same rules as the database (supabase/schema.sql). In demo mode this is the only enforcement.
export function approveBlock(e: LedgerEntry, role: Role, email: string): string | null {
  if (e.status !== 'pending') return 'Only pending entries can be approved.'
  if (role !== 'ops' && role !== 'board') return 'Only the operations lead or the board can approve.'
  if (e.createdBy.toLowerCase() === email.toLowerCase()) return 'You entered this, so someone else must approve it.'
  if ((isPay(e.category) || e.amount >= BOARD_LIMIT) && role !== 'board') return isPay(e.category) ? 'Payroll and contractor pay need the board.' : `Entries of ${money(BOARD_LIMIT)} or more need the board.`
  return null
}

const ym = (back: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back); return d.toISOString().slice(0, 7) }
const E = (id: string, back: number, day: number, kind: 'income' | 'expense', amount: number, category: string, payee: string, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id, date: `${ym(back)}-${String(day).padStart(2, '0')}`, kind, amount, category, community: COMMUNITY, payee, accountId: 'a-op', status: 'paid', createdBy: 'ops@example.org', createdAt: `${ym(back)}-${String(day).padStart(2, '0')}T12:00:00Z`,
  approvedBy: 'board@example.org', approvedAt: `${ym(back)}-${String(Math.min(28, day + 1)).padStart(2, '0')}T12:00:00Z`, ...extra })

export const seedLedger = (): LedgerEntry[] => [
  E('l1', 2, 5, 'income', 750, 'Dues', 'Member dues (month)'), E('l2', 2, 8, 'income', 1200, 'Sponsorships', 'Sample sponsor', { project: 'Spring mixer' }),
  E('l3', 2, 10, 'expense', 49, 'Software', 'Hosting and email'), E('l4', 2, 14, 'expense', 1800, 'Legal and professional', 'Sample law firm', { memo: 'Entity formation' }),
  E('l5', 2, 20, 'expense', 320, 'Venue', 'Community hall (sample)', { project: 'Spring mixer' }), E('l6', 2, 20, 'expense', 410, 'Food and drink', 'Caterer (sample)', { project: 'Spring mixer' }),
  E('l7', 1, 5, 'income', 1050, 'Dues', 'Member dues (month)'), E('l8', 1, 12, 'income', 600, 'Event tickets', 'Ticket sales', { project: 'Fundraiser dinner' }),
  E('l9', 1, 3, 'expense', 49, 'Software', 'Hosting and email'), E('l10', 1, 15, 'expense', 900, 'Venue', 'Banquet hall (sample)', { project: 'Fundraiser dinner' }), E('l11', 1, 15, 'expense', 1250, 'Food and drink', 'Caterer (sample)', { project: 'Fundraiser dinner' }),
  E('l12', 1, 18, 'expense', 275, 'Marketing', 'Printing and flyers'),
  E('l13', 0, 4, 'income', 1260, 'Dues', 'Member dues (month)', { status: 'approved' }), E('l14', 0, 6, 'expense', 49, 'Software', 'Hosting and email', { status: 'approved' }),
  E('l15', 0, 7, 'expense', 1200, 'Venue', 'Community hall, Town Hall deposit', { status: 'pending', project: 'Town Hall Oct 21', approvedBy: undefined, approvedAt: undefined, createdBy: 'ops@example.org' }),
  E('l16', 0, 8, 'expense', 180, 'Food and drink', 'Refreshments', { status: 'pending', project: 'Town Hall Oct 21', approvedBy: undefined, approvedAt: undefined }),
  E('l17', 0, 9, 'expense', 95, 'Supplies', 'Name tags', { status: 'draft', approvedBy: undefined, approvedAt: undefined, createdBy: 'support@example.org' }),
]
export const seedPayroll = (): LedgerEntry[] => [
  E('p1', 2, 28, 'expense', 2000, 'Payroll', 'Sample staff A', { payeeId: 'pe1' }), E('p2', 1, 28, 'expense', 2000, 'Payroll', 'Sample staff A', { payeeId: 'pe1' }),
  E('p3', 1, 22, 'expense', 450, 'Contractors', 'Sample designer', { payeeId: 'pe2', memo: 'Event branding' }),
  E('p4', 0, 6, 'expense', 450, 'Contractors', 'Sample designer', { payeeId: 'pe2', status: 'pending', approvedBy: undefined, approvedAt: undefined, memo: 'Town Hall signage' }),
]
export const seedPayees = (): Payee[] => [
  { id: 'pe1', name: 'Sample staff A', type: 'employee', w9: true, notes: 'Paid through a payroll provider' },
  { id: 'pe2', name: 'Sample designer', type: 'contractor', w9: false, notes: 'No W-9 yet' },
  { id: 'pe3', name: 'Community hall (sample)', type: 'vendor', w9: true },
]
export const seedProjects = (): Project[] => [
  { id: 'pr1', name: 'Town Hall Oct 21', community: COMMUNITY, budget: 1500 }, { id: 'pr2', name: 'Fundraiser dinner', community: COMMUNITY, budget: 2800 }, { id: 'pr3', name: 'Spring mixer', community: COMMUNITY, budget: 1000 },
]
export const seedAccounts = (): BankAccount[] => [
  { id: 'a-op', community: COMMUNITY, name: 'Operating checking', bank: 'Sample Bank', last4: '0001', purpose: 'Dues, day-to-day costs, payroll', active: true },
  { id: 'a-ev', community: COMMUNITY, name: 'Events and fundraising', bank: 'Sample Bank', last4: '0002', purpose: 'Ticket sales, sponsorships and event costs', active: true },
]
export const recId = (m: string, accountId: string) => `${m}:${accountId}`
export const seedRecs = (): Recon[] => [
  { id: recId(ym(2), 'a-op'), accountId: 'a-op', bankBalance: 2561, ledgerBalance: 2561, reconciledBy: 'Sample outside bookkeeper', at: `${ym(1)}-03T12:00:00Z` },
  { id: recId(ym(2), 'a-ev'), accountId: 'a-ev', bankBalance: 0, ledgerBalance: 0, reconciledBy: 'Sample outside bookkeeper', at: `${ym(1)}-03T12:00:00Z` },
]
export const seedLocks = (): MonthLock[] => [{ id: ym(2), by: 'ops@example.org', at: `${ym(1)}-04T12:00:00Z` }]

export function csv(rows: LedgerEntry[], names: Record<string, string> = {}): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const head = 'Date,Type,Account,Payee,Amount,Memo,Class,Status,Bank account'
  return [head, ...rows.sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, e.kind === 'income' ? 'Deposit' : 'Expense', q(e.category), q(e.payee), (e.kind === 'income' ? '' : '-') + e.amount.toFixed(2), q(e.memo ?? ''), q(e.project ?? ''), e.status, q(names[e.accountId ?? ''] ?? '')].join(','))].join('\n')
}
