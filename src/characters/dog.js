import * as THREE from 'three';
import { CHARACTERS } from '../layout.js';
import { fillMulti, makeFbm, makeNoise, textureSet, clamp01 } from '../textures/canvas.js';
import { ellipsoid, Limb } from './rig.js';

/**
 * 大黄：一条大个的中华田园犬（农村土狗），土黄色短毛，胸口、肚子、嘴巴和四个爪子发白，
 * 黑鼻头，三角耳朵竖着，尾巴往上卷。坐在父亲右手边，抬头看着他。
 * - 尾巴一直摇（被摸时摇得更快）
 * - nuzzle()：低头往父亲大腿上拱、一下一下地蹭，耳朵往后背、眯眼，持续约 3 秒
 * 局部坐标：+z 朝前（脸的方向），+y 朝上，地面 y = 0。
 */
let furSet = null;
function furTexture() {
  // 短毛：顺着一个方向的细密毛流 + 斑驳
  const strands = makeNoise(611, 128);
  const blot = makeFbm(612, 6, 3);
  const set = fillMulti(256, 256, (u, v) => {
    const s = strands(u * 128, v * 24);
    const b = blot(u, v);
    const k = 0.84 + s * 0.16 - clamp01((b - 0.6) * 1.5) * 0.12;
    return { c: [255 * k, 255 * k, 255 * k], h: 0.5 + s * 0.5, r: 0.85 + s * 0.1 };
  });
  return textureSet({ ...set, normalStrength: 2 }, 0.25);
}

