import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const SavedContext = createContext()

export function SavedProvider({ children }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState([]) // array of saved rows
  const [loadingSaved, setLoadingSaved] = useState(true)

  useEffect(() => {
    if (!user) {
      setSaved([])
      setLoadingSaved(false)
      return
    }
    fetchSaved()
  }, [user])

  async function fetchSaved() {
  setLoadingSaved(true)
  const { data, error } = await supabase
    .from('saved_opportunities')
    .select('*, opportunities(*)')   // <-- this joins the full opportunity row
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (error) console.error('Error fetching saved:', error.message)
  setSaved(data || [])
  setLoadingSaved(false)
}

  async function saveOpportunity(oppId) {
    const { data, error } = await supabase
      .from('saved_opportunities')
      .insert([{ user_id: user.id, opp_id: oppId, status: 'saved' }])
      .select()
      .single()

    if (error) {
      console.error('Save error:', error.message)
      return
    }
    setSaved(prev => [data, ...prev])
  }

  async function unsaveOpportunity(oppId) {
    const { error } = await supabase
      .from('saved_opportunities')
      .delete()
      .eq('user_id', user.id)
      .eq('opp_id', oppId)

    if (error) {
      console.error('Unsave error:', error.message)
      return
    }
    setSaved(prev => prev.filter(s => s.opp_id !== oppId))
  }

  async function updateSaved(oppId, changes) {
    const { error } = await supabase
      .from('saved_opportunities')
      .update(changes)
      .eq('user_id', user.id)
      .eq('opp_id', oppId)

    if (error) {
      console.error('Update error:', error.message)
      return
    }
    setSaved(prev =>
      prev.map(s => s.opp_id === oppId ? { ...s, ...changes } : s)
    )
  }

  function isSaved(oppId) {
    return saved.some(s => s.opp_id === oppId)
  }

  function getSavedRow(oppId) {
    return saved.find(s => s.opp_id === oppId) || null
  }

  return (
    <SavedContext.Provider value={{
      saved,
      loadingSaved,
      saveOpportunity,
      unsaveOpportunity,
      updateSaved,
      isSaved,
      getSavedRow,
      fetchSaved,
    }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  const context = useContext(SavedContext)
  if (!context) throw new Error('useSaved must be used inside SavedProvider')
  return context
}