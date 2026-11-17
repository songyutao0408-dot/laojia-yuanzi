import * as THREE from 'three';

/**
 * 树木（第 4 步）：wutong.js（梧桐×2）、pomegranate.js（石榴）、jujube.js（枣树）。
 * 要求：分叉树干 + 树皮纹理，透明叶片贴图成簇分布，顶点着色器风摆；果子可点击采摘。
 */
export function createTrees() {
  const group = new THREE.Group();
  group.name = 'trees';
  return group;
}
