import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  fetchGameFull,
  createGame,
  updateGame,
  setGameTags,
  setGameVariations,
  setGameAdaptations,
} from '../lib/api'

const CATEGORIES = [
  { id: 1, name: 'Seated & Circle Games' },
  { id: 2, name: 'Moving & Active Games' },
  { id: 3, name: 'Words, Thinking & Guessing' },
  { id: 4, name: 'Team & Community' },
  { id: 5, name: 'Bible-Themed Games' },
]

const CONFIDENCE = ['confirmed', 'estimated', 'unassessed']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const ENERGIES = ['low', 'medium', 'high']
const TESTING = ['untested', 'tested', 'needs_review']
const STATUSES = ['active', 'review', 'archived']

// Initial form state for a brand-new game.
// Having this in one place means the "reset" button is trivial.
const BLANK = {
  name: '',
  category_id: '',
  description: '',
  instructions: '',
  status: 'active',
  setup_minutes: '',
  play_minutes_min: '',
  play_minutes_max: '',
  min_players: '',
  ideal_players_min: '',
  ideal_players_max: '',
  max_players: '',
  group_size_confidence: 'unassessed',
  group_size_notes: '',
  age_min: '', age_max: '',
  grade_min: '', grade_max: '',
  difficulty: 'easy',
  energy_level: 'low',
  testing_status: 'untested',
  testing_notes: '',
}

// Empty row used by the variations/adaptations repeaters.
const BLANK_ROW = { title: '', description: '' }

