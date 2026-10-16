import { useCallback, useEffect, useState } from 'react'
import { useCollection } from './collections'
import { seedStaff } from './seed'
import { supabase } from './supabase'
import type { StaffMember } from './types'

// Staff directory. Cloud: `staff` table (only the Operations lead can edit). Demo: browser storage.
export function useStaff() {
  const local = useCollection<StaffMember>('staff', seedStaff)
  const [items, setItems] = useState<StaffMember[]>([])
  const reload = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('soc_staff').select('email,name,role')
    setItems((data ?? []).map(r => ({ id: r.email, email: r.email, name: r.name ?? r.email, role: r.role })))
  }, [])
  useEffect(() => { void reload() }, [reload])
  if (!supabase) return { items: local.items, save: local.save, remove: local.remove }
  return {
    items,
    save: async (m: StaffMember) => { await supabase!.from('soc_staff').upsert({ email: m.email.toLowerCase(), name: m.name, role: m.role }); await reload() },
    remove: async (id: string) => { await supabase!.from('soc_staff').delete().eq('email', id); await reload() },
  }
}
