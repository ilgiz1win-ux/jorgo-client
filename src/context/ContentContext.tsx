import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Branch, DEFAULT_SETTINGS, Express, GalleryItem, Master, Review, SiteSettings } from '../data/content';
import { DEFAULT_RENT_TERMS, RentalBike, RentTerms } from '../data/rentals';
import { DEFAULT_BRANCHES, DEFAULT_EXPRESS, fetchBranches, fetchExpress, saveExpress as apiSaveExpress, fetchMasters, fetchRentals, mastersApi, saveBranches as apiSaveBranches, fetchRentTerms, fetchSettings, galleryApi, rentalsApi, reviewsApi, saveRentTerms as apiSaveRentTerms, saveSettings as apiSaveSettings } from '../lib/contentApi';

type ContentContextValue = {
  settings: SiteSettings;
  reviews: Review[];
  gallery: GalleryItem[];
  masters: Master[];
  branches: Branch[];
  express: Express;
  saveExpress: (e: Express) => Promise<void>;
  saveBranches: (b: Branch[]) => Promise<void>;
  rentals: RentalBike[];
  rentTerms: RentTerms;
  refreshContent: () => Promise<void>;
  saveSettings: (s: SiteSettings) => Promise<void>;
  saveReview: (r: Review) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  saveGalleryItem: (g: GalleryItem) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
  saveMaster: (m: Master) => Promise<void>;
  deleteMaster: (id: string) => Promise<void>;
  saveRental: (b: RentalBike) => Promise<void>;
  deleteRental: (id: string) => Promise<void>;
  saveRentTerms: (t: RentTerms) => Promise<void>;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [express, setExpress] = useState<Express>(DEFAULT_EXPRESS);
  const [rentals, setRentals] = useState<RentalBike[]>([]);
  const [rentTerms, setRentTerms] = useState<RentTerms>(DEFAULT_RENT_TERMS);

  const refreshContent = useCallback(async () => {
    const [s, r, g, rb, rt, ms] = await Promise.all([fetchSettings(), reviewsApi.fetch(), galleryApi.fetch(), fetchRentals(), fetchRentTerms(), fetchMasters()]);
    setMasters(ms);
    fetchBranches().then(setBranches).catch(() => {});
    fetchExpress().then(setExpress).catch(() => {});
    setSettings(s);
    setReviews(r);
    setGallery(g);
    setRentals(rb);
    setRentTerms(rt);
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const value = useMemo<ContentContextValue>(
    () => ({
      settings,
      reviews,
      gallery,
      masters,
      branches,
      express,
      saveExpress: async (e) => setExpress(await apiSaveExpress(e)),
      saveBranches: async (b) => setBranches(await apiSaveBranches(b)),
      rentals,
      rentTerms,
      refreshContent,
      saveSettings: async (s) => setSettings(await apiSaveSettings(s)),
      saveReview: async (r) => setReviews(await reviewsApi.save(r, reviews)),
      deleteReview: async (id) => setReviews(await reviewsApi.remove(id, reviews)),
      saveGalleryItem: async (g) => setGallery(await galleryApi.save(g, gallery)),
      deleteGalleryItem: async (id) => setGallery(await galleryApi.remove(id, gallery)),
      saveMaster: async (m) => setMasters(await mastersApi.save(m, masters)),
      deleteMaster: async (id) => setMasters(await mastersApi.remove(id, masters)),
      saveRental: async (b) => setRentals(await rentalsApi.save(b, rentals)),
      deleteRental: async (id) => setRentals(await rentalsApi.remove(id, rentals)),
      saveRentTerms: async (t) => setRentTerms(await apiSaveRentTerms(t)),
    }),
    [settings, reviews, gallery, masters, branches, express, rentals, rentTerms, refreshContent],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used inside ContentProvider');
  return ctx;
}
