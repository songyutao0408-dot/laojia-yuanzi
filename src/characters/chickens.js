import * as THREE from 'three';
import { CHICKENS as C } from '../layout.js';
import { ellipsoid } from './rig.js';
import { rng } from '../interiors/common.js';

/**
 * 鸡（第 18 轮，用户要求）：
 * - 一只五彩斑斓的大公鸡站在东土墙头上：大红鸡冠、红肉垂、白耳叶，金黄发亮的颈羽披到背上，
 *   枣红的背和翅膀（翅尖一道墨绿），黑胸脯，墨绿泛蓝光的大镰刀尾巴高高翘起来，黄腿。
 *   时不时转头看看、低头梳梳毛，隔一阵伸长脖子打鸣
 * - 十只毛茸茸的小鸡散在院子里：嫩黄的多，有两只带褐色花纹；在各自的 home 点附近溜达，走几步停下来啄食
 * 局部坐标 +z 朝鸡头；动作按真实时间走。
 */
export function createChickens() {
  const group = new THREE.Group();
  group.name = 'chickens';
  const rooster = createRooster();
  group.add(rooster.root);
  const chicks = C.chicks.map((h, i) => createChick(h, i));
  for (const c of chicks) group.add(c.root);
  return {
    group,
    rooster,
    chicks,
    update(dt, t) {
      rooster.update(t);
      for (const c of chicks) c.update(t);
    },
  };
}

function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
}

