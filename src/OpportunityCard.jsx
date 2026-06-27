import { useState } from 'react'
import { useSaved } from './SavedContext'
import { Link } from 'react-router-dom'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeIsNew(createdAt) {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (isNaN(created.getTime())) return false
  return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7
}

function getDaysLeft(deadline) {
  if (!deadline) {
    return { text: 'No deadline', style: 'bg-gray-100 text-gray-400', isExpired: false, isClosingSoon: false }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? `${deadline}T00:00:00` : deadline
  const deadlineDate = new Date(normalized)
  if (isNaN(deadlineDate)) {
    return { text: 'Invalid date', style: 'bg-gray-100 text-gray-400', isExpired: false, isClosingSoon: false }
  }
  const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)   return { text: 'Expired',          style: 'bg-gray-100 text-gray-400',      isExpired: true,  isClosingSoon: false }
  if (daysLeft === 0) return { text: 'Last day!',         style: 'bg-red-100 text-red-600',        isExpired: false, isClosingSoon: true  }
  if (daysLeft <= 7)  return { text: `${daysLeft}d left`, style: 'bg-red-100 text-red-600',        isExpired: false, isClosingSoon: true  }
  if (daysLeft <= 30) return { text: `${daysLeft}d left`, style: 'bg-orange-100 text-orange-600',  isExpired: false, isClosingSoon: false }
  return               { text: `${daysLeft}d left`,       style: 'bg-green-100 text-green-700',    isExpired: false, isClosingSoon: false }
}

function formatDeadline(deadline) {
  if (!deadline) return ''
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? `${deadline}T00:00:00` : deadline
  const d = new Date(normalized)
  if (isNaN(d)) return deadline
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Characters shown before offering the expand toggle
const DESCRIPTION_LIMIT = 160

// ─── Component ────────────────────────────────────────────────────────────────

function OpportunityCard({
  id, title, type, deadline, description, link, created_at,
  location, city, organization, verified, featured, discipline, level,
  previewOnly = false,
}) {
  const { isSaved, saveOpportunity, unsaveOpportunity, loadingIds = [] } = useSaved()
  const saved       = isSaved(id)
  const saveLoading = loadingIds.includes(id)
  const isNew       = computeIsNew(created_at)
  const days        = getDaysLeft(deadline)

  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const isLong             = (description || '').length > DESCRIPTION_LIMIT
  const displayDescription = !isLong || expanded
    ? (description || 'No description available.')
    : (description || '').slice(0, DESCRIPTION_LIMIT).trimEnd() + '…'

  async function handleShare() {
    if (!link) return
    try {
      if (navigator.share) {
        await navigator.share({ title: title || 'Opportunity', url: link })
      } else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) { console.error('Share failed:', err) }
  }

  async function handleSaveToggle() {
    if (saveLoading) return
    try {
      if (saved) { await unsaveOpportunity(id) }
      else       { await saveOpportunity(id)   }
    } catch (err) { console.error('Save toggle failed:', err) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all flex flex-col h-full">

      {/* Badges row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
            {type || 'Opportunity'}
          </span>
          {featured && (
            <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">★ Featured</span>
          )}
          {verified && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Verified</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isNew && (
            <span className="text-xs font-semibold text-white bg-[#0a9396] px-2 py-1 rounded-full">New</span>
          )}
          {!previewOnly && (
            <button
              type="button"
              onClick={handleSaveToggle}
              disabled={saveLoading}
              aria-label={saved ? 'Remove from saved' : 'Save this opportunity'}
              title={saved ? 'Remove from saved' : 'Save this opportunity'}
              className="transition-all hover:scale-110 p-0.5 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={saved ? '#0a9396' : 'none'}
                stroke={saved ? '#0a9396' : '#9ca3af'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Closing soon */}
      {days.isClosingSoon && (
        <div className="mt-3 bg-red-50 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg">
          ⚠️ Closing Soon!
        </div>
      )}

      {/* Title + org */}
      <div className="mt-3">
        <h3 className="text-base font-bold text-gray-900 leading-snug">{title || 'Untitled'}</h3>
        <p className="text-xs text-gray-400 mt-1 font-medium min-h-[18px]">{organization || ' '}</p>
      </div>

      {/* Description with inline expand */}
      <div className="mt-2 flex-1">
        <p className="text-sm text-gray-500 leading-relaxed">
          {displayDescription}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="ml-1 text-[#0a9396] text-xs font-semibold hover:underline focus:outline-none whitespace-nowrap"
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </p>
      </div>

      {/* Meta tags */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {location   && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{location}</span>}
        {city       && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{city}</span>}
        {discipline && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{discipline}</span>}
        {level      && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{level}</span>}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">{formatDeadline(deadline)}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${days.style}`}>{days.text}</span>
        </div>

        {!previewOnly ? (
          <div className="flex gap-2 shrink-0 items-center">
            <button
              type="button"
              onClick={handleShare}
              disabled={!link}
              aria-label={copied ? 'Link copied!' : 'Share this opportunity'}
              className={`text-sm px-3 py-2 rounded-full transition-all border ${
                copied          ? 'border-[#0a9396] text-[#0a9396]'
                : link         ? 'border-gray-200 text-gray-500 hover:border-[#0a9396] hover:text-[#0a9396]'
                               : 'border-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              {copied ? '✓ Copied' : 'Share'}
            </button>
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer"
                className="text-sm bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all">
                Apply →
              </a>
            ) : (
              <span className="text-sm bg-gray-200 text-gray-400 px-5 py-2 rounded-full cursor-not-allowed">No link</span>
            )}
          </div>
        ) : (
          <Link to="/auth" className="text-sm bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all">
            Sign in to access
          </Link>
        )}
      </div>
    </div>
  )
}

export default OpportunityCard
