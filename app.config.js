// Бир коддон эки колдонмо чыгат:
//   кардарлар үчүн:  npx expo start
//   админ үчүн:      APP_VARIANT=admin npx expo start
const IS_ADMIN = process.env.APP_VARIANT === 'admin';

// Сайт подпапкада жайгашса (мисалы GitHub Pages: /jorgo-client)
const BASE_URL = process.env.EXPO_BASE_URL || '';

module.exports = ({ config: base }) => {
  const config = BASE_URL ? { ...base, experiments: { ...base.experiments, baseUrl: BASE_URL } } : base;
  if (!IS_ADMIN) return { ...config, extra: { ...config.extra, variant: 'client' } };
  return {
    ...config,
    name: 'Jorgo Админ',
    scheme: 'jorgo-admin',
    ios: { ...config.ios, bundleIdentifier: 'kg.jorgo.admin' },
    android: {
      ...config.android,
      package: 'kg.jorgo.admin',
      adaptiveIcon: { ...config.android.adaptiveIcon, backgroundColor: '#1E293B' },
    },
    extra: { ...config.extra, variant: 'admin' },
  };
};
