// ─── Google Analytics 4 ───────────────────────────────────────────────────────
// Reads VITE_GA_ID from environment. If missing or invalid, analytics is silently
// skipped — the app never crashes because of a missing analytics ID.
 
// GA4 measurement ID format: G- followed by alphanumeric characters
const GA4_ID_PATTERN = /^G-[A-Z0-9]+$/i
 
// Guard against double injection if initAnalytics() is somehow called twice
let analyticsInitialized = false
 
export function initAnalytics() {
  const id = import.meta.env.VITE_GA_ID
 
  // Skip if no ID provided (e.g. local dev without analytics configured)
  if (!id) return
 
  // SECURITY: validate ID format before injecting into the DOM.
  // Prevents a malformed or tampered env var from loading an unintended script.
  if (!GA4_ID_PATTERN.test(id)) {
    console.warn('Analytics: VITE_GA_ID format is invalid — analytics not loaded.')
    return
  }
 
  // Prevent duplicate script injection on hot reload or accidental double calls
  if (analyticsInitialized) return
  analyticsInitialized = true
 
  // Inject the GA4 script tag
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
 
  // Initialize the dataLayer queue
  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
 
  gtag('js', new Date())
  gtag('config', id, {
    // Don't send page_view automatically on config — React Router handles navigation
    send_page_view: false,
  })
}
 
/**
 * Call this on every route change to track page views in a SPA.
 * Usage in main.jsx or a router listener:
 *   window.gtag?.('event', 'page_view', { page_path: location.pathname })
 */
export function trackPageView(path) {
  if (!window.gtag) return
  window.gtag('event', 'page_view', { page_path: path })
}
