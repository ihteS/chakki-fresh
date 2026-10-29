import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { amount, orderId, customerName, customerPhone, customerEmail } = await req.json();
  const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ stub: true, amount, currency: 'INR', keyId: 'stub', razorpayOrderId: 'stub_'+Date.now() });
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: orderId, notes: { customerName, customerPhone, customerEmail } }),
  });
  if (!res.ok) return NextResponse.json({ error: 'Razorpay error' }, { status: 500 });
  const data = await res.json();
  return NextResponse.json({ razorpayOrderId: data.id, amount: data.amount, currency: data.currency, keyId });
}
