'use client';
import { Screen } from '@/hooks/useStore';

const ITEMS = [
  { id: 'home', label: 'Home', d: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { id: 'browse', label: 'Browse', d: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  { id: 'cart', label: 'Cart', d: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' },
  { id: 'orders', label: 'Orders', d: '<path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  { id: 'profile', label: 'Profile', d: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
];

export default function BottomNav({ screen, go, cartCount }: { screen: Screen; go: (s: Screen) => void; cartCount: number }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(item => (
        <button key={item.id} className={`nav-btn${screen === item.id ? ' active' : ''}`} onClick={() => go(item.id as Screen)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: item.d }} />
          {item.id === 'cart' && cartCount > 0 && (
            <div style={{ position: 'absolute', top: -3, right: -2, width: 15, height: 15, background: 'var(--red)', color: 'white', borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{cartCount}</div>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
