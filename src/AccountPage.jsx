import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useSaved } from './SavedContext'
import { supabase } from './supabase'
import Logo from './logo'

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDaysLeft(deadline) {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? `${deadline}T00:00:00` : deadline
  const d = new Date(normalized)
  if (isNaN(d)) return null
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

// ─── Component ────────────────────────────────────────────────────────────────

function AccountPage() {
  const { user, signOut, loading } = useAuth()
  const { saved } = useSaved()
  const navigate  = useNavigate()

  const [newPassword, setNewPassword]           = useState('')
  const [confirmPassword, setConfirmPassword]   = useState('')
  const [passwordLoading, setPasswordLoading]   = useState(false)
  const [passwordMessage, setPasswordMessage]   = useState('')
  const [passwordError, setPasswordError]       = useState('')

  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading]         = useState(false)
  const [deleteError, setDeleteError]             = useState('')

  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut]       = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true })
  }, [loading, user, navigate])

  const urgentSaved = saved.filter((s) => {
    if (s.status !== 'saved') return false
    const days = getDaysLeft(s.opportunities?.deadline)
    return days !== null && days >= 0 && days <= 7
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passwordLoading) return

    setPasswordError('')
    setPasswordMessage('')

    const trimmedPassword = newPassword.trim()
    const trimmedConfirm  = confirmPassword.trim()

    if (!trimmedPassword || !trimmedConfirm) {
      setPasswordError('Please fill in both password fields.')
      return
    }
    if (trimmedPassword !== trimmedConfirm) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (trimmedPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: trimmedPassword })
      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordMessage('Password updated successfully.')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      console.error('Unexpected password update error:', err)
      setPasswordError('An unexpected error occurred. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteLoading) return
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')
    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) {
        setDeleteError(error.message || 'Something went wrong. Please try again.')
        return
      }
      await signOut()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Unexpected delete error:', err)
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Logout error:', err)
      setLoggingOut(false)
      setLogoutConfirm(false)
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center text-gray-500 text-sm">
        Loading account…
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa]">

      {/* Nav — Logo links to opportunities, no back text */}
      <nav aria-label="Account navigation"
        className="bg-white shadow-sm px-4 md:px-10 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link to="/opportunities" className="shrink-0">
            <Logo />
          </Link>

          {/* Inline logout confirm */}
          {logoutConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Log out?</span>
              <button onClick={handleLogout} disabled={loggingOut}
                className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
                {loggingOut ? 'Logging out…' : 'Yes'}
              </button>
              <button onClick={() => setLogoutConfirm(false)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setLogoutConfirm(true)}
              className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:border-red-300 hover:text-red-500 transition-all">
              Logout
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your Stride account</p>
        </div>

        {/* ── Section 1: Account Details ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account Details</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0a939620] flex items-center justify-center shrink-0"
              aria-hidden="true">
              <span className="text-[#0a9396] font-bold text-sm">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">Signed in as</p>
              <p className="text-sm text-gray-500 break-all">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* ── Section 2: Saved Opportunities ─────────────────────────────── */}
        <div className={`bg-white rounded-2xl border shadow-sm p-5 md:p-6 ${
          urgentSaved.length > 0 ? 'border-red-200' : 'border-gray-100'
        }`}>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Saved Opportunities</h2>
          <p className="text-sm text-gray-400 mb-4">
            {saved.length} saved ·{' '}
            {urgentSaved.length > 0
              ? `${urgentSaved.length} closing within 7 days`
              : 'No urgent deadlines'}
          </p>

          {urgentSaved.length > 0 && (
            <div role="alert"
              className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-red-600">
                ⚠️ {urgentSaved.length} saved{' '}
                {urgentSaved.length === 1 ? 'opportunity' : 'opportunities'} closing soon
              </p>
              <p className="text-xs text-red-400 mt-1">
                You haven&apos;t applied to {urgentSaved.length === 1 ? 'it' : 'them'} yet.
                Don&apos;t miss out.
              </p>
            </div>
          )}

          <Link to="/saved"
            className="inline-flex items-center gap-2 bg-[#0a9396] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            View Saved Opportunities
          </Link>
        </div>

        {/* ── Section 3: Security ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Security</h2>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div>
              <label htmlFor="new-password"
                className="text-xs font-semibold text-gray-600 mb-1 block">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordMessage('') }}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            <div>
              <label htmlFor="confirm-password"
                className="text-xs font-semibold text-gray-600 mb-1 block">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordMessage('') }}
                placeholder="Same password again"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {passwordError && (
              <p role="alert"
                className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {passwordError}
              </p>
            )}
            {passwordMessage && (
              <p role="status" aria-live="polite"
                className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                {passwordMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-fit bg-[#0a9396] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50"
            >
              {passwordLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── Section 4: Danger Zone ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 md:p-6">
          <h2 className="text-base font-semibold text-red-600 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete your Stride account and all associated data.
          </p>

          <div className="bg-red-50 rounded-xl px-4 py-3 mb-5 text-sm text-red-700 space-y-1">
            <p>⚠️ Your account will be permanently deleted.</p>
            <p>⚠️ Your saved opportunities, notes, and account data will be removed.</p>
            <p>⚠️ Approved opportunities you submitted may remain as platform content.</p>
            <p>⚠️ This action cannot be undone.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="delete-confirm"
                className="text-xs font-semibold text-gray-600 mb-1 block">
                Type <span className="font-mono text-red-500">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError('') }}
                placeholder="DELETE"
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-lg border border-red-200 text-sm focus:outline-none focus:border-red-400 font-mono"
              />
            </div>

            {deleteError && (
              <p role="alert"
                className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {deleteError}
              </p>
            )}

            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
              className="w-full sm:w-fit bg-red-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-40"
            >
              {deleteLoading ? 'Deleting account…' : 'Delete My Account'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AccountPage
