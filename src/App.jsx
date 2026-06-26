import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import OpportunityCard from './OpportunityCard'
import { supabase } from './supabase'
import Logo from './logo'
import { useAuth } from './AuthContext'
import { useSaved } from './SavedContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'All',
  'Scholarships',
  'Internships',
  'Competitions',
  'Hackathons',
  'Research',
  'Fellowships',
  'Programs',
]

// Maps sidebar category label → DB type value
const CATEGORY_MAP = {
  Scholarships: 'Scholarship',
  Internships:  'Internship',
  Competitions: 'Competition',
  Hackathons:   'Hackathon',
  Research:     'Research',
  Fellowships:  'Fellowship',
  Programs:     'Program',
}

const SORT_OPTIONS = [
  { value: 'default',  label: 'Default (Newest)'     },
  { value: 'deadline', label: 'Closing Soon First'    },
]

const FAQS = [
  {
    id: 'who',
    q: 'Who is Stride for?',
    a: 'Stride is built for Pakistani university and college students looking for scholarships, internships, fellowships, competitions, hackathons, and research opportunities.',
  },
  {
    id: 'free',
    q: 'Is Stride free to use?',
    a: 'Yes, completely free to use.',
  },
  {
    id: 'updates',
    q: 'How often are opportunities updated?',
    a: 'We update Stride regularly with new opportunities across all categories.',
  },
  {
    id: 'submit',
    q: 'Can students submit opportunities too?',
    a: 'Yes — once logged in, users can submit opportunities for review.',
  },
]

const ABOUT_STATS = [
  {
    id: 'opps',
    stat: '500+',
    label: 'Opportunities',
    desc: 'Scholarships, internships, fellowships, competitions and more in one place',
  },
  {
    id: 'cats',
    stat: '7',
    label: 'Categories',
    desc: "Organized so you find exactly what you're looking for",
  },
  {
    id: 'updates',
    stat: 'Weekly',
    label: 'Updates',
    desc: 'New opportunities added regularly so you never miss out',
  },
  {
    id: 'cost',
    stat: '0 PKR',
    label: 'Cost',
    desc: 'Completely free for Pakistani students',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${deadline}T00:00:00`)
  return d < today
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HamburgerIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function App() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState('')
  const [openFaq, setOpenFaq]             = useState(null)
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const [openFilter, setOpenFilter]       = useState(null)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut]       = useState(false)

  const resultsRef = useRef(null)
  const aboutRef   = useRef(null)
  const faqRef     = useRef(null)

  const navigate                      = useNavigate()
  const { signOut }                   = useAuth()
  const { hasUnreadUrgentSaved }      = useSaved()
  const [searchParams, setSearchParams] = useSearchParams()

  const selected = searchParams.get('category') || 'All'
  const search   = searchParams.get('search')   || ''
  const location = searchParams.get('location') || 'All'
  const city     = (searchParams.get('city')    || '').trim()
  const sortBy   = searchParams.get('sort')     || 'default'

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchOpportunities() {
      setLoading(true)
      setFetchError('')

      try {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        const { data, error } = await supabase
          .from('opportunities')
          .select('*')
          .eq('status', 'approved')
          .gte('deadline', today)           // hide expired on homepage (Checklist #16)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching opportunities:', error.message)
          setFetchError('Could not load opportunities. Please refresh the page.')
        } else {
          setOpportunities(data || [])
        }
      } catch (err) {
        console.error('Unexpected fetch error:', err)
        setFetchError('Something went wrong. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      const { error } = await signOut()
      if (error) {
        console.error('Logout error:', error.message)
        setLoggingOut(false)
        setLogoutConfirm(false)
        return
      }
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Unexpected logout error:', err)
      setLoggingOut(false)
      setLogoutConfirm(false)
    }
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────

  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value === 'All' || value === '' || value === 'default') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    setSearchParams(params)
  }

  function scrollToSection(ref) {
    setMenuOpen(false)
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function toggleFilter(name) {
    setOpenFilter(openFilter === name ? null : name)
  }

  // ── Filtered + sorted results (memoized) ───────────────────────────────────

  const filtered = useMemo(() => {
    let result = opportunities
      .filter((o) => selected === 'All' || o.type === CATEGORY_MAP[selected])
      .filter((o) => location === 'All' || o.location === location)
      .filter((o) =>
        city === '' ||
        (o.city || '').toLowerCase().includes(city.toLowerCase())
      )
      .filter((o) => {
        const q = search.toLowerCase()
        return (
          (o.title        || '').toLowerCase().includes(q) ||
          (o.organization || '').toLowerCase().includes(q) ||
          (o.city         || '').toLowerCase().includes(q) ||
          (o.type         || '').toLowerCase().includes(q)
        )
      })

    if (sortBy === 'deadline') {
      result = [...result].sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline) : new Date('9999-12-31')
        const bDate = b.deadline ? new Date(b.deadline) : new Date('9999-12-31')
        return aDate - bDate
      })
    }

    return result
  }, [opportunities, selected, location, city, search, sortBy])

  const hasActiveFilters =
    selected !== 'All' ||
    location !== 'All' ||
    city     !== ''    ||
    sortBy   !== 'default' ||
    search   !== ''

  // ── FilterSection ──────────────────────────────────────────────────────────

  function FilterSection({ name, children }) {
    return (
      <div className="border-b border-gray-100 py-3">
        <button
          onClick={() => toggleFilter(name)}
          className="w-full flex justify-between items-center text-sm font-semibold text-gray-700"
          aria-expanded={openFilter === name}
        >
          {name}
          <span className="text-gray-400" aria-hidden="true">
            {openFilter === name ? '−' : '+'}
          </span>
        </button>

        {openFilter === name && (
          <div className="mt-3 flex flex-col gap-1">{children}</div>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa] text-gray-900">

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Filter sidebar drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Filters sidebar"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Filters</h3>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close filters"
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto h-full pb-20">
          {/* Category */}
          <FilterSection name="Category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { updateFilter('category', cat); setSidebarOpen(false) }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                  selected === cat
                    ? 'bg-[#0a939615] text-[#0a9396] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </FilterSection>

          {/* Location */}
          <FilterSection name="Location Type">
            {['All', 'Remote', 'Onsite', 'Hybrid'].map((loc) => (
              <button
                key={loc}
                onClick={() => { updateFilter('location', loc); setSidebarOpen(false) }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                  location === loc
                    ? 'bg-[#0a939615] text-[#0a9396] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {loc}
              </button>
            ))}
          </FilterSection>

          {/* City */}
          <div className="border-b border-gray-100 py-3">
            <label htmlFor="city-filter" className="text-sm font-semibold text-gray-700 mb-3 block">
              City
            </label>
            <input
              id="city-filter"
              type="text"
              placeholder="e.g. Lahore"
              value={city}
              onChange={(e) => updateFilter('city', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396]"
            />
          </div>

          {/* Sort */}
          <FilterSection name="Sort By">
            {SORT_OPTIONS.map((sort) => (
              <button
                key={sort.value}
                onClick={() => { updateFilter('sort', sort.value); setSidebarOpen(false) }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                  sortBy === sort.value
                    ? 'bg-[#0a939615] text-[#0a9396] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </FilterSection>

          <button
            onClick={() => setSearchParams({})}
            className="mt-4 text-sm text-gray-400 hover:text-[#0a9396] transition-all"
          >
            Reset all filters
          </button>
        </div>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 gap-4">
          <Logo />

          {/* Desktop search */}
          <input
            type="search"
            aria-label="Search opportunities"
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => {
              updateFilter('search', e.target.value)
              if (e.target.value.length > 0) {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="hidden md:block flex-1 px-5 py-2 rounded-full border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396] bg-gray-50"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Menu dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="Open menu"
                className="flex items-center gap-2 text-gray-600 border border-gray-200 px-3 py-2 rounded-full text-sm font-medium hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
              >
                <span className="hidden md:inline">Menu</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 w-52 z-50">
                    <button onClick={() => scrollToSection(resultsRef)} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">Opportunities</button>
                    <button onClick={() => scrollToSection(aboutRef)}   className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">About</button>
                    <button onClick={() => scrollToSection(faqRef)}     className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">FAQ</button>
                    <button onClick={() => { setMenuOpen(false); navigate('/contact') }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">Contact & Support</button>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={() => { setMenuOpen(false); navigate('/submit') }} className="w-full text-left px-4 py-3 text-sm text-[#0a9396] font-semibold hover:bg-gray-50 transition-all">Submit Opportunity</button>

                      {/* Inline logout confirm inside menu */}
                      {logoutConfirm ? (
                        <div className="px-4 py-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Log out?</span>
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                          >
                            {loggingOut ? 'Logging out…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setLogoutConfirm(false)}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLogoutConfirm(true)}
                          className="w-full text-left px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 transition-all"
                        >
                          Log out
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filters button */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open filters"
              className="flex items-center gap-2 text-gray-600 border border-gray-200 px-3 py-2 rounded-full text-sm font-medium hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
            >
              <HamburgerIcon size={14} />
              <span className="hidden md:inline">Filters</span>
            </button>

            {/* Profile / saved icon */}
            <button
              onClick={() => navigate('/account')}
              aria-label="Go to your account"
              title="Account"
              className="relative w-9 h-9 rounded-full bg-[#0a939615] flex items-center justify-center hover:bg-[#0a939625] transition-all border border-[#0a939630]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a9396" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>

              {hasUnreadUrgentSaved && (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"
                  aria-label="You have urgent saved opportunities"
                />
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-6 pb-3">
          <input
            type="search"
            aria-label="Search opportunities"
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => {
              updateFilter('search', e.target.value)
              if (e.target.value.length > 0) {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="w-full px-5 py-2 rounded-full border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396] bg-gray-50"
          />
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center text-center pt-24 pb-10 px-4"
        style={{ background: 'linear-gradient(to bottom, #0a939630, #f0fafa)' }}
      >
        <span className="text-sm font-semibold text-[#0a9396] bg-white px-4 py-1 rounded-full mb-6 shadow-sm">
          Built for Pakistani Students 🇵🇰
        </span>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
          Every Opportunity <br />
          <span className="text-[#0a9396]">You Deserve to Know About</span>
        </h2>
        <p className="text-gray-500 mt-6 text-lg max-w-xl">
          Scholarships · Internships · Fellowships · Competitions · Hackathons · Research · Programs
          <br />
          All in one place
        </p>
        <button
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-8 bg-[#0a9396] hover:bg-[#007f82] text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg"
        >
          Explore Opportunities
        </button>
      </div>

      {/* ── Opportunities Section ───────────────────────────────────────────── */}
      <div ref={resultsRef} className="max-w-6xl mx-auto px-6 md:px-10 mt-12 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Latest Opportunities</h2>
            <span className="text-sm text-gray-400">{filtered.length} results</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-red-400 hover:text-red-600 transition-all"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Fetch error */}
        {fetchError && (
          <div role="alert" className="mb-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 text-center">
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading opportunities…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-semibold">No opportunities found</p>
            <p className="text-sm mt-2">Try a different search or filter</p>
            {hasActiveFilters && (
              <button
                onClick={() => setSearchParams({})}
                className="mt-4 text-sm text-[#0a9396] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((o) => (
              <OpportunityCard
                key={o.id}
                {...o}
                // isNew is now computed inside OpportunityCard from created_at
                // No isNew prop needed here
              />
            ))}
          </div>
        )}
      </div>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <div ref={aboutRef} className="bg-[#0a9396] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">About Stride</h2>
          <p className="text-center text-[#d0f0f0] mb-12 max-w-xl mx-auto">
            Most Pakistani students miss life-changing opportunities not because
            they lack talent — but because no one told them these opportunities existed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ABOUT_STATS.map((item) => (
              <div key={item.id} className="bg-white/10 rounded-2xl p-6 text-white">
                <h3 className="text-3xl font-bold">{item.stat}</h3>
                <p className="font-semibold mt-1">{item.label}</p>
                <p className="text-sm text-[#d0f0f0] mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <div ref={faqRef} className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                aria-expanded={openFaq === faq.id}
                className="w-full flex justify-between items-center px-6 py-4 text-left font-semibold text-gray-800 hover:text-[#0a9396] transition-all"
              >
                {faq.q}
                <span className="text-[#0a9396] text-xl" aria-hidden="true">
                  {openFaq === faq.id ? '−' : '+'}
                </span>
              </button>

              {openFaq === faq.id && (
                <div className="px-6 pb-4 text-gray-500 text-sm leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <h2 className="text-xl font-bold text-[#0a9396]">Stride</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Connecting Pakistani students to opportunities that matter.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            {/* Navigate */}
            <nav aria-label="Footer navigation">
              <h3 className="font-semibold text-gray-700 mb-2">Navigate</h3>
              <ul className="flex flex-col gap-2">
                {[
                  { label: 'Opportunities',        action: () => scrollToSection(resultsRef) },
                  { label: 'About',                action: () => scrollToSection(aboutRef)   },
                  { label: 'FAQ',                  action: () => scrollToSection(faqRef)     },
                  { label: 'Saved Opportunities',  action: () => navigate('/saved')          },
                  { label: 'Submit Opportunity',   action: () => navigate('/submit')         },
                  { label: 'Contact & Support',    action: () => navigate('/contact')        },
                ].map(({ label, action }) => (
                  <li key={label}>
                    <button
                      onClick={action}
                      className="text-gray-400 hover:text-[#0a9396] transition-all text-left"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Categories */}
            <nav aria-label="Browse categories">
              <h3 className="font-semibold text-gray-700 mb-2">Categories</h3>
              <ul className="flex flex-col gap-2">
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => {
                        updateFilter('category', cat)
                        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="text-gray-400 hover:text-[#0a9396] transition-all text-left"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400 flex flex-col gap-1">
          <span>
            Questions?{' '}
            <a href="mailto:stride.pak@gmail.com" className="text-[#0a9396] hover:underline">
              stride.pak@gmail.com
            </a>
          </span>
          <span>&copy; 2026 Stride · Built for Pakistani students</span>
        </div>
      </footer>
    </div>
  )
}

export default App
