import * as THREE from 'three';
import { redBrick, brickPaving } from './brick.js';
import { rammedEarth, loessGround, concrete, mudPlaster } from './earth.js';
import { rustyIron, paintedWood, bark } from './metalWood.js';
import { coupletTexture, fuTexture, grassCard, wallBaseStain, wetPatch } from './decals.js';

/**
 * 材质库：按名字取 PBR 材质（MeshStandardMaterial + 颜色/法线/粗糙度贴图），首次使用时生成并缓存。
 * 贴图的 repeat 已按真实尺寸设置，配合 core/box.js 的世界坐标 UV 使用。
 */
const DEFS = {
  brick: () => ({ ...redBrick(), roughness: 1 }),
  // 烟熏黑的砖（烟囱顶、灶口）：同一套砖贴图，乘深色
  brickSoot: () => ({ ...shared('brick'), color: 0x3b3430, roughness: 1 }),
  paving: () => ({ ...brickPaving({ worn: 0.6 }), roughness: 1 }),
  floorBrick: () => ({ ...shared('paving'), color: 0xa89c90, roughness: 1 }),
  earth: () => ({ ...rammedEarth(), roughness: 1 }),
  ground: () => ({ ...loessGround(), roughness: 1 }),
  groundOutside: () => ({ ...shared('ground'), color: 0xa8a48c, roughness: 1 }),
  kitchenFloor: () => ({ ...shared('ground'), color: 0x8a7f72, roughness: 1 }),
  concrete: () => ({ ...concrete(), roughness: 1 }),
  roof: () => ({ ...concrete({ tint: [0.82, 0.8, 0.78], seed: 57, size: 256 }), roughness: 1 }),
  stove: () => ({ ...mudPlaster({ soot: 0.55 }), roughness: 1 }),
  gateIron: () => ({ ...rustyIron({ paint: [44, 70, 58], rustAmount: 0.6, seed: 71 }), roughness: 1, metalness: 0.25 }),
  pumpIron: () => ({ ...rustyIron({ paint: [34, 48, 40], rustAmount: 0.5, seed: 73 }), roughness: 1, metalness: 0.3 }),
  wok: () => ({ ...rustyIron({ paint: [28, 26, 24], rustAmount: 0.25, seed: 75 }), roughness: 1, metalness: 0.4 }),
  wood: () => ({ ...paintedWood({ paint: [110, 42, 32] }), roughness: 1 }),
  oldWood: () => ({ ...paintedWood({ paint: [118, 100, 80], seed: 85, peelAmount: 0 }), roughness: 1 }),
  rawWood: () => ({ ...bark({ base: [120, 100, 80], seed: 95 }), roughness: 1 }),
  limeWash: () => ({ ...concrete({ tint: [1.55, 1.52, 1.45], seed: 59, size: 256 }), roughness: 1 }),
};

const cache = new Map();
function shared(key) {
  // 取另一个材质已生成的贴图组（不重复生成）
  const m = mat(key);
  return { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap };
}

export function mat(key) {
  if (!cache.has(key)) {
    const def = DEFS[key];
    if (!def) throw new Error(`未知材质：${key}`);
    const t0 = performance.now();
    const p = def();
    (globalThis.__texTimes ??= {})[key] = Math.round(performance.now() - t0);
    const m = new THREE.MeshStandardMaterial({
      map: p.map,
      normalMap: p.normalMap,
      roughnessMap: p.roughnessMap,
      roughness: p.roughness ?? 1,
      metalness: p.metalness ?? 0,
      color: p.color ?? 0xffffff,
    });
    m.name = key;
    cache.set(key, m);
  }
  return cache.get(key);
}

/** 窗玻璃：老式平板玻璃，带一点灰绿、有反光 */
export const glassMat = new THREE.MeshStandardMaterial({
  color: 0x9fb8b0,
  roughness: 0.05,
  metalness: 0.1,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
glassMat.name = 'glass';

/* ---------- 带透明通道的贴花材质 ---------- */
const decalCache = new Map();
function decal(key, make) {
  if (!decalCache.has(key)) decalCache.set(key, make());
  return decalCache.get(key);
}

/** 墙根泥点 + 泛碱 */
export const stainMat = () =>
  decal('stain', () => new THREE.MeshStandardMaterial({ map: wallBaseStain(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));

/** 井台周围湿地面：颜色变深、更光滑 */
export const wetMat = () =>
  decal('wet', () => new THREE.MeshStandardMaterial({ map: wetPatch(), transparent: true, depthWrite: false, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }));

/** 墙头杂草 */
export const grassMat = () =>
  decal('grass', () => new THREE.MeshStandardMaterial({ map: grassCard(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }));

/** 春联（每条内容一张贴图） */
export const coupletMat = (text, opts = {}) =>
  decal(`couplet:${text}:${opts.vertical !== false}`, () =>
    new THREE.MeshStandardMaterial({ map: coupletTexture(text, opts), alphaTest: 0.4, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }));

/** 倒贴的“福” */
export const fuMat = () =>
  decal('fu', () => new THREE.MeshStandardMaterial({ map: fuTexture(), alphaTest: 0.4, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }));
