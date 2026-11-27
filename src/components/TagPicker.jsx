import { useState } from 'react'

// Group order for display. Tags with an unknown group go to "Other".
const GROUP_ORDER = ['Equipment', 'Space', 'Skill', 'Format', 'Vibe', 'Other']

export default function TagPicker({ allTags, selected, onChange }) {
  const [otherInput, setOtherInput] = useState('')

  // Group the tags by tag_group for display
  const grouped = allTags.reduce((acc, tag) => {
    const group = tag.tag_group || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(tag)
    return acc
  }, {})

  function toggle(name) {
    if (selected.includes(name)) {
      onChange(selected.filter((t) => t !== name))
    } else {
      onChange([...selected, name])
    }
  }

  function addOther() {
    const clean = otherInput.trim()
    if (!clean) return
    // Avoid duplicating
    if (!selected.includes(clean)) onChange([...selected, clean])
    setOtherInput('')
  }

  return (
    <div className="tag-picker">
      {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
        <div key={group} className="tag-picker-group">
          <div className="tag-picker-label">{group}</div>
          <div className="chip-row">
            {grouped[group].map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`chip ${selected.includes(tag.name) ? 'chip-active' : ''}`}
                onClick={() => toggle(tag.name)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Any selected names that aren't in allTags yet — show them so the
          user can confirm what they've added via "Other". */}
      {selected.filter((name) => !allTags.some((t) => t.name === name)).length > 0 && (
        <div className="tag-picker-group">
          <div className="tag-picker-label">Custom (not yet saved)</div>
          <div className="chip-row">
            {selected
              .filter((name) => !allTags.some((t) => t.name === name))
              .map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip chip-active"
                  onClick={() => toggle(name)}
                  title="Click to remove"
                >
                  {name} ×
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="tag-picker-group">
        <div className="tag-picker-label">Add a custom tag</div>
        <div className="tag-other-row">
          <input
            type="text"
            placeholder="e.g. Seasonal, Lent"
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addOther() }
            }}
          />
          <button type="button" className="add-row" onClick={addOther}>
            + Add
          </button>
        </div>
      </div>
    </div>
  )
}