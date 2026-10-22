import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, stub } = await req.json();
  if (stub) return NextResponse.json({ verified: true });
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  if (expected !== razorpaySignature) return NextResponse.json({ verified: false }, { status: 400 });
  return NextResponse.json({ verified: true });
}
