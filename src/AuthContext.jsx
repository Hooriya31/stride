import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from './supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

// Must match AuthPage.jsx so UI and context enforce the same floor
const MIN_PASSWORD_LENGTH = 8
const MAX_EMAIL_LENGTH    = 254  // RFC 5321 maximum email length

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(undefined)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(email = '') {
  return email.trim().toLowerCase()
}

/**
 * Defense-in-depth email guard.
 * UI validates format — this guards against programmatic misuse.
 */
function validateEmail(email) {
  if (!email) return 'Email is required.'
  if (email.length > MAX_EMAIL_LENGTH) return 'Email address is too long.'
  return null
}

/**
 * Defense-in-depth password guard.
 * UI validates length — this ensures the context can never be called
 * with a short password even if the UI check is bypassed.
 */
function validatePassword(password) {
  if (!password) return 'Password is required.'
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  return null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const mountedRef = useRef(true)

  const [user, setUser]               = useState(null)
  const [session, setSession]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [initialized, setInitialized] = useState(false)

  // ── Session helpers ────────────────────────────────────────────────────────

  const applySession = useCallback((nextSession) => {
    setSession(nextSession ?? null)
    setUser(nextSession?.user ?? null)
  }, [])

  const safeFinishInit = useCallback(() => {
    if (!mountedRef.current) return
    setLoading(false)
    setInitialized(true)
  }, [])

  /**
   * Wraps any Supabase auth call, catches unexpected throws,
   * and always returns { data, error } — never throws to callers.
   */
  const runAuthAction = useCallback(async (action) => {
    try {
      const result = await action()
      return result
    } catch (err) {
      console.error('Auth action error:', err)
      return {
        data: null,
        error: {
          message:
            err instanceof Error
              ? err.message
              : 'Something went wrong. Please try again.',
        },
      }
    }
  }, [])

  // ── Bootstrap ──────────────────────────────────────────────────────────────

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

  // ── Auth actions ───────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (email, password) => {
      const cleanEmail = normalizeEmail(email)

      // Defense-in-depth validation — guards against programmatic bypass of UI
      const emailErr = validateEmail(cleanEmail)
      if (emailErr) return { data: null, error: { message: emailErr } }

      const passErr = validatePassword(password)
      if (passErr) return { data: null, error: { message: passErr } }

      return runAuthAction(() =>
        supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        })
      )
    },
    [runAuthAction]
  )

  const signIn = useCallback(
    async (email, password) => {
      const cleanEmail = normalizeEmail(email)

      const emailErr = validateEmail(cleanEmail)
      if (emailErr) return { data: null, error: { message: emailErr } }

      if (!password) return { data: null, error: { message: 'Password is required.' } }

      return runAuthAction(() =>
        supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
      )
    },
    [runAuthAction]
  )

  const signOut = useCallback(async () => {
    return runAuthAction(() => supabase.auth.signOut())
  }, [runAuthAction])

  const sendPasswordReset = useCallback(
    async (email) => {
      const cleanEmail = normalizeEmail(email)

      const emailErr = validateEmail(cleanEmail)
      if (emailErr) return { data: null, error: { message: emailErr } }

      return runAuthAction(() =>
        supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      )
    },
    [runAuthAction]
  )

  const refreshSession = useCallback(async () => {
    const result = await runAuthAction(() => supabase.auth.refreshSession())

    if (result?.data?.session) {
      // Refresh succeeded — apply the new session
      applySession(result.data.session)
    } else if (result?.error) {
      // Refresh failed — clear stale session so user doesn't appear logged in
      console.error('Session refresh failed:', result.error.message)
      applySession(null)
    }

    return result
  }, [applySession, runAuthAction])

  // ── Context value ──────────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
