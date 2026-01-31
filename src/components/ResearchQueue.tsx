/**
 * Research Queue – list + sort + vote only, state from parent.
 */
import type { Proposal, SortBy } from '@/types/lab';

const STATUS: Record<Proposal['status'], { class: string; text: string }> = {
  pending: { class: 'badge-warning', text: '⏳ Pending' },
  scanning: { class: 'badge-info', text: '🔄 Scanning' },
  completed: { class: 'badge-success', text: '✓ Completed' },
  failed: { class: 'badge-error', text: '✕ Failed' },
};

function maskEmail(email: string): string {
  if (!email) return 'Anonymous';
  const [name, domain] = email.split('@');
  if (!name || !domain) return 'Anonymous';
  return `${name.slice(0, 3)}***@${domain}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

type Props = {
  proposals: Proposal[];
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  onVote: (id: string) => void;
};

export default function ResearchQueue({ proposals, sortBy, onSortChange, onVote }: Props) {
  const sorted = [...proposals].sort((a, b) => {
    if (sortBy === 'votes') return b.votes - a.votes;
    if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.modelId.localeCompare(b.modelId);
  });

  return (
    <section className="card leaderboard-section">
      <div className="card-header">
        <h2 className="card-title">📊 Research Queue</h2>
        <div className="card-actions">
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
          >
            <option value="votes">Most Votes</option>
            <option value="recent">Most Recent</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>
      <div className="proposals-list">
        {sorted.length === 0 ? (
          <div className="empty-state" style={{ padding: 24, color: 'var(--color-text-secondary)' }}>
            <p>No proposals yet. Be the first to suggest a model!</p>
          </div>
        ) : (
          sorted.map((p, i) => (
            <div key={p.id} className="proposal-card">
              <div className="proposal-rank">{i + 1}</div>
              <div className="proposal-content">
                <div className="proposal-header">
                  <h3 className="proposal-title">
                    <a href={`https://huggingface.co/${p.modelId}`} target="_blank" rel="noopener noreferrer">
                      {p.modelId}
                    </a>
                  </h3>
                  <span className={`badge ${STATUS[p.status].class}`}>{STATUS[p.status].text}</span>
                </div>
                <div className="proposal-meta">
                  <span className="proposal-date">
                    {formatDate(p.createdAt)}
                    {p.submitter ? ` • by ${maskEmail(p.submitter)}` : ''}
                  </span>
                </div>
              </div>
              <div className="proposal-votes">
                <button
                  type="button"
                  className={`vote-btn ${p.voted ? 'voted' : ''}`}
                  onClick={() => onVote(p.id)}
                  disabled={p.status === 'completed'}
                >
                  <span className="vote-icon">▲</span>
                  <span className="vote-count">{p.votes}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
