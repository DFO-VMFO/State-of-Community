import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { verifyMember, type Verified } from '../lib/store'
import { edition } from '../lib/edition'

// Public page opened by scanning a member card. Shows no sensitive data.
export default function Verify() {
  const { code = '' } = useParams()
  const [res, setRes] = useState<Verified | null | undefined>(undefined)
  useEffect(() => { void verifyMember(code).then(setRes) }, [code])
  const ok = res && res.status === 'active'
  return (
    <div className="grid min-h-screen place-items-center bg-field px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-6 text-center">
        <p className="font-display text-sm font-semibold text-mute">{edition.name}</p>
        {res === undefined ? <p className="mt-6 text-mute">Checking…</p> : (
          <>
            <div aria-hidden className={`mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full text-3xl font-bold ${ok ? 'bg-forest text-sun' : 'bg-crane text-white'}`}>{ok ? '✓' : '!'}</div>
            <h1 className="mt-4 font-display text-2xl font-bold">{ok ? 'Active member' : res ? `Membership ${res.status}` : 'Card not found'}</h1>
            {res ? (
              <dl className="mt-4 space-y-1 text-sm">
                <div><dt className="inline text-mute">Card </dt><dd className="inline font-mono">{res.memberCode}</dd></div>
                <div><dt className="inline text-mute">Household </dt><dd className="inline font-semibold">{res.initials}</dd></div>
                <div><dt className="inline text-mute">Plan </dt><dd className="inline capitalize">{res.tier}</dd></div>
                <div><dt className="inline text-mute">Member since </dt><dd className="inline">{res.since}</dd></div>
              </dl>
            ) : <p className="mt-3 text-sm text-mute">No member matches “{code}”. Ask the member to show the card again or contact staff.</p>}
          </>
        )}
      </div>
    </div>
  )
}
