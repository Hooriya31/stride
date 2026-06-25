import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabase'
import Logo from './logo'

const MIN_PASSWORD_LENGTH = 8

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

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

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError('Could not update password. Please request a new reset link and try again.')
      return
    }

    setMessage('Password updated successfully! Redirecting you to sign in...')
    await supabase.auth.signOut()
    setTimeout(() => navigate('/auth', { replace: true }), 2200)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center">
        <p className="text-gray-500">Verifying reset link...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0fafa] flex flex-col">
      <nav className="bg-white shadow-sm px-6 md:px-10 py-4">
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

          {!validSession ? (
            <div className="mt-6 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              This reset link is invalid or has expired.{' '}
              <Link to="/auth" className="underline text-[#0a9396]">
                Request a new one
              </Link>.
            </div>
          ) : message ? (
            <div className="mt-6 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                  placeholder="Same password again"
                />
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword