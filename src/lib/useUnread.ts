import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { unseenBroadcasts } from './broadcasts';
import { unreadCount } from './notifications';

// Окулбаган билдирмелердин саны: экран ачылганда жана ар 60 секундда жаңыланат.
// withBroadcasts — жалпы жаңылыктарды да кошуп эсептөө (кардарлар үчүн).
export function useUnread(enabled = true, withBroadcasts = false, personal = true) {
  const [n, setN] = useState(0);
  const load = useCallback(() => {
    if (!enabled) return setN(0);
    Promise.all([personal ? unreadCount().catch(() => 0) : Promise.resolve(0), withBroadcasts ? unseenBroadcasts() : Promise.resolve(0)]).then(([a, b]) => setN(a + b));
  }, [enabled, withBroadcasts, personal]);
  useFocusEffect(load);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [enabled, load]);
  return n;
}
