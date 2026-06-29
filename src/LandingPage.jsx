import { Link } from 'react-router-dom'
import { useEffect, useState, useMemo, useRef } from 'react'
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
  if (daysLeft === null) return 'No deadline'
  if (daysLeft === 0)    return 'Last day!'
  if (daysLeft < 0)      return 'Expired'
  return `${daysLeft}d left`
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref     = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const numTarget = parseInt(target, 10)
          if (isNaN(numTarget)) { setValue(target); return }
          const startTime = performance.now()
          const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.floor(eased * numTarget))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { value, ref }
}

// ─── AnimatedStat ─────────────────────────────────────────────────────────────

function AnimatedStat({ stat, label }) {
  const { value, ref } = useCountUp(stat)
  return (
    <div ref={ref} className="bg-white/10 rounded-2xl p-4 md:p-5 text-white text-center">
      <p className="text-2xl md:text-3xl font-bold">{value}+</p>
      <p className="text-xs md:text-sm font-semibold mt-1">{label}</p>
    </div>
  )
}

// ─── Mini hero card ───────────────────────────────────────────────────────────

function HeroCard({ type, title, organization, deadline, featured, verified }) {
  const daysLeft = getDaysLeft(deadline)
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
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
        const [featuredRes, latestRes] = await Promise.all([
          supabase.from('opportunities').select('*').eq('status', 'approved').eq('featured', true).gte('deadline', today).order('deadline', { ascending: true }),
          supabase.from('opportunities').select('*').eq('status', 'approved').gte('deadline', today).order('created_at', { ascending: false }).limit(6),
        ])
        if (featuredRes.error) console.error('Featured fetch error:', featuredRes.error.message)
        if (latestRes.error)   console.error('Latest fetch error:',   latestRes.error.message)
        if (featuredRes.error && latestRes.error) { setFetchError('Could not load opportunities.'); return }
        const featured = featuredRes.data || []
        const latest   = latestRes.data   || []
        const seen     = new Set(featured.map((o) => o.id))
        setOpportunities([...featured, ...latest.filter((o) => !seen.has(o.id))])
      } catch (err) {
        console.error('Unexpected fetch error:', err)
        setFetchError('Something went wrong. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchOpportunities()
  }, [])

  // Featured-first, then soonest deadline
  const heroCards = useMemo(() => {
    if (!opportunities.length) return []
    return [...opportunities]
      .sort((a, b) => {
        if (b.featured !== a.featured) return b.featured ? 1 : -1
        const aD = a.deadline ? new Date(a.deadline) : new Date('9999-12-31')
        const bD = b.deadline ? new Date(b.deadline) : new Date('9999-12-31')
        return aD - bD
      })
      .slice(0, 3)
  }, [opportunities])

  const featuredCards = useMemo(() => {
    if (!opportunities.length) return []
    return [...opportunities]
      .sort((a, b) => {
        if (b.featured !== a.featured) return b.featured ? 1 : -1
        return new Date(b.created_at) - new Date(a.created_at)
      })
      .slice(0, 3)
  }, [opportunities])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f0fafa] text-gray-900">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation"
        className="sticky top-0 z-30 bg-white/90 backdrop-blur shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-10 py-3 flex items-center justify-between">
          {/* Logo — no back button, clicking logo = home (already on home) */}
          <Logo />
          <div className="flex items-center gap-2">
            {/* Sign In hidden on very small screens to avoid cramping */}
            <Link to="/auth"
              className="hidden sm:inline text-sm font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-full hover:border-[#0a9396] hover:text-[#0a9396] transition-all">
              Sign In
            </Link>
            <Link to="/auth"
              className="text-sm font-semibold bg-[#0a9396] text-white px-4 py-2 rounded-full hover:bg-[#007f82] transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="px-4 md:px-10 pt-12 md:pt-20 pb-12 md:pb-16"
        style={{ background: 'linear-gradient(to bottom, #0a939620, #f0fafa)' }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 md:gap-12 items-center">

          {/* Left: copy */}
          <div>
            <span className="inline-block text-xs md:text-sm font-semibold text-[#0a9396] bg-white px-4 py-1 rounded-full mb-5 shadow-sm">
              Built for Pakistani Students 🇵🇰
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
              Every opportunity
              <span className="text-[#0a9396]"> you deserve to know about.</span>
            </h1>
            <p className="text-gray-500 mt-4 md:mt-6 text-sm md:text-base lg:text-lg max-w-xl leading-relaxed">
              Scholarships, internships, fellowships, competitions, hackathons,
              research and programs — all in one clean platform built specifically
              for Pakistani students.
            </p>
            <div className="flex flex-wrap gap-3 mt-6 md:mt-8">
              <Link to="/auth"
                className="bg-[#0a9396] hover:bg-[#007f82] text-white px-6 md:px-8 py-2.5 md:py-3 rounded-full font-semibold transition-all shadow-lg text-sm md:text-base">
                Explore Stride
              </Link>
              <a href="#featured" aria-label="Scroll to featured opportunities"
                className="border border-gray-200 bg-white text-gray-700 px-6 md:px-8 py-2.5 md:py-3 rounded-full font-semibold hover:border-[#0a9396] hover:text-[#0a9396] transition-all text-sm md:text-base">
                See opportunities
              </a>
            </div>
          </div>

          {/* Right: real dynamic preview cards — visible on all sizes, stacks below on mobile */}
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-28 h-28 bg-[#0a939615] rounded-full blur-2xl" aria-hidden="true" />
            <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-[#5ec4c620] rounded-full blur-2xl" aria-hidden="true" />

            <div className="relative bg-[#f8ffff] rounded-3xl shadow-xl border border-gray-100 p-4 md:p-5">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded-full w-1/3 mb-3" />
                      <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                    </div>
                  ))}
                </div>
              ) : heroCards.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {heroCards.map((o) => (
                    <HeroCard key={o.id} type={o.type} title={o.title}
                      organization={o.organization} deadline={o.deadline}
                      featured={o.featured} verified={o.verified} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <p className="font-semibold text-gray-500">Opportunities coming soon</p>
                  <p className="mt-1">Sign up to be notified when new ones go live.</p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true" />
                <span className="text-xs text-gray-400">Live on Stride</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured opportunities ─────────────────────────────────────────── */}
      <section id="featured" className="max-w-6xl mx-auto px-4 md:px-10 py-12 md:py-14">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured opportunities</h2>
          <p className="text-gray-500 mt-2 md:mt-3 max-w-2xl mx-auto text-sm md:text-base">
            Real opportunities already live on Stride — curated for Pakistani students.
          </p>
        </div>

        {fetchError && (
          <div role="alert" className="text-center py-4 text-red-500 text-sm">{fetchError}</div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading opportunities…</div>
        ) : featuredCards.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="font-semibold text-gray-500">No opportunities yet</p>
            <p className="text-sm mt-1">Check back soon — new ones are added regularly.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {featuredCards.map((o) => (
              <OpportunityCard key={o.id} {...o} previewOnly />
            ))}
          </div>
        )}

        <div className="text-center mt-8 md:mt-10">
          <Link to="/auth"
            className="inline-block bg-[#0a9396] hover:bg-[#007f82] text-white px-6 md:px-8 py-2.5 md:py-3 rounded-full font-semibold transition-all text-sm md:text-base">
            View all opportunities
          </Link>
        </div>
      </section>

      {/* ── Why Stride ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0a9396] py-12 md:py-20 px-4 md:px-10">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Why Stride?</h2>
          <p className="text-[#d0f0f0] mt-3 max-w-2xl mx-auto text-sm md:text-base">
            Most students don't miss opportunities because they lack talent — they miss them
            because they never hear about them in time.
          </p>

          {/* Animated stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 md:mt-12 mb-8 md:mb-12">
            <AnimatedStat stat="500" label="Opportunities" />
            <AnimatedStat stat="7"   label="Categories"    />
            <div className="bg-white/10 rounded-2xl p-4 md:p-5 text-white text-center">
              <p className="text-2xl md:text-3xl font-bold">✓</p>
              <p className="text-xs md:text-sm font-semibold mt-1">Free Forever</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 md:p-5 text-white text-center">
              <p className="text-2xl md:text-3xl font-bold">✓</p>
              <p className="text-xs md:text-sm font-semibold mt-1">Weekly Updates</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6 text-left">
            {[
              { id: 'curated', title: 'Curated for Pakistan',     desc: 'Opportunities relevant to Pakistani students instead of generic global clutter.'                },
              { id: 'simple',  title: 'Simple, searchable, fast', desc: 'Clean cards, deadlines, filters and categories so students can find exactly what fits.'         },
              { id: 'grows',   title: 'Built to grow with you',   desc: 'Start with opportunities. Track deadlines, save favourites, and submit new ones for the community.' },
            ].map((item) => (
              <div key={item.id} className="bg-white/10 rounded-2xl p-5 md:p-6 text-white">
                <h3 className="font-bold text-base md:text-lg">{item.title}</h3>
                <p className="text-sm text-[#d0f0f0] mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 md:px-10 py-12 md:py-20">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {[
            { id: 'step1', num: '01', title: 'Create your account',      desc: 'Sign up, confirm your email, and unlock the full Stride dashboard.'                                          },
            { id: 'step2', num: '02', title: 'Browse real opportunities', desc: 'Filter by scholarships, internships, fellowships, hackathons, research, programs and more.'                  },
            { id: 'step3', num: '03', title: 'Apply and contribute',      desc: 'Find opportunities for yourself and submit new ones for other students too.'                                 },
          ].map((step) => (
            <div key={step.id} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 hover:shadow-md transition-all">
              <div className="text-[#0a9396] text-sm font-bold">{step.num}</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mt-3">{step.title}</h3>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-4 md:px-10 pb-12 md:pb-20">
        <div className="max-w-6xl mx-auto relative overflow-hidden bg-[#0a9396] rounded-3xl p-6 md:p-10 lg:p-14 text-center shadow-xl">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />

          <div className="relative">
            <span className="inline-block text-xs md:text-sm font-semibold text-white/80 bg-white/10 px-4 py-1 rounded-full mb-4 md:mb-6">
              Free for every Pakistani student
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              Your next opportunity is probably already on Stride.
            </h2>
            <p className="text-white/80 mt-3 md:mt-4 max-w-2xl mx-auto text-sm md:text-base lg:text-lg">
              Join Stride to browse opportunities, track deadlines, and never miss
              the ones that actually matter.
            </p>
            <Link to="/auth"
              className="inline-block mt-6 md:mt-8 bg-white text-[#0a9396] px-6 md:px-8 py-2.5 md:py-3 rounded-full font-bold hover:bg-gray-50 transition-all shadow-lg text-sm md:text-base">
              Get started free →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
