/**
 * Express Server - Main entry point for the Lab API
 */
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDatabase, getDatabase } from './database.js';
import submissionRouter from './services/submission.js';
import verificationRouter from './services/verification.js';
import subscribeRouter from './services/subscribe.js';
import { startCleanupJob } from './cron/cleanup.js';
import config from '../config.json' with { type: 'json' };

const app = express();
const PORT = config.server?.port || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later' }
});
app.use('/api', limiter);

// Routes
app.use('/api', submissionRouter);
app.use('/api', verificationRouter);
app.use('/api', subscribeRouter);

// GET /api/proposals - Fetch all active proposals
app.get('/api/proposals', async (req, res) => {
    try {
        const db = await getDatabase();
        const proposals = await db.all(
            `SELECT id, model_id as modelId, submitter_email as submitter, 
                    reason, votes, status, created_at as createdAt
             FROM proposals 
             ORDER BY votes DESC, created_at DESC`
        );
        res.json(proposals);
    } catch (error) {
        console.error('Error fetching proposals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
    try {
        // Initialize database
        await initDatabase();

        // Start cleanup job
        startCleanupJob();

        app.listen(PORT, () => {
            console.log(`\n🚀 Lab API Server running on http://localhost:${PORT}`);
            console.log(`   - POST /api/submit     (Create pending submission)`);
            console.log(`   - GET  /api/verify     (Verify email token)`);
            console.log(`   - GET  /api/proposals  (List all proposals)`);
            console.log(`   - POST /api/subscribe  (Newsletter subscription)\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
