/**
 * Community Lab Page - Model Proposal and Voting System
 * Refactored for Verify-to-Publish pipeline with Batch Voting
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Affix,
    Transition,
} from '@mantine/core';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useData, type DnaMode } from '@/contexts/DataContext';
import { VoteModal } from '@/components/VoteModal';

// Types
interface Proposal {
    id: string;
    modelId: string;
    reason: string;
    submitter: string;
    votes: number;
    status: 'pending' | 'scanning' | 'completed' | 'failed';
    createdAt: string;
    mode?: DnaMode; // raw or chat
}

// Utility functions
function maskEmail(email: string): string {
    if (!email) return 'Anonymous';
    const [name, domain] = email.split('@');
    if (!domain) return email.substring(0, 3) + '***';
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
    return configs[status] || configs.pending;
}

// Proposal Card Component
interface ProposalCardProps {
    proposal: Proposal;
    rank: number;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

function ProposalCard({ proposal, rank, isSelected, onToggleSelect }: ProposalCardProps) {
    const statusConfig = getStatusConfig(proposal.status);

    return (
        <Paper
            p="md"
            radius="md"
            withBorder
            className="lab-proposal-card"
            style={{
                borderColor: isSelected ? 'var(--mantine-color-violet-5)' : undefined,
                backgroundColor: isSelected ? 'var(--mantine-color-violet-0)' : undefined
            }}
        >
            <Group justify="space-between" wrap="wrap" className="lab-proposal-card-inner">
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
                        variant={isSelected ? 'filled' : 'light'}
                        color={isSelected ? 'violet' : 'gray'}
                        size="lg"
                        disabled={proposal.status === 'completed'}
                        onClick={() => onToggleSelect(proposal.id)}
                        aria-label={isSelected ? 'Deselect vote' : 'Select to vote'}
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

// Lab Content Component for a specific mode
interface LabContentProps {
    mode: DnaMode;
}

function LabContent({ mode }: LabContentProps) {
    const dataLoader = useData(mode);

    // Form state
    const [email, setEmail] = useState('');
    const [modelId, setModelId] = useState('');
    const [reason, setReason] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    // Proposals state
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<string>('votes');
    const [activeTab, setActiveTab] = useState<string>('open');

    // Batch voting state (persisted in sessionStorage, separated by mode)
    const storageKey = `lab-pending-votes-${mode}`;
    const [pendingVotes, setPendingVotes] = useState<Set<string>>(() => {
        try {
            const stored = sessionStorage.getItem(storageKey);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });
    const [voteModalOpen, setVoteModalOpen] = useState(false);

    // Save pending votes to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(storageKey, JSON.stringify([...pendingVotes]));
    }, [pendingVotes, storageKey]);

    // Fetch proposals from API (filtered by mode)
    const fetchProposals = useCallback(async () => {
        try {
            const response = await fetch(`/api/proposals?mode=${mode}`);
            if (response.ok) {
                const data = await response.json();
                setProposals(data);
            }
        } catch (error) {
            console.error('Failed to fetch proposals:', error);
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        setLoading(true);
        fetchProposals();
    }, [fetchProposals, mode]);

    // Create proposal name map for VoteModal
    const proposalNames = useMemo(() => {
        const map = new Map<string, string>();
        proposals.forEach(p => map.set(p.id, p.modelId));
        return map;
    }, [proposals]);

    // Filter proposals by status
    const openProposals = useMemo(() =>
        proposals.filter(p => p.status !== 'completed' && p.status !== 'failed'),
        [proposals]
    );

    const closedProposalsFromDB = useMemo(() =>
        proposals.filter(p => p.status === 'completed' || p.status === 'failed'),
        [proposals]
    );

    // Create virtual "completed" entries from dna_database.json models
    const evaluatedModels = useMemo((): Proposal[] => {
        const existingModelIds = new Set(proposals.map(p => p.modelId.toLowerCase()));
        return dataLoader.getModels()
            .filter(m => !existingModelIds.has(m.id.toLowerCase().replace('_', '/')))
            .map(m => ({
                id: `evaluated-${m.id}`,
                modelId: m.id.replace('_', '/'),
                reason: '',
                submitter: '',
                votes: 0,
                status: 'completed' as const,
                createdAt: '',
                mode: mode
            }));
    }, [dataLoader, proposals, mode]);

    // Combine closed proposals with evaluated models
    const closedProposals = useMemo(() =>
        [...closedProposalsFromDB, ...evaluatedModels],
        [closedProposalsFromDB, evaluatedModels]
    );

    // Sort proposals based on active tab
    const sortedProposals = useMemo(() => {
        const source = activeTab === 'open' ? openProposals : closedProposals;
        const sorted = [...source];
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
    }, [activeTab, openProposals, closedProposals, sortBy]);

    // Toggle vote selection
    const toggleVoteSelection = useCallback((id: string) => {
        setPendingVotes(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Handle proposal form submit
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

        if (!captchaToken) {
            setFormStatus({ type: 'error', message: 'Please complete the CAPTCHA' });
            return;
        }

        // Check if already proposed (client-side)
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

            const hfResponse = await fetch(`https://huggingface.co/api/models/${modelId}`, {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!hfResponse.ok) {
                if (hfResponse.status === 404) {
                    throw new Error(`Model not found on HuggingFace. Check the ID.`);
                } else {
                    throw new Error(`HuggingFace verification failed (${hfResponse.status})`);
                }
            }
        } catch (error) {
            setSubmitting(false);
            if (error instanceof Error && error.name === 'AbortError') {
                setFormStatus({ type: 'warning', message: 'HuggingFace check timed out. Proceeding anyway.' });
            } else {
                setFormStatus({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Verification failed'
                });
                return;
            }
        }

        // Submit to backend with mode
        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    captchaToken,
                    payload: {
                        type: 'proposal',
                        modelId: modelId.trim(),
                        reason: reason.trim(),
                        mode: mode // Include mode in proposal
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Submission failed');
            }

            setModelId('');
            setReason('');
            setCaptchaToken(null);
            turnstileRef.current?.reset();
            setFormStatus({
                type: 'success',
                message: '📧 Check your email for a verification link!'
            });

        } catch (error) {
            setFormStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Submission failed'
            });
            // Reset captcha on error
            setCaptchaToken(null);
            turnstileRef.current?.reset();
        } finally {
            setSubmitting(false);
        }
    };

    // Handle vote modal success
    const handleVoteSuccess = useCallback(() => {
        setPendingVotes(new Set());
        fetchProposals(); // Refresh list
    }, [fetchProposals]);

    const modeLabel = mode === 'chat' ? 'Chat' : 'Raw';

    return (
        <>
            <div className="lab-main-grid">
                {/* Proposal Form */}
                <Paper p="lg" radius="md" withBorder>
                    <Title order={4} mb="lg">🔬 Propose a Model ({modeLabel} DNA)</Title>

                    <form onSubmit={handleSubmit}>
                        <Stack gap="md">
                            <TextInput
                                label="Your Email"
                                placeholder="name@example.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                description="We'll send a verification link to confirm your proposal."
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

                            {/* Cloudflare Turnstile CAPTCHA */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <Turnstile
                                    ref={turnstileRef}
                                    siteKey="0x4AAAAAACWqoNnjPjbJm3_c"
                                    onSuccess={(token) => setCaptchaToken(token)}
                                    onError={() => setCaptchaToken(null)}
                                    onExpire={() => setCaptchaToken(null)}
                                />
                            </div>

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
                                {submitting ? 'Verifying...' : 'Propose Model'}
                            </Button>
                        </Stack>
                    </form>
                </Paper>

                {/* Leaderboard */}
                <Paper p="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="md" className="lab-leaderboard-header">
                        <Title order={4}>📊 Research Queue ({modeLabel})</Title>
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

                    <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'open')}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="open">
                                Open ({openProposals.length})
                            </Tabs.Tab>
                            <Tabs.Tab value="closed">
                                Closed ({closedProposals.length})
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="open">
                            {loading ? (
                                <Stack align="center" py="xl">
                                    <Loader color="violet" />
                                    <Text c="dimmed">Loading proposals...</Text>
                                </Stack>
                            ) : (
                                <Stack gap="sm" className="lab-proposals-list">
                                    {sortedProposals.length === 0 ? (
                                        <Text c="dimmed" ta="center" py="xl">
                                            No open proposals. Be the first to propose a model!
                                        </Text>
                                    ) : (
                                        sortedProposals.map((proposal, index) => (
                                            <ProposalCard
                                                key={proposal.id}
                                                proposal={proposal}
                                                rank={index + 1}
                                                isSelected={pendingVotes.has(proposal.id)}
                                                onToggleSelect={toggleVoteSelection}
                                            />
                                        ))
                                    )}
                                </Stack>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="closed">
                            {loading ? (
                                <Stack align="center" py="xl">
                                    <Loader color="violet" />
                                    <Text c="dimmed">Loading...</Text>
                                </Stack>
                            ) : (
                                <Stack gap="sm" className="lab-proposals-list">
                                    {sortedProposals.length === 0 ? (
                                        <Text c="dimmed" ta="center" py="xl">
                                            No closed proposals yet.
                                        </Text>
                                    ) : (
                                        sortedProposals.map((proposal, index) => (
                                            <ProposalCard
                                                key={proposal.id}
                                                proposal={proposal}
                                                rank={index + 1}
                                                isSelected={false}
                                                onToggleSelect={() => { }}
                                            />
                                        ))
                                    )}
                                </Stack>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                </Paper>
            </div>

            {/* Floating Action Bar for Batch Voting */}
            <Affix position={{ bottom: 20, right: 20 }}>
                <Transition transition="slide-up" mounted={pendingVotes.size > 0}>
                    {(transitionStyles) => (
                        <Paper
                            p="md"
                            radius="md"
                            withBorder
                            shadow="lg"
                            style={{
                                ...transitionStyles,
                                background: 'var(--mantine-color-violet-6)',
                                color: 'white'
                            }}
                        >
                            <Group gap="md">
                                <Text fw={600}>
                                    {pendingVotes.size} Vote{pendingVotes.size > 1 ? 's' : ''} Selected
                                </Text>
                                <Button
                                    variant="white"
                                    color="violet"
                                    onClick={() => setVoteModalOpen(true)}
                                >
                                    Verify & Submit
                                </Button>
                                <Button
                                    variant="subtle"
                                    color="white"
                                    onClick={() => setPendingVotes(new Set())}
                                >
                                    Clear
                                </Button>
                            </Group>
                        </Paper>
                    )}
                </Transition>
            </Affix>

            {/* Vote Modal */}
            <VoteModal
                opened={voteModalOpen}
                onClose={() => setVoteModalOpen(false)}
                pendingVotes={[...pendingVotes]}
                proposalNames={proposalNames}
                onSuccess={handleVoteSuccess}
            />
        </>
    );
}

// Main Lab Page (Raw DNA only)
export default function LabPage() {
    return (
        <div className="page lab-page">
            <header className="page-header">
                <h1 className="page-title">Community Lab</h1>
                <p className="page-subtitle">
                    Help us map the LLM ecosystem. Propose new models and vote on which ones to analyze next.
                </p>
            </header>

            {/* Lab Content for raw mode */}
            <LabContent mode="raw" />

            {/* How It Works */}
            <Paper p="lg" radius="md" withBorder mt="xl" className="lab-how-it-works-paper">
                <Title order={4} mb="lg">ℹ️ How It Works</Title>
                <div className="lab-how-it-works-grid">
                    <InfoCard
                        icon="1️⃣"
                        title="Propose"
                        description="Submit a HuggingFace model ID and verify via email."
                    />
                    <InfoCard
                        icon="2️⃣"
                        title="Vote"
                        description="Select models to vote for, then verify with your email."
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
