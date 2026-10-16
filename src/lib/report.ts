import type { edition as Edition } from './edition'
import type { Slice, Snapshot } from './stats'

export interface ReportOpts { edition: typeof Edition; snap: Snapshot; pool: { received: number; paidOut: number }; sample: boolean; date: Date }
type RGB = [number, number, number]
const C = { forest: [15, 61, 58] as RGB, sun: [242, 183, 5] as RGB, ink: [23, 32, 30] as RGB, mute: [91, 103, 98] as RGB, line: [213, 218, 212] as RGB, field: [241, 243, 239] as RGB, crane: [200, 55, 45] as RGB, white: [255, 255, 255] as RGB }
const M = 48, W = 612, CW = W - M * 2
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

// Builds a print-ready PDF with vector text and bars. Runs in the browser and in Node.
export async function buildReport(o: ReportOpts) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const s = o.snap
  const font = (size: number, bold = false, color: RGB = C.ink) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color) }
  const fill = (c: RGB) => doc.setFillColor(...c)
  const para = (t: string, x: number, y: number, w: number, lh = 13) => { const lines = doc.splitTextToSize(t, w) as string[]; doc.text(lines, x, y, { lineHeightFactor: lh / doc.getFontSize() }); return y + lines.length * lh }
  const bar = (x: number, y: number, w: number, pct: number, color: RGB, h = 6) => { fill(C.field); doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F'); if (pct > 0) { fill(color); doc.roundedRect(x, y, Math.max(h, (w * Math.min(100, pct)) / 100), h, h / 2, h / 2, 'F') } }
  const h2 = (t: string, y: number) => { font(14, true, C.forest); doc.text(t, M, y); return y + 8 }

  // Page 1
  fill(C.forest); doc.rect(0, 0, W, 122, 'F'); fill(C.sun); doc.rect(0, 122, W, 5, 'F')
  font(27, true, C.white); doc.text('State of the Community', M, 62)
  font(14, false, C.white); doc.text(o.edition.name, M, 84)
  font(10, false, [200, 220, 216]); doc.text(`${o.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} snapshot`, M, 103)
  if (o.sample) { fill(C.crane); doc.roundedRect(W - M - 96, 40, 96, 22, 4, 4, 'F'); font(9, true, C.white); doc.text('SAMPLE DATA', W - M - 48, 54.5, { align: 'center' }) }
  font(10.5); let y = para(`This report shows who we are and what we need, based on answers from ${s.n} households (${s.people} people) who agreed to be counted. Only totals are shown. Any group smaller than ${o.edition.kMin} households is combined with others so no household can be identified.${o.sample ? ' The figures in this copy are sample data for demonstration and do not describe real people.' : ''}`, M, 156, CW, 14)

  const kpis: [string, string][] = [[String(s.people), 'People in these households'], [s.medianBand, 'Typical household income'], [`${s.homeownership}%`, 'Own their home'], [`${s.uninsured}%`, 'Without health insurance'],
    [`${s.lifeGap}%`, 'Without life insurance beyond work cover'], [`${s.mismatch}%`, 'Degree and job do not match (foreign-educated)'], [`${s.remitters}%`, `Send money to ${o.edition.country}`], [`${s.wtpPct}%`, 'Would pay for group benefits']]
  y += 10; const bw = (CW - 36) / 4
  kpis.forEach(([v, l], i) => {
    const x = M + (i % 4) * (bw + 12), by = y + Math.floor(i / 4) * 80
    fill(C.field); doc.roundedRect(x, by, bw, 68, 4, 4, 'F'); font(v.length > 7 ? 15 : 21, true, C.forest); doc.text(v, x + 10, by + 28)
    font(8.5, false, C.mute); doc.text(doc.splitTextToSize(l, bw - 20) as string[], x + 10, by + 43)
  })
  y += 176; y = h2('What members want and what exists', y) + 8
  font(9, false, C.mute); doc.text('Share of households calling each service essential or high priority.', M, y); y += 16
  s.demand.forEach(d => {
    font(10, false, C.ink); doc.text(d.name, M, y)
    font(10, true, C.ink); doc.text(`${d.demandPct}%`, W - M - 100, y, { align: 'right' })
    font(8.5, true, d.launched ? C.forest : C.crane); doc.text(d.launched ? 'Offered' : 'Not offered yet', W - M, y, { align: 'right' })
    bar(M, y + 5, CW, d.demandPct, C.sun); y += 29
  })

  // Page 2
  doc.addPage(); y = h2('Who we are', 64) + 14
  const blocks: [string, Slice[]][] = [['Work', s.sector], ['Household income', s.income], ['Housing', s.housing], ['Health insurance', s.insurance], ['Generation', s.generation], ['Biggest missing service', s.needs]]
  const bwid = (CW - 28) / 2
  for (let r = 0; r < 3; r++) {
    const pair = blocks.slice(r * 2, r * 2 + 2); const rows = Math.max(...pair.map(p => p[1].length), 1)
    pair.forEach(([title, data], c) => {
      const x = M + c * (bwid + 28); const total = data.reduce((a, d) => a + d.value, 0) || 1
      font(11, true, C.forest); doc.text(title, x, y)
      data.forEach((d, i) => {
        const yy = y + 20 + i * 24; const p = Math.round((d.value / total) * 100)
        font(9, false, d.hidden ? C.mute : C.ink); doc.text(d.name, x, yy); font(9, true, C.ink); doc.text(`${p}%`, x + bwid, yy, { align: 'right' })
        bar(x, yy + 4, bwid, p, d.hidden ? C.line : C.forest, 5)
      })
      if (!data.length) { font(9, false, C.mute); doc.text('Not enough responses to show safely.', x, y + 20) }
    })
    y += 28 + rows * 24 + 14
  }

  // Page 3
  doc.addPage(); y = h2('The community fund', 64) + 14
  const bal = o.pool.received - o.pool.paidOut; const f: [string, string][] = [['Contributions received', money(o.pool.received)], ['Paid out to families', money(o.pool.paidOut)], ['Balance held', money(bal)]]
  const fw = (CW - 24) / 3
  f.forEach(([l, v], i) => { const x = M + i * (fw + 12); fill(i === 2 ? C.forest : C.field); doc.roundedRect(x, y, fw, 62, 4, 4, 'F'); font(20, true, i === 2 ? C.white : C.forest); doc.text(v, x + 12, y + 28); font(9, false, i === 2 ? [200, 220, 216] : C.mute); doc.text(l, x + 12, y + 46) })
  y += 82; font(10); y = para('The bereavement and mutual aid fund is kept apart from operating money. Members can see every contribution and payout in this report so they know how it is used.', M, y, CW, 14) + 22
  y = h2('What we will build first', y) + 12
  const gaps = s.demand.filter(d => !d.launched).slice(0, 3)
  font(10); gaps.forEach(g => { const y0 = y; y = para(`${g.name}: ${g.demandPct}% of households (${g.households}) rate it essential or high priority, and it is not offered yet.`, M + 12, y, CW - 12, 14) + 6; fill(C.sun); doc.circle(M + 3, y0 - 3, 2.5, 'F') })
  y += 16; y = h2('How to read this report', y) + 12
  font(9.5, false, C.mute)
  ;['Answers are reported by households themselves and have not been verified.', 'Households who chose not to be counted are left out of every figure.', `Percentages are rounded. Groups under ${o.edition.kMin} households are combined as "other".`, 'This is a snapshot of one moment. Compare it with the next report to see change.'].forEach(t => { const y0 = y; y = para(t, M + 12, y, CW - 12, 13) + 5; fill(C.mute); doc.circle(M + 3, y0 - 3, 1.8, 'F') })

  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) { doc.setPage(p); fill(C.line); doc.rect(M, 744, CW, 0.6, 'F'); font(8, false, C.mute); doc.text(`${o.edition.name} · State of the Community`, M, 760); doc.text(`Page ${p} of ${n}`, W - M, 760, { align: 'right' }) }
  return doc
}
