import * as THREE from 'three';
import { createWaterVat } from './waterVat.js';
import { createStoneSlabs } from './stoneSlabs.js';

/**
 * 院子里的零碎物件（一个物件一个文件）：
 *   waterVat.js    西北屋门口梧桐树下的大水缸
 *   stoneSlabs.js  影背墙和茅厕之间凌乱放着的老青石板
 * （秋千挂在枣树上，见 trees/swing.js；洋姜见 garden/artichoke.js）
 */
export function createYardItems() {
  const g = new THREE.Group();
  g.name = 'yard-items';
  g.add(createWaterVat(), createStoneSlabs());
  return g;
}
