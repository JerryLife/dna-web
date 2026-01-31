/**
 * LLM DNA Explorer - About Page
 * Methodology documentation
 */

export default class AboutPage {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = this.getTemplate();
  }

  getTemplate() {
    return `
      <div class="page about-page">
        <header class="page-header">
          <h1 class="page-title">About LLM DNA</h1>
          <p class="page-subtitle">
            Tracing Model Evolution via Functional Representations
          </p>
        </header>

        <!-- Definition & Theory Grid -->
        <div class="stats-grid mt-4">
          <section class="card">
            <div class="card-header">
              <h2 class="card-title text-accent">🧬 Definition</h2>
            </div>
            <div class="prose">
              <p>
                We define the DNA of language models as a <strong>bi-Lipschitz embedding</strong> 
                in the function space of models.
              </p>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <h2 class="card-title text-accent">√x Theory</h2>
            </div>
            <div class="prose">
              <p>
                We prove the <strong>existence</strong> of such embedding for any LLM with a 
                finite context window.
              </p>
            </div>
          </section>
        </div>

        <!-- Extraction Method -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">⚙️ Extraction Method: Random-projection based DNA extraction</h2>
          </div>
          <div class="prose">
            <div class="method-flow">
              <div class="flow-step">
                <div class="flow-icon">⌨️</div>
                <div class="flow-label">Random input text</div>
              </div>
              <div class="flow-arrow">→</div>
              
              <div class="flow-step">
                <div class="flow-icon">📦</div>
                <div class="flow-label">Static sentence embedding model</div>
              </div>
              <div class="flow-arrow">→</div>

              <div class="flow-step">
                <div class="flow-icon">🔗</div>
                <div class="flow-label">Concatenation</div>
              </div>
              <div class="flow-arrow">→</div>

              <div class="flow-step">
                <div class="flow-icon">🔀</div>
                <div class="flow-label">Random projection</div>
              </div>
              <div class="flow-arrow">→</div>

              <div class="flow-step step-final">
                <div class="flow-icon">🧬</div>
                <div class="flow-label">DNA</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Insights -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">💡 Key Insights</h2>
          </div>
          <div class="insights-grid">
            <div class="insight-card">
              <div class="insight-icon">👪</div>
              <h4>Family Clustering</h4>
              <p>
                Models from the same family (e.g., Llama, Qwen) naturally cluster together, 
                indicating shared foundational training.
              </p>
            </div>
            <div class="insight-card">
              <div class="insight-icon">🎯</div>
              <h4>Fine-tuning Drift</h4>
              <p>
                Instruct-tuned models drift away from their base versions, with distance 
                proportional to fine-tuning intensity.
              </p>
            </div>
            <div class="insight-card">
              <div class="insight-icon">🔗</div>
              <h4>Hidden Lineages</h4>
              <p>
                Some models cluster unexpectedly, revealing undisclosed training data 
                sharing or architecture borrowing.
              </p>
            </div>
          </div>
        </section>

        <!-- Citation -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">📝 Citation</h2>
          </div>
          <div class="prose">
            <p>If you find this work useful, please cite our paper:</p>
            <pre class="code-block" style="white-space: pre-wrap;">
@inproceedings{wu2026llmdna,
  title        = {{LLM} {DNA}: Tracing Model Evolution via Functional Representations},
  author       = {Wu, Zhaomin and Zhao, Haodong and Wang, Ziyang and Guo, Jizhou and Wang, Qian and He, Bingsheng},
  booktitle    = {The Fourteenth International Conference on Learning Representations, {ICLR} 2026},
  publisher    = {OpenReview.net},
  year         = {2026}
}</pre>
          </div>
        </section>

        <!-- Contact -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">📬 Contact & Feedback</h2>
          </div>
          <div class="prose">
            <p>
              We'd love to hear from you! Whether you have questions, suggestions, or want 
              to report an issue:
            </p>
            <a href="https://github.com/JerryLife/dna-web/issues/new" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
              Open GitHub Issues (New Issue) <span aria-hidden="true">↗</span>
            </a>
            <div class="cta-box mt-6">
              <h4>Want a model added?</h4>
              <p>
                Visit the <a href="/lab">Community Lab</a> to propose new models and 
                vote on which ones we should analyze next!
              </p>
              <a href="/lab" class="btn btn-primary mt-4">
                Go to Community Lab →
              </a>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  destroy() {
    // No cleanup needed
  }
}
