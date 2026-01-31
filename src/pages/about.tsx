import { Card } from '@/components/Card';
import { Flow, type FlowStep } from '@/components/Flow';
import { CopyButton, ActionIcon, Tooltip, Button, Group, Text, Stack } from '@mantine/core';

const extractionFlowSteps: FlowStep[] = [
    { icon: '⌨️', label: 'Random input text' },
    { icon: '📦', label: 'Static sentence embedding model' },
    { icon: '🔗', label: 'Concatenation' },
    { icon: '🔀', label: 'Random projection' },
    { icon: '🧬', label: 'DNA', isFinal: true },
];

const BIBTEX = `@article{wu2025llmdna,
  title={LLM DNA: Tracing Model Evolution via Functional Representations},
  author={Wu, Zhaomin and Zhao, Haodong and Wang, Ziyang and Guo, Jizhou and Wang, Qian and He, Bingsheng},
  journal={arXiv preprint arXiv:2509.24496},
  year={2025}
}`;

interface Paper {
    title: string;
    authors: string;
    affiliations: React.ReactNode;
    link: string;
    venue?: string;
}

const PAPERS: Paper[] = [
    {
        title: "LLM DNA: Tracing Model Evolution via Functional Representations",
        authors: "Zhaomin Wu¹, Haodong Zhao², Ziyang Wang¹, Jizhou Guo³, Qian Wang¹, Bingsheng He¹",
        venue: "ICLR 2026",
        affiliations: (
            <>
                ¹ Department of Computer Science, National University of Singapore
                <br />
                ² School of Computer Science, Shanghai Jiao Tong University
                <br />
                ³ Zhiyuan College, Shanghai Jiao Tong University
            </>
        ),
        link: "https://arxiv.org/pdf/2509.24496"
    }
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

            <div className="mt-8">
                <Card title="📄 Related Papers" titleClassName="text-accent">
                    <Stack gap="xl">
                        {PAPERS.map((paper, index) => (
                            <Group key={index} justify="space-between" align="flex-start" wrap="nowrap">
                                <Stack gap={4} style={{ flex: 1 }}>
                                    <Group gap="xs" align="center">
                                        <Text size="lg" fw={600} ta="left" lh={1.3}>
                                            {paper.title}
                                        </Text>
                                        {paper.venue && (
                                            <span className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>
                                                {paper.venue}
                                            </span>
                                        )}
                                    </Group>
                                    <Text ta="left" size="sm" fw={500}>
                                        {paper.authors}
                                    </Text>
                                    <Text ta="left" c="dimmed" size="xs">
                                        {paper.affiliations}
                                    </Text>
                                </Stack>
                                <Button
                                    component="a"
                                    href={paper.link}
                                    target="_blank"
                                    variant="light"
                                    color="violet"
                                    size="xs"
                                    leftSection="📄"
                                    style={{ flexShrink: 0 }}
                                >
                                    Read Paper
                                </Button>
                            </Group>
                        ))}
                    </Stack>
                </Card>
            </div>

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
                <Group justify="space-between" align="center" mb="xs">
                    <p style={{ margin: 0 }}>If you find this work useful, please cite our paper:</p>
                    <CopyButton value={BIBTEX} timeout={2000}>
                        {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy BibTeX'} withArrow position="left">
                                <ActionIcon
                                    color={copied ? 'teal' : 'gray'}
                                    variant="light"
                                    size="lg"
                                    onClick={copy}
                                >
                                    {copied ? '✓' : '📋'}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </CopyButton>
                </Group>
                <pre className="code-block" style={{ whiteSpace: 'pre-wrap', position: 'relative' }}>
                    {BIBTEX}
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

            {/* Subscribe Section */}
            <Card title="💌 Subscribe" className="mt-8">
                <p className="mb-4">
                    Get the latest updates on new model DNAs and analysis features.
                </p>
                <form
                    action="https://formspree.io/f/mqazoqrz"
                    method="POST"
                    target="_blank"
                >
                    <Group align="flex-end">
                        <Stack gap={4} style={{ flex: 1 }}>
                            <Text size="sm" fw={500}>Email Address</Text>
                            <input
                                type="email"
                                name="email"
                                className="mantine-Input-input mantine-TextInput-input"
                                placeholder="name@example.com"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--mantine-color-gray-4)',
                                    fontSize: '14px'
                                }}
                                required
                            />
                        </Stack>
                        <Button type="submit" color="violet">
                            Subscribe
                        </Button>
                    </Group>
                </form>
            </Card>
        </div >
    );
}
