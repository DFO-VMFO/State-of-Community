// Delivers the outbox via Resend (email) and the WhatsApp Cloud API. Test once with your own email and number.
//
// The hourly pg_cron job calls it with the header x-cron-key, checked against the Vault secret via soc_cron_key_ok().
// The same function is the WhatsApp webhook: set Meta's callback URL to  <function-url>?hook=whatsapp  (verify token = WHATSAPP_VERIFY_TOKEN).
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set by Supabase),
//          RESEND_API_KEY, RESEND_FROM (e.g. "Ugandan Community of DFW <hello@yourdomain.org>"),
//          WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (approved template with 2 body variables: {{1}} subject, {{2}} message),
//          WHATSAPP_VERIFY_TOKEN, optional WHATSAPP_LANG (default en_US).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
type Row = { id: string; data: Record<string, unknown> }
const today = () => new Date().toISOString().slice(0, 10)

async function setOptOut(phoneDigits: string) {
  const { data } = await db.from('soc_households').select('id,data')
  for (const h of data ?? []) if (String((h.data as Record<string, unknown>).phone ?? '').replace(/\D/g, '').endsWith(phoneDigits.slice(-10))) {
    await db.from('soc_households').update({ data: { ...(h.data as object), whatsappOptIn: false } }).eq('id', h.id)
  }
}

serve(async req => {
  const url = new URL(req.url)
  if (url.searchParams.get('hook') === 'whatsapp') {
    if (req.method === 'GET') return url.searchParams.get('hub.verify_token') === Deno.env.get('WHATSAPP_VERIFY_TOKEN') ? new Response(url.searchParams.get('hub.challenge')) : new Response('forbidden', { status: 403 })
    const body = await req.json().catch(() => ({}))
    for (const e of body.entry ?? []) for (const c of e.changes ?? []) for (const m of c.value?.messages ?? [])
      if (/^\s*(stop|unsubscribe|cancel|end|quit)\s*$/i.test(m.text?.body ?? '')) await setOptOut(String(m.from))
    return new Response('ok')
  }
  const { data: keyOk } = await db.rpc('soc_cron_key_ok', { k: req.headers.get('x-cron-key') ?? '' })
  if (keyOk !== true) return new Response('forbidden', { status: 403 })

  const { data: queued } = await db.from('soc_records').select('id,data').eq('collection', 'outbox').filter('data->>status', 'eq', 'queued').filter('data->>sendOn', 'lte', today()).limit(200)
  const { data: hhs } = await db.from('soc_households').select('id,data')
  const { data: ppl } = await db.from('soc_records').select('id,data').eq('collection', 'people')
  const tally = { sent: 0, skipped: 0, failed: 0 }
  for (const row of (queued ?? []) as Row[]) {
    const o = row.data as Record<string, string>
    const h = hhs?.find(x => x.id === o.householdId)?.data as Record<string, unknown> | undefined
    const person = o.personId ? (ppl ?? []).find(p => p.id === o.personId)?.data as Record<string, string> | undefined : undefined
    const finish = async (status: string, reason?: string) => { await db.from('soc_records').update({ data: { ...o, status, reason, sentAt: status === 'sent' ? new Date().toISOString() : undefined } }).eq('collection', 'outbox').eq('id', row.id); tally[status as 'sent'] = (tally[status as 'sent'] ?? 0) + 1 }
    if (!h) { await finish('skipped', 'no household'); continue }
    try {
      if (o.channel === 'whatsapp') {
        if (!h.whatsappOptIn || !h.phone) { await finish('skipped', 'no WhatsApp opt-in'); continue }
        const res = await fetch(`https://graph.facebook.com/v20.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`, {
          method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: String(h.phone).replace(/\D/g, ''), type: 'template', template: { name: Deno.env.get('WHATSAPP_TEMPLATE'), language: { code: Deno.env.get('WHATSAPP_LANG') ?? 'en_US' }, components: [{ type: 'body', parameters: [{ type: 'text', text: o.subject }, { type: 'text', text: o.body }] }] } }),
        })
        res.ok ? await finish('sent') : await finish('failed', `WhatsApp ${res.status}`)
      } else {
        const to = person?.email ?? (h.email as string); if (!to) { await finish('skipped', 'no email'); continue }
        const footer = '\n\nTo change what we send you, open Account in the portal. Reply STOP to any WhatsApp message to stop those.'
        const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: Deno.env.get('RESEND_FROM'), to, subject: o.subject, text: o.body + footer }) })
        res.ok ? await finish('sent') : await finish('failed', `Resend ${res.status}`)
      }
    } catch (e) { await finish('failed', String(e).slice(0, 120)) }
  }
  return new Response(JSON.stringify(tally), { headers: { 'Content-Type': 'application/json' } })
})
