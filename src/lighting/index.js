import * as THREE from 'three';

/**
 * 光照。第 1 步只有最基础的半球光 + 太阳平行光；
 * 第 5 步在这里加入 Sky 程序天空、时间切换（清晨/正午/傍晚/夜晚）、星空、雾、窗户灯光。
 */
export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xfff1dc, 0x8a7350, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
  // 傍晚西南方斜阳（+X 东、-Z 北，所以西南 = (-x, +z)）
  sun.position.set(-18, 11, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera;
  s.left = -15; s.right = 15; s.top = 15; s.bottom = -15; s.near = 1; s.far = 60;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  return { hemi, sun };
}
