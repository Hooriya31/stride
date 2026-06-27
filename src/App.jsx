import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import OpportunityCard from './OpportunityCard'
import { supabase } from './supabase'
import Logo from './logo'
import { useAuth } from './AuthContext'
import { useSaved } from './SavedContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

const CATEGORIES = [
  'All', 'Scholarships', 'Internships', 'Competitions',
  'Hackathons', 'Research', 'Fellowships', 'Programs',
]

const CATEGORY_MAP = {
  Scholarships: 'Scholarship', Internships: 'Internship',
  Competitions: 'Competition', Hackathons: 'Hackathon',
  Research: 'Research',       Fellowships: 'Fellowship',
  Programs: 'Program',
}

const SORT_OPTIONS = [
  { value: 'default',  label: 'Default (Newest)'  },
  { value: 'deadline', label: 'Closing Soon First' },
]

const FAQS = [
  { id: 'who',     q: 'Who is Stride for?',                   a: 'Stride is built for Pakistani university and college students looking for scholarships, internships, fellowships, competitions, hackathons, and research opportunities.' },
  { id: 'free',    q: 'Is Stride free to use?',               a: 'Yes, completely free to use.' },
  { id: 'updates', q: 'How often are opportunities updated?', a: 'We update Stride regularly with new opportunities across all categories.' },
  { id: 'submit',  q: 'Can students submit opportunities?',   a: 'Yes — once logged in, users can submit opportunities for review.' },
]

