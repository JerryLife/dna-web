/**
 * Email Service - Placeholder for xtra.science SMTP integration
 * 
 * ADMIN NOTE: Replace the sendVerificationEmail function body with actual
 * SMTP logic when deploying to production. Example using nodemailer:
 * 
 * import nodemailer from 'nodemailer';
 * const transporter = nodemailer.createTransport({
 *     host: 'mail.xtra.science',
 *     port: 587,
 *     auth: { user: '...', pass: '...' }
 * });
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export type EmailType = 'proposal' | 'vote' | 'batch_vote';

/**
 * Send a verification email to the user
 * 
 * @param to - Recipient email address
 * @param token - Verification token
 * @param type - Type of submission being verified
 */
export async function sendVerificationEmail(
    to: string,
    token: string,
    type: EmailType
): Promise<void> {
    const verifyUrl = `${BASE_URL}/verify?token=${token}`;

    const subjects: Record<EmailType, string> = {
        proposal: 'Confirm your model proposal',
        vote: 'Confirm your vote',
        batch_vote: 'Confirm your votes'
    };

    const subject = subjects[type];

    // ============================================================
    // PLACEHOLDER: Log to console instead of sending email
    // The xtra.science admin should replace this with actual SMTP
    // ============================================================
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📧 [EMAIL SIMULATION]');
    console.log('═'.repeat(60));
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`─`.repeat(60));
    console.log(`Click to verify: ${verifyUrl}`);
    console.log('═'.repeat(60));
    console.log('\n');
}
