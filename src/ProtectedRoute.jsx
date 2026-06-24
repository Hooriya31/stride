import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    // Don't use replace here — push so back button works correctly
    return <Navigate to="/auth" state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute