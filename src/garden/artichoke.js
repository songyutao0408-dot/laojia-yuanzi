import * as THREE from 'three';
import { BACK_YARD as B } from '../layout.js';
import { Q } from '../core/quality.js';
import { rng } from '../textures/canvas.js';
import { artichokeLeaves, artichokeFlower, leafMaterial } from '../textures/leaves.js';
import { applyWind } from '../trees/wind.js';

/**
 * 洋姜（菊芋）：影背墙和茅厕之间的一片，一丛丛 1.6~2.6 m 高的粗杆子，叶子粗糙，
 * 初秋顶上开着像小向日葵的黄花。种得随意、不成行；人能挤进去（不挡人）。
 */
export function createArtichokes() {
  const g = new THREE.Group();
  g.name = 'jerusalem-artichoke';
  const a = B.jerusalemArtichoke;
  const r = rng(515);

  // 地面：一片松软发黑的土
  const soil = new THREE.Mesh(
    new THREE.PlaneGeometry(a.x1 - a.x0 + 0.3, a.z1 - a.z0 + 0.2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x5e4a34, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  soil.position.set((a.x0 + a.x1) / 2, 0.004, (a.z0 + a.z1) / 2);
  soil.receiveShadow = true;
  g.add(soil);

  // 一丛丛的：先撒丛的中心，每丛 3~6 根杆
  const stems = [];
  const clumps = 16;
  for (let c = 0; c < clumps; c++) {
    const cx = a.x0 + 0.25 + r() * (a.x1 - a.x0 - 0.5);
    const cz = a.z0 + 0.2 + r() * (a.z1 - a.z0 - 0.4);
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const h = 1.6 + r() * 1.0;
      const lean = new THREE.Vector3((r() - 0.5) * 0.35, 1, (r() - 0.5) * 0.35).normalize();
      stems.push({ base: new THREE.Vector3(cx + (r() - 0.5) * 0.35, 0, cz + (r() - 0.5) * 0.35), h, lean });
    }
  }

  // 杆：细长圆柱（实例化）
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x6f6a3a, roughness: 0.9 });
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.014, 1, 5).translate(0, 0.5, 0);
  const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, stems.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  stems.forEach((s, i) => {
    q.setFromUnitVectors(UP, s.lean);
    m4.compose(s.base, q, new THREE.Vector3(1, s.h, 1));
    stemMesh.setMatrixAt(i, m4);
  });
  stemMesh.castShadow = true;
  g.add(stemMesh);

  // 叶片卡片：沿杆从 0.3 m 往上，越往上越密
  const leafMat = applyWind(leafMaterial(artichokeLeaves(), { roughness: 0.85 }), { amp: 0.03, freq: 1.9 });
  const perStem = Math.round(9 * Q.leaf);
  const leafGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, stems.length * perStem);
  let li = 0;
  const e = new THREE.Euler();
  for (const s of stems) {
    for (let k = 0; k < perStem; k++) {
      const t = 0.18 + Math.pow(r(), 0.7) * 0.8;
      const p = s.base.clone().addScaledVector(s.lean, s.h * t);
      const size = 0.32 + r() * 0.16;
      e.set(-(0.3 + r() * 0.7), r() * Math.PI * 2, (r() - 0.5) * 0.6, 'YXZ');
      q.setFromEuler(e);
      m4.compose(p, q, new THREE.Vector3(size, size, size));
      leaves.setMatrixAt(li++, m4);
    }
  }
  leaves.castShadow = leaves.receiveShadow = true;
  g.add(leaves);

  // 花：杆顶 1~3 朵，加几朵花苞
  const flowerMat = applyWind(
    new THREE.MeshStandardMaterial({ map: artichokeFlower(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }),
    { amp: 0.02, freq: 1.9 },
  );
  const flowerGeo = new THREE.PlaneGeometry(1, 1);
  const tops = [];
  for (const s of stems) {
    const n = r() < 0.25 ? 0 : 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const p = s.base.clone().addScaledVector(s.lean, s.h * (0.93 + r() * 0.07));
      p.x += (r() - 0.5) * 0.2;
      p.z += (r() - 0.5) * 0.2;
      p.y -= r() * 0.15;
      tops.push(p);
    }
  }
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, tops.length);
  tops.forEach((p, i) => {
    // 花盘大多朝南、朝上偏
    e.set(-0.5 - r() * 0.6, (r() - 0.5) * 2.4, 0, 'YXZ');
    q.setFromEuler(e);
    const sz = 0.06 + r() * 0.04;
    m4.compose(p, q, new THREE.Vector3(sz, sz, sz));
    flowers.setMatrixAt(i, m4);
  });
  flowers.castShadow = true;
  g.add(flowers);
  return g;
}
