// Бир коддон эки колдонмо чыгат:
//   кардарлар үчүн:  npx expo start
//   админ үчүн:      APP_VARIANT=admin npx expo start
const IS_ADMIN = process.env.APP_VARIANT === 'admin';

// Сайт подпапкада жайгашса (мисалы GitHub Pages: /jorgo-client)
const BASE_URL = process.env.EXPO_BASE_URL || '';

// expo.dev долбоору (APK чогултуу үчүн). Булар жашыруун эмес.
// Жашыруун EXPO_TOKEN GitHub'тагы Secrets'те гана сакталат.
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || 'ff335892-10cf-4e29-9c06-038c68f06309';
const EXPO_OWNER = process.env.EXPO_OWNER || 'ilgiz001s-team';
const EAS_SLUG = process.env.EAS_SLUG || 'jorgo-client-';

module.exports = ({ config: base }) => {
  let config = BASE_URL ? { ...base, experiments: { ...base.experiments, baseUrl: BASE_URL } } : base;
  if (EAS_PROJECT_ID) {
    config = {
      ...config,
      ...(EXPO_OWNER && { owner: EXPO_OWNER }),
      // expo.dev'деги долбоордун slug'ы менен дал келиши керек
      slug: EAS_SLUG,
      extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } },
      // Абадан жаңылоо (EAS Update): JS өзгөртүүлөрү колдонмо кийинки ачылганда өзү жүктөлөт.
      // Версия (app.json → version) өзгөрмөйүнчө жаңы APK керек эмес.
      runtimeVersion: { policy: 'appVersion' },
      updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}`, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 },
    };
  }
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
