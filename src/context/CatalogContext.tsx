import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Product, PRODUCTS, Promo } from '../data/products';
import { RepairService, SERVICES } from '../data/services';
import { isRemote } from '../config/backend';
import * as api from '../lib/catalogApi';

type CatalogContextValue = {
  products: Product[];
  promos: Promo[];
  services: RepairService[];
  loading: boolean;
  refresh: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  // Админ аракеттери
  saveProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  seedProducts: () => Promise<void>;
  savePromo: (p: Promo) => Promise<void>;
  deletePromo: (id: string) => Promise<void>;
  saveService: (s: RepairService) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  // Сервер туташкан болсо мисал товарларды көрсөтпөйбүз: адегенде акыркы сакталган
  // тизме (же скелет), анан серверден жаңысы
  const [products, setProducts] = useState<Product[]>(isRemote ? [] : PRODUCTS);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [services, setServices] = useState<RepairService[]>(SERVICES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, pr, sv] = await Promise.all([api.fetchProducts(), api.fetchPromos(), api.fetchServices()]);
    setProducts(p);
    setPromos(pr);
    setServices(sv);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isRemote) {
      api.readCachedProducts().then((cached) => {
        if (cached?.length) setProducts((cur) => (cur.length ? cur : cached));
      });
    }
    refresh();
  }, [refresh]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      promos,
      services,
      loading,
      refresh,
      getProduct: (id) => products.find((p) => p.id === id),
      saveProduct: async (p) => setProducts(await api.saveProduct(p, products)),
      deleteProduct: async (id) => setProducts(await api.deleteProduct(id, products)),
      seedProducts: async () => setProducts(await api.seedProducts()),
      savePromo: async (p) => setPromos(await api.savePromo(p, promos)),
      deletePromo: async (id) => setPromos(await api.deletePromo(id, promos)),
      saveService: async (sv) => setServices(await api.saveService(sv, services)),
      deleteService: async (id) => setServices(await api.deleteService(id, services)),
    }),
    [products, promos, services, loading, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}
