// Веб-сайтты чогултат: `npm run build:web`
// BASE_URL — сайт жайгашкан жол (GitHub Pages үчүн /jorgo-client), SITE_URL — толук дареги.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const out = path.resolve(__dirname, '..', 'dist');

// Админ панель өзүнчө сайт: <BASE_URL>/panel (кардарлардын колдонмосунда админге жол жок)
const PANEL = `${BASE_URL}/panel`;

function build(dir, base, extraEnv) {
  fs.rmSync(dir, { recursive: true, force: true });
  execSync(`npx expo export --platform web --output-dir ${path.relative(process.cwd(), dir) || dir}`, {
    stdio: 'inherit',
    env: { ...process.env, EXPO_BASE_URL: base, ...extraEnv },
  });
  const indexPath = path.join(dir, 'index.html');
  const html = fs
    .readFileSync(indexPath, 'utf8')
    .replaceAll('%BASE_URL%', base)
    .replaceAll('%SITE_URL%', (SITE_URL || BASE_URL) + base.slice(BASE_URL.length));
  fs.writeFileSync(indexPath, html);
  return html;
}

// 1) Кардарлардын сайты
const html = build(out, BASE_URL, { APP_VARIANT: 'client' });

// 2) Админ панель
const panelTmp = path.resolve(__dirname, '..', 'dist-panel');
const panelHtml = build(panelTmp, PANEL, { APP_VARIANT: 'admin' }).replace(/<title>[^<]*<\/title>/, '<title>Jorgo Админ</title>');
fs.writeFileSync(path.join(panelTmp, 'index.html'), panelHtml);
fs.cpSync(panelTmp, path.join(out, 'panel'), { recursive: true });
fs.rmSync(panelTmp, { recursive: true, force: true });

// GitHub Pages: ар кандай дарек (мисалы /product/123) колдонмону ачсын.
// /panel/... даректери админ панелдин башкы бетине өтөт.
const redirect = `<script>(function(){var p=location.pathname;if(p.indexOf(${JSON.stringify(PANEL + '/')})===0&&p!==${JSON.stringify(PANEL + '/')}){location.replace(${JSON.stringify(PANEL + '/')});}})();</script>`;
fs.writeFileSync(path.join(out, '404.html'), html.replace('<head>', '<head>' + redirect));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`\nДаяр: ${out} (сайт: "${BASE_URL || '/'}", админ: "${PANEL}/")`);
