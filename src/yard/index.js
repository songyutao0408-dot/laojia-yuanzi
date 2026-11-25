import * as THREE from 'three';
import { createWaterVat } from './waterVat.js';
import { createStoneSlabs } from './stoneSlabs.js';
import { createImpatiens } from './impatiens.js';
import { createTricycle } from './tricycle.js';
import { createBicycle } from './bicycle.js';

/**
 * 院子里的零碎物件（一个物件一个文件）：
 *   waterVat.js    西北屋门口梧桐树下的大水缸
 *   stoneSlabs.js  影背墙和茅厕之间凌乱放着的老青石板
 *   impatiens.js   东北屋门口台阶东边、窗户底下的一丛指甲桃（凤仙花，第 19 轮，替换了原来东梧桐下的水仙）
 *   tricycle.js    时风三马车（第 17 轮，南墙边、茅厕西边）
 *   bicycle.js     二八自行车（第 17 轮，厨房南墙根）
 * （秋千挂在枣树上，见 trees/swing.js；洋姜见 garden/artichoke.js）
 */
export function createYardItems() {
  const g = new THREE.Group();
  g.name = 'yard-items';
  g.add(createWaterVat(), createStoneSlabs(), createImpatiens(), createTricycle(), createBicycle());
  return g;
}
