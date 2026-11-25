import { useContent } from '../context/ContentContext';
import { RENT_MIN_DAYS } from '../data/rentals';
import { useT } from '../i18n';
import { formatPrice } from '../lib/format';

export const DEFAULT_RULE_KEYS = ['rd.r1', 'rd.r2', 'rd.r3', 'rd.r4', 'rd.r5', 'rd.r9', 'rd.r6', 'rd.r7', 'rd.r8', 'rd.r10'] as const;

// Ижаранын шарттары: админ жазса — ошол (ар бир сап бир шарт), жазбаса — даяр шарттар.
// daily — велосипеддин күндүк баасы (даяр шарттарда көрсөтүлөт).
export function useRentRules(daily?: number): { rules: string[]; custom: boolean } {
  const { t } = useT();
  const { rentTerms } = useContent();
  const lines = rentTerms.text
    .split('\n')
    .map((l) => l.replace(/^[•\-*\s]+/, '').trim())
    .filter(Boolean);
  if (lines.length) return { rules: lines, custom: true };
  return { rules: DEFAULT_RULE_KEYS.map((k) => t(k, { n: RENT_MIN_DAYS, v: daily ? formatPrice(daily) : t('rd.dailyPrice') })), custom: false };
}
