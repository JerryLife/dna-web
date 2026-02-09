/**
 * Verification Service - Handles email verification clicks
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database.js';
import config from '../../config.json' with { type: 'json' };

const router = Router();

interface ProposalPayload {
    type: 'proposal';
    modelId: string;
    reason?: string;
    mode?: 'raw' | 'chat';
}

interface BatchVotePayload {
    type: 'batch_vote';
    proposalIds: string[];
}

type SubmissionPayload = ProposalPayload | BatchVotePayload;

/**
 * GET /api/verify
 * Verifies a submission using the token from email link
 */
router.get('/verify', async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' });
        }

        const db = await getDatabase();

        // Find the pending submission
        const submission = await db.get(
            `SELECT * FROM submission_queue WHERE verification_token = ?`,
            [token]
        );

        if (!submission) {
            return res.status(404).json({ error: 'Invalid or expired link' });
        }

        // Check if already verified
        if (submission.is_verified === 1) {
            return res.status(400).json({ error: 'This link has already been used' });
        }

        // Check expiration
        const createdAt = new Date(submission.created_at);
        const expirationHours = config.server?.pendingExpirationHours || 24;
        const expirationMs = expirationHours * 60 * 60 * 1000;

        if (Date.now() - createdAt.getTime() > expirationMs) {
            // Delete expired record
            await db.run('DELETE FROM submission_queue WHERE id = ?', [submission.id]);
            return res.status(410).json({ error: 'Link has expired' });
        }

        // Mark as verified and clear token
        await db.run(
            `UPDATE submission_queue 
             SET is_verified = 1, verification_token = NULL 
             WHERE id = ?`,
            [submission.id]
        );

        // Parse and process payload
        const payload: SubmissionPayload = JSON.parse(submission.payload);
        const results: string[] = [];

        if (payload.type === 'proposal') {
            // Create new proposal
            const proposalId = uuidv4();
            const mode = payload.mode || 'raw';
            await db.run(
                `INSERT INTO proposals (id, model_id, submitter_email, reason, votes, mode)
                 VALUES (?, ?, ?, ?, 1, ?)`,
                [proposalId, payload.modelId, submission.email, payload.reason || '', mode]
            );

            // Also record the submitter's vote
            await db.run(
                `INSERT OR IGNORE INTO votes (proposal_id, user_email)
                 VALUES (?, ?)`,
                [proposalId, submission.email]
            );

            results.push(`Proposal for "${payload.modelId}" created`);

        } else if (payload.type === 'batch_vote') {
            // Process each vote
            for (const proposalId of payload.proposalIds) {
                // Check if proposal still exists
                const proposal = await db.get(
                    'SELECT id FROM proposals WHERE id = ?',
                    [proposalId]
                );

                if (!proposal) {
                    // Skip invalid proposals (may have been deleted)
                    continue;
                }

                // Check for duplicate vote
                const existingVote = await db.get(
                    'SELECT * FROM votes WHERE proposal_id = ? AND user_email = ?',
                    [proposalId, submission.email]
                );

                if (!existingVote) {
                    // Record vote
                    await db.run(
                        `INSERT INTO votes (proposal_id, user_email)
                         VALUES (?, ?)`,
                        [proposalId, submission.email]
                    );

                    // Increment vote count
                    await db.run(
                        `UPDATE proposals SET votes = votes + 1 WHERE id = ?`,
                        [proposalId]
                    );

                    results.push(`Vote recorded for proposal ${proposalId}`);
                } else {
                    results.push(`Already voted for proposal ${proposalId}`);
                }
            }
        }

        res.json({
            success: true,
            message: 'Verification successful!',
            results
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
