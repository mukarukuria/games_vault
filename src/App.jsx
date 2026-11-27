import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import GameDetail from './pages/GameDetail'
import GameForm from './pages/GameForm'

// Wraps every protected route in the shell + login check.
// Defined once so we don't repeat it three times below.
function PrivatePage({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"           element={<PrivatePage><Dashboard /></PrivatePage>} />
          <Route path="/library"    element={<PrivatePage><Library /></PrivatePage>} />
          <Route path="/library/:id" element={<PrivatePage><GameDetail /></PrivatePage>} />
          <Route path="/library/new"     element={<PrivatePage><GameForm /></PrivatePage>} />
          <Route path="/library/:id/edit" element={<PrivatePage><GameForm /></PrivatePage>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
