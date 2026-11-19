import * as THREE from 'three';
import { BACK_YARD as B } from '../layout.js';
import { mat } from '../textures/index.js';
import { worldUV } from '../core/box.js';
import { rng } from '../textures/canvas.js';

/**
 * 影背墙和茅厕之间凌乱放着的几块老青石板（1.8 × 0.6 × 0.12 m）：青灰色，边角磨圆、缺了几块，
 * 有一块叠在另一块上；板底和地面接缝处长着点草。可以踩上去（groundHeight 里处理）。
 */
export function createStoneSlabs() {
  const g = new THREE.Group();
  g.name = 'stone-slabs';
  const { l, w, t } = B.slabSize;
  const r = rng(808);
  const stone = mat('bluestone');
  for (const sl of B.slabs) {
    const geo = new THREE.BoxGeometry(l, t, w, 8, 1, 3);
    // 边缘随机磕掉一点、整体轻微不平
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const atEdge = Math.abs(Math.abs(x) - l / 2) < 1e-3 || Math.abs(Math.abs(z) - w / 2) < 1e-3;
      if (atEdge && y > 0) pos.setY(i, y - r() * 0.025);
      if (atEdge) pos.setX(i, x * (1 - r() * 0.012));
      pos.setY(i, pos.getY(i) + Math.sin(x * 2.1 + sl.x) * 0.006);
    }
    geo.computeVertexNormals();
    const rot = (sl.rot * Math.PI) / 180;
    geo.rotateY(rot);
    geo.translate(sl.x, sl.y + t / 2, sl.z);
    worldUV(geo);
    const m = new THREE.Mesh(geo, stone);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
