/**
 * Firebase Authentication – server-side phone verification via
 * the Identity Toolkit REST API.
 *
 * Flow:
 *   1.  sendFirebaseSmsOtp(phone) → Firebase sends its own OTP SMS
 *       and returns a `sessionInfo` token we persist alongside our record.
 *   2.  verifyFirebaseSmsOtp(sessionInfo, code) → validates the code
 *       the user received via SMS against Firebase.
 *
 * Requirements:
 *   • FIREBASE_WEB_API_KEY  – project Web API key (Firebase Console → Project Settings)
 *   • Phone auth must be enabled in Firebase Console → Authentication → Sign-in method
 *   • For production: configure reCAPTCHA Enterprise or App Check
 *   • For development: add test phone numbers in Firebase Console
 *
 * Docs: https://firebase.google.com/docs/reference/rest/auth
 */

const IDP_BASE = 'https://identitytoolkit.googleapis.com/v1';

// ── Trigger Firebase SMS OTP ────────────────────────────────────────────────
export async function sendFirebaseSmsOtp(
  phone: string,
): Promise<{ success: boolean; sessionInfo?: string; error?: string }> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Firebase Web API key not configured' };
  }

  try {
    const res = await fetch(`${IDP_BASE}/accounts:sendVerificationCode?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: `+91${phone}` }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Firebase API HTTP ${res.status}`,
      };
    }

    return { success: true, sessionInfo: data.sessionInfo };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Verify a code that was delivered via Firebase SMS ────────────────────────
export async function verifyFirebaseSmsOtp(
  sessionInfo: string,
  code: string,
): Promise<{ verified: boolean; error?: string }> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    return { verified: false, error: 'Firebase Web API key not configured' };
  }

  try {
    const res = await fetch(`${IDP_BASE}/accounts:signInWithPhoneNumber?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo, code }),
    });

    if (res.ok) return { verified: true };

    const data = await res.json();
    return { verified: false, error: data.error?.message || `HTTP ${res.status}` };
  } catch (err: unknown) {
    return { verified: false, error: (err as Error).message };
  }
}

