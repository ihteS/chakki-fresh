import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('inventory')
    .select('*, catalog_items(name, type, unit, price_per_unit)')
    .order('catalog_item_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { catalog_item_id, available, threshold } = body ?? {};

  if (!catalog_item_id) {
    return NextResponse.json({ error: 'catalog_item_id is required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (available !== undefined) update.available = Number(available);
  if (threshold !== undefined) update.threshold = Number(threshold);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('inventory')
    .update(update)
    .eq('catalog_item_id', catalog_item_id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data?.[0] ?? null });
}
