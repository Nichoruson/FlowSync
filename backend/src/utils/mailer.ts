import nodemailer from 'nodemailer';
import logger from './logger';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"FlowSync" <noreply@flowsync.app>';

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  logger.info('Nodemailer SMTP transporter initialized');
} else {
  logger.info('Nodemailer SMTP config missing. Emails will be logged to the console.');
}

export const sendInvitationEmail = async (
  email: string,
  boardTitle: string,
  inviteUrl: string,
  inviterName: string
): Promise<boolean> => {
  const mailOptions = {
    from: SMTP_FROM,
    to: email,
    subject: `Join ${inviterName} on the project board: "${boardTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">Collaborate on FlowSync</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #374151;">
          Hello! <strong>${inviterName}</strong> has invited you to join and collaborate on the board:
        </p>
        <div style="padding: 15px; margin: 15px 0; background-color: #f3f4f6; border-left: 4px solid #4f46e5; font-size: 18px; font-weight: bold; color: #1f2937;">
          ${boardTitle}
        </div>
        <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 25px;">
          FlowSync is a premium real-time collaborative tool designed to sync your workflows and tasks. Click the button below to join the board:
        </p>
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${inviteUrl}" target="_blank" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">
            Join Board / Create Account
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
          If the button above does not work, copy and paste this URL into your web browser:<br>
          <a href="${inviteUrl}" style="color: #4f46e5; word-break: break-all;">${inviteUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">
          This email was generated automatically by FlowSync. If you did not expect this invitation, please ignore this email.
        </p>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Invitation email successfully sent to ${email} via SMTP`);
      return true;
    } catch (error) {
      logger.error(`Failed to send invitation email to ${email} via SMTP`, error);
      // Fall back to console logging
    }
  }

  // Visual Console Log Fallback for easy testing
  const border = '='.repeat(80);
  console.log(`
${border}
✉️  FLOWSYNC EMAIL INVITATION SIMULATION
To: ${email}
Inviter: ${inviterName}
Board: "${boardTitle}"
Acceptance Link: ${inviteUrl}
${border}
  `);

  return true;
};
