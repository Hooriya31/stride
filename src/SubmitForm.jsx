import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Logo from './logo'
import { useAuth } from './AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  title: '',
  type: '',
  deadline: '',
  description: '',
  link: '',
  location: '',
  city: '',
  organization: '',
  source_url: '',
  discipline: '',
  level: '',
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(value = '') {
  return value.trim().replace(/\s+/g, ' ')
}

function toTitleCase(value = '') {
  return normalizeText(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeOptionalTitleCase(value = '') {
  const cleaned = normalizeText(value)
  return cleaned ? toTitleCase(cleaned) : null
}

/**
 * More lenient than AdminPanel's version — auto-prefixes https:// if missing.
 * Better UX for user-submitted forms.
 */
function normalizeUrl(value = '') {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function isFutureOrToday(dateString) {
  if (!dateString) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selected = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(selected.getTime())) return false
  return selected >= today
}

// ─── Component ────────────────────────────────────────────────────────────────

function SubmitForm() {
  const { user, loading } = useAuth()

  const [form, setForm] = useState(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successTitle, setSuccessTitle] = useState('')

  const minDate = useMemo(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  // Show nothing while auth is resolving — avoids flash before redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setErrorMessage('')

    try {
      // ── Normalize ──────────────────────────────────────────────────────────
      const title = toTitleCase(form.title)
      const organization = toTitleCase(form.organization)
      const type = form.type.trim()
      const deadline = form.deadline
      const description = normalizeText(form.description)
      const location = form.location.trim()
      const applicationLink = normalizeUrl(form.link)
      const city = normalizeOptionalTitleCase(form.city)
      const discipline = normalizeOptionalTitleCase(form.discipline)
      const level = form.level.trim() || null

      let sourceUrl = null
      if (form.source_url.trim()) {
        sourceUrl = normalizeUrl(form.source_url)
        if (!sourceUrl) {
          setErrorMessage('Source URL must be a valid link if provided.')
          return
        }
      }

      // ── Validation ─────────────────────────────────────────────────────────
      if (!title) {
        setErrorMessage('Please enter an opportunity title.')
        return
      }

      if (!organization) {
        setErrorMessage('Please enter the organization name.')
        return
      }

      if (!TYPE_OPTIONS.includes(type)) {
        setErrorMessage('Please select a valid opportunity type.')
        return
      }

      if (!deadline || !isFutureOrToday(deadline)) {
        setErrorMessage('Please choose a valid deadline that is today or later.')
        return
      }

      if (!description || description.length < 20) {
        setErrorMessage('Please add a slightly fuller description (at least 20 characters).')
        return
      }

      if (!applicationLink) {
        setErrorMessage('Please enter a valid application link.')
        return
      }

      if (!LOCATION_OPTIONS.includes(location)) {
        setErrorMessage('Please select a valid location type.')
        return
      }

      if (level && !LEVEL_OPTIONS.includes(level)) {
        setErrorMessage('Please select a valid level.')
        return
      }

      // ── Submit ─────────────────────────────────────────────────────────────
      const payload = {
        title,
        organization,
        type,
        deadline,
        description,
        link: applicationLink,
        location,
        city,
        discipline,
        level,
        source_url: sourceUrl,
        status: 'pending',
        submitted_by_user: true,
        verified: false,
        featured: false,
        submitted_by: user.id,
        submitter_email: user.email ?? null,
      }

      const { error } = await supabase.from('opportunities').insert([payload])

      if (error) {
        console.error('Opportunity submission error:', error)
        setErrorMessage(
          error.message || 'Something went wrong while submitting. Please try again.'
        )
        return
      }

      setSuccessTitle(title)
      setSubmitted(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      console.error('Unexpected submission error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <nav className="bg-white shadow-sm px-6 md:px-10 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/opportunities">
            <Logo />
          </Link>
          <Link
            to="/opportunities"
            className="text-sm text-gray-500 hover:text-[#0a9396] transition-all"
          >
            ← Back to Opportunities
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit an Opportunity</h1>
        <p className="text-gray-500 mb-3">
          Know about a scholarship, internship, fellowship, competition, or any opportunity
          Pakistani students should know about?
        </p>
        <p className="text-gray-500 mb-10">
          Submit it here and Stride will review it before publishing.
        </p>

        {submitted ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">Thank you!</h2>
            <p className="text-gray-500 mt-2">
              <span className="font-medium text-gray-700">{successTitle}</span> has been
              submitted for review.
            </p>
            <p className="text-gray-500 mt-2">
              If it's a good fit for Stride, it'll be added after approval.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setSubmitted(false)}
                className="inline-block bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-full text-sm font-semibold hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
              >
                Submit another
              </button>

              <Link
                to="/opportunities"
                className="inline-block bg-[#0a9396] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all"
              >
                Back to Opportunities
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col gap-5"
          >
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3 border border-red-100"
              >
                {errorMessage}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="text-sm font-semibold text-gray-700 mb-1 block">
                Opportunity Title *
              </label>
              <input
                id="title"
                required
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. HEC Need Based Scholarship 2026"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization" className="text-sm font-semibold text-gray-700 mb-1 block">
                Organization *
              </label>
              <input
                id="organization"
                required
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="e.g. HEC, LUMS, Google, PITB"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="text-sm font-semibold text-gray-700 mb-1 block">
                Type *
              </label>
              <select
                id="type"
                required
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white"
              >
                <option value="">Select type</option>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className="text-sm font-semibold text-gray-700 mb-1 block">
                Deadline *
              </label>
              <input
                id="deadline"
                required
                type="date"
                name="deadline"
                min={minDate}
                value={form.deadline}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-1 block">
                Description *
              </label>
              <textarea
                id="description"
                required
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="What is it, who is it for, and why should students care?"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Keep it short and useful — Stride can polish it before publishing.
              </p>
            </div>

            {/* Application Link */}
            <div>
              <label htmlFor="link" className="text-sm font-semibold text-gray-700 mb-1 block">
                Application Link *
              </label>
              <input
                id="link"
                required
                name="link"
                value={form.link}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="text-sm font-semibold text-gray-700 mb-1 block">
                Location Type *
              </label>
              <select
                id="location"
                required
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white"
              >
                <option value="">Select location</option>
                {LOCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="text-sm font-semibold text-gray-700 mb-1 block">
                City
              </label>
              <input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Islamabad / Lahore / Nationwide"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Discipline */}
            <div>
              <label htmlFor="discipline" className="text-sm font-semibold text-gray-700 mb-1 block">
                Discipline
              </label>
              <input
                id="discipline"
                name="discipline"
                value={form.discipline}
                onChange={handleChange}
                placeholder="e.g. CS, Engineering, Business, All disciplines"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Level */}
            <div>
              <label htmlFor="level" className="text-sm font-semibold text-gray-700 mb-1 block">
                Level
              </label>
              <select
                id="level"
                name="level"
                value={form.level}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white"
              >
                <option value="">Select level</option>
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Source URL */}
            <div>
              <label htmlFor="source_url" className="text-sm font-semibold text-gray-700 mb-1 block">
                Source URL / Where did you find this?
              </label>
              <input
                id="source_url"
                name="source_url"
                value={form.source_url}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Opportunity'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default SubmitForm
