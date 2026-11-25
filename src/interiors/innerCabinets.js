import * as THREE from 'three';
import { WEST_ROOM as R } from '../layout.js';
import { box } from '../core/box.js';
import { canvasTex, rng, seamlessBlob } from './common.js';

/**
 * 西北屋里屋东墙（正对门洞）的大衣柜 + 碗柜（第 17 轮，按用户发的图）：
 * - 大衣柜：豆绿漆，上面一扇小门画着梅花喜鹊，下面一扇大门；顶上一道线脚，底下弯脚牙板
 * - 碗柜：同样的豆绿漆，上半截两扇推拉玻璃，里面两层摆着碗、盘子、茶杯；下半截两扇柜门；柜顶一个圆闹钟
 * 漆面发旧：磕掉的地方露出白底和铁锈点。室内坐标（原点 = 西北屋室内西北角），柜子背靠东墙、面朝西。
 * xw：东墙面（含墙裙厚度）的 x
 */
export function createInnerCabinets(xw) {
  const g = new THREE.Group();
  g.name = 'inner-cabinets';
  const C = R.cabinets;
  const off = { solid: false };
  const paint = new THREE.MeshStandardMaterial({ map: greenPaintTex(), roughness: 0.32 });
  const paintDark = new THREE.MeshStandardMaterial({ color: 0x86b296, roughness: 0.4 });
  const hide = new THREE.MeshBasicMaterial({ visible: false });

  // —— 大衣柜 ——
  {
    const W = C.wardrobe;
    const x0 = xw - W.d;
    const z0 = W.z0;
    const z1 = W.z0 + W.w;
    g.add(box(x0, xw, 0.1, W.h - 0.04, z0, z1, paint, off)); // 柜体
    g.add(box(x0 - 0.025, xw, W.h - 0.05, W.h, z0 - 0.025, z1 + 0.025, paint, off)); // 顶上线脚
    g.add(box(x0 - 0.012, xw, W.h - 0.08, W.h - 0.05, z0 - 0.012, z1 + 0.012, paintDark, off));
    g.add(plinth(x0, z0, z1, paint));
    // 柜门：上面小门（梅花喜鹊）、下面大门；门缝一道暗线
    const fx = x0 - 0.012;
    const yMid = W.h * 0.6;
    g.add(box(fx, x0, 0.14, yMid - 0.006, z0 + 0.03, z1 - 0.03, paint, off));
    g.add(box(fx, x0, yMid + 0.006, W.h - 0.09, z0 + 0.03, z1 - 0.03, paint, off));
    g.add(box(fx + 0.004, x0, yMid - 0.006, yMid + 0.006, z0 + 0.03, z1 - 0.03, new THREE.MeshStandardMaterial({ color: 0x3e5446 }), off));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 - 0.12, W.h - 0.09 - yMid - 0.08), new THREE.MeshStandardMaterial({ map: plumMagpieTex(), transparent: true, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }));
    art.rotation.y = -Math.PI / 2;
    art.position.set(fx - 0.001, (yMid + W.h - 0.09) / 2, (z0 + z1) / 2);
    art.userData.noAO = true;
    g.add(art);
    // 锁眼、合页
    const brass = new THREE.MeshStandardMaterial({ color: 0xb89a5a, roughness: 0.35, metalness: 0.8 });
    g.add(box(fx - 0.004, fx, yMid - 0.12, yMid - 0.08, z1 - 0.1, z1 - 0.085, brass, off));
    for (const y of [0.3, yMid - 0.15, yMid + 0.1, W.h - 0.2]) g.add(box(fx - 0.004, fx, y, y + 0.06, z0 + 0.03, z0 + 0.045, brass, off));
    g.add(box(x0, xw, 0, W.h, z0, z1, hide));
  }

  // —— 碗柜 ——
  {
    const S = C.sideboard;
    const x0 = xw - S.d;
    const z0 = S.z0;
    const z1 = S.z0 + S.w;
    const yG = S.h * 0.56; // 玻璃柜的下沿
    g.add(box(x0 + 0.02, xw, 0.1, yG, z0, z1, paint, off)); // 下面的柜子
    g.add(plinth(x0, z0, z1, paint));
    // 两扇柜门
    const zm = (z0 + z1) / 2;
    for (const [a0, a1] of [[z0 + 0.03, zm - 0.004], [zm + 0.004, z1 - 0.03]]) g.add(box(x0 + 0.005, x0 + 0.02, 0.14, yG - 0.03, a0, a1, paint, off));
    // 上半截：框、里面的背板和两层隔板、两扇推拉玻璃
    g.add(box(x0, xw, yG - 0.02, yG + 0.01, z0, z1, paint, off)); // 中间横档
    g.add(box(x0, xw, S.h - 0.05, S.h, z0 - 0.02, z1 + 0.02, paint, off)); // 柜顶面
    for (const z of [z0, z1 - 0.03]) g.add(box(x0, xw, yG, S.h - 0.05, z, z + 0.03, paint, off)); // 两边立框
    g.add(box(xw - 0.02, xw, yG, S.h - 0.05, z0, z1, new THREE.MeshStandardMaterial({ color: 0xa8cab4, roughness: 0.5 }), off)); // 背板（浅一点）
    const shelfY = [yG + 0.01, yG + (S.h - 0.05 - yG) / 2];
    g.add(box(x0 + 0.03, xw - 0.02, shelfY[1] - 0.008, shelfY[1], z0 + 0.03, z1 - 0.03, new THREE.MeshStandardMaterial({ color: 0xdcdcd4, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.6 }), off)); // 玻璃隔板
    const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.18 });
    for (const [a0, a1, dx] of [[z0 + 0.03, zm + 0.02, 0.012], [zm - 0.02, z1 - 0.03, 0.026]]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(a1 - a0, S.h - 0.05 - yG - 0.01), glass);
      pane.rotation.y = -Math.PI / 2;
      pane.position.set(x0 + dx, (yG + S.h - 0.05) / 2, (a0 + a1) / 2);
      pane.userData.noAO = true;
      g.add(pane);
      g.add(box(x0 + dx - 0.006, x0 + dx + 0.006, yG + 0.01, yG + 0.025, a0, a1, paint, off)); // 推拉门下框
    }
    // 碗、盘子、茶杯
    g.add(dishes(x0 + 0.06, xw - 0.04, z0 + 0.05, z1 - 0.05, shelfY));
    // 柜顶一个圆闹钟（金边、粉白表盘）
    const clock = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8a466, roughness: 0.25, metalness: 0.9 }));
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.066, 32), new THREE.MeshStandardMaterial({ map: alarmFaceTex(), roughness: 0.4 }));
    dial.rotation.y = -Math.PI / 2;
    dial.position.x = -0.026;
    clock.add(rim, dial);
    for (const s of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), rim.material);
      foot.position.set(0, -0.072, s * 0.045);
      clock.add(foot);
    }
    clock.position.set(x0 + 0.2, S.h + 0.084, z1 - 0.2);
    clock.rotation.y = -0.15;
    g.add(clock);
    g.add(box(x0, xw, 0, S.h, z0, z1, hide));
  }
  g.traverse((o) => {
    if (o.isMesh && !o.material.transparent) o.castShadow = o.receiveShadow = true;
  });
  return g;
}

