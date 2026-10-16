import { writeFileSync } from 'node:fs'
import { edition } from '../src/lib/edition'
import { seedHouseholds, seedPool } from '../src/lib/seed'
import { snapshot } from '../src/lib/stats'
import { buildReport } from '../src/lib/report'
const pool = seedPool()
const doc = await buildReport({ edition, snap: snapshot(seedHouseholds()), pool: { received: pool.filter(e => e.kind === 'contribution').reduce((a, e) => a + e.amount, 0), paidOut: 0 }, sample: true, date: new Date() })
writeFileSync(process.argv[2], Buffer.from(doc.output('arraybuffer')))
