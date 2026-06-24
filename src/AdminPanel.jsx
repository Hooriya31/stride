import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Logo from './logo'

function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [pending, setPending] = useState([])
  const [approved, setApproved] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    checkAdminSession()
  }, [])

  async function checkAdminSession() {
    setCheckingAuth(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      setAuthed(false)
      setCheckingAuth(false)
      return
    }

    const { data: adminRow, error } = await supabase
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Admin check error:', error.message)
      setAuthed(false)
      setCheckingAuth(false)
      return
    }

    if (adminRow) {
      setAuthed(true)
      await fetchAll()
    } else {
      setAuthed(false)
    }

    setCheckingAuth(false)
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setAuthError(error.message)
      setAuthLoading(false)
      return
    }

    const user = data?.user

    if (!user) {
      setAuthError('Unable to sign in.')
      setAuthLoading(false)
      return
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (adminError) {
      console.error('Admin check error:', adminError.message)
      await supabase.auth.signOut()
      setAuthError('Could not verify admin access.')
      setAuthLoading(false)
      return
    }

    if (!adminRow) {
      await supabase.auth.signOut()
      setAuthError('This account is not allowed to access the admin panel.')
      setAuthLoading(false)
      return
    }

    setAuthed(true)
    setEmail('')
    setPassword('')
    await fetchAll()
    setAuthLoading(false)
  }

  async function fetchAll() {
    setLoading(true)

    const [pendingRes, approvedRes] = await Promise.all([
      supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    ])

    if (pendingRes.error) {
      console.error('Error fetching pending:', pendingRes.error.message)
    }

    if (approvedRes.error) {
      console.error('Error fetching approved:', approvedRes.error.message)
    }

    setPending(pendingRes.data || [])
    setApproved(approvedRes.data || [])
    setLoading(false)
  }

  async function approve(id) {
    const { error } = await supabase
      .from('opportunities')
      .update({ status: 'approved' })
      .eq('id', id)

    if (error) {
      console.error('Approve error:', error.message)
      return
    }

    const approvedItem = pending.find((o) => o.id === id)
    setPending((prev) => prev.filter((o) => o.id !== id))

    if (approvedItem) {
      setApproved((prev) => [{ ...approvedItem, status: 'approved' }, ...prev])
    }
  }

  async function reject(id) {
    const { error } = await supabase.from('opportunities').delete().eq('id', id)

    if (error) {
      console.error('Reject error:', error.message)
      return
    }

    setPending((prev) => prev.filter((o) => o.id !== id))
  }

  async function deleteApproved(id) {
    const { error } = await supabase.from('opportunities').delete().eq('id', id)

    if (error) {
      console.error('Delete error:', error.message)
      return
    }

    setApproved((prev) => prev.filter((o) => o.id !== id))
    setDeleteConfirm(null)
  }

  async function handleLogout() {
    const confirmed = window.confirm('Are you sure you want to log out of the admin panel?')
    if (!confirmed) return

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error.message)
      return
    }

    setAuthed(false)
    setPending([])
    setApproved([])
    setActiveTab('pending')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center">
        <p className="text-gray-500">Checking admin access...</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 w-full max-w-sm">
          <Logo />
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-1">Admin Panel</h2>
          <p className="text-gray-500 text-sm mb-6">
            Sign in with your admin email and password
          </p>

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              required
            />

            {authError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#0a9396] text-white py-2.5 rounded-full font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50"
            >
              {authLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <nav className="bg-white shadow-sm px-6 md:px-10 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Logo />
          <span className="text-sm text-gray-500">Admin Panel</span>

          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-500 hover:text-[#0a9396]">
              ← Back to Stride
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-[#0a9396] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396]'
            }`}
          >
            Pending{' '}
            {pending.length > 0 && (
              <span className="ml-1 bg-white text-[#0a9396] rounded-full px-1.5 text-xs">
                {pending.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'approved'
                ? 'bg-[#0a9396] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396]'
            }`}
          >
            Approved ({approved.length})
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : activeTab === 'pending' ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Submissions</h1>
            <p className="text-gray-500 text-sm mb-6">
              Review and approve or reject submitted opportunities
            </p>

            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <p className="text-gray-400 text-lg font-semibold">No pending submissions</p>
                <p className="text-gray-400 text-sm mt-2">All caught up!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pending.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-6">
                      <div>
                        <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
                          {o.type}
                        </span>

                        {o.organization && (
                          <span className="ml-2 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {o.organization}
                          </span>
                        )}

                        <h3 className="text-lg font-bold text-gray-900 mt-2">{o.title}</h3>
                        <p className="text-gray-500 text-sm mt-1">{o.description}</p>

                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                          <span>📅 {o.deadline}</span>
                          <span>
                            📍 {o.location}
                            {o.city ? ` · ${o.city}` : ''}
                          </span>
                          {o.submitted_by_user && (
                            <span className="text-orange-400">👤 User submitted</span>
                          )}
                          <a
                            href={o.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#0a9396] hover:underline"
                          >
                            View link →
                          </a>
                          {o.source_url && (
                            <a
                              href={o.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:underline"
                            >
                              Source →
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => approve(o.id)}
                          className="bg-[#0a9396] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject(o.id)}
                          className="bg-red-50 text-red-500 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-100 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Approved Opportunities</h1>
            <p className="text-gray-500 text-sm mb-6">
              All live opportunities — delete any that are outdated or incorrect
            </p>

            {approved.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <p className="text-gray-400">No approved opportunities yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {approved.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-6">
                      <div>
                        <div className="flex gap-2 flex-wrap items-center">
                          <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
                            {o.type}
                          </span>

                          {o.organization && (
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {o.organization}
                            </span>
                          )}

                          {o.verified && (
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                              ✓ Verified
                            </span>
                          )}

                          {o.submitted_by_user && (
                            <span className="text-xs text-orange-400 bg-orange-50 px-3 py-1 rounded-full">
                              👤 User submitted
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mt-2">{o.title}</h3>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                          {o.description}
                        </p>

                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                          <span>📅 {o.deadline}</span>
                          <span>
                            📍 {o.location}
                            {o.city ? ` · ${o.city}` : ''}
                          </span>
                          <a
                            href={o.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#0a9396] hover:underline"
                          >
                            View →
                          </a>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {deleteConfirm === o.id ? (
                          <div className="flex flex-col gap-2 items-end">
                            <p className="text-xs text-red-500 font-semibold">Sure?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteApproved(o.id)}
                                className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-red-600 transition-all"
                              >
                                Yes, delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-200 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(o.id)}
                            className="bg-red-50 text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-100 transition-all"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminPanel