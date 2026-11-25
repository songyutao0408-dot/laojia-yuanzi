import * as THREE from 'three';
import { YARD_ITEMS } from '../layout.js';
import { box } from '../core/box.js';
import { canvasTex, rng, seamlessBlob } from '../interiors/common.js';

/**
 * 时风三马车（第 17 轮，按用户发的三张图）：前面一个轮子、后面两个轮子的农用三轮车。
 * 蓝漆车身，用了些年头：漆面发乌、磕掉漆的地方露出铁锈，下半截糊着泥土。
 * - 车头：前轮 + 前叉、蓝色的前脸（圆大灯）、摩托车式车把
 * - 驾驶座：一条黑皮长座，座底下是单缸柴油机（侧面黑色散热器、大飞轮），一根排气管竖着伸上去
 * - 后面一个蓝色车厢（栏板上两道白线），两边栏板上白色大字“时”“风”，车厢前头一块高挡板
 * 局部坐标：+z 朝车头，-x 是车的右手边；原点在车身中心下的地面。
 */
const BLUE = 0x2c5cb0;

export function createTricycle() {
  const T = YARD_ITEMS.tricycle;
  const g = new THREE.Group();
  g.name = 'tricycle';
  g.position.set(T.x, 0, T.z);
  g.rotation.y = (T.rot * Math.PI) / 180;
  const off = { solid: false };

  const paint = new THREE.MeshStandardMaterial({ map: paintTex(), roughness: 0.55, metalness: 0.25 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.6, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8c8e, roughness: 0.4, metalness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x4a5448, roughness: 0.55, metalness: 0.5 });

  // —— 车架：两根黑色大梁 ——
  for (const sx of [-1, 1]) g.add(box(sx * 0.34 - 0.04, sx * 0.34 + 0.04, 0.5, 0.62, -1.9, 1.2, black, off));
  for (const z of [-1.7, -0.95, -0.2, 0.6]) g.add(box(-0.34, 0.34, 0.52, 0.6, z - 0.03, z + 0.03, black, off));

  // —— 后轮（两个）+ 后桥 ——
  const RW = 0.33;
  for (const sx of [-1, 1]) {
    const w = wheel(RW, 0.17, white);
    w.position.set(sx * 0.54, RW, -0.95);
    w.rotation.z = Math.PI / 2;
    g.add(w);
    // 挡泥皮
    g.add(box(sx * 0.54 - 0.09, sx * 0.54 + 0.09, 0.18, 0.62, -1.36, -1.35, black, off));
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 10).rotateZ(Math.PI / 2), black);
  axle.position.set(0, RW, -0.95);
  g.add(axle);

  // —— 车厢 ——
  const fl = 0.78; // 车厢底板高
  const bx0 = -0.66;
  const bx1 = 0.66;
  const bz0 = -1.86;
  const bz1 = 0.1;
  const sideH = 0.42;
  g.add(box(bx0, bx1, fl - 0.06, fl, bz0, bz1, paint, off)); // 底板
  g.add(box(bx0, bx1, fl, fl + 0.02, bz0 + 0.03, bz1 - 0.03, new THREE.MeshStandardMaterial({ map: bedTex(), roughness: 0.9 }), off)); // 车厢里面的底（磨得发亮、带泥）
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? bx0 : bx1 - 0.03;
    g.add(box(x0, x0 + 0.03, fl, fl + sideH, bz0, bz1, paint, off)); // 两边栏板
    // 栏板上沿一道包边、两道压出来的白线
    g.add(box(x0 - 0.01, x0 + 0.04, fl + sideH - 0.03, fl + sideH + 0.01, bz0, bz1, paint, off));
    const xo = sx < 0 ? bx0 - 0.003 : bx1 + 0.003;
    for (const y of [fl + 0.1, fl + sideH - 0.08]) g.add(box(xo - 0.002, xo + 0.002, y, y + 0.012, bz0 + 0.02, bz1 - 0.02, white, off));
    // 栏板下面一排挂钩
    for (let k = 0; k < 4; k++) g.add(box(xo - 0.012, xo + 0.012, fl - 0.04, fl, bz0 + 0.25 + k * 0.48, bz0 + 0.3 + k * 0.48, black, off));
  }
  // 后挡板（带两个插销）
  g.add(box(bx0 + 0.03, bx1 - 0.03, fl, fl + sideH, bz0, bz0 + 0.03, paint, off));
  for (const sx of [-1, 1]) g.add(box(sx * 0.6 - 0.03, sx * 0.6 + 0.03, fl + sideH - 0.1, fl + sideH - 0.05, bz0 - 0.03, bz0, steel, off));
  // 前头一块高挡板（护着驾驶座），上面几道横筋
  const hb = fl + 0.78;
  g.add(box(bx0, bx1, fl, hb, bz1, bz1 + 0.035, paint, off));
  for (const y of [fl + 0.25, fl + 0.45, fl + 0.65]) g.add(box(bx0 + 0.04, bx1 - 0.04, y, y + 0.03, bz1 + 0.035, bz1 + 0.05, paint, off));
  g.add(box(bx0 - 0.01, bx1 + 0.01, hb - 0.02, hb + 0.03, bz1 - 0.01, bz1 + 0.05, paint, off));

  // 栏板上的大字“时”“风”：左边（+x）从车头往后读，右边（-x）从车尾往前读，两边看都是“时风”
  const chars = { shi: charTex('时'), feng: charTex('风') };
  const charMat = (t) => new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const sx of [-1, 1]) {
    const x = (sx > 0 ? bx1 : bx0) + sx * 0.004;
    for (const [key, z] of [['shi', sx > 0 ? -0.2 : -1.55], ['feng', sx > 0 ? -1.55 : -0.2]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), charMat(chars[key]));
      p.rotation.y = sx * (Math.PI / 2);
      p.position.set(x, fl + sideH / 2 + 0.005, z);
      p.userData.noAO = true;
      g.add(p);
    }
  }

  // —— 发动机（座底下）：单缸柴油机、右边黑散热器、左边大飞轮、竖着的排气管 ——
  g.add(box(-0.3, 0.26, 0.45, 0.86, 0.2, 0.7, engineMat));
  const fins = new THREE.MeshStandardMaterial({ map: finTex(), roughness: 0.7, metalness: 0.4 });
  g.add(box(-0.5, -0.3, 0.48, 0.9, 0.24, 0.66, fins, off)); // 散热器（车右边）
  g.add(box(-0.48, -0.32, 0.9, 0.98, 0.3, 0.42, black, off)); // 加水口
  const fly = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 28).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a3a2a, roughness: 0.6, metalness: 0.5 }));
  fly.position.set(0.32, 0.62, 0.45);
  g.add(fly);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12).rotateZ(Math.PI / 2), steel);
  hub.position.set(0.35, 0.62, 0.45);
  g.add(hub);
  // 皮带：飞轮到后面
  g.add(box(0.33, 0.35, 0.58, 0.62, -0.7, 0.45, black, off));
  // 排气管 + 消声器
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 10), black);
  pipe.position.set(0.22, 1.2, 0.2);
  g.add(pipe);
  const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8, metalness: 0.4 }));
  muffler.position.set(0.22, 1.42, 0.2);
  g.add(muffler);

  // —— 驾驶座：黑皮长座 + 靠背（靠着挡板） ——
  const seat = new THREE.MeshStandardMaterial({ color: 0x1e1e20, roughness: 0.45 });
  g.add(box(-0.32, 0.32, 0.86, 0.98, 0.22, 0.6, seat, off));
  g.add(box(-0.3, 0.3, 1.0, 1.32, 0.15, 0.2, seat, off));
  // 脚踏板（花纹钢板）
  g.add(box(-0.36, 0.36, 0.4, 0.44, 0.7, 1.2, new THREE.MeshStandardMaterial({ map: treadPlateTex(), roughness: 0.5, metalness: 0.6 }), off));

  // —— 车头：前脸、前挡泥瓦、圆大灯、前叉、前轮、车把 ——
  const fw = wheel(0.28, 0.13, white);
  fw.position.set(0, 0.28, 1.45);
  fw.rotation.z = Math.PI / 2;
  g.add(fw);
  // 前叉：从前轴斜着伸进前脸里面（短粗，带减震弹簧的样子）
  for (const sx of [-1, 1]) {
    const a = new THREE.Vector3(sx * 0.09, 0.28, 1.45);
    const b = new THREE.Vector3(sx * 0.09, 0.9, 1.3);
    const d = b.clone().sub(a);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, d.length(), 10), black);
    fork.position.copy(a).addScaledVector(d, 0.5);
    fork.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.add(fork);
  }
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 20, 1, true, -Math.PI * 0.15, Math.PI * 0.75).rotateZ(Math.PI / 2), paint);
  guard.material = paint.clone();
  guard.material.side = THREE.DoubleSide;
  guard.position.set(0, 0.28, 1.45);
  g.add(guard);
  // 前脸：一块往前斜的蓝板，两边包过来
  const shape = new THREE.Shape();
  shape.moveTo(-0.3, 0);
  shape.lineTo(0.3, 0);
  shape.lineTo(0.26, 0.62);
  shape.quadraticCurveTo(0, 0.72, -0.26, 0.62);
  shape.closePath();
  const face = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), paint);
  face.scale.set(1.05, 1.1, 1);
  face.position.set(0, 0.46, 1.2);
  face.rotation.x = -0.25;
  face.castShadow = true;
  g.add(face);
  for (const sx of [-1, 1]) g.add(box(sx * 0.3 - 0.015, sx * 0.3 + 0.015, 0.44, 1.0, 1.0, 1.24, paint, off)); // 两边的护板
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.08, 20).rotateX(Math.PI / 2), steel);
  lamp.position.set(0, 1.02, 1.36);
  g.add(lamp);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), new THREE.MeshStandardMaterial({ color: 0xe8e4d0, roughness: 0.1, metalness: 0.3 }));
  lens.position.set(0, 1.02, 1.4);
  g.add(lens);
  // 车把：从转向立管伸上来，两头黑把套
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), steel);
  column.position.set(0, 1.12, 1.28);
  column.rotation.x = -0.3;
  g.add(column);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.74, 8).rotateZ(Math.PI / 2), steel);
  bar.position.set(0, 1.3, 1.22);
  g.add(bar);
  for (const sx of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8).rotateZ(Math.PI / 2), black);
    grip.position.set(sx * 0.33, 1.3, 1.2);
    g.add(grip);
    const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 6), black);
    mirrorArm.position.set(sx * 0.25, 1.42, 1.22);
    mirrorArm.rotation.z = -sx * 0.3;
    g.add(mirrorArm);
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 14).rotateX(Math.PI / 2), black);
    mirror.position.set(sx * 0.29, 1.55, 1.22);
    g.add(mirror);
  }

  g.traverse((o) => {
    if (o.isMesh && !o.material.transparent) o.castShadow = o.receiveShadow = true;
  });
  // 碰撞：整辆车一块
  g.add(box(-0.72, 0.72, 0, 1.4, -1.9, 1.62, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false }));
  return g;
}

