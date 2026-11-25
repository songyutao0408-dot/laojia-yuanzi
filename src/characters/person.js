import * as THREE from 'three';
import { Limb, solveTwoBone, ellipsoid } from './rig.js';

/**
 * 通用的程序化人物（第 17 轮：母亲、两个男孩用）。不贴照片，脸是 canvas 手画的。
 * 身体坐标：原点在脚下地面，+z 朝前，+y 朝上；-x 是右手边。尺寸都按身高算（米）。
 * 每帧调 pose(P) 摆姿势：
 *   P.pelvis   胯中心（Vector3）
 *   P.pitch    上身往前探的角度（弧度），P.roll 往一边歪
 *   P.feet     [右, 左] 脚踝位置；P.knee 膝盖大致朝向（Vector3，可选，默认朝前上）
 *   P.hands    [右, 左] 手腕位置；P.elbow [右, 左] 胳膊肘大致朝向
 *   P.headPitch / P.headYaw  低头 / 转头
 * opts：
 *   height, child（小孩头大、腿短一点）, skin
 *   face: { brows, blush, lips, lines }    hair: 'short' | 'bob'，hairColor
 *   top: { map | color, sleeve: 'short' | 'rolled' }   bottom: { color, kind: 'pants' | 'shorts' }
 *   shoes: { color, sole }
 */
