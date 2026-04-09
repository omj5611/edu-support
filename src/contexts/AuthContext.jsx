import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(undefined)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                await loadProfile(session.user)
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setSession(null)
                setProfile(null)
            } else if (event === 'SIGNED_IN') {
                setSession(session)
                if (session?.user) loadProfile(session.user)
            } else if (event === 'TOKEN_REFRESHED') {
                setSession(session)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    async function loadProfile(authUser) {
        try {
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle()

            if (data) {
                setProfile(data)
            } else {
                // RLS 차단 → user_metadata fallback
                setProfile({
                    id: authUser.id,
                    email: authUser.email,
                    role: authUser.user_metadata?.role ?? null,
                    brand: authUser.user_metadata?.brand ?? null,
                    metadata: authUser.user_metadata ?? {},
                })
            }
        } catch {
            setProfile({
                id: authUser.id,
                email: authUser.email,
                role: authUser.user_metadata?.role ?? null,
                brand: authUser.user_metadata?.brand ?? null,
                metadata: authUser.user_metadata ?? {},
            })
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setProfile(null)
    }

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            profile,
            role: profile?.role ?? session?.user?.user_metadata?.role ?? null,
            brand: profile?.brand ?? session?.user?.user_metadata?.brand ?? null,
            loading,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}