/**
 * Vote Modal Component - Email verification for voting
 */
import { useState } from 'react';
import {
    Modal,
    TextInput,
    Button,
    Text,
    Stack,
    Alert,
    Loader,
    Badge,
    Group,
} from '@mantine/core';

interface VoteModalProps {
    opened: boolean;
    onClose: () => void;
    pendingVotes: string[];
    proposalNames: Map<string, string>;
    onSuccess: () => void;
}

export function VoteModal({
    opened,
    onClose,
    pendingVotes,
    proposalNames,
    onSuccess
}: VoteModalProps) {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        if (!email.trim()) {
            setStatus({ type: 'error', message: 'Please enter your email' });
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    payload: {
                        type: 'batch_vote',
                        proposalIds: pendingVotes
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Submission failed');
            }

            setStatus({
                type: 'success',
                message: 'Check your email for a verification link!'
            });

            // Clear and close after delay
            setTimeout(() => {
                setEmail('');
                setStatus(null);
                onSuccess();
                onClose();
            }, 2000);

        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Submission failed'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={`Verify ${pendingVotes.length} Vote${pendingVotes.length > 1 ? 's' : ''}`}
            centered
        >
            <form onSubmit={handleSubmit}>
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Enter your email to verify your vote{pendingVotes.length > 1 ? 's' : ''}.
                        We'll send you a magic link.
                    </Text>

                    <Group gap="xs" wrap="wrap">
                        {pendingVotes.map(id => (
                            <Badge key={id} variant="light" color="violet">
                                {proposalNames.get(id) || id}
                            </Badge>
                        ))}
                    </Group>

                    <TextInput
                        label="Email Address"
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={submitting}
                    />

                    {/* CAPTCHA Placeholder */}
                    <div
                        className="captcha-placeholder"
                        style={{
                            border: '1px dashed var(--mantine-color-dimmed)',
                            borderRadius: 8,
                            padding: 16,
                            textAlign: 'center',
                            color: 'var(--mantine-color-dimmed)'
                        }}
                    >
                        CAPTCHA Placeholder
                        <Text size="xs">(Admin: Integrate Cloudflare Turnstile here)</Text>
                    </div>

                    {status && (
                        <Alert
                            color={status.type === 'success' ? 'green' : 'red'}
                            variant="light"
                        >
                            {status.message}
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        disabled={submitting || pendingVotes.length === 0}
                        leftSection={submitting ? <Loader size="xs" /> : '📧'}
                    >
                        {submitting ? 'Sending...' : 'Send Verification Email'}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}
