import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  fetchGameFull,
  setFavourite,
  archiveGame,
  createPlaySession,
} from '../lib/api'
import ConfidenceBadge from '../components/ConfidenceBadge'
import { formatTime, formatGroupSize, capitalise } from '../lib/format'

export default function GameDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await fetchGameFull(id)
      if (cancelled) return
      if (error) setError(error.message)
      else setGame(data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  async function handleFavourite() {
    setBusy(true)
    const { data, error } = await setFavourite(id, !game.is_favourite)
    if (!error) setGame((prev) => ({ ...prev, ...data }))
    setBusy(false)
  }

  async function handleArchive() {
    if (!confirm('Archive this game? It will be hidden from the library.')) return
    setBusy(true)
    const { error } = await archiveGame(id)
    if (error) { setError(error.message); setBusy(false); return }
    navigate('/library', { replace: true })
  }

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>
  if (error)   return <div className="page"><p className="error">{error}</p></div>
  if (!game)   return <div className="page"><p className="muted">Game not found.</p></div>

  const tags = (game.game_tags || []).map((gt) => gt.tags).filter(Boolean)
  const variations = game.game_variations || []
  const adaptations = game.game_adaptations || []

  return (
    <div className="page">
      <Link to="/library" className="back-link">← Back to library</Link>

      <div className="page-header">
        <h1>{game.name}</h1>
        <div className="detail-actions">
          <button
            className={`star-btn ${game.is_favourite ? 'star-on' : ''}`}
            onClick={handleFavourite}
            disabled={busy}
            aria-label={game.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            {game.is_favourite ? '★' : '☆'}
          </button>
          <Link to={`/library/${id}/edit`} className="btn-small">Edit</Link>
          <button
            className="btn-small btn-danger"
            onClick={handleArchive}
            disabled={busy}
          >
            Archive
          </button>
        </div>
      </div>

      <p className="muted">{game.categories?.name || 'Uncategorised'}</p>

      {game.description && <p>{game.description}</p>}

      <div className="detail-grid">
        <div>
          <strong>Play time</strong><br />
          {formatTime(game.play_minutes_min, game.play_minutes_max)}
        </div>
        <div>
          <strong>Group size</strong><br />
          {formatGroupSize(game.ideal_players_min, game.ideal_players_max)}{' '}
          <ConfidenceBadge level={game.group_size_confidence} />
        </div>
        <div>
          <strong>Energy</strong><br />
          {capitalise(game.energy_level)}
        </div>
        <div>
          <strong>Difficulty</strong><br />
          {capitalise(game.difficulty)}
        </div>
      </div>

      <button
        className="cta-button"
        onClick={() => setSessionOpen(true)}
      >
        ▶ Record a play session
      </button>

      {game.instructions && (
        <>
          <h2>Instructions</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{game.instructions}</p>
        </>
      )}

      {game.group_size_notes && (
        <>
          <h2>Group-size notes</h2>
          <p className="muted">{game.group_size_notes}</p>
        </>
      )}

      {tags.length > 0 && (
        <>
          <h2>Tags</h2>
          <div className="chip-row">
            {tags.map((t) => (
              <span key={t.id} className="chip chip-static">{t.name}</span>
            ))}
          </div>
        </>
      )}

      {variations.length > 0 && (
        <>
          <h2>Variations</h2>
          <ul>
            {variations.map((v) => (
              <li key={v.id}>
                {v.title && <strong>{v.title}: </strong>}
                {v.description}
              </li>
            ))}
          </ul>
        </>
      )}

      {adaptations.length > 0 && (
        <>
          <h2>Classroom adaptations</h2>
          <ul>
            {adaptations.map((a) => (
              <li key={a.id}>
                {a.title && <strong>{a.title}: </strong>}
                {a.description}
              </li>
            ))}
          </ul>
        </>
      )}

      {sessionOpen && (
        <SessionModal
          gameId={id}
          onClose={() => setSessionOpen(false)}
          onSaved={() => {
            setSessionOpen(false)
            // Refresh game data (stats will appear in a later chunk)
            navigate(0)
          }}
        />
      )}
    </div>
  )
}

// --- The play-session modal ---
function SessionModal({ gameId, onClose, onSaved }) {
  const [playedOn, setPlayedOn] = useState(
    new Date().toISOString().slice(0, 10)   // today as YYYY-MM-DD
  )
  const [groupSize, setGroupSize] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const { data, error } = await createPlaySession({
      gameId,
      playedOn,
      groupSize: groupSize ? Number(groupSize) : null,
      durationMinutes: duration ? Number(duration) : null,
      notes: notes.trim() || null,
    })
    if (error) { setError(error.message); setSaving(false); return }
    setSaving(false)
    onSaved(data)
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="filter-panel" style={{ zIndex: 50 }}>
        <div className="filter-panel-header">
          <strong>Record play session</strong>
          <button className="link-btn" onClick={onClose}>Close</button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">Date</label>
            <input type="date" className="filter-input"
              value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Children</label>
            <input type="number" min="1" className="filter-input"
              value={groupSize} onChange={(e) => setGroupSize(e.target.value)} />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Duration (minutes)</label>
          <input type="number" min="1" className="filter-input"
            value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Notes</label>
          <textarea rows={3} className="filter-input"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="filter-panel-footer">
          <button className="link-btn" onClick={onClose}>Cancel</button>
          <button className="filter-done" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save session'}
          </button>
        </div>
      </div>
    </>
  )
}