import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import Logo from './logo'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PASSWORD_LENGTH = 8
const MAX_ATTEMPTS        = 3
const COOLDOWN_SECONDS    = 30

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate           = useNavigate()
  const location           = useLocation()

  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [error, setError]       = useState('')

  // Rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [cooldownLeft, setCooldownLeft]     = useState(0)
  const cooldownRef = useRef(null)

  useEffect(() => {
    if (cooldownLeft <= 0) return
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          setFailedAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(cooldownRef.current)
  }, [cooldownLeft])

  const isOnCooldown = cooldownLeft > 0
  const from = location.state?.from?.pathname || '/opportunities'

  function clearFeedback() { setError(''); setMessage('') }

  function switchMode(nextMode) {
    setMode(nextMode)
    clearFeedback()
    if (nextMode === 'forgot') setPassword('')
  }

  function recordFailedAttempt() {
    setFailedAttempts((prev) => {
      const next = prev + 1
      if (next >= MAX_ATTEMPTS) setCooldownLeft(COOLDOWN_SECONDS)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || isOnCooldown) return

    setLoading(true)
    clearFeedback()

    const cleanEmail = normalizeEmail(email)

    try {
      if (!cleanEmail) { setError('Please enter your email address.'); return }
      if (!isValidEmail(cleanEmail)) { setError('Please enter a valid email address.'); return }

      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (resetError) {
          setError('Could not send reset email. Please try again.')
        } else {
          setMessage("If that email is registered, you'll receive a reset link shortly.")
        }
        return
      }

      if (!password) { setError('Please enter your password.'); return }
      if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }

      if (mode === 'signup') {
        const { data, error: signUpError } = await signUp(cleanEmail, password)
        if (signUpError) {
          const msg = signUpError.message?.toLowerCase() || ''
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setError('An account with this email already exists. Try signing in instead.')
          } else if (msg.includes('password')) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
          } else {
            setError('Could not create your account. Please try again.')
          }
        } else {
          if (data?.user && !data?.session) {
            setMessage('Account created! Please check your email and confirm your account before signing in.')
          } else {
            setMessage('Account created successfully. You can now sign in.')
          }
          setMode('signin')
          setPassword('')
        }
        return
      }

      // Sign in
      const { error: signInError } = await signIn(cleanEmail, password)
      if (signInError) {
        setError('Incorrect email or password.')
        recordFailedAttempt()
      } else {
        setFailedAttempts(0)
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Unexpected auth error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const headings = {
    signin: 'Welcome back',
    signup: 'Create your Stride account',
    forgot: 'Reset your password',
  }

  const subtext = {
    signin: 'Sign in to explore all opportunities and submit new ones.',
    signup: 'Create your account, then confirm your email to access Stride.',
    forgot: "Enter your email and we'll send you a reset link.",
  }

  const submitLabel = loading
    ? 'Please wait…'
    : mode === 'signin' ? 'Sign In'
    : mode === 'signup' ? 'Create Account'
    : 'Send Reset Link'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa] flex flex-col">

      {/* Nav — Logo links home, no back button text */}
      <nav aria-label="Authentication navigation"
        className="bg-white shadow-sm px-4 md:px-10 py-3">
        <div className="max-w-6xl mx-auto flex items-center">
          <Link to="/" aria-label="Go to Stride home">
            <Logo />
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl w-full">

          {/* Left panel — visible md+ */}
          <div
            className="hidden md:flex flex-col justify-center px-10 py-12 text-white"
            style={{ background: 'linear-gradient(135deg, #0a9396, #5ec4c6)' }}
            aria-hidden="true"
          >
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
              Unlock every opportunity that matters.
            </h1>
            <p className="mt-5 text-white/90 leading-relaxed text-sm lg:text-base">
              Browse scholarships, internships, fellowships, competitions,
              hackathons, research and programs — built for Pakistani students.
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <div className="bg-white/10 rounded-2xl px-4 py-3">✓ Clean curated listings</div>
              <div className="bg-white/10 rounded-2xl px-4 py-3">✓ Deadlines, filters, 7 categories</div>
              <div className="bg-white/10 rounded-2xl px-4 py-3">✓ Submit opportunities after logging in</div>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="px-5 md:px-10 py-8 md:py-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{headings[mode]}</h2>
            <p className="text-gray-500 mt-2 text-sm">{subtext[mode]}</p>

            {/* Rate limit warnings */}
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !isOnCooldown && (
              <div role="status" aria-live="polite"
                className="mt-4 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
                {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts === 1 ? '' : 's'} remaining before a temporary cooldown.
              </div>
            )}
            {isOnCooldown && (
              <div role="alert"
                className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                Too many failed attempts. Please wait {cooldownLeft}s before trying again.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>

              {/* Email */}
              <div>
                <label htmlFor="auth-email"
                  className="text-sm font-semibold text-gray-700 mb-1 block">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearFeedback() }}
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="auth-password"
                    className="text-sm font-semibold text-gray-700 mb-1 block">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFeedback() }}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Enter your password'}
                    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                  />
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'signin' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-left text-xs text-[#0a9396] hover:underline -mt-2">
                  Forgot password?
                </button>
              )}

              {/* Error */}
              {error && (
                <div role="alert"
                  className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Success */}
              {message && (
                <div role="status" aria-live="polite"
                  className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isOnCooldown}
                className="mt-1 w-full bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-2.5 md:py-3 rounded-full font-semibold transition-all disabled:opacity-50 text-sm md:text-base"
              >
                {isOnCooldown ? `Wait ${cooldownLeft}s…` : submitLabel}
              </button>
            </form>

            {/* Mode switcher */}
            <div className="mt-5 text-sm text-gray-500">
              {mode === 'signin' && (
                <>
                  Don&apos;t have an account?{' '}
                  <button onClick={() => switchMode('signup')}
                    className="text-[#0a9396] font-semibold hover:underline">
                    Sign up
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button onClick={() => switchMode('signin')}
                    className="text-[#0a9396] font-semibold hover:underline">
                    Sign in
                  </button>
                </>
              )}
              {mode === 'forgot' && (
                <button onClick={() => switchMode('signin')}
                  className="text-[#0a9396] font-semibold hover:underline">
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
