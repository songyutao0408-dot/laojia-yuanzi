import * as THREE from 'three';
import { CHARACTERS } from '../layout.js';
import { Limb, ellipsoid, solveTwoBone } from './rig.js';

/**
 * 父亲（现在 70 岁左右的样子）：参考用户给的正面照做的程序化 3D 人物，和院子里其他东西一样受场景光照、投影子。
 * 用户要求不要把照片上的脸贴上去，像不像无所谓——脸、头发都是代码建模、在 canvas 上画的。
 *
 * - 头：椭球改出宽脸、下巴，鼻梁/鼻头、眉骨、眼窝、颧骨、嘴唇的起伏；
 *   贴图（faceAtlas）左半边是正面投影的脸（黑短发往后梳、浓眉、细长眼、法令纹），右半边是后脑勺头发和后脖颈。
 * - 衣着照照片：淡紫灰的长袖衬衫（领子、袖口露出来），外面藏青格子的开衫毛背心（V 领、一排扣子、罗纹下摆），
 *   黑色运动裤（左大腿上一个小白标），黑运动鞋。
 * - 个子约 1.72 m，站着时上身略往右边（狗那边）倾；左手插在裤兜里，
 *   右手搭在大黄头上（两段骨骼 IK，每帧跟着狗头走），低头看着它。
 * 局部坐标：+z 朝前，+y 朝上，脚底 y = 0；他的右手边是 -x。
 */

// 头部椭球半轴（米）
const RX = 0.096;
const RY = 0.128;
const RZ = 0.11;
// 五官（头部局部坐标，米）：鼻头 y ≈ -0.044，两眼 y ≈ 0、相距约 6.8 cm，眉 y ≈ 0.024，嘴 y ≈ -0.08，下巴 y ≈ -0.119
const NOSE = { x: 0, y: -0.044 };
const EYE = { x: 0.034, y: 0 };
const MOUTH_Y = -0.08;
// 贴图坐标：左半边（脸）u = 0.5 × (0.5 + x/RX × 0.4)；两半共用 v = 0.5 + y/RY × 0.45
const FU = 0.4;
const FV = 0.45;

const SKIN = 0xb87460; // 晒得红黑的肤色（sRGB）
const SHIRT = 0xa8a5b8; // 淡紫灰衬衫
const NAVY = 0x222a46; // 藏青毛背心
const PANTS = 0x1a1b21;

/** 前额发际线高度（米），x 为头部局部横坐标：两边额角略往后退，到耳朵上沿变成鬓角 */
function hairlineY(x) {
  const a = Math.min(1, Math.abs(x) / RX);
  return 0.07 + 0.012 * Math.exp(-((a - 0.6) ** 2) / 0.03) - 0.09 * smooth(0.78, 1, a);
}
/** 后脑勺的发际线（米）：正后方到后脖颈，往两边升到耳朵上沿 */
function backHairlineY(x) {
  return -0.054 + 0.05 * smooth(0.5, 1, Math.abs(x) / RX);
}

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (dx, dy, sx, sy) => Math.exp(-((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy)));

