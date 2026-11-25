import * as THREE from 'three';
import { YARD_ITEMS } from '../layout.js';
import { box } from '../core/box.js';

/**
 * 九十年代的老式二八自行车（第 17 轮，用户要求）：28 寸大轮子、带大梁的男式车架，黑漆描金线，
 * 镀铬的车把和钢圈，黑皮弹簧车座，后面一个货架，全包的链盒，前后挡泥瓦，车把上一个铃铛。
 * 支着单边车梯子，车身稍微往左歪。局部坐标：+z 朝车头，原点在两个轮子中间的地面。
 */
const R = 0.355; // 28 寸轮子
const WB = 1.14; // 轴距

export function createBicycle() {
  const B = YARD_ITEMS.bicycle;
  const root = new THREE.Group();
  root.name = 'bicycle';
  root.position.set(B.x, 0, B.z);
  root.rotation.y = (B.rot * Math.PI) / 180;
  const g = new THREE.Group();
  g.rotation.z = -0.09; // 支着车梯子，往左边（+x）歪一点
  root.add(g);

  const paint = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.3, metalness: 0.35 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.22, metalness: 0.95 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 0.4, metalness: 0.8 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tube = (a, b, r, m, parent = g) => {
    const d = b.clone().sub(a);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), m);
    t.position.copy(a).addScaledVector(d, 0.5);
    t.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    t.castShadow = true;
    parent.add(t);
    return t;
  };

  const rearHub = V(0, R, -WB / 2);
  const frontHub = V(0, R, WB / 2);
  // —— 两个轮子：黑胎、镀铬钢圈、36 根辐条 ——
  for (const c of [rearHub, frontHub]) {
    const w = new THREE.Group();
    w.position.copy(c);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(R - 0.018, 0.019, 8, 48), rubber);
    tire.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.04, 0.009, 6, 48), chrome);
    rim.rotation.y = Math.PI / 2;
    w.add(tire, rim);
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const side = i % 2 ? 0.03 : -0.03;
      pts.push(V(side, 0, 0), V(0, Math.cos(a + 0.3) * (R - 0.045), Math.sin(a + 0.3) * (R - 0.045)));
    }
    const spokes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xb0b0ac }));
    w.add(spokes);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 12).rotateZ(Math.PI / 2), chrome);
    w.add(hub);
    g.add(w);
    // 挡泥瓦：半圈黑漆
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.06, 32, 1, true, c === rearHub ? -0.2 : 0.4, Math.PI * 0.95).rotateZ(Math.PI / 2), paint.clone());
    guard.material.side = THREE.DoubleSide;
    guard.position.copy(c);
    guard.rotation.x = c === rearHub ? -0.25 : 0.9;
    g.add(guard);
  }

  // —— 车架：大梁、下管、立管、后上叉、后下叉 ——
  const bb = V(0, 0.29, -0.05); // 中轴
  const seatTop = V(0, 0.9, -0.2); // 立管顶
  const headTop = V(0, 0.93, 0.4);
  const headBot = V(0, 0.75, 0.45);
  tube(seatTop, headTop, 0.016, paint); // 大梁
  tube(bb, headBot, 0.017, paint); // 下管
  tube(bb, seatTop, 0.017, paint); // 立管
  for (const s of [-1, 1]) {
    tube(seatTop.clone().add(V(s * 0.02, -0.03, 0)), rearHub.clone().add(V(s * 0.05, 0, 0)), 0.009, paint);
    tube(bb.clone().add(V(s * 0.03, 0, 0)), rearHub.clone().add(V(s * 0.05, 0, 0)), 0.01, paint);
  }
  tube(headBot, headTop, 0.02, paint); // 车头管
  // 描金线
  tube(seatTop.clone().add(V(0, 0.017, 0)), headTop.clone().add(V(0, 0.017, 0)), 0.003, gold);
  // 前叉：从车头管下来分两根到前轴
  for (const s of [-1, 1]) tube(headBot, frontHub.clone().add(V(s * 0.05, 0, 0)), 0.011, paint);
  // —— 车把：镀铬，两头往后弯，黑把套；左边一个铃铛 ——
  const stem = headTop.clone().add(V(0, 0.12, -0.02));
  tube(headTop, stem, 0.012, chrome);
  for (const s of [-1, 1]) {
    const mid = stem.clone().add(V(s * 0.2, 0.02, -0.03));
    const end = stem.clone().add(V(s * 0.28, 0.0, -0.16));
    tube(stem, mid, 0.011, chrome);
    tube(mid, end, 0.011, chrome);
    tube(end, end.clone().add(V(0, 0, -0.1)), 0.016, rubber);
    // 车闸拉杆
    tube(mid.clone().add(V(0, -0.02, 0.02)), end.clone().add(V(s * 0.02, -0.04, 0.02)), 0.004, chrome);
  }
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), chrome);
  bell.position.copy(stem).add(V(0.12, 0.025, -0.02));
  g.add(bell);
  // 车灯：车头管前面一个小圆灯（不亮）
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.05, 14).rotateX(Math.PI / 2), chrome);
  lamp.position.copy(headBot).add(V(0, 0.08, 0.06));
  g.add(lamp);

  // —— 车座：黑皮、底下两根弹簧 ——
  const seatPost = seatTop.clone().add(V(0, 0.08, -0.02));
  tube(seatTop, seatPost, 0.012, chrome);
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), new THREE.MeshStandardMaterial({ color: 0x241c18, roughness: 0.4 }));
  saddle.scale.set(0.95, 0.3, 1.25);
  saddle.position.copy(seatPost).add(V(0, 0.05, -0.02));
  saddle.castShadow = true;
  g.add(saddle);
  for (const s of [-1, 1]) {
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 4, 10), chrome);
    spring.scale.set(1, 1, 2.2);
    spring.position.copy(seatPost).add(V(s * 0.05, 0.01, -0.1));
    spring.rotation.x = Math.PI / 2;
    g.add(spring);
  }

  // —— 后货架：一块镀铬的网格架子 ——
  const rk0 = V(0, 0.78, -0.25);
  const rk1 = V(0, 0.78, -0.82);
  for (const s of [-1, 1]) {
    tube(rk0.clone().add(V(s * 0.06, 0, 0)), rk1.clone().add(V(s * 0.06, 0, 0)), 0.007, chrome);
    tube(rk1.clone().add(V(s * 0.06, 0, 0)), rearHub.clone().add(V(s * 0.06, 0, 0)), 0.006, chrome);
  }
  for (let i = 0; i <= 4; i++) {
    const z = rk0.z + (rk1.z - rk0.z) * (i / 4);
    tube(V(-0.06, 0.78, z), V(0.06, 0.78, z), 0.005, chrome);
  }

  // —— 链盒（全包）、大牙盘、脚蹬 ——
  const guardShape = new THREE.Shape();
  guardShape.absarc(0, 0, 0.11, Math.PI / 2, -Math.PI / 2, true);
  guardShape.lineTo(-0.6, -0.04);
  guardShape.absarc(-0.6, 0, 0.04, -Math.PI / 2, Math.PI / 2, true);
  guardShape.lineTo(0, 0.11);
  const cg = new THREE.Mesh(new THREE.ExtrudeGeometry(guardShape, { depth: 0.04, bevelEnabled: false }), paint);
  cg.rotation.y = -Math.PI / 2;
  cg.position.set(-0.08, bb.y, bb.z);
  cg.castShadow = true;
  g.add(cg);
  for (const s of [-1, 1]) {
    const crank = tube(bb.clone().add(V(s * 0.09, 0, 0)), bb.clone().add(V(s * 0.09, s * 0.16, s * 0.04)), 0.01, chrome);
    void crank;
    g.add(box(s * 0.09 + s * 0.02 - 0.04, s * 0.09 + s * 0.02 + 0.04, bb.y + s * 0.16 - 0.012, bb.y + s * 0.16 + 0.012, bb.z + s * 0.04 - 0.025, bb.z + s * 0.04 + 0.025, rubber, { solid: false }));
  }

  // —— 车梯子：单边一根，撑在地上 ——
  tube(rearHub.clone().add(V(0.06, -0.06, 0.05)), V(0.19, 0.0, -0.4), 0.009, paint, g);

  // 碰撞
  root.add(box(-0.3, 0.3, 0, 1.1, -0.85, 0.85, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false }));
  return root;
}
