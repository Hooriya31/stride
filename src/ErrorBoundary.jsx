import { Component } from 'react'

/**
 * ErrorBoundary — catches unexpected React render/lifecycle errors.
 * Without this, any uncaught error shows a blank white screen.
 * Wrap around the entire app in main.jsx.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to console in dev — swap for a real error service (Sentry etc.) in prod
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 text-sm mb-6">
              An unexpected error occurred. Try refreshing the page — if the problem
              persists, contact us at{' '}
              <a
                href="mailto:stride.pak@gmail.com"
                className="text-[#0a9396] hover:underline"
              >
                stride.pak@gmail.com
              </a>
            </p>
            <button
              onClick={() => this.handleReset()}
              className="inline-block bg-[#0a9396] hover:bg-[#007f82] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
