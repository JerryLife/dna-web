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

import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// Load environment variables
config({ path: 'server/.env' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

export type EmailType = 'proposal' | 'vote' | 'batch_vote';

interface ProposalDetails {
    modelId: string;
    reason?: string;
}

interface BatchVoteDetails {
    proposalIds: string[];
    proposalNames?: Map<string, string>;
}

export type SubmissionDetails = ProposalDetails | BatchVoteDetails;

/**
 * Send a verification email to the user
 * 
 * @param to - Recipient email address
 * @param token - Verification token
 * @param type - Type of submission being verified
 * @param details - Details of the submission (model info or vote info)
 */
export async function sendVerificationEmail(
    to: string,
    token: string,
    type: EmailType,
    details?: SubmissionDetails
): Promise<void> {
    const verifyUrl = `${BASE_URL}/verify?token=${token}`;

    // Build formal email content
    const email = buildFormalEmail(to, type, verifyUrl, details);

    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('⚠️  Email credentials not found in environment variables. Logging instead execution.');
        console.log(`[SIMULATION] To: ${to}, Subject: ${email.subject}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"LLM DNA Explorer" <${EMAIL_USER}>`, // sender address
            to: to, // list of receivers
            subject: email.subject, // Subject line
            text: email.body, // plain text body
            // html: "<b>Hello world?</b>", // html body
        });

        console.log(`✅ Verification email sent to ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
}

interface FormattedEmail {
    subject: string;
    body: string;
}

function buildFormalEmail(
    to: string,
    type: EmailType,
    verifyUrl: string,
    details?: SubmissionDetails
): FormattedEmail {
    const recipientName = to.split('@')[0];
    const timestamp = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    if (type === 'proposal') {
        const proposalDetails = details as ProposalDetails | undefined;
        const modelId = proposalDetails?.modelId || 'Unknown Model';
        const reason = proposalDetails?.reason || 'No reason provided';

        return {
            subject: `[LLM DNA] Confirm Your Model Proposal - ${modelId}`,
            body: `
Dear ${recipientName},

Thank you for your contribution to the LLM DNA project!

You have submitted a proposal to add a new model to our community-driven LLM fingerprint database.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PROPOSAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Model ID:    ${modelId}
  Reason:      ${reason}
  Submitted:   ${timestamp}
  Email:       ${to}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To confirm your proposal and add it to the voting queue, please click the link below:

🔗 VERIFY YOUR PROPOSAL:
${verifyUrl}

⚠️  This link will expire in 24 hours.

If you did not submit this proposal, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The LLM DNA Team

🌐 Website: https://dna.xtra.science
📧 Contact: xtra.computing.lab@gmail.com

---
This is an automated message from the LLM DNA Explorer.
Please do not reply directly to this email.
`.trim()
        };
    } else {
        // batch_vote or vote
        const voteDetails = details as BatchVoteDetails | undefined;
        const proposalIds = voteDetails?.proposalIds || [];
        const voteCount = proposalIds.length;

        const voteList = proposalIds.length > 0
            ? proposalIds.map((id, i) => `  ${i + 1}. ${id}`).join('\n')
            : '  (No proposals specified)';

        return {
            subject: `[LLM DNA] Confirm Your ${voteCount} Vote${voteCount !== 1 ? 's' : ''} for Model Proposals`,
            body: `
Dear ${recipientName},

Thank you for participating in the LLM DNA community!

You have requested to vote on ${voteCount} model proposal${voteCount !== 1 ? 's' : ''}. Your votes help prioritize which models should be analyzed and added to the LLM DNA Galaxy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗳️ YOUR VOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${voteList}

  Total Votes: ${voteCount}
  Submitted:   ${timestamp}
  Email:       ${to}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To confirm your vote${voteCount !== 1 ? 's' : ''} and make them count, please click the link below:

🔗 VERIFY YOUR VOTES:
${verifyUrl}

⚠️  This link will expire in 24 hours.

If you did not request these votes, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The LLM DNA Team

🌐 Website: https://dna.xtra.science
📧 Contact: xtra.computing.lab@gmail.com

---
This is an automated message from the LLM DNA Explorer.
Please do not reply directly to this email.
`.trim()
        };
    }
}
