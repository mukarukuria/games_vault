import { useEffect, useMemo, useState } from 'react'
import { fetchGames } from '../lib/api'
import GameCard from '../components/GameCard'
import { Link, useSearchParams } from 'react-router-dom'

const CATEGORIES = [
  { id: 1, name: 'Seated & Circle Games' },
  { id: 2, name: 'Moving & Active Games' },
  { id: 3, name: 'Words, Thinking & Guessing' },
  { id: 4, name: 'Team & Community' },
  { id: 5, name: 'Bible-Themed Games' },
]

const TAG_GROUPS = {
  Equipment: [
    'No Equipment', 'Soft Ball', 'Chairs', 'Paper', 'Pen/Pencil',
    'Board/Markers', 'Bibles', 'Timer', 'Tape/Stickers', 'Newspapers', 'Small Objects',
  ],
  Space: ['Classroom Only', 'Open Space', 'Hall', 'Outdoor'],
  Skill: [
    'Memory', 'Reaction', 'Teamwork', 'Creativity', 'Listening',
    'Speaking', 'Physical', 'Logic', 'Bible Knowledge', 'Concentration', 'Confidence',
  ],
  Format: ['Competition', 'Cooperative', 'Elimination', 'Pairs', 'Teams', 'Whole Class'],
  Vibe: ['Calm', 'Silly', 'Fast-Paced', 'Reflective'],
}

const SORT_OPTIONS = [
  { value: 'name',     label: 'Name A–Z' },
  { value: 'time',     label: 'Shortest play time' },
  { value: 'recent',   label: 'Recently added' },
  { value: 'groupAsc', label: 'Smallest group first' },
]

function gameTags(game) {
  return (game.game_tags || []).map((gt) => gt.tags).filter(Boolean)
}

export default function Library() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()

  // ---- filter state ----
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categoryId, setCategoryId] = useState(null)
  const [players, setPlayers] = useState('')
  const [maxMinutes, setMaxMinutes] = useState('')
  const [energy, setEnergy] = useState(null)     // 'low' | 'medium' | 'high' | null
  const [difficulty, setDifficulty] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])  // array of tag names
  const [favouritesOnly, setFavouritesOnly] = useState(
    searchParams.get('favourites') === '1'
  )
  const [sort, setSort] = useState('name')

  // ---- fetch on mount ----
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await fetchGames()
      if (cancelled) return
      if (error) setError(error.message)
      else setGames(data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ---- filter + sort ----
  const filtered = useMemo(() => {
    const out = games.filter((g) => {
      if (favouritesOnly && !g.is_favourite) return false
      if (categoryId && g.category_id !== categoryId) return false

      if (players) {
        const n = Number(players)
        if (g.min_players && n < g.min_players) return false
        if (g.max_players && n > g.max_players) return false
      }

      if (maxMinutes) {
        const m = Number(maxMinutes)
        if (g.play_minutes_max && g.play_minutes_max > m) return false
      }

      if (energy && g.energy_level !== energy) return false
      if (difficulty && g.difficulty !== difficulty) return false

      if (selectedTags.length > 0) {
        const tagsOnGame = gameTags(g).map((t) => t.name)
        // Every selected tag must be present on the game.
        // (This means "AND" — selecting "No Equipment" and "Calm" means BOTH.)
        const hasAll = selectedTags.every((t) => tagsOnGame.includes(t))
        if (!hasAll) return false
      }

      return true
    })

    // sort (in-place on the copy; `filter` already returned a new array)
    out.sort((a, b) => {
      switch (sort) {
        case 'time':
          return (a.play_minutes_max ?? 999) - (b.play_minutes_max ?? 999)
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'groupAsc':
          return (a.ideal_players_min ?? 999) - (b.ideal_players_min ?? 999)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return out
  }, [games, favouritesOnly, categoryId, players, maxMinutes, energy, difficulty, selectedTags, sort])

  // ---- helpers ----
  function toggleTag(name) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    )
  }

  function clearAll() {
    setCategoryId(null)
    setPlayers('')
    setMaxMinutes('')
    setEnergy(null)
    setDifficulty(null)
    setSelectedTags([])
    setFavouritesOnly(false)
  }

  const activeCount =
    (categoryId ? 1 : 0) +
    (players ? 1 : 0) +
    (maxMinutes ? 1 : 0) +
    (energy ? 1 : 0) +
    (difficulty ? 1 : 0) +
    (selectedTags.length > 0 ? 1 : 0) +
    (favouritesOnly ? 1 : 0)

  // ---- render ----
  return (
    <div className="page">
      <div className="page-header">
        <h1>Library</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <p className="muted">{filtered.length} of {games.length}</p>
        <Link to="/library/new" className="btn-small">+ New game</Link>
      </div>
    </div>

      <div className="filter-bar">
        <button
          className="filter-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          Filters{activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button className="link-btn" onClick={clearAll}>Clear all</button>
        )}
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* On mobile this becomes a bottom sheet; on desktop it stays inline.
          Same markup; CSS does the transition. */}
      {filtersOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)} />
          <div className="filter-panel">
            <div className="filter-panel-header">
              <strong>Filters</strong>
              <button
                className="link-btn"
                onClick={() => setFiltersOpen(false)}
              >
                Done
              </button>
            </div>

            {/* Category */}
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <div className="chip-row">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={`chip ${categoryId === c.id ? 'chip-active' : ''}`}
                    onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Players + Minutes */}
            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label" htmlFor="players">Children</label>
                <input
                  id="players"
                  type="number"
                  min="1"
                  placeholder="e.g. 12"
                  value={players}
                  onChange={(e) => setPlayers(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label className="filter-label" htmlFor="minutes">Minutes available</label>
                <input
                  id="minutes"
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={maxMinutes}
                  onChange={(e) => setMaxMinutes(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            {/* Energy + Difficulty */}
            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label">Energy</label>
                <div className="chip-row">
                  {['low', 'medium', 'high'].map((v) => (
                    <button
                      key={v}
                      className={`chip ${energy === v ? 'chip-active' : ''}`}
                      onClick={() => setEnergy(energy === v ? null : v)}
                    >
                      {v[0].toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">Difficulty</label>
                <div className="chip-row">
                  {['easy', 'medium', 'hard'].map((v) => (
                    <button
                      key={v}
                      className={`chip ${difficulty === v ? 'chip-active' : ''}`}
                      onClick={() => setDifficulty(difficulty === v ? null : v)}
                    >
                      {v[0].toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tag groups */}
            {Object.entries(TAG_GROUPS).map(([groupName, tagList]) => (
              <div className="filter-group" key={groupName}>
                <label className="filter-label">{groupName}</label>
                <div className="chip-row">
                  {tagList.map((tag) => (
                    <button
                      key={tag}
                      className={`chip ${selectedTags.includes(tag) ? 'chip-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Favourites only */}
            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={favouritesOnly}
                  onChange={(e) => setFavouritesOnly(e.target.checked)}
                />
                Favourites only
              </label>
            </div>

            <div className="filter-panel-footer">
              <button className="link-btn" onClick={clearAll}>Clear all</button>
              <button className="filter-done" onClick={() => setFiltersOpen(false)}>
                Show {filtered.length} game{filtered.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </>
      )}

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">Could not load games: {error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="muted">
          No games match those filters.{' '}
          {activeCount > 0 && (
            <button className="link-btn" onClick={clearAll}>Clear filters</button>
          )}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="game-grid">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}