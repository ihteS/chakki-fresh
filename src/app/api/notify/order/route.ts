import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const { orderNumber, userName, userPhone, total, items, deliveryDate } = await req.json();
  const msg = `🌾 *New Chakki Fresh Order*\n\nOrder: #${orderNumber}\nCustomer: ${userName}${userPhone ? ` (${userPhone})` : ''}\nItems: ${items}\nTotal: ₹${total}\nDelivery: ${deliveryDate}\n\nApprove in admin panel.`;

  const adminNum = process.env.ADMIN_WHATSAPP_NUMBER;

  if (adminNum) {
    const result = await sendWhatsAppText(adminNum, msg);
    if (!result.success) {
      console.error('[ORDER NOTIFY] WhatsApp delivery failed:', result.error);
    }
  } else {
    console.log('[DEV NOTIFY]', msg);
  }

  return NextResponse.json({ ok: true });
}
