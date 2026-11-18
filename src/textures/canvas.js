import * as THREE from 'three';

/**
 * 程序贴图的底层工具：可平铺噪声、无缝绘制、高度图 → 法线图、打包成 Three 纹理。
 * 所有贴图都是“无缝平铺”的：画在边缘的东西会在对边再画一份。
 */

/** 全局分辨率倍数；第 7 步按设备性能调整（低端机 0.5） */
export const TEX = { scale: 1 };

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(w * TEX.scale));
  c.height = Math.max(4, Math.round(h * TEX.scale));
  return c;
}

/** 可复现的伪随机数 */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 周期为 period 的 2D 值噪声（周期内无缝），返回 0..1 */
export function makeNoise(seed, period) {
  const r = rng(seed);
  const grid = new Float32Array(period * period).map(() => r());
  const at = (i, j) => grid[((j % period) + period) % period * period + (((i % period) + period) % period)];
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = s(x - i);
    const fy = s(y - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return a + (b - a) * fy;
  };
}

/** 分形噪声：u,v ∈ [0,1) 上无缝，base 为最低频的格子数 */
export function makeFbm(seed, base = 4, octaves = 5) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push({ n: makeNoise(seed + o * 101, base << o), f: base << o, a: 0.5 ** o });
  const norm = layers.reduce((s, l) => s + l.a, 0);
  return (u, v) => {
    let s = 0;
    for (const l of layers) s += l.n(u * l.f, v * l.f) * l.a;
    return s / norm;
  };
}

/** 在 (x,y) 画一次，并在需要时于对边重复，保证无缝 */
export function wrapDraw(ctx, x, y, r, fn) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  for (const dx of [-W, 0, W]) {
    for (const dy of [-H, 0, H]) {
      if (x + dx + r < 0 || x + dx - r > W || y + dy + r < 0 || y + dy - r > H) continue;
      ctx.save();
      ctx.translate(dx, dy);
      fn(ctx, x, y);
      ctx.restore();
    }
  }
}

/** 逐像素填充：fn(u, v, x, y) → [r,g,b] 或 [r,g,b,a]（0..255） */
export function fillPixels(c, fn) {
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  const d = img.data;
  for (let y = 0, k = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++, k += 4) {
      const p = fn(x / c.width, y / c.height, x, y);
      d[k] = p[0];
      d[k + 1] = p[1];
      d[k + 2] = p[2];
      d[k + 3] = p.length > 3 ? p[3] : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** 高度图（灰度 canvas，亮 = 高）→ 法线图 canvas（OpenGL 约定，Y 向上），strength 越大越凹凸 */
export function heightToNormal(hc, strength = 2) {
  const w = hc.width;
  const h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  const out = canvas(1, 1);
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0, k = 0; y < h; y++) {
    for (let x = 0; x < w; x++, k += 4) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      d[k] = ((-dx / len) * 0.5 + 0.5) * 255;
      d[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      d[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * 打包成一组 PBR 纹理。
 * @param {{color:HTMLCanvasElement, height?:HTMLCanvasElement, rough?:HTMLCanvasElement, normalStrength?:number}} s
 * @param {number|[number,number]} meters 一张贴图对应的真实尺寸（米），用于世界坐标 UV
 */
export function textureSet({ color, height, rough, normalStrength = 2 }, meters = 1, { repeat = true } = {}) {
  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    const [mx, my] = Array.isArray(meters) ? meters : [meters, meters];
    if (repeat) t.repeat.set(1 / mx, 1 / my);
    return t;
  };
  // 分辨率减半时相邻像素的高度差变大，法线强度相应减小，凹凸感保持一致
  const ns = normalStrength * (height ? height.width / Math.max(1, color.width) : 1) * TEX.scale;
  return {
    map: mk(color, true),
    normalMap: height ? mk(heightToNormal(height, ns), false) : null,
    roughnessMap: rough ? mk(rough, false) : null,
  };
}

/** 把 0..1 的灰度值写成 [v,v,v] */
export const gray = (v) => {
  const g = Math.max(0, Math.min(255, v * 255));
  return [g, g, g];
};

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const mixRGB = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/**
 * 一次逐像素生成颜色/高度/粗糙度三张 canvas。
 * fn(u, v, x, y) → { c:[r,g,b](0..255), a?:0..255, h:0..1, r:0..1 }
 * x, y 始终是“设计分辨率”（w × h）下的整数坐标；实际画布按 TEX.scale 缩放，低端机像素少、生成快。
 */
export function fillMulti(w, h, fn, { alpha = false } = {}) {
  const color = canvas(w, h);
  const W = color.width;
  const Hh = color.height;
  const height = canvas(1, 1);
  const rough = canvas(1, 1);
  height.width = rough.width = W;
  height.height = rough.height = Hh;
  const ci = color.getContext('2d').createImageData(W, Hh);
  const hi = height.getContext('2d').createImageData(W, Hh);
  const ri = rough.getContext('2d').createImageData(W, Hh);
  for (let y = 0, k = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++, k += 4) {
      const p = fn(x / W, y / Hh, Math.floor((x * w) / W), Math.floor((y * h) / Hh), w, h);
      ci.data[k] = p.c[0];
      ci.data[k + 1] = p.c[1];
      ci.data[k + 2] = p.c[2];
      ci.data[k + 3] = alpha ? (p.a ?? 255) : 255;
      const hv = clamp01(p.h ?? 0.5) * 255;
      hi.data[k] = hi.data[k + 1] = hi.data[k + 2] = hv;
      hi.data[k + 3] = 255;
      const rv = clamp01(p.r ?? 0.9) * 255;
      ri.data[k] = ri.data[k + 1] = ri.data[k + 2] = rv;
      ri.data[k + 3] = 255;
    }
  }
  color.getContext('2d').putImageData(ci, 0, 0);
  height.getContext('2d').putImageData(hi, 0, 0);
  rough.getContext('2d').putImageData(ri, 0, 0);
  return { color, height, rough };
}

/** 整数哈希 → 0..1 */
export function hash(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
}
