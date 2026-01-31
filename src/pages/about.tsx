import { Card } from '@/components/Card';
import { Flow, type FlowStep } from '@/components/Flow';

const extractionFlowSteps: FlowStep[] = [
    { icon: '⌨️', label: 'Random input text' },
    { icon: '📦', label: 'Static sentence embedding model' },
    { icon: '🔗', label: 'Concatenation' },
    { icon: '🔀', label: 'Random projection' },
    { icon: '🧬', label: 'DNA', isFinal: true },
];

export default function AboutPage() {
    return (
        <div className="page about-page">
            <header className="page-header">
                <h1 className="page-title">About LLM DNA</h1>
                <p className="page-subtitle">
                    Tracing Model Evolution via Functional Representations
                </p>
            </header>

            <div className="stats-grid mt-4">
                <Card title="🧬 Definition" titleClassName="text-accent">
                    <p>
                        We define the DNA of language models as a{' '}
                        <strong>bi-Lipschitz embedding</strong> in the function space of
                        models.
                    </p>
                </Card>

                <Card title="√x Theory" titleClassName="text-accent">
                    <p>
                        We prove the <strong>existence</strong> of such embedding for any
                        LLM with a finite context window.
                    </p>
                </Card>
            </div>

            <Card
                title="⚙️ Extraction Method: Random-projection based DNA extraction"
                className="mt-8"
            >
                <Flow steps={extractionFlowSteps} />
            </Card>

            <Card title="💡 Key Insights" className="mt-8">
                <div className="insights-grid">
                    <div className="insight-card">
                        <div className="insight-icon">👪</div>
                        <h4>Family Clustering</h4>
                        <p>
                            Models from the same family (e.g., Llama, Qwen) naturally cluster
                            together, indicating shared foundational training.
                        </p>
                    </div>
                    <div className="insight-card">
                        <div className="insight-icon">🎯</div>
                        <h4>Fine-tuning Drift</h4>
                        <p>
                            Instruct-tuned models drift away from their base versions, with
                            distance proportional to fine-tuning intensity.
                        </p>
                    </div>
                    <div className="insight-card">
                        <div className="insight-icon">🔗</div>
                        <h4>Hidden Lineages</h4>
                        <p>
                            Some models cluster unexpectedly, revealing undisclosed training
                            data sharing or architecture borrowing.
                        </p>
                    </div>
                </div>
            </Card>

            <Card title="📝 Citation" className="mt-8">
                <p>If you find this work useful, please cite our paper:</p>
                <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
                    {`@inproceedings{wu2026llmdna,
  title        = {{LLM} {DNA}: Tracing Model Evolution via Functional Representations},
  author       = {Wu, Zhaomin and Zhao, Haodong and Wang, Ziyang and Guo, Jizhou and Wang, Qian and He, Bingsheng},
  booktitle    = {The Fourteenth International Conference on Learning Representations, {ICLR} 2026},
  publisher    = {OpenReview.net},
  year         = {2026}
}`}
                </pre>
            </Card>

            <Card title="📬 Contact & Feedback" className="mt-8">
                <p>
                    We&apos;d love to hear from you! Whether you have questions,
                    suggestions, or want to report an issue:
                </p>
                <ul>
                    <li>
                        <strong>GitHub:</strong>{' '}
                        <a
                            href="https://github.com/your-org/dna-web"
                            target="_blank"
                            rel="noreferrer"
                        >
                            your-org/dna-web
                        </a>
                    </li>
                    <li>
                        <strong>Issues:</strong> Report bugs or request features on GitHub
                        Issues
                    </li>
                </ul>
                <div className="cta-box mt-6">
                    <h4>Want a model added?</h4>
                    <p>
                        Visit the <a href="/lab">Community Lab</a> to propose new models and
                        vote on which ones we should analyze next!
                    </p>
                    <a href="/lab" className="btn btn-primary mt-4">
                        Go to Community Lab →
                    </a>
                </div>
            </Card>
        </div>
    );
}
