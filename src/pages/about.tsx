import { useState, useRef } from 'react';
import { Card } from '@/components/Card';
import { Flow, type FlowStep } from '@/components/Flow';
import { CopyButton, ActionIcon, Tooltip, Button, Group, Text, Stack } from '@mantine/core';
// import { TextInput, Alert, Loader } from '@mantine/core';
// import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const extractionFlowSteps: FlowStep[] = [
    { icon: '⌨️', label: 'Random input text' },
    { icon: '📦', label: 'Sentence embedding model' },
    { icon: '🔗', label: 'Concatenation' },
    { icon: '🔀', label: 'Random projection' },
    { icon: '🧬', label: 'DNA', isFinal: true },
];

const BIBTEX = `@inproceedings{wu2026llmdna,
  title={LLM DNA: Tracing Model Evolution via Functional Representations},
  author={Wu, Zhaomin and Zhao, Haodong and Wang, Ziyang and Guo, Jizhou and Wang, Qian and He, Bingsheng},
  booktitle={The Fourteenth International Conference on Learning Representations},
  year={2026},
  url={https://openreview.net/forum?id=UIxHaAqFqQ},
  publisher={OpenReview}
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
        authors: "Zhaomin Wu, Haodong Zhao, Ziyang Wang, Jizhou Guo, Qian Wang, Bingsheng He",
        venue: "ICLR 2026",
        affiliations: (
            <>
                National University of Singapore, Shanghai Jiao Tong University
            </>
        ),
        link: "https://openreview.net/forum?id=UIxHaAqFqQ"
    }
];

export default function AboutPage() {
    // Subscription form state
    const [subscribeEmail, setSubscribeEmail] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        if (!subscribeEmail.trim()) {
            setStatus({ type: 'error', message: 'Please enter your email' });
            return;
        }

        if (!captchaToken) {
            setStatus({ type: 'error', message: 'Please complete the CAPTCHA' });
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: subscribeEmail.trim(),
                    captchaToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Subscription failed');
            }

            setStatus({
                type: data.alreadySubscribed ? 'info' : 'success',
                message: data.message
            });
            setSubscribeEmail('');
            setCaptchaToken(null);
            turnstileRef.current?.reset();

        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Subscription failed'
            });
            setCaptchaToken(null);
            turnstileRef.current?.reset();
        } finally {
            setSubmitting(false);
        }
    };

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
                            <Group key={index} justify="space-between" align="flex-start" wrap="wrap" className="about-paper-row">
                                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                    <Stack gap={4}>
                                        <Text size="lg" fw={600} ta="left" lh={1.3}>
                                            {paper.title}
                                        </Text>
                                        {paper.venue && (
                                            <span className="badge badge-info" style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                                                {paper.venue}
                                            </span>
                                        )}
                                    </Stack>
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
                                    className="about-read-paper-btn"
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
                        <h4 className="insight-heading"><span className="insight-icon">👪</span> Family Clustering</h4>
                        <p>
                            Models from the same family (e.g., Llama, Qwen) naturally cluster
                            together, indicating shared foundational training.
                        </p>
                    </div>
                    <div className="insight-card">
                        <h4 className="insight-heading"><span className="insight-icon">🎯</span> Fine-tuning Drift</h4>
                        <p>
                            Instruct-tuned models drift away from their base versions, with
                            distance proportional to fine-tuning intensity.
                        </p>
                    </div>
                    <div className="insight-card">
                        <h4 className="insight-heading"><span className="insight-icon">🔗</span> Hidden Lineages</h4>
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
                            href="https://github.com/Xtra-Computing/LLM-DNA.git"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Xtra-Computing/LLM-DNA
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

            {/* Subscribe Section - TEMPORARILY DISABLED
            <Card title="💌 Subscribe" className="mt-8">
                <p className="mb-4">
                    Get the latest updates on new model DNAs and analysis features.
                </p>
                <form onSubmit={handleSubscribe}>
                    <Stack gap="md">
                        <TextInput
                            label="Email Address"
                            placeholder="name@example.com"
                            type="email"
                            value={subscribeEmail}
                            onChange={(e) => setSubscribeEmail(e.target.value)}
                            required
                            disabled={submitting}
                        />

                        {/* Cloudflare Turnstile CAPTCHA 
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Turnstile
                                ref={turnstileRef}
                                siteKey="0x4AAAAAACWqoNnjPjbJm3_c"
                                onSuccess={(token) => setCaptchaToken(token)}
                                onError={() => setCaptchaToken(null)}
                                onExpire={() => setCaptchaToken(null)}
                            />
                        </div>

                        {status && (
                            <Alert
                                color={status.type === 'success' ? 'green' : status.type === 'info' ? 'blue' : 'red'}
                                variant="light"
                            >
                                {status.message}
                            </Alert>
                        )}

                        <Button 
                            type="submit" 
                            color="violet"
                            disabled={submitting || !captchaToken}
                            leftSection={submitting ? <Loader size="xs" /> : '📧'}
                        >
                            {submitting ? 'Subscribing...' : 'Subscribe'}
                        </Button>
                    </Stack>
                </form>
            </Card>
            */}
        </div>
    );
}
