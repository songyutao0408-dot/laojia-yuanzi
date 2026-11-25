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
// 画质默认按 high 截（可用环境变量 SHOT_QUALITY=low 改）
const QUALITY = process.env.SHOT_QUALITY || 'high';
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
  ['jujube', 'view=orbit&cam=-0.2,1.5,2.2,4,2.4,4.8'],
  ['paulownia-under', 'view=orbit&cam=-0.5,1.2,2.5,-2.9,5.5,-1.4'],
  ['gate-from-yard', 'view=orbit&cam=-2.5,1.6,2.5,-7.3,1,6.5'],
  ['yard-from-steps', 'view=orbit&cam=0.5,1.8,-3.3,1,1.2,4'],
  // 第 8 轮新增：水缸、连通台阶与天地神位、洋姜与青石板、秋千
  ['vat-steps', 'view=orbit&cam=0.6,1.7,1.4,-2.6,0.6,-3.6'],
  ['shrine', 'view=orbit&cam=2.4,1.3,-1.6,1.5,1.0,-4'],
  ['backyard', 'view=orbit&cam=-2.7,1.7,3.4,1.2,0.6,7.4'],
  ['swing', 'view=orbit&cam=4.7,1.6,1.0,2.7,1.4,4.2'],
  // 第 9 轮新增：父亲和大黄
  ['father-dog', 'view=orbit&cam=-1.1,1.35,2.2,-1.2,0.95,-0.3'],
  ['father-side', 'view=orbit&cam=0.9,1.4,1,-1.2,0.95,-0.3'],
  ['father-face', 'view=orbit&cam=-1.1,1.45,0.75,-1.12,1.35,-0.3'],
  ['father-portrait', 'view=orbit&cam=-1.6,1.5,0.3,-1.12,1.56,-0.28'], // 正对着脸的近景
  ['father-child', 'view=orbit&cam=-1.9,1.2,1.3,-1.15,1.3,-0.3'], // 小孩视线高度看父亲
  // 第 10 轮：西北屋室内（外屋看里屋门帘、里屋的炕、蜡烛器具和熏黑的南墙、拉灯）
  ['west-outer-door', 'view=orbit&cam=-3.8,1.65,-4.9,-1.5,1.3,-6.21'],
  ['west-inner-bed', 'view=orbit&cam=1.1,1.95,-4.75,-1.1,1.1,-7.9'],
  ['west-inner-posters', 'view=orbit&cam=0.95,1.6,-5.6,-1.38,1.45,-7.3'],
  ['west-inner-calendar3', 'view=orbit&cam=0.6,1.65,-6.3,-1.38,1.45,-5.2'], // 门洞南边那张挂历
  ['west-inner-candles', 'view=orbit&cam=0.1,1.95,-7.1,-0.1,1.15,-4.24'],
  ['west-inner-lamp', 'view=orbit&lamp=on&cam=1.1,1.95,-4.75,-1.1,1.1,-7.9'],
  ['west-curtain-walk', 'view=walk&cam=-1.95,1.2,-6.25,0.5,1.2,-6.25'], // 走到门洞前，门帘被撩开
  ['west-inner-night', 'view=orbit&time=night&lamp=on&cam=0.1,1.95,-7.1,-0.1,1.15,-4.24'],
  ['west-window-night', 'view=orbit&time=night&lamp=on&cam=0.95,1.5,-0.9,0,1.4,-4'], // 院里看里屋的窗透出灯光
  // 第 11 轮：外屋（进门看电视桌、炕、圆桌和脸盆架、电视和座钟、缝纫机、屋里看木板门）
  ['west-outer-wide', 'view=orbit&cam=-1.9,2.3,-4.6,-5.2,0.7,-7.6'], // 外屋东南角看整个外屋
  ['west-outer-from-door', 'view=orbit&cam=-3.75,1.65,-4.55,-3.96,1.2,-8.46'],
  ['west-outer-kang', 'view=orbit&cam=-3.66,2.25,-6.16,-6.46,1.05,-6.46'],
  ['west-outer-table', 'view=orbit&cam=-5.36,2.35,-7.86,-4.26,1.15,-4.76'],
  ['west-outer-tv', 'view=orbit&cam=-3.74,1.75,-7.16,-3.74,1.6,-8.51'],
  ['west-outer-sewing', 'view=orbit&cam=-3.2,1.95,-6.6,-1.85,1.25,-7.36'],
  ['west-outer-tv-on', 'view=orbit&tv=on&cam=-3.74,1.75,-7.16,-3.74,1.6,-8.51'],
  ['west-outer-tv-night', 'view=orbit&time=night&tv=on&cam=-3.75,1.65,-4.55,-3.96,1.2,-8.46'],
  ['west-washbasin', 'view=orbit&cam=-2.55,1.75,-5.2,-1.9,1.05,-4.56'],
  ['west-door-inside', 'view=orbit&cam=-3.96,1.75,-6.76,-3.75,1.45,-4.24'],
  // 第 12 轮：东北屋（仓库）：进门看大缸、大缸近景、南窗下的床、墙角蛛网和壁虎、夜里
  ['east-from-door', 'view=orbit&cam=4.1,1.75,-4.7,1.9,0.7,-8.2'],
  ['east-vats', 'view=orbit&cam=4.8,2.1,-5.4,2.0,0.8,-7.6'],
  ['east-bed', 'view=orbit&cam=2.8,1.8,-6.8,5.8,0.6,-4.6'],
  ['east-gecko', 'view=orbit&cam=5.0,2.0,-6.6,5.9,2.9,-8.76'],
  ['east-night', 'view=orbit&time=night&cam=4.1,1.75,-4.7,1.9,0.7,-8.2'],
  // 第 14 轮：厨房（灶台和风箱、黄泥墙、夜里的灶火、外面的旧砖）
  ['kitchen-stove', 'view=orbit&cam=-5.1,1.35,0.3,-6.4,0.5,-0.8'],
  ['kitchen-fire', 'view=orbit&cam=-5.25,0.75,-0.55,-6.2,0.35,-0.9'],
  ['kitchen-night', 'view=orbit&time=night&cam=-5.1,1.35,0.3,-6.4,0.5,-0.8'],
  ['kitchen-outside', 'view=orbit&cam=-2.8,1.5,1.8,-4.5,1.2,0.3'],
  // 第 15 轮：厨房外观正面、窗下架子那一角
  ['kitchen-facade', 'view=orbit&cam=-1.3,1.5,0.4,-4.6,1.2,0.4'],
  ['kitchen-shelf', 'view=orbit&cam=-6.6,1.6,-0.7,-4.95,0.75,1.3'],
  // 第 16 轮：砖墙外观、洋灰内墙、灶前烧火的小女孩
  ['kitchen-wide', 'view=orbit&cam=-0.6,2.1,3.2,-4.6,1.1,0.4'],
  ['kitchen-walls', 'view=orbit&cam=-4.95,1.55,2.55,-6.9,1.3,-1.4'],
  ['kitchen-girl', 'view=orbit&cam=-5.5,1.0,0.25,-5.6,0.5,-0.95'],
  ['kitchen-girl-face', 'view=orbit&cam=-5.97,0.8,-0.42,-5.45,0.72,-0.95'],
  ['kitchen-girl-back', 'view=orbit&cam=-4.85,1.2,-0.8,-5.7,0.55,-0.95'],
  // 第 17 轮：母亲洗衣服、两个男孩荡秋千、外屋的条几柜桌和蚊帐
  ['mother', 'view=orbit&cam=0.75,1.35,1.75,0.3,0.45,-0.15'],
  ['mother-side', 'view=orbit&cam=1.7,1.05,0.05,0.35,0.45,-0.1'],
  ['family', 'view=orbit&cam=1.2,2.2,4.6,-0.8,0.7,-0.6'],
  ['swing-boys', 'view=orbit&cam=1.6,1.45,5.4,2.9,0.85,3.7'],
  ['swing-boys-side', 'view=orbit&cam=0.9,1.3,2.3,3.0,0.85,3.6'],
  ['outer-desk', 'view=orbit&cam=-3.9,1.55,-5.9,-3.96,0.95,-8.6'],
  ['outer-net', 'view=orbit&cam=-4.4,1.75,-5.0,-6.5,1.15,-7.0'],
  // 第 17 轮（二）：水仙（第 19 轮换成指甲桃）、里屋衣柜碗柜、东北屋缸上的红纸、三马车、二八自行车
  ['impatiens', 'view=orbit&cam=4.6,1.05,-2.2,5.28,0.35,-3.7'], // 第 19 轮：指甲桃（替换水仙）
  ['impatiens-wide', 'view=orbit&cam=3.0,1.7,-0.6,5.0,0.6,-3.9'],
  ['inner-cabinets', 'view=orbit&cam=-0.95,1.5,-6.2,1.25,1.0,-6.2'],
  ['east-labels', 'view=orbit&cam=4.4,1.7,-5.0,2.1,0.75,-7.5'],
  ['tricycle', 'view=orbit&cam=-0.4,1.9,6.2,-0.8,0.8,2.9'],
  ['tricycle-front', 'view=orbit&cam=2.3,1.5,1.7,-0.5,0.8,2.9'],
  ['bicycle', 'view=orbit&cam=-5.4,1.3,5.0,-5.85,0.6,3.3'],
  // 第 18 轮：猪圈、黑猪、墙头公鸡、小鸡、当院俯看
  ['pigpen', 'view=orbit&cam=4.4,2.2,2.6,6.2,0.35,4.6'],
  ['pigs', 'view=orbit&cam=5.25,1.45,4.1,6.1,0.35,4.9'],
  ['rooster', 'view=orbit&cam=6.3,2.55,1.95,7.3,2.45,1.2'],
  ['chicks', 'view=orbit&cam=1.75,0.75,2.15,0.9,0.05,1.0'],
  ['yard-wide', 'view=orbit&cam=2.5,8.5,11.5,1.0,0.0,2.0'],
  // 时间
  ['orbit-dawn', 'view=orbit&time=dawn'],
  ['orbit-noon', 'view=orbit&time=noon'],
  ['orbit-night', 'view=orbit&time=night'],
  ['north-night', 'view=orbit&time=night&cam=1,1.4,1.5,0,2,-6'],
  ['smoke', 'view=orbit&cam=-1,1.3,4.5,-6.5,3.5,-1.5'],
];
// 可只截部分：npm run shots -- walk orbit
const only = process.argv.slice(2);
for (const [view, query] of SHOTS.filter(([n]) => !only.length || only.includes(n))) {
  // 无头浏览器用软件渲染，偶尔导航超时：失败就重试一次
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(`${base}?${query}&quality=${QUALITY}&autoperf=off&music=off`, { waitUntil: 'commit', timeout: 120000 });
      await page.waitForFunction(() => window.__sceneReady === true && !!window.__app && document.getElementById('loading')?.classList.contains('done'), null, { timeout: 300000 });
      break;
    } catch (e) {
      if (attempt >= 1) throw e;
      console.log(`${view} 超时，重试一次`);
    }
  }

  await page.waitForTimeout(4000); // 软件渲染很慢，多等几帧让阴影、环境光就绪
  const file = `screenshots/${view}.png`;
  await page.screenshot({ path: file });
  // 简单黑屏检测：抽样像素亮度
  const avg = await page.evaluate(() => {
    const { renderer, renderNow } = window.__app.engine;
    renderNow(); // 同一任务内重画一次，保证能读到画布像素
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