function createRooster() {
  const R = C.rooster;
  const root = new THREE.Group();
  root.name = 'rooster';
  root.position.set(R.x, R.y, R.z);
  root.rotation.y = (R.rot * Math.PI) / 180;

  const red = std(0xc8201c, { roughness: 0.5 });
  const gold = std(0xe0a02a, { roughness: 0.45, metalness: 0.15 });
  const copper = std(0xa03a1c, { roughness: 0.5 });
  const black = std(0x16181c, { roughness: 0.5 });
  const sheen = std(0x0f3a2a, { roughness: 0.28, metalness: 0.55, side: THREE.DoubleSide }); // 墨绿泛光的尾羽
  const sheenBlue = std(0x1a2a5a, { roughness: 0.3, metalness: 0.55, side: THREE.DoubleSide });
  const yellow = std(0xd8a838, { roughness: 0.6 });

  const body = new THREE.Group();
  body.position.y = 0.2;
  body.rotation.x = -0.25; // 胸脯挺着，屁股往下
  root.add(body);
  const breast = ellipsoid(black, 0.085, 0.1, 0.13, 22);
  breast.position.set(0, -0.01, 0.02);
  const back = ellipsoid(copper, 0.08, 0.07, 0.13, 20);
  back.position.set(0, 0.04, -0.01);
  body.add(breast, back);
  // 翅膀：枣红，翅尖一道墨绿
  for (const s of [-1, 1]) {
    const wing = ellipsoid(copper, 0.025, 0.065, 0.11, 16);
    wing.position.set(s * 0.075, 0.01, -0.01);
    wing.rotation.x = 0.15;
    const tip = ellipsoid(sheen, 0.022, 0.035, 0.07, 12);
    tip.position.set(s * 0.078, -0.02, -0.08);
    body.add(wing, tip);
  }
  // 颈子 + 金黄的颈羽（像披肩一样从头后面披到背上）
  const neck = new THREE.Group();
  neck.position.set(0, 0.08, 0.08);
  body.add(neck);
  const hackle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 18, 1, true), gold);
  hackle.material = gold.clone();
  hackle.material.side = THREE.DoubleSide;
  hackle.position.set(0, 0.05, -0.01);
  hackle.rotation.x = 0.25;
  const neckCore = ellipsoid(gold, 0.04, 0.08, 0.045, 14);
  neckCore.position.set(0, 0.06, 0.01);
  neck.add(hackle, neckCore);
  // 头：红冠、红肉垂、白耳叶、黄嘴
  const head = new THREE.Group();
  head.position.set(0, 0.15, 0.03);
  neck.add(head);
  const skull = ellipsoid(gold, 0.03, 0.032, 0.04, 14);
  head.add(skull);
  const comb = new THREE.Shape();
  comb.moveTo(-0.045, 0);
  for (let i = 0; i < 5; i++) {
    const x = -0.045 + i * 0.019;
    comb.quadraticCurveTo(x + 0.004, 0.03 + (i === 1 || i === 2 ? 0.015 : 0), x + 0.0095, 0.045 - Math.abs(i - 2) * 0.006);
    comb.quadraticCurveTo(x + 0.015, 0.025, x + 0.019, 0.008);
  }
  comb.lineTo(0.05, 0);
  comb.closePath();
  const combMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(comb, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 }), red);
  combMesh.rotation.y = -Math.PI / 2;
  combMesh.position.set(-0.004, 0.022, 0.0);
  head.add(combMesh);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.035, 8).rotateX(Math.PI / 2), yellow);
  beak.position.set(0, -0.004, 0.05);
  head.add(beak);
  for (const s of [-1, 1]) {
    const wattle = ellipsoid(red, 0.008, 0.024, 0.012, 10);
    wattle.position.set(s * 0.008, -0.035, 0.03);
    const lobe = ellipsoid(std(0xeeeae0), 0.004, 0.008, 0.007, 8);
    lobe.position.set(s * 0.029, -0.012, 0.0);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), std(0xd88a1a, { roughness: 0.2 }));
    eye.position.set(s * 0.026, 0.006, 0.018);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 4), std(0x050505));
    pupil.position.set(s * 0.031, 0.006, 0.02);
    head.add(wattle, lobe, eye, pupil);
  }
  // 尾巴：几根墨绿泛蓝的大镰刀羽高高翘起再弯下来，底下一簇短的
  const tail = new THREE.Group();
  tail.position.set(0, 0.04, -0.12);
  body.add(tail);
  const sickle = (len, wd, spread, tilt, m) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const a = 1.25 - t * 2.4; // 先往上、再往后、梢头往下勾
      pts.push(new THREE.Vector3(0, Math.sin(a) * len * 0.45 + t * len * 0.2, -t * len * 0.75));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 20, wd, 5, false);
    geo.scale(0.35, 1, 1); // 扁的
    const f = new THREE.Mesh(geo, m);
    f.rotation.set(tilt, spread, 0);
    f.castShadow = true;
    tail.add(f);
    return f;
  };
  const feathers = [];
  for (const [len, wd, spread, tilt, m] of [
    [0.38, 0.016, 0.0, 0.2, sheen],
    [0.34, 0.015, 0.18, 0.25, sheenBlue],
    [0.34, 0.015, -0.18, 0.25, sheen],
    [0.28, 0.013, 0.32, 0.35, sheen],
    [0.28, 0.013, -0.32, 0.35, sheenBlue],
    [0.22, 0.012, 0.1, 0.5, black],
    [0.22, 0.012, -0.1, 0.5, black],
  ]) feathers.push(sickle(len, wd, spread, tilt, m));
  const saddle = ellipsoid(gold, 0.06, 0.04, 0.07, 14); // 腰上的金黄蓑羽
  saddle.position.set(0, 0.06, -0.09);
  body.add(saddle);
  // 腿和爪子（站在墙头上）
  for (const s of [-1, 1]) {
    const thigh = ellipsoid(black, 0.03, 0.05, 0.035, 10);
    thigh.position.set(s * 0.045, 0.14, 0.0);
    root.add(thigh);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.11, 8), yellow);
    leg.position.set(s * 0.045, 0.06, 0.0);
    root.add(leg);
    for (const a of [-0.5, 0, 0.5, Math.PI]) {
      const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.05, 6).rotateX(Math.PI / 2), yellow);
      toe.position.set(s * 0.045 + Math.sin(a) * 0.022, 0.004, Math.cos(a) * 0.022);
      toe.rotation.y = a;
      root.add(toe);
    }
  }
  root.traverse((o) => o.isMesh && (o.castShadow = true));

  return {
    root,
    update(t) {
      // 每 14 秒打一次鸣（2 秒）：伸长脖子、仰头、张嘴；平时左右看、偶尔低头啄啄羽毛
      const cyc = t % 14;
      const crow = cyc > 11 && cyc < 13 ? Math.sin(((cyc - 11) / 2) * Math.PI) : 0;
      neck.rotation.x = -0.25 * crow + (crow ? 0 : Math.max(0, Math.sin(t * 0.5) - 0.92) * 6);
      neck.position.y = 0.08 + crow * 0.03;
      head.rotation.x = -0.6 * crow;
      head.rotation.y = crow ? 0 : Math.sin(t * 0.8) * 0.6 * (Math.sin(t * 0.23) > 0 ? 1 : -0.5);
      beak.scale.y = 1 + crow * 0.6;
      body.rotation.x = -0.25 - crow * 0.15;
      tail.rotation.z = Math.sin(t * 0.9) * 0.03;
      for (let i = 0; i < feathers.length; i++) feathers[i].rotation.x = 0.2 + (i > 2 ? 0.15 : 0) + Math.sin(t * 1.3 + i) * 0.02;
    },
  };
}

