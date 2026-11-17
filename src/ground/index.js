import * as THREE from 'three';
import { LOT, BRICK_PATHS } from '../layout.js';
import { rectSize, rectCenter } from '../core/geom.js';

/**
 * 地面：院内黄土地 + 院外田野 + 红砖小路。
 * 第 1 步只用纯色材质；第 3 步换成 src/textures 里程序生成的 PBR 贴图。
 */
export function createGround() {
  const group = new THREE.Group();
  group.name = 'ground';

  // 院外地面（大一圈，淡出到雾里）
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x9a9468, roughness: 1 }),
  );
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.01;
  outside.receiveShadow = true;
  group.add(outside);

  // 院内黄土地
  const { w, d } = rectSize(LOT);
  const c = rectCenter(LOT);
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0xd2b98a, roughness: 0.95 }),
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(c.x, 0, c.z);
  yard.receiveShadow = true;
  group.add(yard);

  // 红砖小路：沿折线逐段铺
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xa4553d, roughness: 0.9 });
  for (const p of BRICK_PATHS) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const [ax, az] = p.points[i];
      const [bx, bz] = p.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az) + p.width; // 两端各延伸半个宽度，转角处补齐
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(len, p.width), pathMat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = -Math.atan2(bz - az, bx - ax);
      seg.position.set((ax + bx) / 2, 0.005 + i * 0.0005, (az + bz) / 2);
      seg.receiveShadow = true;
      group.add(seg);
    }
  }
  return group;
}
