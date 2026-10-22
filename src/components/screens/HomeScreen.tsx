'use client';
import { useEffect, useState } from 'react';
import { supabase, Blend } from '@/lib/supabase';
import { ScreenProps } from './types';
import { blendPrice, blendDesc } from '@/lib/pricing';
import { CartItem } from '@/hooks/useStore';

export default function HomeScreen({ go, user, addToCart, toast }: ScreenProps) {
  const [popular, setPopular] = useState<Blend[]>([]);
  const [saved, setSaved] = useState<Blend[]>([]);
  const [address, setAddress] = useState('Add address');

  useEffect(() => { load(); }, [user]);

  async function load() {
    const { data } = await supabase.from('blends').select('*, blend_components(*, catalog_items(*))').eq('is_curated', true).order('sort_order');
    setPopular((data as any) || []);
    if (user) {
      const { data: s } = await supabase.from('blends').select('*, blend_components(*, catalog_items(*))').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      setSaved((s as any) || []);
      const { data: a } = await supabase.from('addresses').select('*').eq('user_id', user.id).eq('is_default', true).single();
      if (a) setAddress(`${a.label}, ${a.city}`);
    }
  }

  function quickAdd(blend: Blend) {
    const comps = (blend.blend_components || []).map((c: any) => ({ catalogItemId: c.catalog_item_id, name: c.catalog_items?.name || '', percentage: c.percentage, quantityGrams: c.quantity_grams, pricePerUnit: c.catalog_items?.price_per_unit || 0, grindingChargePerUnit: c.catalog_items?.grinding_charge_per_unit || 0 }));
    addToCart({ id: 'ci_' + Date.now(), savedBlendId: blend.id, name: blend.name, type: blend.type, quantityKg: blend.type === 'FLOUR' ? 5 : 1, components: comps } as CartItem);
    toast(`${blend.name} added to cart`);
  }

  function BlendCard({ b, saved }: { b: Blend; saved?: boolean }) {
    const comps = (b.blend_components || []).map((c: any) => ({ name: c.catalog_items?.name || '', percentage: c.percentage, quantityGrams: c.quantity_grams, pricePerUnit: c.catalog_items?.price_per_unit || 0, grindingChargePerUnit: c.catalog_items?.grinding_charge_per_unit || 0 }));
    return (
      <div className="bcard">
        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:12, display:'inline-block', marginBottom:6, background: saved?'var(--sage-light)':'var(--gold-light)', color: saved?'#3A5240':'#7C5209' }}>{saved ? 'Saved' : 'Popular'}</span>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{b.name}</div>
        <div style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.4, marginBottom:10, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{blendDesc(comps, b.type)}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--gold)' }}>{blendPrice(comps, b.type)}</span>
          <button onClick={() => quickAdd(b)} style={{ width:28, height:28, borderRadius:'50%', background:'var(--gold)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px 6px' }}>
        <div onClick={() => go('addresses')} style={{ cursor:'pointer' }}>
          <p style={{ fontSize:11, color:'var(--text-secondary)' }}>Deliver to</p>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--gold)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span style={{ fontSize:14, fontWeight:500 }}>{address}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <button onClick={() => go('admin')} style={{ width:34, height:34, borderRadius:'50%', background:'var(--linen)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </button>
      </div>
      <div className="banner" style={{ marginTop:8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Order before 12 pm for same-day delivery
      </div>
      <div className="hero">
        <div>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--gold)', marginBottom:5 }}>Chakki Fresh</div>
          <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:23, color:'white', marginBottom:3 }}>Milled fresh,<br/>just for you</div>
          <p style={{ fontSize:12, color:'#9B9285' }}>Custom flour & spices · Lucknow</p>
        </div>
        <div style={{ background:'var(--gold)', borderRadius:10, padding:'9px 13px', textAlign:'center' }}>
          <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:24, color:'white', lineHeight:1 }}>2hr</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.85)' }}>delivery</div>
        </div>
      </div>
      <div className="sh"><h3>What do you need?</h3></div>
      <div className="cat-row">
        {[
          { label:'Flour', fn:()=>go('builder','FLOUR'), icon:'<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>', color:'var(--gold)' },
          { label:'Spices', fn:()=>go('builder','SPICE'), icon:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>', color:'var(--sage)' },
          { label:'My blends', fn:()=>go('blends'), icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', color:'var(--charcoal)' },
          { label:'Browse', fn:()=>go('browse'), icon:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', color:'var(--charcoal)' },
        ].map(c => (
          <div key={c.label} className="cat-chip" onClick={c.fn}>
            <div className="cat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="1.6" dangerouslySetInnerHTML={{ __html: c.icon }}/></div>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
      <div className="sh" style={{ marginTop:8 }}><h3>Popular blends</h3><a onClick={() => go('browse')}>See all</a></div>
      <div className="hscroll">
        {popular.length === 0 && <p style={{ fontSize:13, color:'var(--text-secondary)', padding:'10px 0' }}>Loading…</p>}
        {popular.map(b => <BlendCard key={b.id} b={b}/>)}
      </div>
      {saved.length > 0 && (<>
        <div className="sh"><h3>Your saved blends</h3><a onClick={() => go('blends')}>Manage</a></div>
        <div className="hscroll">{saved.map(b => <BlendCard key={b.id} b={b} saved/>)}</div>
      </>)}
      <div className="px" style={{ marginTop:12, paddingBottom:16 }}>
        <button className="btn btn-outline" style={{ borderStyle:'dashed', color:'var(--gold)', borderColor:'var(--gold-light)' }} onClick={() => go('builder','FLOUR')}>+ Build a custom blend</button>
      </div>
    </div>
  );
}
