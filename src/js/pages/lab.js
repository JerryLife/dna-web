/**
 * LLM DNA Explorer - Community Lab Page
 * Model proposal and voting system
 */

export default class LabPage {
    constructor(container) {
        this.container = container;
        this.dataLoader = window.dataLoader;
        this.proposals = [];
    }

    async render() {
        this.container.innerHTML = this.getTemplate();

        // Load proposals from local storage (demo) or backend
        await this.loadProposals();
        this.renderProposals();
        this.setupEventListeners();
    }

    getTemplate() {
        return `
      <div class="page">
        <header class="page-header">
          <h1 class="page-title">Community Lab</h1>
          <p class="page-subtitle">
            Help us map the LLM ecosystem. Propose new models and vote on which ones to analyze next.
          </p>
        </header>

        <div class="lab-grid">
          <!-- Proposal Form -->
          <section class="card proposal-section">
            <div class="card-header">
              <h2 class="card-title">🔬 Propose a Model</h2>
            </div>
            
            <form id="proposal-form" class="proposal-form">
              <div class="form-group">
                <label class="form-label" for="model-id">HuggingFace Model ID</label>
                <input 
                  type="text" 
                  id="model-id" 
                  class="form-input"
                  placeholder="e.g., mistralai/Mistral-7B-v0.3"
                  required
                >
                <small class="form-hint">
                  Enter the full model ID from HuggingFace Hub
                </small>
              </div>

              <div class="form-group">
                <label class="form-label" for="reason">Why this model? (optional)</label>
                <textarea 
                  id="reason" 
                  class="form-input form-textarea"
                  rows="3"
                  placeholder="What makes this model interesting to analyze?"
                ></textarea>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary btn-lg">
                  <span>🧬</span>
                  Add to Trace Queue
                </button>
              </div>
            </form>

            <div id="form-status" class="form-status"></div>
          </section>

          <!-- Leaderboard -->
          <section class="card leaderboard-section">
            <div class="card-header">
              <h2 class="card-title">📊 Research Queue</h2>
              <div class="card-actions">
                <select id="sort-by" class="form-select">
                  <option value="votes">Most Votes</option>
                  <option value="recent">Most Recent</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>
            </div>

            <div id="proposals-list" class="proposals-list">
              <div class="loading-placeholder">
                <div class="spinner"></div>
                <span>Loading proposals...</span>
              </div>
            </div>
          </section>
        </div>

        <!-- Info Section -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">ℹ️ How It Works</h2>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-icon">1️⃣</div>
              <h3>Propose</h3>
              <p>Submit a HuggingFace model ID that you'd like us to analyze.</p>
            </div>
            <div class="info-item">
              <div class="info-icon">2️⃣</div>
              <h3>Vote</h3>
              <p>Upvote models you want to see in the DNA Galaxy.</p>
            </div>
            <div class="info-item">
              <div class="info-icon">3️⃣</div>
              <h3>Track</h3>
              <p>Watch as we process top-voted models with RepTrace.</p>
            </div>
            <div class="info-item">
              <div class="info-icon">4️⃣</div>
              <h3>Explore</h3>
              <p>Once complete, find the model in the Galaxy!</p>
            </div>
          </div>
        </section>
      </div>
    `;
    }

    async loadProposals() {
        // In production, this would fetch from Supabase
        // For demo, use localStorage
        try {
            const stored = localStorage.getItem('dna-proposals');
            this.proposals = stored ? JSON.parse(stored) : this.getDefaultProposals();
        } catch {
            this.proposals = this.getDefaultProposals();
        }
    }

    getDefaultProposals() {
        return [
            {
                id: '1',
                modelId: 'google/gemma-2-27b-it',
                votes: 42,
                status: 'pending',
                createdAt: '2026-01-29T10:00:00Z',
                reason: 'Largest Gemma 2 model, would be great to see family clustering'
            },
            {
                id: '2',
                modelId: 'Nexusflow/Athene-V2-Chat',
                votes: 38,
                status: 'scanning',
                createdAt: '2026-01-28T15:30:00Z',
                reason: 'Top model on various benchmarks'
            },
            {
                id: '3',
                modelId: 'deepseek-ai/DeepSeek-V3',
                votes: 65,
                status: 'pending',
                createdAt: '2026-01-27T08:45:00Z',
                reason: 'Breakthrough MoE architecture'
            },
            {
                id: '4',
                modelId: 'Qwen/Qwen2.5-72B-Instruct',
                votes: 29,
                status: 'completed',
                createdAt: '2026-01-25T12:00:00Z'
            },
            {
                id: '5',
                modelId: 'microsoft/phi-4',
                votes: 51,
                status: 'pending',
                createdAt: '2026-01-26T09:15:00Z',
                reason: 'New Phi series, interesting for small model comparison'
            }
        ];
    }

