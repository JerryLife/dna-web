/**
 * LLM DNA Explorer - Workbench Page
 * Model comparison and ranking tool
 */

export default class WorkbenchPage {
    constructor(container) {
        this.container = container;
        this.dataLoader = window.dataLoader;
        this.referenceModel = null;
        this.comparisonResults = [];
    }

    async render() {
        this.container.innerHTML = this.getTemplate();

        await this.dataLoader.loadDatabase();
        this.populateSelectors();
        this.setupEventListeners();

        // Check for pre-selected model from Galaxy
        const preSelected = sessionStorage.getItem('selectedModel');
        if (preSelected) {
            sessionStorage.removeItem('selectedModel');
            const select = document.getElementById('reference-model');
            if (select) {
                select.value = preSelected;
                this.referenceModel = preSelected;
            }
        }
    }

    getTemplate() {
        return `
      <div class="page">
        <header class="page-header">
          <h1 class="page-title">Workbench</h1>
          <p class="page-subtitle">
            Compare model DNAs and discover genetic relationships
          </p>
        </header>

        <div class="workbench-layout">
          <!-- Selection Panel -->
          <section class="card selection-panel">
            <div class="card-header">
              <h2 class="card-title">🔬 Model Selection</h2>
            </div>

            <div class="selection-content">
              <!-- Reference Model -->
              <div class="form-group">
                <label class="form-label" for="reference-model">
                  Reference Model (Anchor)
                </label>
                <select id="reference-model" class="form-select">
                  <option value="">Select a model...</option>
                </select>
              </div>

              <!-- Comparison Filter -->
              <div class="form-group">
                <label class="form-label" for="comparison-filter">
                  Compare Against
                </label>
                <select id="comparison-filter" class="form-select">
                  <option value="all">All Models</option>
                  <option value="same-family">Same Family</option>
                  <option value="same-org">Same Organization</option>
                  <option value="same-size">Similar Size (±5B)</option>
                  <option value="custom">Custom Selection</option>
                </select>
              </div>

              <!-- Custom Selection (hidden by default) -->
              <div id="custom-selection" class="form-group hidden">
                <label class="form-label">Select Models</label>
                <div id="model-checkboxes" class="model-checkboxes">
                  <!-- Populated dynamically -->
                </div>
              </div>

              <button id="analyze-btn" class="btn btn-primary btn-lg" disabled>
                <span>🧬</span>
                Analyze DNA
              </button>
            </div>
          </section>

          <!-- Results Panel -->
          <section class="card results-panel">
            <div class="card-header">
              <h2 class="card-title">📊 Similarity Ranking</h2>
              <div class="card-actions">
                <span id="result-count" class="text-muted"></span>
              </div>
            </div>

            <div id="results-container" class="results-container">
              <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>Select a reference model and click "Analyze DNA" to see results</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Comparison Detail -->
        <section id="comparison-detail" class="card mt-8 hidden">
          <div class="card-header">
            <h2 class="card-title">🧬 DNA Comparison</h2>
            <button id="close-detail" class="btn btn-ghost">✕</button>
          </div>
          <div id="detail-content" class="detail-content">
            <!-- Populated when comparing two models -->
          </div>
        </section>
      </div>
    `;
    }

