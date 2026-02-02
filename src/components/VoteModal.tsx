/**
 * Vote Modal Component - Email verification for voting with Cloudflare Turnstile
 */
import { useState, useRef } from 'react';
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
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

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
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        if (!email.trim()) {
            setStatus({ type: 'error', message: 'Please enter your email' });
            return;
        }

        if (!captchaToken) {
            setStatus({ type: 'error', message: 'Please complete the CAPTCHA' });
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    captchaToken,
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
                setCaptchaToken(null);
                setStatus(null);
                turnstileRef.current?.reset();
                onSuccess();
                onClose();
            }, 2000);

        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Submission failed'
            });
            // Reset captcha on error
            turnstileRef.current?.reset();
            setCaptchaToken(null);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        // Reset state when modal closes
        setCaptchaToken(null);
        turnstileRef.current?.reset();
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
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
                        disabled={submitting || pendingVotes.length === 0 || !captchaToken}
                        leftSection={submitting ? <Loader size="xs" /> : '📧'}
                    >
                        {submitting ? 'Sending...' : 'Send Verification Email'}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}
