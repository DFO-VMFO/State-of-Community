// Sends a broadcast. Staff only (ops or support). Test with your own number first.
// Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (an approved template with one {{1}} body variable), RESEND_API_KEY, RESEND_FROM
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type' }
type R = { name: string; phone: string; email: string }

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const as = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: role } = await as.rpc('soc_staff_role')
  if (role !== 'ops' && role !== 'support') return new Response(JSON.stringify({ error: 'Staff only' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })
  const { channel, subject, body, recipients } = await req.json() as { channel: string; subject: string; body: string; recipients: R[] }
  let failed = 0
  for (const r of recipients) {
    const text = body.replace('{name}', r.name.split(' ')[0])
    let ok = false
    if (channel === 'whatsapp') {
      const res = await fetch(`https://graph.facebook.com/v20.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: r.phone.replace(/\D/g, ''), type: 'template', template: { name: Deno.env.get('WHATSAPP_TEMPLATE'), language: { code: 'en_US' }, components: [{ type: 'body', parameters: [{ type: 'text', text }] }] } }),
      }); ok = res.ok
    } else if (channel === 'email') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: Deno.env.get('RESEND_FROM'), to: r.email, subject, text }),
      }); ok = res.ok
    }
    if (!ok) failed++
  }
  return new Response(JSON.stringify({ sent: recipients.length - failed, failed }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: failed === recipients.length && failed > 0 ? 502 : 200 })
})
