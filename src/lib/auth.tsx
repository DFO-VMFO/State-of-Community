import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Role } from './types'

export type Session =
  | { kind: 'staff'; role: Role; email: string; name: string }
  | { kind: 'member'; householdId: string; email: string; personId?: string }

interface Ctx { session: Session | null; loading: boolean; noAccess: string | null; signOut: () => void; demoSignIn: (s: Session) => void }
const AuthCtx = createContext<Ctx>({ session: null, loading: true, noAccess: null, signOut: () => {}, demoSignIn: () => {} })
export const useAuth = () => useContext(AuthCtx)

const KEY = 'soc.session.v1'
const readDemo = (): Session | null => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null } catch { return null } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(supabase ? null : readDemo())
  const [loading, setLoading] = useState(!!supabase)
  const [noAccess, setNoAccess] = useState<string | null>(null)

  const resolve = useCallback(async (email: string | undefined) => {
    if (!supabase || !email) { setSession(null); setLoading(false); return }
    const { data, error } = await supabase.rpc('soc_whoami')
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row || !row.kind) { setSession(null); setNoAccess(email) }
    else if (row.kind === 'staff') { setNoAccess(null); setSession({ kind: 'staff', role: row.role as Role, email, name: row.name ?? email }) }
    else { setNoAccess(null); setSession({ kind: 'member', householdId: row.household_id, email, personId: row.person_id ?? undefined }); void supabase.rpc('soc_activate_person') }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => resolve(data.session?.user.email))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { void resolve(s?.user.email) })
    return () => data.subscription.unsubscribe()
  }, [resolve])

  const signOut = () => {
    if (supabase) void supabase.auth.signOut(); else { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
    setSession(null); setNoAccess(null)
  }
  const demoSignIn = (s: Session) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } setSession(s) }
  return <AuthCtx.Provider value={{ session, loading, noAccess, signOut, demoSignIn }}>{children}</AuthCtx.Provider>
}
