import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { unreadCount } from './notifications';

// Окулбаган билдирмелердин саны: экран ачылганда жана ар 60 секундда жаңыланат
export function useUnread(enabled = true) {
  const [n, setN] = useState(0);
  const load = useCallback(() => {
    if (enabled) unreadCount().then(setN).catch(() => {});
    else setN(0);
  }, [enabled]);
  useFocusEffect(load);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [enabled, load]);
  return n;
}
