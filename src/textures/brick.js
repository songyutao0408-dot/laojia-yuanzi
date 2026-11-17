import { fillMulti, textureSet, makeFbm, hash, mixRGB, clamp01 } from './canvas.js';

/**
 * 清水红砖墙（不抹灰）：240×115×53 标准砖、10 mm 灰白砖缝、顺砖错缝。
 * 一张贴图 = 1 m × 1 m（4 块砖 × 16 皮）。砖色深浅不一，偶有过火的深色砖、缺角、麻点。
 */
export function redBrick({ tint = null } = {}) {
  const W = 512;
  const cellW = 128; // 0.25 m
  const cellH = 32; // 0.0625 m
  const joint = 4.5;
  const grain = makeFbm(11, 16, 4);
  const mottle = makeFbm(12, 8, 3);
  const dirt = makeFbm(13, 2, 4);
  const PAL = [
    [168, 76, 54], [178, 86, 60], [158, 70, 52], [186, 98, 70], [148, 66, 50], [172, 84, 62], [190, 108, 78],
  ];
  const set = fillMulti(W, W, (u, v, x, y) => {
    const row = Math.floor(y / cellH);
    const off = row % 2 ? cellW / 2 : 0;
    const xx = (x + off) % W;
    const col = Math.floor(xx / cellW);
    const lx = xx % cellW;
    const ly = y % cellH;
    const id = row * 7 + col;
    const r0 = hash(id, 1);
    // 缺角：每块砖随机一个角被啃掉一点
    const chip = hash(id, 2) < 0.25 ? 3 + hash(id, 3) * 5 : 0;
    const corner = Math.floor(hash(id, 4) * 4);
    const cx = corner % 2 ? cellW - lx : lx - joint;
    const cy = corner > 1 ? cellH - ly : ly - joint;
    const chipped = chip > 0 && cx + cy < chip;
    const mortar = lx < joint || ly < joint || chipped;
    const g = grain(u, v);
    if (mortar) {
      const m = 0.72 + g * 0.12 + dirt(u, v) * 0.08;
      return { c: [m * 232, m * 226, m * 214], h: 0.15 + g * 0.15, r: 0.97 };
    }
    let base = PAL[Math.floor(r0 * PAL.length)];
    if (hash(id, 5) < 0.035) base = [104, 52, 42]; // 过火深色砖
    if (hash(id, 6) < 0.05) base = [186, 110, 78]; // 欠火浅色砖
    const mt = mottle(u * 1.7 + r0, v * 1.7);
    let c = mixRGB(base, [base[0] * 0.75, base[1] * 0.7, base[2] * 0.7], mt);
    // 麻点
    const pit = g > 0.68 ? (g - 0.68) * 3 : 0;
    c = mixRGB(c, [70, 40, 32], clamp01(pit));
    // 边缘稍暗、稍圆
    const ex = Math.min(lx - joint, cellW - lx, ly - joint, cellH - ly);
    const bevel = clamp01(ex / 2.5);
    c = mixRGB([c[0] * 0.8, c[1] * 0.8, c[2] * 0.8], c, bevel);
    // 墙面整体的灰尘
    const dd = dirt(u, v);
    c = mixRGB(c, [150, 130, 110], clamp01((dd - 0.55) * 1.2));
    if (tint) c = [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]];
    return { c, h: 0.55 + bevel * 0.3 + g * 0.15 - pit * 0.3, r: 0.78 + g * 0.15 };
  });
  return textureSet({ ...set, normalStrength: 3 }, 1);
}

/**
 * 地面铺砖（平铺的红砖，砖面朝上）：用于小路、台阶面、北屋室内地面。
 * 一张贴图 = 1 m × 1 m，砖 0.25 × 0.125 m，砖缝里是土。
 */
export function brickPaving({ worn = 0.5 } = {}) {
  const W = 512;
  const cellW = 128;
  const cellH = 64;
  const joint = 4;
  const grain = makeFbm(21, 16, 4);
  const mottle = makeFbm(22, 6, 3);
  const dust = makeFbm(23, 3, 4);
  const set = fillMulti(W, W, (u, v, x, y) => {
    const row = Math.floor(y / cellH);
    const off = row % 2 ? cellW / 2 : 0;
    const xx = (x + off) % W;
    const col = Math.floor(xx / cellW);
    const lx = xx % cellW;
    const ly = y % cellH;
    const id = row * 5 + col + 1000;
    const g = grain(u, v);
    if (lx < joint || ly < joint) {
      const m = 0.8 + g * 0.2;
      return { c: [128 * m, 104 * m, 76 * m], h: 0.1 + g * 0.1, r: 1 };
    }
    const r0 = hash(id, 1);
    const base = [138 + r0 * 30, 64 + r0 * 18, 48 + r0 * 12];
    let c = mixRGB(base, [base[0] * 0.78, base[1] * 0.75, base[2] * 0.75], mottle(u + r0, v));
    // 踩磨得发亮、积灰发黄
    const d = dust(u, v);
    c = mixRGB(c, [176, 150, 112], clamp01((d - 0.4) * worn * 1.6));
    const ex = Math.min(lx - joint, cellW - lx, ly - joint, cellH - ly);
    const bevel = clamp01(ex / 3.5);
    c = mixRGB([c[0] * 0.75, c[1] * 0.75, c[2] * 0.75], c, bevel);
    // 碎裂的砖
    const crack = hash(id, 7) < 0.15 && Math.abs(lx - cellW * (0.3 + hash(id, 8) * 0.4) - (ly - cellH / 2) * 0.6) < 1;
    if (crack) return { c: [70, 52, 40], h: 0.3, r: 1 };
    return { c, h: 0.55 + bevel * 0.3 + g * 0.1, r: 0.72 + g * 0.2 - worn * 0.1 };
  });
  return textureSet({ ...set, normalStrength: 3 }, 1);
}
