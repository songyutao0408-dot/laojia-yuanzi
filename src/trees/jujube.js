import * as THREE from 'three';
import { Q } from '../core/quality.js';
import { mat } from '../textures/index.js';
import { jujubeLeaves, leafMaterial } from '../textures/leaves.js';
import { rng } from '../textures/canvas.js';
import { growSkeleton, fitSkeleton, branchGeometry, leafCards, fruitPoints, trunkCollider } from './treeBuilder.js';
import { applyWind } from './wind.js';
import { createSwing } from './swing.js';
import { SWING } from '../layout.js';

/**
 * 枣树：比较大的一棵，约 5.8 m、冠幅半径约 3 m。树干深褐、纵向深裂，主干不直溜、有明显的弯；枝条之字形、梢头下垂。
 * 小卵形叶（三出脉）；挂满红绿相间的枣子（约 2.5 × 3.3 cm）。
 * 枣子用 InstancedMesh（userData.fruit = 'jujube'），第 6 步点击采摘时把对应实例缩成 0。
 */
const PARAMS = {
  // 主干弯：向一侧歪出去再拐回来（S 形），约 1.8 m 处开始分成几根粗枝
  trunk: { length: 2.0, radius: 0.17, segments: 8, bend: 0.1, lean: 0.25, wiggle: 0.42, endRadiusK: 0.72 },
  levels: [
    { count: [4, 5], angle: [45, 68], lengthK: 1.1, radiusK: 0.62, along: [0.5, 1], upBias: 0.12, bend: 0.3, minY: 0.35 },
    { count: [4, 6], angle: [40, 70], lengthK: 0.55, radiusK: 0.5, along: [0.2, 1], upBias: 0.05, bend: 0.35, droop: 0.18, minY: 0.05 },
    { count: [2, 3], angle: [30, 60], lengthK: 0.5, radiusK: 0.5, along: [0.2, 1], bend: 0.4, droop: 0.3 },
  ],
};

let leafMat;
export function createJujube(t) {
  const g = new THREE.Group();
  g.name = t.id;
  g.position.set(t.x, 0, t.z);
  const seed = 777;
  const sk = fitSkeleton(growSkeleton(PARAMS, seed), { height: t.height, crown: t.crown, crownPad: 0.4, trunkRadius: t.trunkRadius });
  const swingTies = addSwingLimb(sk);
  const wood = new THREE.Mesh(branchGeometry(sk.segs, { radial: 7 }), mat('barkJujube'));
  wood.castShadow = wood.receiveShadow = true;
  g.add(wood);

  leafMat ??= applyWind(leafMaterial(jujubeLeaves(), { roughness: 0.6 }), { amp: 0.035, freq: 1.7 });
  g.add(leafCards(sk, leafMat, { count: Math.round(750 * Q.leaf), size: [0.35, 0.55], seed, spread: 0.3, droop: 0.3 }));

  // 枣子：红、半红、青绿
  const pts = fruitPoints(sk, 260, seed + 1, { minLevel: 2, hang: 0.05 });
  const geo = new THREE.SphereGeometry(1, 10, 8).scale(0.013, 0.017, 0.013);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const inst = new THREE.InstancedMesh(geo, m, pts.length);
  const r = rng(seed + 2);
  const m4 = new THREE.Matrix4();
  const colors = [0x8e2a1c, 0x9e3a22, 0x7a2418, 0xa8a040, 0x8fa03c, 0xb07a30];
  pts.forEach((p, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6));
    m4.compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.85 + r() * 0.3));
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, new THREE.Color(colors[Math.floor(r() * colors.length)]));
  });
  inst.castShadow = true;
  inst.userData = { fruit: 'jujube' };
  inst.name = 'jujube-fruits';
  g.add(inst);

  g.add(trunkCollider(t.trunkRadius + 0.05, 1.6));

  // 秋千挂在那根弯出来的枝干上
  const swing = createSwing(swingTies[0], swingTies[1], SWING.seatHeight);
  g.add(swing.object);
  g.userData.swing = swing;
  return g;
}

/**
 * 主干约 1.75 m 处朝院子方向伸出一根粗枝：先几乎水平伸出去，梢头往上翘（“弯出来的枝干”），
 * 秋千就绑在它平直的那一段上。返回两个绑绳点（树的局部坐标）。
 */
function addSwingLimb(sk) {
  const h = SWING.branchFrom;
  let base = null;
  let baseR = 0.1;
  for (const s of sk.segs) {
    if (s.level !== 0) continue;
    if (s.a.y <= h && s.b.y >= h) {
      const k = (h - s.a.y) / (s.b.y - s.a.y);
      base = s.a.clone().lerp(s.b, k);
      baseR = s.ra + (s.rb - s.ra) * k;
      break;
    }
  }
  const n = Math.hypot(...SWING.dir);
  const dir = new THREE.Vector3(SWING.dir[0] / n, 0, SWING.dir[1] / n);
  const L = SWING.branchLength;
  const N = 6;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // 先略微下沉（枝干压弯），后半段往上翘
    const y = h + 0.15 * t - 0.12 * Math.sin(Math.PI * t * 0.8) + 0.55 * Math.max(0, t - 0.65) ** 1.5;
    pts.push(new THREE.Vector3(base.x + dir.x * L * t, y, base.z + dir.z * L * t));
  }
  const r0 = baseR * 0.62;
  for (let i = 0; i < N; i++) {
    sk.segs.push({ a: pts[i], b: pts[i + 1], ra: r0 * (1 - 0.55 * (i / N)), rb: r0 * (1 - 0.55 * ((i + 1) / N)), level: 1 });
  }
  // 梢头分出两根小枝挂叶子
  for (const side of [-1, 1]) {
    const tipPts = [pts[N], pts[N].clone().add(new THREE.Vector3(dir.x * 0.5 - side * dir.z * 0.4, 0.35, dir.z * 0.5 + side * dir.x * 0.4))];
    sk.segs.push({ a: tipPts[0], b: tipPts[1], ra: r0 * 0.4, rb: r0 * 0.2, level: 2 });
    sk.tips.push({ pos: tipPts[1], dir: tipPts[1].clone().sub(tipPts[0]).normalize(), points: tipPts, level: 2 });
  }
  // 绑绳点：离主干 hang 米处，沿枝干前后各 ropeGap/2；绳挂在枝干下皮
  const at = (d) => {
    const t = Math.min(1, d / L) * N;
    const i = Math.min(N - 1, Math.floor(t));
    return pts[i].clone().lerp(pts[i + 1], t - i).add(new THREE.Vector3(0, -r0 * 0.8, 0));
  };
  return [at(SWING.hang - SWING.ropeGap / 2), at(SWING.hang + SWING.ropeGap / 2)];
}
