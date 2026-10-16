export type Tier = 'basic' | 'standard' | 'premium'
export type Status = 'pending' | 'active' | 'lapsed'
export type Interest = 'essential' | 'high' | 'medium' | 'low' | 'none'

export type SurveySection = 'work' | 'health' | 'help'
export interface Household {
  id: string
  skipped?: SurveySection[] // optional survey sections the member chose not to answer; left out of the statistics
  memberCode: string
  headName: string
  email: string
  phone: string
  city: string
  tier: Tier
  status: Status
  joinedAt: string // ISO date
  // snapshot fields (from the State of Community survey)
  generation: '1st' | '2nd' | '3rd+' | 'ally'
  adults: number
  children: number
  seniors: number
  language: string
  sector: string
  alignment: 'aligned' | 'overqualified' | 'underemployed' | 'na'
  housing: 'own-mortgage' | 'own-free' | 'rent' | 'family'
  incomeBand: string
  insurance: 'employer' | 'marketplace' | 'public' | 'uninsured'
  lifeInsurance: 'yes' | 'no' | 'unsure'
  remitBand: string
  homelandProperty: boolean
  unmetNeed: string
  priorities: Record<string, Interest>
  wtpMonthly: number // willingness to pay, $/month
  volunteer: boolean
  consentData: boolean // agreed to anonymized use in community statistics
  whatsappOptIn: boolean // OK to message by WhatsApp or text
}

export interface PoolEntry { id: string; date: string; kind: 'contribution' | 'claim'; amount: number; note: string }

export type TicketCategory = 'bereavement' | 'legal' | 'medical' | 'income' | 'credential' | 'other'
export interface Ticket {
  id: string; createdAt: string; householdId: string; category: TicketCategory
  priority: 'urgent' | 'high' | 'normal'; status: 'new' | 'verifying' | 'dispatched' | 'resolved'
  summary: string; owner: string; checks: { member: boolean; docs: boolean; call: boolean }
  firstResponseAt?: string; partnerId?: string; disbursement?: number; log: { at: string; text: string }[]
}
export type PartnerTrack = 'institution' | 'professional'
export type PartnerKind = 'Attorney' | 'CPA' | 'Insurance broker' | 'Repatriation logistics' | 'Counselor' | 'Credential mentor' | 'Bank or credit union' | 'Insurance carrier' | 'Corporate sponsor'
export type PartnerStage = 'application' | 'verification' | 'interview' | 'agreement' | 'pilot' | 'listed'
export interface Partner {
  id: string; name: string; kind: PartnerKind; contact: string; languages: string; license: string
  stage: PartnerStage; licenseVerified: boolean; insuranceVerified: boolean; discount: string; slaHours: number; notes: string
  // added for the two-track workflow (all optional so older saved data still loads)
  agreementStatus?: 'none' | 'draft' | 'sent' | 'signed'
  track?: PartnerTrack; checks?: Record<string, boolean>; vettedBy?: string; approvedBy?: string; approvedAt?: string
  isMember?: boolean; conflict?: string; referral?: 'none' | 'we-receive' | 'they-receive'; referralNote?: string
  licenseExpires?: string; insuranceExpires?: string; agreementExpires?: string; reviewDue?: string
  status?: 'active' | 'paused' | 'removed'; pilotNote?: string; owner?: string
}
export interface PartnerComplaint { id: string; partnerId: string; at: string; summary: string; severity: 'minor' | 'serious'; status: 'open' | 'resolved'; by: string; resolution?: string }
export interface Broadcast { id: string; sentAt: string; channel: 'whatsapp' | 'sms' | 'email'; audience: string; subject: string; body: string; recipients: number; skipped: number; simulated: boolean }
export interface Payment { id: string; householdId: string; month: string; amount: number; poolPortion: number; status: 'paid' | 'due' | 'failed'; method: string; paidAt?: string }
export interface Gate { id: string; done: boolean }

export type Role = 'ops' | 'support' | 'data' | 'partnerships' | 'board'
export interface StaffMember { id: string; email: string; name: string; role: Role }
export type Answers = Omit<Household, 'id' | 'memberCode' | 'status' | 'tier' | 'joinedAt'>
export interface Submission { id: string; submittedAt: string; status: 'new' | 'approved' | 'rejected'; answers: Answers; memberCode?: string }

// Member portal content
export type ServiceStatus = 'live' | 'soon' | 'interest'
export interface Service { id: string; name: string; pillar: string; blurb: string; status: ServiceStatus; opens?: string; surveyed: boolean; ticketCategory?: TicketCategory; motif: number }
export type Hue = 'forest' | 'sun' | 'crane' | 'teal' | 'plum'
export interface Club { id: string; name: string; tagline: string; about: string; meets: string; lead: string; focus: string[]; motif: number; hue: Hue; note?: string }
export type EventKind = 'town hall' | 'workshop' | 'clinic' | 'social' | 'club' | 'fundraiser'
export interface EventItem { id: string; title: string; kind: EventKind; date: string; start: string; end: string; place: string; about: string; clubId?: string }
export interface Rsvp { id: string; eventId: string; householdId: string; status: 'going' | 'maybe'; guests: number }
export interface Membership { id: string; clubId: string; householdId: string; joinedAt: string }
export interface Waitlist { id: string; serviceId: string; householdId: string; personId?: string; at: string }
export type GoalKind = 'networth' | 'savings' | 'home' | 'education' | 'business' | 'debt' | 'custom'
export interface Goal {
  id: string; householdId: string; kind: GoalKind; title: string; unit: 'usd' | 'count'; label?: string
  start: number; target: number; current: number; due?: string; createdAt: string; updates: { at: string; value: number; note?: string }[]
}

