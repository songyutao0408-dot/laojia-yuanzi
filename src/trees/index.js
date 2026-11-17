import * as THREE from 'three';
import { TREES } from '../layout.js';
import { createPaulownia } from './paulownia.js';
import { createPomegranate } from './pomegranate.js';
import { createJujube } from './jujube.js';

/**
 * 树木总装。每种树一个文件：
 *   paulownia.js    泡桐（当地叫“梧桐”，layout 里 kind = 'wutong'）×2
 *   pomegranate.js  石榴（果子可点击采摘）
 *   jujube.js       枣树（果子可点击采摘）
 *   treeBuilder.js  通用：递归生长枝干骨架、树皮圆管、叶片卡片、挂果点、碰撞体
 *   wind.js         叶片风摆（顶点着色器）；主循环里 updateWind(t)
 */
const BUILDERS = { wutong: createPaulownia, pomegranate: createPomegranate, jujube: createJujube };

export function createTrees() {
  const group = new THREE.Group();
  group.name = 'trees';
  for (const t of TREES) group.add(BUILDERS[t.kind](t));
  return group;
}
export { updateWind } from './wind.js';
