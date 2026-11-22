import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { registerPush } from '../lib/push';

// Колдонмо ачылганда push'ка катталат; билдирмени басканда тиешелүү бетке өтөт
export function PushHandler() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    registerPush();
  }, []);
  useEffect(() => {
    const link = response?.notification.request.content.data?.link;
    if (typeof link === 'string' && link.startsWith('/')) router.push(link as never);
  }, [response]);
  return null;
}