export function createPerson(opts) {
  const H = opts.height;
  const child = !!opts.child;
  const headH = H / (child ? 5.9 : 7.2);
  const ry = headH / 2;
  const leg = child ? 0.232 : 0.245;
  const D = {
    thigh: leg * H,
    shin: leg * H,
    ankle: 0.04 * H,
    torso: (child ? 0.29 : 0.28) * H,
    neck: (child ? 0.035 : 0.042) * H,
    shoulder: (child ? 0.098 : 0.104) * H,
    hip: (child ? 0.052 : 0.06) * H,
    ua: 0.18 * H,
    fa: 0.145 * H,
  };
  const body = new THREE.Group();
  body.name = opts.name || 'person';

  const skin = new THREE.MeshStandardMaterial({ color: opts.skin ?? 0xd9a27c, roughness: 0.65 });
  const topMat = new THREE.MeshStandardMaterial({ color: opts.top.color ?? 0xffffff, map: opts.top.map ?? null, roughness: 0.92, side: THREE.DoubleSide });
  const botMat = new THREE.MeshStandardMaterial({ color: opts.bottom.color, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: opts.shoes?.color ?? 0x1c1a1a, roughness: 0.85 });
  const soleMat = new THREE.MeshStandardMaterial({ color: opts.shoes?.sole ?? 0xd8d2c4, roughness: 1 });

  // —— 腿：大腿、小腿（裤子 / 短裤露出的腿）、鞋 ——
  const shorts = opts.bottom.kind === 'shorts';
  const legs = [-1, 1].map(() => {
    const thigh = new Limb(botMat, (shorts ? 0.056 : 0.046) * H, (shorts ? 0.046 : 0.037) * H, { radial: 14 });
    const thighSkin = shorts ? new Limb(skin, 0.036 * H, 0.032 * H, { radial: 12 }) : null;
    const shin = new Limb(shorts ? skin : botMat, (shorts ? 0.03 : 0.036) * H, (shorts ? 0.022 : 0.03) * H, { radial: 12 });
    const foot = new THREE.Group();
    const up = ellipsoid(shoeMat, 0.03 * H, 0.026 * H, 0.068 * H);
    up.position.set(0, 0.026 * H, 0.025 * H);
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.058 * H, 0.009 * H, 0.15 * H), soleMat);
    so.position.set(0, 0.0045 * H, 0.025 * H);
    so.castShadow = true;
    foot.add(up, so);
    body.add(thigh.group, shin.group, foot);
    if (thighSkin) body.add(thighSkin.group);
    return { thigh, thighSkin, shin, foot };
  });
  const pelvis = ellipsoid(botMat, D.hip * 1.75, 0.055 * H, D.hip * 1.55);
  body.add(pelvis);

  // —— 上身 ——
  const torso = new THREE.Group();
  body.add(torso);
  const S = D.shoulder;
  const T = D.torso;
  const prof = [
    [0.62, -0.02], [0.6, 0.12], [0.55, 0.32], [0.6, 0.52], [0.68, 0.72], [0.7, 0.86], [0.55, 0.96], [0.3, 1.0], [0, 1.01],
  ].map(([r, y]) => new THREE.Vector2(r * S * 1.08, y * T));
  const chest = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), topMat);
  chest.scale.z = 0.66;
  chest.castShadow = true;
  torso.add(chest);
  // 衣服下摆盖住胯
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.67, S * 0.72, 0.07 * H, 24, 1, true), topMat);
  hem.scale.z = 0.7;
  hem.position.y = -0.02 * H;
  torso.add(hem);
  const shoulderPts = [-1, 1].map((s) => new THREE.Vector3(s * S, T * 0.93, 0));
  for (const p of shoulderPts) {
    const cap = ellipsoid(topMat, 0.034 * H, 0.03 * H, 0.032 * H);
    cap.position.copy(p).add(new THREE.Vector3(0, -0.004 * H, 0));
    torso.add(cap);
  }
  const neck = new Limb(skin, 0.022 * H, 0.021 * H, { radial: 12 });
  neck.set(new THREE.Vector3(0, T * 0.94, 0), new THREE.Vector3(0, T + D.neck, 0.004 * H));
  torso.add(neck.group);
  // 领口
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.026 * H, 0.0055 * H, 6, 20).rotateX(Math.PI / 2), topMat);
  collar.position.y = T * 0.985;
  collar.scale.z = 0.85;
  torso.add(collar);

  // —— 头 ——
  const head = new THREE.Group();
  head.position.set(0, T + D.neck + ry * 0.88, 0.008 * H);
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ map: faceTex(opts), roughness: 0.65 }));
  skull.scale.set(ry * 0.78, ry, ry * 0.88);
  skull.castShadow = true;
  head.add(skull);
  const nose = ellipsoid(skin, ry * 0.11, ry * 0.15, ry * 0.12, 12);
  nose.position.set(0, -ry * 0.12, ry * 0.86);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = ellipsoid(skin, ry * 0.08, ry * 0.18, ry * 0.12, 10);
    ear.position.set(s * ry * 0.79, -ry * 0.1, 0.0);
    head.add(ear);
  }
  const hairColor = opts.hairColor ?? 0x15110e;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ map: hairTex(opts.hair, hairColor), alphaTest: 0.5, roughness: 0.6 }));
  const puff = opts.hair === 'short' ? 1.07 : 1.05;
  hair.scale.set(ry * 0.78 * puff, ry * puff, ry * 0.88 * puff);
  hair.position.set(0, ry * 0.04, -ry * 0.03);
  head.add(hair);
  if (opts.hair === 'bob') {
    // 齐耳短发：从耳朵上面垂到下巴，下沿剪得齐齐的，前面把脸露出来
    const pr = [[0.86, 0.32], [0.9, 0.05], [0.9, -0.3], [0.88, -0.52], [0.8, -0.6]].map(([r, y]) => new THREE.Vector2(r * ry, y * ry));
    const bob = new THREE.Mesh(
      new THREE.LatheGeometry(pr, 28, 1.05, Math.PI * 2 - 2.1),
      new THREE.MeshStandardMaterial({ map: strandTex(hairColor), roughness: 0.6, side: THREE.DoubleSide }),
    );
    bob.scale.set(1.0, 1, 1.08);
    bob.position.set(0, 0, -ry * 0.03);
    bob.castShadow = true;
    head.add(bob);
  }

  // —— 胳膊：袖子 + 露出来的胳膊 + 手 ——
  const rolled = opts.top.sleeve === 'rolled';
  const arms = [-1, 1].map(() => {
    const sleeve = new Limb(topMat, 0.03 * H, 0.027 * H, { radial: 12 });
    const up = new Limb(skin, 0.022 * H, 0.019 * H, { radial: 12 });
    const fo = new Limb(rolled ? skin : skin, 0.019 * H, 0.016 * H, { radial: 12 });
    const roll = rolled ? new Limb(topMat, 0.026 * H, 0.026 * H, { radial: 12 }) : null;
    const hand = ellipsoid(skin, 0.018 * H, 0.011 * H, 0.03 * H, 12);
    body.add(sleeve.group, up.group, fo.group, hand);
    if (roll) body.add(roll.group);
    return { sleeve, up, fo, roll, hand };
  });

  const tmp = new THREE.Vector3();
  const sh = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  const kneeDefault = new THREE.Vector3(0, 0.4, 1);

  function pose(P) {
    pelvis.position.copy(P.pelvis);
    torso.position.copy(P.pelvis);
    torso.rotation.set(P.pitch ?? 0, P.yaw ?? 0, P.roll ?? 0);
    head.rotation.set(P.headPitch ?? 0, P.headYaw ?? 0, 0);
    body.updateMatrixWorld(true);
    // 腿
    legs.forEach((L, i) => {
      const s = i === 0 ? -1 : 1;
      const hip = P.pelvis.clone().add(new THREE.Vector3(s * D.hip, -0.01 * H, 0));
      const ank = P.feet[i];
      const pole = (P.knee && P.knee[i]) || kneeDefault;
      const { elbow: knee, end } = solveTwoBone(hip, ank, D.thigh, D.shin, pole);
      if (L.thighSkin) {
        const mid = hip.clone().lerp(knee, 0.62);
        L.thigh.set(hip, mid);
        L.thighSkin.set(mid, knee);
      } else L.thigh.set(hip, knee);
      L.shin.set(knee, end);
      L.foot.position.set(end.x, end.y - D.ankle, end.z);
      L.foot.rotation.y = (P.footYaw ?? 0.1) * s;
    });
    // 胳膊
    arms.forEach((A, i) => {
      sh.copy(shoulderPts[i]);
      body.worldToLocal(torso.localToWorld(sh));
      const pole = (P.elbow && P.elbow[i]) || new THREE.Vector3(i === 0 ? -1 : 1, -0.5, -0.3);
      const { elbow, end } = solveTwoBone(sh, P.hands[i], D.ua, D.fa, pole);
      const sleeveEnd = sh.clone().lerp(elbow, 0.45);
      A.sleeve.set(sh, sleeveEnd);
      A.up.set(sleeveEnd, elbow);
      A.fo.set(elbow, end);
      if (A.roll) A.roll.set(elbow.clone().lerp(sh, 0.12), elbow.clone().lerp(end, 0.05));
      A.hand.position.copy(end).addScaledVector(tmp.subVectors(end, elbow).normalize(), 0.02 * H);
      A.hand.quaternion.setFromUnitVectors(Z, tmp);
    });
  }

  return { body, head, torso, dims: D, pose, shoulder: (i) => body.worldToLocal(torso.localToWorld(shoulderPts[i].clone())) };
}

