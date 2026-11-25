import { Platform, useWindowDimensions } from 'react-native';

// Ноутбук / компьютер: кең экран (оператор ноутбук менен иштейт). Телефондо — false.
export const WIDE_MIN = 1000;
export function useWide(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_MIN;
}