    saveProposals() {
        localStorage.setItem('dna-proposals', JSON.stringify(this.proposals));
    }

    renderProposals() {
        const container = document.getElementById('proposals-list');
        if (!container) return;

        if (this.proposals.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <p>No proposals yet. Be the first to suggest a model!</p>
        </div>
      `;
            return;
        }

        // Sort proposals
        const sortBy = document.getElementById('sort-by')?.value || 'votes';
        const sorted = [...this.proposals].sort((a, b) => {
            if (sortBy === 'votes') return b.votes - a.votes;
            if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === 'name') return a.modelId.localeCompare(b.modelId);
            return 0;
        });

        container.innerHTML = sorted.map((proposal, index) => `
      <div class="proposal-card" data-id="${proposal.id}">
        <div class="proposal-rank">${index + 1}</div>
        
        <div class="proposal-content">
          <div class="proposal-header">
            <h3 class="proposal-title">
              <a href="https://huggingface.co/${proposal.modelId}" target="_blank" rel="noopener">
                ${proposal.modelId}
              </a>
            </h3>
            <span class="badge ${this.getStatusClass(proposal.status)}">
              ${this.getStatusText(proposal.status)}
            </span>
          </div>
          
          ${proposal.reason ? `<p class="proposal-reason">${proposal.reason}</p>` : ''}
          
          <div class="proposal-meta">
            <span class="proposal-date">
              ${this.formatDate(proposal.createdAt)}
            </span>
          </div>
        </div>

        <div class="proposal-votes">
          <button 
            class="vote-btn ${proposal.voted ? 'voted' : ''}" 
            data-id="${proposal.id}"
            ${proposal.status === 'completed' ? 'disabled' : ''}
          >
            <span class="vote-icon">▲</span>
            <span class="vote-count">${proposal.votes}</span>
          </button>
        </div>
      </div>
    `).join('');

        // Attach vote handlers
        container.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                this.handleVote(id);
            });
        });
    }

    getStatusClass(status) {
        const classes = {
            pending: 'badge-warning',
            scanning: 'badge-info',
            completed: 'badge-success',
            failed: 'badge-error'
        };
        return classes[status] || '';
    }

    getStatusText(status) {
        const texts = {
            pending: '⏳ Pending',
            scanning: '🔄 Scanning',
            completed: '✓ Completed',
            failed: '✕ Failed'
        };
        return texts[status] || status;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    handleVote(id) {
        const proposal = this.proposals.find(p => p.id === id);
        if (!proposal || proposal.status === 'completed') return;

        // Toggle vote
        if (proposal.voted) {
            proposal.votes--;
            proposal.voted = false;
        } else {
            proposal.votes++;
            proposal.voted = true;
        }

        this.saveProposals();
        this.renderProposals();

        window.showToast(
            proposal.voted ? 'Vote recorded!' : 'Vote removed',
            proposal.voted ? 'success' : 'info'
        );
    }

    async handleSubmit(e) {
        e.preventDefault();

        const modelIdInput = document.getElementById('model-id');
        const reasonInput = document.getElementById('reason');
        const statusEl = document.getElementById('form-status');

        const modelId = modelIdInput.value.trim();
        const reason = reasonInput.value.trim();

        if (!modelId) {
            this.showStatus('Please enter a model ID', 'error');
            return;
        }

        // Check if already exists
        if (this.proposals.some(p => p.modelId.toLowerCase() === modelId.toLowerCase())) {
            this.showStatus('This model has already been proposed', 'warning');
            return;
        }

        // Check if already in database
        const existingModel = this.dataLoader.getModels().find(m =>
            m.name.toLowerCase() === modelId.toLowerCase() ||
            m.id.toLowerCase().replace('_', '/') === modelId.toLowerCase()
        );

        if (existingModel) {
            this.showStatus('This model is already in the Galaxy! 🎉', 'info');
            return;
        }

        // Add proposal
        const newProposal = {
            id: Date.now().toString(),
            modelId,
            reason,
            votes: 1,
            voted: true,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.proposals.unshift(newProposal);
        this.saveProposals();
        this.renderProposals();

        // Clear form
        modelIdInput.value = '';
        reasonInput.value = '';

        this.showStatus('Model added to the queue! 🧬', 'success');
        window.showToast('Proposal submitted successfully!', 'success');
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('form-status');
        if (!statusEl) return;

        statusEl.className = `form-status status-${type}`;
        statusEl.textContent = message;
        statusEl.style.display = 'block';

        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('proposal-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Sort change
        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.renderProposals());
        }
    }

    destroy() {
        // Cleanup if needed
    }
}
