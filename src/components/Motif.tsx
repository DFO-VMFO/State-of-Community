import { hueHex } from '../lib/catalog'
import type { Hue } from '../lib/types'

// Geometric patterns inspired by bark-cloth and basketry. n picks the pattern.
export function Motif({ n = 0, hue = 'forest', className = '' }: { n?: number; hue?: Hue; className?: string }) {
  const c = hueHex[hue]; const id = `m${n}-${hue}`
  const shapes = [
    <path key="a" d="M0 12 L12 0 L24 12 L12 24Z" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />,
    <circle key="b" cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />,
    <path key="c" d="M0 6 H24 M0 18 H24" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />,
    <path key="d" d="M0 24 L24 0 M-6 6 L6 -6 M18 30 L30 18" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />,
    <path key="e" d="M12 2 V22 M2 12 H22" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />,
    <path key="f" d="M0 12 Q6 0 12 12 T24 12" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />,
  ]
  return (
    <svg className={className} aria-hidden preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs><pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">{shapes[n % shapes.length]}</pattern></defs>
      <rect width="100%" height="100%" fill={c} /><rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function Ring({ pct, size = 72, label }: { pct: number; size?: number; label?: string }) {
  const r = size / 2 - 6; const circ = 2 * Math.PI * r; const p = Math.max(0, Math.min(1, pct))
  return (
    <svg width={size} height={size} role="img" aria-label={`${Math.round(p * 100)} percent`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D5DAD4" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p >= 1 ? '#F2B705' : '#0F3D3A'} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-ink font-display font-bold" fontSize={size / 4.2}>{label ?? `${Math.round(p * 100)}%`}</text>
    </svg>
  )
}
