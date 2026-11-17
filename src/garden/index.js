import * as THREE from 'three';

/**
 * 菜地（第 4 步）：东土墙下的小菜畦，黄瓜、豆角爬竹竿架，其余时令蔬菜。
 */
export function createGarden() {
  const group = new THREE.Group();
  group.name = 'garden';
  return group;
}
