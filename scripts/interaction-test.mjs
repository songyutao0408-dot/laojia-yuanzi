// 交互自检（模拟真人操作）：只用真实按键、真实鼠标点击和屏幕按钮，从附近出发自己走过去。
// 用法：npm run build && npm run test:interact        （无头浏览器很慢，全部约 5~10 分钟）
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const server = await preview({ preview: { port: 4175, strictPort: false } });
const base = server.resolvedUrls.local[0];
mkdirSync('screenshots', { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
const check = (name, ok, info) => {
  const line = `${ok ? '✔' : '✘'} ${name}  ${JSON.stringify(info)}`;
  results.push(line);
  console.log(line);
};

/** 打开页面，站在 from（[x,z]）看向 to（[x,z]）；options.mobile = 模拟 iPhone */
async function open(from, to, { mobile = false } = {}) {
  const ctx = mobile
    ? await browser.newContext({ ...pw.devices['iPhone 13'] })
    : await browser.newContext({ viewport: { width: 640, height: 400 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  page.on('pageerror', (e) => errors.push(e.message));
  const cam = `${from[0]},1.2,${from[1]},${to[0]},1.2,${to[1]}`;
  await page.goto(`${base}?view=walk&quality=low&cam=${cam}`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 300000 });
  await page.waitForTimeout(1500);
  return { page, ctx };
}
const pos = (page) => page.evaluate(() => { const s = window.__app.views.fp.state; return { x: +s.pos.x.toFixed(2), z: +s.pos.z.toFixed(2), feet: +s.feet.toFixed(2) }; });
/** 按住某个键，直到 cond 满足或超时 */
async function holdUntil(page, key, cond, maxMs = 90000) {
  await page.keyboard.down(key);
  const t0 = Date.now();
  let p;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(500);
    p = await pos(page);
    if (cond(p)) break;
  }
  await page.keyboard.up(key);
  return pos(page);
}
const buttons = (page) => page.evaluate(() => [...document.querySelectorAll('#hud2 .actions button')].map((b) => b.textContent));
const basket = (page) => page.evaluate(() => document.querySelector('#hud2 .basket').textContent);
async function waitButton(page, label, maxMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if ((await buttons(page)).some((b) => b.startsWith(label))) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

const ONLY = process.env.ONLY;
const run = (k) => !ONLY || ONLY.includes(k);
// A) 西北屋：从门前偏东 0.3 m 处往北走（不正对门口），应自动顺进门、上台阶进屋
if (run('A')) {
  const { page, ctx } = await open([-3.45, 1.5], [-3.45, -6]);
  const p = await holdUntil(page, 'KeyW', (p) => p.z < -4.6 && p.feet > 0.4);
  check('A 斜着走也能上台阶进西北屋', p.z < -4.6 && p.feet > 0.4, p);
  await page.screenshot({ path: 'screenshots/test-enter-house.png' });
  await ctx.close();
}
// B) 厨房：从门东边、偏南 0.35 m 处往西走
if (run('B')) {
  const { page, ctx } = await open([-2.9, -0.45], [-8, -0.45]);
  const p = await holdUntil(page, 'KeyW', (p) => p.x < -5.0);
  check('B 从东门走进厨房', p.x < -5.0 && Math.abs(p.feet - 0.05) < 0.03, p);
  await ctx.close();
}
// C) 压水井：从井南边 2.2 m 往北走两步，出现“压水”按钮，按 E 压水
if (run('C')) {
  const { page, ctx } = await open([1.6, 1.6], [1.6, -3]);
  await holdUntil(page, 'KeyW', (p) => p.z < 0.6);
  const ok = await waitButton(page, '压水');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(800);
  const busy = await page.evaluate(() => window.__app.pumping.busy);
  check('C 走到井边出现“压水”按钮，按 E 压水', ok && busy, { ok, busy, buttons: await buttons(page) });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/test-pump.png' });
  await ctx.close();
}
// D) 石榴：走到石榴树东边，点“摘石榴”按钮；再直接点画面上的一个石榴（偏开 30 像素也行）
if (run('D')) {
  const { page, ctx } = await open([3.3, -1.7], [1.6, -1.7]);
  await holdUntil(page, 'KeyW', (p) => p.x < 2.6);
  const ok = await waitButton(page, '摘石榴');
  await page.locator('#hud2 .actions button', { hasText: '摘石榴' }).click();
  await page.waitForTimeout(600);
  const b1 = await basket(page);
  // 直接点画面：找一个够得着的石榴的屏幕位置，偏开 30 像素点
  const pt = await page.evaluate(() => {
    const app = window.__app;
    const cam = app.engine.camera;
    const r = app.engine.renderer.domElement.getBoundingClientRect();
    for (const g of app.engine.scene.getObjectByName('pomegranate-fruits').children) {
      if (g.userData.picked) continue;
      const w = g.getWorldPosition(g.position.clone());
      if (w.distanceTo(cam.position) > 2.5) continue;
      const v = w.clone().project(cam);
      if (Math.abs(v.x) > 0.8 || Math.abs(v.y) > 0.8 || v.z > 1) continue;
      return { x: r.left + ((v.x + 1) / 2) * r.width + 30, y: r.top + ((1 - v.y) / 2) * r.height };
    }
    return null;
  });
  if (pt) await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(600);
  const b2 = await basket(page);
  check('D 点“摘石榴”按钮能摘；直接点石榴附近也能摘', ok && b1.includes('石榴 1') && b2.includes('石榴 2'), { ok, b1, b2, clicked: !!pt });
  await page.screenshot({ path: 'screenshots/test-pick.png' });
  await ctx.close();
}
// E) 枣树：走到树下，点“打枣”
if (run('E')) {
  const { page, ctx } = await open([1.5, 2.6], [4, 4.6]);
  await holdUntil(page, 'KeyW', (p) => Math.hypot(p.x - 4, p.z - 4.6) < 1.8);
  const ok = await waitButton(page, '打枣');
  await page.locator('#hud2 .actions button', { hasText: '打枣' }).click();
  await page.waitForTimeout(600);
  const b = await basket(page);
  check('E 走到枣树下点“打枣”', ok && b.includes('枣 1'), { ok, b });
  await ctx.close();
}
// F) 手机（iPhone 13 模拟）：用摇杆往前走进东北屋，再到井边点“压水”按钮
if (run('F')) {
  const { page, ctx } = await open([3.55, 1.5], [3.55, -6], { mobile: true }); // 东北屋门在 x = 3.75，偏开 0.2 m
  const box = await page.locator('#touch .stick').boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - 48, id: 1 }] });
  const t0 = Date.now();
  let p = await pos(page);
  while (Date.now() - t0 < 240000 && !(p.z < -4.6 && p.feet > 0.4)) {
    await page.waitForTimeout(2000);
    p = await pos(page);
    if (process.env.TRACE) console.log('  轨迹', p);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check('F1 手机摇杆斜着走进东北屋', p.z < -4.6 && p.feet > 0.4, p);
  await ctx.close();
  const o2 = await open([1.6, 0.4], [1.6, -3], { mobile: true });
  const ok = await waitButton(o2.page, '压水');
  if (ok) await o2.page.locator('#hud2 .actions button', { hasText: '压水' }).tap();
  await o2.page.waitForTimeout(800);
  const busy = await o2.page.evaluate(() => window.__app.pumping.busy);
  check('F2 手机在井边点“压水”按钮', ok && busy, { ok, busy });
  await o2.page.screenshot({ path: 'screenshots/test-mobile-pump.png' });
  await o2.ctx.close();
}

await browser.close();
server.httpServer.close();
console.log('\n' + results.join('\n'));
if (errors.length) console.log('页面报错：\n' + errors.join('\n'));
process.exit(results.some((r) => r.startsWith('✘')) || errors.length ? 1 : 0);
