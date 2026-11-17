// 自检截图：构建 → vite preview → Playwright 无头浏览器截 俯视/环绕/门口 三张图到 screenshots/
// 用法：npm run build && npm run shots
// 依赖本机已装的 playwright（不写进 package.json，CI 不需要）
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}

const server = await preview({ preview: { port: 4173, strictPort: false } });
const base = server.resolvedUrls.local[0];
console.log('预览地址', base);
mkdirSync('screenshots', { recursive: true });

const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

// [文件名, 查询参数]
const SHOTS = [
  ['top', 'view=top'],
  ['orbit', 'view=orbit'],
  ['walk', 'view=walk'],
  // 额外视角：从西北屋门口看进室内、从厨房门口看进室内、北屋门前看梧桐和压水井
  ['inside-northwest', 'view=orbit&cam=-0.5,2.2,-4.45,-6,0.6,-8.5'],
  ['inside-northeast', 'view=orbit&cam=7.1,2.2,-4.45,1,0.6,-8.5'],
  ['inside-kitchen', 'view=orbit&cam=-4.9,1.7,2.6,-7,0.5,-1.6'],
  ['gate-from-yard', 'view=orbit&cam=-2.5,1.6,2.5,-7.3,1,6.5'],
  ['yard-from-steps', 'view=orbit&cam=0.5,1.8,-3.3,1,1.2,4'],
];
for (const [view, query] of SHOTS) {
  await page.goto(`${base}?${query}`);
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 30000 }).catch((e) => {
    console.log(problems.join('\n'));
    throw e;
  });
  await page.waitForTimeout(500);
  const file = `screenshots/${view}.png`;
  await page.screenshot({ path: file });
  // 简单黑屏检测：抽样像素亮度
  const avg = await page.evaluate(() => {
    const { renderer, scene, camera } = window.__app.engine;
    renderer.render(scene, camera); // 同一任务内重画一次，保证能读到画布像素
    const c = renderer.domElement;
    const g = document.createElement('canvas');
    g.width = 64; g.height = 40;
    const ctx = g.getContext('2d');
    ctx.drawImage(c, 0, 0, 64, 40);
    const d = ctx.getImageData(0, 0, 64, 40).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
    return s / (d.length / 4) / 3;
  });
  console.log(`${file}  平均亮度 ${avg.toFixed(1)}${avg < 10 ? '  ⚠ 疑似黑屏' : ''}`);
}

await browser.close();
server.httpServer.close();
if (problems.length) {
  console.log('页面报错：\n' + problems.join('\n'));
  process.exit(1);
}
console.log('无报错');
