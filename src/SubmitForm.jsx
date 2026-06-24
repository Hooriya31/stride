import { useState } from 'react'
import { supabase } from './supabase'
import Logo from './logo'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

function SubmitForm() {
  const { user } = useAuth()

  const [form, setForm] = useState({
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
  })

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const payload = {
      ...form,
      status: 'pending',
      submitted_by_user: true,
      verified: false,
      featured: false,
    }

    const { error } = await supabase.from('opportunities').insert([payload])

    setLoading(false)

    if (error) {
      console.error(error)
      setErrorMessage(error.message || 'Something went wrong while submitting.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <nav className="bg-white shadow-sm px-6 md:px-10 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/opportunities"><Logo /></Link>
          <Link to="/opportunities" className="text-sm text-gray-500 hover:text-[#0a9396] transition-all">
            ← Back to Opportunities
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit an Opportunity</h1>
        <p className="text-gray-500 mb-10">
          Know about a scholarship, internship or competition Pakistani students should know about?
          Submit it here and we'll review it within 48 hours.
        </p>

        {submitted ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">Thank you!</h2>
            <p className="text-gray-500 mt-2">
              Your submission is under review. We'll add it to Stride if it's a good fit.
            </p>
            <Link to="/opportunities" className="mt-6 inline-block bg-[#0a9396] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#007f82] transition-all">
              Back to Opportunities
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col gap-5">
            {errorMessage && (
              <div className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3">{errorMessage}</div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Opportunity Title *</label>
              <input required name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. HEC Need Based Scholarship 2026"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Organization *</label>
              <input required name="organization" value={form.organization} onChange={handleChange}
                placeholder="e.g. HEC, LUMS, Google, PITB"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Type *</label>
              <select required name="type" value={form.type} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white">
                <option value="">Select type</option>
                <option>Scholarship</option>
                <option>Internship</option>
                <option>Competition</option>
                <option>Hackathon</option>
                <option>Research</option>
                <option>Fellowship</option>
                <option>Program</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Deadline *</label>
              <input required type="date" name="deadline" value={form.deadline} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Description *</label>
              <textarea required name="description" value={form.description} onChange={handleChange}
                rows={4} placeholder="Brief description of the opportunity..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] resize-none" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Application Link *</label>
              <input required type="url" name="link" value={form.link} onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Location Type *</label>
              <select required name="location" value={form.location} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white">
                <option value="">Select location</option>
                <option>Remote</option>
                <option>Onsite</option>
                <option>Hybrid</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">City</label>
              <input name="city" value={form.city} onChange={handleChange}
                placeholder="e.g. Islamabad / Lahore / Nationwide"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Discipline</label>
              <input name="discipline" value={form.discipline} onChange={handleChange}
                placeholder="e.g. CS, Engineering, Business, All disciplines"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Level</label>
              <select name="level" value={form.level} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396] bg-white">
                <option value="">Select level</option>
                <option>High School</option>
                <option>Undergraduate</option>
                <option>Graduate</option>
                <option>Masters</option>
                <option>PhD</option>
                <option>All levels</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Source URL / Where did you find this?</label>
              <input name="source_url" value={form.source_url} onChange={handleChange}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0a9396]" />
            </div>

            <button type="submit" disabled={loading}
              className="bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Opportunity'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default SubmitForm