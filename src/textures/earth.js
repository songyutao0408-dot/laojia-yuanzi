import { fillMulti, textureSet, makeFbm, makeNoise, rng, mixRGB, clamp01 } from './canvas.js';

/**
 * 夯土墙：一层层夯出来的水平土层（每层约 12 cm）、麦秸碎屑、干裂缝、雨水顺墙冲出的竖沟。
 * 一张贴图 = 2 m × 2 m。
 */
export function rammedEarth() {
  const W = 768;
  const k = W / 1024;
  const fine = makeFbm(31, 32, 4);
  const big = makeFbm(32, 4, 4);
  const band = makeNoise(33, 64);
  const gullyN = makeNoise(34, 24);
  const r = rng(35);
  // 裂缝：若干条随机折线，记录成线段
  const cracks = [];
  for (let i = 0; i < 26; i++) {
    let x = r() * W;
    let y = r() * W;
    let a = Math.PI / 2 + (r() - 0.5) * 1.4; // 大多数竖向
    const n = 6 + Math.floor(r() * 14);
    for (let j = 0; j < n; j++) {
      const len = (6 + r() * 14) * k;
      const nx = x + Math.cos(a) * len;
      const ny = y + Math.sin(a) * len;
      cracks.push([x, y, nx, ny, (1.6 - j / n) * k]);
      x = nx;
      y = ny;
      a += (r() - 0.5) * 0.9;
    }
  }
  // 麦秸碎屑
  const straws = [];
  for (let i = 0; i < 700; i++) straws.push([r() * W, r() * W, r() * Math.PI, (3 + r() * 7) * k]);
  // 预先画裂缝和麦秸到距离场（简单栅格）
  const crackMask = new Float32Array(W * W);
  const strawMask = new Uint8Array(W * W);
  const plot = (mask, x, y, v) => {
    const xi = ((Math.round(x) % W) + W) % W;
    const yi = ((Math.round(y) % W) + W) % W;
    mask[yi * W + xi] = Math.max(mask[yi * W + xi], v);
  };
  for (const [x0, y0, x1, y1, wdt] of cracks) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      for (let dx = -1; dx <= 1; dx++) plot(crackMask, x + dx * wdt * 0.6, y, 1 - Math.abs(dx) * 0.5);
    }
  }
  for (const [x, y, a, l] of straws) {
    for (let s = 0; s < l; s++) plot(strawMask, x + Math.cos(a) * s, y + Math.sin(a) * s, 1);
  }
  const set = fillMulti(W, W, (u, v, x, y) => {
    const layer = Math.floor(v * 16); // 16 层 / 2 m
    const lv = v * 16 - layer;
    const tone = band(layer * 3.7, 0.5) - 0.5;
    const f = fine(u, v);
    const b = big(u, v);
    let c = [168 + tone * 30, 140 + tone * 26, 102 + tone * 18];
    c = mixRGB(c, [128, 104, 76], clamp01((b - 0.45) * 1.5));
    c = mixRGB(c, [190, 166, 128], clamp01((f - 0.6) * 2));
    let h = 0.5 + f * 0.3 + b * 0.2;
    // 层与层之间的夯缝
    const seam = lv < 0.05 ? 1 - lv / 0.05 : 0;
    c = mixRGB(c, [110, 88, 64], seam * 0.5);
    h -= seam * 0.2;
    // 雨水冲沟：竖向的长条低洼，越往下越明显
    const g = gullyN(u * 24, v * 2);
    const gully = clamp01((g - 0.72) * 5) * (0.4 + v * 0.6);
    c = mixRGB(c, [120, 96, 70], gully * 0.6);
    h -= gully * 0.35;
    // 麦秸
    if (strawMask[y * W + x]) {
      c = mixRGB(c, [214, 188, 120], 0.75);
      h += 0.05;
    }
    // 裂缝
    const cm = crackMask[y * W + x];
    if (cm > 0) {
      c = mixRGB(c, [62, 46, 34], cm * 0.9);
      h -= cm * 0.45;
    }
    return { c, h, r: 0.95 };
  });
  return textureSet({ ...set, normalStrength: 1.2 }, 2);
}

/**
 * 院子里夯实的黄土地：微微起伏、细小石子、踩实的光滑处、零星的干草屑。
 * 一张贴图 = 4 m × 4 m。
 */
