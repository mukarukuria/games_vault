import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import TagPicker from '../components/TagPicker'
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
// const [allTags, setAllTags] = useState([])   // the controlled tag list from the DB

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
  const [allTags, setAllTags] = useState([])
  const [variations, setVariations] = useState([])
  const [adaptations, setAdaptations] = useState([])

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

// Load the full tag list once for the picker (independent of edit/new)
useEffect(() => {
  let cancelled = false
  async function loadTags() {
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, tag_group')
      .order('tag_group', { ascending: true })
      .order('name', { ascending: true })
    if (cancelled) return
    if (!error) setAllTags(data || [])
  }
  loadTags()
  return () => { cancelled = true }
}, [])

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

    const isUntested = form.testing_status === 'untested'

    const payload = {
        name: form.name.trim(),
        category_id: Number(form.category_id),
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        status: form.status,
        testing_status: form.testing_status,
        testing_notes: isUntested ? null : (form.testing_notes.trim() || null),

        // Everything below is wiped when untested
        setup_minutes: isUntested ? null : num(form.setup_minutes),
        play_minutes_min: isUntested ? null : num(form.play_minutes_min),
        play_minutes_max: isUntested ? null : num(form.play_minutes_max),
        min_players: isUntested ? null : num(form.min_players),
        ideal_players_min: isUntested ? null : num(form.ideal_players_min),
        ideal_players_max: isUntested ? null : num(form.ideal_players_max),
        max_players: isUntested ? null : num(form.max_players),
        group_size_confidence: isUntested ? 'unassessed' : form.group_size_confidence,
        group_size_notes: isUntested ? null : (form.group_size_notes.trim() || null),
        age_min: isUntested ? null : num(form.age_min),
        age_max: isUntested ? null : num(form.age_max),
        grade_min: isUntested ? null : num(form.grade_min),
        grade_max: isUntested ? null : num(form.grade_max),
        difficulty: isUntested ? null : form.difficulty,
        energy_level: isUntested ? null : form.energy_level,
    }
    const tagsToSave = isUntested ? [] : tags
    const variationsToSave = isUntested ? [] : variations.filter((v) => v.description.trim())
    const adaptationsToSave = isUntested ? [] : adaptations.filter((a) => a.description.trim())

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
        // First, create any tags the user added that aren't in the DB yet.
        const newTagNames = tagsToSave.filter(
        (name) => !allTags.some((t) => t.name === name)
        )
        if (newTagNames.length > 0) {
        const { error: insertErr } = await supabase
            .from('tags')
            .insert(newTagNames.map((name) => ({ name, tag_group: 'Other' })))
        if (insertErr) throw insertErr

        // Refresh local allTags so the picker sees them
        const { data: refreshed } = await supabase
            .from('tags').select('id, name, tag_group')
        if (refreshed) setAllTags(refreshed)
        }

        // Then look up all the tag IDs by name (as before)
        if (tagsToSave.length > 0) {
        const { data: tagRows, error: tagErr } = await supabase
            .from('tags').select('id, name').in('name', tagsToSave)
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

        {form.testing_status !== 'untested' && (
            <>
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
                    <TagPicker
                        allTags={allTags}
                        selected={tags}
                        onChange={setTags}
                    />
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
            </>
        )}      
        {form.testing_status === 'untested' && (
            <div className="form-note">
                Only the basics are shown while this game is untested. Once you've tried it,
                change Testing status to <strong>tested</strong> or <strong>needs review</strong>{' '}
                and the rest of the form will appear.
            </div>
        )}




        

        <div className="form-actions">
          <button type="submit" disabled={saving} className="primary">
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create game')}
          </button>
        </div>
      </form>
    </div>
  )
}
