/**
 * Send email OTPs via Resend.
 *
 * Requirements:
 *   • RESEND_API_KEY       – API key from https://resend.com/api-keys
 *   • RESEND_FROM_EMAIL    – verified sender (default: onboarding@resend.dev for testing)
 *
 * Docs: https://resend.com/docs/send-with-nodejs
 */

import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmailOtp(
  email: string,
  otp: string,
): Promise<{ success: boolean; error?: string }> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!resend) {
    return { success: false, error: 'Resend not configured (RESEND_API_KEY missing)' };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Chakki Fresh <${from}>`,
      to: email,
      subject: 'Your Chakki Fresh verification code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #2d2a26; margin: 0 0 8px;">Chakki Fresh</h2>
          <p style="color: #555; font-size: 15px; margin: 0 0 24px;">Use the code below to verify your email address.</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; padding: 20px; background: #f5f0eb; border-radius: 10px; text-align: center; color: #2d2a26;">
            ${otp}
          </div>
          <p style="color: #999; font-size: 13px; margin: 20px 0 0;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

