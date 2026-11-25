import * as THREE from 'three';
import { PIGPEN } from '../layout.js';
import { Limb, ellipsoid } from './rig.js';
import { canvasTex, rng, seamlessBlob } from '../interiors/common.js';

/**
 * 猪圈里的两头黑猪（第 18 轮，用户要求）：本地黑猪，膘肥、肚子往下坠、背有点塌，
 * 大耳朵耷拉下来盖着眼睛，脸上有褶子，长嘴、粉灰色的鼻盘，细尾巴打个卷；腿上、肚皮上糊着泥。
 * - eat：站在石槽跟前低头拱食，头一点一点，尾巴甩
 * - lie：在棚子底下趴着，肚子一起一伏，隔一会儿扇一下耳朵
 * 局部坐标 +z 朝猪头；动作按真实时间走。
 */
export function createPigs() {
  const group = new THREE.Group();
  group.name = 'pigs';
  const skin = new THREE.MeshStandardMaterial({ map: pigSkinTex(), roughness: 0.75 });
  const mud = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 1 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0x9a7a78, roughness: 0.6 });
  const pigs = PIGPEN.pigs.map((cfg, i) => pig(cfg, i, skin, mud, snoutMat));
  for (const p of pigs) group.add(p.root);
  return {
    group,
    update(dt, t) {
      for (const p of pigs) p.update(t);
    },
  };
}

function pig(cfg, seed, skin, mud, snoutMat) {
  const root = new THREE.Group();
  root.position.set(cfg.x, 0, cfg.z);
  root.rotation.y = (cfg.rot * Math.PI) / 180;
  const lying = cfg.pose === 'lie';
  const body = new THREE.Group();
  root.add(body);
  const H = lying ? 0.2 : 0.4; // 身子中心高

  // 身子：一个长椭球 + 往下坠的肚子 + 屁股、肩膀
  const torso = ellipsoid(skin, 0.25, 0.23, 0.48, 28);
  torso.position.set(0, H, 0);
  const belly = ellipsoid(skin, 0.22, 0.16, 0.36, 22);
  belly.position.set(0, H - (lying ? 0.06 : 0.11), 0.02);
  const rump = ellipsoid(skin, 0.23, 0.22, 0.2, 20);
  rump.position.set(0, H + 0.01, -0.32);
  const shoulder = ellipsoid(skin, 0.22, 0.22, 0.18, 20);
  shoulder.position.set(0, H + 0.02, 0.3);
  body.add(torso, belly, rump, shoulder);
  if (lying) for (const m of [torso, belly, rump, shoulder]) m.scale.x *= 1.12; // 趴着，肚子摊开

  // 头：一个往前伸的椭球 + 长嘴 + 鼻盘
  const head = new THREE.Group();
  head.position.set(0, H + 0.04, 0.46);
  body.add(head);
  const skull = ellipsoid(skin, 0.15, 0.15, 0.18, 22);
  skull.position.z = 0.08;
  const jowl = ellipsoid(skin, 0.13, 0.1, 0.14, 18);
  jowl.position.set(0, -0.07, 0.1);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.16, 18).rotateX(Math.PI / 2), skin);
  snout.position.set(0, -0.03, 0.27);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.066, 20), snoutMat);
  disc.position.set(0, -0.03, 0.352);
  head.add(skull, jowl, snout, disc);
  for (const s of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), new THREE.MeshBasicMaterial({ color: 0x2a1a18 }));
    nostril.position.set(s * 0.022, -0.03, 0.354);
    nostril.scale.y = 1.5;
    head.add(nostril);
  }
  // 大耳朵：从头顶两边往前耷拉下来
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.09, 0.12, 0.08);
    const ear = ellipsoid(skin, 0.1, 0.015, 0.13, 14);
    ear.position.set(s * 0.04, -0.01, 0.1);
    ear.rotation.set(0.3, 0, s * 0.5);
    pivot.add(ear);
    pivot.rotation.x = 0.55;
    head.add(pivot);
    return pivot;
  });
  // 小眼睛（大半盖在耳朵底下）
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.2 }));
    eye.position.set(s * 0.11, 0.04, 0.17);
    head.add(eye);
  }

  // 腿：站着四条短粗腿；趴着的蜷在身子底下，只露出前腿
  const legPts = lying
    ? [[0.17, 0.32, 0.12, 0.5], [-0.17, 0.32, 0.12, 0.5], [0.2, -0.3, 0.05, -0.15], [-0.2, -0.3, 0.05, -0.15]]
    : [[0.14, 0.3, 0.0, 0.32], [-0.14, 0.3, 0.0, 0.32], [0.14, -0.3, 0.0, -0.32], [-0.14, -0.3, 0.0, -0.32]];
  for (const [x, z, y1, z1] of legPts) {
    const top = new THREE.Vector3(x, H - 0.1, z);
    const foot = new THREE.Vector3(x * (lying ? 1.2 : 1), y1 + 0.03, z1);
    const leg = new Limb(skin, 0.065, 0.042, { radial: 12 });
    leg.set(top, foot);
    body.add(leg.group);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 10), mud);
    hoof.position.copy(foot).add(new THREE.Vector3(0, -0.015, lying ? 0.03 : 0));
    if (lying) hoof.rotation.x = Math.PI / 2;
    body.add(hoof);
  }
  // 尾巴：细，打个卷，末梢一撮毛
  const tail = new THREE.Group();
  tail.position.set(0, H + 0.08, -0.5);
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 16, Math.PI * 1.6), skin);
  curl.rotation.y = Math.PI / 2;
  curl.position.set(0, -0.03, -0.02);
  const tuft = ellipsoid(skin, 0.012, 0.03, 0.012, 8);
  tuft.position.set(0, -0.08, -0.03);
  tail.add(curl, tuft);
  body.add(tail);

  root.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));

  const r = rng(977 + seed);
  const phase = r() * 10;
  return {
    root,
    update(t) {
      t += phase;
      tail.rotation.z = Math.sin(t * (lying ? 1.2 : 5)) * (lying ? 0.2 : 0.6);
      if (lying) {
        // 呼吸：肚子一起一伏；隔一会儿扇一下耳朵、抬一下头
        const br = 1 + Math.sin(t * 1.4) * 0.025;
        torso.scale.y = 0.23 * br;
        belly.scale.y = 0.16 * br;
        head.rotation.x = 0.25 + Math.max(0, Math.sin(t * 0.3) - 0.85) * 1.5;
        const flick = Math.max(0, Math.sin(t * 0.9) - 0.9) * 4;
        ears[0].rotation.x = 0.55 - flick;
        ears[1].rotation.x = 0.55;
      } else {
        // 低头在槽里拱食：头一点一点，偶尔左右拱
        head.rotation.x = 0.55 + Math.sin(t * 3.2) * 0.12;
        head.rotation.y = Math.sin(t * 0.7) * 0.15;
        body.position.y = Math.sin(t * 3.2) * 0.008;
        for (const e of ears) e.rotation.x = 0.55 + Math.sin(t * 3.2 + 0.6) * 0.1;
      }
    },
  };
}

/** 黑猪皮：黑里透灰，稀稀的硬毛，几块蹭上去的泥 */
function pigSkinTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(983);
    g.fillStyle = '#1e1c1c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 10 + r() * 40, r() > 0.5 ? '48,44,44' : '14,12,12', 0.3);
    for (let i = 0; i < 12; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 20, '70,54,40', 0.35);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(${r() > 0.7 ? '120,110,104' : '60,56,54'},0.6)`;
      g.lineWidth = 1;
      const x = r() * w;
      const y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 1, y + 4);
      g.stroke();
    }
  });
}
