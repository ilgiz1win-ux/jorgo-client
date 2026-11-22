import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../lib/account';
import type { AuthError, DocKind, Profile } from '../lib/account';
import { registerPush } from '../lib/push';
import { supabase } from '../lib/supabase';

type Account = {
  ready: boolean;
  profile: Profile | null;
  signIn: (phone: string, password: string) => Promise<AuthError | null>;
  signUp: (phone: string, password: string, name: string) => Promise<AuthError | null>;
  sendEmailCode: (email: string) => Promise<AuthError | null>;
  verifyEmailCode: (email: string, code: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  save: (p: Profile) => Promise<void>;
  uploadDoc: (kind: DocKind, source: 'camera' | 'library') => Promise<boolean>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Account | null>(null);

// Ижара үчүн маалымат даярбы: аты-жөнү, телефону, селфи, паспорт (сүрөтү жана номери), эки тууганы
export const docsReady = (p: Profile | null) =>
  !!p && p.fullName.trim().length > 1 && p.phone.replace(/\D/g, '').length >= 9 && !!p.selfiePath && !!p.passportPath && p.passportNo.trim().length >= 5 && api.relativesReady(p.relatives);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const id = await api.currentUserId();
    if (!id) {
      setProfile(null);
      setReady(true);
      return;
    }
    registerPush();
    try {
      setProfile(await api.fetchProfile(id));
    } catch {
      setProfile((p) => p ?? api.emptyProfile(id));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<Account>(
    () => ({
      ready,
      profile,
      signIn: async (phone, password) => {
        const e = await api.signIn(phone, password);
        if (!e) await load();
        return e;
      },
      signUp: async (phone, password, name) => {
        const e = await api.signUp(phone, password, name);
        if (!e) await load();
        return e;
      },
      sendEmailCode: (email) => api.sendEmailCode(email),
      verifyEmailCode: async (email, code) => {
        const e = await api.verifyEmailCode(email, code);
        if (!e) await load();
        return e;
      },
      signOut: async () => {
        await api.signOut();
        setProfile(null);
      },
      save: async (p) => setProfile(await api.saveProfile(p)),
      uploadDoc: async (kind, source) => {
        if (!profile) return false;
        const path = await api.pickAndUploadDoc(profile.id, kind, source);
        if (!path) return false;
        const key = api.docPathKey(kind);
        const old = profile[key];
        const next = await api.saveProfile({ ...profile, [key]: path });
        setProfile(next);
        if (old && old !== path) api.removeDoc(old).catch(() => {});
        return true;
      },
      deleteAccount: async () => {
        if (!profile) return;
        await api.deleteAccount(profile);
        setProfile(null);
      },
      refresh: load,
    }),
    [ready, profile, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
