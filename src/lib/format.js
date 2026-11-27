// Format a play-time range: "5 min", "5–10 min", or "—"
export function formatTime(min, max) {
  if (!min && !max) return '—'
  if (min && max && min === max) return `${min} min`
  if (min && max) return `${min}–${max} min`
  if (min) return `${min}+ min`
  return `up to ${max} min`
}

// Format a group-size range: "6–20" or "—"
export function formatGroupSize(min, max) {
  if (!min && !max) return '—'
  if (min && max) return `${min}–${max}`
  if (min) return `${min}+`
  return `up to ${max}`
}

// Capitalise the first letter: "easy" → "Easy"
export function capitalise(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}