'use client';
import { useEffect, useState } from 'react';
import { supabase, Order } from '@/lib/supabase';
import { ScreenProps } from './types';
import { Topbar } from '../ui/Topbar';

const SEQ = ['AWAITING_APPROVAL','APPROVED','MILLING','PACKAGING','OUT_FOR_DELIVERY','DELIVERED'];
const SL: Record<string,string> = { AWAITING_APPROVAL:'Order confirmed', APPROVED:'Approved for milling', MILLING:'Milling started', PACKAGING:'Packaged', OUT_FOR_DELIVERY:'Out for delivery', DELIVERED:'Delivered' };

export default function OrderDetailScreen({ goBack, screenParam, toast }: ScreenProps) {
  const [order, setOrder] = useState<Order|null>(null);

  useEffect(() => { if (screenParam) load(); }, [screenParam]);

  async function load() {
    const { data } = await supabase.from('orders').select('*, order_line_items(*)').eq('id', screenParam).single();
    setOrder(data as any);
  }

  async function cancel() {
    if (!order || !confirm('Cancel this order?')) return;
    const hist = [...(order.status_history||[]), { status:'CANCELLED', at:new Date().toISOString(), by:'customer' }];
    await supabase.from('orders').update({ status:'CANCELLED', status_history:hist }).eq('id', order.id);
    toast('Order cancelled'); load();
  }

  if (!order) return (
    <div style={{ minHeight:'100dvh' }}>
      <Topbar title="Order" onBack={goBack}/>
      <p style={{ padding:20, fontSize:13, color:'var(--text-secondary)' }}>Loading…</p>
    </div>
  );

  const curIdx = SEQ.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const canCancel = ['PENDING','AWAITING_APPROVAL'].includes(order.status);
  const dd = new Date(order.delivery_date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  return (
    <div style={{ minHeight:'100dvh', paddingBottom:24 }}>
      <Topbar title={`#${order.order_number}`} onBack={goBack}/>
      <div className="px" style={{ paddingTop:16 }}>
        {!isCancelled && (
          <div className="card" style={{ background:'var(--sage-light)', borderColor:'#C8D8CA', marginBottom:18 }}>
            <p style={{ fontSize:12, fontWeight:500, color:'var(--sage)' }}>Estimated delivery</p>
            <p style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:17, color:'var(--charcoal)', marginTop:2 }}>{dd}</p>
          </div>
        )}
        {isCancelled && (
          <div className="card" style={{ background:'var(--red-light)', borderColor:'#f0c0bb', marginBottom:18 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--red)' }}>This order was {order.status === 'CANCELLED' ? 'cancelled' : 'rejected'}.</p>
          </div>
        )}
        {!isCancelled && (
          <>
            <h3 style={{ marginBottom:12 }}>Status</h3>
            <div>
              {SEQ.map((s, i) => {
                const done = i < curIdx, now = i === curIdx, last = i === SEQ.length - 1;
                return (
                  <div key={s} style={{ display:'flex', gap:12 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div className={`tl-circle${done?' done':now?' now':''}`}>
                        {done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      {!last && <div className={`tl-line${done?' done':''}`}/>}
                    </div>
                    <div style={{ paddingTop:1, paddingBottom:22 }}>
                      <div style={{ fontSize:13, fontWeight:500, color: done||now?'var(--charcoal)':'var(--text-tertiary)' }}>{SL[s]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="divider"/>
          </>
        )}
        <h3 style={{ marginBottom:10 }}>Summary</h3>
        {(order.order_line_items || []).map((li: any) => (
          <div key={li.id} className="pl"><span style={{ color:'var(--text-secondary)' }}>{li.name} ×{li.quantity_kg}{li.type==='FLOUR'?'kg':' batch'}</span><span>₹{li.subtotal}</span></div>
        ))}
        <div className="divider" style={{ margin:'8px 0' }}/>
        <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Grinding</span><span>₹{order.grinding_charge}</span></div>
        <div className="pl"><span style={{ color:'var(--text-secondary)' }}>Delivery</span><span>₹{order.delivery_charge}</span></div>
        <div className="pl total"><span>Total</span><span style={{ color:'var(--gold)' }}>₹{order.total}</span></div>
        {order.payment_method && <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:6 }}>Paid via {order.payment_method === 'razorpay' ? 'Razorpay' : 'Cash on delivery'}</p>}
        {canCancel && <div style={{ marginTop:20 }}><button className="btn btn-danger" onClick={cancel}>Cancel order</button></div>}
      </div>
    </div>
  );
}
