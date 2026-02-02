/**
 * Submission Service - Handles new proposals and votes
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database.js';
import { sendVerificationEmail, EmailType } from './email.js';

const router = Router();

// Types
interface ProposalPayload {
    type: 'proposal';
    modelId: string;
    reason?: string;
}

interface BatchVotePayload {
    type: 'batch_vote';
    proposalIds: string[];
}

type SubmissionPayload = ProposalPayload | BatchVotePayload;

interface SubmissionRequest {
    email: string;
    payload: SubmissionPayload;
}

/**
 * POST /api/submit
 * Creates a pending submission and sends verification email
 */
router.post('/submit', async (req: Request, res: Response) => {
    try {
        const { email, payload } = req.body as SubmissionRequest;

        // Validate email
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Validate payload
        if (!payload || !payload.type) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const db = await getDatabase();

        // Type-specific validation
        if (payload.type === 'proposal') {
            if (!payload.modelId) {
                return res.status(400).json({ error: 'Model ID is required' });
            }

            // Check if model already proposed
            const existing = await db.get(
                'SELECT id FROM proposals WHERE model_id = ?',
                [payload.modelId]
            );
            if (existing) {
                return res.status(409).json({ error: 'This model has already been proposed' });
            }
        } else if (payload.type === 'batch_vote') {
            if (!Array.isArray(payload.proposalIds) || payload.proposalIds.length === 0) {
                return res.status(400).json({ error: 'At least one proposal ID is required' });
            }

            // Validate all proposal IDs exist
            for (const proposalId of payload.proposalIds) {
                const proposal = await db.get(
                    'SELECT id FROM proposals WHERE id = ?',
                    [proposalId]
                );
                if (!proposal) {
                    return res.status(404).json({ error: `Proposal ${proposalId} not found` });
                }
            }
        } else {
            return res.status(400).json({ error: 'Unknown payload type' });
        }

        // Generate verification token
        const token = uuidv4();

        // Insert into submission queue
        await db.run(
            `INSERT INTO submission_queue (email, payload, verification_token) 
             VALUES (?, ?, ?)`,
            [email, JSON.stringify(payload), token]
        );

        // Determine email type
        const emailType: EmailType = payload.type === 'proposal' ? 'proposal' : 'batch_vote';

        // Send verification email
        await sendVerificationEmail(email, token, emailType);

        res.status(201).json({
            message: 'Verification email sent. Please check your inbox.',
            // Include token in response for testing (remove in production)
            ...(process.env.NODE_ENV !== 'production' && { _debug_token: token })
        });

    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export default router;
