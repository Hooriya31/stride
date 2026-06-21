function getDaysLeft(deadline) {
  const today = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate - today
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return { text: "Expired", style: "bg-gray-100 text-gray-400" }
  if (daysLeft === 0) return { text: "Last day!", style: "bg-red-100 text-red-600" }
  if (daysLeft <= 7) return { text: `${daysLeft} days left`, style: "bg-red-100 text-red-600" }
  if (daysLeft <= 30) return { text: `${daysLeft} days left`, style: "bg-orange-100 text-orange-600" }
  return { text: `${daysLeft} days left`, style: "bg-green-100 text-green-700" }
}

function OpportunityCard({ title, type, deadline, description, link, isNew, location, city }) {
  const days = getDaysLeft(deadline)
  const closingSoon = days.style.includes("red") && !days.text.includes("Expired")

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url: link })
    } else {
      navigator.clipboard.writeText(link)
      alert("Link copied to clipboard!")
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between min-h-[280px]">

      {closingSoon && (
        <div className="bg-red-50 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg mb-3">
          ⚠️ Closing Soon — Don't miss this!
        </div>
      )}

      <div>
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">
            {type}
          </span>
          {isNew && (
            <span className="text-xs font-semibold text-white bg-[#0a9396] px-2 py-1 rounded-full">
              New
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 mt-3 leading-snug">
          {title}
        </h3>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
          {description}
        </p>
      </div>

<div className="flex gap-2 mt-3 flex-wrap">
  {location && (
    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      {location}
    </span>
  )}
  {city && (
    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      {city}
    </span>
  )}
</div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">{deadline}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${days.style}`}>
            {days.text}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="text-sm border border-gray-200 text-gray-400 px-3 py-2 rounded-full hover:border-[#0a9396] hover:text-[#0a9396] transition-all"
          >
            Share
          </button>

         <a 
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-sm bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all"
          >
            Apply →
          </a>
        </div>
      </div>

    </div>
  )
}

export default OpportunityCard