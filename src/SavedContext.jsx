import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const SavedContext = createContext()

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SavedProvider({ children }) {
  const { user, loading: authLoading } = useAuth()

  const [saved, setSaved] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [hasUnreadUrgentSaved, setHasUnreadUrgentSaved] = useState(false)

  // Tracks which opp IDs currently have a save/unsave in flight
  // Used by OpportunityCard to disable the bookmark button
  const [loadingIds, setLoadingIds] = useState([])

  const fetchIdRef = useRef(0)

  // ── Auth-driven fetch ──────────────────────────────────────────────────────

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

  // ── Urgent badge logic ─────────────────────────────────────────────────────

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

  // ── loadingIds helpers ─────────────────────────────────────────────────────

  function addLoadingId(oppId) {
    setLoadingIds((prev) => [...prev, oppId])
  }

  function removeLoadingId(oppId) {
    setLoadingIds((prev) => prev.filter((id) => id !== oppId))
  }

  // ── Data functions ─────────────────────────────────────────────────────────

  async function fetchSaved() {
    if (!user) {
      setSaved([])
      setLoadingSaved(false)
      return
    }

    const currentFetchId = ++fetchIdRef.current
    setLoadingSaved(true)

    try {
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

      // Ignore stale fetch responses (user switched accounts mid-flight)
      if (currentFetchId !== fetchIdRef.current) return

      if (error) {
        console.error('Error fetching saved:', error.message)
        setSaved([])
      } else {
        setSaved(data || [])
      }
    } catch (err) {
      console.error('Unexpected fetch error:', err)
      if (currentFetchId === fetchIdRef.current) setSaved([])
    } finally {
      if (currentFetchId === fetchIdRef.current) setLoadingSaved(false)
    }
  }

  async function saveOpportunity(oppId) {
    if (!user) return { error: 'Not logged in' }

    // Already saved — treat as success
    if (saved.some((s) => s.opp_id === oppId)) return { error: null }

    addLoadingId(oppId)

    try {
      const { error } = await supabase
        .from('saved_opportunities')
        .insert([{ user_id: user.id, opp_id: oppId, status: 'saved' }])

      if (error) {
        // 23505 = unique violation — already saved from another tab
        if (error.code === '23505') return { error: null }
        console.error('Save error:', error.message)
        return { error }
      }

      await fetchSaved()
      return { error: null }
    } catch (err) {
      console.error('Unexpected save error:', err)
      return { error: err }
    } finally {
      removeLoadingId(oppId)
    }
  }

  async function unsaveOpportunity(oppId) {
    if (!user) return { error: 'Not logged in' }

    const previousSaved = saved
    // Optimistic remove
    setSaved((prev) => prev.filter((s) => s.opp_id !== oppId))
    addLoadingId(oppId)

    try {
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
    } catch (err) {
      console.error('Unexpected unsave error:', err)
      setSaved(previousSaved) // rollback
      return { error: err }
    } finally {
      removeLoadingId(oppId)
    }
  }

  async function updateSaved(oppId, changes) {
    if (!user) return { error: 'Not logged in' }

    const previousSaved = saved

    // Optimistic update — UI reflects change instantly
    setSaved((prev) =>
      prev.map((s) =>
        s.opp_id === oppId ? { ...s, ...changes } : s
      )
    )

    try {
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
    } catch (err) {
      console.error('Unexpected update error:', err)
      setSaved(previousSaved) // rollback
      return { error: err }
    }
  }

  // ── Helpers exposed to consumers ───────────────────────────────────────────

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

  // ── Context value ──────────────────────────────────────────────────────────

  return (
    <SavedContext.Provider
      value={{
        saved,
        loadingSaved,
        loadingIds,
        fetchSaved,
        saveOpportunity,
        unsaveOpportunity,
        updateSaved,
        isSaved,
        getSavedRow,
        hasUnreadUrgentSaved,
        markUrgentSavedAsSeen,
        isUrgentNotApplied,
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
