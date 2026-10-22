'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScreenProps } from './types';
import { Screen } from '@/hooks/useStore';
import { Topbar } from '../ui/Topbar';

export default function ProfileScreen({ go, user, setUser }: ScreenProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const initials = (user?.full_name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  async function save() {
    if (!user || !name.trim()) return;
    setSaving(true);
    await supabase.from('users').update({ full_name: name.trim(), phone: phone.replace(/\D/g, '').slice(-10) || null }).eq('id', user.id);
    setUser({ ...user, full_name: name.trim(), phone: phone.replace(/\D/g, '').slice(-10) || undefined });
    setSaving(false); setEditing(false);
  }

  function logout() { localStorage.removeItem('cf_uid'); setUser(null); go('auth'); }

  const menu: { icon: string; label: string; target: Screen }[] = [
    { icon: '🌾', label: 'My saved blends', target: 'blends' },
    { icon: '📍', label: 'Saved addresses', target: 'addresses' },
    { icon: '📦', label: 'Order history', target: 'orders' },
  ];

  return (
    <div style={{ paddingBottom:80 }}>
      <Topbar title="Profile" right={
        !editing
          ? <button onClick={() => { setName(user?.full_name||''); setPhone(user?.phone||''); setEditing(true); }} style={{ fontSize:13, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>Edit</button>
          : <button onClick={() => setEditing(false)} style={{ fontSize:13, color:'var(--text-secondary)', background:'none', border:'none', cursor:'pointer' }}>Cancel</button>
      }/>
      <div className="px" style={{ paddingTop:16 }}>
        <div className="card" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--gold-light)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Serif Display',Georgia,serif", fontSize:20, color:'var(--gold)', flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1 }}>
            {editing ? (<>
              <div className="field" style={{ marginBottom:8 }}><label>Full name</label><input type="text" value={name} onChange={e=>setName(e.target.value)}/></div>
              <div className="field" style={{ marginBottom:0 }}><label>Phone</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="98765 43210"/></div>
            </>) : (<>
              <div style={{ fontWeight:600, fontSize:15 }}>{user?.full_name || 'Customer'}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{user?.phone || user?.email || ''}</div>
            </>)}
          </div>
        </div>
        {editing && <button className="btn btn-gold" onClick={save} disabled={saving} style={{ marginBottom:16 }}>{saving?'Saving…':'Save changes'}</button>}
        {!editing && (<>
          {menu.map(m => (
            <div key={m.target} onClick={() => go(m.target)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}><span style={{ fontSize:18 }}>{m.icon}</span><span style={{ fontSize:14, fontWeight:500 }}>{m.label}</span></div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
          <button className="btn btn-danger" style={{ marginTop:20 }} onClick={logout}>Log out</button>
        </>)}
      </div>
    </div>
  );
}
