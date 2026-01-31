/**
 * Community Lab Page - Model Proposal and Voting System
 * Migrated from lab.js to React with Mantine form components
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    TextInput,
    Textarea,
    Button,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Badge,
    Select,
    Alert,
    ActionIcon,
    Loader,
} from '@mantine/core';
import { useData } from '@/contexts/DataContext';

// Types
interface Proposal {
    id: string;
    modelId: string;
    reason: string;
    submitter: string;
    votes: number;
    voted: boolean;
    status: 'pending' | 'scanning' | 'completed' | 'failed';
    createdAt: string;
}

// Default proposals for demo
const DEFAULT_PROPOSALS: Proposal[] = [
    {
        id: '1',
        modelId: 'google/gemma-2-27b-it',
        votes: 42,
        voted: false,
        status: 'pending',
        createdAt: '2026-01-29T10:00:00Z',
        reason: 'Largest Gemma 2 model, would be great to see family clustering',
        submitter: 'demo@example.com',
    },
    {
        id: '2',
        modelId: 'Nexusflow/Athene-V2-Chat',
        votes: 38,
        voted: false,
        status: 'scanning',
        createdAt: '2026-01-28T15:30:00Z',
        reason: 'Top model on various benchmarks',
        submitter: 'researcher@univ.edu',
    },
    {
        id: '3',
        modelId: 'deepseek-ai/DeepSeek-V3',
        votes: 65,
        voted: false,
        status: 'pending',
        createdAt: '2026-01-27T08:45:00Z',
        reason: 'Breakthrough MoE architecture',
        submitter: 'community@ai.org',
    },
    {
        id: '4',
        modelId: 'Qwen/Qwen2.5-72B-Instruct',
        votes: 29,
        voted: false,
        status: 'completed',
        createdAt: '2026-01-25T12:00:00Z',
        reason: '',
        submitter: 'qwen-fan@mail.com',
    },
    {
        id: '5',
        modelId: 'microsoft/phi-4',
        votes: 51,
        voted: false,
        status: 'pending',
        createdAt: '2026-01-26T09:15:00Z',
        reason: 'New Phi series, interesting for small model comparison',
        submitter: 'msft-watcher@tech.com',
    },
];

// Utility functions
function maskEmail(email: string): string {
    if (!email) return 'Anonymous';
    const [name, domain] = email.split('@');
    return `${name.substring(0, 3)}***@${domain}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function getStatusConfig(status: Proposal['status']): { color: string; icon: string; label: string } {
    const configs = {
        pending: { color: 'yellow', icon: '⏳', label: 'Pending' },
        scanning: { color: 'blue', icon: '🔄', label: 'Scanning' },
        completed: { color: 'green', icon: '✓', label: 'Completed' },
        failed: { color: 'red', icon: '✕', label: 'Failed' },
    };
    return configs[status];
}

// Proposal Card Component
interface ProposalCardProps {
    proposal: Proposal;
    rank: number;
    onVote: (id: string) => void;
}

function ProposalCard({ proposal, rank, onVote }: ProposalCardProps) {
    const statusConfig = getStatusConfig(proposal.status);

    return (
        <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" wrap="nowrap">
                <Text size="xl" fw={700} c="dimmed" style={{ minWidth: 30 }}>
                    {rank}
                </Text>

                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="sm">
                        <Text
                            component="a"
                            href={`https://huggingface.co/${proposal.modelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            fw={600}
                            c="violet"
                            style={{ textDecoration: 'none' }}
                        >
                            {proposal.modelId}
                        </Text>
                        <Badge color={statusConfig.color} size="sm" variant="light">
                            {statusConfig.icon} {statusConfig.label}
                        </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                        {formatDate(proposal.createdAt)} • by {maskEmail(proposal.submitter)}
                    </Text>
                </Stack>

                <Stack align="center" gap={4}>
                    <ActionIcon
                        variant={proposal.voted ? 'filled' : 'light'}
                        color={proposal.voted ? 'violet' : 'gray'}
                        size="lg"
                        disabled={proposal.status === 'completed'}
                        onClick={() => onVote(proposal.id)}
                    >
                        ▲
                    </ActionIcon>
                    <Text fw={700} size="lg">{proposal.votes}</Text>
                </Stack>
            </Group>
        </Paper>
    );
}

// Info Card Component
function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <Paper p="md" radius="md" withBorder ta="center">
            <Text size="2rem" mb="xs">{icon}</Text>
            <Title order={5} mb="xs">{title}</Title>
            <Text size="sm" c="dimmed">{description}</Text>
        </Paper>
    );
}

// Main Lab Page
export default function LabPage() {
    const dataLoader = useData();

    // Form state
    const [email, setEmail] = useState('');
    const [modelId, setModelId] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

    // Proposals state
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [sortBy, setSortBy] = useState<string>('votes');

    // Load proposals from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('dna-proposals');
            if (stored) {
                setProposals(JSON.parse(stored));
            } else {
                setProposals(DEFAULT_PROPOSALS);
            }
        } catch {
            setProposals(DEFAULT_PROPOSALS);
        }
    }, []);

    // Save proposals to localStorage
    const saveProposals = useCallback((updated: Proposal[]) => {
        setProposals(updated);
        localStorage.setItem('dna-proposals', JSON.stringify(updated));
    }, []);

    // Sort proposals
    const sortedProposals = useMemo(() => {
        const sorted = [...proposals];
        switch (sortBy) {
            case 'votes':
                sorted.sort((a, b) => b.votes - a.votes);
                break;
            case 'recent':
                sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'name':
                sorted.sort((a, b) => a.modelId.localeCompare(b.modelId));
                break;
        }
        return sorted;
    }, [proposals, sortBy]);

    // Handle vote
    const handleVote = useCallback((id: string) => {
        const updated = proposals.map(p => {
            if (p.id !== id || p.status === 'completed') return p;
            return {
                ...p,
                votes: p.voted ? p.votes - 1 : p.votes + 1,
                voted: !p.voted,
            };
        });
        saveProposals(updated);
    }, [proposals, saveProposals]);

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus(null);

        if (!email.trim()) {
            setFormStatus({ type: 'error', message: 'Please enter your email' });
            return;
        }

        if (!modelId.trim()) {
            setFormStatus({ type: 'error', message: 'Please enter a model ID' });
            return;
        }

        // Check if already proposed
        if (proposals.some(p => p.modelId.toLowerCase() === modelId.toLowerCase())) {
            setFormStatus({ type: 'warning', message: 'This model has already been proposed' });
            return;
        }

        // Check if in galaxy
        const existingModel = dataLoader.getModels().find(m =>
            m.name.toLowerCase() === modelId.toLowerCase() ||
            m.id.toLowerCase().replace('_', '/') === modelId.toLowerCase()
        );
        if (existingModel) {
            setFormStatus({ type: 'info', message: 'This model is already in the Galaxy! 🎉' });
            return;
        }

        // Validate via HuggingFace API
        setSubmitting(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`https://huggingface.co/api/models/${modelId}`, {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Model not found. Check the ID.`);
                } else {
                    throw new Error(`Verification failed (${response.status})`);
                }
            }
        } catch (error) {
            setSubmitting(false);
            setFormStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Verification failed'
            });
            return;
        }

        setSubmitting(false);

        // Add proposal
        const newProposal: Proposal = {
            id: Date.now().toString(),
            modelId: modelId.trim(),
            reason: reason.trim(),
            submitter: email.trim(),
            votes: 1,
            voted: true,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        saveProposals([newProposal, ...proposals]);
        setModelId('');
        setReason('');
        setFormStatus({ type: 'success', message: 'Model verified and added to the queue! 🧬' });
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1 className="page-title">Community Lab</h1>
                <p className="page-subtitle">
                    Help us map the LLM ecosystem. Propose new models and vote on which ones to analyze next.
                </p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
                marginTop: '2rem',
            }}>
                {/* Proposal Form */}
                <Paper p="lg" radius="md" withBorder>
                    <Title order={4} mb="lg">🔬 Propose a Model</Title>

                    <form onSubmit={handleSubmit}>
                        <Stack gap="md">
                            <TextInput
                                label="Your Email (Submitter ID)"
                                placeholder="name@example.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                description="Used as your ID. We may contact you if there are issues."
                                required
                            />

                            <TextInput
                                label="HuggingFace Model ID"
                                placeholder="e.g., mistralai/Mistral-7B-v0.3"
                                value={modelId}
                                onChange={(e) => setModelId(e.target.value)}
                                description="Enter the full model ID from HuggingFace Hub"
                                required
                            />

                            <Textarea
                                label="Why this model? (optional)"
                                placeholder="What makes this model interesting to analyze?"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                            />

                            {formStatus && (
                                <Alert
                                    color={
                                        formStatus.type === 'success' ? 'green' :
                                            formStatus.type === 'error' ? 'red' :
                                                formStatus.type === 'warning' ? 'yellow' : 'blue'
                                    }
                                    variant="light"
                                >
                                    {formStatus.message}
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                leftSection={submitting ? <Loader size="xs" /> : '🧬'}
                                disabled={submitting}
                                fullWidth
                            >
                                {submitting ? 'Verifying...' : 'Add to Trace Queue'}
                            </Button>
                        </Stack>
                    </form>
                </Paper>

                {/* Leaderboard */}
                <Paper p="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="lg">
                        <Title order={4}>📊 Research Queue</Title>
                        <Select
                            value={sortBy}
                            onChange={(v) => setSortBy(v ?? 'votes')}
                            data={[
                                { value: 'votes', label: 'Most Votes' },
                                { value: 'recent', label: 'Most Recent' },
                                { value: 'name', label: 'Alphabetical' },
                            ]}
                            size="xs"
                            w={140}
                        />
                    </Group>

                    <Stack gap="sm" style={{ maxHeight: 500, overflowY: 'auto' }}>
                        {sortedProposals.map((proposal, index) => (
                            <ProposalCard
                                key={proposal.id}
                                proposal={proposal}
                                rank={index + 1}
                                onVote={handleVote}
                            />
                        ))}
                    </Stack>
                </Paper>
            </div>

            {/* How It Works */}
            <Paper p="lg" radius="md" withBorder mt="xl">
                <Title order={4} mb="lg">ℹ️ How It Works</Title>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                }}>
                    <InfoCard
                        icon="1️⃣"
                        title="Propose"
                        description="Submit a HuggingFace model ID that you'd like us to analyze."
                    />
                    <InfoCard
                        icon="2️⃣"
                        title="Vote"
                        description="Upvote models you want to see in the DNA Galaxy."
                    />
                    <InfoCard
                        icon="3️⃣"
                        title="Track"
                        description="Watch as we process top-voted models with RepTrace."
                    />
                    <InfoCard
                        icon="4️⃣"
                        title="Explore"
                        description="Once complete, find the model in the Galaxy!"
                    />
                </div>
            </Paper>
        </div>
    );
}
