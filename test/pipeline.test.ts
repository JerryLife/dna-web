/**
 * Pipeline Integration Tests
 * Tests the Verify-to-Publish workflow end-to-end
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, getDatabase, closeDatabase } from '../server/database.js';

// Create a test express app with the same routes
async function createTestApp() {
    const app = express();
    app.use(express.json());

    // Import routers
    const { default: submissionRouter } = await import('../server/services/submission.js');
    const { default: verificationRouter } = await import('../server/services/verification.js');

    app.use('/api', submissionRouter);
    app.use('/api', verificationRouter);

    // Proposals endpoint
    app.get('/api/proposals', async (req, res) => {
        const db = await getDatabase();
        const proposals = await db.all('SELECT * FROM proposals');
        res.json(proposals);
    });

    return app;
}

describe('Verify-to-Publish Pipeline', () => {
    let app: express.Application;

    beforeAll(async () => {
        // Initialize test database
        await initDatabase();
        app = await createTestApp();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    describe('Proposal Submission', () => {
        it('should reject submission without email', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({ payload: { type: 'proposal', modelId: 'test/model' } });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('email');
        });

        it('should reject submission without payload', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({ email: 'test@example.com' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('payload');
        });

        it('should create pending proposal and return token', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({
                    email: 'test@example.com',
                    payload: { type: 'proposal', modelId: 'test/new-model', reason: 'Testing' }
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('Verification email sent');
            expect(res.body._debug_token).toBeDefined();
        });
    });

    describe('Verification', () => {
        let testToken: string;

        beforeAll(async () => {
            // Create a pending submission
            const res = await request(app)
                .post('/api/submit')
                .send({
                    email: 'verify-test@example.com',
                    payload: { type: 'proposal', modelId: 'test/verify-model' }
                });
            testToken = res.body._debug_token;
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .get('/api/verify?token=invalid-token');

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('Invalid');
        });

        it('should verify valid token and create proposal', async () => {
            const res = await request(app)
                .get(`/api/verify?token=${testToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Check proposal was created
            const proposalsRes = await request(app).get('/api/proposals');
            const proposal = proposalsRes.body.find((p: any) => p.model_id === 'test/verify-model');
            expect(proposal).toBeDefined();
        });

        it('should reject already-used token', async () => {
            const res = await request(app)
                .get(`/api/verify?token=${testToken}`);

            expect(res.status).toBe(404); // Token was cleared after use
        });
    });

    describe('Security: SQL Injection', () => {
        it('should safely handle SQL injection in email', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({
                    email: "'; DROP TABLE proposals; --",
                    payload: { type: 'proposal', modelId: 'test/safe' }
                });

            // Should reject as invalid email, not crash
            expect(res.status).toBe(400);
        });

        it('should safely handle SQL injection in model ID', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({
                    email: 'safe@example.com',
                    payload: { type: 'proposal', modelId: "'; DROP TABLE proposals; --" }
                });

            // Should either accept (parameterized query is safe) or validate format
            expect([201, 400]).toContain(res.status);
        });

        it('should safely handle SQL injection in token', async () => {
            const res = await request(app)
                .get("/api/verify?token=' OR '1'='1");

            expect(res.status).toBe(404); // Not found, no SQL error
        });
    });

    describe('Batch Voting', () => {
        let proposalId: string;

        beforeAll(async () => {
            // First verify a proposal to get its ID
            const submitRes = await request(app)
                .post('/api/submit')
                .send({
                    email: 'batch-setup@example.com',
                    payload: { type: 'proposal', modelId: 'test/batch-target' }
                });

            await request(app).get(`/api/verify?token=${submitRes.body._debug_token}`);

            // Get the proposal ID
            const proposalsRes = await request(app).get('/api/proposals');
            const proposal = proposalsRes.body.find((p: any) => p.model_id === 'test/batch-target');
            proposalId = proposal.id;
        });

        it('should reject batch vote with non-existent proposal', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({
                    email: 'voter@example.com',
                    payload: { type: 'batch_vote', proposalIds: ['non-existent-id'] }
                });

            expect(res.status).toBe(404);
        });

        it('should create pending batch vote', async () => {
            const res = await request(app)
                .post('/api/submit')
                .send({
                    email: 'voter@example.com',
                    payload: { type: 'batch_vote', proposalIds: [proposalId] }
                });

            expect(res.status).toBe(201);
        });
    });
});