function createChick(home, i) {
  const r = rng(991 + i * 17);
  const root = new THREE.Group();
  root.name = 'chick';
  const brown = i === 3 || i === 8;
  const fluff = std(brown ? 0xa8784a : r() > 0.5 ? 0xf2d04a : 0xf6dc6a, { roughness: 0.95 });
  const stripe = std(0x5a3a22, { roughness: 0.95 });
  const orange = std(0xe08a2a, { roughness: 0.5 });
  const body = ellipsoid(fluff, 0.042, 0.04, 0.05, 14);
  body.position.y = 0.06;
  root.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.1, 0.03);
  root.add(head);
  const skull = ellipsoid(fluff, 0.027, 0.027, 0.028, 12);
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.014, 6).rotateX(Math.PI / 2), orange);
  beak.position.set(0, -0.002, 0.03);
  head.add(beak);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 4), std(0x080808, { roughness: 0.2 }));
    eye.position.set(s * 0.017, 0.006, 0.017);
    head.add(eye);
    const wing = ellipsoid(fluff, 0.01, 0.022, 0.03, 8);
    wing.position.set(s * 0.038, 0.065, -0.005);
    root.add(wing);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 5), orange);
    leg.position.set(s * 0.015, 0.016, 0);
    root.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.003, 0.02), orange);
    foot.position.set(s * 0.015, 0.002, 0.006);
    root.add(foot);
  }
  if (brown) {
    // 背上三道深褐色的条纹
    for (const x of [-0.015, 0, 0.015]) {
      const st = ellipsoid(stripe, 0.005, 0.012, 0.04, 6);
      st.position.set(x, 0.095, -0.005);
      root.add(st);
    }
  }
  root.traverse((o) => o.isMesh && (o.castShadow = true));

  // 溜达：在 home 附近挑一个点走过去，停下啄几口，再挑下一个点（按真实时间，算出来的，不累加）
  const pos = new THREE.Vector2(home.x, home.z);
  let from = pos.clone();
  let to = pos.clone();
  let t0 = 0;
  let walkT = 1;
  let pauseT = 2;
  const pick = () => {
    from = to.clone();
    const a = r() * Math.PI * 2;
    const d = r() * 0.5;
    to = new THREE.Vector2(home.x + Math.cos(a) * d, home.z + Math.sin(a) * d);
    walkT = Math.max(0.3, from.distanceTo(to) / 0.18);
    pauseT = 1.5 + r() * 3;
  };
  pick();
  let heading = r() * Math.PI * 2;
  root.position.set(home.x, 0, home.z);
  root.rotation.y = heading;
  return {
    root,
    update(t) {
      if (t0 === 0) t0 = t;
      let e = t - t0;
      while (e > walkT + pauseT) {
        t0 += walkT + pauseT;
        e = t - t0;
        pick();
      }
      if (e < walkT) {
        const k = e / walkT;
        pos.lerpVectors(from, to, k);
        const dir = to.clone().sub(from);
        if (dir.lengthSq() > 1e-6) heading = Math.atan2(dir.x, dir.y);
        root.position.y = Math.abs(Math.sin(e * 18)) * 0.008; // 小碎步一颠一颠
        head.rotation.x = 0;
      } else {
        // 停下来啄食：头一下一下往下点
        root.position.y = 0;
        const p = e - walkT;
        head.rotation.x = Math.max(0, Math.sin(p * 7)) * 1.1;
      }
      root.position.x = pos.x;
      root.position.z = pos.y;
      root.rotation.y = heading;
    },
  };
}
