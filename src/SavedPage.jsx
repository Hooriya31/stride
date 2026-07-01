import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from './logo'
import { useAuth } from './AuthContext'
import { useSaved } from './SavedContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'saved',    label: 'Not applied', color: 'bg-gray-100 text-gray-500'    },
  { value: 'applied',  label: 'Applied',     color: 'bg-blue-50 text-blue-600'     },
  { value: 'finalist', label: 'Finalist',    color: 'bg-purple-50 text-purple-600' },
  { value: 'won',      label: 'Won',         color: 'bg-green-50 text-green-700'   },
  { value: 'rejected', label: 'Rejected',    color: 'bg-red-50 text-red-400'       },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDeadline(deadline) {
  if (!deadline) return ''
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? `${deadline}T00:00:00` : deadline
  const d = new Date(normalized)
  if (isNaN(d)) return deadline
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── SavedCard ────────────────────────────────────────────────────────────────

function SavedCard({ savedRow, opportunity }) {
  const { unsaveOpportunity, updateSaved } = useSaved()

  const [localStatus, setLocalStatus] = useState(savedRow.status || 'saved')
  const [statusLoading, setStatusLoading] = useState(false)
  const [showNotes, setShowNotes]         = useState(false)
  const [notes, setNotes]                 = useState(savedRow.notes || '')
  const [savingNotes, setSavingNotes]     = useState(false)
  const [notesError, setNotesError]       = useState('')
  const [unsaving, setUnsaving]           = useState(false)
  const [unsaveError, setUnsaveError]     = useState('')
  const [copied, setCopied]               = useState(false)

  // Sync local state when the parent's savedRow updates (e.g. after a
  // successful save elsewhere, or a realtime update). This is intentional
  // prop-to-state syncing, not a computable derived value — the ESLint rule
  // is being generic here; this pattern is correct and necessary.
  useEffect(() => {
    setNotes(savedRow.notes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedRow.notes])

  useEffect(() => {
    setLocalStatus(savedRow.status || 'saved')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedRow.status])

  const daysLeft = getDaysLeft(opportunity.deadline)
  const isExpired = daysLeft !== null && daysLeft < 0
  const isUrgentNotApplied =
    localStatus === 'saved' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7

  async function handleStatusChange(newStatus) {
    if (statusLoading || newStatus === localStatus) return
    const previous = localStatus
    setLocalStatus(newStatus)
    setStatusLoading(true)
    try {
      await updateSaved(opportunity.id, { status: newStatus })
    } catch (err) {
      console.error('Status update failed:', err)
      setLocalStatus(previous)
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleSaveNotes() {
    if (savingNotes) return
    setSavingNotes(true)
    setNotesError('')
    try {
      await updateSaved(opportunity.id, { notes: notes.trim() })
      setShowNotes(false)
    } catch (err) {
      console.error('Notes save failed:', err)
      setNotesError('Could not save notes. Please try again.')
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleUnsave() {
    if (unsaving) return
    setUnsaving(true)
    setUnsaveError('')
    try {
      await unsaveOpportunity(opportunity.id)
    } catch (err) {
      console.error('Unsave failed:', err)
      setUnsaveError('Could not remove. Please try again.')
      setUnsaving(false)
    }
  }

  async function handleShare() {
    if (!opportunity.link) return
    try {
      if (navigator.share) {
        await navigator.share({ title: opportunity.title || 'Opportunity', url: opportunity.link })
      } else {
        await navigator.clipboard.writeText(opportunity.link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) { console.error('Share failed:', err) }
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 md:p-5 flex flex-col gap-3 transition-opacity ${
      isUrgentNotApplied ? 'border-red-200' : 'border-gray-100'
    } ${unsaving ? 'opacity-50 pointer-events-none' : ''}`}>

      {isUrgentNotApplied && !isExpired && (
        <div className="bg-red-50 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg">
          ⚠️ Closing {daysLeft === 0 ? 'today!' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!`} Don't miss this.
        </div>
      )}
      {isExpired && (
        <div className="bg-gray-50 text-gray-400 text-xs font-semibold px-3 py-2 rounded-lg">
          This opportunity has expired
        </div>
      )}

      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 flex-wrap items-center mb-1">
            <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
              {opportunity.type || 'Opportunity'}
            </span>
            {opportunity.featured && (
              <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">★ Featured</span>
            )}
            {opportunity.verified && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Verified</span>
            )}
          </div>
          <h3 className="text-sm md:text-base font-bold text-gray-900 leading-snug">
            {opportunity.title || 'Untitled'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{opportunity.organization || ''}</p>
        </div>

        <button onClick={handleUnsave} disabled={unsaving}
          aria-label="Remove from saved" title="Remove from saved"
          className="text-gray-300 hover:text-red-400 transition-all text-lg shrink-0 disabled:opacity-50">
          ✕
        </button>
      </div>

      {unsaveError && (
        <p role="alert" className="text-xs text-red-500">{unsaveError}</p>
      )}

      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
        {opportunity.description || 'No description available.'}
      </p>

      <div className="flex gap-2 flex-wrap">
        {opportunity.location && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            📍 {opportunity.location}{opportunity.city ? ` · ${opportunity.city}` : ''}
          </span>
        )}
        {opportunity.discipline && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{opportunity.discipline}</span>
        )}
        {opportunity.level && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{opportunity.level}</span>
        )}
      </div>

      {opportunity.deadline && (
        <p className="text-xs text-gray-400">
          📅 {formatDeadline(opportunity.deadline)}
          {daysLeft !== null && daysLeft >= 0 && (
            <span className={`ml-2 font-semibold px-2 py-0.5 rounded-full ${
              daysLeft <= 7 ? 'bg-red-100 text-red-600'
              : daysLeft <= 30 ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-700'
            }`}>
              {daysLeft === 0 ? 'Last day!' : `${daysLeft}d left`}
            </span>
          )}
          {isExpired && (
            <span className="ml-2 font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Expired</span>
          )}
        </p>
      )}

      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-xs text-gray-400 font-medium">Status:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
            disabled={statusLoading} aria-pressed={localStatus === opt.value}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all border disabled:opacity-60 ${
              localStatus === opt.value
                ? `${opt.color} border-transparent`
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <button onClick={() => setShowNotes(!showNotes)} aria-expanded={showNotes}
          className="text-xs text-[#0a9396] hover:underline">
          {showNotes ? 'Hide notes' : savedRow.notes ? 'Edit notes' : '+ Add private notes'}
        </button>

        {!showNotes && savedRow.notes && (
          <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2">{savedRow.notes}</p>
        )}

        {showNotes && (
          <div className="mt-2 flex flex-col gap-2">
            <label htmlFor={`notes-${savedRow.id}`} className="sr-only">
              Private notes for {opportunity.title || 'this opportunity'}
            </label>
            <textarea id={`notes-${savedRow.id}`} value={notes}
              onChange={(e) => { setNotes(e.target.value); if (notesError) setNotesError('') }}
              rows={3} placeholder="Your private notes — essay draft link, reminders, deadlines..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-[#0a9396] resize-none" />
            {notesError && (
              <p role="alert" className="text-xs text-red-500">{notesError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleSaveNotes} disabled={savingNotes}
                className="text-xs bg-[#0a9396] text-white px-4 py-1.5 rounded-full font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50">
                {savingNotes ? 'Saving…' : 'Save notes'}
              </button>
              <button onClick={() => { setShowNotes(false); setNotes(savedRow.notes || ''); setNotesError('') }}
                className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
        <button type="button" onClick={handleShare} disabled={!opportunity.link}
          aria-label={copied ? 'Link copied!' : 'Share this opportunity'}
          className={`text-sm px-3 py-2 rounded-full transition-all border ${
            copied ? 'border-[#0a9396] text-[#0a9396]'
            : opportunity.link ? 'border-gray-200 text-gray-500 hover:border-[#0a9396] hover:text-[#0a9396]'
            : 'border-gray-100 text-gray-300 cursor-not-allowed'
          }`}>
          {copied ? '✓ Copied' : 'Share'}
        </button>

        {opportunity.link ? (
          <a href={opportunity.link} target="_blank" rel="noopener noreferrer"
            className="text-sm bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all">
            Apply →
          </a>
        ) : (
          <span className="text-sm bg-gray-200 text-gray-400 px-5 py-2 rounded-full cursor-not-allowed">No link</span>
        )}
      </div>
    </div>
  )
}

// ─── SavedPage ────────────────────────────────────────────────────────────────

function SavedPage() {
  const { saved, loadingSaved, markUrgentSavedAsSeen } = useSaved()
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut]       = useState(false)

  const markSeenRef = useRef(markUrgentSavedAsSeen)
  useEffect(() => { markSeenRef.current = markUrgentSavedAsSeen })
  useEffect(() => { markSeenRef.current?.() }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Logout error:', err)
      setLoggingOut(false)
      setLogoutConfirm(false)
    }
  }

  const urgentCount = saved.filter((s) => {
    if (!s.opportunities) return false
    if (s.status !== 'saved') return false
    const days = getDaysLeft(s.opportunities.deadline)
    return days !== null && days >= 0 && days <= 7
  }).length

  const statusGroups = {
    saved:    saved.filter((s) => s.status === 'saved'),
    applied:  saved.filter((s) => s.status === 'applied'),
    finalist: saved.filter((s) => s.status === 'finalist'),
    won:      saved.filter((s) => s.status === 'won'),
    rejected: saved.filter((s) => s.status === 'rejected'),
  }

  return (
    <div className="min-h-screen bg-[#f0fafa]">

      <nav className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 md:px-10 py-3">
          <Link to="/opportunities" className="shrink-0">
            <Logo />
          </Link>

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

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Saved Opportunities</h1>
            <p className="text-gray-500 text-sm mt-1">
              {saved.length} saved · Track your applications and deadlines
            </p>
          </div>
          {urgentCount > 0 && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 rounded-full">
              ⚠️ {urgentCount} closing within 7 days
            </div>
          )}
        </div>

        {saved.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-6 md:mb-8">
            {STATUS_OPTIONS.map((opt) => (
              <div key={opt.value} className="bg-white rounded-xl border border-gray-100 p-2 md:p-3 text-center">
                <p className="text-lg md:text-xl font-bold text-gray-900">{statusGroups[opt.value].length}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{opt.label}</p>
              </div>
            ))}
          </div>
        )}

        {loadingSaved ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading your saved opportunities…</div>
        ) : saved.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 md:p-12 text-center border border-gray-100">
            <p className="text-base md:text-lg font-semibold text-gray-900">Nothing saved yet</p>
            <p className="text-gray-400 text-sm mt-2">Hit the bookmark icon on any opportunity to save it here</p>
            <Link to="/opportunities"
              className="mt-6 inline-block bg-[#0a9396] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all">
              Browse opportunities
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:gap-4">
            {saved.filter((savedRow) => savedRow.opportunities).map((savedRow) => (
              <SavedCard key={savedRow.id} savedRow={savedRow} opportunity={savedRow.opportunities} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SavedPage
