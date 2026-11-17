import * as THREE from 'three';
import { GARDEN as G } from '../layout.js';
import { wb, box } from '../core/whitebox.js';

/**
 * 菜地（第 2 步白模：菜畦 + 竹竿人字架的位置和高度）。
 * 第 4 步加丝瓜、豆角藤蔓与叶片、垄沟。
 */
export function createGarden() {
  const group = new THREE.Group();
  group.name = 'garden';
  const r = G.rect;
  const poleH = 1.9;
  for (const bed of G.beds) {
    group.add(box(r.x0 + 0.1, r.x1 - 0.1, 0, 0.1, bed.z0 + 0.05, bed.z1 - 0.05, wb('soil'), { solid: false }));
    if (!bed.trellis) continue;
    // 两排竹竿向中间斜靠成“人字架”，每 0.5 m 一对
    const xa = r.x0 + 0.35;
    const xb = r.x1 - 0.35;
    const xm = (xa + xb) / 2;
    const lean = Math.atan2((xb - xa) / 2, poleH);
    const len = Math.hypot((xb - xa) / 2, poleH);
    for (let z = bed.z0 + 0.25; z < bed.z1 - 0.1; z += 0.5) {
      for (const [x, s] of [[xa, -1], [xb, 1]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, len, 6), wb('bamboo'));
        pole.position.set((x + xm) / 2, poleH / 2 + 0.1, z);
        pole.rotation.z = s * lean;
        pole.castShadow = true;
        group.add(pole);
      }
    }
    // 顶上一根横竿
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, bed.z1 - bed.z0 - 0.2, 6), wb('bamboo'));
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(xm, poleH + 0.1, (bed.z0 + bed.z1) / 2);
    group.add(ridge);
  }
  return group;
}