/** 轮子：黑胶胎（有花纹）、白漆钢圈、轮毂和一圈螺丝；轴沿局部 y */
function wheel(R, W, rimMat) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 32, 1), [
    new THREE.MeshStandardMaterial({ map: treadTex(), roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.9 }),
  ]);
  g.add(tire);
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.02, 24), rimMat);
    rim.position.y = s * (W / 2 + 0.005);
    g.add(rim);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.2, R * 0.22, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.4, metalness: 0.7 }));
    hb.position.y = s * (W / 2 + 0.02);
    g.add(hb);
  }
  return g;
}

/* ---------- 贴图 ---------- */
/** 旧蓝漆：发乌，掉漆处锈红，下半截挂着泥点；1 张 = 1 m */
function paintTex() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(811);
      g.fillStyle = '#2c5cb0';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 20 + r() * 60, r() > 0.5 ? '30,70,140' : '70,110,180', 0.2);
      for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 30, '150,140,120', 0.22); // 浮土
      for (let i = 0; i < 70; i++) {
        const x = r() * w;
        const y = r() * h;
        g.fillStyle = r() > 0.4 ? 'rgba(120,64,36,0.85)' : 'rgba(200,196,186,0.8)';
        g.beginPath();
        g.ellipse(x, y, 1 + r() * 4, 0.6 + r() * 2, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = 'rgba(220,220,210,0.4)';
        g.lineWidth = 1;
        g.beginPath();
        const x = r() * w;
        const y = r() * h;
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6);
        g.stroke();
      }
    },
    { repeat: [1, 1] },
  );
}

