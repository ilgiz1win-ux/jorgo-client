import { SHOP } from '../config/shop';
import type { Branch } from '../data/content';
import type { TFunc } from '../i18n';
import type { TKey } from '../i18n/ky';

// Точканын аты тандалган тилде: админ өзгөртө элек болсо — котормосу, болбосо админ жазгандай
export function branchLabel(b: Branch, t: TFunc): string {
  const i = SHOP.branches.indexOf(b.name);
  return i >= 0 ? t(`shop.branch.${i}` as TKey) : b.name;
}
