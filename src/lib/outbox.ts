// One queue for everything we send. Rows are written by the daily enqueue job (cloud) or by staff actions,
// and delivered by the send-notifications edge function. Nothing is sent to someone who has not opted in.
export type Channel = 'email' | 'whatsapp'
export type OutKind = 'immigration' | 'event' | 'dues' | 'checkin' | 'welcome' | 'broadcast'
export interface OutboxItem { id: string; key: string; householdId: string; personId?: string; channel: Channel; kind: OutKind; subject: string; body: string; sendOn: string; status: 'queued' | 'sent' | 'skipped' | 'failed'; reason?: string; sentAt?: string }

