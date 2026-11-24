import { useEffect, useState } from 'react';
import { isRemote } from '../../config/backend';
import { fetchThreads } from '../../lib/chat';
import { fetchRepairs } from '../../lib/repairs';
import { useUnread } from '../../lib/useUnread';

// Админдин бөлүмдөрүндөгү сандар: окула элек билдирмелер, чат, жаңы оңдоо заказдары (ар 30 секундда)
export function useAdminBadges() {
  const unread = useUnread(isRemote);
  const [chatUnread, setChatUnread] = useState(0);
  const [newRepairs, setNewRepairs] = useState(0);
  useEffect(() => {
      const tick = () => {
        fetchThreads()
          .then((l) => setChatUnread(l.reduce((n, x) => n + x.unread, 0)))
          .catch(() => {});
        fetchRepairs()
          .then((l) => setNewRepairs(l.filter((r) => r.status === 'new').length))
          .catch(() => {});
      };
      tick();
      const id = setInterval(tick, 30000);
      return () => clearInterval(id);
  }, []);
  return { unread, chatUnread, newRepairs };
}
