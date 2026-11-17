import * as THREE from 'three';

/**
 * 建筑总装。每个建筑一个文件（第 2 步起逐个添加）：
 *   northHouse.js   北屋（西北屋 + 东北屋，墙有厚度、门洞可进、玻璃窗、台阶、檐口、春联）
 *   kitchen.js      厨房（可进入的室内、烟囱、灶台、柴火）
 *   earthWalls.js   夯土院墙
 *   gate.js         西南角双开铁门
 *   screenWall.js   影背墙（瓷砖画）
 *   toilet.js       东南角茅厕
 * 室内细节放在 src/interiors/，由各建筑在自己的房间原点处挂载。
 */
export function createBuildings() {
  const group = new THREE.Group();
  group.name = 'buildings';
  return group;
}
