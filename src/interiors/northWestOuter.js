import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WEST_ROOM as R } from '../layout.js';
import { box } from '../core/box.js';
import { canvasTex, rng, reedMat, pillowTex, quiltStack, woodTex, seamlessBlob } from './common.js';

/**
 * 西北屋外屋的陈设（第 11 轮，按用户描述和照片）。坐标同 northWest.js：室内原点在西北角、地坪面，+x 东、+z 南。
 * - 西边一铺大木头炕，南北通长；炕沿朝外这一面摆着一排枕头，靠西墙摞着棉被
 * - 进门正对着、靠北墙一张老式电视桌，上面一台黑白电视（拉杆天线），电视左边一座带摆锤的老座钟（指针走的是现在的时间）
 * - 靠南墙一张折叠圆桌：深色桌面、斑驳，铁管腿生了锈
 * - 进门右手边（隔墙这边）一个洗脸盆架，上面一只搪瓷洋盆，架子上搭着毛巾
 * - 隔墙边、里屋门洞往北一点一台脚踏缝纫机
 */
const OX1 = R.partition.x - R.partition.thickness / 2; // 外屋东墙面（隔墙西面）
const SOUTH = R.size.d;
const O = R.outer;

/* ---------- 贴图 ---------- */
/** 黑白电视的正面：灰色金属框、圆角的灰绿屏幕、右边一条控制面板（红指示灯、四个小按钮、两个大旋钮、喇叭格栅） */
function tvFaceTex() {
  return canvasTex(512, 400, (g, w, h) => {
    const lin = g.createLinearGradient(0, 0, 0, h);
    lin.addColorStop(0, '#8a8c8e');
    lin.addColorStop(1, '#5e6062');
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    // 屏幕外圈的黑框
    const rr = (x, y, ww, hh, rad) => {
      g.beginPath();
      g.moveTo(x + rad, y);
      g.arcTo(x + ww, y, x + ww, y + hh, rad);
      g.arcTo(x + ww, y + hh, x, y + hh, rad);
      g.arcTo(x, y + hh, x, y, rad);
      g.arcTo(x, y, x + ww, y, rad);
      g.closePath();
    };
    g.fillStyle = '#1c1d1e';
    rr(24, 22, 352, 356, 40);
    g.fill();
    // 屏幕：灰绿，四周暗，左上一块窗户的反光
    const sg = g.createRadialGradient(200, 190, 20, 200, 200, 230);
    sg.addColorStop(0, '#9fb0aa');
    sg.addColorStop(0.7, '#7d8e8a');
    sg.addColorStop(1, '#3e4846');
    g.fillStyle = sg;
    rr(40, 38, 320, 324, 50);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(150, 90, 18, 40);
    g.fillRect(172, 90, 18, 40);
    // 右边控制面板
    g.fillStyle = '#6c6e70';
    g.fillRect(392, 22, 100, 356);
    g.fillStyle = '#c03028';
    g.fillRect(402, 34, 22, 12); // 指示灯
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#2a2a2a';
      g.beginPath();
      g.arc(413, 72 + i * 30, 8, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#4a4c4e';
    g.fillRect(434, 40, 52, 170); // 旋钮底座
    g.fillStyle = '#9a9c9e';
    g.fillRect(400, 214, 86, 24); // 刻度窗
    g.fillStyle = '#3a3c3e';
    for (let x = 404; x < 482; x += 6) g.fillRect(x, 218, 2, 16);
    // 喇叭格栅
    g.fillStyle = '#4a4c4e';
    g.fillRect(400, 250, 86, 120);
    g.fillStyle = '#8a8c8e';
    for (let y = 256; y < 366; y += 7) g.fillRect(404, y, 78, 3);
    // 金属框上的拉丝和划痕
    const r = rng(91);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      g.fillRect(r() * w, r() * h, 1 + r() * 20, 1);
    }
  });
}

/** 座钟的钟面：白底、黑色阿拉伯数字、分钟刻度，铜圈 */
function clockFaceTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = '#b08a48';
    g.beginPath();
    g.arc(c, c, 127, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2ecdc';
    g.beginPath();
    g.arc(c, c, 112, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2a2420';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const l = i % 5 ? 6 : 12;
      g.lineWidth = i % 5 ? 1.5 : 3;
      g.beginPath();
      g.moveTo(c + Math.sin(a) * 104, c - Math.cos(a) * 104);
      g.lineTo(c + Math.sin(a) * (104 - l), c - Math.cos(a) * (104 - l));
      g.stroke();
    }
    g.fillStyle = '#2a2420';
    g.font = 'bold 24px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillText(String(i), c + Math.sin(a) * 80, c - Math.cos(a) * 80);
    }
    // 发黄
    const yel = g.createRadialGradient(c, c, 30, c, c, 115);
    yel.addColorStop(0, 'rgba(200,170,110,0)');
    yel.addColorStop(1, 'rgba(200,170,110,0.25)');
    g.fillStyle = yel;
    g.beginPath();
    g.arc(c, c, 112, 0, Math.PI * 2);
    g.fill();
  });
}

