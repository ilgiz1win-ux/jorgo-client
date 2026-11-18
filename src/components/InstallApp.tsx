import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SHOP } from '../config/shop';
import { colors, radius } from '../config/theme';
import type { IconName } from '../data/products';
import { Button } from './ui';

const ICON = require('../../assets/icon.png');
const DISMISS_KEY = 'jorgo.installDismissed';
const DISMISS_DAYS = 7;

type Mode = 'prompt' | 'ios' | 'ios-inapp' | 'android' | null;

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window {
    __jorgoInstall?: InstallEvent | null;
  }
}

// Сайт азыр колдонмо катары ачылганбы (башкы экрандан)
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detectMode(): Mode {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || isStandalone()) return null;
  if (window.__jorgoInstall) return 'prompt';
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Instagram, Facebook, WhatsApp, Telegram'дын ичиндеги браузер башкы экранга кошо албайт
  const inApp = /Instagram|FBAN|FBAV|WhatsApp|Telegram|Line\//i.test(ua);
  if (ios) return inApp ? 'ios-inapp' : 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
}

function useInstallMode() {
  const [mode, setMode] = useState<Mode>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setMode(detectMode());
    const onReady = () => setMode(detectMode());
    const onInstalled = () => setMode(null);
    window.addEventListener('jorgo-install-ready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('jorgo-install-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return mode;
}

async function runPrompt() {
  const ev = window.__jorgoInstall;
  if (!ev) return false;
  await ev.prompt();
  await ev.userChoice.catch(() => null);
  window.__jorgoInstall = null;
  return true;
}

function Step({ n, icon, children }: { n: number; icon: IconName; children: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
    </View>
  );
}

// Кадамдарды көрсөткөн терезе
function InstallSheet({ mode, onClose }: { mode: Exclude<Mode, null>; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Жабуу">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHead}>
            <Image source={ICON} style={styles.sheetIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Jorgo колдонмосун орнотуу</Text>
              <Text style={styles.sheetSub}>Акысыз, 1 мүнөт</Text>
            </View>
          </View>

          {mode === 'ios' && (
            <>
              <Step n={1} icon="export-variant">Ылдыйдагы «Поделиться» баскычын басыңыз</Step>
              <Step n={2} icon="plus-box-outline">«На экран Домой» тандаңыз</Step>
              <Step n={3} icon="check-circle-outline">Жогору жактагы «Добавить» басыңыз</Step>
            </>
          )}
          {mode === 'ios-inapp' && (
            <>
              <Text style={styles.note}>Бул браузерден колдонмо орнотулбайт. Адегенде сайтты Safari'де ачыңыз:</Text>
              <Step n={1} icon="dots-horizontal">Жогорку бурчтагы «⋯» баскычын басыңыз</Step>
              <Step n={2} icon="apple-safari">«Открыть в Safari» (же «Открыть в браузере») тандаңыз</Step>
              <Step n={3} icon="export-variant">Safari'де «Поделиться» → «На экран Домой»</Step>
            </>
          )}
          {mode === 'android' && (
            <>
              <Step n={1} icon="google-chrome">Сайтты Chrome'до ачыңыз</Step>
              <Step n={2} icon="dots-vertical">Жогорку бурчтагы «⋮» менюну басыңыз</Step>
              <Step n={3} icon="cellphone-arrow-down">«Установить приложение» же «Добавить на главный экран»</Step>
              {!!SHOP.apkUrl && (
                <Button
                  title="Же APK файлды жүктөп алуу"
                  icon="android"
                  variant="outline"
                  onPress={() => Linking.openURL(SHOP.apkUrl!).catch(() => {})}
                />
              )}
            </>
          )}
          <Button title="Түшүндүм" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function wasDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

// Башкы беттеги баннер: «Колдонмону орнотуу». Колдонмо орнотулган болсо же
// кардар жапса (7 күнгө), көрүнбөйт. Телефондогу колдонмодо (APK) эч качан көрүнбөйт.
export function InstallBanner() {
  const mode = useInstallMode();
  const [hidden, setHidden] = useState(true);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (mode) setHidden(wasDismissed());
  }, [mode]);

  if (!mode || hidden) return null;

  const install = async () => {
    if (mode === 'prompt') {
      await runPrompt();
      setHidden(true);
    } else setSheet(true);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  };

  return (
    <View style={styles.banner}>
      <Image source={ICON} style={styles.bannerIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Колдонмону орнотуңуз</Text>
        <Text style={styles.bannerText}>Телефонуңуздан бир басуу менен ачылат</Text>
      </View>
      <Pressable onPress={install} style={styles.bannerBtn} accessibilityRole="button">
        <Text style={styles.bannerBtnText}>Орнотуу</Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Жабуу">
        <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
      </Pressable>
      {sheet && mode !== 'prompt' && <InstallSheet mode={mode} onClose={() => setSheet(false)} />}
    </View>
  );
}

// «Байланыш» барагындагы туруктуу баскыч (жабылбайт)
export function InstallRow() {
  const mode = useInstallMode();
  const [sheet, setSheet] = useState(false);
  if (!mode) return null;
  return (
    <>
      <Button
        title="Колдонмону телефонго орнотуу"
        icon="cellphone-arrow-down"
        variant="outline"
        onPress={async () => {
          if (mode === 'prompt') await runPrompt();
          else setSheet(true);
        }}
      />
      {sheet && mode !== 'prompt' && <InstallSheet mode={mode} onClose={() => setSheet(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  bannerIcon: { width: 42, height: 42, borderRadius: 10 },
  bannerTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
  bannerText: { color: colors.muted, fontSize: 12, marginTop: 1 },
  bannerBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  bannerBtnText: { color: '#fff', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  sheetSub: { color: colors.muted, marginTop: 2 },
  note: { color: colors.text, lineHeight: 20 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '900' },
  stepText: { flex: 1, color: colors.text, fontSize: 15 },
});