    populateSelectors() {
        const models = this.dataLoader.getModels();
        const refSelect = document.getElementById('reference-model');

        if (!refSelect) return;

        // Group by organization
        const grouped = {};
        models.forEach(m => {
            const org = m.organization || 'Other';
            if (!grouped[org]) grouped[org] = [];
            grouped[org].push(m);
        });

        // Create optgroups
        Object.keys(grouped).sort().forEach(org => {
            const group = document.createElement('optgroup');
            group.label = org;

            grouped[org].forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                group.appendChild(option);
            });

            refSelect.appendChild(group);
        });
    }

    setupEventListeners() {
        // Reference model selection
        const refSelect = document.getElementById('reference-model');
        if (refSelect) {
            refSelect.addEventListener('change', (e) => {
                this.referenceModel = e.target.value;
                this.updateAnalyzeButton();
            });
        }

        // Comparison filter
        const filterSelect = document.getElementById('comparison-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                const customSelection = document.getElementById('custom-selection');
                if (e.target.value === 'custom') {
                    customSelection?.classList.remove('hidden');
                    this.populateCustomSelection();
                } else {
                    customSelection?.classList.add('hidden');
                }
            });
        }

        // Analyze button
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.runAnalysis());
        }

        // Close detail
        const closeBtn = document.getElementById('close-detail');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('comparison-detail')?.classList.add('hidden');
            });
        }
    }

    updateAnalyzeButton() {
        const btn = document.getElementById('analyze-btn');
        if (btn) {
            btn.disabled = !this.referenceModel;
        }
    }

    populateCustomSelection() {
        const container = document.getElementById('model-checkboxes');
        if (!container) return;

        const models = this.dataLoader.getModels();

        container.innerHTML = models.slice(0, 50).map(m => `
      <label class="checkbox-label">
        <input type="checkbox" value="${m.id}" class="model-checkbox">
        <span>${m.name}</span>
      </label>
    `).join('');
    }

    getComparisonModels() {
        const filter = document.getElementById('comparison-filter')?.value || 'all';
        const refModel = this.dataLoader.getModelById(this.referenceModel);

        if (!refModel) return null;

        let models = this.dataLoader.getModels();

        switch (filter) {
            case 'same-family':
                models = models.filter(m => m.family === refModel.family);
                break;
            case 'same-org':
                models = models.filter(m => m.organization === refModel.organization);
                break;
            case 'same-size':
                const refSize = parseFloat(refModel.parameters) || 0;
                models = models.filter(m => {
                    const size = parseFloat(m.parameters) || 0;
                    return Math.abs(size - refSize) <= 5;
                });
                break;
            case 'custom':
                const checked = document.querySelectorAll('.model-checkbox:checked');
                const selectedIds = Array.from(checked).map(cb => cb.value);
                models = models.filter(m => selectedIds.includes(m.id));
                break;
        }

        return models.map(m => m.id);
    }

    runAnalysis() {
        if (!this.referenceModel) return;

        const modelIds = this.getComparisonModels();
        this.comparisonResults = this.dataLoader.rankBySimilarity(this.referenceModel, modelIds);

        this.renderResults();
    }

    renderResults() {
        const container = document.getElementById('results-container');
        const countEl = document.getElementById('result-count');

        if (!container) return;

        if (this.comparisonResults.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <p>No results found. Try a different filter.</p>
        </div>
      `;
            if (countEl) countEl.textContent = '0 results';
            return;
        }

        if (countEl) countEl.textContent = `${this.comparisonResults.length} results`;

        container.innerHTML = `
      <div class="results-list">
        ${this.comparisonResults.slice(0, 50).map((result, index) => `
          <div class="result-item" data-id="${result.id}">
            <div class="result-rank ${index < 3 ? 'top-' + (index + 1) : ''}">
              ${index + 1}
            </div>
            
            <div class="result-content">
              <div class="result-header">
                <h3 class="result-title">${result.name}</h3>
                <div class="result-badges">
                  ${result.family ? `<span class="badge" style="background: ${this.dataLoader.getFamilyColor(result.family)}22; color: ${this.dataLoader.getFamilyColor(result.family)}">${result.family}</span>` : ''}
                  ${result.parameters ? `<span class="badge">${result.parameters}</span>` : ''}
                </div>
              </div>
              
              <div class="result-barcode">
                ${this.renderMiniBarcode(result.signature)}
              </div>
            </div>

            <div class="result-distance">
              <div class="distance-value">${result.distance.toFixed(4)}</div>
              <div class="distance-label">distance</div>
              <div class="similarity-bar">
                <div class="similarity-fill" style="width: ${this.getSimilarityPercent(result.distance)}%"></div>
              </div>
            </div>

            <button class="btn btn-ghost compare-btn" data-id="${result.id}">
              Compare
            </button>
          </div>
        `).join('')}
      </div>
    `;

        // Add compare button handlers
        container.querySelectorAll('.compare-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showComparison(btn.dataset.id);
            });
        });
    }

    renderMiniBarcode(signature) {
        if (!signature) return '';

        const colors = this.dataLoader.signatureToColors(signature);
        const step = Math.ceil(colors.length / 32); // Show 32 bars

        return `
      <div class="mini-barcode">
        ${colors.filter((_, i) => i % step === 0).map(color =>
            `<div class="bar" style="background: ${color}"></div>`
        ).join('')}
      </div>
    `;
    }

    getSimilarityPercent(distance) {
        // Convert distance to similarity percentage (rough estimate)
        const maxDist = 2; // Approximate max distance
        return Math.max(0, Math.min(100, (1 - distance / maxDist) * 100));
    }

    showComparison(modelId) {
        const detailSection = document.getElementById('comparison-detail');
        const detailContent = document.getElementById('detail-content');

        if (!detailSection || !detailContent) return;

        const refModel = this.dataLoader.getModelById(this.referenceModel);
        const compModel = this.dataLoader.getModelById(modelId);

        if (!refModel || !compModel) return;

        const distance = this.dataLoader.calculateDistance(refModel.signature, compModel.signature);

        detailContent.innerHTML = `
      <div class="comparison-grid">
        <div class="comparison-model">
          <h3>${refModel.name}</h3>
          <p class="text-muted">Reference Model</p>
          <div class="dna-barcode-large">
            ${this.renderFullBarcode(refModel.signature)}
          </div>
        </div>
        
        <div class="comparison-vs">
          <div class="vs-icon">⚡</div>
          <div class="vs-distance">
            <div class="distance-value">${distance.toFixed(4)}</div>
            <div class="distance-label">Euclidean Distance</div>
          </div>
        </div>

        <div class="comparison-model">
          <h3>${compModel.name}</h3>
          <p class="text-muted">Comparison Model</p>
          <div class="dna-barcode-large">
            ${this.renderFullBarcode(compModel.signature)}
          </div>
        </div>
      </div>

      <div class="difference-heatmap mt-6">
        <h4>Signature Difference</h4>
        <div class="heatmap-container">
          ${this.renderDifferenceHeatmap(refModel.signature, compModel.signature)}
        </div>
      </div>
    `;

        detailSection.classList.remove('hidden');
        detailSection.scrollIntoView({ behavior: 'smooth' });
    }

    renderFullBarcode(signature) {
        if (!signature) return '<div class="no-signature">No signature available</div>';

        const colors = this.dataLoader.signatureToColors(signature);

        return `
      <div class="dna-barcode">
        ${colors.map((color, i) =>
            `<div class="barcode-segment" style="background: ${color}" title="Dim ${i}: ${signature[i].toFixed(4)}"></div>`
        ).join('')}
      </div>
    `;
    }

    renderDifferenceHeatmap(sig1, sig2) {
        if (!sig1 || !sig2) return '';

        const diffs = sig1.map((v, i) => Math.abs(v - sig2[i]));
        const maxDiff = Math.max(...diffs);

        return `
      <div class="heatmap">
        ${diffs.map((diff, i) => {
            const intensity = diff / maxDiff;
            const color = `rgba(239, 68, 68, ${intensity})`;
            return `<div class="heatmap-cell" style="background: ${color}" title="Dim ${i}: diff=${diff.toFixed(4)}"></div>`;
        }).join('')}
      </div>
    `;
    }

    destroy() {
        // Cleanup
    }
}
