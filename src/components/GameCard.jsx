import { Link } from 'react-router-dom'
import ConfidenceBadge from './ConfidenceBadge'
import { formatTime, formatGroupSize, capitalise } from '../lib/format'

export default function GameCard({ game }) {
  return (
    <Link to={`/library/${game.id}`} className="game-card">
      <div className="game-card-header">
        <h3 className="game-card-title">{game.name}</h3>
        <span className="game-card-category">{game.categories?.name || 'Uncategorised'}</span>
      </div>

      {game.description && (
        <p className="game-card-description">{game.description}</p>
      )}

      <div className="game-card-meta">
        <span className="meta-item">⏱ {formatTime(game.play_minutes_min, game.play_minutes_max)}</span>
        <span className="meta-item">
          👥 {formatGroupSize(game.ideal_players_min, game.ideal_players_max)}{' '}
          <ConfidenceBadge level={game.group_size_confidence} />
        </span>
        <span className="meta-item">⚡ {capitalise(game.energy_level)}</span>
        {game.is_favourite && <span className="meta-item">★</span>}
      </div>
    </Link>
  )
}