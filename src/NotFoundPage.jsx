import { Link } from 'react-router-dom'
import Logo from './logo'

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f0fafa] flex flex-col">
      <nav className="bg-white shadow-sm px-6 md:px-10 py-4">
        <div className="max-w-6xl mx-auto">
          <Link to="/"><Logo /></Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-20 text-center">
        <div>
          <p className="text-6xl font-bold text-[#0a9396] mb-4">404</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <Link
            to="/"
            className="inline-block bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