const ABOUT_STATS = [
  { id: 'opps',    stat: '500+',   label: 'Opportunities', desc: 'Scholarships, internships, fellowships, competitions and more in one place' },
  { id: 'cats',    stat: '7',      label: 'Categories',    desc: "Organized so you find exactly what you're looking for" },
  { id: 'updates', stat: 'Weekly', label: 'Updates',       desc: 'New opportunities added regularly so you never miss out' },
  { id: 'cost',    stat: '0 PKR',  label: 'Cost',          desc: 'Completely free for Pakistani students' },
]

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HamburgerIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  // Max 3 visible page buttons — safe on all screen sizes
  const getPageNumbers = () => {
    const pages = []
    const start = Math.max(1, page - 1)
    const end   = Math.min(totalPages, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap"
      role="navigation" aria-label="Pagination">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="px-3 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-500 hover:border-[#0a9396] hover:text-[#0a9396] disabled:opacity-40 transition-all"
      >
        ← Prev
      </button>

      {getPageNumbers().map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
            p === page
              ? 'bg-[#0a9396] text-white'
              : 'bg-white border border-gray-200 text-gray-500 hover:border-[#0a9396] hover:text-[#0a9396]'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="px-3 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-500 hover:border-[#0a9396] hover:text-[#0a9396] disabled:opacity-40 transition-all"
      >
        Next →
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function App() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState('')
  const [totalCount, setTotalCount]       = useState(0)

  const [openFaq, setOpenFaq]         = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [openFilter, setOpenFilter]   = useState(null)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut]       = useState(false)

  // Local input state for debouncing — avoids firing a query on every keystroke
  const [searchInput, setSearchInput] = useState('')
  const [cityInput,   setCityInput]   = useState('')

  const resultsRef = useRef(null)
  const aboutRef   = useRef(null)
  const faqRef     = useRef(null)

  const navigate                        = useNavigate()
  const { signOut }                     = useAuth()
  const { hasUnreadUrgentSaved }        = useSaved()
  const [searchParams, setSearchParams] = useSearchParams()

  const selected = searchParams.get('category') || 'All'
  const search   = searchParams.get('search')   || ''
  const location = searchParams.get('location') || 'All'
  const city     = (searchParams.get('city')    || '').trim()
  const sortBy   = searchParams.get('sort')     || 'default'
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  // Sync local input state from URL params (e.g. on back/forward navigation)
  useEffect(() => { setSearchInput(search) }, [search])
  useEffect(() => { setCityInput(city)     }, [city])

  // Debounced values — only update URL (and trigger fetch) after 300ms of no typing
  const debouncedSearch = useDebounce(searchInput, 300)
  const debouncedCity   = useDebounce(cityInput,   300)

  // Push debounced values into URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedSearch) { params.set('search', debouncedSearch) }
    else                 { params.delete('search') }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }, [debouncedSearch])

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedCity) { params.set('city', debouncedCity) }
    else               { params.delete('city') }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }, [debouncedCity])

  // ── Server-side fetch ──────────────────────────────────────────────────────

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    setFetchError('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const from  = (page - 1) * PAGE_SIZE
      const to    = from + PAGE_SIZE - 1

      let query = supabase
        .from('opportunities')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .gte('deadline', today)

      if (selected !== 'All' && CATEGORY_MAP[selected]) {
        query = query.eq('type', CATEGORY_MAP[selected])
      }
      if (location !== 'All') {
        query = query.eq('location', location)
      }
      if (city) {
        query = query.ilike('city', `%${city}%`)
      }
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,organization.ilike.%${search}%,type.ilike.%${search}%`
        )
      }

      if (sortBy === 'deadline') {
        query = query.order('deadline', { ascending: true })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching opportunities:', error.message)
        setFetchError('Could not load opportunities. Please refresh the page.')
        setOpportunities([])
        setTotalCount(0)
      } else {
        setOpportunities(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Unexpected fetch error:', err)
      setFetchError('Something went wrong. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [page, selected, location, city, search, sortBy])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // Scroll to results on page change
  useEffect(() => {
    if (!loading) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [page])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ── Filter helpers ─────────────────────────────────────────────────────────

  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value === 'All' || value === '' || value === 'default') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page')
    setSearchParams(params)
  }

  function goToPage(p) {
    const params = new URLSearchParams(searchParams)
    if (p === 1) { params.delete('page') }
    else         { params.set('page', String(p)) }
    setSearchParams(params)
  }

  function scrollToSection(ref) {
    setMenuOpen(false)
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function toggleFilter(name) {
    setOpenFilter(openFilter === name ? null : name)
  }

  const hasActiveFilters =
    selected !== 'All' || location !== 'All' || city !== '' ||
    sortBy !== 'default' || search !== ''

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

  // ── FilterSection ──────────────────────────────────────────────────────────

  function FilterSection({ name, children }) {
    return (
      <div className="border-b border-gray-100 py-3">
        <button
          onClick={() => toggleFilter(name)}
          aria-expanded={openFilter === name}
          className="w-full flex justify-between items-center text-sm font-semibold text-gray-700"
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
        <div className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Filter sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog" aria-modal="true" aria-label="Filters sidebar"
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Filters</h3>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close filters"
            className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-5 py-4 overflow-y-auto h-full pb-32">
          <FilterSection name="Category">
            {CATEGORIES.map((cat) => (
              <button key={cat}
                onClick={() => { updateFilter('category', cat); setSidebarOpen(false) }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                  selected === cat
                    ? 'bg-[#0a939615] text-[#0a9396] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {cat}
              </button>
            ))}
          </FilterSection>

          <FilterSection name="Location Type">
            {['All', 'Remote', 'Onsite', 'Hybrid'].map((loc) => (
              <button key={loc}
                onClick={() => { updateFilter('location', loc); setSidebarOpen(false) }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                  location === loc
                    ? 'bg-[#0a939615] text-[#0a9396] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {loc}
              </button>
            ))}
          </FilterSection>

          <div className="border-b border-gray-100 py-3">
            <label htmlFor="city-filter"
              className="text-sm font-semibold text-gray-700 mb-2 block">
              City
            </label>
            <input
              id="city-filter"
              type="text"
              placeholder="e.g. Lahore"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396]"
            />
          </div>

          <FilterSection name="Sort By">
            {SORT_OPTIONS.map((sort) => (
              <button key={sort.value}
                onClick={() => { updateFilter('sort', sort.value); setSidebarOpen(false) }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                  sortBy === sort.value
                    ? 'bg-[#0a939615] text-[#0a9396] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {sort.label}
              </button>
            ))}
          </FilterSection>

          <button
            onClick={() => { setSearchParams({}); setSidebarOpen(false) }}
            className="mt-4 text-sm text-gray-400 hover:text-[#0a9396] transition-all"
          >
            Reset all filters
          </button>
        </div>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 md:px-10 py-3 gap-3">

          {/* Logo — clicking takes user back to landing page */}
          <Link to="/" className="shrink-0" aria-label="Go to Stride home">
            <Logo />
          </Link>

          {/* Desktop search */}
          <input
            type="search"
            aria-label="Search opportunities"
            placeholder="Search opportunities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="hidden md:block flex-1 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396] bg-gray-50"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Menu dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="Open menu"
                className="flex items-center gap-1.5 text-gray-600 border border-gray-200 px-2.5 py-2 rounded-full text-sm font-medium hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
              >
                <span className="hidden md:inline">Menu</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 w-48 z-50">
                    <button onClick={() => scrollToSection(resultsRef)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">
                      Opportunities
                    </button>
                    <button onClick={() => scrollToSection(aboutRef)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">
                      About
                    </button>
                    <button onClick={() => scrollToSection(faqRef)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">
                      FAQ
                    </button>
                    <button onClick={() => { setMenuOpen(false); navigate('/contact') }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0a9396] transition-all">
                      Contact & Support
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={() => { setMenuOpen(false); navigate('/submit') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#0a9396] font-semibold hover:bg-gray-50 transition-all">
                        Submit Opportunity
                      </button>
                      {logoutConfirm ? (
                        <div className="px-4 py-2.5 flex items-center gap-2">
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
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 font-medium hover:bg-red-50 transition-all">
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
              className="flex items-center gap-1.5 text-gray-600 border border-gray-200 px-2.5 py-2 rounded-full text-sm font-medium hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
            >
              <HamburgerIcon size={14} />
              <span className="hidden md:inline">Filters</span>
            </button>

            {/* Profile icon */}
            <button
              onClick={() => navigate('/account')}
              aria-label="Go to your account"
              title="Account"
              className="relative w-8 h-8 rounded-full bg-[#0a939615] flex items-center justify-center hover:bg-[#0a939625] transition-all border border-[#0a939630]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#0a9396" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {hasUnreadUrgentSaved && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                  aria-label="Urgent saved opportunities" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3">
          <input
            type="search"
            aria-label="Search opportunities"
            placeholder="Search opportunities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396] bg-gray-50"
          />
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center text-center pt-16 pb-8 px-4"
        style={{ background: 'linear-gradient(to bottom, #0a939630, #f0fafa)' }}>
        <span className="text-xs font-semibold text-[#0a9396] bg-white px-3 py-1 rounded-full mb-4 shadow-sm">
          Built for Pakistani Students 🇵🇰
        </span>
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
          Every Opportunity <br />
          <span className="text-[#0a9396]">You Deserve to Know About</span>
        </h2>
        <p className="text-gray-500 mt-4 text-sm md:text-base max-w-xl">
          Scholarships · Internships · Fellowships · Competitions · Hackathons · Research · Programs
          <br className="hidden sm:block" />
          All in one place
        </p>
        <button
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-6 bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg"
        >
          Explore Opportunities
        </button>
      </div>

      {/* ── Opportunities section ───────────────────────────────────────────── */}
      <div ref={resultsRef} className="max-w-6xl mx-auto px-4 md:px-10 mt-8 pb-16">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Latest Opportunities</h2>
            {!loading && (
              <span className="text-sm text-gray-400">
                {totalCount} result{totalCount !== 1 ? 's' : ''}
                {totalPages > 1 && ` · page ${page} of ${totalPages}`}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button onClick={() => setSearchParams({})}
              className="text-xs text-red-400 hover:text-red-600 transition-all">
              Reset filters
            </button>
          )}
        </div>

        {fetchError && (
          <div role="alert" className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 text-center">
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded-full w-1/4 mb-4" />
                <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2 mb-4" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-gray-100 rounded-full" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-5/6" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-4/6" />
                </div>
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-semibold">No opportunities found</p>
            <p className="text-sm mt-2">Try a different search or filter</p>
            {hasActiveFilters && (
              <button onClick={() => setSearchParams({})}
                className="mt-4 text-sm text-[#0a9396] hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {opportunities.map((o) => (
                <OpportunityCard key={o.id} {...o} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={goToPage} />
          </>
        )}
      </div>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <div ref={aboutRef} className="bg-[#0a9396] py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">About Stride</h2>
          <p className="text-center text-[#d0f0f0] mb-10 max-w-xl mx-auto text-sm md:text-base">
            Most Pakistani students miss life-changing opportunities not because they lack talent —
            but because no one told them these opportunities existed.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ABOUT_STATS.map((item) => (
              <div key={item.id} className="bg-white/10 rounded-2xl p-4 md:p-6 text-white">
                <h3 className="text-2xl md:text-3xl font-bold">{item.stat}</h3>
                <p className="font-semibold mt-1 text-sm md:text-base">{item.label}</p>
                <p className="text-xs md:text-sm text-[#d0f0f0] mt-1 md:mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <div ref={faqRef} className="max-w-3xl mx-auto px-4 md:px-6 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                aria-expanded={openFaq === faq.id}
                className="w-full flex justify-between items-center px-5 py-4 text-left font-semibold text-gray-800 text-sm md:text-base hover:text-[#0a9396] transition-all"
              >
                {faq.q}
                <span className="text-[#0a9396] text-lg ml-3 shrink-0" aria-hidden="true">
                  {openFaq === faq.id ? '−' : '+'}
                </span>
              </button>
              {openFaq === faq.id && (
                <div className="px-5 pb-4 text-gray-500 text-sm leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-10 py-10 flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <h2 className="text-lg font-bold text-[#0a9396]">Stride</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Connecting Pakistani students to opportunities that matter.
            </p>
          </div>
          <div className="flex gap-10 md:gap-12 text-sm">
            <nav aria-label="Footer navigation">
              <h3 className="font-semibold text-gray-700 mb-2">Navigate</h3>
              <ul className="flex flex-col gap-2">
                {[
                  { label: 'Opportunities',       action: () => scrollToSection(resultsRef) },
                  { label: 'About',               action: () => scrollToSection(aboutRef)   },
                  { label: 'FAQ',                 action: () => scrollToSection(faqRef)     },
                  { label: 'Saved Opportunities', action: () => navigate('/saved')          },
                  { label: 'Submit Opportunity',  action: () => navigate('/submit')         },
                  { label: 'Contact & Support',   action: () => navigate('/contact')        },
                ].map(({ label, action }) => (
                  <li key={label}>
                    <button onClick={action}
                      className="text-gray-400 hover:text-[#0a9396] transition-all text-left text-sm">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Browse categories">
              <h3 className="font-semibold text-gray-700 mb-2">Categories</h3>
              <ul className="flex flex-col gap-2">
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => { updateFilter('category', cat); resultsRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                      className="text-gray-400 hover:text-[#0a9396] transition-all text-left text-sm">
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400 flex flex-col gap-1">
          <span>Questions? <a href="mailto:stride.pak@gmail.com" className="text-[#0a9396] hover:underline">stride.pak@gmail.com</a></span>
          <span>&copy; 2026 Stride · Built for Pakistani students</span>
        </div>
      </footer>
    </div>
  )
}

export default App