export interface Suggestion { id: string; householdId: string; text: string; at: string; status: 'new' | 'reviewed' }
export type ReminderKind = 'Green card' | 'Work permit' | 'Visa or I-94' | 'Naturalization' | 'Passport' | 'Driver’s license' | 'Other'
export interface Reminder { id: string; householdId: string; personId?: string; shared?: boolean; kind: ReminderKind; person: string; date: string; note?: string }
export interface VaultItem { id: string; householdId: string; personId?: string; shared?: boolean; kind: string; have: boolean; where: string; copyWith?: string; expires?: string; note?: string }
export interface VaultContact { id: string; householdId: string; personId?: string; name: string; relationship: string; phone: string; note?: string }
export interface CreditPlan { id: string; householdId: string; personId?: string; done: Record<string, boolean>; score?: number; scoreAt?: string; targetScore?: number; homePrice?: number; saved?: number; monthly?: number }
export interface RemitRate { id: string; provider: string; flatFee: number; fxMarginPct: number; speed: string; note?: string }

// Finance
export type LedgerStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'void'
export interface LedgerEntry {
  id: string; date: string; kind: 'income' | 'expense'; amount: number; category: string; community: string; project?: string
  accountId?: string; payee: string; payeeId?: string; memo?: string; receipt?: string; status: LedgerStatus
  createdBy: string; createdAt: string; approvedBy?: string; approvedAt?: string; rejectedReason?: string; paidAt?: string; paidRef?: string; voidReason?: string
}
export interface Payee { id: string; name: string; type: 'employee' | 'contractor' | 'vendor'; w9: boolean; notes?: string }
export interface Project { id: string; name: string; community: string; budget: number; date?: string }
export interface Coi { id: string; email: string; name: string; year: number; none: boolean; parties: string[]; notes?: string; signedAt: string }
export interface BankAccount { id: string; community: string; name: string; bank: string; last4: string; purpose: string; active: boolean }
export interface Recon { id: string; accountId?: string; bankBalance: number; ledgerBalance: number; reconciledBy: string; at: string }
export interface MonthLock { id: string; by: string; at: string }
export interface AuditRow { id: string; at: string; actor: string; action: string; collection: string; entryId: string; status?: string; amount?: number; memo?: string }
export interface Transparency { id: string; label: string; income: number; expenses: number; byCategory: { category: string; amount: number }[]; poolBalance: number; note?: string; publishedBy: string; publishedAt: string }

// Investment fund (phase 1: transparency)
export type AssetType = 'Stock or ETF' | 'Bond or Treasury fund' | 'Real estate' | 'Cash'
export interface Holding { id: string; name: string; type: AssetType; cost: number; value: number; asOf: string; note?: string; relatedParty?: string; active: boolean }
export type TradeStatus = 'proposed' | 'approved' | 'executed' | 'rejected'
export interface Trade { id: string; date: string; action: 'buy' | 'sell'; asset: string; type: AssetType; amount: number; rationale: string; relatedParty?: string; status: TradeStatus; proposedBy: string; approvedBy?: string; executedBy?: string; executedAt?: string; rejectedReason?: string }
export interface NavPoint { id: string; value: number; contributed: number; by: string }
export interface FundPayout { id: string; date: string; amount: number; purpose: string; approvedBy: string }
export interface FundPolicy { id: string; mission: string; payoutPct: number; maxSinglePct: number; minCashPct: number; committee: string; updatedBy: string; updatedAt: string }
export interface FundReport { id: string; label: string; total: number; contributed: number; returnPct: number; allocation: { type: string; pct: number }[]; holdings: { name: string; type: string; value: number }[]; payoutsYtd: number; servicesCost: number; coveragePct: number; note?: string; publishedBy: string; publishedAt: string }

export interface Onboarding { id: string; householdId: string; personId?: string; done: Record<string, boolean>; dismissed?: boolean; finishedAt?: string }

// Editable content, consent records, household people, usage events
export interface ContentDoc { id: string; title: string; intro?: string; body: string; kind: 'page' | 'legal' | 'settings'; status: 'published'; version: number; reviewedBy?: string; effective?: string; updatedBy: string; updatedAt: string }
export interface ContentHistory { id: string; slug: string; version: number; title: string; intro?: string; body: string; updatedBy: string; updatedAt: string }
export interface Consent { id: string; householdId: string; personId: string; slug: string; version: number; at: string }
export interface Person { id: string; householdId: string; name: string; email: string; role: 'head' | 'partner' | 'adult'; status: 'invited' | 'active'; invitedBy?: string; at: string }
export interface Telemetry { id: string; at: string; householdId: string; personId: string; type: 'login' | 'view' | 'vote' | 'action'; screen: string; ms?: number; ref?: string }
