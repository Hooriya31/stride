import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(undefined)

function normalizeEmail(email = '') {
  return email.trim().toLowerCase()
}

export function AuthProvider({ children }) {
  const mountedRef = useRef(true)

  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const applySession = useCallback((nextSession) => {
    setSession(nextSession ?? null)
    setUser(nextSession?.user ?? null)
  }, [])

  const safeFinishInit = useCallback(() => {
    if (!mountedRef.current) return
    setLoading(false)
    setInitialized(true)
  }, [])

  const runAuthAction = useCallback(async (action) => {
    try {
      const result = await action()
      return result
    } catch (err) {
      return {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        },
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    let authSubscription = null

    async function bootstrapAuth() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (error) {
          console.error('Error getting initial session:', error.message)
        }

        applySession(currentSession)
      } catch (err) {
        if (!mountedRef.current) return
        console.error('Unexpected auth bootstrap error:', err)
        applySession(null)
      } finally {
        safeFinishInit()
      }
    }

    bootstrapAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current) return
      applySession(nextSession)
      setLoading(false)
      setInitialized(true)
    })

    authSubscription = subscription

    return () => {
      mountedRef.current = false
      authSubscription?.unsubscribe?.()
    }
  }, [applySession, safeFinishInit])

  const signUp = useCallback(async (email, password) => {
    const cleanEmail = normalizeEmail(email)

    if (!cleanEmail || !password) {
      return {
        data: null,
        error: { message: 'Email and password are required.' },
      }
    }

    return runAuthAction(() =>
      supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      })
    )
  }, [runAuthAction])

  const signIn = useCallback(async (email, password) => {
    const cleanEmail = normalizeEmail(email)

    if (!cleanEmail || !password) {
      return {
        data: null,
        error: { message: 'Email and password are required.' },
      }
    }

    return runAuthAction(() =>
      supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
    )
  }, [runAuthAction])

  const signOut = useCallback(async () => {
    return runAuthAction(() => supabase.auth.signOut())
  }, [runAuthAction])

  const sendPasswordReset = useCallback(async (email) => {
    const cleanEmail = normalizeEmail(email)

    if (!cleanEmail) {
      return {
        data: null,
        error: { message: 'Email is required.' },
      }
    }

    return runAuthAction(() =>
      supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    )
  }, [runAuthAction])

  const refreshSession = useCallback(async () => {
    const result = await runAuthAction(() => supabase.auth.refreshSession())

    if (result?.data?.session) {
      applySession(result.data.session)
    }

    return result
  }, [applySession, runAuthAction])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      initialized,
      isAuthenticated: !!user,

      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      refreshSession,
    }),
    [
      user,
      session,
      loading,
      initialized,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      refreshSession,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}