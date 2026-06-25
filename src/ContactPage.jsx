import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './logo'

function ContactPage() {
  const [form, setForm] = useState({
    type: 'General question',
    email: '',
    message: '',
  })
  const [status, setStatus] = useState('idle')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')

    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setStatus('success')
        setForm({ type: 'General question', email: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact & Support</h1>
        <p className="text-gray-500 mb-10">
          Have a question, spotted a broken link, or want to suggest a feature?
          We read every message and reply within 48 hours.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '💡', title: 'Suggest a feature', desc: 'Tell us what would make Stride better' },
            { icon: '🔗', title: 'Report a broken link', desc: 'Help us keep listings accurate' },
            { icon: '📬', title: 'Submit a tip', desc: 'Know an opportunity we missed?' },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => setForm((f) => ({ ...f, type: item.title }))}
              className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                form.type === item.title
                  ? 'border-[#0a9396] shadow-sm'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {status === 'success' ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
            <div className="text-4xl mb-4">✅</div>
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
            className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col gap-5"
          >
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                What's this about?
              </label>
              <select
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

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Your email *
              </label>
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Message *
              </label>
              <textarea
                required
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={5}
                placeholder="Tell us anything..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3">
                Something went wrong. Try emailing us directly at{' '}
                <a href="mailto:stride.pak@gmail.com" className="text-[#0a9396] hover:underline">
                  stride.pak@gmail.com
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-400 mt-8">
          Or email us directly:{' '}
          <a href="mailto:stride.pak@gmail.com" className="text-[#0a9396] hover:underline">
            stride.pak@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default ContactPage