/** 圆桌桌面：深褐色，漆磨掉了好多块，烫痕、碗底的白圈、刀划的道道 */
function tableTopTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(97);
    g.fillStyle = '#5c3a24';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 40, r() > 0.6 ? '168,118,72' : '36,20,10', 0.25 + r() * 0.3);
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = `rgba(220,200,170,${0.15 + r() * 0.2})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(40 + r() * 176, 40 + r() * 176, 14 + r() * 10, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? '170,130,90' : '20,10,4'},0.3)`;
      g.lineWidth = 1;
      const x = r() * w;
      const y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 50);
      g.stroke();
    }
  });
}

/** 搪瓷洋盆盆底：白瓷底上一朵大红牡丹、两片绿叶 */
function basinBottomTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, w, h);
    const c = w / 2;
    g.fillStyle = '#3f8a4a';
    for (const a of [0.6, 2.4, 4.2]) {
      g.beginPath();
      g.ellipse(c + Math.cos(a) * 58, c + Math.sin(a) * 58, 40, 16, a, 0, Math.PI * 2);
      g.fill();
    }
    for (let ring = 3; ring >= 1; ring--) {
      g.fillStyle = ring % 2 ? '#d02a3a' : '#f06a7a';
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + ring;
        g.beginPath();
        g.arc(c + Math.cos(a) * ring * 14, c + Math.sin(a) * ring * 14, ring * 13, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = '#f2d36a';
    g.beginPath();
    g.arc(c, c, 10, 0, Math.PI * 2);
    g.fill();
  });
}

/** 缝纫机机头：黑漆上描金色的花纹 */
function machineTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#141414';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8a050';
    g.lineWidth = 2;
    const r = rng(103);
    for (let i = 0; i < 8; i++) {
      const x = 20 + i * 28;
      g.beginPath();
      g.moveTo(x, h / 2);
      g.bezierCurveTo(x + 6, h / 2 - 20, x + 18, h / 2 - 20, x + 24, h / 2);
      g.bezierCurveTo(x + 18, h / 2 + 20, x + 6, h / 2 + 20, x, h / 2);
      g.stroke();
    }
    g.strokeRect(6, 10, w - 12, h - 20);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
      g.fillRect(r() * w, r() * h, 2, 1);
    }
  });
}

/** 毛巾：白底两道蓝条，搭在架子上 */
function towelTex() {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ece8de';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a6ea8';
    g.fillRect(0, 14, w, 6);
    g.fillRect(0, h - 20, w, 6);
  });
}

/* ---------- 小工具 ---------- */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/** a、b 之间一根圆管 */
function tube(group, a, b, r, material, radial = 8) {
  const v = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), radial), material);
  m.position.copy(a).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}
const blocker = (x0, x1, y0, y1, z0, z1) => box(x0, x1, y0, y1, z0, z1, new THREE.MeshBasicMaterial({ visible: false }));

