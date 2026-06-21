import OpportunityCard from './OpportunityCard'
import { supabase } from './supabase'
import { useState, useRef, useEffect } from 'react'

function App() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState("All")
  const [search, setSearch] = useState("")
  const [openFaq, setOpenFaq] = useState(null)
  const [location, setLocation] = useState("All")
  const [sortBy, setSortBy] = useState("default")
  const [city, setCity] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openFilter, setOpenFilter] = useState(null)
  const resultsRef = useRef(null)
  const aboutRef = useRef(null)
  const faqRef = useRef(null)

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
    { q: "Are these opportunities only for top students?", a: "Not at all. Stride includes opportunities for all levels — whether you're a first year or a final year student." }
  ]

  const handleSearch = (e) => {
    setSearch(e.target.value)
    if (e.target.value.length > 0) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const isNew = (createdAt) => {
    const created = new Date(createdAt)
    const today = new Date()
    const diff = today - created
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) <= 7
  }

  let filtered = opportunities
    .filter(o => selected === "All" || o.type === selected.slice(0, -1))
    .filter(o => location === "All" || o.location === location)
    .filter(o => city === "" || o.city.toLowerCase().includes(city.toLowerCase()))
    .filter(o => o.title.toLowerCase().includes(search.toLowerCase()))

  if (sortBy === "deadline") {
    filtered = [...filtered].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  }

  const toggleFilter = (name) => setOpenFilter(openFilter === name ? null : name)

  const FilterSection = ({ name, children }) => (
    <div className="border-b border-gray-100 py-3">
      <button
        onClick={() => toggleFilter(name)}
        className="w-full flex justify-between items-center text-sm font-semibold text-gray-700"
      >
        {name}
        <span className="text-gray-400">{openFilter === name ? "−" : "+"}</span>
      </button>
      {openFilter === name && (
        <div className="mt-3 flex flex-col gap-1">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0fafa] text-gray-900">

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Filters</h3>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto h-full pb-20">

          <FilterSection name="Category">
            {["All", "Scholarships", "Internships", "Competitions", "Hackathons", "Research"].map(cat => (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all
                  ${selected === cat ? "bg-[#0a939615] text-[#0a9396] font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {cat}
              </button>
            ))}
          </FilterSection>

          <FilterSection name="Location Type">
            {["All", "Remote", "Onsite", "Hybrid"].map(loc => (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all
                  ${location === loc ? "bg-[#0a939615] text-[#0a9396] font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {loc}
              </button>
            ))}
          </FilterSection>

          <div className="border-b border-gray-100 py-3">
  <p className="text-sm font-semibold text-gray-700 mb-3">City</p>
  <input
    type="text"
    placeholder="e.g. Lahore"
    value={city}
    onChange={(e) => setCity(e.target.value)}
    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0a9396]"
  />
</div>

          <FilterSection name="Sort By">
            {[
              { value: "default", label: "Default" },
              { value: "deadline", label: "Closing Soon First" }
            ].map(sort => (
              <button
                key={sort.value}
                onClick={() => setSortBy(sort.value)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-all
                  ${sortBy === sort.value ? "bg-[#0a939615] text-[#0a9396] font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {sort.label}
              </button>
            ))}
          </FilterSection>

          <button
            onClick={() => { setSelected("All"); setLocation("All"); setCity(""); setSortBy("default") }}
            className="mt-4 text-sm text-gray-400 hover:text-[#0a9396] transition-all"
          >
            Reset all filters
          </button>
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white shadow-sm">
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
            <span onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#0a9396] cursor-pointer transition-all">Opportunities</span>
            <span onClick={() => aboutRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#0a9396] cursor-pointer transition-all">About</span>
            <span onClick={() => faqRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#0a9396] cursor-pointer transition-all">FAQ</span>
          </div>

          <button className="md:hidden text-gray-500 text-sm font-medium border border-gray-200 px-3 py-1 rounded-full">
            Menu
          </button>
        </div>

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

      {/* Hero */}
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

      {/* Opportunities Section */}
      <div ref={resultsRef} className="max-w-6xl mx-auto px-6 md:px-10 mt-12 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-medium hover:border-[#0a9396] hover:text-[#0a9396] transition-all shadow-sm"
            >
              <span>☰</span> Filters
            </button>
            {(selected !== "All" || location !== "All" || city !== "" || sortBy !== "default") && (
              <button
                onClick={() => { setSelected("All"); setLocation("All"); setCity(""); setSortBy("default") }}
                className="text-xs text-red-400 hover:text-red-600 transition-all"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Latest Opportunities</h2>
            <span className="text-sm text-gray-400">{filtered.length} results</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading opportunities...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-semibold">No opportunities found</p>
            <p className="text-sm mt-2">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(o => (
              <OpportunityCard
                key={o.id}
                title={o.title}
                type={o.type}
                deadline={o.deadline}
                description={o.description}
                link={o.link}
                isNew={isNew(o.created_at)}
                location={o.location}
                city={o.city}
              />
            ))}
          </div>
        )}
      </div>

      {/* About / Why Stride */}
      <div ref={aboutRef} className="bg-[#0a9396] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">About Stride</h2>
          <p className="text-center text-[#d0f0f0] mb-12 max-w-xl mx-auto">
            Most Pakistani students miss life-changing opportunities not because they lack talent — but because no one told them these opportunities existed.
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

      {/* FAQ */}
      <div ref={faqRef} className="max-w-3xl mx-auto px-6 py-20">
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
              <h3 className="font-semibold text-gray-700">Navigate</h3>
              <span onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Opportunities</span>
              <span onClick={() => aboutRef.current?.scrollIntoView({ behavior: 'smooth' })} className="text-gray-400 hover:text-[#0a9396] cursor-pointer">About</span>
              <span onClick={() => faqRef.current?.scrollIntoView({ behavior: 'smooth' })} className="text-gray-400 hover:text-[#0a9396] cursor-pointer">FAQ</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-gray-700">Categories</h3>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Scholarships</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Internships</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Competitions</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Hackathons</span>
              <span className="text-gray-400 hover:text-[#0a9396] cursor-pointer">Research</span>
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