export function loessGround({ tint = [1, 1, 1], seed = 41 } = {}) {
  const W = 768;
  const k = W / 1024;
  const fine = makeFbm(seed, 48, 2);
  const mid = makeFbm(seed + 1, 8, 3);
  const big = makeFbm(seed + 2, 2, 2);
  const r = rng(seed + 3);
  const pebbles = new Float32Array(W * W);
  for (let i = 0; i < 1600; i++) {
    const px = r() * W;
    const py = r() * W;
    const rad = (0.8 + r() * r() * 4) * k;
    const e = Math.ceil(rad);
    for (let dy = -e; dy <= e; dy++) {
      for (let dx = -e; dx <= e; dx++) {
        const d = Math.hypot(dx, dy) / rad;
        if (d < 1) {
          const xi = ((Math.round(px + dx) % W) + W) % W;
          const yi = ((Math.round(py + dy) % W) + W) % W;
          pebbles[yi * W + xi] = Math.max(pebbles[yi * W + xi], 1 - d * d);
        }
      }
    }
  }
  const set = fillMulti(W, W, (u, v, x, y) => {
    const f = fine(u, v);
    const m = mid(u, v);
    const b = big(u, v);
    let c = [184, 156, 112];
    c = mixRGB(c, [150, 122, 84], clamp01((m - 0.4) * 1.6));
    c = mixRGB(c, [200, 178, 136], clamp01((b - 0.55) * 2)); // 踩实发白的地方
    c = mixRGB(c, [120, 98, 70], clamp01((f - 0.62) * 2.5));
    const p = pebbles[y * W + x];
    if (p > 0) c = mixRGB(c, [160 + p * 40, 150 + p * 35, 135 + p * 30], clamp01(p * 1.5));
    c = [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]];
    return { c, h: 0.4 + m * 0.3 + f * 0.15 + p * 0.3, r: 0.92 - clamp01((b - 0.55) * 2) * 0.15 };
  });
  return textureSet({ ...set, normalStrength: 2.5 }, 4);
}

/** 水泥面（井台、屋面抹灰）：灰色、细砂粒、抹子纹、污渍。一张 = 2 m × 2 m */
export function concrete({ tint = [1, 1, 1], seed = 51, size = 512 } = {}) {
  const W = size;
  const fine = makeFbm(seed, 64, 2);
  const mid = makeFbm(seed + 1, 6, 4);
  const set = fillMulti(W, W, (u, v) => {
    const f = fine(u, v);
    const m = mid(u, v);
    let c = [150, 147, 140];
    c = mixRGB(c, [112, 108, 100], clamp01((m - 0.45) * 1.8));
    c = mixRGB(c, [176, 172, 164], clamp01((f - 0.6) * 2.5));
    c = [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]];
    return { c, h: 0.5 + f * 0.3 + m * 0.2, r: 0.85 + f * 0.1 };
  });
  return textureSet({ ...set, normalStrength: 1.5 }, 2);
}

/** 灶台面抹的黄泥/白灰，被烟熏得发黑。一张 = 1 m × 1 m */
export function mudPlaster({ soot = 0.5, seed = 61 } = {}) {
  const W = 512;
  const fine = makeFbm(seed, 32, 3);
  const mid = makeFbm(seed + 1, 4, 4);
  const set = fillMulti(W, W, (u, v) => {
    const f = fine(u, v);
    const m = mid(u, v);
    let c = [170, 150, 118];
    c = mixRGB(c, [140, 120, 92], clamp01((f - 0.5) * 2));
    c = mixRGB(c, [40, 34, 30], clamp01(m * soot * 1.4));
    return { c, h: 0.5 + f * 0.2 + m * 0.2, r: 0.9 };
  });
  return textureSet({ ...set, normalStrength: 2 }, 1);
}

/**
 * 石灰抹面（台阶、神龛）：灰白的石灰，用旧了发黄发灰，踩踏处发暗，边角零星掉皮露出里面的旧红砖。
 * 一张 = 1 m × 1 m
 */
export function limePlaster({ seed = 63, chips = 1 } = {}) {
  const W = 512;
  const fine = makeFbm(seed, 48, 3);
  const mid = makeFbm(seed + 1, 6, 4);
  const chipN = makeFbm(seed + 2, 10, 4);
  const set = fillMulti(W, W, (u, v, x, y) => {
    const f = fine(u, v);
    const m = mid(u, v);
    let c = [214, 210, 198];
    c = mixRGB(c, [178, 172, 156], clamp01((m - 0.42) * 1.6)); // 发黄发灰的旧痕
    c = mixRGB(c, [232, 230, 222], clamp01((f - 0.62) * 2));
    c = mixRGB(c, [150, 140, 124], clamp01((f - 0.7) * 3) * 0.5); // 细小污点
    let h = 0.55 + f * 0.15 + m * 0.1;
    let r = 0.9;
    // 掉皮：露出里面淡红的旧砖
    const k = chipN(u, v);
    const chip = clamp01((k - (0.74 - 0.04 * chips)) * 14);
    if (chip > 0) {
      const brick = (Math.floor(y / 32) + Math.floor((x + (Math.floor(y / 32) % 2) * 64) / 128)) % 3;
      const bc = [[176, 128, 110], [164, 118, 102], [186, 140, 120]][brick];
      c = mixRGB(c, bc, chip);
      h -= chip * 0.25;
      r = 0.95;
    }
    return { c, h, r };
  });
  return textureSet({ ...set, normalStrength: 2.5 }, 1);
}
