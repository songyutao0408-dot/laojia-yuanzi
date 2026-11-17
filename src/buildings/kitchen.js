import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { box } from '../core/box.js';
import { rng } from '../textures/canvas.js';
import { mat, glassMat, stainMat } from '../textures/index.js';
import { brickBox, baseStain } from './wall.js';
import { woodDoor, woodWindow } from './doorsWindows.js';

/**
 * 厨房：西侧北段的低矮红砖平顶房，门窗开在东墙。
 * 室内西北角是砖砌柴火灶（泥抹面、烟熏黑）+ 大铁锅 + 木锅盖，灶旁一只木风箱，
 * 灶口朝东；烟囱从灶后砌出屋顶，顶部熏黑；西南墙角堆着柴火。
 * 暴露 interiorAnchor（室内西北角、地坪面），以后 src/interiors/kitchen.js 挂在这里。
 */
export function createKitchen() {
  const group = new THREE.Group();
  group.name = 'kitchen';
  const mats = {
    wall: mat('brick'),
    floor: mat('kitchenFloor'),
    roof: mat('roof'),
    ceiling: mat('brickSoot'),
    trim: mat('brick'),
    coping: mat('concrete'),
    glass: glassMat,
    lintel: mat('concrete'),
    sill: mat('brick'),
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

  group.add(createStove(), createWoodpile(inner));

  // 烟囱：灶后西北角砌出屋顶，顶部一段熏黑，顶上一圈挑檐
  const c = K.chimney;
  const half = c.size / 2;
  group.add(box(c.x - half, c.x + half, K.floor, c.top - 0.5, c.z - half, c.z + half, mat('brick')));
  group.add(box(c.x - half, c.x + half, c.top - 0.5, c.top, c.z - half, c.z + half, mat('brickSoot')));
  group.add(box(c.x - half - 0.04, c.x + half + 0.04, c.top - 0.12, c.top - 0.06, c.z - half - 0.04, c.z + half + 0.04, mat('brickSoot'), { solid: false }));

  const anchor = new THREE.Object3D();
  anchor.name = 'interior-anchor-kitchen';
  anchor.position.set(inner.x0, K.floor, inner.z0);
  anchor.userData = { room: 'kitchen', size: { w: inner.x1 - inner.x0, d: inner.z1 - inner.z0, h: K.height - 0.15 - K.floor } };
  group.add(anchor);
  return group;
}

/** 砖砌柴火灶 + 大铁锅 + 木锅盖 + 风箱 */
function createStove() {
  const g = new THREE.Group();
  g.name = 'stove';
  const s = K.stove;
  const y0 = K.floor;
  const top = y0 + s.height;
  const cx = (s.x0 + s.x1) / 2;
  const cz = s.z1 - s.wokFromSouth; // 锅心（烟囱在锅后面）
  const plaster = mat('stove');
  // 灶体（四周抹泥，顶面开锅口）：用四块围出中间的锅洞
  const R = 0.36; // 锅口半径（铁锅直径约 0.7 m）
  g.add(box(s.x0, s.x1, y0, top - 0.12, s.z0, s.z1, plaster));
  g.add(box(s.x0, s.x1, top - 0.12, top, s.z0, cz - R, plaster));
  g.add(box(s.x0, s.x1, top - 0.12, top, cz + R, s.z1, plaster));
  g.add(box(s.x0, cx - R, top - 0.12, top, cz - R, cz + R, plaster));
  g.add(box(cx + R, s.x1, top - 0.12, top, cz - R, cz + R, plaster));
  // 大铁锅：半球形，锅沿略高于灶面
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * R, -Math.cos(a) * 0.22));
  }
  pts.push(new THREE.Vector2(R + 0.02, 0.005));
  const wok = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat('wok'));
  wok.material.side = THREE.DoubleSide;
  wok.position.set(cx, top, cz);
  wok.receiveShadow = true;
  g.add(wok);
  // 木锅盖：盖住一大半，斜搭在锅沿上
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.04, 40), mat('rawWood'));
  lid.position.set(cx + 0.06, top + 0.05, cz - 0.05);
  lid.rotation.z = 0.08;
  lid.castShadow = lid.receiveShadow = true;
  g.add(lid);
  const knob = box(cx - 0.12, cx + 0.24, top + 0.07, top + 0.11, cz - 0.07, cz - 0.03, mat('rawWood'), { solid: false });
  g.add(knob);
  // 灶口（朝东，烧火的地方）：黑洞 + 熏黑的砖圈
  const mouth = box(s.x1 - 0.005, s.x1 + 0.005, y0 + 0.12, y0 + 0.42, cz - 0.16, cz + 0.16, mat('brickSoot'), { solid: false });
  g.add(mouth);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0x0b0806 }));
  hole.position.set(s.x1 + 0.007, y0 + 0.25, cz);
  hole.rotation.y = Math.PI / 2;
  g.add(hole);
  // 灶台顶的一块熏黑的墙
  // 风箱：放在灶口南侧地上，拉杆朝东
  const bx0 = s.x1 - 0.1;
  const bz = s.z1 + 0.05;
  g.add(box(bx0, bx0 + 0.32, y0, y0 + 0.42, bz, bz + 0.62, mat('oldWood')));
  g.add(box(bx0 + 0.32, bx0 + 0.5, y0 + 0.3, y0 + 0.33, bz + 0.18, bz + 0.21, mat('rawWood'), { solid: false }));
  g.add(box(bx0 + 0.32, bx0 + 0.5, y0 + 0.3, y0 + 0.33, bz + 0.41, bz + 0.44, mat('rawWood'), { solid: false }));
  g.add(box(bx0 + 0.48, bx0 + 0.52, y0 + 0.28, y0 + 0.35, bz + 0.15, bz + 0.47, mat('rawWood'), { solid: false }));
  return g;
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
