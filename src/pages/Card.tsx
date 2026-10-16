import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { edition } from '../lib/edition'
import type { Household } from '../lib/types'

export function MemberCard({ h }: { h: Household }) {
  const url = `${location.origin}${location.pathname}#/verify/${h.memberCode}`
  const t = edition.tiers[h.tier]
  return (
    <div className="weave relative aspect-[1.586/1] overflow-hidden rounded-2xl bg-forest p-5 text-white shadow-lg">
        <div className="absolute inset-y-0 left-0 w-2 bg-sun" aria-hidden />
        <div className="flex h-full flex-col justify-between pl-2">
          <div>
            <p className="font-display text-lg font-bold leading-tight">{edition.name}</p>
            <p className="text-xs text-white/70">{t.label} household</p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-bold">{h.headName}</p>
              <p className="font-mono text-sm tracking-wider text-sun">{h.memberCode}</p>
              <p className="mt-1 text-xs text-white/70">Since {h.joinedAt} · {h.status}</p>
            </div>
            <div className="rounded-lg bg-white p-1.5"><QRCodeSVG value={url} size={84} level="M" title={`Verify ${h.memberCode}`} /></div>
          </div>
        </div>
    </div>
  )
}

export default function Card({ households }: { households: Household[] }) {
  const { id } = useParams(); const h = households.find(x => x.id === id)
  if (!h) return <p>Member not found. <Link className="underline" to="/members">Back to members</Link></p>
  const url = `${location.origin}${location.pathname}#/verify/${h.memberCode}`
  const t = edition.tiers[h.tier]
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="print:hidden">
        <h1 className="font-display text-3xl font-bold">Membership card</h1>
        <p className="text-mute">Scanning the code opens a page that confirms status and shows nothing private.</p>
      </div>
      <MemberCard h={h} />
      <div className="flex gap-2 print:hidden">
        {window.self === window.top && <button className="btn-primary" onClick={() => window.print()}>Print card</button>}
        <Link className="btn-ghost" to={`/members/${h.id}`}>Edit household</Link>
        <a className="btn-ghost" href={url}>Open verify page</a>
      </div>
      <p className="text-xs text-mute print:hidden">Plan benefits: {t.perks}.</p>
    </div>
  )
}
