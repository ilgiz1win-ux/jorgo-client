import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { LOCAL_ADMIN_PIN } from '../config/backend';
import { supabase } from '../lib/supabase';

type AdminAuth = {
  ready: boolean;
  authed: boolean;
  email: string | null;
  // Supabase: email + сырсөз. Жергиликтүү режим: password = PIN.
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [email, setEmail] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login: AdminAuth['login'] = async (mail, password) => {
    if (!supabase) {
      if (password === LOCAL_ADMIN_PIN) {
        setAuthed(true);
        setEmail('admin');
        return null;
      }
      return 'PIN-код туура эмес';
    }
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim().toLowerCase(), password });
    if (!error) return null;
    const msg = error.message.toLowerCase();
    if (msg.includes('not confirmed')) return 'Email ырастала элек. Supabase → Authentication → Users бөлүмүндө колдонуучуну ырастаңыз.';
    if (msg.includes('invalid login')) return 'Email же сырсөз туура эмес';
    if (msg.includes('fetch') || msg.includes('network')) return 'Серверге туташуу болбоду. Интернетти текшериңиз.';
    return `Кирүү болбоду: ${error.message}`;
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthed(false);
    setEmail(null);
  };

  return <Ctx.Provider value={{ ready, authed, email, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
