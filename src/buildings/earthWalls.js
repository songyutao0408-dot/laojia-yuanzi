import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EARTH_WALLS } from '../layout.js';
import { box } from '../core/box.js';
import { rng } from '../textures/canvas.js';
import { mat, grassMat } from '../textures/index.js';

/**
 * 夯土院墙（西、南、东）：一层层夯土的纹理、干裂缝、雨水冲沟；墙头被雨水冲得略圆，长着一丛丛杂草。
 */
export function createEarthWalls() {
  const group = new THREE.Group();
  group.name = 'earth-walls';
  const earth = mat('earth');
  const r = rng(201);
  const cards = [];
  for (const w of EARTH_WALLS) {
    const { x0, x1, z0, z1 } = w.rect;
    // 墙身
    group.add(box(x0, x1, 0, w.height - 0.1, z0, z1, earth));
    // 墙头：收窄、被雨水冲圆
    const inset = 0.05;
    group.add(box(x0 + inset, x1 - inset, w.height - 0.1, w.height, z0 + inset, z1 - inset, earth, { solid: false }));
    // 杂草：沿墙头随机分布的十字交叉草片
    const alongX = x1 - x0 > z1 - z0;
    const len = alongX ? x1 - x0 : z1 - z0;
    for (let s = 0.2; s < len - 0.1; s += 0.35) {
      if (r() < 0.35) continue;
      const cw = 0.4 + r() * 0.5;
      const ch = 0.18 + r() * 0.35;
      const px = alongX ? x0 + s : (x0 + x1) / 2 + (r() - 0.5) * 0.2;
      const pz = alongX ? (z0 + z1) / 2 + (r() - 0.5) * 0.2 : z0 + s;
      const yaw = r() * Math.PI;
      for (const extra of [0, Math.PI / 2]) {
        const g = new THREE.PlaneGeometry(cw, ch);
        // 每片草取贴图的一段（贴图横向可平铺）
        const off = r();
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, off + uv.getX(i) * cw * 1.2);
        g.translate(0, ch / 2, 0);
        g.rotateY(yaw + extra);
        g.translate(px, w.height - 0.02, pz);
        cards.push(g);
      }
    }
  }
  if (cards.length) {
    const grass = new THREE.Mesh(mergeGeometries(cards), grassMat());
    grass.castShadow = true;
    grass.name = 'wall-grass';
    group.add(grass);
  }
  return group;
}