/** 柜子底座：前面一块弯脚牙板（中间挖出一道弧） */
function plinth(x0, z0, z1, paint) {
  const w = z1 - z0;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0, 0.1);
  s.lineTo(w, 0.1);
  s.lineTo(w, 0);
  s.lineTo(w - 0.06, 0);
  s.quadraticCurveTo(w - 0.1, 0.06, w - 0.16, 0.06);
  s.lineTo(0.16, 0.06);
  s.quadraticCurveTo(0.1, 0.06, 0.06, 0);
  s.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), paint);
  m.rotation.y = Math.PI / 2; // 形状的 x → 世界 -z，挤出方向 → +x
  m.position.set(x0 - 0.01, 0, z1);
  return m;
}

/** 碗柜里的碗、盘子、茶杯（白瓷，有的带花边） */
function dishes(x0, x1, z0, z1, ys) {
  const g = new THREE.Group();
  const r = rng(907);
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.2 });
  const rimRed = new THREE.MeshStandardMaterial({ color: 0xb8443a, roughness: 0.3 });
  const rimBlue = new THREE.MeshStandardMaterial({ color: 0x3a5a9a, roughness: 0.3 });
  const xc = (x0 + x1) / 2;
  const bowlGeo = new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.04, 0.005], [0.06, 0.04], [0.062, 0.045]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
  for (const y of ys) {
    let z = z0 + 0.06;
    while (z < z1 - 0.06) {
      const kind = r();
      if (kind < 0.35) {
        // 一摞盘子
        const n = 3 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++) {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.012, 24), white);
          p.position.set(xc, y + 0.006 + i * 0.013, z + 0.03);
          g.add(p);
        }
        const edge = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.003, 4, 24).rotateX(Math.PI / 2), r() > 0.5 ? rimRed : rimBlue);
        edge.position.set(xc, y + 0.012 + (n - 1) * 0.013, z + 0.03);
        g.add(edge);
        z += 0.2;
      } else if (kind < 0.7) {
        // 两三个碗摞着
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const b = new THREE.Mesh(bowlGeo, white);
          b.material.side = THREE.DoubleSide;
          b.position.set(xc, y + i * 0.02, z + 0.02);
          g.add(b);
        }
        z += 0.15;
      } else {
        // 茶杯
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.06, 16), white);
        c.position.set(xc + (r() - 0.5) * 0.08, y + 0.03, z);
        const h = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 4, 10, Math.PI), white);
        h.position.set(c.position.x, y + 0.03, z + 0.035);
        h.rotation.set(0, Math.PI / 2, -Math.PI / 2);
        g.add(c, h);
        z += 0.1;
      }
    }
  }
  return g;
}

