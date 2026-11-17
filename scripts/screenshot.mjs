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
page.setDefaultTimeout(180000);
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
  ['north-door', 'view=orbit&cam=-3.5,1.3,-0.9,-4.7,1.6,-4'],
  ['well-pomegranate', 'view=orbit&cam=3.2,1.3,0.6,1.6,0.9,-1.1'],
  ['jujube-garden', 'view=orbit&cam=1.2,1.4,6.8,5,1.6,1.5'],
  ['paulownia-under', 'view=orbit&cam=-0.5,1.2,2.5,-2.9,5.5,-1.4'],
  ['gate-from-yard', 'view=orbit&cam=-2.5,1.6,2.5,-7.3,1,6.5'],
  ['yard-from-steps', 'view=orbit&cam=0.5,1.8,-3.3,1,1.2,4'],
];
// 可只截部分：npm run shots -- walk orbit
const only = process.argv.slice(2);
for (const [view, query] of SHOTS.filter(([n]) => !only.length || only.includes(n))) {
  // 无头浏览器用软件渲染，偶尔导航超时：失败就重试一次
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(`${base}?${query}`, { waitUntil: 'commit', timeout: 120000 });
      await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 300000 });
      break;
    } catch (e) {
      if (attempt >= 1) throw e;
      console.log(`${view} 超时，重试一次`);
    }
  }

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
  const ms = await page.evaluate(() => window.__app.buildMs);
  console.log(`${file}  平均亮度 ${avg.toFixed(1)}${avg < 10 ? '  ⚠ 疑似黑屏' : ''}  场景生成 ${ms} ms`);
}

await browser.close();
server.httpServer.close();
if (problems.length) {
  console.log('页面报错：\n' + problems.join('\n'));
  process.exit(1);
}
console.log('无报错');
