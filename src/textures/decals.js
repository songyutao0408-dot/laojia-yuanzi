import * as THREE from 'three';
import { canvas, rng, makeFbm, fillPixels, clamp01 } from './canvas.js';

const FONT = '"STKaiti","KaiTi","Kaiti SC","楷体","AR PL UKai CN","Noto Serif CJK SC","Songti SC",serif';

/** 旧春联纸：褪色的红纸 + 墨字，边缘破损（alpha）。vertical=true 竖排 */
export function coupletTexture(text, { vertical = true, seed = 1, fade = 0.5 } = {}) {
  const n = [...text].length;
  const cell = 128;
  const W = vertical ? cell : cell * n;
  const H = vertical ? cell * n : cell;
  const c = canvas(W, H);
  const k = c.width / W;
  const ctx = c.getContext('2d');
  const blot = makeFbm(seed, 3, 4);
  const edge = makeFbm(seed + 7, 8, 3);
  // 纸色：日晒雨淋后从大红褪成粉红、发白
  fillPixels(c, (u, v) => {
    const b = blot(u * (vertical ? 1 : n), v * (vertical ? n : 1));
    const f = clamp01(fade * 0.6 + (b - 0.45) * 1.5 * fade);
    const e = Math.min(u, 1 - u, v, 1 - v) * (vertical ? 1 : 0.4) * 12 + (edge(u * 2, v * 2) - 0.5) * 0.9;
    const alpha = e < 0.05 ? 0 : 255;
    return [190 + f * 50, 40 + f * 120, 38 + f * 110, alpha];
  });
  ctx.fillStyle = `rgba(25,18,16,${0.85 - fade * 0.35})`;
  ctx.font = `bold ${Math.round(cell * 0.72 * k)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...text].forEach((ch, i) => {
    const x = vertical ? c.width / 2 : (i + 0.5) * cell * k;
    const y = vertical ? (i + 0.5) * cell * k : c.height / 2;
    ctx.fillText(ch, x, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 斗方“福”字（倒贴在门扇上） */
export function fuTexture({ seed = 3, fade = 0.5 } = {}) {
  const S = 256;
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  const k = c.width / S;
  const blot = makeFbm(seed, 3, 4);
  fillPixels(c, (u, v) => {
    // 菱形
    const inside = Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.49;
    const f = clamp01(fade * 0.6 + (blot(u, v) - 0.45) * 1.5 * fade);
    return [190 + f * 50, 40 + f * 120, 38 + f * 110, inside ? 255 : 0];
  });
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(Math.PI); // 福倒了
  ctx.fillStyle = `rgba(25,18,16,${0.85 - fade * 0.35})`;
  ctx.font = `bold ${Math.round(150 * k)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('福', 0, 4 * k);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 墙头杂草卡片（带 alpha）：一丛枯黄夹绿的狗尾草、蒿子 */
export function grassCard({ seed = 5 } = {}) {
  const W = 256;
  const H = 128;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const k = c.width / W;
  const r = rng(seed);
  for (let i = 0; i < 70; i++) {
    const x = r() * W * k;
    const h = (30 + r() * 90) * k;
    const lean = (r() - 0.5) * 40 * k;
    const green = r() < 0.55;
    ctx.strokeStyle = green ? `rgb(${80 + r() * 40},${110 + r() * 40},${50 + r() * 20})` : `rgb(${170 + r() * 40},${150 + r() * 30},${90 + r() * 20})`;
    ctx.lineWidth = (1.2 + r() * 2) * k;
    ctx.beginPath();
    ctx.moveTo(x, c.height);
    ctx.quadraticCurveTo(x + lean * 0.3, c.height - h * 0.6, x + lean, c.height - h);
    ctx.stroke();
    if (r() < 0.25) {
      // 狗尾草穗
      ctx.fillStyle = 'rgb(190,175,120)';
      ctx.beginPath();
      ctx.ellipse(x + lean, c.height - h, 3 * k, 9 * k, lean / (60 * k), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * 墙根污渍带（带 alpha）：最下面一圈下雨溅上去的泥点，往上是一片片白色泛碱。
 * 横向可平铺，一张 = 4 m 宽 × 0.8 m 高。
 */
export function wallBaseStain({ seed = 9 } = {}) {
  const W = 1024;
  const H = 205;
  const c = canvas(W, H);
  const salt = makeFbm(seed, 8, 5);
  const mud = makeFbm(seed + 1, 32, 3);
  fillPixels(c, (u, v) => {
    const y = 1 - v; // 0 = 地面
    // 泥点：贴地最浓
    const m = clamp01((mud(u, v * 0.2) - 0.35) * 2) * clamp01(1 - y / 0.35);
    // 泛碱：0.1~0.6 m 之间的不规则白斑，上沿呈波浪状
    const top = 0.45 + (salt(u, 0.3) - 0.5) * 0.5;
    const s = clamp01((salt(u, v) - 0.42) * 3) * clamp01((top - y) * 6) * clamp01(y * 6);
    if (m > s) return [96, 76, 56, m * 200];
    return [225, 222, 210, s * 170];
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** 井台周围湿地面：中心深、边缘渐淡的不规则水渍（alpha） */
export function wetPatch({ seed = 13 } = {}) {
  const S = 512;
  const c = canvas(S, S);
  const n = makeFbm(seed, 4, 4);
  fillPixels(c, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) * 2;
    const a = clamp01((1 - d) * 1.6 + (n(u, v) - 0.5) * 1.2);
    return [60, 46, 32, a * 150];
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
