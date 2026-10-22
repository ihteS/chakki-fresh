'use client';
export function Topbar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 10px', background:'white', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:10 }}>
      {onBack
        ? <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:500, color:'var(--text-secondary)', cursor:'pointer', background:'none', border:'none', fontFamily:'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            {title}
          </button>
        : <span style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:19 }}>{title}</span>
      }
      {right}
    </div>
  );
}
