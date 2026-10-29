'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScreenProps } from './types';

export default function AuthScreen({ go, setUser, toast }: ScreenProps) {
  const [tab, setTab] = useState<'phone'|'email'>('phone');
  const [phone, setPhone] = useState(''); const [otp, setOtp] = useState(''); const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [reg, setReg] = useState(false); const [rn, setRn] = useState(''); const [re, setRe] = useState(''); const [rp, setRp] = useState(''); const [rph, setRph] = useState('');
  const [loading, setLoading] = useState(false);
  const fmt = (p: string) => p.replace(/\D/g,'').slice(-10);

  async function sendOtp() {
    const p = fmt(phone); if (p.length !== 10) { toast('Enter a valid 10-digit number'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/send-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone: p }) });
    const data = await res.json();
    setOtpSent(true); setLoading(false);
    if (data.devOtp) toast(`OTP: ${data.devOtp}  (dev mode)`);
    else toast('OTP sent!');
  }

  async function verifyOtp() {
    const p = fmt(phone); setLoading(true);
    const { data: rec } = await supabase.from('otps').select('*').eq('phone', p).single();
    if (!rec || rec.otp !== otp) { toast('Incorrect OTP'); setLoading(false); return; }
    if (Date.now() - new Date(rec.created_at).getTime() > 300000) { toast('OTP expired'); setOtpSent(false); setLoading(false); return; }
    await supabase.from('otps').delete().eq('phone', p);
    const { data: ex } = await supabase.from('users').select('*').eq('phone', p).single();
    let uid = ex?.id;
    if (!uid) { uid = `u_${Date.now()}`; await supabase.from('users').insert({ id: uid, full_name: 'Chakki Customer', phone: p, phone_verified: true }); }
    const { data: u } = await supabase.from('users').select('*').eq('id', uid).single();
    setUser({ id: u.id, full_name: u.full_name, phone: u.phone, email: u.email });
    localStorage.setItem('cf_uid', uid); setLoading(false);
    toast(`Welcome${u.full_name !== 'Chakki Customer' ? ', ' + u.full_name.split(' ')[0] : ''}!`); go('home');
  }

  async function loginEmail() {
    if (!email||!pw) { toast('Fill email and password'); return; } setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('email', email).single();
    if (!data || data.password_hash !== btoa(pw)) { toast('Invalid credentials'); setLoading(false); return; }
    setUser({ id: data.id, full_name: data.full_name, email: data.email, phone: data.phone });
    localStorage.setItem('cf_uid', data.id); setLoading(false); go('home');
  }

  async function doRegister() {
    if (!rn||!re||rp.length<8) { toast('Name, email and password (min 8 chars) required'); return; } setLoading(true);
    const { data: ex } = await supabase.from('users').select('id').eq('email', re).single();
    if (ex) { toast('Account already exists'); setLoading(false); return; }
    const uid = `u_${Date.now()}`;
    await supabase.from('users').insert({ id: uid, full_name: rn, email: re, phone: rph ? fmt(rph) : null, password_hash: btoa(rp) });
    setUser({ id: uid, full_name: rn, email: re }); localStorage.setItem('cf_uid', uid); setLoading(false);
    toast('Welcome to Chakki Fresh!'); go('home');
  }

  const ts = (a: boolean) => ({ flex:1, padding:'10px', textAlign:'center' as const, fontSize:14, fontWeight:500, cursor:'pointer', background: a?'white':'var(--linen)', color: a?'var(--charcoal)':'var(--text-secondary)' });

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', paddingBottom:20 }}>
      <div style={{ padding:'52px 20px 28px', textAlign:'center' }}>
        <div style={{ width:62, height:62, background:'var(--gold)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M12 2a9 9 0 0 1 9 9c0 4.97-9 13-9 13S3 15.97 3 11a9 9 0 0 1 9-9z"/><circle cx="12" cy="11" r="3"/></svg>
        </div>
        <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:26 }}>Chakki Fresh</div>
        <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3 }}>Freshly milled, just for you</p>
      </div>
      <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, margin:'0 20px 22px', overflow:'hidden' }}>
        <div style={ts(tab==='phone')} onClick={()=>setTab('phone')}>Phone</div>
        <div style={ts(tab==='email')} onClick={()=>setTab('email')}>Email</div>
      </div>
      <div className="px">
        {tab==='phone' && !otpSent && (<div>
          <div className="field"><label>Phone number</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="98765 43210" inputMode="numeric"/></div>
          <button className="btn btn-gold" onClick={sendOtp} disabled={loading}>{loading?'Sending…':'Send OTP'}</button>
        </div>)}
        {tab==='phone' && otpSent && (<div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>Code sent to +91{fmt(phone)}</p>
          <div className="field"><label>OTP code</label><input type="text" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="······" inputMode="numeric" maxLength={6} style={{ textAlign:'center', letterSpacing:8, fontSize:22 }}/></div>
          <button className="btn btn-gold" onClick={verifyOtp} disabled={loading}>{loading?'Verifying…':'Verify & continue'}</button>
          <button className="btn-ghost" style={{ marginTop:12, display:'block' }} onClick={()=>{setOtpSent(false);setOtp('');}}>Change number</button>
        </div>)}
        {tab==='email' && !reg && (<div>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
          <div className="field"><label>Password</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/></div>
          <button className="btn btn-gold" onClick={loginEmail} disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
          <p style={{ textAlign:'center', fontSize:13, marginTop:16, color:'var(--text-secondary)' }}>No account? <span style={{ color:'var(--gold)', cursor:'pointer', fontWeight:500 }} onClick={()=>setReg(true)}>Create one</span></p>
        </div>)}
        {tab==='email' && reg && (<div>
          <div className="field"><label>Full name</label><input type="text" value={rn} onChange={e=>setRn(e.target.value)} placeholder="Your name"/></div>
          <div className="field"><label>Email</label><input type="email" value={re} onChange={e=>setRe(e.target.value)} placeholder="you@example.com"/></div>
          <div className="field"><label>Password</label><input type="password" value={rp} onChange={e=>setRp(e.target.value)} placeholder="Min 8 characters"/></div>
          <div className="field"><label>Phone (optional)</label><input type="tel" value={rph} onChange={e=>setRph(e.target.value)} placeholder="98765 43210"/></div>
          <button className="btn btn-gold" onClick={doRegister} disabled={loading}>{loading?'Creating…':'Create account'}</button>
          <p style={{ textAlign:'center', fontSize:13, marginTop:16, color:'var(--text-secondary)' }}>Have account? <span style={{ color:'var(--gold)', cursor:'pointer', fontWeight:500 }} onClick={()=>setReg(false)}>Sign in</span></p>
        </div>)}
      </div>
    </div>
  );
}
