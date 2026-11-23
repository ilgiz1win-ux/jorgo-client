import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from '../context/AccountContext';
import { myMasterId } from '../lib/repairs';

// Кирген колдонуучу мастерби (панели ачык болсо гана)
export function useIsMaster(refreshOnFocus = false): boolean {
  const { profile } = useAccount();
  const [isMaster, setIsMaster] = useState(false);
  const check = useCallback(() => {
    if (!profile) return setIsMaster(false);
    myMasterId(profile.id)
      .then((m) => setIsMaster(!!m))
      .catch(() => setIsMaster(false));
  }, [profile]);
  useEffect(check, [check]);
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) check();
    }, [refreshOnFocus, check]),
  );
  return isMaster;
}
