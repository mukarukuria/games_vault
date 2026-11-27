import { supabase } from './supabaseClient'

export async function fetchGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*, categories(name), game_tags(tags(id, name, tag_group))')
    .neq('status', 'archived')
    .order('name', { ascending: true })

  return { data, error }
}

// Fetch one game by id, with category name.
export async function fetchGameById(id) {
  const { data, error } = await supabase
    .from('games')
    .select('*, categories(name)')
    .eq('id', id)
    .single()   // expect exactly one row

  return { data, error }
}

// Count games that aren't archived
export async function countGames() {
  const { count, error } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })   // head:true = return count only, no rows
    .neq('status', 'archived')
  return { count, error }
}

// Fetch the N most recently added games (for "recently added" panel)
export async function fetchRecentGames(limit = 5) {
  const { data, error } = await supabase
    .from('games')
    .select('*, categories(name)')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

// Fetch games flagged as favourites
export async function fetchFavourites() {
  const { data, error } = await supabase
    .from('games')
    .select('*, categories(name)')
    .eq('is_favourite', true)
    .neq('status', 'archived')
    .order('name', { ascending: true })
  return { data, error }
}

// Fetch games needing review (data quality nudges)
export async function fetchNeedsReview() {
  const { data, error } = await supabase
    .from('games')
    .select('*, categories(name)')
    .or('testing_status.eq.needs_review,group_size_confidence.eq.unassessed')
    .neq('status', 'archived')
    .order('name', { ascending: true })
  return { data, error }
}

// ---------- Create ----------
export async function createGame(payload) {
  const { data, error } = await supabase
    .from('games')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

// ---------- Update ----------
export async function updateGame(id, payload) {
  const { data, error } = await supabase
    .from('games')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// ---------- Archive (soft delete) ----------
export async function archiveGame(id) {
  const { data, error } = await supabase
    .from('games')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// ---------- Toggle favourite ----------
export async function setFavourite(id, isFavourite) {
  const { data, error } = await supabase
    .from('games')
    .update({ is_favourite: isFavourite })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// ---------- Tags: attach & detach ----------
// Replace all tags on a game with the given array of tag IDs.
export async function setGameTags(gameId, tagIds) {
  // Simplest reliable strategy: delete then re-insert.
  const del = await supabase.from('game_tags').delete().eq('game_id', gameId)
  if (del.error) return { error: del.error }
  if (tagIds.length === 0) return { error: null }

  const rows = tagIds.map((tag_id) => ({ game_id: gameId, tag_id }))
  const ins = await supabase.from('game_tags').insert(rows)
  return { error: ins.error }
}

// ---------- Variations ----------
export async function setGameVariations(gameId, variations) {
  const del = await supabase.from('game_variations').delete().eq('game_id', gameId)
  if (del.error) return { error: del.error }
  if (variations.length === 0) return { error: null }
  const rows = variations.map((v, i) => ({
    game_id: gameId,
    title: v.title || null,
    description: v.description,
    sort_order: i,
  }))
  const ins = await supabase.from('game_variations').insert(rows)
  return { error: ins.error }
}

// ---------- Adaptations ----------
export async function setGameAdaptations(gameId, adaptations) {
  const del = await supabase.from('game_adaptations').delete().eq('game_id', gameId)
  if (del.error) return { error: del.error }
  if (adaptations.length === 0) return { error: null }
  const rows = adaptations.map((a, i) => ({
    game_id: gameId,
    title: a.title || null,
    description: a.description,
    sort_order: i,
  }))
  const ins = await supabase.from('game_adaptations').insert(rows)
  return { error: ins.error }
}

// ---------- Fetch a game with ALL its related data ----------
export async function fetchGameFull(id) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      categories(name),
      game_tags(tags(id, name, tag_group)),
      game_variations(id, title, description, sort_order),
      game_adaptations(id, title, description, sort_order)
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

// ---------- Play session + feedback ----------
export async function createPlaySession({ gameId, playedOn, groupSize, durationMinutes, notes }) {
  const { data, error } = await supabase
    .from('play_sessions')
    .insert({
      game_id: gameId,
      played_on: playedOn,
      group_size: groupSize,
      duration_minutes: durationMinutes,
      notes,
    })
    .select()
    .single()
  return { data, error }
}

export async function createFeedback({ playSessionId, enjoyment, easeOfExplanation, playAgain, notes }) {
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      play_session_id: playSessionId,
      enjoyment,
      ease_of_explanation: easeOfExplanation,
      play_again: playAgain,
      notes,
    })
    .select()
    .single()
  return { data, error }
}