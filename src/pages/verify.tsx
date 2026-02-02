/**
 * Verification Page - Handles email verification link clicks
 */
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Paper, Title, Text, Loader, Stack, Alert, Button } from '@mantine/core';

export default function VerifyPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [results, setResults] = useState<string[]>([]);

    // Prevent React StrictMode double-mount from calling API twice
    const hasVerified = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided');
            return;
        }

        // Skip if already verified (React StrictMode protection)
        if (hasVerified.current) {
            return;
        }
        hasVerified.current = true;

        async function verify() {
            try {
                const response = await fetch(`/api/verify?token=${token}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Verification failed');
                }

                setStatus('success');
                setMessage(data.message || 'Verified successfully!');
                setResults(data.results || []);

            } catch (error) {
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Verification failed');
            }
        }

        verify();
    }, [token]);

    return (
        <div className="page verify-page" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh'
        }}>
            <Paper p="xl" radius="md" withBorder style={{ maxWidth: 500, width: '100%' }}>
                <Stack align="center" gap="md">
                    {status === 'loading' && (
                        <>
                            <Loader size="lg" color="violet" />
                            <Title order={3}>Verifying...</Title>
                            <Text c="dimmed">Please wait while we verify your request.</Text>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <Text size="4rem">✅</Text>
                            <Title order={2}>Verified!</Title>
                            <Alert color="green" variant="light" w="100%">
                                {message}
                            </Alert>
                            {results.length > 0 && (
                                <Stack gap="xs" w="100%">
                                    {results.map((result, i) => (
                                        <Text key={i} size="sm" c="dimmed">• {result}</Text>
                                    ))}
                                </Stack>
                            )}
                            <Button
                                onClick={() => navigate('/lab')}
                                variant="light"
                                color="violet"
                            >
                                Back to Lab
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <Text size="4rem">❌</Text>
                            <Title order={2}>Verification Failed</Title>
                            <Alert color="red" variant="light" w="100%">
                                {message}
                            </Alert>
                            <Button
                                onClick={() => navigate('/lab')}
                                variant="light"
                            >
                                Back to Lab
                            </Button>
                        </>
                    )}
                </Stack>
            </Paper>
        </div>
    );
}
