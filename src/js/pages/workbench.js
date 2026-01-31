// Helper Class for Searchable Dropdown (Combobox)
class SearchableSelect {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.items = [];
    this.selectedId = null;
    this.onChange = options.onChange || (() => { });
    this.limit = 50; // Limit rendered items for performance

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="searchable-select">
        <div class="combobox-input-wrapper">
          <input 
            type="text" 
            class="combobox-input" 
            placeholder="${this.options.placeholder || 'Select...'}"
            id="${this.options.id}-input"
            autocomplete="off"
          >
          <div class="combobox-chevron">▼</div>
        </div>
        <div class="select-dropdown hidden" id="${this.options.id}-dropdown">
          <div class="select-options" id="${this.options.id}-options"></div>
        </div>
      </div>
    `;

    this.input = this.container.querySelector('.combobox-input');
    this.dropdown = this.container.querySelector('.select-dropdown');
    this.optionsContainer = this.container.querySelector('.select-options');
    this.chevron = this.container.querySelector('.combobox-chevron');

    this.setupEvents();
  }

  setupEvents() {
    // Input Focus -> Open
    this.input.addEventListener('focus', () => {
      this.openDropdown();
    });

    // Input Type -> Filter
    this.input.addEventListener('input', (e) => {
      this.openDropdown();
      this.renderOptions(e.target.value);
    });

    // Click outside -> Close (and reset text if not valid selection?)
    // For now taking simple approach: close.
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
        this.validateInput();
      }
    });

    // Chevron click -> Toggle
    this.chevron.parentNode.addEventListener('click', (e) => {
      // If clicking input, it's handled by focus. 
      // But if clicking chevron area (which is over input via padding but the chevron itself is pointer-events none?).
      // Actually, let's just let the input focus handle opening.
      // Clicking the chevron *wrapper* might be useful if we want to toggle close.
      if (document.activeElement === this.input && !this.dropdown.classList.contains('hidden')) {
        // If already open and focused, maybe close on chevron click? 
        // Hard to distinguish click on Right Side. 
        // Let's rely on focus/blur mostly.
      }
    });
  }

  // toggleDropdown() is removed as per new combobox pattern

  openDropdown() {
    // Close others
    document.querySelectorAll('.select-dropdown:not(.hidden)').forEach(el => {
      if (el !== this.dropdown) el.classList.add('hidden');
    });

    this.dropdown.classList.remove('hidden');
    this.chevron.classList.add('open');
    this.renderOptions(this.input.value);
  }

  closeDropdown() {
    this.dropdown.classList.add('hidden');
    this.chevron.classList.remove('open');
  }

  validateInput() {
    // If the text in input doesn't match the selected Item's name,
    // revert it to the selected item's name (if any).
    if (this.selectedId) {
      const item = this.items.find(i => i.id === this.selectedId);
      if (item && this.input.value !== item.name) {
        this.input.value = item.name;
      }
    } else {
      // If no selection, clear input? Or keep custom text?
      // For stricter selection, clear it.
      // Unsure if user wants flexible input. Assuming strict selection for now.
      // But checking against ALL items names is expensive if not careful.
      // Let's just leave it, or clear if empty.
      if (this.input.value.trim() === '') {
        this.selectedId = null;
      }
    }
  }

  setItems(items) {
    this.items = items;
  }

  select(id) {
    this.selectedId = id;
    const item = this.items.find(i => i.id === id);
    if (item) {
      this.input.value = item.name;
    } else {
      this.input.value = '';
    }
    this.closeDropdown();
    this.onChange(id);
  }

  clear() {
    this.selectedId = null;
    this.input.value = '';
  }

  renderOptions(filter = '') {
    const lowerFilter = filter.toLowerCase();

    // Filter
    let filtered = this.items;
    if (lowerFilter) {
      filtered = this.items.filter(item =>
        item.name.toLowerCase().includes(lowerFilter) ||
        (item.family && item.family.toLowerCase().includes(lowerFilter))
      );
    }

    if (filtered.length === 0) {
      this.optionsContainer.innerHTML = `<div class="select-option-group">No models found</div>`;
      return;
    }

    // Limit Result Count
    const truncated = filtered.length > this.limit;
    const displayItems = filtered.slice(0, this.limit);

    // Render Flat List for search, Grouped for empty?
    // User asked for "search box", usually flat list is better for combobox.
    // Let's stick to flat list if there is a filter, OR just flat list always for consistency + performance?
    // Grouping 6000 items is heavy. Flat list with limit is better.

    let html = displayItems.map(item => this.getOptionHtml(item)).join('');

    if (truncated) {
      html += `<div class="select-option-group" style="text-align:center; padding:8px;">... and ${filtered.length - this.limit} more. Keep typing to search.</div>`;
    }

    this.optionsContainer.innerHTML = html;

    // Add click events
    this.optionsContainer.querySelectorAll('.select-option').forEach(el => {
      el.addEventListener('mousedown', (e) => { // mousedown prevents blur before click
        e.preventDefault();
        this.select(el.dataset.id);
      });
    });
  }

  getOptionHtml(item) {
    return `
      <div class="select-option ${item.id === this.selectedId ? 'selected' : ''}" data-id="${item.id}">
        <span>${item.name}</span>
        ${item.parameters ? `<span style="font-size:11px; opacity:0.7">${item.parameters}</span>` : ''}
      </div>
    `;
  }
}

export default class WorkbenchPage {
  constructor(container) {
    this.container = container;
    this.dataLoader = window.dataLoader;
    this.referenceModel = null;
    this.comparisonResults = [];
    this.refSelect = null;
    this.compSelect = null;
    this.selectedComparisonModels = new Set();
  }

  async render() {
    this.container.innerHTML = this.getTemplate();

    await this.dataLoader.loadDatabase();
    this.initSelectors();
    this.setupEventListeners();

    // Check for pre-selected model
    const preSelected = sessionStorage.getItem('selectedModel');
    if (preSelected) {
      sessionStorage.removeItem('selectedModel');
      if (this.refSelect) {
        this.refSelect.select(preSelected);
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
                <label class="form-label">
                  Reference Model (Anchor)
                </label>
                <div id="reference-select-container"></div>
              </div>

              <!-- Comparison Selection -->
              <div class="form-group">
                <label class="form-label">
                  Compare Against
                </label>
                <div id="comparison-select-container"></div>
                
                <div class="tags-input-container mt-2" id="comparison-tags">
                    <span style="color:var(--color-text-muted); font-size:12px; padding:4px;">No comparison models selected (defaults to All)</span>
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

  initSelectors() {
    const models = this.dataLoader.getModels();

    // Reference Selector
    this.refSelect = new SearchableSelect(
      document.getElementById('reference-select-container'),
      {
        id: 'ref-model',
        placeholder: 'Select a reference model...',
        onChange: (id) => {
          this.referenceModel = id;
          this.updateAnalyzeButton();
        }
      }
    );
    this.refSelect.setItems(models);

    // Comparison Selector (Multi-select adder)
    this.compSelect = new SearchableSelect(
      document.getElementById('comparison-select-container'),
      {
        id: 'comp-model',
        placeholder: 'Add specific model to compare...',
        onChange: (id) => {
          this.addComparisonModel(id);
          // Clear the selector for the next input
          // Use a small timeout to let the UI settle if needed, or simply clear
          setTimeout(() => {
            this.compSelect.clear();
          }, 50);
        }
      }
    );
    this.compSelect.setItems(models);
  }

  addComparisonModel(id) {
    if (this.selectedComparisonModels.has(id)) return;

    this.selectedComparisonModels.add(id);
    this.renderComparisonTags();
  }

  removeComparisonModel(id) {
    this.selectedComparisonModels.delete(id);
    this.renderComparisonTags();
  }

  renderComparisonTags() {
    const container = document.getElementById('comparison-tags');
    if (!container) return;

    if (this.selectedComparisonModels.size === 0) {
      container.innerHTML = '<span style="color:var(--color-text-muted); font-size:12px; padding:4px;">No comparison models selected (defaults to All)</span>';
      return;
    }

    container.innerHTML = Array.from(this.selectedComparisonModels).map(id => {
      const model = this.dataLoader.getModelById(id);
      return `
                <div class="tag-item">
                    <span>${model ? model.name : id}</span>
                    <span class="tag-remove" data-id="${id}">×</span>
                </div>
            `;
    }).join('');

    // Add remove handlers
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.removeComparisonModel(e.target.dataset.id);
      });
    });
  }

  setupEventListeners() {
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

  getComparisonModels() {
    // If specific models selected, return only those IDs
    if (this.selectedComparisonModels.size > 0) {
      return Array.from(this.selectedComparisonModels);
    }

    // Otherwise return all (default behavior)
    // Or we could implement family/org filters again if requested, 
    // but user specifically asked for "modern easy way" selection, implying manual choice.
    // For backwards compat with "All Models" default:
    return this.dataLoader.getModels().map(m => m.id);
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
          <p>No results found.</p>
        </div>
      `;
      if (countEl) countEl.textContent = '0 results';
      return;
    }

    if (countEl) countEl.textContent = `${this.comparisonResults.length} matches found`;

    container.innerHTML = `
      <div class="results-list">
        ${this.comparisonResults.slice(0, 50).map((result, index) => {
      const percent = Math.round(this.getSimilarityPercent(result.distance));
      const rankClass = index < 3 ? `rank-${index + 1}` : '';
      const delay = index * 0.05; // Stagger animation

      let rankDisplay = `<span class="rank-number">#${index + 1}</span>`;
      if (index === 0) rankDisplay = `<span class="trophy-icon">🏆</span>`;
      if (index === 1) rankDisplay = `<span class="trophy-icon">🥈</span>`;
      if (index === 2) rankDisplay = `<span class="trophy-icon">🥉</span>`;

      return `
          <div class="result-item" data-id="${result.id}" style="animation-delay: ${delay}s">
            <div class="result-rank ${rankClass}">
              ${rankDisplay}
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
              <div class="match-score">${percent}%</div>
              <div class="match-label">Match Score</div>
              <div class="similarity-bar">
                <div class="similarity-fill" style="width: ${percent}%"></div>
              </div>
            </div>

            <button class="btn btn-ghost compare-btn" data-id="${result.id}">
              Compare
            </button>
          </div>
        `;
    }).join('')}
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
          <div class="match-score-large" title="Calculation: 100 * (1 - Distance / 2). Based on normalized Euclidean distance.">
            ${Math.round(this.getSimilarityPercent(distance))}%
            <span class="info-icon-small">ⓘ</span>
          </div>
          <div class="distance-label">Match Score</div>
          <div class="distance-micro">Dist: ${distance.toFixed(4)}</div>
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
      <h4>Signature Difference <span style="font-weight:normal; font-size:12px; color:var(--color-text-muted)">(Darker red = larger difference)</span></h4>
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

