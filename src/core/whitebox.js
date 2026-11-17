import * as THREE from 'three';

/**
 * 第 2 步白模用的纯色材质（按材质类别分色，方便第 3 步逐类替换成 PBR 贴图材质）。
 * 每个 key 对应将来 src/textures 里的一种程序贴图。
 */
const COLORS = {
  brick: 0xb5523b, // 清水红砖墙
  brickDark: 0x8e3d2c, // 台阶、檐口
  floor: 0x9a8f80, // 室内地面（以后可能是砖地/水泥地）
  roof: 0x7b746a, // 平顶屋面
  earth: 0xa68a5b, // 夯土墙
  iron: 0x3f4a44, // 铁门、压水井
  tile: 0x6fa3c7, // 影背墙瓷砖画
  plaster: 0xcfc6b4, // 影背墙墙身
  concrete: 0xa9a59c, // 井台
  soil: 0x6b5236, // 菜畦
  bamboo: 0xb9a46a, // 竹竿
  bark: 0x5a3e22, // 树干
  stove: 0x8a7f74, // 灶台
  soot: 0x2e2a27, // 烟熏的烟囱顶
};

const cache = new Map();
export function wb(key) {
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color: COLORS[key], roughness: 0.9, metalness: 0 }));
  }
  return cache.get(key);
}

/** 窗玻璃：透明 */
export const glass = new THREE.MeshStandardMaterial({
  color: 0xbfd8e0,
  roughness: 0.05,
  metalness: 0,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
});

/** 树冠体积占位（半透明），第 4 步换成真正的枝叶 */
export const crownGhost = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.35, depthWrite: false });

/** box() 已移到 core/box.js（世界坐标 UV），这里转出以兼容 */
export { box } from './box.js';
