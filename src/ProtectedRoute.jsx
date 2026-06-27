import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function ProtectedRoute() {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()

  // Wait for auth to fully initialize before deciding — prevents flash redirect
  if (loading || !initialized) {
    return (
      <div
        role="status"
        aria-label="Checking your session"
        className="min-h-screen bg-[#f0fafa] flex items-center justify-center px-6"
      >
        <div className="text-center">
          <div
            className="w-10 h-10 mx-auto rounded-full border-4 border-[#0a9396]/20 border-t-[#0a9396] animate-spin"
            aria-hidden="true"
          />
          <p className="text-gray-500 mt-4 text-sm">Checking your session…</p>
        </div>
      </div>
    )
  }

  // Not authenticated — redirect to auth, preserving the intended destination
  if (!user) {
    return (
      <Navigate
        to="/auth"
        state={{ from: location }}
        replace
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
