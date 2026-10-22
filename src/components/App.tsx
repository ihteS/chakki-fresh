'use client';
import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
import Toast from './ui/Toast';
import BottomNav from './ui/BottomNav';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import BrowseScreen from './screens/BrowseScreen';
import BuilderScreen from './screens/BuilderScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrdersScreen from './screens/OrdersScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import BlendsScreen from './screens/BlendsScreen';
import AddressesScreen from './screens/AddressesScreen';
import AdminScreen from './screens/AdminScreen';

const NO_NAV = ['auth','builder','cart','checkout','order','blends','addresses','admin'];

export default function App() {
  const store = useStore();
  const { screen, screenParam, go, goBack, user, setUser, cart, addToCart, removeFromCart, updateCartQty, clearCart, toast, toastMsg, toastVisible } = store;

  useEffect(() => {
    const uid = localStorage.getItem('cf_uid');
    if (!uid) return;
    supabase.from('users').select('*').eq('id', uid).single().then(({ data }) => {
      if (data) { setUser({ id: data.id, full_name: data.full_name, email: data.email, phone: data.phone }); go('home'); }
    });
  }, []);

  const props = { go, goBack, user, setUser, cart, addToCart, removeFromCart, updateCartQty, clearCart, toast, screenParam };

  return (
    <div id="app-shell">
      <Toast message={toastMsg} visible={toastVisible} />
      {screen === 'auth' && <AuthScreen {...props} />}
      {screen === 'home' && <HomeScreen {...props} />}
      {screen === 'browse' && <BrowseScreen {...props} />}
      {screen === 'builder' && <BuilderScreen {...props} />}
      {screen === 'cart' && <CartScreen {...props} />}
      {screen === 'checkout' && <CheckoutScreen {...props} />}
      {screen === 'orders' && <OrdersScreen {...props} />}
      {screen === 'order' && <OrderDetailScreen {...props} />}
      {screen === 'profile' && <ProfileScreen {...props} />}
      {screen === 'blends' && <BlendsScreen {...props} />}
      {screen === 'addresses' && <AddressesScreen {...props} />}
      {screen === 'admin' && <AdminScreen {...props} />}
      {!NO_NAV.includes(screen) && <BottomNav screen={screen} go={go} cartCount={cart.length} />}
    </div>
  );
}
