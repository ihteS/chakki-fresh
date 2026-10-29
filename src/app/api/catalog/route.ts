import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from('catalog_items')
    .select('*, inventory(available, threshold)')
    .eq('is_active', true)
    .order('type')
    .order('sort_order');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((item: any) => {
    const inventory = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
    const available = Number(inventory?.available ?? 0);

    return {
      ...item,
      available,
      inStock: available > 0,
    };
  });

  return NextResponse.json({ items });
}
