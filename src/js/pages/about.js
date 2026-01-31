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
            Understanding the genetic fingerprints of Large Language Models
          </p>
        </header>

        <!-- Overview -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">🧬 What is LLM DNA?</h2>
          </div>
          <div class="prose">
            <p>
              <strong>LLM DNA</strong> is a novel approach to characterizing and comparing Large Language Models 
              based on their behavioral patterns. Just as biological DNA encodes the instructions for an organism, 
              LLM DNA captures the unique "personality" of a model—how it responds to diverse stimuli.
            </p>
            <p>
              This project visualizes these DNA signatures, allowing researchers and practitioners to:
            </p>
            <ul>
              <li><strong>Discover model families:</strong> See how models cluster based on shared training data or architectures</li>
              <li><strong>Find similar models:</strong> Identify which models behave most alike</li>
              <li><strong>Track model evolution:</strong> Observe how fine-tuning changes a model's DNA</li>
              <li><strong>Detect model origins:</strong> Uncover potential lineage relationships</li>
            </ul>
          </div>
        </section>

        <!-- Methodology -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">🔬 RepTrace Methodology</h2>
          </div>
          <div class="prose">
            <p>
              We extract DNA signatures using <strong>RepTrace</strong> (Response Pattern Tracing), 
              a methodology developed for characterizing LLM behavior:
            </p>

            <div class="method-steps">
              <div class="method-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h4>Probe Generation</h4>
                  <p>
                    We create a standardized set of 100 random word prompts. These prompts are 
                    carefully designed to elicit diverse responses without biasing toward specific 
                    capabilities or domains.
                  </p>
                  <code class="code-block">
                    "disdain chapel intention gymnast activation..."
                  </code>
                </div>
              </div>

              <div class="method-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h4>Response Collection</h4>
                  <p>
                    Each model generates responses to all probes. We capture the full response 
                    text, which reflects the model's learned patterns and biases.
                  </p>
                </div>
              </div>

              <div class="method-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h4>Embedding Extraction</h4>
                  <p>
                    Responses are encoded using <strong>Qwen3-Embedding-8B</strong>, a high-quality 
                    sentence embedding model. This converts variable-length text into fixed-dimension 
                    vectors.
                  </p>
                </div>
              </div>

              <div class="method-step">
                <div class="step-number">4</div>
                <div class="step-content">
                  <h4>Aggregation & Reduction</h4>
                  <p>
                    All 100 response embeddings are concatenated and reduced to a compact 
                    <strong>128-dimensional signature</strong> using random projection. This final 
                    vector is the model's DNA.
                  </p>
                </div>
              </div>

              <div class="method-step">
                <div class="step-number">5</div>
                <div class="step-content">
                  <h4>Visualization</h4>
                  <p>
                    For the Galaxy view, we apply t-SNE dimensionality reduction to project all 
                    DNA vectors into 2D space, where similar models appear close together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- DNA Structure -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">📊 DNA Vector Structure</h2>
          </div>
          <div class="prose">
            <p>Each model's DNA is a 128-dimensional floating-point vector:</p>
            
            <code class="code-block">
{
  "signature": [0.034, 0.028, -0.150, 0.164, ...],  // 128 values
  "metadata": {
    "model_name": "Qwen/Qwen2.5-7B-Instruct",
    "dna_dimension": 128,
    "probe_count": 100,
    "extraction_method": "text_embeddings_random_projection"
  }
}
            </code>

            <h4 class="mt-6">Distance Metrics</h4>
            <p>
              We measure similarity between models using <strong>Euclidean distance</strong>:
            </p>
            <div class="formula">
              d(A, B) = √(Σ(Aᵢ - Bᵢ)²)
            </div>
            <p>
              Lower distance = more similar behavior. Models with distance &lt; 0.5 typically 
              share significant architectural or training similarities.
            </p>
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
            <div class="insight-card">
              <div class="insight-icon">📏</div>
              <h4>Size Independence</h4>
              <p>
                Model size doesn't determine DNA similarity—a 7B model can be closer to 
                a 70B sibling than to another 7B from a different family.
              </p>
            </div>
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
            <ul>
              <li><strong>GitHub:</strong> <a href="https://github.com/your-org/dna-web" target="_blank">your-org/dna-web</a></li>
              <li><strong>Issues:</strong> Report bugs or request features on GitHub Issues</li>
              <li><strong>Paper:</strong> Read our research paper (coming soon)</li>
            </ul>
            
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

        <!-- Credits -->
        <section class="card mt-8">
          <div class="card-header">
            <h2 class="card-title">🙏 Acknowledgments</h2>
          </div>
          <div class="prose">
            <p>This project builds on the work of many:</p>
            <ul>
              <li><strong>D3.js</strong> for interactive visualizations</li>
              <li><strong>Sentence Transformers</strong> for text embeddings</li>
              <li><strong>HuggingFace</strong> for model hosting and access</li>
              <li>The open-source LLM community for making models accessible</li>
            </ul>
          </div>
        </section>
      </div>
    `;
    }

    destroy() {
        // No cleanup needed
    }
}
