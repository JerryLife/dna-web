/**
 * Propose a Model – form only, state isolated from Research Queue.
 */
import { useState, useEffect } from 'react';

export type ProposalSubmitData = { email: string; modelId: string; reason: string };

export type ProposalSubmitResult =
  | { ok: true }
  | { ok: false; message: string; type: string };

type Props = {
  onSubmit: (data: ProposalSubmitData) => Promise<ProposalSubmitResult>;
};

export default function ProposeModelForm({ onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [modelId, setModelId] = useState('');
  const [reason, setReason] = useState('');
  const [formStatus, setFormStatus] = useState<{ message: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!formStatus) return;
    const t = setTimeout(() => setFormStatus(null), 5000);
    return () => clearTimeout(t);
  }, [formStatus]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data: ProposalSubmitData = {
      email: email.trim(),
      modelId: modelId.trim(),
      reason: reason.trim(),
    };
    if (!data.modelId) return setFormStatus({ message: 'Please enter a model ID', type: 'error' });
    if (!data.email) return setFormStatus({ message: 'Please enter your email', type: 'error' });

    setSubmitting(true);
    try {
      const result = await onSubmit(data);
      if (result.ok) {
        setModelId('');
        setReason('');
        setFormStatus({ message: 'Model verified and added to the queue! 🧬', type: 'success' });
      } else {
        setFormStatus({ message: result.message, type: result.type });
      }
    } catch {
      setFormStatus({ message: 'Something went wrong', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card proposal-section">
      <div className="card-header">
        <h2 className="card-title">🔬 Propose a Model</h2>
      </div>
      <form className="proposal-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="lab-email">Your Email (Submitter ID)</label>
          <input
            id="lab-email"
            type="email"
            className="form-input"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <small className="form-hint">Used as your ID. We may contact you if there are issues.</small>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="lab-model-id">HuggingFace Model ID</label>
          <input
            id="lab-model-id"
            type="text"
            className="form-input"
            placeholder="e.g., mistralai/Mistral-7B-v0.3"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            required
          />
          <small className="form-hint">Full model ID from HuggingFace Hub</small>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="lab-reason">Why this model? (optional)</label>
          <textarea
            id="lab-reason"
            className="form-input form-textarea"
            rows={3}
            placeholder="What makes this model interesting to analyze?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            <span>{submitting ? '⏳' : '🧬'}</span>
            {submitting ? 'Verifying...' : 'Add to Trace Queue'}
          </button>
        </div>
      </form>
      {formStatus && (
        <div className={`form-status status-${formStatus.type}`} role="status">{formStatus.message}</div>
      )}
    </section>
  );
}
