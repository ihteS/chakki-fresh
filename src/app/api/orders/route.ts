import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { user_id, user_name, user_phone, address_id, items, delivery_date, payment_method = 'cod' } = body ?? {};

  if (!user_id || !address_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Missing required order information' }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const itemIds = [...new Set(items.map((item: any) => item.catalog_item_id).filter(Boolean))];

  if (itemIds.length === 0) {
    return NextResponse.json({ error: 'At least one valid item is required' }, { status: 400 });
  }

  const { data: catalogItems, error: catalogError } = await supabase
    .from('catalog_items')
    .select('id, name, type, price_per_unit, grinding_charge_per_unit')
    .in('id', itemIds);

  if (catalogError) {
    return NextResponse.json({ error: catalogError.message }, { status: 500 });
  }

  const catalogById = new Map((catalogItems ?? []).map((item: any) => [item.id, item]));
  const inventoryLookup = await supabase
    .from('inventory')
    .select('catalog_item_id, available')
    .in('catalog_item_id', itemIds);

  const inventoryById = new Map((inventoryLookup.data ?? []).map((item: any) => [item.catalog_item_id, item.available ?? 0]));

  let subtotal = 0;
  let grindingCharge = 0;
  const orderLineItems: any[] = [];

  for (const item of items) {
    const catalogItem = catalogById.get(item.catalog_item_id);
    if (!catalogItem) {
      return NextResponse.json({ error: `Item not found: ${item.catalog_item_id}` }, { status: 400 });
    }

    const quantityKg = toNumber(item.quantity_kg, 0);
    const available = inventoryById.get(item.catalog_item_id) ?? 0;

    if (quantityKg <= 0) {
      return NextResponse.json({ error: `Invalid quantity for ${catalogItem.name}` }, { status: 400 });
    }

    if (available < quantityKg) {
      return NextResponse.json({ error: `Not enough stock for ${catalogItem.name}` }, { status: 400 });
    }

    const lineSubtotal = quantityKg * toNumber(catalogItem.price_per_unit, 0);
    const lineGrinding = quantityKg * toNumber(catalogItem.grinding_charge_per_unit, 0);

    subtotal += lineSubtotal;
    grindingCharge += lineGrinding;

    orderLineItems.push({
      name: catalogItem.name,
      type: catalogItem.type,
      quantity_kg: quantityKg,
      subtotal: lineSubtotal,
      grinding_charge: lineGrinding,
      components: item.components ?? [],
    });
  }

  const deliveryCharge = 0;
  const total = subtotal + grindingCharge + deliveryCharge;
  const orderId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const orderNumber = `CF-${Date.now().toString().slice(-6)}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      order_number: orderNumber,
      user_id: user_id,
      user_name: user_name || 'Customer',
      user_phone: user_phone || '',
      address_id,
      status: 'AWAITING_APPROVAL',
      delivery_date: delivery_date ?? new Date().toISOString(),
      subtotal,
      grinding_charge: grindingCharge,
      delivery_charge: deliveryCharge,
      total,
      payment_method,
      payment_id: null,
      status_history: [{ status: 'AWAITING_APPROVAL', at: new Date().toISOString(), by: 'customer' }],
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  for (const item of orderLineItems) {
    const { error: itemError } = await supabase.from('order_line_items').insert({
      order_id: orderId,
      name: item.name,
      type: item.type,
      quantity_kg: item.quantity_kg,
      subtotal: item.subtotal,
      grinding_charge: item.grinding_charge,
      components: item.components,
    });

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }
  }

  for (const item of items) {
    const catalogItemId = item.catalog_item_id;
    const quantityKg = toNumber(item.quantity_kg, 0);
    if (!catalogItemId || quantityKg <= 0) continue;

    const current = inventoryById.get(catalogItemId) ?? 0;
    await supabase
      .from('inventory')
      .update({ available: Math.max(current - quantityKg, 0) })
      .eq('catalog_item_id', catalogItemId);
  }

  return NextResponse.json({ ok: true, order: { ...order, line_items: orderLineItems } }, { status: 201 });
}

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