export function createOuterRoom({ tc }) {
  const group = new THREE.Group();
  group.name = 'outer-room';
  const off = { solid: false };
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.55, metalness: 0.5 });

  // —— 西边的大木头炕（南北通长）——
  {
    const K = O.kang;
    const x0 = tc;
    const x1 = tc + K.width;
    const z0 = tc;
    const z1 = SOUTH - tc;
    const front = new THREE.MeshStandardMaterial({ map: woodTex([104, 64, 36], { seed: 5, planks: 0.18 }), roughness: 0.6 });
    group.add(box(x0, x1, 0, K.height - 0.04, z0, z1, front)); // 炕身（挡人）
    // 炕面：木板上铺炕席
    group.add(box(x0, x1 + 0.02, K.height - 0.04, K.height - 0.005, z0, z1, new THREE.MeshStandardMaterial({ map: woodTex([120, 78, 44], { seed: 6, planks: 0.25, along: 'u' }), roughness: 0.6 }), off));
    const mt = new THREE.Mesh(new THREE.BoxGeometry(K.width - 0.06, 0.006, z1 - z0 - 0.06), new THREE.MeshStandardMaterial({ map: reedMat(), roughness: 0.85 }));
    mt.position.set((x0 + x1) / 2 - 0.02, K.height - 0.002, (z0 + z1) / 2);
    mt.receiveShadow = true;
    group.add(mt);
    // 炕沿：磨得发亮的一根木头
    group.add(box(x1 - 0.08, x1 + 0.03, K.height - 0.08, K.height + 0.015, z0, z1, new THREE.MeshStandardMaterial({ color: 0x4e3220, roughness: 0.4 }), off));
    // 朝外这一面（炕沿这边）摆着一排枕头
    const pt = new THREE.MeshStandardMaterial({ map: pillowTex(), roughness: 0.8 });
    for (const z of [0.75, 1.55, 2.35, 3.15]) {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.1, 0.32, 3, 0.045), pt);
      p.rotation.y = Math.PI / 2;
      p.position.set(x1 - 0.3, K.height + 0.05, z);
      p.castShadow = p.receiveShadow = true;
      group.add(p);
    }
    // 棉被：靠西墙摞着
    const st = quiltStack(RoundedBoxGeometry, { count: 5, w: 1.2, d: 0.55, offset: 2 });
    st.group.rotation.y = Math.PI / 2; // 长边顺着西墙
    st.group.position.set(x0 + 0.33, K.height, 1.6);
    group.add(st.group);
  }

  // —— 进门正对着、靠北墙的电视桌 ——
  const clockParts = {};
  {
    const D = O.tvDesk;
    const x0 = D.x - D.w / 2;
    const x1 = D.x + D.w / 2;
    const z0 = tc;
    const z1 = tc + D.d;
    const wood = new THREE.MeshStandardMaterial({ map: woodTex([190, 140, 76], { seed: 9 }), roughness: 0.45 });
    const woodD = new THREE.MeshStandardMaterial({ map: woodTex([150, 104, 54], { seed: 10 }), roughness: 0.5 });
    group.add(box(x0 + 0.02, x1 - 0.02, 0, 0.07, z0 + 0.02, z1 - 0.04, woodD, off)); // 底座
    group.add(box(x0 + 0.01, x1 - 0.01, 0.07, D.h - 0.03, z0, z1 - 0.02, wood)); // 柜体（挡人）
    group.add(box(x0 - 0.015, x1 + 0.015, D.h - 0.03, D.h, z0, z1 + 0.01, wood, off)); // 台面
    const cw = 0.4; // 两边柜门宽
    const fz = z1 - 0.02; // 正面
    const knob = new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.35, metalness: 0.8 });
    for (const [a0, a1, kx] of [[x0 + 0.02, x0 + cw, x0 + cw - 0.05], [x1 - cw, x1 - 0.02, x1 - cw + 0.05]]) {
      group.add(box(a0, a1, 0.1, D.h - 0.06, fz, fz + 0.015, wood, off)); // 柜门
      group.add(box(a0 + 0.05, a1 - 0.05, 0.16, D.h - 0.12, fz + 0.015, fz + 0.022, woodD, off)); // 芯板
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), knob);
      k.position.set(kx, D.h * 0.55, fz + 0.03);
      group.add(k);
    }
    // 中间：上面一格敞口、下面一个抽屉
    const m0 = x0 + cw;
    const m1 = x1 - cw;
    group.add(box(m0 + 0.01, m1 - 0.01, 0.36, D.h - 0.06, fz - 0.3, fz - 0.29, new THREE.MeshStandardMaterial({ color: 0x2e2418, roughness: 0.9 }), off)); // 敞口格的里面（暗）
    group.add(box(m0, m1, 0.34, 0.37, fz - 0.3, fz + 0.005, wood, off)); // 隔板
    group.add(box(m0 + 0.01, m1 - 0.01, 0.1, 0.33, fz, fz + 0.015, wood, off)); // 抽屉脸
    group.add(box(D.x - 0.06, D.x + 0.06, 0.2, 0.225, fz + 0.015, fz + 0.03, knob, off)); // 抽屉拉手
    // 敞口格里一摞旧报纸
    group.add(box(m0 + 0.06, m1 - 0.08, 0.37, 0.43, fz - 0.27, fz - 0.06, new THREE.MeshStandardMaterial({ color: 0xcfc6a8, roughness: 1 }), off));

    // 黑白电视（14 寸左右）：灰色金属壳，后面一个大屁股，顶上拉杆天线
    const tv = new THREE.Group();
    tv.position.set(D.x + 0.18, D.h, (z0 + z1) / 2 + 0.02);
    const shell = new THREE.MeshStandardMaterial({ color: 0x6e7072, roughness: 0.45, metalness: 0.4 });
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.1), [shell, shell, shell, shell, new THREE.MeshStandardMaterial({ map: tvFaceTex(), roughness: 0.35, metalness: 0.2 }), shell]);
    front.position.set(0, 0.21, 0.1);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.24), new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.7 }));
    back.position.set(0, 0.18, -0.07);
    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.012, 0.3), iron);
    feet.position.set(0, 0.006, 0.02);
    for (const m of [front, back]) m.castShadow = m.receiveShadow = true;
    tv.add(front, back, feet);
    // 两个大旋钮
    for (const y of [0.33, 0.25]) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.025, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4 }));
      k.position.set(0.21, y, 0.16);
      tv.add(k);
    }
    // 屏幕上一层亮面（玻璃的反光）
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.31), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.25 }));
    glass.position.set(-0.05, 0.21, 0.152);
    glass.userData.noAO = true;
    tv.add(glass);
    // 拉杆天线：一个小底座，两根拉杆叉开
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.02, 12), iron);
    base.position.set(0.12, 0.35, -0.04);
    tv.add(base);
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.2, metalness: 0.9 });
    tube(tv, V3(0.12, 0.36, -0.04), V3(-0.12, 0.72, -0.08), 0.003, chrome, 5);
    tube(tv, V3(0.12, 0.36, -0.04), V3(0.32, 0.7, -0.1), 0.003, chrome, 5);
    group.add(tv);

    // 电视左边一座老座钟：木壳、铜圈钟面、玻璃门里一个摆锤
    const clock = new THREE.Group();
    clock.position.set(D.x - 0.38, D.h, (z0 + z1) / 2);
    const walnut = new THREE.MeshStandardMaterial({ map: woodTex([84, 48, 26], { seed: 13 }), roughness: 0.4 });
    clock.add(box(-0.14, 0.14, 0, 0.03, -0.075, 0.075, walnut, off)); // 底座
    clock.add(box(-0.125, 0.125, 0.03, 0.42, -0.065, 0.065, walnut, off)); // 壳
    clock.add(box(-0.145, 0.145, 0.42, 0.45, -0.08, 0.08, walnut, off)); // 顶
    clock.add(box(-0.06, 0.06, 0.45, 0.49, -0.05, 0.05, walnut, off)); // 顶上的小帽
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.5 }));
    face.position.set(0, 0.32, 0.067);
    clock.add(face);
    const brass = new THREE.MeshStandardMaterial({ color: 0xc09850, roughness: 0.3, metalness: 0.85 });
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.006, 6, 32), brass);
    bezel.position.copy(face.position);
    clock.add(bezel);
    const hand = (len, wd) => {
      const pv = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.002).translate(0, len / 2 - 0.008, 0), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.5 }));
      pv.add(m);
      pv.position.set(0, 0.32, 0.07);
      clock.add(pv);
      return pv;
    };
    clockParts.hour = hand(0.045, 0.007);
    clockParts.minute = hand(0.068, 0.005);
    clockParts.second = hand(0.072, 0.0015);
    clockParts.second.position.z = 0.072;
    // 下半截：玻璃门里的摆锤
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.15), new THREE.MeshStandardMaterial({ color: 0x1e1612, roughness: 0.9 }));
    win.position.set(0, 0.135, 0.06);
    clock.add(win);
    const pend = new THREE.Group();
    pend.position.set(0, 0.21, 0.064);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.1, 0.002).translate(0, -0.05, 0), brass);
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 20).rotateX(Math.PI / 2), brass);
    bob.position.y = -0.105;
    pend.add(rod, bob);
    clock.add(pend);
    clockParts.pendulum = pend;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.12 }));
    pane.position.set(0, 0.135, 0.068);
    pane.userData.noAO = true;
    clock.add(pane);
    group.add(clock);
  }

  // —— 靠南墙的折叠圆桌：深色斑驳的桌面，铁管腿生锈 ——
  {
    const T = O.table;
    const tbl = new THREE.Group();
    tbl.position.set(T.x, 0, T.z);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.022, 40), [
      new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.5, metalness: 0.4 }), // 一圈包边
      new THREE.MeshStandardMaterial({ map: tableTopTex(), roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 }),
    ]);
    top.position.y = T.h - 0.011;
    top.castShadow = top.receiveShadow = true;
    tbl.add(top);
    const rust = new THREE.MeshStandardMaterial({ color: 0x7a4a34, roughness: 0.8, metalness: 0.3 });
    // 两个铁管框交叉支着（折叠桌）
    for (const s of [-1, 1]) {
      const a = V3(-0.22, T.h - 0.03, s * 0.18);
      const b = V3(0.22, T.h - 0.03, s * 0.18);
      tube(tbl, a, b, 0.011, rust);
      tube(tbl, a, V3(-0.26, 0, -s * 0.16), 0.011, rust);
      tube(tbl, b, V3(0.26, 0, -s * 0.16), 0.011, rust);
      tube(tbl, V3(-0.25, 0.16, -s * 0.12), V3(0.25, 0.16, -s * 0.12), 0.008, rust);
    }
    group.add(tbl);
    group.add(blocker(T.x - 0.3, T.x + 0.3, 0.2, T.h, T.z - 0.3, T.z + 0.3));
  }

  // —— 进门右手边的洗脸盆架 + 搪瓷洋盆 + 毛巾 ——
  {
    const W = O.washstand;
    const ws = new THREE.Group();
    ws.position.set(W.x, 0, W.z);
    const paint = new THREE.MeshStandardMaterial({ color: 0x6f9a86, roughness: 0.5, metalness: 0.3 });
    const ringY = 0.68;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.007, 6, 28).rotateX(Math.PI / 2), paint);
    ring.position.y = ringY;
    ws.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 24).rotateX(Math.PI / 2), paint);
    ring2.position.y = 0.26;
    ws.add(ring2);
    const legs = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => a + Math.PI / 2);
    for (const a of legs) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      tube(ws, V3(c * 0.16, ringY, s * 0.16), V3(c * 0.22, 0, s * 0.22), 0.008, paint);
    }
    // 靠墙那两根往上伸，顶上一根横杆搭毛巾
    const up = [V3(0.16, ringY, -0.1), V3(0.16, ringY, 0.1)];
    for (const p of up) tube(ws, p, V3(p.x + 0.02, 1.3, p.z), 0.008, paint);
    tube(ws, V3(0.18, 1.3, -0.12), V3(0.18, 1.3, 0.12), 0.008, paint);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.5, 1, 6), new THREE.MeshStandardMaterial({ map: towelTex(), side: THREE.DoubleSide, roughness: 1 }));
    // 对折搭在横杆上：前后两片
    towel.geometry.translate(0, -0.25, 0);
    const tp = towel.geometry.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(-tp.getY(i) * 3) * 0.01);
    for (const [dx, rot] of [[-0.012, 0], [0.012, Math.PI]]) {
      const t2 = towel.clone();
      t2.rotation.y = Math.PI / 2 + rot;
      t2.position.set(0.18 + dx, 1.3, 0);
      t2.castShadow = true;
      ws.add(t2);
    }
    // 搪瓷洋盆：白瓷、深蓝口沿，盆底一朵牡丹，盛着半盆水
    const prof = [[0.11, 0], [0.13, 0.01], [0.17, 0.09], [0.18, 0.1]].map(([r, y]) => new THREE.Vector2(r, y));
    const enamel = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.2, side: THREE.DoubleSide });
    const basin = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), enamel);
    basin.position.y = ringY - 0.02;
    basin.castShadow = true;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: basinBottomTex(), roughness: 0.2 }));
    bottom.position.y = ringY - 0.018;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.006, 6, 32).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1e3a6e, roughness: 0.3 }));
    rim.position.y = ringY + 0.08;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8aa0a0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }));
    water.position.y = ringY + 0.035;
    water.userData.noAO = true;
    ws.add(basin, bottom, rim, water);
    group.add(ws);
    group.add(blocker(W.x - 0.2, W.x + 0.2, 0.2, 0.8, W.z - 0.2, W.z + 0.2));
  }

  // —— 隔墙边的脚踏缝纫机（长边顺着隔墙，人坐在西边朝东踩）——
  {
    const S = O.sewing;
    const x1 = OX1 - tc - 0.01;
    const x0 = x1 - S.depth;
    const z0 = S.z - S.len / 2;
    const z1 = S.z + S.len / 2;
    const H = 0.76;
    const teak = new THREE.MeshStandardMaterial({ map: woodTex([170, 96, 44], { seed: 17, along: 'u' }), roughness: 0.4 });
    group.add(box(x0 - 0.01, x1 + 0.005, H - 0.025, H, z0, z1, teak, off)); // 台板
    // 台板下：北头一个抽屉、中间挡板
    group.add(box(x0 + 0.02, x1 - 0.02, H - 0.16, H - 0.025, z0 + 0.03, z0 + 0.26, teak, off));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 0.4 }));
    knob.position.set(x0 + 0.01, H - 0.09, z0 + 0.145);
    group.add(knob);
    group.add(box(x0 + 0.06, x1 - 0.04, H - 0.14, H - 0.025, z0 + 0.3, z1 - 0.06, teak, off));
    // 两头的铸铁架子
    for (const z of [z0 + 0.04, z1 - 0.04]) {
      group.add(box(x0 + 0.02, x0 + 0.05, 0.03, H - 0.03, z - 0.015, z + 0.015, iron, off));
      group.add(box(x1 - 0.05, x1 - 0.02, 0.03, H - 0.03, z - 0.015, z + 0.015, iron, off));
      group.add(box(x0, x1, 0, 0.04, z - 0.025, z + 0.025, iron, off)); // 脚
      group.add(box(x0 + 0.02, x1 - 0.02, H - 0.06, H - 0.03, z - 0.015, z + 0.015, iron, off));
      tube(group, V3(x0 + 0.04, 0.12, z), V3(x1 - 0.04, H - 0.08, z), 0.01, iron); // 斜撑
    }
    group.add(box(x1 - 0.05, x1 - 0.02, 0.2, 0.24, z0 + 0.04, z1 - 0.04, iron, off)); // 后面的拉杆
    // 脚踏板（斜着）
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.42), iron);
    pedal.position.set((x0 + x1) / 2, 0.11, S.z - 0.04);
    pedal.rotation.z = 0.18;
    pedal.castShadow = true;
    group.add(pedal);
    // 南头的大皮带轮
    const wheel = new THREE.Group();
    wheel.position.set((x0 + x1) / 2 + 0.03, 0.34, z1 - 0.1);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 32), iron)); // 轮子在竖直面上，和两头的铁架子平行
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      tube(wheel, V3(0, 0, 0), V3(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0), 0.006, iron);
    }
    group.add(wheel);
    // 机头：黑漆描金，臂顺着隔墙（北头是针、南头是手轮）
    const head = new THREE.Group();
    head.position.set((x0 + x1) / 2 - 0.02, H, S.z);
    const black = new THREE.MeshStandardMaterial({ map: machineTex(), roughness: 0.25, metalness: 0.3 });
    const blk = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.25, metalness: 0.3 });
    const add = (w, h, d, x, y, z, m = black) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      b.castShadow = b.receiveShadow = true;
      head.add(b);
      return b;
    };
    add(0.18, 0.045, 0.37, 0, 0.022, 0, blk); // 底板
    add(0.08, 0.19, 0.075, 0, 0.14, 0.13); // 立柱（南头）
    add(0.075, 0.07, 0.32, 0, 0.255, -0.01); // 横臂
    add(0.075, 0.12, 0.065, 0, 0.21, -0.17); // 机头（北头）
    const steel = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.25, metalness: 0.9 });
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), steel);
    needle.position.set(0, 0.1, -0.17);
    head.add(needle);
    const hw = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24).rotateX(Math.PI / 2), steel);
    hw.position.set(0, 0.22, 0.19);
    head.add(hw);
    // 线轴
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xb02a2a, roughness: 0.8 }));
    spool.position.set(0, 0.31, 0.05);
    head.add(spool);
    group.add(head);
    // 皮带：从大轮子上到手轮
    tube(group, V3(wheel.position.x, wheel.position.y + 0.15, wheel.position.z), V3(head.position.x, H + 0.22, S.z + 0.19), 0.003, new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 }), 4);
    group.add(blocker(x0, x1, 0.15, H, z0, z1));
  }

  const now = new Date();
  return {
    group,
    update(dt, t) {
      const { hour, minute, second, pendulum } = clockParts;
      now.setTime(Date.now());
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      // 钟面朝 +z：指针绕 z 轴转（顺时针为负）
      hour.rotation.z = -(h / 12) * Math.PI * 2;
      minute.rotation.z = -(m / 60) * Math.PI * 2;
      second.rotation.z = -(Math.floor(s) / 60) * Math.PI * 2;
      pendulum.rotation.z = Math.sin(t * Math.PI) * 0.12; // 一秒摆一下
    },
  };
}