/** 头：椭球 + 五官起伏；正面三角形用脸的贴图（正面投影），背面用后脑勺 */
function headGeometry() {
  const g = new THREE.SphereGeometry(1, 72, 54);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); // 单位球上
    const xn = v.x;
    const yn = v.y;
    let zn = v.z;
    // 后脑勺略平
    if (zn < -0.6) zn = -0.6 + (zn + 0.6) * 0.6;
    let x = xn * RX;
    const y = yn * RY;
    let z = zn * RZ;
    // 下半张脸收成下巴
    if (yn < -0.55) x *= 1 - (-0.55 - yn) * 0.55;
    // 宽脸：颧骨到腮帮子往外撑一点
    if (zn > 0) x *= 1 + 0.06 * gauss(0, yn + 0.3, 1, 0.3) * zn;
    // 头发：发际线以上往外鼓一点（短发的厚度）
    const hairline = THREE.MathUtils.lerp(backHairlineY(x), hairlineY(x), smooth(-0.2, 0.3, zn)) / RY;
    const puff = 0.006 * smooth(hairline - 0.02, hairline + 0.12, yn) + 0.007 * smooth(0.55, 0.95, yn); // 头顶头发蓬一点
    x += xn * puff;
    z += zn * puff;
    const yy = y + yn * puff;
    // 脸上的起伏（只动 z，不影响正面投影的贴图位置）
    if (zn > 0.3) {
      const dx = x - NOSE.x;
      z += 0.014 * gauss(dx, y - (NOSE.y + 0.022), 0.009, 0.02); // 鼻梁
      z += 0.013 * gauss(dx, y - NOSE.y, 0.013, 0.01); // 鼻头
      z += 0.005 * gauss(dx, y - (NOSE.y - 0.002), 0.022, 0.009); // 鼻翼
      z += 0.006 * gauss(dx, y - 0.024, 0.055, 0.011); // 眉骨
      for (const s of [-1, 1]) {
        z -= 0.007 * gauss(dx - s * 0.034, y, 0.016, 0.01); // 眼窝
        z += 0.004 * gauss(dx - s * 0.052, y + 0.032, 0.022, 0.018); // 颧骨
      }
      z += 0.004 * gauss(dx, y + 0.08, 0.024, 0.009); // 嘴唇
      z += 0.004 * gauss(dx, y + 0.112, 0.03, 0.014); // 下巴
    }
    pos.setXYZ(i, x, yy, z);
  }
  const geo = g.toNonIndexed();
  geo.deleteAttribute('normal');
  geo.computeVertexNormals();
  // 按三角形分区给 UV：正面用脸，背面用后脑勺（避免交界处的贴图被拉成一道）
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let t = 0; t < p.count; t += 3) {
    const cz = (p.getZ(t) + p.getZ(t + 1) + p.getZ(t + 2)) / 3;
    const front = cz / RZ > -0.1;
    for (let k = t; k < t + 3; k++) {
      const xn = p.getX(k) / RX;
      const vv = 0.5 + (p.getY(k) / RY) * FV;
      if (front) uv.setXY(k, 0.5 * THREE.MathUtils.clamp(0.5 + xn * FU, 0.01, 0.99), vv);
      else uv.setXY(k, 0.5 + 0.5 * THREE.MathUtils.clamp(0.5 + xn * 0.45, 0.01, 0.99), vv);
    }
  }
  return geo;
}

/**
 * 头部贴图（1024 × 512，程序画的）：左半边正面投影的脸，右半边后脑勺。
 * 画的时候直接用头部局部坐标（米）：X(x)、Y(y) 换成画布像素。
 */
