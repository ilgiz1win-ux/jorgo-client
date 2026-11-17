import Constants from 'expo-constants';

// 'admin' — админ колдонмо, 'client' — кардарлар колдонмосу
export const APP_VARIANT: 'admin' | 'client' = Constants.expoConfig?.extra?.variant === 'admin' ? 'admin' : 'client';
