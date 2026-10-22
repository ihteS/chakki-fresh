import { Screen, CartItem, StoreUser } from '@/hooks/useStore';
export interface ScreenProps {
  go: (s: Screen, param?: string) => void; goBack: () => void;
  user: StoreUser | null; setUser: (u: StoreUser | null) => void;
  cart: CartItem[]; addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void; updateCartQty: (id: string, qty: number) => void;
  clearCart: () => void; toast: (msg: string) => void; screenParam?: string;
}
