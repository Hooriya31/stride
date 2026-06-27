import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabase'
import Logo from './logo'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PASSWORD_LENGTH = 8

// ─── Component ────────────────────────────────────────────────────────────────

function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [message, setMessage]         = useState('')
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking]       = useState(true)

  // Cleanup ref — prevents navigation/state updates after unmount
  const mountedRef    = useRef(true)
  const redirectTimer = useRef(null)

  useEffect(() => {
    mountedRef.current = true

    /**
     * SECURITY: Listen for PASSWORD_RECOVERY event via onAuthStateChange.
     * This is the correct Supabase pattern for reset links — getSession() alone
     * can miss the recovery token exchange that happens on page load.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return

        if (event === 'PASSWORD_RECOVERY') {
          setValidSession(true)
          setChecking(false)
          return
        }

        // If already authenticated via a normal session, allow the form too
        if (event === 'SIGNED_IN' && session) {
          setValidSession(true)
          setChecking(false)
          return
        }
      }
    )

    // Fallback: check existing session for users who already have a recovery session
    async function checkExistingSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mountedRef.current) return

        if (error) {
          console.error('Session check error:', error.message)
          setValidSession(false)
          setChecking(false)
          return
        }

        if (session) {
          setValidSession(true)
        }
      } catch (err) {
        console.error('Unexpected session check error:', err)
        if (mountedRef.current) setValidSession(false)
      } finally {
        // Only finish checking if onAuthStateChange hasn't already done so
        if (mountedRef.current) setChecking(false)
      }
    }

    checkExistingSession()

    return () => {
      mountedRef.current = false
      subscription?.unsubscribe?.()
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [])

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    setError('')
    setMessage('')

    // Validation
    if (!password || !confirm) {
      setError('Please fill in both password fields.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('Could not update password. Please request a new reset link and try again.')
        return
      }

      setMessage('Password updated successfully! Redirecting you to sign in…')

      // Sign out to force a clean re-login with the new password (security)
      await supabase.auth.signOut()

      // Safe redirect with cleanup
      redirectTimer.current = setTimeout(() => {
        if (mountedRef.current) navigate('/auth', { replace: true })
      }, 2200)
    } catch (err) {
      console.error('Unexpected password update error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div
        role="status"
        aria-label="Verifying reset link"
        className="min-h-screen bg-[#f0fafa] flex items-center justify-center"
      >
        <p className="text-gray-500">Verifying reset link…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0fafa] flex flex-col">
      <nav aria-label="Reset password navigation" className="bg-white shadow-sm px-6 md:px-10 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/"><Logo /></Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">Set a new password</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Choose a new password for your Stride account.
          </p>

          {/* Invalid / expired link */}
          {!validSession ? (
            <div
              role="alert"
              className="mt-6 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
            >
              This reset link is invalid or has expired.{' '}
              <Link to="/auth" className="underline text-[#0a9396]">
                Request a new one
              </Link>.
            </div>
          ) : message ? (
            /* Success — show message, redirect fires in background */
            <div
              role="status"
              aria-live="polite"
              className="mt-6 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3"
            >
              {message}
            </div>
          ) : (
            /* Password form */
            <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
              {/* New password */}
              <div>
                <label
                  htmlFor="reset-password"
                  className="text-sm font-semibold text-gray-700 mb-1 block"
                >
                  New password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="reset-confirm"
                  className="text-sm font-semibold text-gray-700 mb-1 block"
                >
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value)
                    if (error) setError('')
                  }}
                  autoComplete="new-password"
                  placeholder="Same password again"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
