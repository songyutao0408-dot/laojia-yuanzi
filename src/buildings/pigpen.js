import * as THREE from 'three';
import { PIGPEN as P } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';
import { canvasTex, rng, seamlessBlob } from '../interiors/common.js';

/**
 * 猪圈（第 18 轮，用户要求）：菜地和茅厕之间。东面就是东土墙，南面接茅厕的北墙；
 * 西、北两面一米高的旧砖矮墙（砖顶上抹一道水泥），西墙上一扇木栅小门（关着）；
 * 东半边一个矮棚子：两根木柱、一根横梁，上面盖着灰色的波纹石棉瓦，往西（院子这边）低；
 * 西墙根一个长条石食槽，槽里剩着些泔水；地上是踩烂的黑泥、几滩水、散着麦秸。猪在 characters/pigs.js。
 */
export function createPigpen() {
  const g = new THREE.Group();
  g.name = 'pigpen';
  const { x0, x1, z0, z1 } = P.rect;
  const w = P.wall;
  const brick = mat('brickOld');
  const cement = mat('concrete');
  const off = { solid: false };

  // —— 矮砖墙：北墙整条；西墙中间留门 ——
  g.add(box(x0, x1, 0, P.wallH, z0, z0 + w, brick));
  g.add(box(x0 - 0.02, x1, P.wallH, P.wallH + 0.05, z0 - 0.02, z0 + w + 0.02, cement, off));
  const g0 = P.gate.z - P.gate.width / 2;
  const g1 = P.gate.z + P.gate.width / 2;
  for (const [a, b] of [[z0, g0], [g1, z1]]) {
    g.add(box(x0, x0 + w, 0, P.wallH, a, b, brick));
    g.add(box(x0 - 0.02, x0 + w + 0.02, P.wallH, P.wallH + 0.05, a, b, cement, off));
  }
  // 木栅门：两根竖梃、几根横档、斜撑，一根铁丝拴在墙上
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 });
    const gx = x0 + w / 2;
    for (const z of [g0 + 0.04, g1 - 0.04]) g.add(box(gx - 0.03, gx + 0.03, 0.03, 0.95, z - 0.03, z + 0.03, wood, off));
    for (const y of [0.15, 0.5, 0.85]) g.add(box(gx - 0.02, gx + 0.02, y, y + 0.07, g0 + 0.02, g1 - 0.02, wood, off));
    for (let k = 0; k < 5; k++) {
      const z = g0 + 0.12 + k * ((g1 - g0 - 0.24) / 4);
      g.add(box(gx - 0.015, gx + 0.015, 0.05, 0.9, z - 0.02, z + 0.02, wood, off));
    }
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.05), wood);
    brace.position.set(gx + 0.03, 0.5, P.gate.z);
    brace.rotation.x = Math.atan2(g1 - g0 - 0.1, 0.75);
    g.add(brace);
    g.add(box(gx - 0.05, gx + 0.05, 0, 1.0, g0, g1, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false })); // 门关着，挡人
  }

  // —— 地面：踩烂的黑泥、几滩水、麦秸 ——
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - w, z1 - z0 - w).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: mudTex(), roughness: 0.75 }));
  floor.position.set((x0 + w + x1) / 2, 0.012, (z0 + w + z1) / 2);
  floor.receiveShadow = true;
  floor.userData.noAO = true;
  g.add(floor);

  // —— 棚子：两根木柱 + 横梁 + 波纹石棉瓦（西低东高） ——
  {
    const S = P.shed;
    const post = new THREE.MeshStandardMaterial({ color: 0x6a5440, roughness: 1 });
    for (const z of [z0 + w + 0.1, z1 - 0.12]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, S.low, 8), post);
      p.position.set(S.x0 + 0.06, S.low / 2, z);
      p.castShadow = true;
      g.add(p);
    }
    g.add(box(S.x0, S.x0 + 0.12, S.low - 0.1, S.low, z0 + w, z1, post, off)); // 横梁
    // 石棉瓦：一张平板按正弦起伏，再斜着放
    const len = Math.hypot(x1 - S.x0 + 0.15, S.high - S.low);
    const geo = new THREE.PlaneGeometry(z1 - z0 + 0.1, len, 60, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 36) * 0.018);
    geo.computeVertexNormals();
    const sheet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: asbestosTex(), roughness: 0.95, side: THREE.DoubleSide }));
    sheet.rotation.order = 'YXZ';
    sheet.rotation.y = Math.PI / 2;
    sheet.rotation.x = -Math.PI / 2 - Math.atan2(S.high - S.low, x1 - S.x0 + 0.15); // 东头（靠墙）高
    sheet.position.set((S.x0 - 0.15 + x1) / 2, (S.low + S.high) / 2 + 0.02, (z0 + z1) / 2);
    sheet.castShadow = sheet.receiveShadow = true;
    g.add(sheet);
    // 压瓦的两块砖
    for (const z of [z0 + 0.6, z1 - 0.6]) {
      const b = box(-0.12, 0.12, 0, 0.055, -0.06, 0.06, brick, off);
      b.position.set(S.x0 + 0.35, S.low + (0.35 / (x1 - S.x0)) * (S.high - S.low) + 0.04, z);
      b.rotation.z = Math.atan2(S.high - S.low, x1 - S.x0);
      g.add(b);
    }
    // 棚子底下铺的一层麦秸
    const straw = new THREE.Mesh(new THREE.PlaneGeometry(x1 - S.x0 - 0.15, z1 - z0 - 0.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: strawTex(), transparent: true, roughness: 1, depthWrite: false }));
    straw.position.set((S.x0 + x1) / 2 + 0.05, 0.02, (z0 + z1) / 2 + 0.1);
    straw.userData.noAO = true;
    g.add(straw);
  }

  // —— 石食槽：一整块青石凿的长槽，槽里剩着泔水 ——
  {
    const T = P.trough;
    const stone = mat('bluestone');
    const tw = 0.36;
    const th = 0.28;
    const tx0 = x0 + w + 0.02;
    const tx1 = tx0 + tw;
    g.add(box(tx0, tx1, 0, 0.06, T.z0, T.z1, stone));
    g.add(box(tx0, tx0 + 0.06, 0.06, th, T.z0, T.z1, stone, off));
    g.add(box(tx1 - 0.06, tx1, 0.06, th, T.z0, T.z1, stone, off));
    g.add(box(tx0 + 0.06, tx1 - 0.06, 0.06, th, T.z0, T.z0 + 0.06, stone, off));
    g.add(box(tx0 + 0.06, tx1 - 0.06, 0.06, th, T.z1 - 0.06, T.z1, stone, off));
    const slop = new THREE.Mesh(new THREE.PlaneGeometry(tw - 0.12, T.z1 - T.z0 - 0.12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a6046, roughness: 0.25 }));
    slop.position.set((tx0 + tx1) / 2, 0.16, (T.z0 + T.z1) / 2);
    g.add(slop);
  }
  return g;
}