/* ---------- 贴图 ---------- */
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function toTex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

/** 脸：球面 UV，正脸在 u = 0.25（画布 x = 128），赤道 y = 128 是眼睛的高度 */
function faceTex(opts) {
  const F = opts.face || {};
  const [c, g] = canvas(512, 256);
  const skinHex = hex(opts.skin ?? 0xd9a27c);
  g.fillStyle = skinHex;
  g.fillRect(0, 0, 512, 256);
  const blob = (x, y, rad, rgb, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${rgb},${a})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  // 晒出来的深浅：额头、脸颊
  blob(128, 150, 60, '150,90,60', 0.12);
  if (F.blush) for (const s of [-1, 1]) blob(128 + s * 34, 150, 22, '206,110,92', F.blush);
  // 眼窝一点暗
  for (const s of [-1, 1]) blob(128 + s * 25, 126, 16, '120,70,50', 0.18);
  for (const s of [-1, 1]) {
    const x = 128 + s * 25;
    const y = 128;
    const ew = F.eyeW ?? 10;
    g.fillStyle = '#eee6dc';
    g.beginPath();
    g.ellipse(x, y, ew, 3.6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a1a12';
    g.beginPath();
    g.arc(x - s, y + 0.4, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0a0606';
    g.beginPath();
    g.arc(x - s, y + 0.4, 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(x - s - 2, y - 2, 1.4, 1.4);
    g.strokeStyle = '#2a1810';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y + 1, ew + 1, 4.6, 0, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    // 眉毛
    g.strokeStyle = 'rgba(40,26,18,0.85)';
    g.lineWidth = F.brows ?? 2.4;
    g.beginPath();
    g.moveTo(x - s * 11, y - 13);
    g.quadraticCurveTo(x, y - 17, x + s * 12, y - 12);
    g.stroke();
    if (F.lines) {
      // 眼角细纹、法令纹（四十来岁）
      g.strokeStyle = 'rgba(110,64,44,0.35)';
      g.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        g.beginPath();
        g.moveTo(x + s * (ew + 2), y + k * 3);
        g.lineTo(x + s * (ew + 8), y - 2 + k * 5);
        g.stroke();
      }
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(128 + s * 12, 150);
      g.quadraticCurveTo(128 + s * 20, 162, 128 + s * 17, 172);
      g.stroke();
    }
  }
  blob(128, 152, 7, '140,84,64', 0.35); // 鼻子底下
  g.fillStyle = F.lips ?? '#b4605a';
  g.beginPath();
  g.ellipse(128, 168, 9, 2.4, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(100,40,34,0.7)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(119, 168);
  g.quadraticCurveTo(128, 170, 137, 168);
  g.stroke();
  return toTex(c);
}

/** 头发帽子（同样的球面 UV）：short = 男孩的短头发（前面一点短刘海）；bob = 齐耳短发的顶（刘海齐眉） */
function hairTex(style, color) {
  const [c, g] = canvas(512, 256);
  let s = style === 'bob' ? 211 : 223;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const bottom = (x) => {
    let d = Math.abs(x - 128);
    if (d > 256) d = 512 - d;
    if (style === 'short') {
      if (d < 46) return 92 + Math.sin(x * 1.3) * 3 + r() * 4; // 短刘海
      if (d < 72) return 92 + ((d - 46) / 26) * 34; // 鬓角
      if (d < 128) return 126 + ((d - 72) / 56) * 12;
      return 138 + ((d - 128) / 128) * 34; // 后脑勺推得短
    }
    if (d < 46) return 102 + Math.sin(x * 0.8) * 2 + r() * 2.5; // 齐眉刘海
    if (d < 70) return 102 + ((d - 46) / 24) * 22;
    return 124;
  };
  const col = hex(color);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, 0);
  for (let x = 0; x <= 512; x += 2) g.lineTo(x, bottom(x));
  g.lineTo(512, 0);
  g.closePath();
  g.fill();
  g.save();
  g.clip();
  // 发丝：从头顶旋往外
  for (let i = 0; i < 600; i++) {
    const x = r() * 512;
    const y = bottom(x) - r() * 8;
    g.strokeStyle = r() > 0.5 ? 'rgba(90,70,56,0.3)' : 'rgba(0,0,0,0.3)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + (r() - 0.5) * 20, y / 2, 384 + (x - 384) * 0.2, 12);
    g.stroke();
  }
  const gr = g.createLinearGradient(0, 24, 0, 70);
  gr.addColorStop(0, 'rgba(130,110,96,0)');
  gr.addColorStop(0.5, 'rgba(130,110,96,0.22)');
  gr.addColorStop(1, 'rgba(130,110,96,0)');
  g.fillStyle = gr;
  g.fillRect(0, 24, 512, 46);
  g.restore();
  return toTex(c);
}

/** 垂下来的头发：一道道竖丝 */
function strandTex(color) {
  const [c, g] = canvas(256, 128);
  let s = 229;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = hex(color);
  g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 400; i++) {
    g.strokeStyle = r() > 0.5 ? 'rgba(90,72,58,0.35)' : 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    const x = r() * 256;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (r() - 0.5) * 6, 128);
    g.stroke();
  }
  return toTex(c);
}

/** 衣服花样：check 小格子、stripe 横条（海魂衫）、print 小碎花 */
export function clothTex(kind, base, accent, repeat = [6, 3]) {
  const [c, g] = canvas(128, 128);
  let s = 241;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  if (kind === 'check') {
    g.fillStyle = accent;
    for (let i = 0; i < 128; i += 16) {
      g.globalAlpha = 0.45;
      g.fillRect(i, 0, 6, 128);
      g.fillRect(0, i, 128, 6);
    }
    g.globalAlpha = 1;
  } else if (kind === 'stripe') {
    g.fillStyle = accent;
    for (let y = 0; y < 128; y += 16) g.fillRect(0, y, 128, 7);
  } else if (kind === 'print') {
    for (let i = 0; i < 40; i++) {
      const x = r() * 128;
      const y = r() * 128;
      g.fillStyle = accent;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5, 1.8, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  for (let i = 0; i < 300; i++) {
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(r() * 128, r() * 128, 1, 1);
  }
  return toTex(c, repeat);
}
