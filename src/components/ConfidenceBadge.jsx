export default function ConfidenceBadge({ level }) {
  const labels = {
    confirmed:  { text: 'Confirmed',  className: 'badge badge-confirmed'  },
    estimated:  { text: 'Estimated',  className: 'badge badge-estimated'  },
    unassessed: { text: 'Unassessed', className: 'badge badge-unassessed' },
  }
  const { text, className } = labels[level] || labels.unassessed
  return <span className={className}>{text}</span>
}