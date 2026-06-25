import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const SavedContext = createContext()

function getDaysLeft(deadline) {
  if (!deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? deadline + 'T00:00:00'
    : deadline

  const d = new Date(normalized)
  if (isNaN(d)) return null

  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

export function SavedProvider({ children }) {
  const { user, loading: authLoading } = useAuth()

  const [saved, setSaved] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)

  // local unread dot state for urgent not-applied saved opportunities
  const [hasUnreadUrgentSaved, setHasUnreadUrgentSaved] = useState(false)

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

    // unread = there exists at least one urgent opportunity still in "saved" / not applied
    const urgentNotAppliedExists = saved.some((row) => {
      const opp = row.opportunities
      if (!opp) return false
      if (row.status !== 'saved') return false

      const days = getDaysLeft(opp.deadline)
      return days !== null && days >= 0 && days <= 7
    })

    const seenKey = `savedUrgentSeen:${user.id}`
    const seenValue = localStorage.getItem(seenKey)

    // if there are no urgent not-applied items, remove badge entirely
    if (!urgentNotAppliedExists) {
      setHasUnreadUrgentSaved(false)
      localStorage.removeItem(seenKey)
      return
    }

    // if urgent items exist but user hasn't visited saved page since they appeared
    setHasUnreadUrgentSaved(seenValue !== 'true')
  }, [saved, user])

  async function fetchSaved() {
    if (!user) {
      setSaved([])
      setLoadingSaved(false)
      return
    }

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

    const { error } = await supabase
      .from('saved_opportunities')
      .delete()
      .eq('user_id', user.id)
      .eq('opp_id', oppId)

    if (error) {
      console.error('Unsave error:', error.message)
      return { error }
    }

    setSaved((prev) => prev.filter((s) => s.opp_id !== oppId))
    return { error: null }
  }

  async function updateSaved(oppId, changes) {
    if (!user) return { error: 'Not logged in' }

    const { error } = await supabase
      .from('saved_opportunities')
      .update(changes)
      .eq('user_id', user.id)
      .eq('opp_id', oppId)

    if (error) {
      console.error('Update error:', error.message)
      return { error }
    }

    setSaved((prev) =>
      prev.map((s) =>
        s.opp_id === oppId
          ? { ...s, ...changes }
          : s
      )
    )

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