// Веб-сайтты чогултат: `npm run build:web`
// BASE_URL — сайт жайгашкан жол (GitHub Pages үчүн /jorgo-client), SITE_URL — толук дареги.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const out = path.resolve(__dirname, '..', 'dist');

execSync('npx expo export --platform web --output-dir dist', {
  stdio: 'inherit',
  env: { ...process.env, EXPO_BASE_URL: BASE_URL },
});

const indexPath = path.join(out, 'index.html');
const html = fs
  .readFileSync(indexPath, 'utf8')
  .replaceAll('%BASE_URL%', BASE_URL)
  .replaceAll('%SITE_URL%', SITE_URL || BASE_URL);
fs.writeFileSync(indexPath, html);
// GitHub Pages: ар кандай дарек (мисалы /product/123) колдонмону ачсын
fs.writeFileSync(path.join(out, '404.html'), html);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`\nДаяр: ${out} (BASE_URL="${BASE_URL || '/'}")`);
