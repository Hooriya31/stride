import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const SavedContext = createContext()

function getDaysLeft(deadline) {
  if (!deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? `${deadline}T00:00:00`
    : deadline

  const d = new Date(normalized)
  if (isNaN(d)) return null

  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

function isUrgentNotApplied(savedRow) {
  const opp = savedRow?.opportunities
  if (!opp) return false
  if (savedRow.status !== 'saved') return false

  const days = getDaysLeft(opp.deadline)
  return days !== null && days >= 0 && days <= 7
}

export function SavedProvider({ children }) {
  const { user, loading: authLoading } = useAuth()

  const [saved, setSaved] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [hasUnreadUrgentSaved, setHasUnreadUrgentSaved] = useState(false)

  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setSaved([])
      setLoadingSaved(false)
      setHasUnreadUrgentSaved(false)
      return
    }

    fetchSaved()
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return

    const urgentExists = saved.some(isUrgentNotApplied)
    const seenKey = `savedUrgentSeen:${user.id}`
    const seenValue = localStorage.getItem(seenKey)

    if (!urgentExists) {
      setHasUnreadUrgentSaved(false)
      localStorage.removeItem(seenKey)
      return
    }

    setHasUnreadUrgentSaved(seenValue !== 'true')
  }, [saved, user])

  async function fetchSaved() {
    if (!user) {
      setSaved([])
      setLoadingSaved(false)
      return
    }

    const currentFetchId = ++fetchIdRef.current
    setLoadingSaved(true)

    const { data, error } = await supabase
      .from('saved_opportunities')
      .select(`
        id,
        user_id,
        opp_id,
        status,
        notes,
        saved_at,
        opportunities (*)
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    // Ignore stale fetch responses
    if (currentFetchId !== fetchIdRef.current) return

    if (error) {
      console.error('Error fetching saved:', error.message)
      setSaved([])
    } else {
      setSaved(data || [])
    }

    setLoadingSaved(false)
  }

  async function saveOpportunity(oppId) {
    if (!user) return { error: 'Not logged in' }

    if (saved.some((s) => s.opp_id === oppId)) {
      return { error: null }
    }

    const { error } = await supabase
      .from('saved_opportunities')
      .insert([
        {
          user_id: user.id,
          opp_id: oppId,
          status: 'saved',
        },
      ])

    if (error) {
      if (error.code === '23505') {
        return { error: null }
      }

      console.error('Save error:', error.message)
      return { error }
    }

    await fetchSaved()
    return { error: null }
  }

  async function unsaveOpportunity(oppId) {
    if (!user) return { error: 'Not logged in' }

    const previousSaved = saved
    setSaved((prev) => prev.filter((s) => s.opp_id !== oppId))

    const { error } = await supabase
      .from('saved_opportunities')
      .delete()
      .eq('user_id', user.id)
      .eq('opp_id', oppId)

    if (error) {
      console.error('Unsave error:', error.message)
      setSaved(previousSaved) // rollback
      return { error }
    }

    return { error: null }
  }

  async function updateSaved(oppId, changes) {
    if (!user) return { error: 'Not logged in' }

    const previousSaved = saved

    setSaved((prev) =>
      prev.map((s) =>
        s.opp_id === oppId
          ? { ...s, ...changes }
          : s
      )
    )

    const { error } = await supabase
      .from('saved_opportunities')
      .update(changes)
      .eq('user_id', user.id)
      .eq('opp_id', oppId)

    if (error) {
      console.error('Update error:', error.message)
      setSaved(previousSaved) // rollback
      return { error }
    }

    return { error: null }
  }

  function isSaved(oppId) {
    return saved.some((s) => s.opp_id === oppId)
  }

  function getSavedRow(oppId) {
    return saved.find((s) => s.opp_id === oppId) || null
  }

  function markUrgentSavedAsSeen() {
    if (!user) return

    const urgentExists = saved.some(isUrgentNotApplied)
    if (!urgentExists) return

    localStorage.setItem(`savedUrgentSeen:${user.id}`, 'true')
    setHasUnreadUrgentSaved(false)
  }

  return (
    <SavedContext.Provider
      value={{
        saved,
        loadingSaved,
        fetchSaved,
        saveOpportunity,
        unsaveOpportunity,
        updateSaved,
        isSaved,
        getSavedRow,
        hasUnreadUrgentSaved,
        markUrgentSavedAsSeen,
        isUrgentNotApplied, // useful for SavedPage / cards if you want shared logic
      }}
    >
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  const context = useContext(SavedContext)

  if (!context) {
    throw new Error('useSaved must be used inside SavedProvider')
  }

  return context
}