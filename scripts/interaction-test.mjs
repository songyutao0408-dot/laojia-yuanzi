// 交互自检：第一人称走动与碰撞、上台阶进屋、按 E 压水、点击摘果子。
// 用法：npm run build && node scripts/interaction-test.mjs
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
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
page.setDefaultTimeout(240000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}?view=walk&quality=low`, { waitUntil: 'commit', timeout: 120000 });
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 300000 });

const pos = () => page.evaluate(() => { const s = window.__app.views.fp.state; return { x: +s.pos.x.toFixed(2), z: +s.pos.z.toFixed(2), feet: +s.feet.toFixed(2), yaw: +s.yaw.toFixed(2) }; });
// 直接驱动控制器（无头浏览器帧率很低，按键时长不可靠）：模拟按住方向一段时间
const walk = (mx, my, seconds) => page.evaluate(([mx, my, seconds]) => {
  const fp = window.__app.views.fp;
  fp.setMove(mx, my);
  for (let t = 0; t < seconds; t += 1 / 30) fp.update(1 / 30);
  fp.setMove(0, 0);
}, [mx, my, seconds]);
const face = (yaw) => page.evaluate((yaw) => { window.__app.views.fp.state.yaw = yaw; }, yaw);
const teleport = (x, z) => page.evaluate(([x, z]) => { const s = window.__app.views.fp.state; s.pos.set(x, 0, z); }, [x, z]);
const results = [];
const check = (name, ok, info) => { results.push(`${ok ? '✔' : '✘'} ${name}  ${JSON.stringify(info)}`); };

// 1) 起点：大门口，面朝东
let p0 = await pos();
check('起点在大门口、面朝东', Math.abs(p0.x + 6.7) < 0.05 && Math.abs(p0.yaw + 1.57) < 0.05, p0);
// 2) 一直往前走：应被影背墙挡住（墙西面 x = -3.45）
await walk(0, 1, 6);
let p1 = await pos();
check('往东走被影背墙挡住', p1.x < -3.45 - 0.15 && p1.x > -4.0, p1);
// 3) 往西穿过大门走出去再回来（门洞宽 2.2 m，铁门向内开着）
await face(Math.PI / 2); // 面朝西
await walk(0, 1, 5);
let p2 = await pos();
check('能从大门走出院子', p2.x < -7.6, p2);
// 4) 北屋：站在西北屋门前台阶下，往北走上台阶进屋
await teleport(-3.75, -1.5);
await face(0);
await walk(0, 1, 3);
let p3 = await pos();
check('上台阶走进西北屋（地坪 0.45 m）', p3.z < -4.3 && Math.abs(p3.feet - 0.45) < 0.03, p3);
await walk(0, 1, 6);
let p4 = await pos();
check('屋里往北走被后墙挡住', p4.z > -8.76 && p4.z < -8.3, p4);
// 5) 不能穿过北屋前墙（从院子里窗户位置往北走）
await teleport(-5.8, -2.5);
await face(0);
await walk(0, 1, 4);
let p5 = await pos();
check('窗户处穿不过墙', p5.z > -4 + 0.1, p5);
// 6) 树干挡人
await teleport(-2.9, 0.5);
await face(0);
await walk(0, 1, 4);
let p6 = await pos();
check('泡桐树干挡人', p6.z > -1.4 + 0.3, p6);
// 7) 井边按 E 压水
await teleport(1.6, 0.3);
await face(0);
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
const pumpBusy = await page.evaluate(() => window.__app.pumping.busy);
check('井边按 E 开始压水', pumpBusy, { pumpBusy });
await page.evaluate(() => { for (let i = 0; i < 40; i++) window.__app.pumping.update(1 / 30); });
const handle = await page.evaluate(() => +window.__app.engine.scene.getObjectByName('handle-pivot').rotation.x.toFixed(2));
const water = await page.evaluate(() => window.__app.engine.scene.getObjectByName('well').children.some((c) => c.visible && c.geometry?.type === 'CylinderGeometry' && c.material?.transparent));
check('压杆在动、出水嘴出水', handle !== 0.42 && water, { handle, water });
await page.screenshot({ path: 'screenshots/test-pump.png' });
// 8) 摘石榴：站到石榴树旁，用射线点最近的一个石榴
await teleport(1.6, -0.2);
const picked = await page.evaluate(() => {
  const app = window.__app;
  const cam = app.engine.camera;
  const fruits = app.engine.scene.getObjectByName('pomegranate-fruits').children;
  // 找离相机最近的果子，让相机看着它，然后点屏幕中心
  let best = null;
  let bd = 1e9;
  for (const f of fruits) {
    const w = f.getWorldPosition(f.position.clone());
    const d = w.distanceTo(cam.position);
    if (d < bd) { bd = d; best = w; }
  }
  const s = app.views.fp.state;
  const dx = best.x - cam.position.x, dy = best.y - cam.position.y, dz = best.z - cam.position.z;
  s.yaw = Math.atan2(-dx, -dz);
  s.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  app.views.fp.update(0.001);
  cam.updateMatrixWorld();
  // 把果子投影到屏幕上，点它所在的位置
  const ndc = best.clone().project(cam);
  const r = app.engine.renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((ndc.x + 1) / 2) * r.width, y: r.top + ((1 - ndc.y) / 2) * r.height, dist: +bd.toFixed(2) };
});
await page.mouse.click(picked.x, picked.y);
await page.waitForTimeout(300);
const basket = await page.evaluate(() => document.querySelector('#hud2 .basket').textContent);
check('点击摘到石榴', basket.includes('石榴'), { basket, dist: picked.dist });
await page.screenshot({ path: 'screenshots/test-pick.png' });
// 9) 从东边的门走进厨房
await teleport(-3.6, -0.8);
await face(Math.PI / 2);
await walk(0, 1, 3);
let p9 = await pos();
check('从门走进厨房', p9.x < -4.8 && Math.abs(p9.feet - 0.05) < 0.02, p9);
// 10) 摘枣
await teleport(3.0, 3.6);
const jj = await page.evaluate(() => {
  const app = window.__app;
  const cam = app.engine.camera;
  const inst = app.engine.scene.getObjectByName('jujube-fruits');
  const m = new cam.matrix.constructor();
  const s = app.views.fp.state;
  app.views.fp.update(0.001);
  let best = null;
  let bd = 1e9;
  for (let i = 0; i < inst.count; i++) {
    inst.getMatrixAt(i, m);
    const w = cam.position.clone().setFromMatrixPosition(m).applyMatrix4(inst.matrixWorld);
    const d = w.distanceTo(cam.position);
    if (d < bd) { bd = d; best = w; }
  }
  const dx = best.x - cam.position.x, dy = best.y - cam.position.y, dz = best.z - cam.position.z;
  s.yaw = Math.atan2(-dx, -dz);
  s.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  app.views.fp.update(0.001);
  cam.updateMatrixWorld();
  const ndc = best.clone().project(cam);
  const r = app.engine.renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((ndc.x + 1) / 2) * r.width, y: r.top + ((1 - ndc.y) / 2) * r.height, dist: +bd.toFixed(2) };
});
await page.mouse.click(jj.x, jj.y);
await page.waitForTimeout(300);
const basket2 = await page.evaluate(() => document.querySelector('#hud2 .basket').textContent);
check('点击摘到枣', basket2.includes('枣'), { basket2, dist: jj.dist });

await browser.close();
server.httpServer.close();
console.log(results.join('\n'));
if (errors.length) console.log('页面报错：\n' + errors.join('\n'));
process.exit(results.some((r) => r.startsWith('✘')) || errors.length ? 1 : 0);
