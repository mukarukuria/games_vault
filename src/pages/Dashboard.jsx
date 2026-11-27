import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  countGames,
  fetchRecentGames,
  fetchFavourites,
  fetchNeedsReview,
} from '../lib/api'
import { formatTime } from '../lib/format'
import ConfidenceBadge from '../components/ConfidenceBadge'

export default function Dashboard() {
  const { session } = useAuth()

  const [stats, setStats] = useState({ total: 0, favourites: 0, needsReview: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      // Run the four queries in parallel — faster than waiting for each in turn.
      const [totalRes, favRes, reviewRes, recentRes] = await Promise.all([
        countGames(),
        fetchFavourites(),
        fetchNeedsReview(),
        fetchRecentGames(5),
      ])

      if (cancelled) return

      const firstError =
        totalRes.error || favRes.error || reviewRes.error || recentRes.error
      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      setStats({
        total: totalRes.count ?? 0,
        favourites: favRes.data?.length ?? 0,
        needsReview: reviewRes.data?.length ?? 0,
      })
      setRecent(recentRes.data || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">{session?.user?.email}</p>
      </div>

      {error && <p className="error">Could not load dashboard: {error}</p>}

      {loading && <p className="muted">Loading…</p>}

      {!loading && !error && (
        <>
          {/* --- Stat cards --- */}
          <div className="stat-grid">
            <Link to="/library" className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Games in vault</div>
            </Link>
            <Link to="/library?favourites=1" className="stat-card">
              <div className="stat-number">{stats.favourites}</div>
              <div className="stat-label">Favourites</div>
            </Link>
            <div className="stat-card">
              <div className="stat-number">{stats.needsReview}</div>
              <div className="stat-label">Need review</div>
            </div>
          </div>

          {/* --- Find a game CTA --- */}
          <Link to="/library" className="cta-button">
            🔍 Find a game
          </Link>

          {/* --- Recently added --- */}
          <section className="dash-section">
            <h2>Recently added</h2>
            {recent.length === 0 ? (
              <p className="muted">No games yet.</p>
            ) : (
              <ul className="dash-list">
                {recent.map((g) => (
                  <li key={g.id}>
                    <Link to={`/library/${g.id}`} className="dash-list-item">
                      <span className="dash-list-title">{g.name}</span>
                      <span className="dash-list-meta">
                        {formatTime(g.play_minutes_min, g.play_minutes_max)}{' '}
                        <ConfidenceBadge level={g.group_size_confidence} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --- Needs review prompt --- */}
          {stats.needsReview > 0 && (
            <section className="dash-section dash-nudge">
              <h2>Needs review</h2>
              <p className="muted">
                {stats.needsReview} game{stats.needsReview === 1 ? '' : 's'} have unassessed data.
                Playing them and recording a session improves the vault.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}