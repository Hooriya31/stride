import { createClient } from '@supabase/supabase-js'
 
// ─── Environment variables ────────────────────────────────────────────────────
// These are injected at build time by Vite from the .env file.
// NEVER commit .env to git. NEVER use the service role key here 
// only the anon/public key is safe to expose client-side.
 
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY  // anon/public key only
 
// ─── Validation ───────────────────────────────────────────────────────────────
 
if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL — add it to your .env file.\n' +
    'Example: VITE_SUPABASE_URL=https://your-project.supabase.co'
  )
}
 
if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_KEY — add the anon/public key to your .env file.\n' +
    'Find it in: Supabase Dashboard → Settings → API → anon public'
  )
}
 
// SECURITY: Validate the URL looks like a real HTTPS URL before passing to
// createClient. Prevents a malformed env var from causing silent misbehaviour.
try {
  const parsed = new URL(supabaseUrl)
  if (parsed.protocol !== 'https:') {
    throw new Error('VITE_SUPABASE_URL must use HTTPS.')
  }
} catch {
  throw new Error(
    `VITE_SUPABASE_URL is not a valid HTTPS URL: "${supabaseUrl}"`
  )
}
 
// ─── Client ───────────────────────────────────────────────────────────────────
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:   true,   // keeps user logged in across page refreshes
    autoRefreshToken: true,   // silently refreshes JWT before it expires
    detectSessionInUrl: true, // required for magic links and OAuth callbacks
  },
})
 