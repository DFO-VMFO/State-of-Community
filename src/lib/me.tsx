import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from './auth'
import { useCollection } from './collections'
import type { Household, Person } from './types'

// One household, several adults. Shared things (dues, card, family goals, clubs, events) belong to the household.
// Private things (immigration dates, papers, credit goals, votes, setup progress) belong to one person.
export const headId = (householdId: string) => `p-${householdId}`
export const ownerOf = (x: { personId?: string; householdId: string }) => x.personId ?? headId(x.householdId)

export const seedPeople = (): Person[] => [
  { id: 'p-partner-seed-3', householdId: 'seed-3', name: 'Demo partner', email: 'household3b@example.com', role: 'partner', status: 'active', invitedBy: headId('seed-3'), at: '2026-09-01' },
  { id: 'p-partner-seed-5', householdId: 'seed-5', name: 'Demo partner', email: 'household5b@example.com', role: 'partner', status: 'invited', invitedBy: headId('seed-5'), at: '2026-10-10' },
]

export interface Me { personId: string; name: string; isHead: boolean; people: Person[]; savePerson: (p: Person) => Promise<void>; removePerson: (id: string) => Promise<void> }
const MeCtx = createContext<Me>({ personId: '', name: '', isHead: true, people: [], savePerson: async () => {}, removePerson: async () => {} })
export const useMe = () => useContext(MeCtx)

export function MeProvider({ h, children }: { h: Household; children: ReactNode }) {
  const { session } = useAuth(); const col = useCollection<Person>('people', seedPeople, true)
  const value = useMemo<Me>(() => {
    const head: Person = { id: headId(h.id), householdId: h.id, name: h.headName, email: h.email, role: 'head', status: 'active', at: h.joinedAt }
    const people = [head, ...col.items.filter(p => p.householdId === h.id)]
    const want = session?.kind === 'member' ? session.personId : undefined
    const me = people.find(p => p.id === want) ?? head
    return { personId: me.id, name: me.name, isHead: me.role === 'head', people, savePerson: col.save, removePerson: col.remove }
  }, [h, col.items, col.save, col.remove, session])
  return <MeCtx.Provider value={value}>{children}</MeCtx.Provider>
}
