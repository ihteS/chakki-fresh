'use client';
import { useState, useCallback, useRef } from 'react';

export type Screen = 'auth'|'home'|'browse'|'builder'|'cart'|'checkout'|'orders'|'order'|'profile'|'blends'|'addresses'|'admin';

export interface CartItem {
  id: string; savedBlendId?: string; name: string; type: 'FLOUR'|'SPICE';
  quantityKg: number;
  components: Array<{ catalogItemId: string; name: string; percentage?: number; quantityGrams?: number; pricePerUnit: number; grindingChargePerUnit: number; }>;
}

export interface StoreUser { id: string; full_name: string; email?: string; phone?: string; }

let _toastTimer: ReturnType<typeof setTimeout>;

export function useStore() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [screenParam, setScreenParam] = useState<string|undefined>();
  const [user, setUser] = useState<StoreUser|null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const prev = useRef<Screen>('home');

  const toast = useCallback((msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => setToastVisible(false), 3200);
  }, []);

  const go = useCallback((s: Screen, param?: string) => {
    prev.current = screen;
    setScreen(s); setScreenParam(param);
  }, [screen]);

  const goBack = useCallback(() => { go(prev.current); }, [go]);
  const addToCart = useCallback((item: CartItem) => setCart(c => [...c, item]), []);
  const removeFromCart = useCallback((id: string) => setCart(c => c.filter(i => i.id !== id)), []);
  const updateCartQty = useCallback((id: string, qty: number) => setCart(c => c.map(i => i.id === id ? { ...i, quantityKg: qty } : i)), []);
  const clearCart = useCallback(() => setCart([]), []);

  return { screen, screenParam, go, goBack, user, setUser, cart, addToCart, removeFromCart, updateCartQty, clearCart, toast, toastMsg, toastVisible };
}
