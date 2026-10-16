import type { Partner, PartnerKind, PartnerStage, PartnerTrack } from './types'

export const institutionKinds: PartnerKind[] = ['Bank or credit union', 'Insurance carrier', 'Corporate sponsor']
export const professionalKinds: PartnerKind[] = ['Attorney', 'CPA', 'Insurance broker', 'Repatriation logistics', 'Counselor', 'Credential mentor']
export const trackOf = (p: Pick<Partner, 'kind' | 'track'>): PartnerTrack => p.track ?? (institutionKinds.includes(p.kind) ? 'institution' : 'professional')

export const stageOrder: PartnerStage[] = ['application', 'verification', 'interview', 'agreement', 'pilot', 'listed']
export const stageLabels: Record<PartnerTrack, Record<PartnerStage, string>> = {
  professional: { application: 'Applied', verification: 'License check', interview: 'Interview and conflicts', agreement: 'Agreement', pilot: 'Pilot introduction', listed: 'Listed' },
  institution: { application: 'Inquiry', verification: 'Due diligence', interview: 'Executive meeting', agreement: 'Legal review and MOU', pilot: 'Pilot with members', listed: 'Active partner' },
}
export const trackBlurb: Record<PartnerTrack, string> = {
  professional: 'A licensed individual or small firm (CPA, attorney, broker, counselor). May also be a community member, so conflicts of interest and referral fees get extra attention. Listing needs the operations lead.',
  institution: 'A regulated company or large organization. Slower and more formal: their compliance contact, our attorney reviews their paper, nothing implies endorsement, and no member data is shared. Listing needs the board.',
}

export interface Check { key: string; label: string; help?: string; stage: PartnerStage; when?: (p: Partner) => boolean }
const pilot: Check[] = [
  { key: 'intro', label: 'Introduced to the community (message, event or club session)', stage: 'pilot' },
  { key: 'feedback', label: 'Pilot feedback reviewed (3 or more members, or 30 days)', stage: 'pilot' },
]
export const checklists: Record<PartnerTrack, Check[]> = {
  professional: [
    { key: 'license', label: 'License confirmed on the state licensing board website', help: 'Screenshot or note with date', stage: 'verification' },
    { key: 'discipline', label: 'No disciplinary action on the board record', stage: 'verification' },
    { key: 'insurance', label: 'Professional liability insurance certificate on file', help: 'Record the expiry date below', stage: 'verification' },
    { key: 'refs', label: 'Two references checked', stage: 'verification' },
    { key: 'w9', label: 'W-9 collected', stage: 'verification' },
    { key: 'coi', label: 'Conflict-of-interest form signed (family or business ties to staff, board or other partners)', stage: 'interview' },
    { key: 'referral', label: 'Referral fees disclosed and a lawyer confirmed they are allowed', stage: 'interview', when: p => (p.referral ?? 'none') !== 'none' },
    { key: 'fit', label: 'Interviewed: services, fees and languages fit member needs', stage: 'interview' },
    { key: 'agreement', label: 'Partner agreement signed: independent provider, no endorsement, insurance, indemnity, privacy', stage: 'agreement' },
    { key: 'scope', label: 'Scope of services and member pricing written down', stage: 'agreement' },
    ...pilot,
  ],
  institution: [
    { key: 'standing', label: 'Regulatory standing confirmed (charter, licenses, enforcement actions)', stage: 'verification' },
    { key: 'complaints', label: 'Public complaint and litigation history reviewed', stage: 'verification' },
    { key: 'security', label: 'Data privacy and security questionnaire answered', stage: 'verification' },
    { key: 'screen', label: 'Sanctions and reputation screening done', stage: 'verification' },
    { key: 'contact', label: 'Compliance contact and executive sponsor named', stage: 'verification' },
    { key: 'coi', label: 'Conflict-of-interest check: board, staff and advisors', stage: 'interview' },
    { key: 'referral', label: 'Any referral or sponsorship payments reviewed by counsel', stage: 'interview', when: p => (p.referral ?? 'none') !== 'none' },
    { key: 'brand', label: 'Brand use and co-marketing approval process agreed', stage: 'interview' },
    { key: 'legal', label: 'Our attorney reviewed their paper', stage: 'agreement' },
    { key: 'mou', label: 'MOU or sponsorship agreement signed by an authorized officer', stage: 'agreement' },
    { key: 'nonexcl', label: 'No exclusivity and no endorsement language', stage: 'agreement' },
    { key: 'data', label: 'No sharing of member data without each member’s consent', stage: 'agreement' },
    { key: 'termination', label: 'Termination and complaint-handling terms agreed', stage: 'agreement' },
    ...pilot,
  ],
}
const legacy = (p: Partner, k: string) => (k === 'license' ? p.licenseVerified : k === 'insurance' ? p.insuranceVerified : false)
export const hasCheck = (p: Partner, k: string) => p.checks?.[k] ?? legacy(p, k)
export const stageChecks = (p: Partner, stage: PartnerStage) => checklists[trackOf(p)].filter(c => c.stage === stage && (!c.when || c.when(p)))
export const missingChecks = (p: Partner, stage: PartnerStage) => stageChecks(p, stage).filter(c => !hasCheck(p, c.key))
export const nextStage = (p: Partner): PartnerStage | null => { const i = stageOrder.indexOf(p.stage); return i < stageOrder.length - 1 ? stageOrder[i + 1] : null }

export function moveBlock(p: Partner, role: string, email: string): string | null {
  const n = nextStage(p); if (!n) return null
  const miss = missingChecks(p, p.stage); if (miss.length) return `Still to do: ${miss.map(m => m.label).join('; ')}.`
  if (p.stage === 'agreement' && !p.discount.trim()) return 'Record the member benefit or discount first (or write "none").'
  if ((p.stage === 'verification') && trackOf(p) === 'professional' && !p.license.trim()) return 'Enter the license number first.'
  if (n === 'listed') {
    if (p.status === 'paused') return 'Resolve the complaint and resume the partner first.'
    if (p.agreementStatus !== 'signed') return 'Mark the agreement as signed (Agreement status) before listing.'
    const t = trackOf(p)
    if (t === 'institution' && role !== 'board') return 'Institutional partners need board approval to go live.'
    if (t === 'professional' && role !== 'ops' && role !== 'board') return 'Only the operations lead or the board can list a partner.'
    if ((p.vettedBy ?? '').toLowerCase() === email.toLowerCase()) return 'You vetted this partner, so someone else must approve listing.'
  }
  return null
}

export function expiring(p: Partner, days = 60): { what: string; date: string; left: number }[] {
  const out: { what: string; date: string; left: number }[] = []
  ;([['License', p.licenseExpires], ['Insurance', p.insuranceExpires], ['Agreement', p.agreementExpires], ['Annual review', p.reviewDue]] as const).forEach(([what, date]) => {
    if (!date) return; const left = Math.ceil((new Date(date + 'T12:00').getTime() - Date.now()) / 864e5); if (left <= days) out.push({ what, date, left })
  })
  return out
}

export const DISCLAIMER = 'Providers in this directory are independent. The community has checked their license and insurance but does not endorse them, guarantee their work, or give legal, tax, insurance or financial advice. Members choose and pay providers directly and should confirm fees and terms in writing before hiring.'
export const introMessage = (p: Partner) => `Meet ${p.name}${p.kind ? `, a ${p.kind.toLowerCase()}` : ''} in our member network.${p.discount && p.discount.toLowerCase() !== 'none' ? ` Members get: ${p.discount}.` : ''} Reply time target: ${p.slaHours} hours. ${DISCLAIMER}`
