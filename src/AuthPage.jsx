import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import Logo from './logo'

const MIN_PASSWORD_LENGTH = 8

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/opportunities'

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    clearFeedback()
    if (nextMode === 'forgot') {
      setPassword('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    clearFeedback()

    const cleanEmail = normalizeEmail(email)

    try {
      // Shared email validation for all modes
      if (!cleanEmail) {
        setError('Please enter your email address.')
        setLoading(false)
        return
      }

      if (!isValidEmail(cleanEmail)) {
        setError('Please enter a valid email address.')
        setLoading(false)
        return
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
          setError('Could not send reset email. Please try again.')
        } else {
          setMessage('Check your email for a password reset link.')
        }

        setLoading(false)
        return
      }

      // Password validation for sign in / sign up
      if (!password) {
        setError('Please enter your password.')
        setLoading(false)
        return
      }

      if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        setLoading(false)
        return
      }

      if (mode === 'signup') {
        const { data, error } = await signUp(cleanEmail, password)

        if (error) {
          const msg = error.message?.toLowerCase() || ''

          if (
            msg.includes('already registered') ||
            msg.includes('user already registered') ||
            msg.includes('already exists')
          ) {
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

        setLoading(false)
        return
      }

      // SIGN IN
      const { error } = await signIn(cleanEmail, password)

      if (error) {
        // Keep this generic for security
        setError('Incorrect email or password.')
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
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

  return (
    <div className="min-h-screen bg-[#f0fafa] flex flex-col">
      <nav className="bg-white shadow-sm px-6 md:px-10 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-[#0a9396] transition-all"
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="grid md:grid-cols-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl w-full">
          <div
            className="hidden md:flex flex-col justify-center px-10 py-12 text-white"
            style={{ background: 'linear-gradient(135deg, #0a9396, #5ec4c6)' }}
          >
            <h1 className="text-4xl font-bold leading-tight">
              Unlock every opportunity that matters.
            </h1>
            <p className="mt-5 text-white/90 leading-relaxed">
              Browse scholarships, internships, competitions, hackathons and research opportunities built for Pakistani students.
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <div className="bg-white/10 rounded-2xl px-4 py-3">✓ Clean curated listings</div>
              <div className="bg-white/10 rounded-2xl px-4 py-3">✓ Deadlines, filters, categories</div>
              <div className="bg-white/10 rounded-2xl px-4 py-3">✓ Submit opportunities after logging in</div>
            </div>
          </div>

          <div className="px-6 md:px-10 py-10">
            <h2 className="text-2xl font-bold text-gray-900">{headings[mode]}</h2>
            <p className="text-gray-500 mt-2 text-sm">{subtext[mode]}</p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                    placeholder={
                      mode === 'signup'
                        ? `At least ${MIN_PASSWORD_LENGTH} characters`
                        : 'Enter your password'
                    }
                  />
                </div>
              )}

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-left text-xs text-[#0a9396] hover:underline -mt-2"
                >
                  Forgot password?
                </button>
              )}

              {error && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-6 text-sm text-gray-500">
              {mode === 'signin' && (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-[#0a9396] font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </>
              )}

              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('signin')}
                    className="text-[#0a9396] font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}

              {mode === 'forgot' && (
                <button
                  onClick={() => switchMode('signin')}
                  className="text-[#0a9396] font-semibold hover:underline"
                >
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