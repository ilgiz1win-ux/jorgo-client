import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, GalleryItem, Review, SiteSettings } from '../data/content';
import { fetchSettings, galleryApi, reviewsApi, saveSettings as apiSaveSettings } from '../lib/contentApi';

type ContentContextValue = {
  settings: SiteSettings;
  reviews: Review[];
  gallery: GalleryItem[];
  refreshContent: () => Promise<void>;
  saveSettings: (s: SiteSettings) => Promise<void>;
  saveReview: (r: Review) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  saveGalleryItem: (g: GalleryItem) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const refreshContent = useCallback(async () => {
    const [s, r, g] = await Promise.all([fetchSettings(), reviewsApi.fetch(), galleryApi.fetch()]);
    setSettings(s);
    setReviews(r);
    setGallery(g);
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const value = useMemo<ContentContextValue>(
    () => ({
      settings,
      reviews,
      gallery,
      refreshContent,
      saveSettings: async (s) => setSettings(await apiSaveSettings(s)),
      saveReview: async (r) => setReviews(await reviewsApi.save(r, reviews)),
      deleteReview: async (id) => setReviews(await reviewsApi.remove(id, reviews)),
      saveGalleryItem: async (g) => setGallery(await galleryApi.save(g, gallery)),
      deleteGalleryItem: async (id) => setGallery(await galleryApi.remove(id, gallery)),
    }),
    [settings, reviews, gallery, refreshContent],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used inside ContentProvider');
  return ctx;
}
