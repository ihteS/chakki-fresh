'use client';
import { useEffect, useState } from 'react';
import { supabase, Address } from '@/lib/supabase';
import { ScreenProps } from './types';
import { Topbar } from '../ui/Topbar';

export default function AddressesScreen({ goBack, user, toast }: ScreenProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [modal, setModal] = useState(false);
  const [label, setLabel] = useState('HOME');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState(26.8467);
  const [lng, setLng] = useState(80.9462);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user!.id);
    setAddresses((data as Address[]) || []);
  }

  async function del(id: string) {
    if (!confirm('Remove this address?')) return;
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses(a => a.filter(x => x.id !== id));
  }

  function detectLoc() {
    if (!navigator.geolocation) { toast('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); toast('Location detected ✓'); },
      () => toast('Could not detect location — enter manually')
    );
  }

  async function save() {
    if (!line1 || !pincode) { toast('Address and pincode required'); return; }
    setSaving(true);
    const id = 'a_' + Date.now();
    const { data: ex } = await supabase.from('addresses').select('id').eq('user_id', user!.id);
    await supabase.from('addresses').insert({ id, user_id: user!.id, label, line1, line2, city, pincode, lat, lng, is_default: !ex || ex.length === 0 });
    setSaving(false); setModal(false);
    setLine1(''); setLine2(''); setPincode('');
    load(); toast('Address saved');
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 24 }}>
      <Topbar title="Addresses" onBack={goBack} />
      <div className="px" style={{ paddingTop: 12 }}>
        {addresses.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>No addresses saved yet.</p>}
        {addresses.map(a => (
          <div key={a.id} style={{ display: 'flex', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: 'var(--linen)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}{a.is_default ? ' · default' : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city} {a.pincode}</div>
            </div>
            <button onClick={() => del(a.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
            </button>
          </div>
        ))}
        <button className="btn btn-outline" style={{ borderStyle: 'dashed', marginTop: 4 }} onClick={() => setModal(true)}>+ Add address</button>
      </div>

      <div className={`overlay${modal ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add address</div>
          <button className="btn btn-outline" style={{ marginBottom: 14 }} onClick={detectLoc}>📍 Use my current location</button>
          <div className="field">
            <label>Label</label>
            <select value={label} onChange={e => setLabel(e.target.value)}>
              <option value="HOME">Home</option><option value="WORK">Work</option><option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field"><label>Address</label><input type="text" value={line1} onChange={e => setLine1(e.target.value)} placeholder="House no, street" /></div>
          <div className="field"><label>Landmark (optional)</label><input type="text" value={line2} onChange={e => setLine2(e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>City</label><input type="text" value={city} onChange={e => setCity(e.target.value)} /></div>
            <div className="field"><label>Pincode</label><input type="text" value={pincode} onChange={e => setPincode(e.target.value)} placeholder="226010" /></div>
          </div>
          <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save address'}</button>
          <button className="btn-ghost" style={{ marginTop: 10, display: 'block', width: '100%', textAlign: 'center' }} onClick={() => setModal(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
