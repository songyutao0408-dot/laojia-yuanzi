import * as THREE from 'three';
import { Q } from '../core/quality.js';
import { GARDEN as G } from '../layout.js';
import { box, worldUV } from '../core/box.js';
import { rng } from '../textures/canvas.js';
import { mat } from '../textures/index.js';
import { luffaLeaves, beanLeaves, leafMaterial } from '../textures/leaves.js';
import { applyWind } from '../trees/wind.js';

/**
 * 菜地（我娘种的）：东土墙下两畦，丝瓜一畦、豆角一畦，都爬在竹竿搭的人字架上。
 * - 菜畦：松过的深色土、起垄，四周踩实的畦埂
 * - 竹竿人字架：每 0.5 m 一对斜靠的竹竿 + 顶上一根横竿，竹竿有节
 * - 丝瓜：掌状大叶、卷须、小黄花，垂着几根长长的丝瓜
 * - 豆角：三出复叶，挂着一串串细长豆荚
 */
export function createGarden() {
  const group = new THREE.Group();
  group.name = 'garden';
  const r = rng(303);
  const rect = G.rect;
  const soilMat = new THREE.MeshStandardMaterial({ ...pick(mat('ground')), color: 0xa08a70, roughness: 1 });
  const bamboo = new THREE.MeshStandardMaterial({ color: 0xbfa66a, roughness: 0.6 });
  const nodeMat = new THREE.MeshStandardMaterial({ color: 0x8f7a48, roughness: 0.7 });
  const poleH = 1.9;

  for (const bed of G.beds) {
    const x0 = rect.x0 + 0.12;
    const x1 = rect.x1 - 0.12;
    // 畦面 + 两条垄
    group.add(box(x0, x1, 0, 0.06, bed.z0 + 0.08, bed.z1 - 0.08, soilMat, { solid: false }));
    for (const xr of [x0 + (x1 - x0) * 0.28, x0 + (x1 - x0) * 0.72]) {
      const ridgeLen = bed.z1 - bed.z0 - 0.3;
      const geo = new THREE.CylinderGeometry(0.16, 0.16, ridgeLen, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
      geo.scale(1, 0.45, 1);
      worldUV(geo, new THREE.Vector3(xr, 0.06, (bed.z0 + bed.z1) / 2));
      const ridge = new THREE.Mesh(geo, soilMat);
      ridge.position.set(xr, 0.06, (bed.z0 + bed.z1) / 2);
      ridge.receiveShadow = true;
      group.add(ridge);
    }
    if (!bed.trellis) continue;

    // 竹竿人字架
    const xa = x0 + 0.25;
    const xb = x1 - 0.25;
    const xm = (xa + xb) / 2;
    const lean = Math.atan2((xb - xa) / 2, poleH);
    const len = Math.hypot((xb - xa) / 2, poleH);
    const poleZ = [];
    for (let z = bed.z0 + 0.25; z < bed.z1 - 0.1; z += 0.5) poleZ.push(z);
    const poles = [];
    for (const z of poleZ) {
      for (const [x, s] of [[xa, -1], [xb, 1]]) {
        const pole = new THREE.Group();
        pole.position.set((x + xm) / 2, poleH / 2 + 0.1, z);
        pole.rotation.z = s * lean + (r() - 0.5) * 0.05;
        pole.rotation.x = (r() - 0.5) * 0.06;
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, len, 6), bamboo);
        stick.castShadow = true;
        pole.add(stick);
        for (let k = -len / 2 + 0.3; k < len / 2; k += 0.32) {
          const node = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 6), nodeMat);
          node.position.y = k;
          pole.add(node);
        }
        group.add(pole);
        poles.push({ x, z, top: new THREE.Vector3(xm, poleH + 0.1, z) });
      }
    }
    const ridgeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, bed.z1 - bed.z0 - 0.2, 6), bamboo);
    ridgeBar.rotation.x = Math.PI / 2;
    ridgeBar.position.set(xm, poleH + 0.1, (bed.z0 + bed.z1) / 2);
    group.add(ridgeBar);

    // 藤叶：沿竹竿从下往上、在顶上更密
    const isLuffa = bed.crop === '丝瓜';
    const leafMat = applyWind(leafMaterial(isLuffa ? luffaLeaves() : beanLeaves(), { roughness: 0.7 }), { amp: 0.025, freq: 2.1 });
    const count = Math.round((isLuffa ? 300 : 340) * Q.leaf);
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const leaves = new THREE.InstancedMesh(geo, leafMat, count);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const p = poles[Math.floor(r() * poles.length)];
      const t = Math.pow(r(), 0.6); // 越往上越密
      const pos = new THREE.Vector3(p.x, 0.1, p.z).lerp(p.top, t);
      pos.x += (r() - 0.5) * 0.25;
      pos.z += (r() - 0.5) * 0.35;
      pos.y += (r() - 0.5) * 0.15;
      const s = (isLuffa ? 0.38 : 0.32) + r() * 0.15;
      q.setFromEuler(new THREE.Euler(-(r() * 0.8) - 0.2, r() * Math.PI * 2, (r() - 0.5) * 0.8, 'YXZ'));
      m4.compose(pos, q, new THREE.Vector3(s, s, s));
      leaves.setMatrixAt(i, m4);
    }
    leaves.castShadow = leaves.receiveShadow = true;
    group.add(leaves);

    // 果实：丝瓜（长 30~45 cm）挂在横竿下；豆角（细长 25~40 cm）一串串
    if (isLuffa) {
      const luffaMat = new THREE.MeshStandardMaterial({ color: 0x5f7f3a, roughness: 0.55 });
      for (let i = 0; i < 9; i++) {
        const L = 0.3 + r() * 0.15;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3((r() - 0.5) * 0.05, -L * 0.5, (r() - 0.5) * 0.05),
          new THREE.Vector3((r() - 0.5) * 0.1, -L, (r() - 0.5) * 0.1),
        ]);
        const fruit = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.028, 8, false), luffaMat);
        const pz = bed.z0 + 0.3 + r() * (bed.z1 - bed.z0 - 0.6);
        fruit.position.set(xm + (r() - 0.5) * 0.5, poleH - 0.1 - r() * 0.6, pz);
        fruit.castShadow = true;
        group.add(fruit);
      }
    } else {
      const podMat = new THREE.MeshStandardMaterial({ color: 0x8fae4a, roughness: 0.5 });
      const podGeo = new THREE.CylinderGeometry(0.004, 0.0055, 1, 5).translate(0, -0.5, 0);
      const pods = new THREE.InstancedMesh(podGeo, podMat, 120);
      for (let i = 0; i < 120; i++) {
        const p = poles[Math.floor(r() * poles.length)];
        const pos = new THREE.Vector3(p.x, 0.3, p.z).lerp(p.top, 0.3 + r() * 0.7);
        pos.x += (r() - 0.5) * 0.2;
        pos.z += (r() - 0.5) * 0.3;
        q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3));
        m4.compose(pos, q, new THREE.Vector3(1, 0.25 + r() * 0.15, 1));
        pods.setMatrixAt(i, m4);
      }
      pods.castShadow = true;
      group.add(pods);
    }
  }
  return group;
}

/** 取材质的贴图组（复用黄土地的贴图做菜畦土） */
function pick(m) {
  return { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap };
}