export function createDog() {
  const D = CHARACTERS.dog;
  const root = new THREE.Group();
  root.name = 'dog';
  root.position.set(D.x, 0, D.z);
  root.rotation.y = (D.rot * Math.PI) / 180;

  furSet ??= furTexture();
  const fur = (color) => new THREE.MeshStandardMaterial({ ...furSet, color, roughness: 1 });
  const YELLOW = fur(0xc8892f);
  const DARK = fur(0xa86a24); // 背上颜色深一点
  const CREAM = fur(0xecd6a8);
  const black = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.35 });
  const S = D.scale ?? 1.1; // 大个的土狗

  const body = new THREE.Group();
  body.scale.setScalar(S);
  root.add(body);

  // 坐姿躯干：从屁股斜着往上到胸口
  const torso = ellipsoid(YELLOW, 0.115, 0.25, 0.13);
  torso.position.set(0, 0.27, -0.02);
  torso.rotation.x = 0.62;
  body.add(torso);
  const back = ellipsoid(DARK, 0.1, 0.21, 0.1);
  back.position.set(0, 0.3, -0.07);
  back.rotation.x = 0.62;
  body.add(back);
  const rump = ellipsoid(YELLOW, 0.13, 0.11, 0.14);
  rump.position.set(0, 0.11, -0.13);
  body.add(rump);
  // 胸口、肚子发白
  const chest = ellipsoid(CREAM, 0.085, 0.16, 0.08);
  chest.position.set(0, 0.36, 0.1);
  chest.rotation.x = 0.35;
  body.add(chest);

  // 后腿：大腿折着贴在身体两侧，后爪往前
  for (const s of [-1, 1]) {
    const thigh = ellipsoid(YELLOW, 0.045, 0.1, 0.12);
    thigh.position.set(s * 0.1, 0.12, -0.08);
    thigh.rotation.x = -0.5;
    body.add(thigh);
    const hock = ellipsoid(YELLOW, 0.028, 0.025, 0.09);
    hock.position.set(s * 0.1, 0.03, 0.01);
    body.add(hock);
    const hpaw = ellipsoid(CREAM, 0.03, 0.02, 0.045);
    hpaw.position.set(s * 0.1, 0.018, 0.08);
    body.add(hpaw);
  }
  // 前腿：笔直撑着
  for (const s of [-1, 1]) {
    const leg = new Limb(YELLOW, 0.032, 0.025, { radial: 10 });
    leg.set(new THREE.Vector3(s * 0.055, 0.36, 0.13), new THREE.Vector3(s * 0.055, 0.035, 0.16));
    body.add(leg.group);
    const sock = new Limb(CREAM, 0.023, 0.022, { radial: 10, caps: false });
    sock.set(new THREE.Vector3(s * 0.055, 0.12, 0.155), new THREE.Vector3(s * 0.055, 0.03, 0.16));
    body.add(sock.group);
    const paw = ellipsoid(CREAM, 0.03, 0.02, 0.042);
    paw.position.set(s * 0.055, 0.02, 0.18);
    body.add(paw);
  }

  // 脖子 + 头：脖子根在胸口上方，头的支点在脖子顶端
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.44, 0.08);
  body.add(neckPivot);
  const neck = ellipsoid(YELLOW, 0.065, 0.11, 0.07);
  neck.position.set(0, 0.06, 0.02);
  neck.rotation.x = 0.35;
  neckPivot.add(neck);
  const throat = ellipsoid(CREAM, 0.05, 0.08, 0.04);
  throat.position.set(0, 0.03, 0.06);
  throat.rotation.x = 0.4;
  neckPivot.add(throat);

  const head = new THREE.Group();
  head.name = 'dog-head';
  head.position.set(0, 0.15, 0.05);
  head.rotation.x = -0.22; // 微微抬头（头顶正好在父亲手底下）
  neckPivot.add(head);
  const skull = ellipsoid(YELLOW, 0.072, 0.068, 0.08);
  skull.position.set(0, 0.02, 0);
  head.add(skull);
  const brow = ellipsoid(DARK, 0.06, 0.03, 0.05);
  brow.position.set(0, 0.07, -0.01);
  head.add(brow);
  // 嘴巴：往前收窄的吻部，下巴发白
  const muzzle = new Limb(YELLOW, 0.046, 0.034, { radial: 14, sx: 1, sz: 0.85 });
  muzzle.set(new THREE.Vector3(0, 0.0, 0.05), new THREE.Vector3(0, -0.014, 0.135));
  head.add(muzzle.group);
  const jaw = ellipsoid(CREAM, 0.035, 0.022, 0.06);
  jaw.position.set(0, -0.034, 0.095);
  head.add(jaw);
  const nose = ellipsoid(black, 0.02, 0.016, 0.014);
  nose.position.set(0, -0.006, 0.166);
  head.add(nose);
  for (const s of [-1, 1]) {
    const eye = ellipsoid(black, 0.011, 0.011, 0.008, 12);
    eye.position.set(s * 0.04, 0.035, 0.062);
    eye.name = 'dog-eye';
    head.add(eye);
    // 耳朵：竖着的三角耳，根部宽
    const earPivot = new THREE.Group();
    earPivot.position.set(s * 0.045, 0.075, -0.015);
    earPivot.rotation.set(-0.15, 0, s * -0.35);
    earPivot.name = 'dog-ear';
    head.add(earPivot);
    // 三角耳：有厚度的扁三角，耳尖略圆，里面浅粉
    const tri = new THREE.Shape();
    tri.moveTo(-0.032, 0);
    tri.lineTo(0.032, 0);
    tri.quadraticCurveTo(0.008, 0.07, 0, 0.082);
    tri.quadraticCurveTo(-0.008, 0.07, -0.032, 0);
    const earGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 6 });
    earGeo.translate(0, 0, -0.005);
    const ear = new THREE.Mesh(earGeo, YELLOW);
    ear.castShadow = true;
    earPivot.add(ear);
    const innerShape = new THREE.Shape();
    innerShape.moveTo(-0.02, 0.008);
    innerShape.lineTo(0.02, 0.008);
    innerShape.quadraticCurveTo(0.004, 0.055, 0, 0.064);
    innerShape.quadraticCurveTo(-0.004, 0.055, -0.02, 0.008);
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(innerShape), new THREE.MeshStandardMaterial({ color: 0xd9a48a, roughness: 1 }));
    inner.position.z = 0.0105;
    earPivot.add(inner);
  }
  // 嘴角一道深色
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 4, 12, Math.PI), black);
  mouth.position.set(0, -0.03, 0.12);
  mouth.rotation.set(Math.PI / 2, 0, Math.PI);
  head.add(mouth);

  // 尾巴：从屁股后面出来，往上往前卷（土狗的镰刀尾），根部可以左右摇
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.12, -0.26);
  body.add(tailPivot);
  const tailSegs = [];
  let parent = tailPivot;
  const N = 6;
  for (let i = 0; i < N; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i === 0 ? 0 : 0.055, 0);
    seg.rotation.x = i === 0 ? -0.6 : -0.42; // 往上卷
    parent.add(seg);
    const r0 = 0.03 - i * 0.003;
    const piece = new Limb(i >= N - 2 ? CREAM : YELLOW, r0, r0 - 0.003, { radial: 8 });
    piece.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.058, 0));
    seg.add(piece.group);
    tailSegs.push(seg);
    parent = seg;
  }

  // 碰撞：坐着的狗占一块（看不见的盒子）
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.55), new THREE.MeshBasicMaterial({ visible: false }));
  blocker.position.set(0, 0.35, -0.02);
  blocker.userData.solid = true;
  root.add(blocker);

  // —— 动画 ——
  const ears = [];
  head.traverse((o) => o.name === 'dog-ear' && ears.push(o));
  const eyes = [];
  head.traverse((o) => o.name === 'dog-eye' && eyes.push(o));
  const base = { neckY: neckPivot.rotation.y, neckX: neckPivot.rotation.x, headX: head.rotation.x, headZ: head.rotation.z };
  let nuzzleT = -1; // <0 表示没在蹭
  let wagPhase = 0;
  let blinkT = 2;

  const headTop = new THREE.Object3D();
  headTop.position.set(0, 0.085, 0.005);
  head.add(headTop);

  return {
    object: root,
    head,
    /** 头顶（父亲的手放这里） */
    headTop,
    get nuzzling() {
      return nuzzleT >= 0;
    },
    nuzzle() {
      nuzzleT = 0;
    },
    update(dt, t) {
      // 尾巴：平时慢慢摇，蹭的时候摇得欢
      const excited = nuzzleT >= 0 ? 1 : 0;
      wagPhase += dt * (excited ? 15 : 6.5);
      const amp = excited ? 0.55 : 0.32;
      tailPivot.rotation.y = Math.sin(wagPhase) * amp;
      tailSegs.forEach((s, i) => (s.rotation.z = Math.sin(wagPhase - i * 0.5) * amp * 0.25));

      // 蹭：头转向右边（父亲腿在狗的右前方），一下一下往上蹭，耳朵往后背，眯眼
      let k = 0;
      if (nuzzleT >= 0) {
        nuzzleT += dt;
        const dur = 3.2;
        k = Math.sin(Math.min(1, nuzzleT / dur) * Math.PI); // 0→1→0
        k = Math.min(1, k * 1.6);
        if (nuzzleT > dur) nuzzleT = -1;
      }
      const rub = Math.sin(t * 7) * k;
      // 父亲的腿就在狗的正前方：低头往前拱，一下一下左右蹭
      neckPivot.rotation.y = base.neckY + rub * 0.22;
      neckPivot.rotation.x = base.neckX + 0.18 * k + Math.abs(rub) * 0.05;
      head.rotation.x = base.headX + 0.28 * k;
      head.rotation.z = base.headZ - 0.3 * k + rub * 0.14;
      ears.forEach((e, i) => (e.rotation.x = -0.15 - 0.9 * k));
      // 眨眼 / 眯眼
      blinkT -= dt;
      let lid = 1;
      if (blinkT < 0) {
        lid = Math.abs(Math.sin((blinkT + 0.15) * 20));
        if (blinkT < -0.15) blinkT = 2.5 + Math.random() * 3;
      }
      lid = Math.min(lid, 1 - 0.8 * k);
      eyes.forEach((e) => (e.scale.y = 0.011 * Math.max(0.15, lid)));
      // 呼吸
      torso.scale.x = 0.115 * (1 + Math.sin(t * 2.6) * 0.02);
    },
  };
}
