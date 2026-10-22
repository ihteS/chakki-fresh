import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { orderNumber, userName, userPhone, total, items, deliveryDate } = await req.json();
  const msg = `🌾 *New Chakki Fresh Order*\n\nOrder: #${orderNumber}\nCustomer: ${userName}${userPhone ? ` (${userPhone})` : ''}\nItems: ${items}\nTotal: ₹${total}\nDelivery: ${deliveryDate}\n\nApprove in admin panel.`;
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const waFrom = process.env.TWILIO_WHATSAPP_FROM, adminNum = process.env.ADMIN_WHATSAPP_NUMBER;
  if (sid && tok && waFrom && adminNum) {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `whatsapp:${adminNum}`, From: waFrom, Body: msg }).toString(),
    });
  } else { console.log('[DEV NOTIFY]', msg); }
  return NextResponse.json({ ok: true });
}
