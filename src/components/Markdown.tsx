import type { ReactNode } from 'react'

// Tiny, safe markdown: headings, lists, bold, italics, links. Everything is rendered as React text, never raw HTML.
function inline(t: string, vars: Record<string, string>): ReactNode[] {
  const withVars = t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`)
  const out: ReactNode[] = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|mailto:|#)[^)\s]*\))/g; let last = 0; let m: RegExpExecArray | null; let i = 0
  const mark = (s: string, k: number): ReactNode => /^\[[^\]]*\]$/.test(s) ? <mark key={k} className="rounded bg-sun-100 px-1">{s}</mark> : s
  const text = (s: string) => s.split(/(\[[^\]]*\])/g).map((p, j) => mark(p, j + 1000 * i))
  while ((m = re.exec(withVars))) {
    if (m.index > last) out.push(...text(withVars.slice(last, m.index)))
    const tok = m[0]; i++
    if (tok.startsWith('**')) out.push(<strong key={`b${i}`}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*')) out.push(<em key={`i${i}`}>{tok.slice(1, -1)}</em>)
    else { const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!; out.push(<a key={`a${i}`} href={mm[2]} className="underline" {...(mm[2]!.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{mm[1]}</a>) }
    last = m.index + tok.length
  }
  if (last < withVars.length) out.push(...text(withVars.slice(last)))
  return out
}

export default function Markdown({ text, vars = {} }: { text: string; vars?: Record<string, string> }) {
  const blocks: ReactNode[] = []; const lines = text.replace(/\r/g, '').split('\n'); let list: { ordered: boolean; items: string[] } | null = null; let para: string[] = []
  const flushP = () => { if (para.length) { blocks.push(<p key={blocks.length} className="leading-relaxed">{inline(para.join(' '), vars)}</p>); para = [] } }
  const flushL = () => { if (list) { const Tag = list.ordered ? 'ol' : 'ul'; blocks.push(<Tag key={blocks.length} className={`${list.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-6`}>{list.items.map((x, i) => <li key={i}>{inline(x, vars)}</li>)}</Tag>); list = null } }
  for (const raw of lines) {
    const l = raw.trimEnd()
    const h = /^(#{1,3})\s+(.*)$/.exec(l); const ul = /^[-*]\s+(.*)$/.exec(l); const ol = /^\d+\.\s+(.*)$/.exec(l)
    if (h) { flushP(); flushL(); const lvl = h[1]!.length; blocks.push(lvl === 1 ? <h2 key={blocks.length} className="font-display text-2xl font-bold">{inline(h[2]!, vars)}</h2> : <h3 key={blocks.length} className={`font-display font-semibold ${lvl === 2 ? 'mt-2 text-xl' : 'text-lg'}`}>{inline(h[2]!, vars)}</h3>) }
    else if (ul || ol) { flushP(); const ordered = !!ol; if (list && list.ordered !== ordered) flushL(); list = list ?? { ordered, items: [] }; list.items.push((ul ?? ol)![1]!) }
    else if (!l.trim()) { flushP(); flushL() }
    else { flushL(); para.push(l.trim()) }
  }
  flushP(); flushL()
  return <div className="space-y-3 text-[15px]">{blocks}</div>
}
