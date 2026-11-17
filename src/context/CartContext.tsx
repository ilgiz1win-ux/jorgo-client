import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../data/products';
import { useCatalog } from './CatalogContext';

type CartLine = { product: Product; qty: number };

export type Order = {
  id: string;
  date: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  customer: string;
  phone: string;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  orders: Order[];
  addOrder: (o: Order) => void;
};

const CART_KEY = 'jorgo.cart';
const ORDERS_KEY = 'jorgo.orders';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { getProduct } = useCatalog();
  const [items, setItems] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, o] = await Promise.all([AsyncStorage.getItem(CART_KEY), AsyncStorage.getItem(ORDERS_KEY)]);
        if (c) setItems(JSON.parse(c));
        if (o) setOrders(JSON.parse(o));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders)).catch(() => {});
  }, [orders, loaded]);

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.entries(items)
      .map(([id, qty]) => ({ product: getProduct(id)!, qty }))
      .filter((l) => l.product && l.qty > 0);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.product.price, 0),
      add: (id, qty = 1) => setItems((p) => ({ ...p, [id]: (p[id] ?? 0) + qty })),
      setQty: (id, qty) =>
        setItems((p) => {
          const n = { ...p };
          if (qty <= 0) delete n[id];
          else n[id] = qty;
          return n;
        }),
      remove: (id) =>
        setItems((p) => {
          const n = { ...p };
          delete n[id];
          return n;
        }),
      clear: () => setItems({}),
      orders,
      addOrder: (o) => setOrders((p) => [o, ...p]),
    };
  }, [items, orders, getProduct]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
