import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_line_items(*)')
    .order('placed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { order_id, status } = body ?? {};

  if (!order_id || !status) {
    return NextResponse.json({ error: 'order_id and status are required' }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: currentOrder, error: lookupError } = await supabase
    .from('orders')
    .select('status, status_history')
    .eq('id', order_id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!currentOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const history = Array.isArray(currentOrder.status_history) ? currentOrder.status_history : [];
  const nextHistory = [...history, { status, at: new Date().toISOString(), by: 'admin' }];

  const { data, error } = await supabase
    .from('orders')
    .update({ status, status_history: nextHistory })
    .eq('id', order_id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data?.[0] ?? null });
}
