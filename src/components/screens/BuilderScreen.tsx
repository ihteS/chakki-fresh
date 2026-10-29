'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScreenProps } from './types';
import { GRAIN_COLORS } from '@/lib/pricing';
import { CartItem } from '@/hooks/useStore';
import { Topbar } from '../ui/Topbar';

interface SI { id: string; name: string; pct: number; grams: number; p: number; g: number; avail: number; }

export default function BuilderScreen({ go, goBack, user, addToCart, toast, screenParam }: ScreenProps) {
  const type = (screenParam === 'SPICE' ? 'SPICE' : 'FLOUR') as 'FLOUR'|'SPICE';
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<SI[]>([]);
  const [qty, setQty] = useState(type === 'FLOUR' ? 5 : 1);
  const [name, setName] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('catalog_items').select('*, inventory(available, reserved)').eq('type', type === 'FLOUR' ? 'GRAIN' : 'SPICE').eq('is_active', true);
    setItems(data || []);
  }

  const avail = (item: any) => { const inv = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory; return inv ? inv.available - (inv.reserved || 0) : 0; };

  function toggle(item: any) {
    const exists = sel.find(s => s.id === item.id);
    if (exists) { const n = sel.filter(s => s.id !== item.id); setSel(rebal(n)); }
    else {
      if (type === 'FLOUR' && sel.length >= 4) { toast('Select up to 4 grains'); return; }
      setSel(rebal([...sel, { id: item.id, name: item.name, pct: 0, grams: 50, p: item.price_per_unit, g: item.grinding_charge_per_unit, avail: avail(item) }]));
    }
  }

  function rebal(arr: SI[]): SI[] {
    const n = arr.length; if (!n) return arr;
    const ev = Math.floor(100 / n);
    return arr.map((s, i) => ({ ...s, pct: i === n - 1 ? 100 - (n - 1) * ev : ev }));
  }

  function updSl(id: string, nv: number) {
    setSel(prev => {
      const idx = prev.findIndex(s => s.id === id); if (idx === -1) return prev;
      const delta = nv - prev[idx].pct;
      const next = prev.map((s, i) => i === idx ? { ...s, pct: nv } : s);
      const others = next.filter((_, i) => i !== idx); const ot = others.reduce((s, o) => s + o.pct, 0);
      if (ot > 0) others.forEach(o => { o.pct = Math.max(0, o.pct - delta * (o.pct / ot)); });
      const tot = next.reduce((s, i) => s + i.pct, 0);
      if (tot > 0 && Math.abs(tot - 100) > 0.1) { const f = 100 / tot; next.forEach((s, i) => { if (i !== idx) s.pct = s.pct * f; }); }
      return next.map(s => ({ ...s, pct: Math.round(s.pct * 10) / 10 }));
    });
  }

  const totalPct = sel.reduce((s, i) => s + i.pct, 0);
  let gc = 0, grc = 0;
  sel.forEach(s => { if (type === 'FLOUR') { gc += (s.pct / 100) * qty * s.p; grc += (s.pct / 100) * qty * s.g; } else { gc += (s.grams / 1000) * s.p; grc += (s.grams / 1000) * s.g; } });

  function addCart() {
    const bn = name.trim() || `Custom ${type === 'FLOUR' ? 'flour' : 'spice'} blend`;
    const comps = sel.map(s => ({ catalogItemId: s.id, name: s.name, percentage: type === 'FLOUR' ? s.pct : undefined, quantityGrams: type === 'SPICE' ? s.grams : undefined, pricePerUnit: s.p, grindingChargePerUnit: s.g }));
    addToCart({ id: 'ci_' + Date.now(), name: bn, type, quantityKg: qty, components: comps } as CartItem);
    if (user) {
      const bid = 'bl_' + Date.now();
      supabase.from('blends').insert({ id: bid, user_id: user.id, name: bn, type, is_public: false, is_curated: false }).then(() => {
        supabase.from('blend_components').insert(comps.map(c => ({ id: 'bc_' + Date.now() + Math.random().toString(36).slice(2,5), blend_id: bid, catalog_item_id: c.catalogItemId, percentage: c.percentage ?? null, quantity_grams: c.quantityGrams ?? null })));
      });
    }
    toast(`${bn} added to cart`); go('cart');
  }

  return (
    <div style={{ minHeight:'100dvh', paddingBottom:24 }}>
      <Topbar title={`Build ${type === 'FLOUR' ? 'flour' : 'spice'} blend`} onBack={goBack}/>
      <div className="steps">{[1,2,3,4].map(i => <div key={i} className={`sdot${i < step ? ' done' : i === step ? ' now' : ''}`}/>)}</div>

      {step === 1 && (
        <div className="px" style={{ paddingTop:16 }}>
          <h3 style={{ marginBottom:4 }}>Choose your {type === 'FLOUR' ? 'grains' : 'spices'}</h3>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:14 }}>{type === 'FLOUR' ? 'Select up to 4' : 'Select as many as you like'}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:22 }}>
            {items.map((item: any) => {
              const a = avail(item), on = sel.some(s => s.id === item.id);
              return <div key={item.id} className={`chip${on?' on':a<=0?' off':''}`} onClick={() => (a > 0 || on) && toggle(item)}>{item.name}{a <= 0 ? ' (out of stock)' : ''}</div>;
            })}
          </div>
          <button className="btn btn-gold" onClick={() => setStep(2)} disabled={sel.length === 0}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="px" style={{ paddingTop:16 }}>
          <h3 style={{ marginBottom:14 }}>{type === 'FLOUR' ? 'Set the mix (%)' : 'Set weights (grams)'}</h3>
          {sel.map((item, idx) => {
            const color = GRAIN_COLORS[idx % GRAIN_COLORS.length];
            return (
              <div key={item.id} className="sl-wrap">
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:500 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background:color, display:'inline-block' }}/>
                    {item.name}
                  </div>
                  {type === 'FLOUR' && <span style={{ fontSize:13, fontWeight:600, color }}>{item.pct}%</span>}
                </div>
                {type === 'FLOUR'
                  ? <input type="range" min={0} max={100} step={1} value={item.pct} style={{ accentColor: color }} onChange={e => updSl(item.id, +e.target.value)}/>
                  : <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
                      <input type="number" min={10} max={500} value={item.grams} onChange={e => setSel(prev => prev.map(s => s.id === item.id ? { ...s, grams: +e.target.value } : s))} style={{ width:80, fontSize:15, padding:8, border:'1px solid var(--border)', borderRadius:8, textAlign:'center', background:'var(--linen)' }}/>
                      <span style={{ fontSize:13, color:'var(--text-secondary)' }}>grams</span>
                    </div>
                }
              </div>
            );
          })}
          {type === 'FLOUR' && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--border)', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Total</span>
              <span style={{ fontSize:14, fontWeight:600, color: Math.abs(totalPct-100)<1?'var(--gold)':'var(--red)' }}>{Math.round(totalPct)}%</span>
            </div>
          )}
          <button className="btn btn-gold" onClick={() => { if (type === 'FLOUR' && Math.abs(totalPct-100) > 1) { toast('Percentages must add up to 100%'); return; } setStep(3); }}>Continue</button>
        </div>
      )}

      {step === 3 && (
        <div className="px" style={{ paddingTop:16 }}>
          <h3 style={{ marginBottom:5 }}>How many kg?</h3>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:24 }}>Minimum 1 kg</p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:22, marginBottom:28 }}>
            <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--linen)', fontSize:22, cursor:'pointer' }}>−</button>
            <div style={{ textAlign:'center' }}>
              <span style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:40 }}>{qty}</span>
              <span style={{ fontSize:16, color:'var(--text-secondary)', marginLeft:3 }}>kg</span>
            </div>
            <button onClick={() => setQty(q => Math.min(25, q+1))} style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--linen)', fontSize:22, cursor:'pointer' }}>+</button>
          </div>
          <button className="btn btn-gold" onClick={() => setStep(4)}>Continue</button>
        </div>
      )}

      {step === 4 && (
        <div className="px" style={{ paddingTop:16 }}>
          <h3 style={{ marginBottom:12 }}>Review your blend</h3>
          <div className="field"><label>Name your blend (optional)</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. My everyday ${type === 'FLOUR' ? 'atta' : 'masala'}`}/></div>
          <div className="card" style={{ marginBottom:14 }}>
            {sel.map(s => <div key={s.id} className="pl"><span style={{ color:'var(--text-secondary)' }}>{s.name} {type==='FLOUR'?`${s.pct}%`:`${s.grams}g`}</span><span>₹{Math.round(type==='FLOUR'?(s.pct/100)*qty*(s.p+s.g):(s.grams/1000)*(s.p+s.g))}</span></div>)}
            <div className="divider" style={{ margin:'8px 0' }}/>
            <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Ingredients</span><span>₹{Math.round(gc)}</span></div>
            <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Grinding charge</span><span>₹{Math.round(grc)}</span></div>
            <div className="pl total"><span>Subtotal</span><span style={{ color:'var(--gold)' }}>₹{Math.round(gc+grc)}</span></div>
            <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:7 }}>Delivery charge added at checkout.</p>
          </div>
          <button className="btn btn-gold" onClick={addCart}>Add to cart</button>
        </div>
      )}
    </div>
  );
}
