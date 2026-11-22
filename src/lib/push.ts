import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Телефонго келүүчү push-билдирмелер (APK/iOS колдонмодо гана; сайтта иштебейт)

if (Platform.OS !== 'web') {
  // Колдонмо ачык турганда да билдирме жогору жактан чыксын
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

let lastToken: string | null = null;

// Уруксат сурап, токенди серверге жазат. Кардар кирген соң кайра чакырылат — токен аккаунтка байланат.
export async function registerPush(): Promise<void> {
  if (Platform.OS === 'web' || !supabase) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Jorgo',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#2E7D32',
      });
    }
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!lastToken) lastToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await supabase.rpc('register_push_token', { p_token: lastToken, p_platform: Platform.OS });
  } catch {
    // Firebase (FCM) жөндөлбөсө же интернет жок болсо — колдонмонун ичиндеги билдирмелер иштей берет
  }
}
