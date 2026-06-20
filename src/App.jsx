import OpportunityCard from './OpportunityCard'
import { supabase } from './supabase'
import { useState, useRef, useEffect } from 'react'

function App() {
const [opportunities, setOpportunities] = useState([])
const [loading, setLoading] = useState(true)
const [selected, setSelected] = useState("All")
const [search, setSearch] = useState("")
const [openFaq, setOpenFaq] = useState(null)
const resultsRef = useRef(null)


useEffect(() => {
  async function fetchOpportunities() {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
    
    if (error) {
      console.error('Error fetching:', error)
    } else {
      setOpportunities(data)
    }
    setLoading(false)
  }
  fetchOpportunities()
}, [])


  const faqs = [
    { q: "Who is Stride for?", a: "Stride is built for Pakistani university and college students looking for scholarships, internships, competitions, hackathons and research opportunities." },
    { q: "Is Stride free to use?", a: "Yes, completely free. No account needed, no hidden fees." },
    { q: "How often are opportunities updated?", a: "We update the platform weekly with new opportunities across all categories." },
    { q: "Can I suggest an opportunity to add?", a: "Absolutely! Reach out to us and we'll review and add it within 48 hours." },
    { q: "Are these opportunities only for top students?", a: "Not at all. Stride includes opportunities for all levels — whether you're a first year or a final year student." }
  ]

  const handleSearch = (e) => {
    setSearch(e.target.value)
    if (e.target.value.length > 0) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const filtered = opportunities
    .filter(o => selected === "All" || o.type === selected.slice(0, -1))
    .filter(o => o.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#f0fafa] text-gray-900">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 gap-6">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a9396] shrink-0">Stride</h1>
          
          <input
            type="text"
            placeholder="Search opportunities..."
            value={search}
            onChange={handleSearch}
            className="hidden md:block flex-1 px-5 py-2 rounded-full border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396] bg-gray-50"
          />

          <div className="hidden md:flex gap-6 text-gray-500 text-sm font-medium shrink-0">
            <span className="hover:text-[#0a9396] cursor-pointer transition-all">Opportunities</span>
            <span className="hover:text-[#0a9396] cursor-pointer transition-all">About</span>
            <span className="hover:text-[#0a9396] cursor-pointer transition-all">Contact</span>
          </div>

          <button className="md:hidden text-gray-500 text-sm font-medium border border-gray-200 px-3 py-1 rounded-full">
            Menu
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-6 pb-3">
          <input
            type="text"
            placeholder="Search opportunities..."
            value={search}
            onChange={handleSearch}
            className="w-full px-5 py-2 rounded-full border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396] bg-gray-50"
          />
        </div>
      </nav>

      {/* Hero Section with gradient */}
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
          Scholarships · Internships · Competitions · Hackathons · Research <br />
          All in one place
        </p>
        <button
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-8 bg-[#0a9396] hover:bg-[#007f82] text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg"
        >
          Explore Opportunities
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex justify-center gap-3 mt-10 flex-wrap px-4">
        {["All", "Scholarships", "Internships", "Competitions", "Hackathons", "Research"].map(category => (
          <button
            key={category}
            onClick={() => setSelected(category)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border
              ${selected === category
                ? "bg-[#0a9396] text-white border-[#0a9396]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#0a9396] hover:text-[#0a9396]"
              }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Opportunities Section */}
<div ref={resultsRef} className="mt-12 px-6 md:px-10 max-w-6xl mx-auto pb-20">
  <div className="flex justify-between items-center mb-8">
    <h2 className="text-2xl font-bold text-gray-900">Latest Opportunities</h2>
    <span className="text-sm text-gray-400">{filtered.length} results</span>
  </div>
  
  {loading ? (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg">Loading opportunities...</p>
    </div>
  ) : filtered.length === 0 ? (
    <div className="text-center py-20 text-gray-400">
      <p className="text-xl font-semibold">No opportunities found</p>
      <p className="text-sm mt-2">Try a different search or category</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map(opportunity => (
        <OpportunityCard
          key={opportunity.id}
          title={opportunity.title}
          type={opportunity.type}
          deadline={opportunity.deadline}
          description={opportunity.description}
          link={opportunity.link}
        />
      ))}
    </div>
  )}
</div>

      {/* Why Stride Section */}
      <div className="bg-[#0a9396] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Why Stride?</h2>
          <p className="text-center text-[#d0f0f0] mb-12 max-w-xl mx-auto">
            Most Pakistani students miss life-changing opportunities not because they lack talent but because no one told them these opportunities existed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { stat: "500+", label: "Opportunities", desc: "Scholarships, internships, competitions and more in one place" },
              { stat: "5", label: "Categories", desc: "Organized so you find exactly what you're looking for" },
              { stat: "Weekly", label: "Updates", desc: "New opportunities added every week so you never miss out" },
              { stat: "0 PKR", label: "Cost", desc: "Completely free for every Pakistani student, always" },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-6 text-white">
                <h3 className="text-3xl font-bold">{item.stat}</h3>
                <p className="font-semibold mt-1">{item.label}</p>
                <p className="text-sm text-[#d0f0f0] mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center px-6 py-4 text-left font-semibold text-gray-800 hover:text-[#0a9396] transition-all"
              >
                {faq.q}
                <span className="text-[#0a9396] text-xl">{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-gray-500 text-sm leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <h2 className="text-xl font-bold text-[#0a9396]">Stride</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Connecting Pakistani students to opportunities that matter.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-gray-700">Platform</h3>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Opportunities</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">About</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Contact</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-gray-700">Categories</h3>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Scholarships</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Internships</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Hackathons</span>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
          © 2026 Stride · Built for Pakistani students
        </div>
      </footer>

    </div>
  )
}

export default App