/** 猪圈地上的黑泥：深褐、发亮的水洼、蹄子印、几根麦秸；1 张 = 整个圈 */
function mudTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(941);
    g.fillStyle = '#3e3022';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 40, r() > 0.5 ? '70,56,40' : '30,24,18', 0.3);
    for (let i = 0; i < 6; i++) seamlessBlob(g, w, h, r() * w, r() * h, 12 + r() * 20, '110,112,104', 0.5); // 水洼
    for (let i = 0; i < 120; i++) {
      // 蹄子印：两个小月牙
      const x = r() * w;
      const y = r() * h;
      g.fillStyle = 'rgba(20,14,10,0.6)';
      g.beginPath();
      g.ellipse(x - 2, y, 1.6, 3, 0.2, 0, Math.PI * 2);
      g.ellipse(x + 2, y, 1.6, 3, -0.2, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 80; i++) {
      g.strokeStyle = `rgba(200,170,100,${0.4 + r() * 0.4})`;
      g.lineWidth = 1;
      g.beginPath();
      const x = r() * w;
      const y = r() * h;
      const a = r() * Math.PI;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      g.stroke();
    }
  });
}

/** 麦秸（透明底）：横七竖八一层 */
function strawTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(947);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(${200 + r() * 30},${168 + r() * 30},${96 + r() * 30},${0.6 + r() * 0.4})`;
      g.lineWidth = 1 + r();
      g.beginPath();
      const x = 10 + r() * (w - 20);
      const y = 10 + r() * (h - 20);
      const a = r() * Math.PI;
      const l = 6 + r() * 18;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  });
}

/** 石棉瓦：灰白、发黑的雨水印、青苔 */
function asbestosTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(953);
    g.fillStyle = '#a4a29a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) seamlessBlob(g, w, h, r() * w, r() * h, 10 + r() * 40, r() > 0.6 ? '80,84,70' : '150,148,140', 0.25);
    for (let i = 0; i < 30; i++) {
      const x = r() * w;
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(50,48,42,0.3)');
      gr.addColorStop(1, 'rgba(50,48,42,0)');
      g.fillStyle = gr;
      g.fillRect(x, 0, 2 + r() * 4, h * (0.3 + r() * 0.6));
    }
  });
}
