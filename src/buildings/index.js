import * as THREE from 'three';
import { createNorthHouse } from './northHouse.js';
import { createKitchen } from './kitchen.js';
import { createEarthWalls } from './earthWalls.js';
import { createGate } from './gate.js';
import { createScreenWall } from './screenWall.js';
import { createToilet } from './toilet.js';

/**
 * 建筑总装。每个建筑一个文件：
 *   northHouse.js   北屋（西北屋 + 东北屋）
 *   kitchen.js      厨房
 *   earthWalls.js   夯土院墙
 *   gate.js         西南角双开铁门
 *   screenWall.js   影背墙（瓷砖画）
 *   toilet.js       东南角茅厕
 *   wall.js         通用：带门窗洞口的墙、矩形砖房外壳
 * 室内细节放在 src/interiors/，挂到各建筑的 interior-anchor-* 节点上。
 */
export function createBuildings() {
  const group = new THREE.Group();
  group.name = 'buildings';
  group.add(createNorthHouse(), createKitchen(), createEarthWalls(), createGate(), createScreenWall(), createToilet());
  return group;
}