function faceAtlas() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const fx = (x) => 512 * (0.5 + (x / RX) * FU);
  const fy = (y) => 512 * (0.5 - (y / RY) * FV);
  const SKIN_C = [184, 118, 94];
  const HAIR_C = [34, 31, 30];
  const rgba = (cc, a) => `rgba(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0},${a})`;
  const blob = (x, y, rx, ry, color, a) => {
    const R = Math.max(rx, ry);
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, rgba(color, a));
    gr.addColorStop(1, rgba(color, 0));
    g.save();
    g.translate(x, y);
    g.scale(rx / R, ry / R);
    g.translate(-x, -y);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, R, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  const m = (512 * FU) / RX; // 每米多少像素（横向）
  const my = (512 * FV) / RY; // 纵向
  // —— 左半边：脸 ——
  g.fillStyle = rgba(SKIN_C, 1);
  g.fillRect(0, 0, 512, 512);
  // 皮肤斑驳、晒黑
  for (let i = 0; i < 500; i++) blob(r() * 512, r() * 512, 3 + r() * 9, 3 + r() * 9, [120, 66, 46], 0.07);
  blob(fx(0), fy(0.05), 0.07 * m, 0.03 * my, [150, 90, 66], 0.3); // 额头晒得深
  for (const s of [-1, 1]) blob(fx(s * 0.05), fy(-0.035), 0.028 * m, 0.022 * my, [196, 92, 76], 0.35); // 脸颊发红
  blob(fx(0), fy(NOSE.y), 0.014 * m, 0.012 * my, [190, 90, 76], 0.4); // 鼻头
  // 下巴底下、脖子：暗一点
  const chin = g.createLinearGradient(0, fy(-0.105), 0, fy(-0.13));
  chin.addColorStop(0, 'rgba(90,50,36,0)');
  chin.addColorStop(1, 'rgba(90,50,36,0.45)');
  g.fillStyle = chin;
  g.fillRect(0, fy(-0.105), 512, 512);
  // 抬头纹
  g.lineCap = 'round';
  for (const [y, w] of [[0.038, 0.03], [0.047, 0.036], [0.056, 0.032]]) {
    g.strokeStyle = 'rgba(110,58,40,0.22)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(fx(-w), fy(y - 0.002));
    g.quadraticCurveTo(fx(0), fy(y + 0.003), fx(w), fy(y - 0.002));
    g.stroke();
  }
  // 头发：黑短发往后梳，前面发际线略高，两边鬓角到耳朵上沿
  {
    g.save();
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, fy(hairlineY(-RX)));
    for (let i = 0; i <= 64; i++) {
      const x = -RX + (i / 64) * 2 * RX;
      g.lineTo(fx(x), fy(hairlineY(x)));
    }
    g.lineTo(512, fy(hairlineY(RX)));
    g.lineTo(512, 0);
    g.closePath();
    g.clip();
    g.fillStyle = rgba(HAIR_C, 1);
    g.fillRect(0, 0, 512, 512);
    // 往后梳的发丝（从发际线往头顶）
    for (let i = 0; i < 900; i++) {
      const x0 = r() * 512;
      const y0 = fy(0.04) + r() * 60;
      const l = 20 + r() * 50;
      const k = r();
      g.strokeStyle = k > 0.93 ? 'rgba(120,116,112,0.5)' : k > 0.5 ? 'rgba(60,56,54,0.5)' : 'rgba(12,10,10,0.5)';
      g.lineWidth = 0.8 + r();
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + (x0 - 256) * 0.08, y0 - l * 0.6, x0 + (x0 - 256) * 0.15 + 6, y0 - l);
      g.stroke();
    }
    g.restore();
    // 发际线一圈柔一点：稀疏的短发碴
    for (let i = 0; i < 700; i++) {
      const x = (r() * 2 - 1) * RX;
      const yb = hairlineY(x);
      const d = r() * r() * 0.006; // 越往下越稀
      g.strokeStyle = `rgba(36,30,28,${0.5 - d * 70})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(fx(x), fy(yb - d));
      g.lineTo(fx(x) + (r() - 0.5) * 2, fy(yb - d) - 5 - r() * 6);
      g.stroke();
    }
  }
  // 眉毛：浓、黑，眉尾往下
  for (const s of [-1, 1]) {
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      const x = s * (0.012 + t * 0.04);
      const y = 0.022 + Math.sin(t * Math.PI * 0.8) * 0.004 - t * 0.004 + (r() - 0.5) * 0.004;
      g.strokeStyle = `rgba(${26 + r() * 20},${22 + r() * 16},${20 + r() * 14},${0.55 + r() * 0.3})`;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(fx(x), fy(y - 0.002));
      g.lineTo(fx(x + s * 0.004), fy(y + 0.002));
      g.stroke();
    }
  }
  // 眼睛：细长、单眼皮、上眼皮有点耷拉，眼角细纹
  for (const s of [-1, 1]) {
    const ex = s * EYE.x;
    blob(fx(ex), fy(0.002), 0.02 * m, 0.01 * my, [110, 58, 44], 0.45); // 眼窝的暗
    g.fillStyle = 'rgb(232,220,206)';
    g.beginPath();
    g.ellipse(fx(ex), fy(-0.0005), 0.012 * m, 0.0028 * my, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgb(36,26,22)';
    g.beginPath();
    g.ellipse(fx(ex - s * 0.001), fy(-0.0005), 0.0055 * m, 0.0028 * my, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,250,240,0.8)';
    g.fillRect(fx(ex - s * 0.002) - 1, fy(0.0005) - 1, 2, 2);
    g.strokeStyle = 'rgba(70,36,28,0.9)';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(fx(ex - 0.013), fy(-0.0005));
    g.quadraticCurveTo(fx(ex), fy(0.0045), fx(ex + 0.013), fy(-0.0005)); // 上眼睑
    g.stroke();
    g.strokeStyle = 'rgba(96,52,40,0.5)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(fx(ex - 0.01), fy(-0.006));
    g.quadraticCurveTo(fx(ex), fy(-0.0095), fx(ex + 0.011), fy(-0.0055)); // 眼袋
    g.stroke();
    for (const d of [-0.003, 0.001, 0.005]) {
      g.beginPath();
      g.moveTo(fx(ex + s * 0.016), fy(d * 0.5));
      g.lineTo(fx(ex + s * 0.024), fy(d * 1.4)); // 鱼尾纹
      g.stroke();
    }
  }
  // 鼻孔、鼻翼的阴影
  for (const s of [-1, 1]) blob(fx(s * 0.007), fy(NOSE.y - 0.006), 0.004 * m, 0.0025 * my, [60, 30, 24], 0.7);
  // 法令纹（很深）
  g.strokeStyle = 'rgba(96,48,36,0.32)';
  g.lineWidth = 3;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(fx(s * 0.021), fy(NOSE.y + 0.002));
    g.quadraticCurveTo(fx(s * 0.04), fy(-0.068), fx(s * 0.036), fy(-0.096));
    g.stroke();
  }
  // 嘴：薄嘴唇，嘴角略往下
  blob(fx(0), fy(MOUTH_Y - 0.0045), 0.019 * m, 0.0045 * my, [158, 74, 64], 0.7);
  g.strokeStyle = 'rgb(84,40,34)';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(fx(-0.022), fy(MOUTH_Y - 0.002));
  g.quadraticCurveTo(fx(0), fy(MOUTH_Y + 0.002), fx(0.022), fy(MOUTH_Y - 0.002));
  g.stroke();
  blob(fx(0), fy(-0.105), 0.03 * m, 0.012 * my, [110, 64, 48], 0.25); // 下巴的胡茬阴影
  // —— 右半边：后脑勺 ——
  const bx = (x) => 512 + 512 * (0.5 + (x / RX) * 0.45);
  g.fillStyle = rgba(SKIN_C.map((v) => v * 0.92), 1);
  g.fillRect(512, 0, 512, 512);
  g.fillStyle = rgba(HAIR_C, 1);
  g.beginPath();
  g.moveTo(512, 0);
  for (let i = 0; i <= 64; i++) {
    const x = -RX / 0.9 + (i / 64) * (2 * RX) / 0.9;
    g.lineTo(bx(x), fy(backHairlineY(x)));
  }
  g.lineTo(1024, 0);
  g.fill();
  for (let i = 0; i < 1400; i++) {
    const x0 = 512 + r() * 512;
    const y0 = r() * (fy(backHairlineY(((x0 - 768) / 512 / 0.45) * RX)) - 10);
    const k = r();
    g.strokeStyle = k > 0.93 ? 'rgba(120,116,112,0.45)' : k > 0.5 ? 'rgba(62,58,56,0.45)' : 'rgba(10,9,9,0.5)';
    g.lineWidth = 0.8 + r();
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + (r() - 0.5) * 4, y0 + 14 + r() * 20);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 毛背心的格子：藏青底、深浅两色细格 */
function plaidTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#222a46';
  g.fillRect(0, 0, 128, 128);
  // 针织的细纹
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.05})`;
    g.fillRect(0, y, 128, 1);
  }
  g.fillStyle = 'rgba(70,86,130,0.55)';
  g.fillRect(0, 60, 128, 6);
  g.fillRect(60, 0, 6, 128);
  g.fillStyle = 'rgba(16,20,36,0.6)';
  g.fillRect(0, 20, 128, 3);
  g.fillRect(20, 0, 3, 128);
  g.fillRect(0, 100, 128, 3);
  g.fillRect(100, 0, 3, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** 把稀疏的轮廓点插成细密的（车床体的 V 领边缘才不会太毛） */
function densify(prof, n) {
  const out = [];
  for (let i = 0; i < prof.length - 1; i++) {
    for (let k = 0; k < n; k++) out.push(new THREE.Vector2().lerpVectors(prof[i], prof[i + 1], k / n));
  }
  out.push(prof[prof.length - 1].clone());
  return out;
}

export function createFather() {
  const F = CHARACTERS.father;
  const root = new THREE.Group();
  root.name = 'father';
  root.position.set(F.x, 0, F.z);
  root.rotation.y = (F.rot * Math.PI) / 180;

  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.62 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.85 });
  const plaid = plaidTexture();
  plaid.repeat.set(16, 11);
  const vestMat = new THREE.MeshStandardMaterial({ map: plaid, roughness: 1 });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x1c2238, roughness: 1 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.88 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.6 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.9 });
  const H = F.height / 1.72;
  const body = new THREE.Group();
  body.scale.setScalar(H);
  root.add(body);

  // —— 腿、鞋（运动裤，直筒略宽）——
  for (const s of [-1, 1]) {
    const hip = new THREE.Vector3(s * 0.092, 0.9, 0);
    const knee = new THREE.Vector3(s * 0.1, 0.49, 0.018);
    const ankle = new THREE.Vector3(s * 0.106, 0.1, -0.005);
    const thigh = new Limb(pants, 0.09, 0.07, { radial: 16 });
    thigh.set(hip, knee);
    const shin = new Limb(pants, 0.068, 0.058, { radial: 16 });
    shin.set(knee, ankle);
    body.add(thigh.group, shin.group);
    const foot = new THREE.Group();
    foot.position.set(s * 0.112, 0, 0.035);
    foot.rotation.y = s * 0.14; // 脚尖略朝外
    const upper = ellipsoid(shoe, 0.052, 0.048, 0.13);
    upper.position.y = 0.05;
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.025, 0.27), sole);
    so.position.y = 0.0125;
    so.castShadow = so.receiveShadow = true;
    foot.add(upper, so);
    body.add(foot);
  }
  const pelvis = ellipsoid(pants, 0.152, 0.1, 0.098);
  pelvis.position.y = 0.93;
  body.add(pelvis);
  // 左大腿上的小白标
  {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#e8e6e0';
    g.beginPath();
    g.moveTo(6, 20);
    g.quadraticCurveTo(30, 2, 58, 8);
    g.quadraticCurveTo(34, 10, 14, 24);
    g.fill();
    g.fillRect(14, 24, 36, 3);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.02), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9 }));
    logo.position.set(0.122, 0.76, 0.083);
    logo.rotation.set(-0.02, 0.38, 0);
    logo.userData.noAO = true;
    body.add(logo);
  }

  // —— 上身（从胯部往上，略驼背、往右倾）——
  const torso = new THREE.Group();
  torso.position.y = 0.9;
  torso.rotation.set(0.09, 0, 0.06);
  body.add(torso);
  const prof = [
    [0.172, -0.07], [0.172, 0.03], [0.165, 0.14], [0.172, 0.28], [0.186, 0.4], [0.195, 0.48], [0.18, 0.53], [0.12, 0.565], [0.07, 0.575], [0, 0.578],
  ].map(([rr, y]) => new THREE.Vector2(rr, y));
  const rAt = (y) => {
    for (let i = 0; i < prof.length - 1; i++) {
      if (y <= prof[i + 1].y) return THREE.MathUtils.lerp(prof[i].x, prof[i + 1].x, (y - prof[i].y) / (prof[i + 1].y - prof[i].y));
    }
    return 0;
  };
  const ZS = 0.64; // 身子前后扁
  // 衬衫（V 领里露出来的那块）
  const shirtGeo = new THREE.LatheGeometry(prof, 40);
  shirtGeo.scale(1, 1, ZS);
  const shirt = new THREE.Mesh(shirtGeo, shirtMat);
  shirt.castShadow = shirt.receiveShadow = true;
  torso.add(shirt);
  // 毛背心：比衬衫大一圈，前面挖出 V 领
  const VB = 0.3; // V 领底的高度
  {
    const vp = densify(
      prof.map((p) => new THREE.Vector2(p.x * 1.045 + 0.002, p.y)),
      6,
    );
    vp[0].y = -0.085;
    // phiStart = π：贴图 u = 0.5 正对前胸
    const lathe = new THREE.LatheGeometry(vp, 96, Math.PI);
    lathe.scale(1, 1, ZS);
    // V 领用透明贴图挖（按像素算边缘，比删三角形干净）
    const AW = 512;
    const AH = 512;
    const ac = document.createElement('canvas');
    ac.width = AW;
    ac.height = AH;
    const ag = ac.getContext('2d');
    const img = ag.createImageData(AW, AH);
    const N = vp.length - 1;
    for (let row = 0; row < AH; row++) {
      const jv = (1 - (row + 0.5) / AH) * N;
      const j0 = Math.min(N - 1, Math.floor(jv));
      const y = THREE.MathUtils.lerp(vp[j0].y, vp[j0 + 1].y, jv - j0);
      const r = THREE.MathUtils.lerp(vp[j0].x, vp[j0 + 1].x, jv - j0);
      for (let col = 0; col < AW; col++) {
        const phi = Math.PI + ((col + 0.5) / AW) * Math.PI * 2;
        const x = Math.sin(phi) * r;
        const front = Math.cos(phi) > 0;
        const inV = front && y > VB && Math.abs(x) < (y - VB) * 0.3;
        const k = (row * AW + col) * 4;
        const v = inV ? 0 : 255;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
        img.data[k + 3] = 255;
      }
    }
    ag.putImageData(img, 0, 0);
    const alpha = new THREE.CanvasTexture(ac);
    const vest = new THREE.Mesh(lathe, vestMat);
    vestMat.alphaMap = alpha;
    vestMat.alphaTest = 0.5;
    vestMat.side = THREE.DoubleSide;
    vest.castShadow = vest.receiveShadow = true;
    torso.add(vest);
    // V 领的罗纹边
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(0, VB - 0.005, rAt(VB) * 1.05 * ZS + 0.004);
      const yTop = 0.56;
      const b = new THREE.Vector3(s * (yTop - VB) * 0.3, yTop, rAt(yTop) * 1.05 * ZS + 0.004);
      b.z = Math.max(b.z, 0.06);
      const rib = new Limb(ribMat, 0.007, 0.007, { radial: 6, sz: 0.5 });
      rib.set(a, b);
      torso.add(rib.group);
    }
    // 一排扣子（V 领底到下摆）
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x55565c, roughness: 0.45, metalness: 0.2 });
    for (let i = 0; i < 5; i++) {
      const y = VB - 0.02 - i * 0.07;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.004, 12).rotateX(Math.PI / 2), btnMat);
      b.position.set(0, y, rAt(y) * 1.045 * ZS + 0.004);
      torso.add(b);
    }
    // 罗纹下摆
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.184, 0.184, 0.05, 48, 1, true).scale(1, 1, ZS), ribMat);
    hem.material = ribMat.clone();
    hem.material.side = THREE.DoubleSide;
    hem.position.y = -0.06;
    hem.castShadow = true;
    torso.add(hem);
  }
  // 衬衫领子
  {
    const collarMat = shirtMat.clone();
    collarMat.side = THREE.DoubleSide;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.068, 0.045, 24, 1, true), collarMat);
    band.position.set(0, 0.592, 0.012);
    band.castShadow = true;
    torso.add(band);
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.004), collarMat);
      tip.position.set(s * 0.03, 0.57, 0.064);
      tip.rotation.set(-0.35, s * 0.5, s * 0.55);
      tip.castShadow = true;
      torso.add(tip);
    }
  }
  // V 领里露出来的两粒衬衫扣子
  {
    const btn = new THREE.MeshStandardMaterial({ color: 0xd8d6dc, roughness: 0.4 });
    for (const y of [0.4, 0.49]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.003, 10).rotateX(Math.PI / 2), btn);
      b.position.set(0, y, rAt(y) * ZS + 0.004);
      torso.add(b);
    }
  }
  // 肩头（背心盖住肩膀，袖子从下面出来）
  const shoulderMat = new THREE.MeshStandardMaterial({ map: plaid, roughness: 1 });
  for (const s of [-1, 1]) {
    const sh = ellipsoid(shoulderMat, 0.05, 0.045, 0.058);
    sh.position.set(s * 0.178, 0.5, -0.01);
    torso.add(sh);
  }

  // 脖子
  const neck = new Limb(skin, 0.056, 0.054, { radial: 16 });
  neck.set(new THREE.Vector3(0, 0.55, 0.0), new THREE.Vector3(0, 0.66, 0.02));
  torso.add(neck.group);

  // —— 头 ——
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.64, 0.02);
  torso.add(headPivot);
  const head = new THREE.Group();
  head.position.y = 0.105;
  headPivot.add(head);
  const skull = new THREE.Mesh(headGeometry(), new THREE.MeshStandardMaterial({ map: faceAtlas(), roughness: 0.66 }));
  skull.castShadow = skull.receiveShadow = true;
  head.add(skull);
  // 耳朵
  const earMat = new THREE.MeshStandardMaterial({ color: 0xb06a56, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const ear = ellipsoid(earMat, 0.009, 0.031, 0.02, 14);
    ear.position.set(s * (RX + 0.004), -0.024, -0.014);
    ear.rotation.set(0, s * 0.45, s * -0.1);
    head.add(ear);
  }
  // 低头看狗：往右手边转、往下看
  headPivot.rotation.set(0.2, -0.4, 0.03);

  // —— 左手插在裤兜里 ——
  {
    const S = new THREE.Vector3(0.205, 0.5, -0.01);
    const E = new THREE.Vector3(0.255, 0.23, -0.05);
    const W = new THREE.Vector3(0.155, 0.0, 0.07);
    const up = new Limb(shirtMat, 0.054, 0.046);
    up.set(S, E);
    const fo = new Limb(shirtMat, 0.045, 0.04);
    fo.set(E, W);
    torso.add(up.group, fo.group);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.04, 14), shirtMat);
    cuff.position.copy(W).lerp(E, 0.12);
    cuff.quaternion.copy(fo.q);
    torso.add(cuff);
    // 兜口：手腕扎进去的地方一道暗缝
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.05), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 1 }));
    slit.position.set(0.15, 0.84, 0.06);
    slit.rotation.set(0, -0.4, 0.25);
    body.add(slit);
  }

  // —— 右臂：IK 摸狗头（在 body 坐标系里每帧摆）——
  const shoulderR = new THREE.Object3D();
  shoulderR.position.set(-0.205, 0.5, -0.01);
  torso.add(shoulderR);
  const rUp = new Limb(shirtMat, 0.054, 0.046);
  const rFo = new Limb(shirtMat, 0.045, 0.04);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.04, 14, 1, true), shirtMat);
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
  const lift = new THREE.Vector3(0, 0.03, 0);
  const drop = new THREE.Vector3(0, -0.02, 0);
  return {
    object: root,
    head,
    /** 每帧：handTarget 为狗头顶的世界坐标 */
    update(dt, t, handTarget, nuzzling) {
      // 呼吸、微微晃
      torso.rotation.x = 0.09 + Math.sin(t * 1.7) * 0.006;
      headPivot.rotation.y = -0.4 + (nuzzling ? -0.06 : 0) + Math.sin(t * 0.5) * 0.02;
      root.updateMatrixWorld(true);
      shoulderR.getWorldPosition(S);
      body.worldToLocal(S);
      T.copy(handTarget);
      body.worldToLocal(T);
      // 手心在狗头顶上方一点，腕子在手心后面
      tmp.set(T.x - S.x, 0, T.z - S.z).normalize();
      const wristTarget = T.clone().addScaledVector(tmp, -0.055).add(lift);
      const { elbow, end } = solveTwoBone(S, wristTarget, 0.3, 0.27, pole);
      rUp.set(S, elbow);
      rFo.set(elbow, end);
      cuff.position.copy(end).lerp(elbow, 0.08);
      cuff.quaternion.copy(rFo.q);
      rHand.position.copy(end);
      look.copy(end).addScaledVector(tmp, 0.1).add(drop);
      body.localToWorld(look);
      rHand.lookAt(look);
    },
  };
}
