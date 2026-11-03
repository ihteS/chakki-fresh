/**
 * Integration test script for the new OTP system.
 *
 * Run: npx tsx scripts/test-otp.ts
 *
 * Tests mock providers (no real WhatsApp/Firebase/Resend credentials).
 * All phone OTPs fall back to dev mode.
 */

const BASE = 'http://localhost:3000';

async function api(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log('\n🧪 OTP System Integration Tests\n');

  // ── 1. Phone OTP (dev mode) ─────────────────────────────────────────────
  console.log('── Phone OTP ──');

  let devOtp = '';

  await test('Send phone OTP returns devOtp when no providers configured', async () => {
    const { status, data } = await api('/api/auth/send-otp', { phone: '9999900001' });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.sent === true, 'Expected sent: true');
    assert(typeof data.devOtp === 'string' && data.devOtp.length === 6, 'Expected 6-digit devOtp');
    devOtp = data.devOtp;
  });

  await test('Verify with correct OTP succeeds', async () => {
    const { status, data } = await api('/api/auth/verify-otp', { phone: '9999900001', otp: devOtp });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.ok === true, 'Expected ok: true');
    assert(data.user && data.user.phone === '9999900001', 'Expected user with matching phone');
  });

  await test('Verify with wrong OTP fails', async () => {
    // Send a fresh OTP first
    const sendRes = await api('/api/auth/send-otp', { phone: '9999900002' });
    assert(sendRes.data.devOtp, 'Expected devOtp');

    const { status, data } = await api('/api/auth/verify-otp', { phone: '9999900002', otp: '000000' });
    assert(status === 401, `Expected 401, got ${status}`);
    assert(data.error === 'Invalid OTP', `Expected 'Invalid OTP', got '${data.error}'`);
  });

  await test('Verify with no OTP record returns 401', async () => {
    const { status, data } = await api('/api/auth/verify-otp', { phone: '0000000000', otp: '123456' });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ── 2. Validation ──────────────────────────────────────────────────────
  console.log('\n── Validation ──');

  await test('Send with empty body returns 400', async () => {
    const { status } = await api('/api/auth/send-otp', {});
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Send with invalid phone returns 400', async () => {
    const { status } = await api('/api/auth/send-otp', { phone: '123' });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Verify with missing OTP returns 400', async () => {
    const { status } = await api('/api/auth/verify-otp', { phone: '9999900001' });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // ── 3. Email OTP (dev mode) ─────────────────────────────────────────────
  console.log('\n── Email OTP ──');

  let emailOtp = '';

  await test('Send email OTP returns devOtp when Resend not configured', async () => {
    const { status, data } = await api('/api/auth/send-otp', { email: 'test@example.com' });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.sent === true, 'Expected sent: true');
    assert(typeof data.devOtp === 'string', 'Expected devOtp in dev mode');
    emailOtp = data.devOtp;
  });

  await test('Verify email OTP succeeds', async () => {
    const { status, data } = await api('/api/auth/verify-otp', { email: 'test@example.com', otp: emailOtp });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.ok === true, 'Expected ok: true');
    assert(data.user && data.user.email === 'test@example.com', 'Expected user with matching email');
  });

  await test('Send with invalid email returns 400', async () => {
    const { status } = await api('/api/auth/send-otp', { email: 'notanemail' });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // ── 4. Max attempts ────────────────────────────────────────────────────
  console.log('\n── Max Attempts ──');

  await test('After 5 wrong attempts, OTP is invalidated', async () => {
    const send = await api('/api/auth/send-otp', { phone: '9999900005' });
    assert(send.data.devOtp, 'Expected devOtp');

    for (let i = 0; i < 5; i++) {
      await api('/api/auth/verify-otp', { phone: '9999900005', otp: '000000' });
    }

    // 6th attempt should say max exceeded (or no OTP found, since it's deleted)
    const { status, data } = await api('/api/auth/verify-otp', { phone: '9999900005', otp: send.data.devOtp });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ── 5. Webhook ─────────────────────────────────────────────────────────
  console.log('\n── WhatsApp Webhook ──');

  await test('GET webhook without valid token returns 403', async () => {
    const res = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test`);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('POST webhook acknowledges with 200', async () => {
    const res = await fetch(`${BASE}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry: [] }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ── 6. Existing flows ─────────────────────────────────────────────────
  console.log('\n── Existing Flows ──');

  await test('Health endpoint still works', async () => {
    const res = await fetch(`${BASE}/api/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Catalog endpoint still works', async () => {
    const res = await fetch(`${BASE}/api/catalog`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  console.log('\n✅ All tests complete.\n');
}

run().catch(console.error);

