import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './logo'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 1000
const MIN_MESSAGE_LENGTH = 10

const CONTACT_TYPES = [
  { id: 'general',  icon: '💡', title: 'General question',    desc: 'Tell us what would make Stride better'  },
  { id: 'broken',   icon: '🔗', title: 'Report a broken link', desc: 'Help us keep listings accurate'         },
  { id: 'tip',      icon: '📬', title: 'Submit a tip',         desc: 'Know an opportunity we missed?'         },
]

const INITIAL_FORM = {
  type: 'General question',
  email: '',
  message: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

function ContactPage() {
  const [form, setForm]       = useState(INITIAL_FORM)
  const [status, setStatus]   = useState('idle') // idle | sending | success | error
  const [formError, setFormError] = useState('')

  const charsLeft = MAX_MESSAGE_LENGTH - form.message.length

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (formError) setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return

    setFormError('')

    // ── Client-side validation (defense beyond HTML required) ──────────────
    const trimmedEmail   = form.email.trim()
    const trimmedMessage = form.message.trim()

    if (!trimmedEmail) {
      setFormError('Please enter your email address.')
      return
    }

    if (!trimmedMessage || trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      setFormError(`Please write at least ${MIN_MESSAGE_LENGTH} characters in your message.`)
      return
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setFormError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`)
      return
    }

    setStatus('sending')

    try {
      // ⚠️ Replace YOUR_FORM_ID with your actual Formspree form ID before deploying
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          type:    form.type,
          email:   trimmedEmail,
          message: trimmedMessage,
        }),
      })

      if (res.ok) {
        setStatus('success')
        setForm(INITIAL_FORM)
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Contact form submission error:', err)
      setStatus('error')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa]">

      {/* Nav */}
      <nav aria-label="Contact page navigation" className="bg-white shadow-sm px-6 md:px-10 py-4">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact & Support</h1>
        <p className="text-gray-500 mb-10">
          Have a question, spotted a broken link, or want to suggest a feature?
          We read every message and reply within 48 hours.
        </p>

        {/* Quick-select type cards — proper buttons for keyboard access */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
          role="group"
          aria-label="Select message type"
        >
          {CONTACT_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, type: item.title }))
                if (formError) setFormError('')
              }}
              aria-pressed={form.type === item.title}
              className={`text-left bg-white rounded-2xl border p-4 transition-all ${
                form.type === item.title
                  ? 'border-[#0a9396] shadow-sm'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="text-2xl mb-2" aria-hidden="true">{item.icon}</div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
            <div className="text-4xl mb-4" aria-hidden="true">✅</div>
            <h2 className="text-xl font-bold text-gray-900">Message sent!</h2>
            <p className="text-gray-500 mt-2">We'll get back to you within 48 hours.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 inline-block bg-[#0a9396] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col gap-5"
          >
            {/* Type dropdown — stays in sync with the cards above */}
            <div>
              <label
                htmlFor="contact-type"
                className="text-sm font-semibold text-gray-700 mb-1 block"
              >
                What's this about?
              </label>
              <select
                id="contact-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white"
              >
                <option>General question</option>
                <option>Suggest a feature</option>
                <option>Report a broken link</option>
                <option>Submit a tip</option>
                <option>Report an issue</option>
                <option>Other</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="contact-email"
                className="text-sm font-semibold text-gray-700 mb-1 block"
              >
                Your email *
              </label>
              <input
                id="contact-email"
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            {/* Message */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label
                  htmlFor="contact-message"
                  className="text-sm font-semibold text-gray-700"
                >
                  Message *
                </label>
                <span
                  className={`text-xs ${charsLeft < 100 ? 'text-orange-500' : 'text-gray-400'}`}
                  aria-live="polite"
                  aria-label={`${charsLeft} characters remaining`}
                >
                  {charsLeft} / {MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <textarea
                id="contact-message"
                required
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={5}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Tell us anything..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] resize-none"
              />
            </div>

            {/* Validation error */}
            {formError && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3 border border-red-100"
              >
                {formError}
              </div>
            )}

            {/* Submission error */}
            {status === 'error' && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3 border border-red-100"
              >
                Something went wrong. Try emailing us directly at{' '}
                <a
                  href="mailto:stride.pak@gmail.com"
                  className="text-[#0a9396] hover:underline"
                >
                  stride.pak@gmail.com
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-400 mt-8">
          Or email us directly:{' '}
          <a
            href="mailto:stride.pak@gmail.com"
            className="text-[#0a9396] hover:underline"
          >
            stride.pak@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default ContactPage
