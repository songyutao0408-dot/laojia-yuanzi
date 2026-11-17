import * as THREE from 'three';
import { box } from '../core/box.js';
import { mat, coupletMat, fuMat } from '../textures/index.js';

/**
 * 八九十年代农村木门窗。所有函数用“沿墙坐标系”描述，再按墙的朝向放进世界：
 *   along = 沿墙方向坐标，at = 墙中线坐标，axis = 'x'（东西向墙）| 'z'（南北向墙）
 *   out = 室外方向（+1 / -1，沿墙法线轴）
 */
function placer(axis, at) {
  // 把 (along, y, n) 转成世界坐标，n 为沿墙法线方向的偏移
  return axis === 'x' ? (a, y, n) => new THREE.Vector3(a, y, at + n) : (a, y, n) => new THREE.Vector3(at + n, y, a);
}
function bx(axis, at, a0, a1, y0, y1, n0, n1, material, opts) {
  return axis === 'x' ? box(a0, a1, y0, y1, at + n0, at + n1, material, opts) : box(at + n0, at + n1, y0, y1, a0, a1, material, opts);
}

/**
 * 木门：门框 + 门槛 + 1 或 2 扇门板（向室内开 openDeg 度）+ 门扇上的“福”。
 */
export function woodDoor({ axis, at, center, width, bottom, height, thickness, out, leaves = 2, openDeg = 75 }) {
  const g = new THREE.Group();
  const wood = mat('wood');
  const f = 0.07; // 门框宽
  const fd = Math.min(0.12, thickness); // 门框深
  const n0 = -fd / 2;
  const n1 = fd / 2;
  const a0 = center - width / 2;
  const a1 = center + width / 2;
  g.add(bx(axis, at, a0, a0 + f, bottom, bottom + height, n0, n1, wood));
  g.add(bx(axis, at, a1 - f, a1, bottom, bottom + height, n0, n1, wood));
  g.add(bx(axis, at, a0, a1, bottom + height - f, bottom + height, n0, n1, wood, { solid: false }));
  // 门槛（低矮，不挡人）
  g.add(bx(axis, at, a0 + f, a1 - f, bottom, bottom + 0.08, n0, n1, wood, { solid: false }));

  const P = placer(axis, at);
  const clear = width - 2 * f;
  const lw = clear / leaves;
  const lt = 0.04;
  const lh = height - f - 0.1;
  const fu = fuMat();
  for (let i = 0; i < leaves; i++) {
    const leftSide = i === 0;
    const hingeA = leftSide ? a0 + f : a1 - f;
    const pivot = new THREE.Group();
    pivot.position.copy(P(hingeA, bottom + 0.09, -out * (fd / 2 - lt / 2)));
    const dir = leftSide ? 1 : -1; // 门板从铰链朝洞口中心伸展
    const leaf = new THREE.Group();
    // 门板（局部坐标：沿墙方向 = a，法线方向 = n）
    const L = (la0, la1, y0, y1, ln0, ln1, m, o) => (axis === 'x' ? box(la0, la1, y0, y1, ln0, ln1, m, o) : box(ln0, ln1, y0, y1, la0, la1, m, o));
    const s0 = dir > 0 ? 0 : -lw;
    const s1 = dir > 0 ? lw : 0;
    leaf.add(L(s0, s1, 0, lh, -lt / 2, lt / 2, wood));
    // 门板外侧的上下冒头、中腰（略凸出）
    for (const [y0, y1] of [[0.05, 0.15], [lh * 0.48, lh * 0.55], [lh - 0.15, lh - 0.05]]) {
      leaf.add(L(s0 + 0.03, s1 - 0.03, y0, y1, out * lt / 2 - 0.006, out * lt / 2 + 0.006, wood, { solid: false }));
    }
    // 倒贴的福
    const fuSize = Math.min(0.3, lw * 0.7);
    const fuMesh = new THREE.Mesh(new THREE.PlaneGeometry(fuSize, fuSize), fu);
    const fp = (s0 + s1) / 2;
    if (axis === 'x') {
      fuMesh.position.set(fp, lh * 0.72, out * (lt / 2 + 0.008));
      if (out < 0) fuMesh.rotation.y = Math.PI;
    } else {
      fuMesh.position.set(out * (lt / 2 + 0.008), lh * 0.72, fp);
      fuMesh.rotation.y = out > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    leaf.add(fuMesh);
    pivot.add(leaf);
    // 向室内开：绕竖轴转，使门板远端朝 -out 方向
    const ang = (openDeg * Math.PI) / 180;
    const sign = axis === 'x' ? dir * out : -dir * out;
    pivot.rotation.y = sign * ang;
    pivot.userData.isDoorLeaf = true;
    g.add(pivot);
  }
  return g;
}

/**
 * 木框玻璃窗：外框 + 中梃 + 上亮子横档 + 窗扇小格（玻璃本身由墙体洞口生成）。
 */
export function woodWindow({ axis, at, center, width, bottom, height, cols = 2, rows = 3 }) {
  const g = new THREE.Group();
  const wood = mat('wood');
  const f = 0.06;
  const d = 0.08;
  const a0 = center - width / 2;
  const a1 = center + width / 2;
  const y0 = bottom;
  const y1 = bottom + height;
  const B = (p0, p1, q0, q1, dd = d) => g.add(bx(axis, at, p0, p1, q0, q1, -dd / 2, dd / 2, wood, { solid: false }));
  B(a0, a0 + f, y0, y1);
  B(a1 - f, a1, y0, y1);
  B(a0, a1, y0, y0 + f);
  B(a0, a1, y1 - f, y1);
  const transom = y1 - f - (height - 2 * f) * 0.28;
  B(a0 + f, a1 - f, transom - 0.025, transom + 0.025); // 上亮子横档
  // 下部窗扇：中梃 + 小格窗棂
  const mid = (a0 + a1) / 2;
  B(mid - 0.025, mid + 0.025, y0 + f, transom);
  const sashW = (width - 2 * f) / cols;
  for (let c = 0; c < cols; c++) {
    const s0 = a0 + f + c * sashW;
    for (let r = 1; r < rows; r++) {
      const y = y0 + f + ((transom - y0 - f) * r) / rows;
      B(s0 + 0.02, s0 + sashW - 0.02, y - 0.012, y + 0.012, 0.03);
    }
    const xm = s0 + sashW / 2;
    B(xm - 0.012, xm + 0.012, y0 + f, transom, 0.03);
  }
  // 上亮子分两格
  B(mid - 0.015, mid + 0.015, transom, y1 - f, 0.04);
  return g;
}

/**
 * 门两侧的春联 + 门楣上的横批，贴在外墙面上。
 * texts: { left, right, top }；left/right 指站在门外面朝门时的左右
 */
export function couplets({ axis, at, center, width, top, out, wallHalf, texts, fade = 0.55 }) {
  const g = new THREE.Group();
  const n = out * (wallHalf + 0.003);
  const stripW = 0.2;
  const len = (s) => [...s].length;
  const place = (mesh, a, y) => {
    if (axis === 'x') {
      mesh.position.set(a, y, at + n);
      if (out < 0) mesh.rotation.y = Math.PI;
    } else {
      mesh.position.set(at + n, y, a);
      mesh.rotation.y = out > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    g.add(mesh);
  };
  // 站在门外面朝门：axis='x' 且 out=+1（朝南）时，左手 = 西 = -X
  const leftSign = axis === 'x' ? -out : out;
  const h = stripW * len(texts.left) * 0.95;
  const gap = 0.06;
  const L = new THREE.Mesh(new THREE.PlaneGeometry(stripW, h), coupletMat(texts.left, { fade, seed: 11 }));
  const R = new THREE.Mesh(new THREE.PlaneGeometry(stripW, h), coupletMat(texts.right, { fade, seed: 12 }));
  place(L, center + leftSign * (width / 2 + gap + stripW / 2), top - h / 2);
  place(R, center - leftSign * (width / 2 + gap + stripW / 2), top - h / 2);
  if (texts.top) {
    const tw = stripW * len(texts.top) * 0.95;
    const T = new THREE.Mesh(new THREE.PlaneGeometry(tw, stripW), coupletMat(texts.top, { vertical: false, fade, seed: 13 }));
    place(T, center, top + 0.2 + stripW / 2);
  }
  // 贴春联的地方之前贴过的残纸
  return g;
}
