import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SHOP } from '../config/shop';
import { colors, radius } from '../config/theme';
import type { IconName } from '../data/products';
import { Button } from './ui';
import { useT } from '../i18n';

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
  const { t } = useT();
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHead}>
            <Image source={ICON} style={styles.sheetIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{t('install.title')}</Text>
              <Text style={styles.sheetSub}>{t('install.sub')}</Text>
            </View>
          </View>

          {mode === 'ios' && (
            <>
              <Step n={1} icon="export-variant">{t('install.ios1')}</Step>
              <Step n={2} icon="plus-box-outline">{t('install.ios2')}</Step>
              <Step n={3} icon="check-circle-outline">{t('install.ios3')}</Step>
            </>
          )}
          {mode === 'ios-inapp' && (
            <>
              <Text style={styles.note}>{t('install.inappNote')}</Text>
              <Step n={1} icon="dots-horizontal">{t('install.inapp1')}</Step>
              <Step n={2} icon="apple-safari">{t('install.inapp2')}</Step>
              <Step n={3} icon="export-variant">{t('install.inapp3')}</Step>
            </>
          )}
          {mode === 'android' && (
            <>
              <Step n={1} icon="google-chrome">{t('install.and1')}</Step>
              <Step n={2} icon="dots-vertical">{t('install.and2')}</Step>
              <Step n={3} icon="cellphone-arrow-down">{t('install.and3')}</Step>
              {!!SHOP.apkUrl && (
                <Button
                  title={t('install.apk')}
                  icon="android"
                  variant="outline"
                  onPress={() => Linking.openURL(SHOP.apkUrl!).catch(() => {})}
                />
              )}
            </>
          )}
          <Button title={t('install.ok')} onPress={onClose} />
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
  const { t } = useT();
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
        <Text style={styles.bannerTitle}>{t('install.bannerTitle')}</Text>
        <Text style={styles.bannerText}>{t('install.bannerText')}</Text>
      </View>
      <Pressable onPress={install} style={styles.bannerBtn} accessibilityRole="button">
        <Text style={styles.bannerBtnText}>{t('install.bannerBtn')}</Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel={t('common.close')}>
        <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
      </Pressable>
      {sheet && mode !== 'prompt' && <InstallSheet mode={mode} onClose={() => setSheet(false)} />}
    </View>
  );
}

// «Байланыш» барагындагы туруктуу баскыч (жабылбайт)
export function InstallRow() {
  const { t } = useT();
  const mode = useInstallMode();
  const [sheet, setSheet] = useState(false);
  if (!mode) return null;
  return (
    <>
      <Button
        title={t('install.row')}
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
