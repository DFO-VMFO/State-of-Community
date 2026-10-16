import type { Ticket, TicketCategory } from './types'
export const catLabel: Record<TicketCategory, string> = { bereavement: 'Bereavement', legal: 'Legal', medical: 'Medical', income: 'Lost income', credential: 'Credentials', other: 'Other' }
export const catPriority: Record<TicketCategory, Ticket['priority']> = { bereavement: 'urgent', legal: 'urgent', medical: 'high', income: 'high', credential: 'normal', other: 'normal' }
