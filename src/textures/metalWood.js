import { fillMulti, textureSet, makeFbm, makeNoise, mixRGB, clamp01 } from './canvas.js';

/**
 * 刷了漆的旧铁件：漆面褪色、大片掉漆、露出锈。paint 为漆色（0..255）。
 * 返回额外的 metalnessMap（锈和漆都不太“金属”，露铁处略高）。一张 = 1 m × 1 m
 */
export function rustyIron({ paint = [52, 74, 60], rustAmount = 0.5, seed = 71 } = {}) {
  const W = 512;
  const peel = makeFbm(seed, 4, 5);
  const rustN = makeFbm(seed + 1, 12, 4);
  const fine = makeFbm(seed + 2, 64, 2);
  const drip = makeNoise(seed + 3, 48);
  const set = fillMulti(W, W, (u, v) => {
    const p = peel(u, v);
    const rr = rustN(u, v);
    const f = fine(u, v);
    // 往下流的锈痕
    const streak = clamp01((drip(u * 48, v * 3) - 0.6) * 3) * v;
    const lost = clamp01((p - (0.62 - rustAmount * 0.2)) * 8); // 掉漆区域
    const faded = mixRGB(paint, [paint[0] * 1.25 + 20, paint[1] * 1.2 + 20, paint[2] * 1.15 + 20], f * 0.6);
    const rust = mixRGB([122, 58, 28], [70, 36, 22], rr);
    let c = mixRGB(faded, rust, lost);
    c = mixRGB(c, [110, 56, 30], streak * 0.6);
    // 掉漆边缘的漆皮翘起
    const edge = lost > 0.05 && lost < 0.5 ? 1 : 0;
    return { c, h: 0.5 + (1 - lost) * 0.25 + edge * 0.15 - rr * lost * 0.2 + f * 0.05, r: mix(0.55, 0.92, lost) + f * 0.05 };
  });
  return textureSet({ ...set, normalStrength: 2.5 }, 1);
}
const mix = (a, b, t) => a + (b - a) * t;

/**
 * 刷漆的旧木头（门、窗框）：木纹顺 V 方向，漆褪色、龟裂、局部剥落露出灰白木头。一张 = 1 m × 1 m
 */
export function paintedWood({ paint = [112, 40, 30], seed = 81, peelAmount = 1 } = {}) {
  const W = 512;
  const grainN = makeNoise(seed, 64);
  const warp = makeFbm(seed + 1, 4, 3);
  const peel = makeFbm(seed + 2, 12, 4);
  const crackN = makeNoise(seed + 3, 128);
  const set = fillMulti(W, W, (u, v) => {
    const w = warp(u, v);
    const grain = grainN(u * 64 + w * 6, v * 2);
    const ring = Math.abs(Math.sin((u * 40 + w * 8) * Math.PI));
    const wood = mixRGB([150, 132, 108], [104, 88, 70], grain * 0.6 + ring * 0.3);
    const p = peel(u, v);
    const lost = clamp01((p - 0.66) * 9) * peelAmount;
    const paintC = mixRGB(paint, [paint[0] * 1.3 + 25, paint[1] * 1.25 + 20, paint[2] * 1.25 + 20], clamp01(w * 0.8));
    let c = mixRGB(paintC, wood, lost);
    // 漆面竖向细裂
    const ck = clamp01((crackN(u * 128, v * 6) - 0.82) * 6) * (1 - lost);
    c = mixRGB(c, [50, 30, 24], ck * 0.6);
    return { c, h: 0.5 + (1 - lost) * 0.2 + grain * 0.15 - ck * 0.3, r: 0.6 + lost * 0.3 + grain * 0.05 };
  });
  return textureSet({ ...set, normalStrength: 2 }, 1);
}

/** 树皮（第 4 步树木也会用）：纵向深裂纹。一张 = 1 m × 1 m */
export function bark({ base = [96, 84, 70], seed = 91 } = {}) {
  const W = 512;
  const n = makeNoise(seed, 24);
  const f = makeFbm(seed + 1, 16, 4);
  const set = fillMulti(W, W, (u, v) => {
    const ridge = 1 - Math.abs(n(u * 24 + f(u, v) * 3, v * 3) * 2 - 1);
    const c = mixRGB([base[0] * 0.5, base[1] * 0.5, base[2] * 0.5], base, ridge);
    return { c, h: ridge, r: 0.95 };
  });
  return textureSet({ ...set, normalStrength: 5 }, 1);
}

/**
 * 较光滑的树皮（泡桐、石榴）：灰褐底色、浅色皮孔斑点、细小横纹。一张 = 1 m × 1 m
 */
export function smoothBark({ base = [118, 108, 96], seed = 97, lenticels = 1 } = {}) {
  const W = 256;
  const f = makeFbm(seed, 8, 4);
  const fine = makeFbm(seed + 1, 32, 3);
  const dots = makeNoise(seed + 2, 64);
  const set = fillMulti(W, W, (u, v) => {
    const a = f(u, v);
    const b = fine(u, v * 0.3);
    let c = mixRGB([base[0] * 0.7, base[1] * 0.7, base[2] * 0.7], base, a);
    c = mixRGB(c, [base[0] * 1.2, base[1] * 1.18, base[2] * 1.12], clamp01((b - 0.55) * 2));
    // 皮孔：横向的小浅色斑
    const d = dots(u * 64, v * 128);
    const len = clamp01((d - 0.82) * 8) * lenticels;
    c = mixRGB(c, [200, 190, 170], len * 0.7);
    return { c, h: 0.5 + a * 0.2 + b * 0.2 + len * 0.15, r: 0.85 };
  });
  return textureSet({ ...set, normalStrength: 2 }, 1);
}
