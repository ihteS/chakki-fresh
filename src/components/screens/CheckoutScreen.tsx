'use client';
import { useEffect, useState } from 'react';
import { supabase, Address } from '@/lib/supabase';
import { ScreenProps } from './types';
import { calcSub, calcGrind } from '@/lib/pricing';
import { Topbar } from '../ui/Topbar';

declare global { interface Window { Razorpay: any; } }

export default function CheckoutScreen({ go, goBack, user, cart, clearCart, toast }: ScreenProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selAddr, setSelAddr] = useState<string|null>(null);
  const [placing, setPlacing] = useState(false);
  const [cfg, setCfg] = useState<Record<string,string>>({});
  const [payMode, setPayMode] = useState<'online'|'cod'>('cod');

  useEffect(() => { if (user) { loadAddr(); loadCfg(); } }, [user]);

  async function loadAddr() {
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user!.id);
    const a = (data as Address[]) || []; setAddresses(a);
    const def = a.find(x => x.is_default) || a[0]; if (def) setSelAddr(def.id);
  }
  async function loadCfg() {
    const { data } = await supabase.from('system_config').select('*');
    const m: Record<string,string> = {}; (data || []).forEach((r: any) => { m[r.key] = r.value; }); setCfg(m);
  }

  const cutoff = parseInt(cfg.cutoff_hour || '12'), now = new Date();
  const isSameDay = now.getHours() < cutoff;
  const delivDate = new Date(now); if (!isSameDay) delivDate.setDate(delivDate.getDate() + 1);
  const dateStr = delivDate.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  let sub = 0, grind = 0;
  cart.forEach(i => { sub += calcSub(i); grind += calcGrind(i); });
  const freeAbove = parseFloat(cfg.free_above || '600'), delBase = parseFloat(cfg.del_base || '30');
  const del = sub >= freeAbove ? 0 : delBase;
  const total = sub + grind + del;

  async function createOrder(payId?: string) {
    const oid = 'ord_' + Date.now(), onum = 'CF-' + Date.now().toString().slice(-6);
    await supabase.from('orders').insert({ id:oid, order_number:onum, user_id:user!.id, user_name:user!.full_name, user_phone:user!.phone||'', address_id:selAddr, status:'AWAITING_APPROVAL', delivery_date:delivDate.toISOString(), subtotal:Math.round(sub), grinding_charge:Math.round(grind), delivery_charge:Math.round(del), total:Math.round(total), placed_at:new Date().toISOString(), payment_id:payId||null, payment_method:payId?'razorpay':'cod', status_history:[{ status:'AWAITING_APPROVAL', at:new Date().toISOString(), by:'system' }] });
    await supabase.from('order_line_items').insert(cart.map(item => ({ id:'li_'+Date.now()+Math.random().toString(36).slice(2,6), order_id:oid, name:item.name, type:item.type, quantity_kg:item.quantityKg, subtotal:Math.round(calcSub(item)), grinding_charge:Math.round(calcGrind(item)), components:item.components })));
    fetch('/api/notify/order', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ orderNumber:onum, userName:user!.full_name, userPhone:user!.phone||'', total:Math.round(total), items:cart.map(i=>`${i.name} (${i.quantityKg}kg)`).join(', '), deliveryDate:dateStr }) }).catch(()=>{});
    return { oid, onum };
  }

  async function placeCOD() {
    if (!selAddr) { toast('Select a delivery address'); return; }
    setPlacing(true);
    const { oid, onum } = await createOrder();
    clearCart(); setPlacing(false); toast('Order placed! #' + onum); go('order', oid);
  }

  async function placeOnline() {
    if (!selAddr) { toast('Select a delivery address'); return; }
    setPlacing(true);
    const res = await fetch('/api/payment/create-order', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ amount:Math.round(total), orderId:'cf_'+Date.now(), customerName:user!.full_name, customerPhone:user!.phone||'', customerEmail:user!.email||'' }) });
    const rzp = await res.json();
    if (rzp.stub) { const { oid, onum } = await createOrder(); clearCart(); setPlacing(false); toast('Order placed! #' + onum); go('order', oid); return; }
    if (!window.Razorpay) await new Promise<void>(r => { const s = document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.onload=()=>r(); document.body.appendChild(s); });
    new window.Razorpay({ key:rzp.keyId, amount:rzp.amount, currency:rzp.currency, name:'Chakki Fresh', order_id:rzp.razorpayOrderId, prefill:{ name:user!.full_name, contact:user!.phone?'+91'+user!.phone:'', email:user!.email||'' }, theme:{ color:'#C8953A' },
      handler: async (r: any) => {
        const v = await fetch('/api/payment/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ razorpayOrderId:r.razorpay_order_id, razorpayPaymentId:r.razorpay_payment_id, razorpaySignature:r.razorpay_signature }) });
        const { verified } = await v.json();
        if (!verified) { toast('Payment verification failed'); setPlacing(false); return; }
        const { oid, onum } = await createOrder(r.razorpay_payment_id);
        clearCart(); setPlacing(false); toast('Payment successful! #' + onum); go('order', oid);
      }, modal: { ondismiss: () => setPlacing(false) }
    }).open();
  }

  if (!user) return (
    <div style={{ minHeight:'100dvh' }}>
      <Topbar title="Checkout" onBack={goBack}/>
      <div className="empty"><p>Please sign in to checkout</p><button className="btn btn-gold" style={{ width:'auto', padding:'11px 24px' }} onClick={() => go('auth')}>Sign in</button></div>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh', paddingBottom:24 }}>
      <Topbar title="Checkout" onBack={goBack}/>
      <div className="px" style={{ paddingTop:16 }}>
        <h3 style={{ marginBottom:10 }}>Delivery address</h3>
        {addresses.length === 0
          ? <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:8 }}>No addresses saved yet.</p>
          : addresses.map(a => (
            <div key={a.id} className={`addr-card${selAddr===a.id?' sel':''}`} onClick={() => setSelAddr(a.id)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--gold)" style={{ flexShrink:0, marginTop:2 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{a.label}</div><div style={{ fontSize:12, color:'var(--text-secondary)' }}>{a.line1}{a.line2?', '+a.line2:''}, {a.city} {a.pincode}</div></div>
            </div>
          ))
        }
        <button className="btn-ghost" style={{ marginBottom:16 }} onClick={() => go('addresses')}>+ Add new address</button>

        <div className="card" style={{ background:'var(--gold-pale)', borderColor:'var(--gold-light)', marginBottom:12 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#7C5209' }}>Delivery on {dateStr}</p>
          <p style={{ fontSize:11, color:'#92400E', marginTop:2 }}>{isSameDay ? 'Same-day guaranteed ✓' : `Ordered after ${cutoff}:00 — next day delivery`}</p>
        </div>

        <div className="card" style={{ marginBottom:14 }}>
          {cart.map(item => <div key={item.id} className="pl"><span style={{ color:'var(--text-secondary)' }}>{item.name} ×{item.quantityKg}{item.type==='FLOUR'?'kg':' batch'}</span><span>₹{Math.round(calcSub(item)+calcGrind(item))}</span></div>)}
          <div className="divider" style={{ margin:'8px 0' }}/>
          <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Subtotal</span><span>₹{Math.round(sub)}</span></div>
          <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Grinding</span><span>₹{Math.round(grind)}</span></div>
          <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Delivery</span><span>{del===0?'Free 🎉':'₹'+Math.round(del)}</span></div>
          <div className="pl total"><span>Total</span><span style={{ color:'var(--gold)' }}>₹{Math.round(total)}</span></div>
        </div>

        <h3 style={{ marginBottom:10 }}>Payment</h3>
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          {[{id:'online',label:'💳 Pay online',sub:'UPI, card, netbanking'},{id:'cod',label:'💵 Pay on delivery',sub:'Cash or UPI at door'}].map(opt => (
            <div key={opt.id} onClick={() => setPayMode(opt.id as any)} style={{ flex:1, padding:12, border:`1.5px solid ${payMode===opt.id?'var(--gold)':'var(--border)'}`, borderRadius:10, cursor:'pointer', background:payMode===opt.id?'var(--gold-pale)':'white' }}>
              <div style={{ fontSize:13, fontWeight:600, color:payMode===opt.id?'#7C5209':'var(--charcoal)' }}>{opt.label}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{opt.sub}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-gold" onClick={payMode==='online'?placeOnline:placeCOD} disabled={placing||!selAddr}>
          {placing?'Processing…':payMode==='online'?`Pay ₹${Math.round(total)}`:`Place order · ₹${Math.round(total)}`}
        </button>
      </div>
    </div>
  );
}
