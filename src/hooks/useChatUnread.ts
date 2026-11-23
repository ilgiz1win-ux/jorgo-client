import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAccount } from '../context/AccountContext';
import { myChatUnread } from '../lib/chat';

// Админ жазып, кардар окуй элек жооптордун саны (экран ачылганда жаңыланат)
export function useChatUnread(): number {
  const { profile } = useAccount();
  const [n, setN] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!profile) return setN(0);
      let alive = true;
      const tick = () => myChatUnread(profile.id).then((v) => alive && setN(v)).catch(() => {});
      tick();
      const id = setInterval(tick, 20000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [profile]),
  );
  return n;
}
