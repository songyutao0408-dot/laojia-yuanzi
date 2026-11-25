import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { box } from '../core/box.js';
import { rng } from '../textures/canvas.js';
import { mat, glassMat, stainMat } from '../textures/index.js';
import { brickBox, baseStain } from './wall.js';
import { woodDoor, woodWindow } from './doorsWindows.js';

/**
 * 厨房：西侧北段的低矮砖平顶房，门窗开在东墙；砖比北屋的更淡、更破（brickOld）。
 * 烟囱从西北角砌出屋顶，顶部熏黑；西南墙角堆着柴火。
 * 灶台、风箱、黄泥内墙在 src/interiors/kitchen.js，挂在 interior-anchor-kitchen 上。
 */
export function createKitchen() {
  const group = new THREE.Group();
  group.name = 'kitchen';
  const mats = {
    wall: mat('brickOld'),
    floor: mat('kitchenFloor'),
    roof: mat('roof'),
    ceiling: mat('brickOldSoot'),
    trim: mat('brickOld'),
    coping: mat('concrete'),
    glass: glassMat,
    lintel: mat('concrete'),
    sill: mat('brickOld'),
  };
  const xe = K.rect.x1 - K.wall / 2; // 东墙中线
  const east = [
    { center: K.door.z, width: K.door.width, bottom: K.floor, top: K.floor + K.door.height, lintel: true },
    ...K.windows.map((w) => ({ center: w.z, width: w.width, bottom: K.floor + w.sill, top: K.floor + w.sill + w.height, glass: true, lintel: true, sill: true })),
  ];
  const { group: shell, inner } = brickBox(
    { rect: K.rect, wall: K.wall, height: K.height, floor: K.floor, parapet: K.parapet, openings: { e: east } },
    mats,
  );
  group.add(shell);

  // 门（单扇木门，向内开）和窗
  group.add(woodDoor({ axis: 'z', at: xe, center: K.door.z, width: K.door.width, bottom: K.floor, height: K.door.height, thickness: K.wall, out: +1, leaves: 1, openDeg: 80 }));
  for (const w of K.windows) group.add(woodWindow({ axis: 'z', at: xe, center: w.z, width: w.width, bottom: K.floor + w.sill, height: w.height, cols: 2, rows: 1 }));

  // 墙根污渍：东立面、南立面
  const stain = stainMat();
  group.add(baseStain(stain, { axis: 'z', from: K.rect.z0, to: K.rect.z1, at: K.rect.x1, face: 'e', height: 0.7 }));
  group.add(baseStain(stain, { axis: 'x', from: K.rect.x0, to: K.rect.x1, at: K.rect.z1, face: 's', height: 0.7 }));

  group.add(createWoodpile(inner)); // 灶台、风箱、黄泥内墙在 src/interiors/kitchen.js

  // 烟囱：灶后西北角砌出屋顶，顶部一段熏黑，顶上一圈挑檐
  const c = K.chimney;
  const half = c.size / 2;
  group.add(box(c.x - half, c.x + half, K.floor, c.top - 0.5, c.z - half, c.z + half, mat('brickOld')));
  group.add(box(c.x - half, c.x + half, c.top - 0.5, c.top, c.z - half, c.z + half, mat('brickOldSoot')));
  group.add(box(c.x - half - 0.04, c.x + half + 0.04, c.top - 0.12, c.top - 0.06, c.z - half - 0.04, c.z + half + 0.04, mat('brickOldSoot'), { solid: false }));

  const anchor = new THREE.Object3D();
  anchor.name = 'interior-anchor-kitchen';
  anchor.position.set(inner.x0, K.floor, inner.z0);
  anchor.userData = { room: 'kitchen', size: { w: inner.x1 - inner.x0, d: inner.z1 - inner.z0, h: K.height - 0.15 - K.floor } };
  group.add(anchor);
  return group;
}

/** 柴火堆：西南墙角横七竖八的树枝、劈柴，外加一捆斜靠墙的玉米秸 */
function createWoodpile(inner) {
  const g = new THREE.Group();
  g.name = 'woodpile';
  const r = rng(77);
  const x0 = inner.x0 + 0.05;
  const x1 = inner.x0 + 1.0;
  const z0 = inner.z1 - 0.9;
  const z1 = inner.z1 - 0.05;
  const wood = mat('rawWood');
  const n = 60;
  const geo = new THREE.CylinderGeometry(1, 1, 1, 7);
  const mesh = new THREE.InstancedMesh(geo, wood, n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const rad = 0.015 + r() * 0.04;
    const len = 0.5 + r() * 0.5;
    const layer = Math.floor(i / 12);
    const p = new THREE.Vector3(x0 + 0.1 + r() * (x1 - x0 - 0.2), K.floor + rad + layer * 0.07 + r() * 0.03, z0 + 0.1 + r() * (z1 - z0 - 0.2));
    q.setFromEuler(new THREE.Euler(Math.PI / 2 + (r() - 0.5) * 0.4, (r() - 0.5) * 1.2, (r() - 0.5) * 0.3));
    m4.compose(p, q, new THREE.Vector3(rad, len, rad));
    mesh.setMatrixAt(i, m4);
  }
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  // 玉米秸：一束细长杆，斜靠南墙
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0xb9a26a, roughness: 1 });
  const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 1.7, 5), stalkMat, 40);
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Vector3(x1 + 0.1 + r() * 0.5, K.floor + 0.8, z1 - 0.12 - r() * 0.12);
    q.setFromEuler(new THREE.Euler(-0.35 + (r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.12));
    m4.compose(p, q, new THREE.Vector3(1, 1, 1));
    stalks.setMatrixAt(i, m4);
  }
  stalks.castShadow = true;
  g.add(stalks);
  // 柴火堆整体作为一个碰撞块
  const blocker = box(x0, x1, K.floor, K.floor + 0.6, z0, z1, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false });
  g.add(blocker);
  return g;
}
