import * as THREE from 'three';
import { CHARACTERS, KITCHEN } from '../layout.js';
import { box } from '../core/box.js';
import { Limb, solveTwoBone, ellipsoid } from './rig.js';

/**
 * 灶前烧火的小女孩（第 16 轮，用户要求）：十岁左右，扎一个马尾辫，穿碎花裙子，坐在小板凳上，
 * 身子往前探，右手拿一根柴往灶膛里送，左手搭在膝盖上。程序化建模，脸是 canvas 手画的。
 * 局部坐标：原点在板凳正下方的地面，+z 朝前（灶膛口），-x 是她的右手边；身高按 1.38 m 设计。
 * 动作按真实时间走：呼吸；每隔几秒往灶膛里捅一下柴；马尾辫跟着轻轻晃。
 */
const SKIN = 0xe0ad8a;
const HAIR = 0x16110d;

/** 碎花布：米白底子，小红花、小粉花、绿叶子 */
function floralTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  let s = 97;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#efe2d0';
  g.fillRect(0, 0, 128, 128);
  const flower = (x, y, rad, col) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + r();
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * rad * 0.6, y + Math.sin(a) * rad * 0.6, rad * 0.55, rad * 0.4, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f2d24a';
    g.beginPath();
    g.arc(x, y, rad * 0.25, 0, Math.PI * 2);
    g.fill();
  };
  for (let i = 0; i < 26; i++) {
    const x = r() * 128;
    const y = r() * 128;
    for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
      g.fillStyle = '#5a8a4a';
      g.beginPath();
      g.ellipse(x + ox + 5, y + oy + 3, 4, 1.8, 0.6, 0, Math.PI * 2);
      g.fill();
      flower(x + ox, y + oy, 4 + r() * 3, ['#c8323a', '#e0707a', '#d24a50', '#6a7ab8'][i % 4]);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** 脸：球面 UV，正脸在 u = 0.25（画布 x = 128），赤道在 y = 128 */
function faceTex() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e0ad8a';
  g.fillRect(0, 0, 512, 256);
  const blob = (x, y, rad, rgba) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, rgba);
    gr.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  // 脸蛋红扑扑（灶火烤的）
  blob(128 - 34, 150, 22, 'rgba(214,110,96,0.35)');
  blob(128 + 34, 150, 22, 'rgba(214,110,96,0.35)');
  // 眼睛：上眼皮一道、黑眼珠、亮点
  for (const s of [-1, 1]) {
    const x = 128 + s * 26;
    const y = 128;
    g.fillStyle = '#f2ece4';
    g.beginPath();
    g.ellipse(x, y, 11, 4.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a1a12';
    g.beginPath();
    g.arc(x + s * -1, y + 0.5, 4.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0a0606';
    g.beginPath();
    g.arc(x + s * -1, y + 0.5, 2.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillRect(x + s * -1 - 2, y - 2, 1.6, 1.6);
    g.strokeStyle = '#2a1810';
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(x, y + 1, 12, 5, 0, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    // 眉毛
    g.strokeStyle = 'rgba(50,32,22,0.8)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(x - s * 11, y - 14);
    g.quadraticCurveTo(x, y - 18, x + s * 12, y - 13);
    g.stroke();
  }
  // 鼻子下面一点阴影、嘴
  blob(128, 152, 7, 'rgba(150,90,70,0.35)');
  g.fillStyle = '#c0605a';
  g.beginPath();
  g.ellipse(128, 168, 9, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(110,40,36,0.7)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(119, 168);
  g.quadraticCurveTo(128, 170, 137, 168);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 头发：同样的球面 UV；头发往后梳到后脑勺扎起来，前面一排齐刘海；脸、脖子处透明 */
function hairTex() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  let s = 131;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // 每一列头发的下沿：正脸是刘海，两鬓往下，后脑勺到脖子
  const bottom = (x) => {
    let d = Math.abs(x - 128);
    if (d > 256) d = 512 - d; // 环绕
    if (d < 44) return 104 + Math.sin(x * 0.9) * 2.5 + r() * 3; // 刘海
    if (d < 70) return 104 + ((d - 44) / 26) * 40; // 两鬓
    if (d < 128) return 144 + ((d - 70) / 58) * 10; // 耳朵上面
    return 154 + ((d - 128) / 128) * 26; // 后脑勺
  };
  g.fillStyle = '#16110d';
  g.beginPath();
  g.moveTo(0, 0);
  for (let x = 0; x <= 512; x += 2) g.lineTo(x, bottom(x));
  g.lineTo(512, 0);
  g.closePath();
  g.fill();
  // 发丝：从发际往后脑勺扎辫子的地方（x = 384, y = 70）收
  g.save();
  g.clip();
  for (let i = 0; i < 500; i++) {
    const x = r() * 512;
    const y = bottom(x) - r() * 10;
    g.strokeStyle = r() > 0.5 ? 'rgba(70,52,40,0.35)' : 'rgba(0,0,0,0.3)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    const tx = x < 128 ? 384 - 512 : 384;
    g.quadraticCurveTo((x + tx) / 2, y - 40, tx + (r() - 0.5) * 10, 70 + (r() - 0.5) * 8);
    g.stroke();
  }
  // 头顶一道亮
  const gr = g.createLinearGradient(0, 30, 0, 70);
  gr.addColorStop(0, 'rgba(120,96,80,0)');
  gr.addColorStop(0.5, 'rgba(120,96,80,0.25)');
  gr.addColorStop(1, 'rgba(120,96,80,0)');
  g.fillStyle = gr;
  g.fillRect(0, 30, 512, 40);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createGirl() {
  const G = CHARACTERS.girl;
  const root = new THREE.Group();
  root.name = 'girl';
  root.position.set(G.x, KITCHEN.floor, G.z);
  root.rotation.y = (G.rot * Math.PI) / 180;
  const body = new THREE.Group();
  body.scale.setScalar(G.height / 1.38);
  root.add(body);

  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.65 });
  const floral = floralTex();
  floral.repeat.set(5, 2);
  const dress = new THREE.MeshStandardMaterial({ map: floral, roughness: 0.92, side: THREE.DoubleSide });
  const dressSmall = dress.clone();
  dressSmall.map = floral.clone();
  dressSmall.map.repeat.set(2, 1);
  const sock = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 1 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x1e1b1a, roughness: 0.9 });
  const sole = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 1 });
  const hairMat = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.55 });

  // —— 下身：坐在 0.23 m 高的小板凳上，膝盖比屁股高 ——
  const pelvis = ellipsoid(dressSmall, 0.11, 0.075, 0.1);
  pelvis.position.set(0, 0.3, 0);
  body.add(pelvis);
  // 腿：大腿被裙子盖着，小腿、白袜子、黑布鞋
  const legs = [];
  for (const s of [-1, 1]) {
    const knee = new THREE.Vector3(s * 0.086, 0.41, 0.3);
    const ankle = new THREE.Vector3(s * 0.08, 0.08, 0.37);
    const shin = new Limb(skin, 0.038, 0.031, { radial: 12 });
    shin.set(knee, ankle);
    const sk = new Limb(sock, 0.035, 0.033, { radial: 12 });
    sk.set(ankle, ankle.clone().lerp(knee, 0.22));
    body.add(shin.group, sk.group);
    const foot = new THREE.Group();
    foot.position.set(s * 0.082, 0, 0.415);
    foot.rotation.y = s * 0.12;
    const up = ellipsoid(shoe, 0.038, 0.034, 0.085);
    up.position.y = 0.036;
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.014, 0.17), sole);
    so.position.y = 0.007;
    foot.add(up, so);
    body.add(foot);
    legs.push(knee);
  }
  // 裙子：一整片盖住两条大腿（扁的筒），从膝盖往下垂一截；后面围着屁股垂到凳面
  const lap = new Limb(dress, 0.15, 0.152, { radial: 24, sz: 0.46, caps: false });
  lap.set(new THREE.Vector3(0, 0.31, -0.02), new THREE.Vector3(0, 0.415, 0.31));
  const front = new Limb(dress, 0.152, 0.2, { radial: 24, sz: 0.5, caps: false });
  front.set(new THREE.Vector3(0, 0.415, 0.31), new THREE.Vector3(0, 0.2, 0.38));
  const back = new Limb(dress, 0.092, 0.16, { radial: 24, sz: 0.85, caps: false }); // 上口收进上身里
  back.set(new THREE.Vector3(0, 0.36, 0.0), new THREE.Vector3(0, 0.215, -0.03));
  body.add(lap.group, front.group, back.group);
  // 膝盖上面裙子鼓起来的一点
  for (const k of legs) {
    const kn = ellipsoid(dressSmall, 0.062, 0.05, 0.06);
    kn.position.copy(k).add(new THREE.Vector3(0, 0.01, 0));
    body.add(kn);
  }

  // —— 上身：往前探着 ——
  const torso = new THREE.Group();
  torso.position.set(0, 0.32, 0);
  torso.rotation.x = 0.32;
  body.add(torso);
  const prof = [[0.098, 0], [0.093, 0.08], [0.105, 0.18], [0.112, 0.26], [0.108, 0.31], [0.08, 0.35], [0.045, 0.365], [0, 0.37]].map(([a, b]) => new THREE.Vector2(a, b));
  const chest = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), dress);
  chest.scale.z = 0.72;
  chest.castShadow = true;
  torso.add(chest);
  // 小圆领
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 1 }));
  collar.position.y = 0.36;
  collar.scale.z = 0.85;
  torso.add(collar);
  const neck = new Limb(skin, 0.031, 0.03, { radial: 12 });
  neck.set(new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(0, 0.41, 0.008));
  torso.add(neck.group);
  // 泡泡袖
  const shoulders = [-1, 1].map((s) => new THREE.Vector3(s * 0.112, 0.315, 0));
  for (const sh of shoulders) {
    const puff = ellipsoid(dressSmall, 0.05, 0.048, 0.046);
    puff.position.copy(sh).add(new THREE.Vector3(Math.sign(sh.x) * 0.012, -0.01, 0));
    torso.add(puff);
  }

  // —— 头 ——
  const head = new THREE.Group();
  head.position.set(0, 0.49, 0.016);
  head.rotation.x = 0.28; // 低头看着灶膛
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ map: faceTex(), roughness: 0.65 }));
  skull.scale.set(0.077, 0.1, 0.088);
  skull.castShadow = true;
  head.add(skull);
  const nose = ellipsoid(skin, 0.011, 0.015, 0.012, 12);
  nose.position.set(0, -0.012, 0.085);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = ellipsoid(skin, 0.008, 0.018, 0.013, 10);
    ear.position.set(s * 0.078, -0.016, 0.004);
    head.add(ear);
  }
  const hair = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ map: hairTex(), alphaTest: 0.5, roughness: 0.55 }));
  hair.scale.set(0.081, 0.104, 0.093);
  hair.position.set(0, 0.004, -0.003);
  head.add(hair);
  // 扎辫子的地方（后脑勺偏上）
  const tieAt = new THREE.Object3D();
  tieAt.position.set(0, 0.045, -0.09);
  head.add(tieAt);

  // —— 马尾辫：一串由粗到细的段，从扎头绳的地方往后、往下垂 ——
  const tail = [0.03, 0.035, 0.033, 0.027, 0.018, 0.006];
  const tailSegs = [];
  for (let i = 0; i < tail.length - 1; i++) {
    const seg = new Limb(hairMat, tail[i], tail[i + 1], { radial: 10 });
    body.add(seg.group);
    tailSegs.push(seg);
  }
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.009, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc0242c, roughness: 0.6 }));
  body.add(tie);

  // —— 胳膊（在 body 坐标里按 IK 摆） ——
  const arm = () => {
    const up = new Limb(skin, 0.034, 0.03, { radial: 12 });
    const fo = new Limb(skin, 0.029, 0.024, { radial: 12 });
    const hand = ellipsoid(skin, 0.027, 0.016, 0.037, 12);
    body.add(up.group, fo.group, hand);
    return { up, fo, hand };
  };
  const armR = arm();
  const armL = arm();
  const UA = 0.19;
  const FA = 0.17;

  // 手里那根柴（伸进灶膛，头上烧红）
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 1 });
  const stick = new Limb(stickMat, 0.013, 0.011, { radial: 7, caps: false });
  body.add(stick.group);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  tip.scale.set(1, 1, 2.2);
  body.add(tip);
  // 右手边地上几根柴
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5e40, roughness: 1 });
    for (const [x, z, ry, len] of [[-0.24, 0.18, 0.15, 0.55], [-0.27, 0.24, -0.1, 0.5], [-0.22, 0.3, 0.3, 0.45], [-0.3, 0.14, 0.05, 0.6]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, len, 7).rotateX(Math.PI / 2), wood);
      m.position.set(x, 0.017, z);
      m.rotation.y = ry;
      m.castShadow = true;
      body.add(m);
    }
  }

  // 碰撞：人连板凳一块
  const blocker = box(-0.17, 0.17, 0, 0.95, -0.17, 0.45, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false });
  blocker.userData.solid = true;
  root.add(blocker);

  // 柴伸进灶膛的那头（body 坐标）：灶膛口在她前面 0.58 m
  const FIRE = new THREE.Vector3(0.06, 0.22, 0.8);
  const tmp = new THREE.Vector3();
  const sh = new THREE.Vector3();
  const tailPts = Array.from({ length: tail.length }, () => new THREE.Vector3());

  function place(t) {
    // 呼吸
    const br = Math.sin(t * 1.6) * 0.006;
    torso.rotation.x = 0.32 + br;
    // 每 5 秒往里捅一下柴（0.9 秒）
    const ph = (t % 5) / 0.9;
    const poke = ph < 1 ? Math.sin(ph * Math.PI) * 0.07 : 0;
    head.rotation.x = 0.28 + Math.sin(t * 0.4) * 0.03;
    head.rotation.y = Math.sin(t * 0.27) * 0.08;
    torso.updateMatrixWorld(true);
    body.updateMatrixWorld(true);
    const toBody = (obj, v) => body.worldToLocal(obj.localToWorld(v));

    // 右手握柴：柴从手往灶膛里伸
    const hold = new THREE.Vector3(-0.05, 0.43, 0.38);
    const dir = tmp.subVectors(FIRE, hold).normalize();
    hold.addScaledVector(dir, poke);
    const end = FIRE.clone().addScaledVector(dir, poke);
    stick.set(hold.clone().addScaledVector(dir, -0.07), end);
    tip.position.copy(end);
    tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

    const setArm = (a, shoulderLocal, target, pole) => {
      sh.copy(shoulderLocal);
      toBody(torso, sh);
      const { elbow, end: w } = solveTwoBone(sh, target, UA, FA, pole);
      a.up.set(sh, elbow);
      a.fo.set(elbow, w);
      a.hand.position.copy(w);
      a.hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmp.subVectors(w, elbow).normalize());
    };
    setArm(armR, shoulders[0].clone(), hold.clone().add(new THREE.Vector3(0, 0.012, -0.02)), new THREE.Vector3(-1, -0.6, -0.2));
    setArm(armL, shoulders[1].clone(), legs[1].clone().add(new THREE.Vector3(0.005, 0.07, -0.03)), new THREE.Vector3(1, -0.3, -0.4));

    // 马尾辫：从扎头绳处往后伸一点，然后往下垂，轻轻晃
    const p0 = toBody(tieAt, new THREE.Vector3());
    const sway = Math.sin(t * 1.3) * 0.01;
    tailPts[0].copy(p0);
    for (let i = 1; i < tail.length; i++) {
      const k = i / (tail.length - 1);
      // 先往后翘出去一点，再顺着后背垂下来
      tailPts[i].set(p0.x + sway * k * k + 0.003 * i, p0.y + 0.01 - 0.05 * i * (0.3 + k), p0.z - 0.035 - 0.03 * Math.sin(k * Math.PI) - 0.012 * i);
    }
    for (let i = 0; i < tailSegs.length; i++) tailSegs[i].set(tailPts[i], tailPts[i + 1]);
    tie.position.copy(p0);
    tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmp.subVectors(tailPts[1], p0).normalize());
  }
  place(0);

  return {
    object: root,
    update(dt, t) {
      place(t);
    },
  };
}
