/**
 * Cleanup Cron Job - Removes expired pending submissions
 */
import cron from 'node-cron';
import { getDatabase } from '../database.js';
import config from '../../config.json' with { type: 'json' };

/**
 * Start the cleanup cron job
 */
export function startCleanupJob(): void {
    const schedule = config.server?.cleanupCron || '0 0 * * *'; // Default: midnight daily
    const expirationHours = config.server?.pendingExpirationHours || 24;

    console.log(`🧹 Cleanup job scheduled: "${schedule}" (deleting pending > ${expirationHours}h)`);

    cron.schedule(schedule, async () => {
        try {
            const db = await getDatabase();

            const result = await db.run(
                `DELETE FROM submission_queue 
                 WHERE is_verified = 0 
                 AND created_at < datetime('now', '-${expirationHours} hours')`
            );

            console.log(`🧹 Cleanup complete: ${result.changes || 0} expired records deleted`);

        } catch (error) {
            console.error('Cleanup job error:', error);
        }
    });
}

/**
 * Run cleanup immediately (for testing)
 */
export async function runCleanupNow(): Promise<number> {
    const db = await getDatabase();
    const expirationHours = config.server?.pendingExpirationHours || 24;

    const result = await db.run(
        `DELETE FROM submission_queue 
         WHERE is_verified = 0 
         AND created_at < datetime('now', '-${expirationHours} hours')`
    );

    return result.changes || 0;
}
