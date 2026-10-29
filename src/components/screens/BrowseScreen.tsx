'use client';
import { useEffect, useState } from 'react';
import { supabase, Blend } from '@/lib/supabase';
import { ScreenProps } from './types';
import { blendPrice, blendDesc } from '@/lib/pricing';
import { CartItem } from '@/hooks/useStore';
import { Topbar } from '../ui/Topbar';

export default function BrowseScreen({ go, goBack, addToCart, toast }: ScreenProps) {
  const [tab, setTab] = useState<'FLOUR'|'SPICE'>('FLOUR');
  const [blends, setBlends] = useState<Blend[]>([]);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    const { data } = await supabase.from('blends').select('*, blend_components(*, catalog_items(*))').eq('is_curated', true).eq('type', tab).order('sort_order');
    setBlends((data as any) || []);
  }

  function quickAdd(b: Blend) {
    const comps = (b.blend_components || []).map((c: any) => ({ catalogItemId: c.catalog_item_id, name: c.catalog_items?.name || '', percentage: c.percentage, quantityGrams: c.quantity_grams, pricePerUnit: c.catalog_items?.price_per_unit || 0, grindingChargePerUnit: c.catalog_items?.grinding_charge_per_unit || 0 }));
    addToCart({ id: 'ci_' + Date.now(), savedBlendId: b.id, name: b.name, type: b.type, quantityKg: b.type === 'FLOUR' ? 5 : 1, components: comps } as CartItem);
    toast(`${b.name} added to cart`);
  }

  const ts = (a: boolean) => ({ flex:1, padding:9, textAlign:'center' as const, fontSize:14, fontWeight:500, cursor:'pointer', background: a?'white':'var(--linen)', color: a?'var(--charcoal)':'var(--text-secondary)' });

  return (
    <div style={{ paddingBottom:80 }}>
      <Topbar title="Browse" onBack={goBack}/>
      <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, margin:'12px 20px 4px', overflow:'hidden' }}>
        <div style={ts(tab==='FLOUR')} onClick={() => setTab('FLOUR')}>Flour</div>
        <div style={ts(tab==='SPICE')} onClick={() => setTab('SPICE')}>Spices</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'10px 20px' }}>
        {blends.length === 0 && <p style={{ fontSize:13, color:'var(--text-secondary)', gridColumn:'1/-1' }}>No blends yet.</p>}
        {blends.map(b => {
          const comps = (b.blend_components || []).map((c: any) => ({ name: c.catalog_items?.name || '', percentage: c.percentage, quantityGrams: c.quantity_grams, pricePerUnit: c.catalog_items?.price_per_unit || 0, grindingChargePerUnit: c.catalog_items?.grinding_charge_per_unit || 0 }));
          return (
            <div key={b.id} className="bcard" style={{ width:'auto' }}>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:12, display:'inline-block', marginBottom:6, background:'var(--gold-light)', color:'#7C5209' }}>Popular</span>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{b.name}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.4, marginBottom:10 }}>{blendDesc(comps, b.type)}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--gold)' }}>{blendPrice(comps, b.type)}</span>
                <button onClick={() => quickAdd(b)} style={{ width:28, height:28, borderRadius:'50%', background:'var(--gold)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px" style={{ paddingBottom:16 }}>
        <button className="btn btn-outline" style={{ borderStyle:'dashed', color:'var(--gold)', borderColor:'var(--gold-light)' }} onClick={() => go('builder', tab)}>+ Build a custom {tab === 'FLOUR' ? 'flour' : 'spice'} blend</button>
      </div>
    </div>
  );
}
