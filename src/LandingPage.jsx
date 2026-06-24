import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Logo from './logo'
import { supabase } from './supabase'
import OpportunityCard from './OpportunityCard'

function LandingPage() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeatured() {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) {
        console.error('Error fetching landing page opportunities:', error)
      } else {
        setFeatured(data || [])
      }

      setLoading(false)
    }

    fetchFeatured()
  }, [])

  return (
    <div className="min-h-screen bg-[#f0fafa] text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur shadow-sm">
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

      {/* Hero */}
      <section
        className="px-6 md:px-10 pt-20 pb-16"
        style={{ background: 'linear-gradient(to bottom, #0a939620, #f0fafa)' }}
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-sm font-semibold text-[#0a9396] bg-white px-4 py-1 rounded-full mb-6 shadow-sm">
              Built for Pakistani Students 🇵🇰
            </span>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900">
              Every opportunity
              <span className="text-[#0a9396]"> you deserve to know about.</span>
            </h1>

            <p className="text-gray-500 mt-6 text-lg max-w-xl leading-relaxed">
              Scholarships, internships, competitions, hackathons and research opportunities —
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
                className="border border-gray-200 bg-white text-gray-700 px-8 py-3 rounded-full font-semibold hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
              >
                See opportunities
              </a>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#0a939615] rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -right-6 w-40 h-40 bg-[#5ec4c620] rounded-full blur-2xl" />

            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <div className="grid gap-4">
                {loading ? (
                  <p className="text-gray-400 text-sm">Loading featured opportunities...</p>
                ) : featured.length === 0 ? (
                  <p className="text-gray-400 text-sm">No opportunities available yet.</p>
                ) : (
                  featured.map((card) => (
                    <div key={card.id} className="rounded-2xl border border-gray-100 bg-[#f8ffff] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
                          {card.type}
                        </span>
                        <span className="text-xs text-gray-400">{card.deadline}</span>
                      </div>
                      <h3 className="mt-3 font-bold text-gray-900 line-clamp-2">{card.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">{card.organization}</p>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{card.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured real opportunities */}
      <section id="featured" className="max-w-6xl mx-auto px-6 md:px-10 py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Featured opportunities</h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            Real opportunities already live on Stride — curated for Pakistani students.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading opportunities...</div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No approved opportunities yet.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((o) => (
              <OpportunityCard
                key={o.id}
                {...o}
                isNew={new Date() - new Date(o.created_at) < 7 * 24 * 60 * 60 * 1000}
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

      {/* Why Stride */}
      <section className="bg-[#0a9396] py-20 px-6 md:px-10">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">Why Stride?</h2>
          <p className="text-[#d0f0f0] mt-3 max-w-2xl mx-auto">
            Most students don’t miss opportunities because they lack talent — they miss them because they never hear about them in time.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="bg-white/10 rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg">Curated for Pakistan</h3>
              <p className="text-sm text-[#d0f0f0] mt-2">
                Opportunities relevant to Pakistani students instead of generic global clutter.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg">Simple, searchable, fast</h3>
              <p className="text-sm text-[#d0f0f0] mt-2">
                Clean cards, deadlines, filters and categories so students can actually find what fits.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg">Built to grow with you</h3>
              <p className="text-sm text-[#d0f0f0] mt-2">
                Start with opportunities. Grow into a full student platform later.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
          
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="text-[#0a9396] text-sm font-bold">01</div>
            <h3 className="text-xl font-bold text-gray-900 mt-3">Create your account</h3>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              Sign up, confirm your email, and unlock the full Stride dashboard.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="text-[#0a9396] text-sm font-bold">02</div>
            <h3 className="text-xl font-bold text-gray-900 mt-3">Browse real opportunities</h3>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              Filter by scholarships, internships, hackathons, research and more.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="text-[#0a9396] text-sm font-bold">03</div>
            <h3 className="text-xl font-bold text-gray-900 mt-3">Apply and contribute</h3>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              Find opportunities for yourself and submit new ones for other students too.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-10 pb-20">
        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Your next opportunity is probably already on Stride.
          </h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Join Stride to browse opportunities, track deadlines, and never miss the ones that actually matter.
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