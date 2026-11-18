// Бир коддон эки колдонмо чыгат:
//   кардарлар үчүн:  npx expo start
//   админ үчүн:      APP_VARIANT=admin npx expo start
const IS_ADMIN = process.env.APP_VARIANT === 'admin';

// Сайт подпапкада жайгашса (мисалы GitHub Pages: /jorgo-client)
const BASE_URL = process.env.EXPO_BASE_URL || '';

// expo.dev долбоору (APK чогултуу үчүн). GitHub'та Settings → Secrets and variables →
// Actions → Variables бөлүмүнө EAS_PROJECT_ID жана EXPO_OWNER кошулат.
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '';
const EXPO_OWNER = process.env.EXPO_OWNER || '';

module.exports = ({ config: base }) => {
  let config = BASE_URL ? { ...base, experiments: { ...base.experiments, baseUrl: BASE_URL } } : base;
  if (EAS_PROJECT_ID) {
    config = {
      ...config,
      ...(EXPO_OWNER && { owner: EXPO_OWNER }),
      extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } },
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
