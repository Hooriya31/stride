function getDaysLeft(deadline) {
  if (!deadline) return { text: 'No deadline', style: 'bg-gray-100 text-gray-400' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? deadline + 'T00:00:00'
    : deadline

  const deadlineDate = new Date(normalized)
  if (isNaN(deadlineDate)) return { text: 'Invalid date', style: 'bg-gray-100 text-gray-400' }

  const diff = deadlineDate - today
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return { text: 'Expired', style: 'bg-gray-100 text-gray-400' }
  if (daysLeft === 0) return { text: 'Last day!', style: 'bg-red-100 text-red-600' }
  if (daysLeft <= 7) return { text: `${daysLeft}d left`, style: 'bg-red-100 text-red-600' }
  if (daysLeft <= 30) return { text: `${daysLeft}d left`, style: 'bg-orange-100 text-orange-600' }
  return { text: `${daysLeft}d left`, style: 'bg-green-100 text-green-700' }
}

function formatDeadline(deadline) {
  if (!deadline) return ''
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? deadline + 'T00:00:00'
    : deadline
  const d = new Date(normalized)
  if (isNaN(d)) return deadline
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OpportunityCard({
  title, type, deadline, description, link, isNew,
  location, city, organization, verified, discipline, level,
}) {
  const days = getDaysLeft(deadline)
  const closingSoon = days.style.includes('red') && !days.text.includes('Expired')

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url: link })
    } else {
      navigator.clipboard.writeText(link)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all flex flex-col h-full min-h-[340px]">
      <div className="flex justify-between items-start gap-3 min-h-[32px]">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-[#0a9396] bg-[#0a939615] px-3 py-1 rounded-full">{type}</span>
          {verified && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Verified</span>
          )}
        </div>
        {isNew && (
          <span className="text-xs font-semibold text-white bg-[#0a9396] px-2 py-1 rounded-full shrink-0">New</span>
        )}
      </div>

      <div className="mt-3 min-h-[40px]">
        {closingSoon && (
          <div className="bg-red-50 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg">
            ⚠️ Closing Soon — Don't miss this!
          </div>
        )}
      </div>

      <div className="mt-2 flex-1 flex flex-col">
        <div className="min-h-[72px]">
          <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">{title}</h3>
          <p className="text-xs text-gray-400 mt-1 font-medium min-h-[20px]">{organization || ' '}</p>
        </div>

        <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3 min-h-[72px]">{description}</p>

        <div className="flex gap-2 mt-4 flex-wrap min-h-[32px]">
          {location && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{location}</span>}
          {city && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{city}</span>}
          {discipline && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{discipline}</span>}
          {level && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{level}</span>}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">{formatDeadline(deadline)}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${days.style}`}>{days.text}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleShare}
            className="text-sm border border-gray-200 text-gray-500 px-3 py-2 rounded-full hover:border-[#0a9396] hover:text-[#0a9396] transition-all">
            Share
          </button>
          <a href={link} target="_blank" rel="noreferrer"
            className="text-sm bg-[#0a9396] text-white px-5 py-2 rounded-full hover:bg-[#007f82] transition-all">
            Apply →
          </a>
        </div>
      </div>
    </div>
  )
}

export default OpportunityCard