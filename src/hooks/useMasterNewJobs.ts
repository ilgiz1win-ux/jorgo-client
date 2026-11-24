import { useEffect, useState } from 'react';
import { fetchRepairs } from '../lib/repairs';

// Мастер үчүн: алына элек жаңы заказдардын саны (өзүнө түшкөн же точкасындагы бош), ар 30 сек жаңыланат
export function useMasterNewJobs(isMaster: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!isMaster) return setN(0);
    let alive = true;
    const tick = () =>
      fetchRepairs()
        .then((l) => alive && setN(l.filter((r) => r.status === 'new').length))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isMaster]);
  return n;
}
