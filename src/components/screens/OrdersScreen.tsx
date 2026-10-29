'use client';
import { useEffect, useState } from 'react';
import { supabase, Order, STATUS_LABELS, STATUS_COLORS } from '@/lib/supabase';
import { ScreenProps } from './types';
import { Topbar } from '../ui/Topbar';

export default function OrdersScreen({ go, user }: ScreenProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { user ? load() : setLoading(false); }, [user]);

  async function load() {
    const { data } = await supabase.from('orders').select('*, order_line_items(*)').eq('user_id', user!.id).order('placed_at', { ascending: false });
    setOrders((data as any) || []); setLoading(false);
  }

  return (
    <div style={{ paddingBottom:80 }}>
      <Topbar title="Orders"/>
      <div className="px">
        {loading && <p style={{ fontSize:13, color:'var(--text-secondary)', padding:'20px 0' }}>Loading…</p>}
        {!loading && !user && <div className="empty"><p>Sign in to see your orders</p></div>}
        {!loading && user && orders.length === 0 && (
          <div className="empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <p>No orders yet</p>
            <button className="btn btn-gold" style={{ width:'auto', padding:'11px 24px' }} onClick={() => go('home')}>Start shopping</button>
          </div>
        )}
        {orders.map(o => {
          const items = (o.order_line_items || []).map((l: any) => l.name).join(', ');
          const date = new Date(o.placed_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
          return (
            <div key={o.id} onClick={() => go('order', o.id)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>#{o.order_number}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:1 }}>{items}</div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:1 }}>{date}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'var(--gold)' }}>₹{o.total}</span>
                <span className={`status ${STATUS_COLORS[o.status] || ''}`}>{STATUS_LABELS[o.status] || o.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
