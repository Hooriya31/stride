import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import Logo from './logo'

const TYPE_OPTIONS = [
  'Scholarship',
  'Internship',
  'Competition',
  'Hackathon',
  'Research',
  'Fellowship',
  'Program',
]

const LOCATION_OPTIONS = ['Remote', 'Onsite', 'Hybrid']

const LEVEL_OPTIONS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'Masters',
  'PhD',
  'All levels',
]

function formatDate(dateString) {
  if (!dateString) return 'No date'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value) {
  const cleaned = normalizeText(value || '')
  return cleaned || null
}

function normalizeUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch {
    return null
  }
}

function toTitleCase(value) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isFutureOrToday(dateString) {
  if (!dateString) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selected = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(selected.getTime())) return false

  return selected >= today
}

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

  const [panelError, setPanelError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // EDIT MODAL STATE
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    organization: '',
    type: '',
    deadline: '',
    description: '',
    link: '',
    location: '',
    city: '',
    discipline: '',
    level: '',
    source_url: '',
    verified: false,
    featured: false,
  })
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    checkAdminSession()
  }, [])

  async function checkAdminSession() {
    setCheckingAuth(true)
    setPanelError('')

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError.message)
      setAuthed(false)
      setCheckingAuth(false)
      return
    }

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

    if (!adminRow) {
      setAuthed(false)
      setCheckingAuth(false)
      return
    }

    setAuthed(true)
    await fetchAll()
    setCheckingAuth(false)
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    if (authLoading) return

    setAuthLoading(true)
    setAuthError('')
    setPanelError('')

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
    setPanelError('')

    const pendingQuery = supabase
      .from('opportunities')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const approvedQuery = supabase
      .from('opportunities')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    const [pendingRes, approvedRes] = await Promise.all([pendingQuery, approvedQuery])

    if (pendingRes.error) {
      console.error('Error fetching pending:', pendingRes.error.message)
    }

    if (approvedRes.error) {
      console.error('Error fetching approved:', approvedRes.error.message)
    }

    if (pendingRes.error || approvedRes.error) {
      setPanelError('Could not load admin data. Please refresh and try again.')
    }

    setPending(pendingRes.data || [])
    setApproved(approvedRes.data || [])
    setLoading(false)
  }

  function openEditModal(item) {
    setEditingItem(item)
    setEditError('')
    setEditForm({
      title: item.title || '',
      organization: item.organization || '',
      type: item.type || '',
      deadline: item.deadline || '',
      description: item.description || '',
      link: item.link || '',
      location: item.location || '',
      city: item.city || '',
      discipline: item.discipline || '',
      level: item.level || '',
      source_url: item.source_url || '',
      verified: !!item.verified,
      featured: !!item.featured,
    })
  }

  function closeEditModal() {
    if (savingEdit) return
    setEditingItem(null)
    setEditError('')
  }

  function handleEditChange(e) {
    const { name, value, type, checked } = e.target
    setEditForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (editError) setEditError('')
  }

  async function saveEdit() {
    if (!editingItem) return
    if (savingEdit) return

    setSavingEdit(true)
    setEditError('')
    setPanelError('')

    const title = normalizeText(editForm.title)
    const organization = normalizeText(editForm.organization)
    const type = editForm.type.trim()
    const deadline = editForm.deadline
    const description = normalizeText(editForm.description)
    const location = editForm.location.trim()

    const link = normalizeUrl(editForm.link)
    const sourceUrl = editForm.source_url.trim()
      ? normalizeUrl(editForm.source_url)
      : null

    const city = normalizeOptionalText(editForm.city)
      ? toTitleCase(normalizeOptionalText(editForm.city))
      : null

    const discipline = normalizeOptionalText(editForm.discipline)
      ? toTitleCase(normalizeOptionalText(editForm.discipline))
      : null

    const level = editForm.level.trim() || null

    if (!title) {
      setEditError('Please enter an opportunity title.')
      setSavingEdit(false)
      return
    }

    if (!organization) {
      setEditError('Please enter the organization name.')
      setSavingEdit(false)
      return
    }

    if (!TYPE_OPTIONS.includes(type)) {
      setEditError('Please select a valid opportunity type.')
      setSavingEdit(false)
      return
    }

    if (!deadline || !isFutureOrToday(deadline)) {
      setEditError('Please choose a valid deadline that is today or later.')
      setSavingEdit(false)
      return
    }

    if (!description || description.length < 20) {
      setEditError('Description should be at least 20 characters.')
      setSavingEdit(false)
      return
    }

    if (!link) {
      setEditError('Please enter a valid application link.')
      setSavingEdit(false)
      return
    }

    if (!LOCATION_OPTIONS.includes(location)) {
      setEditError('Please select a valid location type.')
      setSavingEdit(false)
      return
    }

    if (editForm.source_url.trim() && !sourceUrl) {
      setEditError('Source URL must be a valid link if provided.')
      setSavingEdit(false)
      return
    }

    if (level && !LEVEL_OPTIONS.includes(level)) {
      setEditError('Please select a valid level.')
      setSavingEdit(false)
      return
    }

    const updates = {
      title,
      organization,
      type,
      deadline,
      description,
      link,
      location,
      city,
      discipline,
      level,
      source_url: sourceUrl,
      verified: !!editForm.verified,
      featured: !!editForm.featured,
    }

    const { error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', editingItem.id)

    setSavingEdit(false)

    if (error) {
      console.error('Edit save error:', error.message)
      setEditError(error.message || 'Could not save changes.')
      return
    }

    setPending((prev) =>
      prev.map((o) => (o.id === editingItem.id ? { ...o, ...updates } : o))
    )

    setApproved((prev) =>
      prev.map((o) => (o.id === editingItem.id ? { ...o, ...updates } : o))
    )

    closeEditModal()
  }

  async function approveOpportunity(item) {
    setActionLoadingId(item.id)
    setPanelError('')

    const { error } = await supabase
      .from('opportunities')
      .update({
        status: 'approved',
        verified: item.verified ?? false,
        featured: item.featured ?? false,
      })
      .eq('id', item.id)

    setActionLoadingId(null)

    if (error) {
      console.error('Approve error:', error.message)
      setPanelError(error.message || 'Could not approve this opportunity.')
      return
    }

    setPending((prev) => prev.filter((o) => o.id !== item.id))
    setApproved((prev) => [{ ...item, status: 'approved' }, ...prev])
  }

  async function rejectOpportunity(id) {
    const confirmed = window.confirm('Reject and delete this pending submission?')
    if (!confirmed) return

    setActionLoadingId(id)
    setPanelError('')

    const { error } = await supabase.from('opportunities').delete().eq('id', id)

    setActionLoadingId(null)

    if (error) {
      console.error('Reject error:', error.message)
      setPanelError(error.message || 'Could not reject this opportunity.')
      return
    }

    setPending((prev) => prev.filter((o) => o.id !== id))
  }

  async function deleteApproved(id) {
    setActionLoadingId(id)
    setPanelError('')

    const { error } = await supabase.from('opportunities').delete().eq('id', id)

    setActionLoadingId(null)

    if (error) {
      console.error('Delete error:', error.message)
      setPanelError(error.message || 'Could not delete this opportunity.')
      return
    }

    setApproved((prev) => prev.filter((o) => o.id !== id))
    setDeleteConfirm(null)
  }

  async function moveBackToPending(item) {
    setActionLoadingId(item.id)
    setPanelError('')

    const { error } = await supabase
      .from('opportunities')
      .update({ status: 'pending' })
      .eq('id', item.id)

    setActionLoadingId(null)

    if (error) {
      console.error('Move back error:', error.message)
      setPanelError(error.message || 'Could not move this opportunity back to pending.')
      return
    }

    setApproved((prev) => prev.filter((o) => o.id !== item.id))
    setPending((prev) => [{ ...item, status: 'pending' }, ...prev])
  }

  async function toggleField(item, field) {
    setActionLoadingId(`${field}-${item.id}`)
    setPanelError('')

    const nextValue = !item[field]

    const { error } = await supabase
      .from('opportunities')
      .update({ [field]: nextValue })
      .eq('id', item.id)

    setActionLoadingId(null)

    if (error) {
      console.error(`Toggle ${field} error:`, error.message)
      setPanelError(error.message || `Could not update ${field}.`)
      return
    }

    setApproved((prev) =>
      prev.map((o) => (o.id === item.id ? { ...o, [field]: nextValue } : o))
    )

    setPending((prev) =>
      prev.map((o) => (o.id === item.id ? { ...o, [field]: nextValue } : o))
    )

    if (editingItem?.id === item.id) {
      setEditForm((prev) => ({
        ...prev,
        [field]: nextValue,
      }))
    }
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
    setPanelError('')
    setDeleteConfirm(null)
    setEditingItem(null)
  }

  const pendingCount = pending.length
  const approvedCount = approved.length

  const pendingHeading = useMemo(() => {
    if (pendingCount === 0) return 'No pending submissions'
    if (pendingCount === 1) return '1 submission waiting for review'
    return `${pendingCount} submissions waiting for review`
  }, [pendingCount])

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
              <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {authError}
              </div>
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

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-2">
            Review submissions, edit listings, manage live opportunities, and control featured / verified labels.
          </p>
        </div>

        {panelError && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
            {panelError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-[#0a9396] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396]'
            }`}
          >
            Pending {pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'approved'
                ? 'bg-[#0a9396] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396]'
            }`}
          >
            Approved {approvedCount > 0 ? `(${approvedCount})` : ''}
          </button>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396] disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center text-gray-500">
            Loading admin data...
          </div>
        ) : activeTab === 'pending' ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pending Submissions</h2>
              <p className="text-gray-500 text-sm mt-1">{pendingHeading}</p>
            </div>

            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 text-lg font-semibold">No pending submissions</p>
                <p className="text-gray-400 text-sm mt-2">All caught up.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pending.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:justify-between lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
                            {o.type || 'Opportunity'}
                          </span>

                          {o.organization && (
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {o.organization}
                            </span>
                          )}

                          {o.submitted_by_user && (
                            <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                              User submitted
                            </span>
                          )}

                          {o.featured && (
                            <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
                              Featured
                            </span>
                          )}

                          {o.verified && (
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mt-3">{o.title}</h3>

                        {o.description && (
                          <p className="text-gray-500 text-sm mt-2 whitespace-pre-line">
                            {o.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-gray-500">
                          <span>📅 Deadline: {formatDate(o.deadline)}</span>
                          <span>
                            📍 {o.location || 'No location'}
                            {o.city ? ` · ${o.city}` : ''}
                          </span>
                          {o.level && <span>🎓 {o.level}</span>}
                          {o.discipline && <span>📚 {o.discipline}</span>}
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-gray-400">
                          <span>Created: {formatDate(o.created_at)}</span>
                          {o.submitter_email ? (
                            <span className="break-all">Submitted by: {o.submitter_email}</span>
                          ) : o.submitted_by ? (
                            <span className="break-all">Submitted by user ID: {o.submitted_by}</span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-4 mt-4 text-sm">
                          {o.link && (
                            <a
                              href={o.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0a9396] hover:underline"
                            >
                              View application link →
                            </a>
                          )}

                          {o.source_url && (
                            <a
                              href={o.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-500 hover:underline"
                            >
                              View source →
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(o)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition-all"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => approveOpportunity(o)}
                          disabled={actionLoadingId === o.id}
                          className="bg-[#0a9396] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50"
                        >
                          {actionLoadingId === o.id ? 'Approving...' : 'Approve'}
                        </button>

                        <button
                          onClick={() => rejectOpportunity(o.id)}
                          disabled={actionLoadingId === o.id}
                          className="bg-red-50 text-red-500 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          {actionLoadingId === o.id ? 'Working...' : 'Reject'}
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Approved Opportunities</h2>
              <p className="text-gray-500 text-sm mt-1">
                Manage live opportunities, feature top ones, verify trusted listings, or edit details anytime.
              </p>
            </div>

            {approved.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 text-lg font-semibold">No approved opportunities yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {approved.map((o) => {
                  const featuredLoading = actionLoadingId === `featured-${o.id}`
                  const verifiedLoading = actionLoadingId === `verified-${o.id}`
                  const generalLoading = actionLoadingId === o.id

                  return (
                    <div
                      key={o.id}
                      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between lg:items-start">
                        <div className="min-w-0">
                          <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
                              {o.type || 'Opportunity'}
                            </span>

                            {o.organization && (
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {o.organization}
                              </span>
                            )}

                            {o.verified && (
                              <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                                ✓ Verified
                              </span>
                            )}

                            {o.featured && (
                              <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
                                ★ Featured
                              </span>
                            )}

                            {o.submitted_by_user && (
                              <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                                User submitted
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mt-3">{o.title}</h3>

                          {o.description && (
                            <p className="text-gray-500 text-sm mt-2 whitespace-pre-line">
                              {o.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-gray-500">
                            <span>📅 Deadline: {formatDate(o.deadline)}</span>
                            <span>
                              📍 {o.location || 'No location'}
                              {o.city ? ` · ${o.city}` : ''}
                            </span>
                            {o.level && <span>🎓 {o.level}</span>}
                            {o.discipline && <span>📚 {o.discipline}</span>}
                          </div>

                          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-gray-400">
                            <span>Created: {formatDate(o.created_at)}</span>
                            {o.submitter_email ? (
                              <span className="break-all">Submitted by: {o.submitter_email}</span>
                            ) : o.submitted_by ? (
                              <span className="break-all">Submitted by user ID: {o.submitted_by}</span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-4 mt-4 text-sm">
                            {o.link && (
                              <a
                                href={o.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0a9396] hover:underline"
                              >
                                View opportunity →
                              </a>
                            )}

                            {o.source_url && (
                              <a
                                href={o.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-500 hover:underline"
                              >
                                View source →
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 min-w-[190px]">
                          <button
                            onClick={() => openEditModal(o)}
                            className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                          >
                            Edit details
                          </button>

                          <button
                            onClick={() => toggleField(o, 'featured')}
                            disabled={featuredLoading}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 ${
                              o.featured
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {featuredLoading
                              ? 'Updating...'
                              : o.featured
                              ? 'Remove Featured'
                              : 'Mark Featured'}
                          </button>

                          <button
                            onClick={() => toggleField(o, 'verified')}
                            disabled={verifiedLoading}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 ${
                              o.verified
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {verifiedLoading
                              ? 'Updating...'
                              : o.verified
                              ? 'Remove Verified'
                              : 'Mark Verified'}
                          </button>

                          <button
                            onClick={() => moveBackToPending(o)}
                            disabled={generalLoading}
                            className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-50"
                          >
                            {generalLoading ? 'Updating...' : 'Move to Pending'}
                          </button>

                          {deleteConfirm === o.id ? (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 mt-1">
                              <p className="text-xs text-red-600 font-semibold mb-2">
                                Delete this opportunity permanently?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => deleteApproved(o.id)}
                                  disabled={generalLoading}
                                  className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                                >
                                  Yes, delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="bg-white text-gray-500 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(o.id)}
                              className="px-4 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Opportunity</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fix formatting, links, deadline, city, discipline, and labels before saving.
                </p>
              </div>

              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {editError && (
              <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Opportunity Title *
                </label>
                <input
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Organization *
                </label>
                <input
                  name="organization"
                  value={editForm.organization}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Type *
                </label>
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]"
                >
                  <option value="">Select type</option>
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Deadline *
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={editForm.deadline}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Location *
                </label>
                <select
                  name="location"
                  value={editForm.location}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]"
                >
                  <option value="">Select location</option>
                  {LOCATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  City
                </label>
                <input
                  name="city"
                  value={editForm.city}
                  onChange={handleEditChange}
                  placeholder="e.g. Lahore / Islamabad / Nationwide"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Discipline
                </label>
                <input
                  name="discipline"
                  value={editForm.discipline}
                  onChange={handleEditChange}
                  placeholder="e.g. Computer Science / Business / All disciplines"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Level
                </label>
                <select
                  name="level"
                  value={editForm.level}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]"
                >
                  <option value="">Select level</option>
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Application Link *
                </label>
                <input
                  name="link"
                  value={editForm.link}
                  onChange={handleEditChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Source URL
                </label>
                <input
                  name="source_url"
                  value={editForm.source_url}
                  onChange={handleEditChange}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={editForm.featured}
                    onChange={handleEditChange}
                    className="h-4 w-4"
                  />
                  Featured
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="verified"
                    checked={editForm.verified}
                    onChange={handleEditChange}
                    className="h-4 w-4"
                  />
                  Verified
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8">
              <button
                onClick={closeEditModal}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-6 py-2.5 rounded-full bg-[#0a9396] text-white font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel