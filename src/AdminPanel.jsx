import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { Link } from 'react-router-dom'
import Logo from './logo'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  'Scholarship','Internship','Competition','Hackathon','Research','Fellowship','Program',
]
const LOCATION_OPTIONS = ['Remote', 'Onsite', 'Hybrid']
const LEVEL_OPTIONS = [
  'High School','Undergraduate','Graduate','Masters','PhD','All levels',
]
const PAGE_SIZE = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString) {
  if (!dateString) return 'No date'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function normalizeText(value) {
  return (value || '').trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value) {
  const cleaned = normalizeText(value || '')
  return cleaned || null
}

function normalizeUrl(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch { return null }
}

function toTitleCase(value) {
  return (value || '').toLowerCase().split(' ').filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function isFutureOrToday(dateString) {
  if (!dateString) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selected = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(selected.getTime())) return false
  return selected >= today
}

// ─── ConfirmBox — module scope, no render-time recreation ─────────────────────

function ConfirmBox({ message, onConfirm, onCancel, loading, confirmLabel = 'Confirm', danger = true }) {
  return (
    <div className={`rounded-2xl border p-3 mt-1 ${danger ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
      <p className={`text-xs font-semibold mb-2 ${danger ? 'text-red-600' : 'text-gray-700'}`}>
        {message}
      </p>
      <div className="flex gap-2">
        <button onClick={onConfirm} disabled={loading}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
            danger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#0a9396] text-white hover:bg-[#007f82]'
          }`}>
          {loading ? 'Working...' : confirmLabel}
        </button>
        <button onClick={onCancel}
          className="bg-white text-gray-500 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-all">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── FilterBar — module scope ──────────────────────────────────────────────────

function FilterBar({ search, onSearch, typeFilter, onType, sortBy, onSort, extraFilters, onExtra }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col gap-3">
      <input type="search" placeholder="Search by title, organization, or discipline…"
        value={search} onChange={(e) => onSearch(e.target.value)}
        aria-label="Search opportunities"
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />

      <div className="flex flex-wrap gap-2">
        <select value={typeFilter} onChange={(e) => onType(e.target.value)}
          aria-label="Filter by type"
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]">
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {extraFilters && (
          <>
            <button onClick={() => onExtra('featured')} aria-pressed={extraFilters.featured}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                extraFilters.featured ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-300'
              }`}>★ Featured</button>
            <button onClick={() => onExtra('verified')} aria-pressed={extraFilters.verified}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                extraFilters.verified ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:border-green-300'
              }`}>✓ Verified</button>
            <button onClick={() => onExtra('user_submitted')} aria-pressed={extraFilters.user_submitted}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                extraFilters.user_submitted ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
              }`}>User submitted</button>
          </>
        )}

        <select value={sortBy} onChange={(e) => onSort(e.target.value)}
          aria-label="Sort opportunities"
          className="w-full sm:w-auto sm:ml-auto px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="deadline">Deadline soonest</option>
          <option value="az">Title A → Z</option>
        </select>
      </div>
    </div>
  )
}

// ─── Pagination — module scope, no longer recreated every render ──────────────

function Pagination({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page"
        className="px-3 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-500 hover:border-[#0a9396] disabled:opacity-40 transition-all">
        ← Prev
      </button>
      <span className="text-sm text-gray-500 px-2">Page {page} of {pageCount}</span>
      <button onClick={() => onPage(page + 1)} disabled={page === pageCount} aria-label="Next page"
        className="px-3 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-500 hover:border-[#0a9396] disabled:opacity-40 transition-all">
        Next →
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AdminPanel() {
  const [authed, setAuthed]           = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError]     = useState('')

  const [pending, setPending]   = useState([])
  const [approved, setApproved] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading]   = useState(true)
  const [panelError, setPanelError] = useState('')

  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm]     = useState(null)
  const [rejectConfirm, setRejectConfirm]     = useState(null)
  const [logoutConfirm, setLogoutConfirm]     = useState(false)

  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm]       = useState({
    title:'', organization:'', type:'', deadline:'', description:'',
    link:'', location:'', city:'', discipline:'', level:'', source_url:'',
    verified: false, featured: false,
  })
  const [editError, setEditError]   = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [pendingSearch, setPendingSearch] = useState('')
  const [pendingType, setPendingType]     = useState('')
  const [pendingSort, setPendingSort]     = useState('newest')
  const [pendingPage, setPendingPage]     = useState(1)

  const [approvedSearch, setApprovedSearch] = useState('')
  const [approvedType, setApprovedType]     = useState('')
  const [approvedSort, setApprovedSort]     = useState('newest')
  const [approvedPage, setApprovedPage]     = useState(1)
  const [approvedExtra, setApprovedExtra]   = useState({ featured: false, verified: false, user_submitted: false })

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setPanelError('')
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        supabase.from('opportunities').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('opportunities').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
      ])
      if (pendingRes.error)  console.error('Pending fetch error:', pendingRes.error.message)
      if (approvedRes.error) console.error('Approved fetch error:', approvedRes.error.message)
      if (pendingRes.error || approvedRes.error) setPanelError('Could not load admin data. Please refresh.')
      setPending(pendingRes.data   || [])
      setApproved(approvedRes.data || [])
    } catch (err) {
      console.error('Unexpected fetch error:', err)
      setPanelError('An unexpected error occurred while loading data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAdminSession = useCallback(async () => {
    setCheckingAuth(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) { setAuthed(false); return }
      const { data: adminRow, error } = await supabase.from('admins').select('id').eq('id', session.user.id).maybeSingle()
      if (error || !adminRow) { setAuthed(false); return }
      setAuthed(true)
      await fetchAll()
    } catch (err) {
      console.error('Auth error:', err)
      setAuthed(false)
    } finally {
      setCheckingAuth(false)
    }
  }, [fetchAll])

  useEffect(() => {
    checkAdminSession()
  }, [checkAdminSession])

  // Reset to page 1 whenever filters change — this is a derived-value sync,
  // not truly a side effect, but React's stricter lint wants it flagged.
  // Safe pattern: resets pagination state in response to filter state changing.
  useEffect(() => {
    setPendingPage(1)
  }, [pendingSearch, pendingType, pendingSort])

  useEffect(() => {
    setApprovedPage(1)
  }, [approvedSearch, approvedType, approvedSort, approvedExtra])

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function handleAdminLogin(e) {
    e.preventDefault()
    if (authLoading) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error || !data?.user) { setAuthError(error?.message || 'Unable to sign in.'); return }
      const { data: adminRow, error: adminError } = await supabase.from('admins').select('id').eq('id', data.user.id).maybeSingle()
      if (adminError || !adminRow) {
        await supabase.auth.signOut()
        setAuthError('This account is not allowed to access the admin panel.')
        return
      }
      setAuthed(true)
      setEmail('')
      setPassword('')
      await fetchAll()
    } catch (err) {
      console.error('Login error:', err)
      setAuthError('An unexpected error occurred.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      setAuthed(false)
      setPending([])
      setApproved([])
      setActiveTab('pending')
      setPanelError('')
      setDeleteConfirm(null)
      setRejectConfirm(null)
      setEditingItem(null)
      setLogoutConfirm(false)
    } catch (err) { console.error('Logout error:', err) }
  }

  // ── Filter + sort + paginate ───────────────────────────────────────────────

  function applyFilters(list, search, type, sort) {
    let result = [...list]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((o) =>
        (o.title || '').toLowerCase().includes(q) ||
        (o.organization || '').toLowerCase().includes(q) ||
        (o.discipline || '').toLowerCase().includes(q)
      )
    }
    if (type) result = result.filter((o) => o.type === type)
    switch (sort) {
      case 'oldest':   result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break
      case 'deadline': result.sort((a, b) => { if (!a.deadline) return 1; if (!b.deadline) return -1; return new Date(a.deadline) - new Date(b.deadline) }); break
      case 'az':       result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break
      default:         result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
    return result
  }

  const filteredPending = useMemo(() => applyFilters(pending, pendingSearch, pendingType, pendingSort),
    [pending, pendingSearch, pendingType, pendingSort])

  const filteredApproved = useMemo(() => {
    let result = applyFilters(approved, approvedSearch, approvedType, approvedSort)
    if (approvedExtra.featured)       result = result.filter((o) => o.featured)
    if (approvedExtra.verified)       result = result.filter((o) => o.verified)
    if (approvedExtra.user_submitted) result = result.filter((o) => o.submitted_by_user)
    return result
  }, [approved, approvedSearch, approvedType, approvedSort, approvedExtra])

  const pendingPageCount  = Math.ceil(filteredPending.length  / PAGE_SIZE)
  const approvedPageCount = Math.ceil(filteredApproved.length / PAGE_SIZE)
  const pendingVisible    = filteredPending.slice( (pendingPage  - 1) * PAGE_SIZE, pendingPage  * PAGE_SIZE)
  const approvedVisible   = filteredApproved.slice((approvedPage - 1) * PAGE_SIZE, approvedPage * PAGE_SIZE)

  function toggleApprovedExtra(key) {
    setApprovedExtra((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Edit modal ────────────────────────────────────────────────────────────

  function openEditModal(item) {
    setEditingItem(item)
    setEditError('')
    setEditForm({
      title: item.title || '', organization: item.organization || '',
      type: item.type || '', deadline: item.deadline || '',
      description: item.description || '', link: item.link || '',
      location: item.location || '', city: item.city || '',
      discipline: item.discipline || '', level: item.level || '',
      source_url: item.source_url || '',
      verified: !!item.verified, featured: !!item.featured,
    })
  }

  function closeEditModal() {
    if (savingEdit) return
    setEditingItem(null)
    setEditError('')
  }

  function handleEditChange(e) {
    const { name, value, type, checked } = e.target
    setEditForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (editError) setEditError('')
  }

  async function saveEdit() {
    if (!editingItem || savingEdit) return
    setSavingEdit(true)
    setEditError('')
    try {
      const title        = normalizeText(editForm.title)
      const organization = normalizeText(editForm.organization)
      const type         = editForm.type.trim()
      const deadline     = editForm.deadline
      const description  = normalizeText(editForm.description)
      const location     = editForm.location.trim()
      const link         = normalizeUrl(editForm.link)
      const sourceUrl    = editForm.source_url.trim() ? normalizeUrl(editForm.source_url) : null
      const rawCity      = normalizeOptionalText(editForm.city)
      const city         = rawCity ? toTitleCase(rawCity) : null
      const rawDisc      = normalizeOptionalText(editForm.discipline)
      const discipline   = rawDisc ? toTitleCase(rawDisc) : null
      const level        = editForm.level.trim() || null

      if (!title)                         { setEditError('Please enter an opportunity title.'); return }
      if (!organization)                  { setEditError('Please enter the organization name.'); return }
      if (!TYPE_OPTIONS.includes(type))   { setEditError('Please select a valid opportunity type.'); return }
      if (!deadline || !isFutureOrToday(deadline)) { setEditError('Please choose a valid deadline that is today or later.'); return }
      if (!description || description.length < 20) { setEditError('Description should be at least 20 characters.'); return }
      if (!link)                          { setEditError('Please enter a valid application link (must start with https://).'); return }
      if (!LOCATION_OPTIONS.includes(location)) { setEditError('Please select a valid location type.'); return }
      if (editForm.source_url.trim() && !sourceUrl) { setEditError('Source URL must be a valid link if provided.'); return }
      if (level && !LEVEL_OPTIONS.includes(level))  { setEditError('Please select a valid level.'); return }

      const updates = {
        title, organization, type, deadline, description, link,
        location, city, discipline, level, source_url: sourceUrl,
        verified: !!editForm.verified, featured: !!editForm.featured,
      }

      const { error } = await supabase.from('opportunities').update(updates).eq('id', editingItem.id)
      if (error) { setEditError(error.message || 'Could not save changes.'); return }

      const patch = (list) => list.map((o) => (o.id === editingItem.id ? { ...o, ...updates } : o))
      setPending(patch)
      setApproved(patch)
      closeEditModal()
    } catch (err) {
      console.error('Save error:', err)
      setEditError('An unexpected error occurred.')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function approveOpportunity(item) {
    if (actionLoadingId) return
    setActionLoadingId(`approve-${item.id}`)
    try {
      const { error } = await supabase.from('opportunities').update({ status: 'approved', verified: item.verified ?? false, featured: item.featured ?? false }).eq('id', item.id)
      if (error) { setPanelError(error.message || 'Could not approve.'); return }
      setPending((prev) => prev.filter((o) => o.id !== item.id))
      setApproved((prev) => [{ ...item, status: 'approved' }, ...prev])
    } catch (err) { console.error(err); setPanelError('An unexpected error occurred.')
    } finally { setActionLoadingId(null) }
  }

  async function rejectOpportunity(id) {
    if (actionLoadingId) return
    setActionLoadingId(`reject-${id}`)
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', id)
      if (error) { setPanelError(error.message || 'Could not reject.'); return }
      setPending((prev) => prev.filter((o) => o.id !== id))
      setRejectConfirm(null)
    } catch (err) { console.error(err); setPanelError('An unexpected error occurred.')
    } finally { setActionLoadingId(null) }
  }

  async function deleteApproved(id) {
    if (actionLoadingId) return
    setActionLoadingId(`delete-${id}`)
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', id)
      if (error) { setPanelError(error.message || 'Could not delete.'); return }
      setApproved((prev) => prev.filter((o) => o.id !== id))
      setDeleteConfirm(null)
    } catch (err) { console.error(err); setPanelError('An unexpected error occurred.')
    } finally { setActionLoadingId(null) }
  }

  async function moveBackToPending(item) {
    if (actionLoadingId) return
    setActionLoadingId(`move-${item.id}`)
    try {
      const { error } = await supabase.from('opportunities').update({ status: 'pending' }).eq('id', item.id)
      if (error) { setPanelError(error.message || 'Could not move.'); return }
      setApproved((prev) => prev.filter((o) => o.id !== item.id))
      setPending((prev) => [{ ...item, status: 'pending' }, ...prev])
    } catch (err) { console.error(err); setPanelError('An unexpected error occurred.')
    } finally { setActionLoadingId(null) }
  }

  async function toggleField(item, field) {
    if (actionLoadingId) return
    setActionLoadingId(`${field}-${item.id}`)
    try {
      const nextValue = !item[field]
      const { error } = await supabase.from('opportunities').update({ [field]: nextValue }).eq('id', item.id)
      if (error) { setPanelError(error.message || `Could not update ${field}.`); return }
      const patch = (list) => list.map((o) => (o.id === item.id ? { ...o, [field]: nextValue } : o))
      setApproved(patch)
      setPending(patch)
      if (editingItem?.id === item.id) setEditForm((prev) => ({ ...prev, [field]: nextValue }))
    } catch (err) { console.error(err); setPanelError('An unexpected error occurred.')
    } finally { setActionLoadingId(null) }
  }

  // ── Counts & headings ─────────────────────────────────────────────────────

  const pendingCount  = pending.length
  const approvedCount = approved.length

  const pendingHeading = useMemo(() => {
    const total = filteredPending.length
    if (total === 0 && (pendingSearch || pendingType)) return 'No submissions match your filters'
    if (total === 0) return 'No pending submissions'
    if (total === 1) return '1 submission waiting for review'
    return `${total} submissions waiting for review`
  }, [filteredPending.length, pendingSearch, pendingType])

  // ── Guards ────────────────────────────────────────────────────────────────

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Checking admin access…</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 w-full max-w-sm">
          <Logo />
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-1">Admin Panel</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in with your admin email and password</p>
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
            <input type="email" placeholder="Admin email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            <input type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            {authError && (
              <div role="alert" className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {authError}
              </div>
            )}
            <button type="submit" disabled={authLoading}
              className="w-full bg-[#0a9396] text-white py-2.5 rounded-full font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50">
              {authLoading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main admin UI ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <nav className="bg-white shadow-sm px-4 md:px-10 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/opportunities"><Logo /></Link>
          <div className="flex items-center gap-3">
            {logoutConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Log out?</span>
                <button onClick={handleLogout} className="text-xs font-semibold text-red-500 hover:text-red-600">Yes</button>
                <button onClick={() => setLogoutConfirm(false)} className="text-xs font-semibold text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setLogoutConfirm(true)} className="text-sm text-red-500 hover:text-red-600 font-medium">
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review submissions, edit listings, manage live opportunities, and control featured / verified labels.
          </p>
        </div>

        {panelError && (
          <div role="alert" className="mb-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">
            {panelError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveTab('pending')} aria-pressed={activeTab === 'pending'}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'pending' ? 'bg-[#0a9396] text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396]'
            }`}>
            Pending {pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
          <button onClick={() => setActiveTab('approved')} aria-pressed={activeTab === 'approved'}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'approved' ? 'bg-[#0a9396] text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396]'
            }`}>
            Approved {approvedCount > 0 ? `(${approvedCount})` : ''}
          </button>
          <button onClick={fetchAll} disabled={loading} aria-label="Refresh data"
            className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-500 border border-gray-200 hover:border-[#0a9396] disabled:opacity-50 transition-all">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center text-gray-500 text-sm">
            Loading admin data…
          </div>
        ) : activeTab === 'pending' ? (
          <>
            <div className="mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Pending Submissions</h2>
              <p className="text-gray-500 text-sm mt-1">{pendingHeading}</p>
            </div>

            <FilterBar search={pendingSearch} onSearch={setPendingSearch}
              typeFilter={pendingType} onType={setPendingType}
              sortBy={pendingSort} onSort={setPendingSort} />

            {filteredPending.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 font-semibold">
                  {pendingSearch || pendingType ? 'No submissions match your filters' : 'No pending submissions'}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {pendingSearch || pendingType ? 'Try clearing your search or filter.' : 'All caught up.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {pendingVisible.map((o) => {
                    const isApproving = actionLoadingId === `approve-${o.id}`
                    const isRejecting = actionLoadingId === `reject-${o.id}`
                    return (
                      <div key={o.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">{o.type || 'Opportunity'}</span>
                              {o.organization && <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{o.organization}</span>}
                              {o.submitted_by_user && <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">User submitted</span>}
                              {o.featured && <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">★ Featured</span>}
                              {o.verified  && <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">✓ Verified</span>}
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-gray-900 mt-3">{o.title || 'Untitled'}</h3>
                            {o.description && <p className="text-gray-500 text-sm mt-2 whitespace-pre-line line-clamp-3">{o.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                              <span>📅 {formatDate(o.deadline)}</span>
                              <span>📍 {o.location || 'No location'}{o.city ? ` · ${o.city}` : ''}</span>
                              {o.level && <span>🎓 {o.level}</span>}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-sm">
                              {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" className="text-[#0a9396] hover:underline">View application link →</a>}
                              {o.source_url && <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:underline">View source →</a>}
                            </div>
                          </div>
                          <div className="flex flex-row flex-wrap lg:flex-col gap-2 shrink-0">
                            <button onClick={() => openEditModal(o)}
                              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition-all">
                              Edit
                            </button>
                            <button onClick={() => approveOpportunity(o)} disabled={!!actionLoadingId}
                              className="bg-[#0a9396] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50">
                              {isApproving ? 'Approving…' : 'Approve'}
                            </button>
                            {rejectConfirm === o.id ? (
                              <ConfirmBox message="Reject and permanently delete this submission?"
                                confirmLabel="Yes, reject" loading={isRejecting}
                                onConfirm={() => rejectOpportunity(o.id)}
                                onCancel={() => setRejectConfirm(null)} />
                            ) : (
                              <button onClick={() => setRejectConfirm(o.id)} disabled={!!actionLoadingId}
                                className="bg-red-50 text-red-500 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-50">
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Pagination page={pendingPage} pageCount={pendingPageCount} onPage={setPendingPage} />
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Approved Opportunities</h2>
              <p className="text-gray-500 text-sm mt-1">
                {filteredApproved.length === approvedCount
                  ? `${approvedCount} live opportunit${approvedCount === 1 ? 'y' : 'ies'}`
                  : `${filteredApproved.length} of ${approvedCount} matching`}
              </p>
            </div>

            <FilterBar search={approvedSearch} onSearch={setApprovedSearch}
              typeFilter={approvedType} onType={setApprovedType}
              sortBy={approvedSort} onSort={setApprovedSort}
              extraFilters={approvedExtra} onExtra={toggleApprovedExtra} />

            {filteredApproved.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 font-semibold">
                  {approvedSearch || approvedType || Object.values(approvedExtra).some(Boolean)
                    ? 'No opportunities match your filters' : 'No approved opportunities yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {approvedVisible.map((o) => {
                    const featuredLoading = actionLoadingId === `featured-${o.id}`
                    const verifiedLoading = actionLoadingId === `verified-${o.id}`
                    const generalLoading  = actionLoadingId === `move-${o.id}` || actionLoadingId === `delete-${o.id}`
                    return (
                      <div key={o.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                          <div className="min-w-0">
                            <div className="flex gap-2 flex-wrap items-center">
                              <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">{o.type || 'Opportunity'}</span>
                              {o.organization && <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{o.organization}</span>}
                              {o.verified  && <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">✓ Verified</span>}
                              {o.featured  && <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">★ Featured</span>}
                              {o.submitted_by_user && <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">User submitted</span>}
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-gray-900 mt-3">{o.title || 'Untitled'}</h3>
                            {o.description && <p className="text-gray-500 text-sm mt-2 whitespace-pre-line line-clamp-3">{o.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                              <span>📅 {formatDate(o.deadline)}</span>
                              <span>📍 {o.location || 'No location'}{o.city ? ` · ${o.city}` : ''}</span>
                              {o.level && <span>🎓 {o.level}</span>}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-sm">
                              {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" className="text-[#0a9396] hover:underline">View opportunity →</a>}
                              {o.source_url && <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:underline">View source →</a>}
                            </div>
                          </div>
                          <div className="flex flex-row flex-wrap lg:flex-col gap-2 shrink-0 lg:min-w-[170px]">
                            <button onClick={() => openEditModal(o)}
                              className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                              Edit details
                            </button>
                            <button onClick={() => toggleField(o, 'featured')} disabled={!!actionLoadingId}
                              aria-pressed={o.featured}
                              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 ${
                                o.featured ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}>
                              {featuredLoading ? 'Updating…' : o.featured ? 'Remove Featured' : 'Mark Featured'}
                            </button>
                            <button onClick={() => toggleField(o, 'verified')} disabled={!!actionLoadingId}
                              aria-pressed={o.verified}
                              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 ${
                                o.verified ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}>
                              {verifiedLoading ? 'Updating…' : o.verified ? 'Remove Verified' : 'Mark Verified'}
                            </button>
                            <button onClick={() => moveBackToPending(o)} disabled={!!actionLoadingId}
                              className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-50">
                              {generalLoading ? 'Updating…' : 'Move to Pending'}
                            </button>
                            {deleteConfirm === o.id ? (
                              <ConfirmBox message="Delete this opportunity permanently?"
                                confirmLabel="Yes, delete"
                                loading={actionLoadingId === `delete-${o.id}`}
                                onConfirm={() => deleteApproved(o.id)}
                                onCancel={() => setDeleteConfirm(null)} />
                            ) : (
                              <button onClick={() => setDeleteConfirm(o.id)} disabled={!!actionLoadingId}
                                className="px-4 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-50">
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Pagination page={approvedPage} pageCount={approvedPageCount} onPage={setApprovedPage} />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center px-3 py-4"
          role="dialog" aria-modal="true" aria-label="Edit opportunity">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-5 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Edit Opportunity</h2>
                <p className="text-sm text-gray-500 mt-1">Fix formatting, links, deadline, and labels before saving.</p>
              </div>
              <button onClick={closeEditModal} aria-label="Close edit modal"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">×</button>
            </div>

            {editError && (
              <div role="alert" className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{editError}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="edit-title" className="text-sm font-semibold text-gray-700 mb-1 block">Opportunity Title *</label>
                <input id="edit-title" name="title" value={editForm.title} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div>
                <label htmlFor="edit-org" className="text-sm font-semibold text-gray-700 mb-1 block">Organization *</label>
                <input id="edit-org" name="organization" value={editForm.organization} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div>
                <label htmlFor="edit-type" className="text-sm font-semibold text-gray-700 mb-1 block">Type *</label>
                <select id="edit-type" name="type" value={editForm.type} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]">
                  <option value="">Select type</option>
                  {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="edit-deadline" className="text-sm font-semibold text-gray-700 mb-1 block">Deadline *</label>
                <input id="edit-deadline" type="date" name="deadline" value={editForm.deadline} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div>
                <label htmlFor="edit-location" className="text-sm font-semibold text-gray-700 mb-1 block">Location *</label>
                <select id="edit-location" name="location" value={editForm.location} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]">
                  <option value="">Select location</option>
                  {LOCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="edit-city" className="text-sm font-semibold text-gray-700 mb-1 block">City</label>
                <input id="edit-city" name="city" value={editForm.city} onChange={handleEditChange}
                  placeholder="e.g. Lahore / Nationwide"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div>
                <label htmlFor="edit-discipline" className="text-sm font-semibold text-gray-700 mb-1 block">Discipline</label>
                <input id="edit-discipline" name="discipline" value={editForm.discipline} onChange={handleEditChange}
                  placeholder="e.g. CS / Business / All disciplines"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div>
                <label htmlFor="edit-level" className="text-sm font-semibold text-gray-700 mb-1 block">Level</label>
                <select id="edit-level" name="level" value={editForm.level} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0a9396]">
                  <option value="">Select level</option>
                  {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-description" className="text-sm font-semibold text-gray-700 mb-1 block">Description *</label>
                <textarea id="edit-description" name="description" value={editForm.description} onChange={handleEditChange}
                  rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-link" className="text-sm font-semibold text-gray-700 mb-1 block">Application Link *</label>
                <input id="edit-link" name="link" value={editForm.link} onChange={handleEditChange} placeholder="https://…"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-source" className="text-sm font-semibold text-gray-700 mb-1 block">Source URL</label>
                <input id="edit-source" name="source_url" value={editForm.source_url} onChange={handleEditChange} placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="featured" checked={editForm.featured} onChange={handleEditChange} className="h-4 w-4" />
                  Featured
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="verified" checked={editForm.verified} onChange={handleEditChange} className="h-4 w-4" />
                  Verified
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-6">
              <button onClick={closeEditModal} disabled={savingEdit}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={savingEdit}
                className="px-6 py-2.5 rounded-full bg-[#0a9396] text-white font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50">
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
