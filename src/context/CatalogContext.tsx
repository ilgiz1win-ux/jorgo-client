import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Product, PRODUCTS, Promo } from '../data/products';
import * as api from '../lib/catalogApi';

type CatalogContextValue = {
  products: Product[];
  promos: Promo[];
  loading: boolean;
  refresh: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  // Админ аракеттери
  saveProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  seedProducts: () => Promise<void>;
  savePromo: (p: Promo) => Promise<void>;
  deletePromo: (id: string) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, pr] = await Promise.all([api.fetchProducts(), api.fetchPromos()]);
    setProducts(p);
    setPromos(pr);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      promos,
      loading,
      refresh,
      getProduct: (id) => products.find((p) => p.id === id),
      saveProduct: async (p) => setProducts(await api.saveProduct(p, products)),
      deleteProduct: async (id) => setProducts(await api.deleteProduct(id, products)),
      seedProducts: async () => setProducts(await api.seedProducts()),
      savePromo: async (p) => setPromos(await api.savePromo(p, promos)),
      deletePromo: async (id) => setPromos(await api.deletePromo(id, promos)),
    }),
    [products, promos, loading, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}
