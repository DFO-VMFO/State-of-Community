// Creates a Stripe Checkout link for ONE dues payment. The amount comes from the database, never from the browser.
// Secrets: STRIPE_SECRET_KEY, SITE_URL (the portal address). Deploy with verify_jwt = true.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { paymentId } = await req.json().catch(() => ({}))
  if (!paymentId) return json({ error: 'paymentId required' }, 400)
  // Read the payment as the signed-in person: row security means members see only their own household's, staff see all.
  const as = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data } = await as.from('soc_records').select('data').eq('collection', 'payments').eq('id', paymentId).maybeSingle()
  const p = data?.data as { householdId: string; month: string; amount: number; status: string } | undefined
  if (!p) return json({ error: 'Payment not found' }, 404)
  if (p.status === 'paid') return json({ error: 'Already paid' }, 409)
  const site = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
  const form = new URLSearchParams({
    mode: 'payment', success_url: `${site}/#/`, cancel_url: `${site}/#/`,
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(Math.round(Number(p.amount) * 100)),
    'line_items[0][price_data][product_data][name]': `Community dues ${p.month}`,
    'metadata[paymentId]': paymentId, 'metadata[householdId]': p.householdId,
  })
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  const j = await res.json()
  if (!res.ok) return json({ error: j.error?.message ?? 'Stripe error' }, 502)
  return json({ url: j.url })
})
