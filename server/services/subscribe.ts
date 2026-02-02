/**
 * Subscription Service - Handles newsletter subscriptions
 * Emails are stored privately in the database (not publicly exposed)
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../database.js';

const router = Router();

interface SubscribeRequest {
    email: string;
    captchaToken?: string;
}

// Turnstile secret key for verification
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
    if (!TURNSTILE_SECRET_KEY) {
        console.warn('⚠️ TURNSTILE_SECRET_KEY not set, skipping CAPTCHA verification');
        return true;
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret: TURNSTILE_SECRET_KEY,
                response: token
            })
        });

        const data = await response.json() as { success: boolean };
        return data.success;
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return false;
    }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * POST /api/subscribe
 * Adds an email to the newsletter subscription list
 */
router.post('/subscribe', async (req: Request, res: Response) => {
    try {
        const { email, captchaToken } = req.body as SubscribeRequest;

        // Validate CAPTCHA if provided
        if (captchaToken) {
            const isCaptchaValid = await verifyTurnstileToken(captchaToken);
            if (!isCaptchaValid) {
                return res.status(400).json({ error: 'CAPTCHA verification failed' });
            }
        }

        // Validate email
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const db = await getDatabase();

        // Check if already subscribed
        const existing = await db.get(
            'SELECT id, is_active FROM subscriptions WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existing) {
            if (existing.is_active) {
                return res.status(200).json({
                    message: 'You are already subscribed!',
                    alreadySubscribed: true
                });
            } else {
                // Reactivate subscription
                await db.run(
                    'UPDATE subscriptions SET is_active = 1, subscribed_at = datetime("now") WHERE id = ?',
                    [existing.id]
                );
                return res.status(200).json({
                    message: 'Welcome back! Your subscription has been reactivated.',
                    reactivated: true
                });
            }
        }

        // Insert new subscription
        await db.run(
            'INSERT INTO subscriptions (email) VALUES (?)',
            [email.toLowerCase()]
        );

        console.log(`📬 New subscription: ${email}`);

        res.status(201).json({
            message: 'Successfully subscribed! Thank you for joining.',
            success: true
        });

    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/subscribe
 * Unsubscribes an email (soft delete - marks as inactive)
 */
router.delete('/subscribe', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const db = await getDatabase();

        const result = await db.run(
            'UPDATE subscriptions SET is_active = 0 WHERE email = ?',
            [email.toLowerCase()]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Email not found in subscription list' });
        }

        res.json({ message: 'Successfully unsubscribed' });

    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