export default function GameForm() {
  const { id } = useParams()            // undefined for "new"
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(BLANK)
  const [tags, setTags] = useState([])          // array of tag names (from tags table)
  const [variations, setVariations] = useState([])
  const [adaptations, setAdaptations] = useState([])

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ---- Load existing game (edit only) ----
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    async function load() {
      const { data, error } = await fetchGameFull(id)
      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }

      setForm({
        name: data.name ?? '',
        category_id: String(data.category_id ?? ''),
        description: data.description ?? '',
        instructions: data.instructions ?? '',
        status: data.status ?? 'active',
        setup_minutes: data.setup_minutes ?? '',
        play_minutes_min: data.play_minutes_min ?? '',
        play_minutes_max: data.play_minutes_max ?? '',
        min_players: data.min_players ?? '',
        ideal_players_min: data.ideal_players_min ?? '',
        ideal_players_max: data.ideal_players_max ?? '',
        max_players: data.max_players ?? '',
        group_size_confidence: data.group_size_confidence ?? 'unassessed',
        group_size_notes: data.group_size_notes ?? '',
        age_min: data.age_min ?? '',
        age_max: data.age_max ?? '',
        grade_min: data.grade_min ?? '',
        grade_max: data.grade_max ?? '',
        difficulty: data.difficulty ?? 'easy',
        energy_level: data.energy_level ?? 'low',
        testing_status: data.testing_status ?? 'untested',
        testing_notes: data.testing_notes ?? '',
      })
      setTags((data.game_tags || []).map((gt) => gt.tags?.name).filter(Boolean))
      setVariations(
        (data.game_variations || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({ title: v.title || '', description: v.description }))
      )
      setAdaptations(
        (data.game_adaptations || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((a) => ({ title: a.title || '', description: a.description }))
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id, isEdit])

  // ---- Helpers ----
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function num(v) {
    return v === '' || v == null ? null : Number(v)
  }

  // ---- Submit ----
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      category_id: Number(form.category_id),
      description: form.description.trim() || null,
      instructions: form.instructions.trim() || null,
      status: form.status,
      setup_minutes: num(form.setup_minutes),
      play_minutes_min: num(form.play_minutes_min),
      play_minutes_max: num(form.play_minutes_max),
      min_players: num(form.min_players),
      ideal_players_min: num(form.ideal_players_min),
      ideal_players_max: num(form.ideal_players_max),
      max_players: num(form.max_players),
      group_size_confidence: form.group_size_confidence,
      group_size_notes: form.group_size_notes.trim() || null,
      age_min: num(form.age_min),
      age_max: num(form.age_max),
      grade_min: num(form.grade_min),
      grade_max: num(form.grade_max),
      difficulty: form.difficulty,
      energy_level: form.energy_level,
      testing_status: form.testing_status,
      testing_notes: form.testing_notes.trim() || null,
    }

    try {
      let gameId = id
      if (isEdit) {
        const { error } = await updateGame(id, payload)
        if (error) throw error
      } else {
        const { data, error } = await createGame(payload)
        if (error) throw error
        gameId = data.id
      }

      // Tags: look up IDs by name, then set
      if (tags.length > 0) {
        const { data: tagRows, error: tagErr } = await supabase
          .from('tags').select('id, name').in('name', tags)
        if (tagErr) throw tagErr
        const tagIds = tagRows.map((t) => t.id)
        const { error: setErr } = await setGameTags(gameId, tagIds)
        if (setErr) throw setErr
      } else {
        await setGameTags(gameId, [])
      }

      // Variations & adaptations
      const vres = await setGameVariations(
        gameId,
        variations.filter((v) => v.description.trim())
      )
      if (vres.error) throw vres.error

      const ares = await setGameAdaptations(
        gameId,
        adaptations.filter((a) => a.description.trim())
      )
      if (ares.error) throw ares.error

      navigate(`/library/${gameId}`, { replace: true })
    } catch (err) {
      setError(err.message || 'Save failed')
      setSaving(false)
    }
  }
  // ---- Render ----
  if (loading) return <div className="page"><p className="muted">Loading…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEdit ? 'Edit game' : 'Add game'}</h1>
        {isEdit && (
          <Link to={`/library/${id}`} className="link-btn">Cancel</Link>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <form className="game-form" onSubmit={handleSubmit}>
        {/* Basics */}
        <fieldset className="form-section">
          <legend>Basics</legend>

          <label className="form-label">
            Name *
            <input
              type="text" required value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </label>

          <label className="form-label">
            Category *
            <select
              required value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}
            >
              <option value="">— Choose —</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Short description
            <textarea
              rows={2} value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <label className="form-label">
            Instructions
            <textarea
              rows={6} value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
            />
          </label>
        </fieldset>

        {/* Timing */}
        <fieldset className="form-section">
          <legend>Timing (minutes)</legend>
          <div className="form-row">
            <label className="form-label">
              Setup
              <input type="number" min="0" value={form.setup_minutes}
                onChange={(e) => set('setup_minutes', e.target.value)} />
            </label>
            <label className="form-label">
              Play min
              <input type="number" min="0" value={form.play_minutes_min}
                onChange={(e) => set('play_minutes_min', e.target.value)} />
            </label>
            <label className="form-label">
              Play max
              <input type="number" min="0" value={form.play_minutes_max}
                onChange={(e) => set('play_minutes_max', e.target.value)} />
            </label>
          </div>
        </fieldset>

        {/* Group size */}
        <fieldset className="form-section">
          <legend>Group size</legend>
          <div className="form-row">
            <label className="form-label">
              Min players
              <input type="number" min="1" value={form.min_players}
                onChange={(e) => set('min_players', e.target.value)} />
            </label>
            <label className="form-label">
              Ideal min
              <input type="number" min="1" value={form.ideal_players_min}
                onChange={(e) => set('ideal_players_min', e.target.value)} />
            </label>
            <label className="form-label">
              Ideal max
              <input type="number" min="1" value={form.ideal_players_max}
                onChange={(e) => set('ideal_players_max', e.target.value)} />
            </label>
            <label className="form-label">
              Max players
              <input type="number" min="1" value={form.max_players}
                onChange={(e) => set('max_players', e.target.value)} />
            </label>
          </div>

          <label className="form-label">
            Confidence
            <select value={form.group_size_confidence}
              onChange={(e) => set('group_size_confidence', e.target.value)}>
              {CONFIDENCE.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="form-label">
            Notes
            <input type="text" value={form.group_size_notes}
              placeholder="e.g. tested with Grade 5"
              onChange={(e) => set('group_size_notes', e.target.value)} />
          </label>
        </fieldset>

        {/* Age & grade */}
        <fieldset className="form-section">
          <legend>Age & grade</legend>
          <div className="form-row">
            <label className="form-label">Age min
              <input type="number" min="0" value={form.age_min}
                onChange={(e) => set('age_min', e.target.value)} /></label>
            <label className="form-label">Age max
              <input type="number" min="0" value={form.age_max}
                onChange={(e) => set('age_max', e.target.value)} /></label>
            <label className="form-label">Grade min
              <input type="number" min="0" value={form.grade_min}
                onChange={(e) => set('grade_min', e.target.value)} /></label>
            <label className="form-label">Grade max
              <input type="number" min="0" value={form.grade_max}
                onChange={(e) => set('grade_max', e.target.value)} /></label>
          </div>
        </fieldset>

        {/* Energy & difficulty */}
        <fieldset className="form-section">
          <legend>Energy & difficulty</legend>
          <div className="form-row">
            <label className="form-label">
              Energy
              <select value={form.energy_level}
                onChange={(e) => set('energy_level', e.target.value)}>
                {ENERGIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="form-label">
              Difficulty
              <select value={form.difficulty}
                onChange={(e) => set('difficulty', e.target.value)}>
                {DIFFICULTIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        {/* Tags — comma-separated for MVP; we upgrade to chips next chunk */}
        <fieldset className="form-section">
          <legend>Tags</legend>
          <label className="form-label">
            Tag names (comma-separated)
            <input
              type="text"
              value={tags.join(', ')}
              onChange={(e) =>
                setTags(
                  e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                )
              }
              placeholder="e.g. No Equipment, Calm"
            />
          </label>
        </fieldset>

        {/* Variations */}
        <fieldset className="form-section">
          <legend>Variations</legend>
          {variations.map((v, i) => (
            <div key={i} className="repeater-row">
              <input
                type="text" placeholder="Title (optional)" value={v.title}
                onChange={(e) => {
                  const copy = [...variations]
                  copy[i] = { ...copy[i], title: e.target.value }
                  setVariations(copy)
                }}
              />
              <textarea
                rows={2} placeholder="Description" value={v.description}
                onChange={(e) => {
                  const copy = [...variations]
                  copy[i] = { ...copy[i], description: e.target.value }
                  setVariations(copy)
                }}
              />
              <button
                type="button" className="link-btn"
                onClick={() => setVariations(variations.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button" className="add-row"
            onClick={() => setVariations([...variations, { ...BLANK_ROW }])}
          >
            + Add variation
          </button>
        </fieldset>

        {/* Adaptations */}
        <fieldset className="form-section">
          <legend>Classroom adaptations</legend>
          {adaptations.map((a, i) => (
            <div key={i} className="repeater-row">
              <input
                type="text" placeholder="Title (optional)" value={a.title}
                onChange={(e) => {
                  const copy = [...adaptations]
                  copy[i] = { ...copy[i], title: e.target.value }
                  setAdaptations(copy)
                }}
              />
              <textarea
                rows={2} placeholder="Description" value={a.description}
                onChange={(e) => {
                  const copy = [...adaptations]
                  copy[i] = { ...copy[i], description: e.target.value }
                  setAdaptations(copy)
                }}
              />
              <button
                type="button" className="link-btn"
                onClick={() => setAdaptations(adaptations.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button" className="add-row"
            onClick={() => setAdaptations([...adaptations, { ...BLANK_ROW }])}
          >
            + Add adaptation
          </button>
        </fieldset>

        {/* Testing & status */}
        <fieldset className="form-section">
          <legend>Testing & status</legend>
          <div className="form-row">
            <label className="form-label">
              Testing status
              <select value={form.testing_status}
                onChange={(e) => set('testing_status', e.target.value)}>
                {TESTING.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="form-label">
              Status
              <select value={form.status}
                onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <label className="form-label">
            Testing notes
            <textarea rows={2} value={form.testing_notes}
              onChange={(e) => set('testing_notes', e.target.value)} />
          </label>
        </fieldset>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="primary">
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create game')}
          </button>
        </div>
      </form>
    </div>
  )
}
