import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppShell({ children }) {
  const { session, signOut } = useAuth()

  return (
    <div className="shell">
      {/* Sidebar — only shows on desktop via CSS */}
      <aside className="sidebar">
        <div className="sidebar-brand">Game Vault</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="nav-item">🏠 Home</NavLink>
          <NavLink to="/library" className="nav-item">📚 Library</NavLink>
        </nav>
        {session && (
          <button className="link-btn sidebar-signout" onClick={signOut}>
            Log out
          </button>
        )}
      </aside>

      {/* Main content area — always visible */}
      <main className="shell-main">
        {children}
      </main>

      {/* Bottom tab bar — only shows on mobile via CSS */}
      <nav className="tabbar">
        <NavLink to="/" end className="tab-item">🏠<span>Home</span></NavLink>
        <NavLink to="/library" className="tab-item">📚<span>Library</span></NavLink>
      </nav>
    </div>
  )
}