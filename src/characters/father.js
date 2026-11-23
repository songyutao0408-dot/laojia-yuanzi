import * as THREE from 'three';
import { CHARACTERS } from '../layout.js';
import { canvas, makeFbm, makeNoise, fillMulti, textureSet, rng } from '../textures/canvas.js';
import { Limb, ellipsoid, solveTwoBone } from './rig.js';

/**
 * 父亲（现在约 70 岁的样子，按用户给的正面、侧面照片尽量还原，照片本身不进仓库）：
 * - 个子约 1.72 m，偏瘦，背微驼，站着时上身略往右边（狗那边）倾
 * - 短发，深灰夹白、往后梳，额头高、发际线靠后，两鬓更白
 * - 长脸、颧骨略高，脸色红润偏黑，额头几道抬头纹，眼睛细长，鼻梁直，上唇略突，耳朵大
 * - 藏蓝色半拉链立领套头衫，黑裤子，深灰运动鞋，腰间挂着个白色小挂件
 * - 右手搭在大黄头上（两段骨骼 IK，每帧跟着狗头走），低头看着它
 * 局部坐标：+z 朝前，+y 朝上，脚底 y = 0。
 */
const SKIN = 0xb8785c; // 红润偏黑的肤色（sRGB）

function faceTexture() {
  // 头部椭球的经纬度贴图：u 绕一圈（u = 0.25 是正脸），v 从头顶（0）到下巴（1）
  const W = 512;
  const H = 256;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const k = c.width / W;
  ctx.scale(k, k);
  const r = rng(70);
  ctx.fillStyle = 'rgb(184,120,92)';
  ctx.fillRect(0, 0, W, H);
  const fx = W * 0.25; // 正脸中线
  const blob = (x, y, rx, ry, color, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, color.replace('A', a));
    g.addColorStop(1, color.replace('A', 0));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // 皮肤的斑驳、晒黑的额头、发红的脸颊和鼻头
  for (let i = 0; i < 400; i++) blob(r() * W, r() * H, 3 + r() * 8, 3 + r() * 8, 'rgba(120,64,44,A)', 0.08);
  blob(fx, 90, 60, 26, 'rgba(160,96,70,A)', 0.35);
  for (const s of [-1, 1]) blob(fx + s * 40, 146, 26, 20, 'rgba(200,96,80,A)', 0.4);
  blob(fx, 150, 12, 14, 'rgba(196,96,80,A)', 0.45);
  // 抬头纹
  ctx.lineCap = 'round';
  for (const [y, w] of [[74, 34], [84, 40], [94, 42], [103, 30]]) {
    ctx.strokeStyle = 'rgba(120,62,44,0.22)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(fx - w, y + 2);
    ctx.quadraticCurveTo(fx, y - 3, fx + w, y + 2);
    ctx.stroke();
  }
  // 眉毛：稀疏、深灰
  for (const s of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = fx + s * (10 + t * 34);
      const y = 113 - Math.sin(t * Math.PI) * 3 + t * 2;
      ctx.strokeStyle = `rgba(${48 + r() * 30},${44 + r() * 24},${42 + r() * 20},0.8)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y + 1.5);
      ctx.lineTo(x + s * 3, y - 1.5);
      ctx.stroke();
    }
  }
  // 眼睛：细长、上眼皮有点耷拉
  for (const s of [-1, 1]) {
    const ex = fx + s * 33;
    blob(ex, 126, 18, 9, 'rgba(110,60,48,A)', 0.5); // 眼窝
    ctx.fillStyle = 'rgb(28,22,20)';
    ctx.beginPath();
    ctx.ellipse(ex, 127, 12, 2.6, s * -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,210,200,0.6)';
    ctx.fillRect(ex - s * 9 - 1, 126.5, 2, 1);
    ctx.strokeStyle = 'rgba(96,50,38,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ex - 13, 124);
    ctx.quadraticCurveTo(ex, 119, ex + 13, 124); // 上眼皮褶
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex - 10, 133);
    ctx.quadraticCurveTo(ex, 136, ex + 10, 132); // 眼袋
    ctx.stroke();
    // 鱼尾纹
    for (const dy of [-3, 1, 5]) {
      ctx.beginPath();
      ctx.moveTo(ex + s * 15, 127 + dy * 0.6);
      ctx.lineTo(ex + s * 22, 125 + dy);
      ctx.stroke();
    }
  }
  // 法令纹
  ctx.strokeStyle = 'rgba(100,50,38,0.55)';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(fx + s * 13, 150);
    ctx.quadraticCurveTo(fx + s * 26, 165, fx + s * 22, 182);
    ctx.stroke();
  }
  // 嘴：薄嘴唇，嘴角略往上（带一点笑意）
  ctx.strokeStyle = 'rgb(96,44,36)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(fx - 18, 172);
  ctx.quadraticCurveTo(fx, 176, fx + 18, 172);
  ctx.stroke();
  blob(fx, 177, 14, 4, 'rgba(150,70,60,A)', 0.5);
  blob(fx, 197, 30, 14, 'rgba(110,64,48,A)', 0.25); // 下巴的胡茬阴影
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function hairTexture(thetaLen) {
  // 发帽贴图：u 绕一圈（0.25 是正前方），v 从头顶到 thetaLen
  const W = 512;
  const H = 256;
  const strands = makeNoise(71, 384);
  const clump = makeFbm(72, 8, 3);
  const thin = makeFbm(73, 12, 3);
  const set = fillMulti(W, H, (u, v) => {
    const theta = v * thetaLen;
    // 离正脸的角度（0 = 正前，π = 后脑勺）
    let a = Math.abs((u - 0.25) * Math.PI * 2);
    if (a > Math.PI) a = Math.PI * 2 - a;
    // 发际线：正前方 0.98（额头高）、鬓角往上缩 0.84、两侧耳朵上方 1.32、后脑 1.72
    let line;
    if (a < 0.5) line = 0.98 - (a / 0.5) * 0.14;
    else if (a < 1.3) line = 0.84 + ((a - 0.5) / 0.8) * 0.48;
    else line = 1.32 + ((a - 1.3) / (Math.PI - 1.3)) * 0.4;
    const edge = (line - theta) * 30;
    // 头顶前面稀
    const sparse = theta < 0.85 && a < 0.7 ? (thin(u, v) - 0.18) * 5 : 1; // 头顶前面略稀，只露出零星头皮
    const alpha = Math.max(0, Math.min(1, edge)) * Math.max(0, Math.min(1, sparse));
    const s = strands(u * 384, v * 10); // 往后梳：沿经线方向的发丝
    const salt = 0.1 + Math.min(1, a / 1.6) * 0.22 + (theta > 1.1 ? 0.12 : 0); // 两鬓、后面更白
    const grey = s > 1 - salt ? 128 + s * 34 : 44 + s * 22 + clump(u, v) * 14;
    return { c: [grey, grey * 0.97, grey * 0.94], a: alpha > 0.5 ? 255 : 0, h: 0.4 + s * 0.6, r: 0.7 };
  }, { alpha: true });
  return textureSet({ ...set, normalStrength: 3 }, 1, { repeat: false });
}

export function createFather() {
  const F = CHARACTERS.father;
  const root = new THREE.Group();
  root.name = 'father';
  root.position.set(F.x, 0, F.z);
  root.rotation.y = (F.rot * Math.PI) / 180;

  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.62 });
  const navyFabric = (() => {
    const set = fillMulti(128, 128, (u, v, x, y) => {
      const k = ((x + y) % 4 < 2 ? 0.96 : 1) * (0.94 + Math.random() * 0.06);
      return { c: [255 * k, 255 * k, 255 * k], h: (x + y) % 4 < 2 ? 0.4 : 0.6, r: 0.9 };
    });
    return textureSet({ ...set, normalStrength: 1 }, 0.05, { repeat: false });
  })();
  for (const t of [navyFabric.map, navyFabric.normalMap, navyFabric.roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 12);
  }
  const navy = new THREE.MeshStandardMaterial({ ...navyFabric, color: 0x26304c, roughness: 1 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.92 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x45474b, roughness: 0.8 });
  const sole = new THREE.MeshStandardMaterial({ color: 0xcfcdc4, roughness: 0.9 });
  const H = F.height / 1.72;
  const body = new THREE.Group();
  body.scale.setScalar(H);
  root.add(body);

  // —— 腿、鞋 ——
  for (const s of [-1, 1]) {
    const hip = new THREE.Vector3(s * 0.09, 0.9, 0);
    const knee = new THREE.Vector3(s * 0.098, 0.49, 0.018);
    const ankle = new THREE.Vector3(s * 0.105, 0.085, -0.005);
    const thigh = new Limb(pants, 0.088, 0.066);
    thigh.set(hip, knee);
    const shin = new Limb(pants, 0.064, 0.052);
    shin.set(knee, ankle);
    body.add(thigh.group, shin.group);
    const foot = new THREE.Group();
    foot.position.set(s * 0.11, 0, 0.035);
    foot.rotation.y = s * 0.12; // 脚尖略朝外
    const upper = ellipsoid(shoe, 0.05, 0.045, 0.125);
    upper.position.y = 0.05;
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.26), sole);
    so.position.y = 0.011;
    so.castShadow = so.receiveShadow = true;
    foot.add(upper, so);
    body.add(foot);
  }
  const pelvis = ellipsoid(pants, 0.15, 0.1, 0.095);
  pelvis.position.y = 0.93;
  body.add(pelvis);
  // 腰间的白色小挂件
  const charm = new THREE.Group();
  charm.position.set(0.07, 0.93, 0.115);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0015, 4, 10), new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 0.8, roughness: 0.3 }));
  const doll = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.8 });
  const dBody = ellipsoid(doll, 0.012, 0.016, 0.01, 10);
  dBody.position.y = -0.03;
  const dHead = ellipsoid(doll, 0.011, 0.01, 0.01, 10);
  dHead.position.y = -0.008;
  charm.add(ring, dBody, dHead);
  body.add(charm);

  // —— 上身（从胯部往上，略驼背、往右倾）——
  const torso = new THREE.Group();
  torso.position.y = 0.9;
  torso.rotation.set(0.09, 0, 0.06);
  body.add(torso);
  const prof = [
    [0.172, -0.07], [0.172, 0.03], [0.165, 0.14], [0.172, 0.28], [0.186, 0.4], [0.195, 0.48], [0.18, 0.53], [0.12, 0.565], [0.07, 0.575], [0, 0.578],
  ].map(([rr, y]) => new THREE.Vector2(rr, y));
  const shirtGeo = new THREE.LatheGeometry(prof, 32);
  shirtGeo.scale(1, 1, 0.64);
  const shirt = new THREE.Mesh(shirtGeo, navy);
  shirt.castShadow = shirt.receiveShadow = true;
  torso.add(shirt);
  // 肩头
  for (const s of [-1, 1]) {
    const sh = ellipsoid(navy, 0.06, 0.05, 0.062);
    sh.position.set(s * 0.18, 0.5, -0.01);
    torso.add(sh);
  }
  // 立领 + 半截拉链
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.072, 0.055, 24, 1, true), navy);
  collar.material = navy.clone();
  collar.material.side = THREE.DoubleSide;
  collar.position.y = 0.59;
  torso.add(collar);
  const zipMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.5, metalness: 0.4 });
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.004), zipMat);
  zip.position.set(0, 0.52, 0.124);
  zip.rotation.x = -0.12;
  torso.add(zip);
  const pull = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.025, 0.004), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.7, roughness: 0.3 }));
  pull.position.set(0, 0.59, 0.075);
  torso.add(pull);
  // 下摆一圈罗纹
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.174, 0.035, 32, 1, true).scale(1, 1, 0.64), navy);
  hem.position.y = -0.055;
  torso.add(hem);

  // 脖子
  const neck = new Limb(skin, 0.05, 0.048, { radial: 14 });
  neck.set(new THREE.Vector3(0, 0.55, 0.0), new THREE.Vector3(0, 0.66, 0.02));
  torso.add(neck.group);

  // —— 头 ——
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.64, 0.02);
  torso.add(headPivot);
  const head = new THREE.Group();
  head.position.y = 0.11;
  headPivot.add(head);
  const RX = 0.083; // 脸比较宽
  const RY = 0.115;
  const RZ = 0.1;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.6 }));
  skull.scale.set(RX, RY, RZ);
  // 下半张脸收窄成长脸、下巴
  {
    const pos = skull.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -0.2) {
        const kk = 1 - (-0.2 - y) * 0.32;
        pos.setX(i, pos.getX(i) * kk);
      }
      // 后脑勺略平
      if (pos.getZ(i) < -0.6) pos.setZ(i, -0.6 + (pos.getZ(i) + 0.6) * 0.6);
    }
    skull.geometry.computeVertexNormals();
  }
  skull.castShadow = true;
  head.add(skull);
  // 发帽
  const HAIR_THETA = 1.78;
  const hairSet = hairTexture(HAIR_THETA);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, HAIR_THETA),
    new THREE.MeshStandardMaterial({ ...hairSet, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide }),
  );
  hair.scale.set(RX * 1.07, RY * 1.05, RZ * 1.06);
  hair.position.set(0, 0.004, -0.004);
  hair.castShadow = true;
  head.add(hair);
  // 五官的立体：鼻子、颧骨、上唇、下巴、耳朵
  const skinFace = skin;
  // 直鼻梁（侧面看得出来），鼻头不大
  const noseBridge = ellipsoid(skinFace, 0.009, 0.025, 0.011, 16);
  noseBridge.position.set(0, -0.016, 0.092);
  noseBridge.rotation.x = -0.3;
  const noseTip = ellipsoid(skinFace, 0.0105, 0.009, 0.009, 16);
  noseTip.position.set(0, -0.036, 0.099);
  const wings = [-1, 1].map((s) => {
    const w = ellipsoid(skinFace, 0.0055, 0.005, 0.005, 10);
    w.position.set(s * 0.0105, -0.039, 0.093);
    return w;
  });
  head.add(noseBridge, noseTip, ...wings);
  for (const s of [-1, 1]) {
    const ear = ellipsoid(new THREE.MeshStandardMaterial({ color: 0xc07a62, roughness: 0.6 }), 0.013, 0.036, 0.024, 16);
    ear.position.set(s * 0.085, -0.008, -0.008);
    ear.rotation.set(0, s * 0.35, s * -0.12);
    const inner = ellipsoid(new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.8 }), 0.006, 0.022, 0.013, 10);
    inner.position.set(s * 0.091, -0.008, -0.004);
    inner.rotation.copy(ear.rotation);
    head.add(ear, inner);
  }
  // 低头看狗：往右（-x）转、往下看
  headPivot.rotation.set(0.42, -0.42, 0.05);

  // —— 左臂：自然垂着 ——
  const lS = new THREE.Vector3(0.205, 0.5, -0.01);
  const lE = new THREE.Vector3(0.235, 0.22, -0.02);
  const lW = new THREE.Vector3(0.22, -0.02, 0.045);
  const lUp = new Limb(navy, 0.056, 0.047);
  lUp.set(lS, lE);
  const lFo = new Limb(navy, 0.046, 0.039);
  lFo.set(lE, lW);
  torso.add(lUp.group, lFo.group);
  const lHand = ellipsoid(skin, 0.022, 0.07, 0.042, 14);
  lHand.position.set(0.218, -0.075, 0.05);
  lHand.rotation.set(0.1, 0, 0.05);
  torso.add(lHand);

  // —— 右臂：IK 摸狗头（在 body 坐标系里每帧摆）——
  const shoulderR = new THREE.Object3D();
  shoulderR.position.set(-0.205, 0.5, -0.01);
  torso.add(shoulderR);
  const rUp = new Limb(navy, 0.056, 0.047);
  const rFo = new Limb(navy, 0.046, 0.039);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.025, 14, 1, true), navy);
  body.add(rUp.group, rFo.group, cuff);
  const rHand = new THREE.Group();
  const palm = ellipsoid(skin, 0.045, 0.02, 0.055, 14);
  const fingers = ellipsoid(skin, 0.042, 0.014, 0.04, 12);
  fingers.position.set(0, -0.014, 0.06);
  fingers.rotation.x = 0.55; // 手指顺着狗头往下搭
  const thumb = ellipsoid(skin, 0.012, 0.012, 0.03, 8);
  thumb.position.set(0.04, -0.008, 0.015);
  thumb.rotation.y = -0.5;
  rHand.add(palm, fingers, thumb);
  body.add(rHand);

  // 碰撞：人占一块
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.6, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  blocker.position.set(0, 0.8, 0);
  blocker.userData.solid = true;
  root.add(blocker);

  const S = new THREE.Vector3();
  const T = new THREE.Vector3();
  const pole = new THREE.Vector3(-0.7, -0.1, -0.7).normalize();
  const tmp = new THREE.Vector3();
  const look = new THREE.Vector3();
  return {
    object: root,
    /** 每帧：handTarget 为狗头顶的世界坐标 */
    update(dt, t, handTarget, nuzzling) {
      // 呼吸、微微晃
      torso.rotation.x = 0.09 + Math.sin(t * 1.7) * 0.006;
      headPivot.rotation.y = -0.42 + (nuzzling ? -0.06 : 0) + Math.sin(t * 0.5) * 0.02;
      root.updateMatrixWorld(true);
      shoulderR.getWorldPosition(S);
      body.worldToLocal(S);
      T.copy(handTarget);
      body.worldToLocal(T);
      // 手心在狗头顶上方一点，腕子在手心后面
      tmp.set(T.x - S.x, 0, T.z - S.z).normalize();
      const wristTarget = T.clone().addScaledVector(tmp, -0.055).add(new THREE.Vector3(0, 0.03, 0));
      const { elbow, end } = solveTwoBone(S, wristTarget, 0.3, 0.27, pole);
      rUp.set(S, elbow);
      rFo.set(elbow, end);
      cuff.position.copy(end).lerp(elbow, 0.06);
      cuff.quaternion.copy(rFo.q);
      rHand.position.copy(end);
      look.copy(end).addScaledVector(tmp, 0.1).add(new THREE.Vector3(0, -0.02, 0));
      body.localToWorld(look);
      rHand.lookAt(look);
    },
  };
}
