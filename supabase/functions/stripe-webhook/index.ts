// Marks a dues invoice paid when Stripe confirms it, and adds the pool share to the ledger. UNTESTED.
// Secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Deploy with --no-verify-jwt.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function valid(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${payload}`))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('') === parts.v1
}

serve(async req => {
  const payload = await req.text()
  if (!await valid(payload, req.headers.get('stripe-signature') ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET')!)) return new Response('bad signature', { status: 400 })
  const event = JSON.parse(payload)
  if (event.type === 'checkout.session.completed') {
    const id = event.data.object.metadata?.paymentId as string
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data } = await db.from('soc_records').select('data').eq('collection', 'payments').eq('id', id).single()
    if (data && data.data.status !== 'paid') {
      const p = { ...data.data, status: 'paid', method: 'Card (Stripe)', paidAt: new Date().toISOString().slice(0, 10) }
      await db.from('soc_records').upsert({ collection: 'payments', id, data: p })
      if (p.poolPortion > 0) await db.from('soc_pool_entries').insert({ kind: 'contribution', amount: p.poolPortion, note: 'Dues pool share (Stripe)' })
    }
  }
  return new Response('ok')
})
