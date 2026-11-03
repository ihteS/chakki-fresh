/**
 * WhatsApp Cloud API client for sending OTP template messages
 * and general text messages (admin notifications).
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ── Send OTP via approved WhatsApp template ─────────────────────────────────
export async function sendWhatsAppOtp(
  phone: string,
  otp: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp_verification';

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${phone}`,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `WhatsApp API HTTP ${res.status}`,
      };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Send plain text message (e.g. admin order notification) ─────────────────
export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }

  try {
    const cleanTo = to.replace(/\D/g, '');
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

