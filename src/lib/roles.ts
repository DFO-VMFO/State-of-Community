import type { Role } from './types'

export type Area = 'dashboard' | 'members' | 'submissions' | 'dues' | 'support' | 'partners' | 'broadcasts' | 'projections' | 'status' | 'report' | 'staff' | 'delete' | 'community' | 'finance' | 'investments' | 'content' | 'analytics'

export const roleInfo: Record<Role, { label: string; blurb: string }> = {
  ops: { label: 'Operations lead', blurb: 'Everything, including dues, staff and deleting records.' },
  support: { label: 'Support manager', blurb: 'Members, survey replies, support requests and broadcasts.' },
  data: { label: 'Data specialist', blurb: 'Members, survey replies, the dashboard and the PDF report.' },
  partnerships: { label: 'Partnerships coordinator', blurb: 'Partner vetting and support referrals. Cannot see member records.' },
  board: { label: 'Board treasurer', blurb: 'Oversight: approves large payments and all payroll, locks months, sees the audit log. No member records.' },
}

const matrix: Record<Role, Area[]> = {
  ops: ['dashboard', 'members', 'submissions', 'dues', 'support', 'partners', 'broadcasts', 'projections', 'status', 'report', 'staff', 'delete', 'community', 'finance', 'investments', 'content', 'analytics'],
  support: ['dashboard', 'members', 'submissions', 'support', 'broadcasts', 'community', 'finance', 'content'],
  data: ['dashboard', 'members', 'submissions', 'report', 'analytics'],
  partnerships: ['partners', 'support'],
  board: ['finance', 'investments', 'projections', 'partners'],
}
export const can = (role: Role, area: Area) => matrix[role].includes(area)

export const areaLabel: Record<Area, string> = {
  dashboard: 'Dashboard', members: 'Members', submissions: 'Survey replies', dues: 'Dues', support: 'Support', partners: 'Partners', broadcasts: 'Broadcasts',
  projections: 'Financial model', status: 'Where we are', report: 'PDF report', staff: 'Staff', community: 'Community', finance: 'Finance', investments: 'Investments', content: 'Content', analytics: 'Engagement', delete: 'Delete records',
}
export const areaPath: Partial<Record<Area, string>> = {
  dashboard: '/', members: '/members', submissions: '/submissions', dues: '/dues', support: '/support', partners: '/partners', broadcasts: '/broadcasts',
  projections: '/projections', report: '/report', community: '/community', finance: '/finance', investments: '/investments', content: '/content', analytics: '/engagement', status: '/status', staff: '/staff',
}
export const navAreas: Area[] = ['dashboard', 'members', 'submissions', 'dues', 'finance', 'investments', 'support', 'partners', 'broadcasts', 'community', 'content', 'analytics', 'projections', 'report', 'status', 'staff']
export const allRoles = Object.keys(roleInfo) as Role[]
