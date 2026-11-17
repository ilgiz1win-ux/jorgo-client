// Бир коддон эки колдонмо чыгат:
//   кардарлар үчүн:  npx expo start
//   админ үчүн:      APP_VARIANT=admin npx expo start
const IS_ADMIN = process.env.APP_VARIANT === 'admin';

module.exports = ({ config }) => {
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
