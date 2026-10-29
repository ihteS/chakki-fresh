'use client';
import { useEffect, useState } from 'react';
import { supabase, Order, CatalogItem, STATUS_LABELS } from '@/lib/supabase';
import { ScreenProps } from './types';
import { Topbar } from '../ui/Topbar';

type Tab = 'dashboard'|'orders'|'inventory'|'catalog'|'settings';

const SC: Record<string,string> = {
  AWAITING_APPROVAL:'bg-amber-100 text-amber-800', APPROVED:'bg-emerald-100 text-emerald-800',
  MILLING:'bg-yellow-50 text-yellow-800', PACKAGING:'bg-yellow-50 text-yellow-800',
  OUT_FOR_DELIVERY:'bg-blue-100 text-blue-800', DELIVERED:'bg-gray-100 text-gray-600',
  REJECTED:'bg-red-100 text-red-700', CANCELLED:'bg-red-100 text-red-700',
};

export default function AdminScreen({ goBack, toast }: ScreenProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string|null>(null);
  const [inv, setInv] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cfg, setCfg] = useState<Record<string,string>>({});
  const [syncModal, setSyncModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [syncQ, setSyncQ] = useState<Record<string,number>>({});
  const [cf, setCf] = useState({ type:'GRAIN', name:'', price:'', grind:'0', yf:'1', sf:'WHOLE' });

  useEffect(() => { loadTab(tab); }, [tab, filter]);

  async function loadTab(t: Tab) {
    if (t==='dashboard'||t==='orders') await loadOrders();
    if (t==='inventory') await loadInv();
    if (t==='catalog') await loadCat();
    if (t==='settings') await loadCfg();
  }

  async function loadOrders() {
    let q = supabase.from('orders').select('*, order_line_items(*)').order('placed_at', { ascending: false });
    if (filter && tab === 'orders') q = (q as any).eq('status', filter);
    const { data } = await q; setOrders((data as any) || []);
  }

  async function loadInv() {
    const { data } = await supabase.from('inventory').select('*, catalog_items(name, type)');
    setInv(data || []);
  }

  async function loadCat() {
    const { data } = await supabase.from('catalog_items').select('*').eq('is_active', true).order('type').order('name');
    setCatalog((data as CatalogItem[]) || []);
  }

  async function loadCfg() {
    const { data } = await supabase.from('system_config').select('*');
    const m: Record<string,string> = {}; (data || []).forEach((r: any) => { m[r.key] = r.value; }); setCfg(m);
  }

  async function updStatus(oid: string, status: string) {
    const o = orders.find(x => x.id === oid); if (!o) return;
    const hist = [...(o.status_history||[]), { status, at: new Date().toISOString(), by: 'admin' }];
    await supabase.from('orders').update({ status, status_history: hist }).eq('id', oid);
    toast(`Order → ${STATUS_LABELS[status]}`); loadOrders();
  }

  async function doSync() {
    for (const [id, qty] of Object.entries(syncQ)) {
      if (qty > 0) {
        const { data } = await supabase.from('inventory').select('available').eq('catalog_item_id', id).single();
        const cur = (data as any)?.available || 0;
        await supabase.from('inventory').update({ available: cur + qty }).eq('catalog_item_id', id);
      }
    }
    setSyncModal(false); setSyncQ({}); toast('Inventory updated'); loadInv();
  }

  async function addCatItem() {
    if (!cf.name || !cf.price) { toast('Name and price required'); return; }
    const id = (cf.type==='GRAIN'?'g-':'s-') + cf.name.toLowerCase().replace(/\s+/g,'-') + '-' + Date.now().toString().slice(-4);
    await supabase.from('catalog_items').insert({ id, type: cf.type, name: cf.name, spice_form: cf.type==='SPICE'?cf.sf:null, price_per_unit: parseFloat(cf.price), grinding_charge_per_unit: parseFloat(cf.grind), grinding_yield_factor: parseFloat(cf.yf), is_active: true, unit: 'kg', sort_order: 99 });
    await supabase.from('inventory').insert({ catalog_item_id: id, available: 0, reserved: 0, threshold: cf.type==='GRAIN'?10:0.5 });
    setCatModal(false); toast(`${cf.name} added`); loadCat();
  }

  async function saveCfg() {
    const rows = Object.entries(cfg).map(([key, value]) => ({ key, value }));
    await supabase.from('system_config').upsert(rows);
    toast('Settings saved ✓');
  }

  const pending = orders.filter(o => o.status === 'AWAITING_APPROVAL');
  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => new Date(o.placed_at) >= today);
  const todayRev = todayOrders.filter(o => !['CANCELLED','REJECTED'].includes(o.status)).reduce((s,o) => s+o.total, 0);

  const ACTS: Record<string, { label: string; next: string; cls: string }> = {
    AWAITING_APPROVAL: { label:'Approve', next:'APPROVED', cls:'abtn-ok' },
    APPROVED: { label:'Start milling', next:'MILLING', cls:'abtn-go' },
    MILLING: { label:'Packaged', next:'PACKAGING', cls:'abtn-go' },
    PACKAGING: { label:'Out for delivery', next:'OUT_FOR_DELIVERY', cls:'abtn-ok' },
    OUT_FOR_DELIVERY: { label:'Delivered', next:'DELIVERED', cls:'abtn-ok' },
  };

  return (
    <div style={{ minHeight:'100dvh', paddingBottom:24 }}>
      <Topbar title="Admin" onBack={goBack} right={<span style={{ fontSize:12, fontWeight:500, color:'var(--gold)' }}>Chakki Fresh</span>}/>

      <div className="adm-tabs">
        {(['dashboard','orders','inventory','catalog','settings'] as Tab[]).map(t => (
          <div key={t} className={`adm-tab${tab===t?' on':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</div>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <div className="px" style={{ paddingTop:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[{v:todayOrders.length,l:"Today's orders"},{v:'₹'+Math.round(todayRev),l:"Today's revenue"},{v:pending.length,l:'Pending approval'},{v:orders.length,l:'Total orders'}].map((m,i) => (
              <div key={i} className="metric">
                <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:28 }}>{m.v}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{m.l}</div>
              </div>
            ))}
          </div>
          <h3 style={{ marginBottom:10 }}>Pending approval</h3>
          {pending.length === 0 && <p style={{ fontSize:13, color:'var(--text-secondary)' }}>All caught up ✓</p>}
          {pending.map(o => (
            <div key={o.id} className="trow">
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>#{o.order_number}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{o.user_name} · ₹{o.total}</div>
              </div>
              <button className="abtn abtn-ok" onClick={() => updStatus(o.id,'APPROVED')}>Approve</button>
              <button className="abtn abtn-no" onClick={() => updStatus(o.id,'REJECTED')}>Reject</button>
            </div>
          ))}
        </div>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <div className="px" style={{ paddingTop:12 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            <div className={`chip${!filter?' on':''}`} onClick={() => setFilter(null)}>All</div>
            {['AWAITING_APPROVAL','APPROVED','MILLING','PACKAGING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s => (
              <div key={s} className={`chip${filter===s?' on':''}`} onClick={() => setFilter(s)}>{STATUS_LABELS[s]}</div>
            ))}
          </div>
          {orders.length === 0 && <p style={{ fontSize:13, color:'var(--text-secondary)' }}>No orders</p>}
          {orders.map(o => {
            const act = ACTS[o.status];
            return (
              <div key={o.id} className="trow" style={{ flexWrap:'wrap', gap:6 }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>#{o.order_number}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{o.user_name} · ₹{o.total}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{new Date(o.placed_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:5 }}>
                  <span className={`status ${SC[o.status]||''}`}>{STATUS_LABELS[o.status]}</span>
                  {act && <button className={`abtn ${act.cls}`} onClick={() => updStatus(o.id, act.next)}>{act.label}</button>}
                  {o.status==='AWAITING_APPROVAL' && <button className="abtn abtn-no" onClick={() => updStatus(o.id,'REJECTED')}>Reject</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INVENTORY */}
      {tab === 'inventory' && (
        <div className="px" style={{ paddingTop:16 }}>
          {inv.map(item => {
            const avail = item.available - (item.reserved||0);
            const pct = Math.max(0, Math.min(100, (avail/((item.threshold||5)*4))*100));
            const color = avail<=0?'#C0392B':avail<=item.threshold?'var(--gold)':'var(--sage)';
            return (
              <div key={item.catalog_item_id} className="card" style={{ padding:12, marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{item.catalog_items?.name}</div>
                  {avail<=item.threshold && <span style={{ fontSize:10, fontWeight:600, color:'var(--red)', background:'var(--red-light)', padding:'2px 7px', borderRadius:10 }}>Low</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1 }}>{avail.toFixed(1)} kg available{item.reserved>0?` · ${item.reserved.toFixed(1)} reserved`:''}</div>
                <div className="inv-bg"><div className="inv-fill" style={{ width:pct+'%', background:color }}/></div>
              </div>
            );
          })}
          <button className="btn btn-outline" style={{ marginTop:16 }} onClick={() => { setSyncQ({}); setSyncModal(true); }}>Sync stock arrival</button>
        </div>
      )}

      {/* CATALOG */}
      {tab === 'catalog' && (
        <div className="px" style={{ paddingTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h3>Catalog</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { setCf({type:'GRAIN',name:'',price:'',grind:'0',yf:'1',sf:'WHOLE'}); setCatModal(true); }}>+ Add item</button>
          </div>
          {catalog.map(item => (
            <div key={item.id} className="trow">
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{item.name}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{item.type}{item.spice_form?' · '+item.spice_form:''} · ₹{item.price_per_unit}/kg · ₹{item.grinding_charge_per_unit} grinding</div>
              </div>
              <button className="abtn abtn-no" onClick={async () => { if (!confirm(`Remove ${item.name}?`)) return; await supabase.from('catalog_items').update({ is_active:false }).eq('id', item.id); loadCat(); }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div className="px" style={{ paddingTop:16 }}>
          <h3 style={{ marginBottom:14 }}>Settings</h3>
          {[
            {k:'cutoff_hour',l:'Same-day cutoff (24h)',u:'hr'},
            {k:'del_base',l:'Base delivery charge',u:'₹'},
            {k:'free_above',l:'Free delivery above',u:'₹'},
            {k:'min_flour',l:'Min order — flour',u:'₹'},
            {k:'min_spice',l:'Min order — spices',u:'₹'},
          ].map(f => (
            <div key={f.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{f.l}</div>
              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                {f.u==='₹' && <span style={{ fontSize:13 }}>₹</span>}
                <input type="number" value={cfg[f.k]||''} onChange={e => setCfg(c => ({...c,[f.k]:e.target.value}))} style={{ width:64, textAlign:'center', fontSize:13, padding:'6px 8px', border:'1px solid var(--border)', borderRadius:8, background:'var(--linen)' }}/>
                {f.u!=='₹' && <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{f.u}</span>}
              </div>
            </div>
          ))}
          <button className="btn btn-gold" style={{ marginTop:20 }} onClick={saveCfg}>Save settings</button>
        </div>
      )}

      {/* Sync Modal */}
      <div className={`overlay${syncModal?' open':''}`} onClick={e => { if (e.target===e.currentTarget) setSyncModal(false); }}>
        <div className="sheet">
          <div className="sheet-handle"/>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Sync stock arrival</div>
          {catalog.map(item => (
            <div key={item.id} className="field" style={{ marginBottom:10 }}>
              <label>{item.name}</label>
              <input type="number" min={0} placeholder="kg received" onChange={e => setSyncQ(q => ({...q,[item.id]:parseFloat(e.target.value)||0}))}/>
            </div>
          ))}
          <button className="btn btn-gold" style={{ marginTop:8 }} onClick={doSync}>Update inventory</button>
          <button className="btn-ghost" style={{ marginTop:10, display:'block', width:'100%', textAlign:'center' }} onClick={() => setSyncModal(false)}>Cancel</button>
        </div>
      </div>

      {/* Add catalog item modal */}
      <div className={`overlay${catModal?' open':''}`} onClick={e => { if (e.target===e.currentTarget) setCatModal(false); }}>
        <div className="sheet">
          <div className="sheet-handle"/>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Add catalog item</div>
          <div className="field"><label>Type</label><select value={cf.type} onChange={e => setCf(f=>({...f,type:e.target.value}))}><option value="GRAIN">Grain</option><option value="SPICE">Spice</option></select></div>
          {cf.type==='SPICE' && <div className="field"><label>Form</label><select value={cf.sf} onChange={e => setCf(f=>({...f,sf:e.target.value}))}><option value="WHOLE">Whole (freshly ground)</option><option value="GROUND">Pre-ground</option></select></div>}
          <div className="field"><label>Name</label><input type="text" value={cf.name} onChange={e => setCf(f=>({...f,name:e.target.value}))} placeholder="e.g. Sharbati Wheat"/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field"><label>Price/kg (₹)</label><input type="number" value={cf.price} onChange={e => setCf(f=>({...f,price:e.target.value}))} placeholder="46"/></div>
            <div className="field"><label>Grinding charge</label><input type="number" value={cf.grind} onChange={e => setCf(f=>({...f,grind:e.target.value}))}/></div>
          </div>
          <div className="field"><label>Yield factor (1.0 = no loss)</label><input type="number" value={cf.yf} onChange={e => setCf(f=>({...f,yf:e.target.value}))} step={0.01} min={0.5} max={1}/></div>
          <button className="btn btn-gold" onClick={addCatItem}>Add to catalog</button>
          <button className="btn-ghost" style={{ marginTop:10, display:'block', width:'100%', textAlign:'center' }} onClick={() => setCatModal(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
