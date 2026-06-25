import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from './logo'
import { useAuth } from './AuthContext'
import { useSaved } from './SavedContext'

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Not applied', color: 'bg-gray-100 text-gray-500' },
  { value: 'applied', label: 'Applied', color: 'bg-blue-50 text-blue-600' },
  { value: 'finalist', label: 'Finalist', color: 'bg-purple-50 text-purple-600' },
  { value: 'won', label: 'Won', color: 'bg-green-50 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-400' },
]

function getDaysLeft(deadline) {
  if (!deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? deadline + 'T00:00:00'
    : deadline

  const d = new Date(normalized)
  if (isNaN(d)) return null

  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

function formatDeadline(deadline) {
  if (!deadline) return ''

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? deadline + 'T00:00:00'
    : deadline

  const d = new Date(normalized)
  if (isNaN(d)) return deadline

  return d.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SavedCard({ savedRow, opportunity }) {
  const { unsaveOpportunity, updateSaved } = useSaved()
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(savedRow.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const daysLeft = getDaysLeft(opportunity.deadline)
  const isExpired = daysLeft !== null && daysLeft < 0

  // urgent banner should ONLY show if still not applied
  const isUrgentNotApplied =
    savedRow.status === 'saved' &&
    daysLeft !== null &&
    daysLeft >= 0 &&
    daysLeft <= 7

  async function handleStatusChange(newStatus) {
    await updateSaved(opportunity.id, { status: newStatus })
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    await updateSaved(opportunity.id, { notes })
    setSavingNotes(false)
    setShowNotes(false)
  }

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${
        isUrgentNotApplied ? 'border-red-200' : 'border-gray-100'
      }`}
    >
      {/* Urgent banner */}
      {isUrgentNotApplied && !isExpired && (
        <div className="bg-red-50 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg">
          ⚠️ Closing in {daysLeft === 0 ? 'today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}!`} Don't miss this.
        </div>
      )}

      {isExpired && (
        <div className="bg-gray-50 text-gray-400 text-xs font-semibold px-3 py-2 rounded-lg">
          This opportunity has expired
        </div>
      )}

      {/* Top row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex gap-2 flex-wrap items-center mb-1">
            <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
              {opportunity.type}
            </span>

            {opportunity.verified && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {opportunity.title}
          </h3>

          <p className="text-xs text-gray-400 mt-0.5">
            {opportunity.organization}
          </p>
        </div>

        <button
          onClick={() => unsaveOpportunity(opportunity.id)}
          className="text-gray-300 hover:text-red-400 transition-all text-lg shrink-0"
          title="Remove from saved"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
        {opportunity.description}
      </p>

      {/* Deadline + location */}
      <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
        <span>📅 {formatDeadline(opportunity.deadline)}</span>
        <span>
          📍 {opportunity.location}
          {opportunity.city ? ` · ${opportunity.city}` : ''}
        </span>
      </div>

      {/* Status selector */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-400 font-medium">Status:</span>

        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
              savedRow.status === opt.value
                ? `${opt.color} border-transparent`
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-[#0a9396] hover:underline"
        >
          {showNotes ? 'Hide notes' : savedRow.notes ? 'Edit notes' : '+ Add private notes'}
        </button>

        {!showNotes && savedRow.notes && (
          <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2">
            {savedRow.notes}
          </p>
        )}

        {showNotes && (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your private notes — essay draft link, reminders, deadlines..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-[#0a9396] resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs bg-[#0a9396] text-white px-4 py-1.5 rounded-full font-semibold hover:bg-[#007f82] transition-all disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save notes'}
              </button>

              <button
                onClick={() => {
                  setShowNotes(false)
                  setNotes(savedRow.notes || '')
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100">
        <a
          href={opportunity.link}
          target="_blank"
          rel="noreferrer"
          className="text-sm bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all"
        >
          Apply →
        </a>
      </div>
    </div>
  )
}

function SavedPage() {
  const { saved, loadingSaved, markUrgentSavedAsSeen } = useSaved()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    markUrgentSavedAsSeen()
  }, [])

  // TOP banner should count ONLY not-applied saved items closing soon
  const urgentCount = saved.filter((s) => {
    if (!s.opportunities) return false
    if (s.status !== 'saved') return false

    const days = getDaysLeft(s.opportunities.deadline)
    return days !== null && days >= 0 && days <= 7
  }).length

  const statusGroups = {
    saved: saved.filter((s) => s.status === 'saved'),
    applied: saved.filter((s) => s.status === 'applied'),
    finalist: saved.filter((s) => s.status === 'finalist'),
    won: saved.filter((s) => s.status === 'won'),
    rejected: saved.filter((s) => s.status === 'rejected'),
  }

  async function handleLogout() {
    const confirmed = window.confirm('Are you sure you want to log out?')
    if (!confirmed) return

    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <nav className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4">
          <Link to="/opportunities">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/opportunities"
              className="text-sm text-gray-500 hover:text-[#0a9396] transition-all"
            >
              ← All Opportunities
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-full hover:border-red-300 hover:text-red-500 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Opportunities</h1>
            <p className="text-gray-500 text-sm mt-1">
              {saved.length} saved · Track your applications and deadlines
            </p>
          </div>

          {urgentCount > 0 && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-full">
              ⚠️ {urgentCount} closing within 7 days
            </div>
          )}
        </div>

        {saved.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {STATUS_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className="bg-white rounded-xl border border-gray-100 p-3 text-center"
              >
                <p className="text-xl font-bold text-gray-900">
                  {statusGroups[opt.value].length}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.label}</p>
              </div>
            ))}
          </div>
        )}

        {loadingSaved ? (
          <div className="text-center py-20 text-gray-400">
            Loading your saved opportunities...
          </div>
        ) : saved.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-lg font-semibold text-gray-900">Nothing saved yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Hit the bookmark icon on any opportunity to save it here
            </p>
            <Link
              to="/opportunities"
              className="mt-6 inline-block bg-[#0a9396] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all"
            >
              Browse opportunities
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {saved
              .filter((savedRow) => savedRow.opportunities)
              .map((savedRow) => (
                <SavedCard
                  key={savedRow.id}
                  savedRow={savedRow}
                  opportunity={savedRow.opportunities}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SavedPage