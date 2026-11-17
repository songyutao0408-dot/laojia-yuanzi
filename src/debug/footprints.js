import * as THREE from 'three';
import * as L from '../layout.js';
import { rectSize, rectCenter } from '../core/geom.js';

/**
 * 第 1 步临时用：把 layout.js 里每个物体的占地范围画成贴地色块 + 树冠圆圈，
 * 用来在 3D 里核对方位。第 2 步白模完成后从 main.js 中移除。
 */
export function createFootprints() {
  const group = new THREE.Group();
  group.name = 'debug-footprints';
  const plate = (r, color, y = 0.02, h = 0.04) => {
    const { w, d } = rectSize(r);
    const c = rectCenter(r);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    m.position.set(c.x, y + h / 2, c.z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  const ring = (x, z, r, color) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.06, r, 64),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    group.add(m);
  };

  for (const room of L.NORTH_HOUSE.rooms)
    plate({ x0: room.x0 + 0.05, x1: room.x1 - 0.05, z0: L.NORTH_HOUSE.rect.z0, z1: L.NORTH_HOUSE.rect.z1 }, room.id === 'west' ? 0xb5523b : 0xc4664c, 0, 0.3);
  plate(L.KITCHEN.rect, 0x9b4632, 0, 0.25);
  plate(L.TOILET.rect, 0xb5523b, 0, 0.2);
  plate(L.SCREEN_WALL.rect, 0x5f93b8, 0, 0.6);
  for (const w of L.EARTH_WALLS) plate(w.rect, 0x9c7f52, 0, 0.5);
  for (const p of L.GATE.posts) plate(p, 0xb5523b, 0, 0.6);
  plate(L.GARDEN.rect, 0x6f8f3d, 0, 0.05);
  const W = L.WELL;
  plate({ x0: W.x - W.platform.width / 2, x1: W.x + W.platform.width / 2, z0: W.z - W.platform.depth / 2, z1: W.z + W.platform.depth / 2 }, 0x9a958a, 0, W.platform.height);

  const treeColor = { wutong: 0x3e6e2e, pomegranate: 0xb03a2a, jujube: 0x7a6a28 };
  for (const t of L.TREES) {
    ring(t.x, t.z, t.crown, treeColor[t.kind]);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(t.trunkRadius, t.trunkRadius, t.height * 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x5a3e22 }),
    );
    trunk.position.set(t.x, t.height * 0.2, t.z);
    trunk.castShadow = true;
    group.add(trunk);
  }
  return group;
}
