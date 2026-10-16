// Creates a Stripe Checkout link for one dues invoice. UNTESTED: use Stripe test keys first.
// Secrets: STRIPE_SECRET_KEY, SITE_URL
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { paymentId, householdId, amount, month } = await req.json()
  const site = Deno.env.get('SITE_URL') ?? ''
  const form = new URLSearchParams({
    mode: 'payment', 'success_url': `${site}/#/dues`, 'cancel_url': `${site}/#/dues`,
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(Math.round(Number(amount) * 100)),
    'line_items[0][price_data][product_data][name]': `Community dues ${month}`,
    'metadata[paymentId]': paymentId, 'metadata[householdId]': householdId,
  })
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  const j = await res.json()
  if (!res.ok) return new Response(JSON.stringify({ error: j.error?.message ?? 'Stripe error' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } })
  return new Response(JSON.stringify({ url: j.url }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
