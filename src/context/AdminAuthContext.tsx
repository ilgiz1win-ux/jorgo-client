import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { LOCAL_ADMIN_PIN } from '../config/backend';
import { supabase } from '../lib/supabase';
import { markAdminDevice } from '../lib/analytics';
import { checkIsAdmin } from '../lib/account';

type AdminAuth = {
  ready: boolean;
  authed: boolean;
  // Кирген, бирок админ эмес (кардар аккаунту)
  notAdmin: boolean;
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
  const [notAdmin, setNotAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Сессия бар болсо да, админдер тизмесинде барбы — текшеребиз
    const apply = async (hasSession: boolean, mail: string | null) => {
      const admin = hasSession ? await checkIsAdmin() : false;
      setAuthed(hasSession && admin);
      setNotAdmin(hasSession && !admin);
      setEmail(mail);
      if (hasSession && admin) markAdminDevice();
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => apply(!!data.session, data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') apply(!!session, session?.user.email ?? null);
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
    if (!error) {
      if (!(await checkIsAdmin())) {
        await supabase.auth.signOut();
        return 'Бул аккаунт админ эмес. Админдин email жана сырсөзүн жазыңыз.';
      }
      return null;
    }
    const msg = error.message.toLowerCase();
    if (msg.includes('not confirmed')) return 'Email ырастала элек. Supabase → Authentication → Users бөлүмүндө колдонуучуну ырастаңыз.';
    if (msg.includes('invalid login')) return 'Email же сырсөз туура эмес';
    if (msg.includes('fetch') || msg.includes('network')) return 'Серверге туташуу болбоду. Интернетти текшериңиз.';
    return `Кирүү болбоду: ${error.message}`;
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthed(false);
    setNotAdmin(false);
    setEmail(null);
  };

  return <Ctx.Provider value={{ ready, authed, notAdmin, email, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
