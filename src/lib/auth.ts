import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [isAdmin, setAdmin] = useState(false)
  const [hasThuy, setHasThuy] = useState(false)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    setAdmin(false)
    if (!supabase || !session) return
    supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data }) => setAdmin(!!data))
  }, [session])
  useEffect(() => {
    setHasThuy(false)
    if (!supabase || !session) return
    supabase.rpc('has_course_access').then(({ data }) => setHasThuy(data === true))
  }, [session])
  return { session, ready, isAdmin, hasThuy }
}
