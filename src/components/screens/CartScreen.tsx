'use client';
import { ScreenProps } from './types';
import { calcSub, calcGrind } from '@/lib/pricing';
import { Topbar } from '../ui/Topbar';

export default function CartScreen({ go, goBack, cart, removeFromCart, updateCartQty }: ScreenProps) {
  const total = cart.reduce((s, i) => s + calcSub(i) + calcGrind(i), 0);

  if (cart.length === 0) return (
    <div style={{ minHeight:'100dvh' }}>
      <Topbar title="Cart" onBack={goBack}/>
      <div className="empty">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Your cart is empty</p>
        <button className="btn btn-gold" style={{ width:'auto', padding:'11px 24px' }} onClick={() => go('home')}>Browse blends</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh' }}>
      <Topbar title="Cart" onBack={goBack}/>
      <div className="px" style={{ paddingTop:4 }}>
        {cart.map((item, idx) => {
          const sub = calcSub(item) + calcGrind(item);
          const desc = item.type === 'FLOUR' ? item.components.map(c => `${c.percentage}% ${c.name}`).join(', ') : item.components.map(c => `${c.name} ${c.quantityGrams}g`).join(', ');
          return (
            <div key={item.id} style={{ display:'flex', gap:12, padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{item.name}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.4 }}>{desc}</div>
                {item.type === 'FLOUR'
                  ? <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                      <button onClick={() => updateCartQty(item.id, Math.max(1, item.quantityKg-1))} style={{ width:27, height:27, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--linen)', fontSize:16, cursor:'pointer' }}>−</button>
                      <span style={{ fontSize:14, fontWeight:600, minWidth:28, textAlign:'center' }}>{item.quantityKg}kg</span>
                      <button onClick={() => updateCartQty(item.id, item.quantityKg+1)} style={{ width:27, height:27, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--linen)', fontSize:16, cursor:'pointer' }}>+</button>
                    </div>
                  : <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:6 }}>1 batch</div>
                }
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'var(--gold)' }}>₹{Math.round(sub)}</span>
                <button onClick={() => removeFromCart(item.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-tertiary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>
          );
        })}
        <div className="divider"/>
        <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Subtotal</span><span style={{ fontWeight:600 }}>₹{Math.round(total)}</span></div>
        <p style={{ fontSize:11, color:'var(--text-tertiary)', margin:'5px 0 18px' }}>Grinding and delivery added at checkout</p>
        <button className="btn btn-gold" onClick={() => go('checkout')}>Proceed to checkout</button>
      </div>
    </div>
  );
}
