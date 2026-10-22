import { CartItem } from '@/hooks/useStore';

export function calcSub(item: CartItem): number {
  if (item.type === 'FLOUR')
    return item.components.reduce((s, c) => s + ((c.percentage ?? 0) / 100) * item.quantityKg * c.pricePerUnit, 0);
  return item.components.reduce((s, c) => s + ((c.quantityGrams ?? 0) / 1000) * c.pricePerUnit, 0);
}

export function calcGrind(item: CartItem): number {
  if (item.type === 'FLOUR')
    return item.components.reduce((s, c) => s + ((c.percentage ?? 0) / 100) * item.quantityKg * c.grindingChargePerUnit, 0);
  return item.components.reduce((s, c) => s + ((c.quantityGrams ?? 0) / 1000) * c.grindingChargePerUnit, 0);
}

export function blendPrice(
  components: Array<{ percentage?: number; quantityGrams?: number; pricePerUnit: number; grindingChargePerUnit: number }>,
  type: 'FLOUR' | 'SPICE'
): string {
  if (type === 'FLOUR') {
    const r = components.reduce((s, c) => s + ((c.percentage ?? 0) / 100) * (c.pricePerUnit + c.grindingChargePerUnit), 0);
    return `₹${Math.round(r)}/kg`;
  }
  const r = components.reduce((s, c) => s + ((c.quantityGrams ?? 0) / 1000) * (c.pricePerUnit + c.grindingChargePerUnit), 0);
  return `₹${Math.round(r)}/batch`;
}

export function blendDesc(
  components: Array<{ name: string; percentage?: number; quantityGrams?: number }>,
  type: 'FLOUR' | 'SPICE'
): string {
  if (type === 'FLOUR') return components.map(c => `${c.percentage}% ${c.name}`).join(', ');
  return components.map(c => `${c.name} ${c.quantityGrams}g`).join(', ');
}

export const GRAIN_COLORS = ['#C8953A', '#52B788', '#E07A5F', '#6B7C6E', '#9E6F3A'];
