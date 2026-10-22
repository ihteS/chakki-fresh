'use client';
import { useEffect, useState } from 'react';
import { supabase, Blend } from '@/lib/supabase';
import { ScreenProps } from './types';
import { CartItem } from '@/hooks/useStore';
import { blendDesc, blendPrice } from '@/lib/pricing';
import { Topbar } from '../ui/Topbar';

export default function BlendsScreen({ go, goBack, user, addToCart, toast }: ScreenProps) {
  const [blends, setBlends] = useState<Blend[]>([]);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from('blends').select('*, blend_components(*, catalog_items(*))').eq('user_id', user!.id).order('created_at', { ascending: false });
    setBlends((data as any) || []);
  }

  async function del(id: string) {
    if (!confirm('Delete this blend?')) return;
    await supabase.from('blends').delete().eq('id', id);
    setBlends(b => b.filter(x => x.id !== id)); toast('Blend deleted');
  }

  function reorder(blend: Blend) {
    const comps = (blend.blend_components || []).map((c: any) => ({ catalogItemId: c.catalog_item_id, name: c.catalog_items?.name || '', percentage: c.percentage, quantityGrams: c.quantity_grams, pricePerUnit: c.catalog_items?.price_per_unit || 0, grindingChargePerUnit: c.catalog_items?.grinding_charge_per_unit || 0 }));
    addToCart({ id: 'ci_' + Date.now(), savedBlendId: blend.id, name: blend.name, type: blend.type, quantityKg: blend.type === 'FLOUR' ? 5 : 1, components: comps } as CartItem);
    toast(`${blend.name} added to cart`); go('cart');
  }

  return (
    <div style={{ minHeight:'100dvh', paddingBottom:24 }}>
      <Topbar title="My blends" onBack={goBack}/>
      <div className="px" style={{ paddingTop:12 }}>
        {blends.length === 0 && (
          <div className="empty">
            <p>No saved blends yet</p>
            <button className="btn btn-gold" style={{ width:'auto', padding:'11px 24px' }} onClick={() => go('builder','FLOUR')}>Build your first blend</button>
          </div>
        )}
        {blends.map(blend => {
          const comps = (blend.blend_components || []).map((c: any) => ({ name: c.catalog_items?.name||'', percentage: c.percentage, quantityGrams: c.quantity_grams, pricePerUnit: c.catalog_items?.price_per_unit||0, grindingChargePerUnit: c.catalog_items?.grinding_charge_per_unit||0 }));
          return (
            <div key={blend.id} className="card" style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:15 }}>{blend.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:1 }}>{blendDesc(comps, blend.type)}</div>
                  <div style={{ fontSize:12, color:'var(--gold)', marginTop:2, fontWeight:600 }}>{blendPrice(comps, blend.type)}</div>
                </div>
                <button onClick={() => del(blend.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-tertiary)', alignSelf:'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
              <button className="btn btn-outline btn-sm" style={{ width:'100%' }} onClick={() => reorder(blend)}>Reorder</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
