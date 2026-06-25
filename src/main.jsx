import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import SubmitForm from './SubmitForm.jsx'
import AdminPanel from './AdminPanel.jsx'
import LandingPage from './LandingPage.jsx'
import AuthPage from './AuthPage.jsx'
import ResetPassword from './ResetPassword.jsx'
import SavedPage from './SavedPage.jsx'
import ContactPage from './ContactPage.jsx'
import AccountPage from './AccountPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import { AuthProvider } from './AuthContext.jsx'
import { SavedProvider } from './SavedContext.jsx'
import { initAnalytics } from './analytics.js'

initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SavedProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/opportunities" element={<App />} />
              <Route path="/submit" element={<SubmitForm />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </SavedProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)