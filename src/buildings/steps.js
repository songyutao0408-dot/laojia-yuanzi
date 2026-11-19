import * as THREE from 'three';
import { NORTH_HOUSE as NH } from '../layout.js';
import { box } from '../core/box.js';
import { mat, coupletMat } from '../textures/index.js';
import { rng } from '../textures/canvas.js';

/**
 * 北屋门前连通两间屋的 3 级台阶：砖砌成形，外面（踏面、立面、两头）抹一层石灰。
 * 石灰用旧了发黄发灰，边角零星掉皮露出里面的红砖（贴图里有掉皮，另外在几个棱角上再做几处缺口）。
 */
export function createSteps() {
  const g = new THREE.Group();
  g.name = 'steps';
  const st = NH.steps;
  const lime = mat('lime');
  const z1 = NH.rect.z1;
  for (let i = 0; i < st.count; i++) {
    const top = st.rise * (i + 1);
    const depth = st.run * (st.count - i);
    // 只做这一级露出来的那层（下面几级被上面的压着），每一级都从地面起砌，避免看到缝
    g.add(box(st.x0, st.x1, 0, top, z1, z1 + depth, lime, { solid: false }));
  }
  // 棱角上几处掉了石灰、露出砖的缺口
  const r = rng(404);
  const brick = mat('brick');
  for (let k = 0; k < 9; k++) {
    const i = Math.floor(r() * st.count);
    const top = st.rise * (i + 1);
    const edgeZ = z1 + st.run * (st.count - i);
    const x = st.x0 + 0.3 + r() * (st.x1 - st.x0 - 0.6);
    const w = 0.08 + r() * 0.18;
    g.add(box(x, x + w, top - 0.05 - r() * 0.04, top - 0.004, edgeZ - 0.03, edgeZ + 0.004, brick, { solid: false, shadow: false }));
  }
  return g;
}

/**
 * 天地神位：两间屋中间墙根下、最上一级台阶上，一个砖砌抹灰的小神龛。
 * 龛里贴红纸“天地神位”，顶上一个小瓦檐，龛前小香炉插三炷香，炉里落着香灰。
 */
export function createShrine() {
  const g = new THREE.Group();
  g.name = 'shrine';
  const s = NH.shrine;
  const lime = mat('lime');
  const zWall = NH.rect.z1; // 南墙外皮
  const y0 = NH.floor; // 最上一级台阶面
  const x0 = s.x - s.width / 2;
  const x1 = s.x + s.width / 2;
  const z1 = zWall + s.depth;
  const baseH = 0.5;
  // 台座
  g.add(box(x0, x1, y0, y0 + baseH, zWall, z1, lime));
  // 台座上沿一道挑出的线脚
  g.add(box(x0 - 0.03, x1 + 0.03, y0 + baseH, y0 + baseH + 0.05, zWall, z1 + 0.03, lime, { solid: false }));
  // 龛身：左右两个立柱 + 后板 + 顶板，中间是龛洞
  const nb = y0 + baseH + 0.05; // 龛底
  const nh = 0.48; // 龛洞高
  const t = 0.08;
  const nx0 = x0 + 0.05;
  const nx1 = x1 - 0.05;
  g.add(box(nx0, nx0 + t, nb, nb + nh, zWall, z1 - 0.02, lime, { solid: false }));
  g.add(box(nx1 - t, nx1, nb, nb + nh, zWall, z1 - 0.02, lime, { solid: false }));
  g.add(box(nx0 + t, nx1 - t, nb, nb + nh, zWall, zWall + 0.06, lime, { solid: false }));
  g.add(box(nx0 - 0.02, nx1 + 0.02, nb + nh, nb + nh + 0.07, zWall, z1, lime, { solid: false }));
  // 小瓦檐：两面坡，深灰小青瓦
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x4a4a48, roughness: 0.85 });
  const roofY = nb + nh + 0.07;
  const eaveW = x1 - x0 + 0.16;
  const slope = new THREE.BoxGeometry(eaveW, 0.025, s.depth * 0.62 + 0.06);
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(slope, tileMat);
    m.position.set(s.x, roofY + 0.06, zWall + s.depth / 2 + side * s.depth * 0.25);
    m.rotation.x = side * 0.5;
    m.castShadow = true;
    g.add(m);
  }
  const ridge = box(x0 - 0.08, x1 + 0.08, roofY + 0.1, roofY + 0.14, zWall + s.depth / 2 - 0.025, zWall + s.depth / 2 + 0.025, tileMat, { solid: false });
  g.add(ridge);
  // 龛里：红纸神位
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.4), coupletMat('天地神位', { fade: 0.35, seed: 31 }));
  paper.position.set(s.x, nb + nh / 2, zWall + 0.065);
  g.add(paper);
  // 龛洞内壁熏得发黑一点
  const soot = new THREE.Mesh(new THREE.PlaneGeometry(nx1 - nx0 - 2 * t, nh), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1, transparent: true, opacity: 0.55 }));
  soot.position.set(s.x, nb + nh / 2, zWall + 0.0605);
  g.add(soot);
  // 香炉：小陶炉 + 三炷香
  const burner = new THREE.Group();
  burner.position.set(s.x, nb, zWall + 0.2);
  const prof = [[0, 0], [0.05, 0], [0.055, 0.01], [0.075, 0.06], [0.07, 0.085], [0.064, 0.085], [0.06, 0.07]].map(([a, b]) => new THREE.Vector2(a, b));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), new THREE.MeshStandardMaterial({ color: 0x3e3326, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }));
  pot.castShadow = true;
  burner.add(pot);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb8b0a4, roughness: 1 }));
  ash.position.y = 0.072;
  burner.add(ash);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0xa83a2a, roughness: 0.9 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff7a30 });
  [-0.025, 0, 0.025].forEach((dx, i) => {
    const h = 0.16 - i * 0.025;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, h, 4), stickMat);
    stick.position.set(dx, 0.072 + h / 2, (i - 1) * 0.008);
    stick.rotation.z = dx * 1.5;
    burner.add(stick);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 4), emberMat);
    ember.position.set(dx + Math.sin(dx * 1.5) * -h / 2, 0.072 + h, (i - 1) * 0.008);
    burner.add(ember);
  });
  g.add(burner);
  return g;
}