/** 车厢底板：磨得发亮的铁板，带泥、几根草 */
function bedTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(821);
    g.fillStyle = '#3a4c6c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) seamlessBlob(g, w, h, r() * w, r() * h, 10 + r() * 40, r() > 0.4 ? '130,112,84' : '90,96,104', 0.3);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = 'rgba(200,180,120,0.6)';
      g.beginPath();
      const x = r() * w;
      const y = r() * h;
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40);
      g.stroke();
    }
  });
}

/** 栏板上的白色大字（透明底） */
function charTex(ch) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = 'rgba(244,244,240,0.95)';
    g.font = `900 210px "Heiti SC","SimHei","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, w / 2, h / 2 + 8);
    // 字也磕掉了几块
    const r = rng(ch.charCodeAt(0));
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 30; i++) {
      g.beginPath();
      g.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 散热器的一道道散热片 */
function finTex() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#141414';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      g.fillStyle = '#3a3a3a';
      g.fillRect(0, y, w, 2);
    }
  }, { repeat: [4, 4] });
}

/** 花纹钢板 */
function treadPlateTex() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#6a6e72';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = '#8a8e92';
        g.save();
        g.translate(x + 8, y + 8);
        g.rotate(((x + y) / 16) % 2 ? 0.7 : -0.7);
        g.fillRect(-5, -1.5, 10, 3);
        g.restore();
      }
    }
  }, { repeat: [6, 6] });
}

/** 轮胎花纹（沿圆周） */
function treadTex() {
  return canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#222';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = '#121212';
      g.fillRect(x, 4, 4, h / 2 - 6);
      g.fillRect(x + 4, h / 2 + 2, 4, h / 2 - 6);
    }
  });
}
