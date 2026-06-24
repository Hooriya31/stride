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
import ProtectedRoute from './ProtectedRoute.jsx'
import { AuthProvider } from './AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/opportunities" element={<App />} />
            <Route path="/submit" element={<SubmitForm />} />
          </Route>

          {/* AdminPanel manages its own auth internally — no wrapper needed */}
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)