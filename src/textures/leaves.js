import * as THREE from 'three';
import { canvas, rng } from './canvas.js';

/**
 * 带透明通道的叶片“簇”贴图：一张贴图上画一小枝叶子（含叶柄、小枝），
 * 树冠由很多张这样的卡片成簇拼出来。卡片的“挂点”在贴图底部中央（u=0.5, v=0）。
 * 初秋：大部分还绿，少量叶缘发黄、有虫眼。
 */

const cache = new Map();
function tex(key, size, draw) {
  if (!cache.has(key)) {
    const c = canvas(size, size);
    const ctx = c.getContext('2d');
    const k = c.width / size;
    ctx.scale(k, k);
    draw(ctx, size, rng(key.length * 977 + size));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(key, t);
  }
  return cache.get(key);
}

const greens = (r, autumn = 0.15) => {
  if (r() < autumn) return [`rgb(${150 + r() * 40},${140 + r() * 30},${50 + r() * 20})`, 'rgba(230,220,150,0.5)'];
  const g = 125 + r() * 40;
  return [`rgb(${72 + r() * 35},${g},${38 + r() * 22})`, 'rgba(210,235,170,0.45)'];
};

/** 叶片轮廓函数：在局部坐标里画一片叶（叶基在原点，叶尖朝 -y） */
function heartLeaf(ctx, L) {
  // 泡桐：宽心形，叶基深凹，叶尖短尖
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-L * 0.25, L * 0.12, -L * 0.62, -L * 0.05, -L * 0.55, -L * 0.45);
  ctx.bezierCurveTo(-L * 0.48, -L * 0.8, -L * 0.15, -L * 0.95, 0, -L);
  ctx.bezierCurveTo(L * 0.15, -L * 0.95, L * 0.48, -L * 0.8, L * 0.55, -L * 0.45);
  ctx.bezierCurveTo(L * 0.62, -L * 0.05, L * 0.25, L * 0.12, 0, 0);
}
function lanceLeaf(ctx, L, w = 0.22) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-L * w, -L * 0.45, 0, -L);
  ctx.quadraticCurveTo(L * w, -L * 0.45, 0, 0);
}
function ovalLeaf(ctx, L, w = 0.32) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-L * w, -L * 0.1, -L * w, -L * 0.75, 0, -L);
  ctx.bezierCurveTo(L * w, -L * 0.75, L * w, -L * 0.1, 0, 0);
}
function palmLeaf(ctx, L) {
  // 丝瓜：掌状 5 浅裂
  ctx.beginPath();
  const lobes = 5;
  for (let i = 0; i <= lobes * 2; i++) {
    const a = -Math.PI / 2 + ((i / (lobes * 2)) * 2 - 1) * (Math.PI * 0.85);
    const rr = i % 2 ? L * 0.55 : L * (i === lobes ? 1 : 0.85);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 0.95 - L * 0.1;
    if (i === 0) ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** 画一片带叶脉、虫眼的叶 */
function paintLeaf(ctx, r, shape, L, x, y, rot, { autumn = 0.15, veins = 'pinnate' } = {}) {
  const [fill, vein] = greens(r, autumn);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  shape(ctx, L);
  const g = ctx.createLinearGradient(0, 0, 0, -L);
  g.addColorStop(0, fill);
  g.addColorStop(1, fill);
  ctx.fillStyle = g;
  ctx.fill();
  // 边缘稍暗
  ctx.strokeStyle = 'rgba(30,40,20,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.clip();
  // 明暗：靠一侧暗一点，模拟叶面起伏
  const sh = ctx.createLinearGradient(-L * 0.5, 0, L * 0.5, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.18)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  sh.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = sh;
  ctx.fillRect(-L, -L, L * 2, L * 1.2);
  ctx.strokeStyle = vein;
  ctx.lineWidth = Math.max(1, L * 0.02);
  ctx.beginPath();
  if (veins === 'palm') {
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.55;
      ctx.moveTo(0, -L * 0.05);
      ctx.lineTo(Math.cos(a) * L * 0.85, Math.sin(a) * L * 0.85);
    }
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -L * 0.95);
    const n = veins === 'three' ? 2 : 6;
    for (let i = 1; i <= n; i++) {
      const yy = (-L * i) / (n + 1.5);
      const spread = L * (veins === 'heart' ? 0.4 : 0.22) * (1 - i / (n + 2));
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(-spread * 0.6, yy - spread * 0.2, -spread, yy - spread * 0.6);
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(spread * 0.6, yy - spread * 0.2, spread, yy - spread * 0.6);
    }
  }
  ctx.stroke();
  // 虫眼 / 枯斑
  if (r() < 0.35) {
    ctx.globalCompositeOperation = r() < 0.5 ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(110,80,40,0.8)';
    ctx.beginPath();
    ctx.arc((r() - 0.5) * L * 0.4, -L * (0.3 + r() * 0.5), L * (0.03 + r() * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function stem(ctx, x0, y0, x1, y1, w, color = 'rgb(96,84,52)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2 + (x1 - x0) * 0.1, (y0 + y1) / 2, x1, y1);
  ctx.stroke();
}

/** 泡桐：一张卡片上 3 片大心形叶（长叶柄从底部伸出） */
export const paulowniaLeaves = () =>
  tex('paulownia', 512, (ctx, S, r) => {
    const leaves = [
      [S * 0.3, S * 0.62, -0.5, S * 0.4],
      [S * 0.72, S * 0.64, 0.45, S * 0.38],
      [S * 0.5, S * 0.48, 0.05, S * 0.44],
    ];
    for (const [x, y, rot, L] of leaves) {
      // 短短一截叶柄（叶基往下）
      stem(ctx, x, y, x - Math.sin(rot) * L * 0.18, y + Math.cos(rot) * L * 0.18, 4, 'rgb(110,120,60)');
      paintLeaf(ctx, r, heartLeaf, L, x, y, rot, { autumn: 0.15, veins: 'heart' });
    }
  });

/** 石榴：一根小枝上对生的狭长亮绿小叶 */
export const pomegranateLeaves = () =>
  tex('pomegranate', 256, (ctx, S, r) => {
    for (let b = 0; b < 3; b++) {
      const x0 = S * (0.4 + b * 0.1);
      const y0 = S * 0.8;
      const x1 = S * (0.2 + b * 0.3);
      const y1 = S * (0.1 + r() * 0.15);
      stem(ctx, x0, y0, x1, y1, 2.5, 'rgb(120,70,50)');
      for (let i = 1; i < 9; i++) {
        const t = i / 9;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const side = i % 2 ? 1 : -1;
        paintLeaf(ctx, r, (c, L) => lanceLeaf(c, L, 0.2), S * (0.13 + r() * 0.06), x, y, side * (0.9 + r() * 0.4), { autumn: 0.08 });
      }
    }
  });

/** 枣树：之字形小枝上互生的卵形叶（三出脉） */
export const jujubeLeaves = () =>
  tex('jujube', 256, (ctx, S, r) => {
    for (let b = 0; b < 3; b++) {
      let x = S / 2;
      let y = S;
      const dir = (b - 1) * 0.35;
      for (let i = 0; i < 8; i++) {
        const nx = x + Math.sin(dir + (i % 2 ? 0.35 : -0.35)) * S * 0.1;
        const ny = y - S * 0.1;
        stem(ctx, x, y, nx, ny, 2.5, 'rgb(110,80,55)');
        x = nx;
        y = ny;
        paintLeaf(ctx, r, (c, L) => ovalLeaf(c, L, 0.36), S * (0.12 + r() * 0.04), x, y, (i % 2 ? 1 : -1) * (0.8 + r() * 0.3), { autumn: 0.12, veins: 'three' });
      }
    }
  });

/** 丝瓜：掌状大叶 + 卷须 + 一朵小黄花 */
export const luffaLeaves = () =>
  tex('luffa', 256, (ctx, S, r) => {
    for (let i = 0; i < 3; i++) {
      const x = S * (0.25 + i * 0.25);
      const y = S * (0.45 + r() * 0.2);
      stem(ctx, x, y, x, y + S * 0.12, 3, 'rgb(90,120,50)');
      paintLeaf(ctx, r, palmLeaf, S * 0.32, x, y, (r() - 0.5) * 0.8, { autumn: 0.05, veins: 'palm' });
    }
    // 卷须
    ctx.strokeStyle = 'rgb(120,150,60)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let a = 0; a < 12; a += 0.2) ctx.lineTo(S * 0.8 + Math.cos(a) * (8 - a * 0.5), S * 0.2 + a * 3 + Math.sin(a) * (8 - a * 0.5));
    ctx.stroke();
    // 小黄花
    if (r() < 2) {
      ctx.fillStyle = 'rgb(240,200,40)';
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.ellipse(S * 0.2 + Math.cos(p * 1.256) * 8, S * 0.18 + Math.sin(p * 1.256) * 8, 7, 5, p * 1.256, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

/** 豆角：三出复叶 */
export const beanLeaves = () =>
  tex('bean', 256, (ctx, S, r) => {
    for (let i = 0; i < 4; i++) {
      const x = S * (0.2 + i * 0.2);
      const y = S * (0.35 + r() * 0.3);
      stem(ctx, x, y, x + (r() - 0.5) * S * 0.1, y + S * 0.15, 2, 'rgb(90,120,50)');
      for (const a of [-1.1, 0, 1.1]) paintLeaf(ctx, r, (c, L) => ovalLeaf(c, L, 0.38), S * 0.16, x, y, a + (r() - 0.5) * 0.3, { autumn: 0.1 });
    }
  });

/** 卡片材质：双面、alpha 裁剪；wind 由 trees/wind.js 注入 */
export function leafMaterial(map, { roughness = 0.8, color = 0xffffff } = {}) {
  return new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness, metalness: 0, color });
}

/** 洋姜（菊芋）：一小枝上几片粗糙的卵状披针形叶，叶缘有锯齿感，深绿略发灰 */
export const artichokeLeaves = () =>
  tex('artichoke', 256, (ctx, S, r) => {
    for (let i = 0; i < 4; i++) {
      const x = S * (0.2 + i * 0.2) + (r() - 0.5) * 20;
      const y = S * (0.45 + r() * 0.25);
      stem(ctx, x, y, x + (r() - 0.5) * S * 0.08, y + S * 0.12, 2.5, 'rgb(96,104,58)');
      paintLeaf(ctx, r, (c, L) => ovalLeaf(c, L, 0.27), S * (0.36 + r() * 0.08), x, y, (r() - 0.5) * 1.2, { autumn: 0.22, veins: 'pinnate' });
    }
  });

/** 洋姜的小黄花：像小向日葵，10~12 片黄舌瓣、中间褐黄色花心（正面朝外的卡片） */
export const artichokeFlower = () =>
  tex('artichoke-flower', 128, (ctx, S, r) => {
    const cx = S / 2;
    const cy = S / 2;
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.15;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 0, -S * 0.46);
      g.addColorStop(0, 'rgb(214,150,20)');
      g.addColorStop(1, 'rgb(250,206,48)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -S * 0.27, S * 0.07, S * 0.2, (r() - 0.5) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, S * 0.15);
    cg.addColorStop(0, 'rgb(120,86,30)');
    cg.addColorStop(1, 'rgb(176,128,36)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.14, 0, Math.PI * 2);
    ctx.fill();
  });
