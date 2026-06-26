import { Link } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import Logo from './logo'
import { supabase } from './supabase'
import OpportunityCard from './OpportunityCard'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(deadline) {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${deadline}T00:00:00`)
  if (isNaN(d)) return null
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

function deadlineBadgeStyle(daysLeft) {
  if (daysLeft === null) return 'bg-gray-100 text-gray-400'
  if (daysLeft <= 7)     return 'bg-red-100 text-red-600'
  if (daysLeft <= 30)    return 'bg-orange-100 text-orange-600'
  return 'bg-green-100 text-green-700'
}

function deadlineBadgeText(daysLeft) {
  if (daysLeft === null)  return 'No deadline'
  if (daysLeft === 0)     return 'Last day!'
  if (daysLeft < 0)       return 'Expired'
  return `${daysLeft}d left`
}

// ─── Mini hero preview card (lightweight — not the full OpportunityCard) ──────

function HeroCard({ type, title, organization, deadline, featured, verified }) {
  const daysLeft = getDaysLeft(deadline)

  return (
    <div className="rounded-2xl border border-gray-100 bg-[#f8ffff] p-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
            {type || 'Opportunity'}
          </span>
          {featured && (
            <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
              ★ Featured
            </span>
          )}
          {verified && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              ✓ Verified
            </span>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${deadlineBadgeStyle(daysLeft)}`}>
          {deadlineBadgeText(daysLeft)}
        </span>
      </div>

      <h3 className="mt-3 font-bold text-gray-900 text-sm leading-snug line-clamp-2">
        {title || 'Untitled'}
      </h3>
      <p className="text-xs text-gray-400 mt-1">{organization || ''}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function LandingPage() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState('')

  useEffect(() => {
    async function fetchOpportunities() {
  setLoading(true)
  setFetchError('')

  try {
    const today = new Date().toISOString().split('T')[0]

    // Run both queries in parallel
    const [featuredRes, latestRes] = await Promise.all([
      // All featured non-expired approved
      supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'approved')
        .eq('featured', true)
        .gte('deadline', today)
        .order('deadline', { ascending: true }),

      // Latest 6 non-expired approved
      supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'approved')
        .gte('deadline', today)
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    if (featuredRes.error) console.error('Featured fetch error:', featuredRes.error.message)
    if (latestRes.error) console.error('Latest fetch error:', latestRes.error.message)

    if (featuredRes.error && latestRes.error) {
      setFetchError('Could not load opportunities.')
      return
    }

    // Merge: featured first, then fill with latest, deduplicate by id
    const featured = featuredRes.data || []
    const latest = latestRes.data || []
    const seen = new Set(featured.map((o) => o.id))
    const merged = [
      ...featured,
      ...latest.filter((o) => !seen.has(o.id)),
    ]

    setOpportunities(merged)
  } catch (err) {
    console.error('Unexpected fetch error:', err)
    setFetchError('Something went wrong. Please refresh.')
  } finally {
    setLoading(false)
  }
}

    fetchOpportunities()
  }, [])

  // Featured-first for hero preview cards, fallback to soonest deadline
  const heroCards = useMemo(() => {
    if (!opportunities.length) return []

    const sorted = [...opportunities].sort((a, b) => {
      // Featured first
      if (b.featured !== a.featured) return b.featured ? 1 : -1
      // Then soonest deadline
      const aD = a.deadline ? new Date(a.deadline) : new Date('9999-12-31')
      const bD = b.deadline ? new Date(b.deadline) : new Date('9999-12-31')
      return aD - bD
    })

    return sorted.slice(0, 3)
  }, [opportunities])

  // Featured section cards — featured=true first, then latest
  const featuredCards = useMemo(() => {
    if (!opportunities.length) return []

    const sorted = [...opportunities].sort((a, b) => {
      if (b.featured !== a.featured) return b.featured ? 1 : -1
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return sorted.slice(0, 3)
  }, [opportunities])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa] text-gray-900">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-30 bg-white/90 backdrop-blur shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Logo />

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2 rounded-full hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="text-sm font-semibold bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-10 pt-20 pb-16"
        style={{ background: 'linear-gradient(to bottom, #0a939620, #f0fafa)' }}
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <span className="inline-block text-sm font-semibold text-[#0a9396] bg-white px-4 py-1 rounded-full mb-6 shadow-sm">
              Built for Pakistani Students 🇵🇰
            </span>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900">
              Every opportunity
              <span className="text-[#0a9396]"> you deserve to know about.</span>
            </h1>

            <p className="text-gray-500 mt-6 text-lg max-w-xl leading-relaxed">
              Scholarships, internships, fellowships, competitions, hackathons, research and programs —
              all in one clean platform built specifically for Pakistani students.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                to="/auth"
                className="bg-[#0a9396] hover:bg-[#007f82] text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg"
              >
                Explore Stride
              </Link>

              <a
                href="#featured"
                aria-label="Scroll to featured opportunities"
                className="border border-gray-200 bg-white text-gray-700 px-8 py-3 rounded-full font-semibold hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
              >
                See opportunities
              </a>
            </div>
          </div>

          {/* Right: real dynamic mini cards */}
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#0a939615] rounded-full blur-2xl" aria-hidden="true" />
            <div className="absolute -bottom-8 -right-6 w-40 h-40 bg-[#5ec4c620] rounded-full blur-2xl" aria-hidden="true" />

            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded-full w-1/3 mb-3" />
                      <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                    </div>
                  ))}
                </div>
              ) : heroCards.length > 0 ? (
                <div className="grid gap-4">
                  {heroCards.map((o) => (
                    <HeroCard
                      key={o.id}
                      type={o.type}
                      title={o.title}
                      organization={o.organization}
                      deadline={o.deadline}
                      featured={o.featured}
                      verified={o.verified}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p className="font-semibold text-gray-500">Opportunities coming soon</p>
                  <p className="mt-1">Sign up to be notified when new ones go live.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured real opportunities ─────────────────────────────────────── */}
      <section id="featured" className="max-w-6xl mx-auto px-6 md:px-10 py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Featured opportunities</h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            Real opportunities already live on Stride — curated for Pakistani students.
          </p>
        </div>

        {fetchError && (
          <div role="alert" className="text-center py-6 text-red-500 text-sm">
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading opportunities…</div>
        ) : featuredCards.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-semibold text-gray-500">No opportunities yet</p>
            <p className="text-sm mt-1">Check back soon — new ones are added regularly.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {featuredCards.map((o) => (
              <OpportunityCard
                key={o.id}
                {...o}
                previewOnly
                // isNew computed internally from created_at — no prop needed
              />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/auth"
            className="inline-block bg-[#0a9396] hover:bg-[#007f82] text-white px-8 py-3 rounded-full font-semibold transition-all"
          >
            View all opportunities
          </Link>
        </div>
      </section>

      {/* ── Why Stride ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0a9396] py-20 px-6 md:px-10">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">Why Stride?</h2>
          <p className="text-[#d0f0f0] mt-3 max-w-2xl mx-auto">
            Most students don't miss opportunities because they lack talent — they miss them
            because they never hear about them in time.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-12 text-left">
            {[
              {
                id: 'curated',
                title: 'Curated for Pakistan',
                desc: 'Opportunities relevant to Pakistani students instead of generic global clutter.',
              },
              {
                id: 'simple',
                title: 'Simple, searchable, fast',
                desc: 'Clean cards, deadlines, filters and categories so students can find exactly what fits.',
              },
              {
                id: 'grows',
                title: 'Built to grow with you',
                desc: 'Start with opportunities. Grow into a full student platform later.',
              },
            ].map((item) => (
              <div key={item.id} className="bg-white/10 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg">{item.title}</h3>
                <p className="text-sm text-[#d0f0f0] mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              id: 'step1',
              num: '01',
              title: 'Create your account',
              desc: 'Sign up, confirm your email, and unlock the full Stride dashboard.',
            },
            {
              id: 'step2',
              num: '02',
              title: 'Browse real opportunities',
              desc: 'Filter by scholarships, internships, fellowships, hackathons, research, programs and more.',
            },
            {
              id: 'step3',
              num: '03',
              title: 'Apply and contribute',
              desc: 'Find opportunities for yourself and submit new ones for other students too.',
            },
          ].map((step) => (
            <div key={step.id} className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="text-[#0a9396] text-sm font-bold">{step.num}</div>
              <h3 className="text-xl font-bold text-gray-900 mt-3">{step.title}</h3>
              <p className="text-gray-500 mt-3 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-20">
        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Your next opportunity is probably already on Stride.
          </h2>

          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Join Stride to browse opportunities, track deadlines, and never miss the ones
            that actually matter.
          </p>

          <Link
            to="/auth"
            className="inline-block mt-8 bg-[#0a9396] hover:bg-[#007f82] text-white px-8 py-3 rounded-full font-semibold transition-all"
          >
            Get started free
          </Link>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