/** 豆绿漆：泛着光，深浅不匀，边上磕掉的地方露出白底、几个锈点 */
function greenPaintTex() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(911);
      g.fillStyle = '#9cc6ac';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 20 + r() * 60, r() > 0.5 ? '170,206,184' : '128,170,146', 0.18);
      for (let i = 0; i < 18; i++) {
        g.fillStyle = r() > 0.6 ? 'rgba(140,84,50,0.75)' : 'rgba(236,232,218,0.8)';
        g.beginPath();
        g.ellipse(r() * w, r() * h, 0.8 + r() * 2.5, 0.6 + r() * 1.5, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    },
    { repeat: [1 / 0.8, 1 / 0.8] },
  );
}

/** 柜门上画的梅花喜鹊（透明底） */
function plumMagpieTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(919);
    // 梅枝：从左下往右上斜出去，几根小杈
    g.strokeStyle = '#3a2a20';
    g.lineCap = 'round';
    const branch = (x, y, a, len, wd) => {
      g.lineWidth = wd;
      g.beginPath();
      g.moveTo(x, y);
      let px = x;
      let py = y;
      for (let i = 0; i < 6; i++) {
        a += (r() - 0.5) * 0.5;
        px += (Math.cos(a) * len) / 6;
        py += (Math.sin(a) * len) / 6;
        g.lineTo(px, py);
        if (wd > 2 && r() < 0.35) branch(px, py, a + (r() > 0.5 ? 0.7 : -0.7), len * 0.45, wd * 0.55);
      }
      g.stroke();
      // 花：红的、白的，五瓣
      for (let i = 0; i < 4; i++) {
        const fx = x + (px - x) * r();
        const fy = y + (py - y) * r();
        const red = r() > 0.35;
        for (let k = 0; k < 5; k++) {
          const b = (k / 5) * Math.PI * 2;
          g.fillStyle = red ? '#c4283a' : '#f4ece0';
          g.beginPath();
          g.arc(fx + Math.cos(b) * 3.2, fy + Math.sin(b) * 3.2, 2.8, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#e8c040';
        g.beginPath();
        g.arc(fx, fy, 1.4, 0, Math.PI * 2);
        g.fill();
      }
    };
    branch(70, 230, -1.25, 170, 5);
    branch(90, 180, -0.7, 90, 3);
    // 喜鹊：黑头黑背、白肚子，长尾巴往右下拖
    g.save();
    g.translate(165, 110);
    g.rotate(0.25);
    g.fillStyle = '#1a1c22';
    g.beginPath();
    g.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(-20, -6, 8, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-28, -6);
    g.lineTo(-36, -3);
    g.lineTo(-27, -2);
    g.fill();
    g.fillStyle = '#f2f2ee';
    g.beginPath();
    g.ellipse(-2, 5, 14, 5, 0.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1c22';
    g.beginPath();
    g.moveTo(18, -2);
    g.lineTo(62, 24);
    g.lineTo(58, 30);
    g.lineTo(16, 5);
    g.fill();
    g.fillStyle = '#2a3a5a';
    g.beginPath();
    g.ellipse(6, -4, 14, 5, 0.3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  });
}

/** 圆闹钟的表盘：粉白底、黑数字、两根指针 */
function alarmFaceTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f6e6e2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#222';
    g.font = 'bold 14px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(i), w / 2 + Math.cos(a) * 46, h / 2 + Math.sin(a) * 46);
    }
    g.strokeStyle = '#222';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(w / 2, h / 2);
    g.lineTo(w / 2 + 22, h / 2 - 14);
    g.moveTo(w / 2, h / 2);
    g.lineTo(w / 2 - 6, h / 2 - 34);
    g.stroke();
  });
}
