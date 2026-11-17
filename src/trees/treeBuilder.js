import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../textures/canvas.js';

/**
 * 通用树木生成器。
 * 1) growSkeleton：递归生长出枝干骨架（每段 = 起点、终点、起止半径、级数）
 * 2) fitSkeleton：整体缩放到目标树高 / 冠幅
 * 3) branchGeometry：每段生成锥形圆管并合并成一个几何体（UV 按米，配合树皮贴图）
 * 4) leafCards：在细枝上撒叶片卡片（InstancedMesh），卡片挂点在底边中央
 */

const UP = new THREE.Vector3(0, 1, 0);

/**
 * @param {object} p 物种参数
 *   trunk: { length, radius, lean, bend, segments }
 *   levels: [{ count:[min,max], angle:[min,max], lengthK, radiusK, along:[t0,t1], upBias, droop }]
 */
export function growSkeleton(p, seed) {
  const r = rng(seed);
  const rand = (a, b) => a + (b - a) * r();
  const segs = [];
  const tips = [];

  function branch(start, dir, length, radius, level, endRadiusK = 0.6) {
    const n = level === 0 ? p.trunk.segments ?? 5 : 3;
    const pts = [start.clone()];
    const d = dir.clone();
    const bend = level === 0 ? p.trunk.bend ?? 0.08 : p.levels[level - 1].bend ?? 0.25;
    // 主干弯曲：trunk.wiggle > 0 时沿一个水平方向做 S 形弯（老树主干不直溜）
    const wiggle = level === 0 ? p.trunk.wiggle ?? 0 : 0;
    const wAxis = new THREE.Vector3(Math.cos(seed * 1.3), 0, Math.sin(seed * 1.3));
    const wAxis2 = new THREE.Vector3(-wAxis.z, 0, wAxis.x);
    const droop = level === 0 ? 0 : p.levels[level - 1].droop ?? 0;
    for (let i = 1; i <= n; i++) {
      d.x += rand(-bend, bend);
      d.z += rand(-bend, bend);
      d.y += rand(-bend, bend) * 0.5 - droop / n;
      if (wiggle) {
        d.addScaledVector(wAxis, wiggle * Math.cos((i / n) * Math.PI * 1.6));
        d.addScaledVector(wAxis2, wiggle * 0.5 * Math.sin((i / n) * Math.PI * 2.2));
      }
      d.normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, length / n));
    }
    const r1 = radius * endRadiusK;
    for (let i = 0; i < n; i++) {
      const ra = radius + (r1 - radius) * (i / n);
      const rb = radius + (r1 - radius) * ((i + 1) / n);
      segs.push({ a: pts[i], b: pts[i + 1], ra, rb, level });
    }
    const L = p.levels[level];
    if (!L) {
      tips.push({ pos: pts[n], dir: d.clone(), points: pts, level });
      return;
    }
    const count = Math.round(rand(L.count[0], L.count[1]));
    for (let c = 0; c < count; c++) {
      const t = L.along ? rand(L.along[0], L.along[1]) : 1;
      const idx = Math.min(n - 1, Math.floor(t * n));
      const f = t * n - idx;
      const pos = pts[idx].clone().lerp(pts[idx + 1], f);
      const parentDir = pts[idx + 1].clone().sub(pts[idx]).normalize();
      // 子枝方向：绕父枝随机方位角，与父枝成 angle 夹角，再向上偏
      const ang = THREE.MathUtils.degToRad(rand(L.angle[0], L.angle[1]));
      const azim = (c / count) * Math.PI * 2 + rand(-0.6, 0.6) + seed;
      const perp = new THREE.Vector3().crossVectors(parentDir, Math.abs(parentDir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      perp.applyAxisAngle(parentDir, azim);
      const cd = parentDir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(perp, Math.sin(ang));
      cd.y += L.upBias ?? 0;
      cd.normalize();
      // 不让粗枝朝下长（主干弯的时候容易出现）
      if (L.minY != null && cd.y < L.minY) {
        cd.y = L.minY;
        cd.normalize();
      }
      const rr = radius + (r1 - radius) * t;
      branch(pos, cd, length * L.lengthK * rand(0.8, 1.15), rr * L.radiusK, level + 1, L.endRadiusK ?? 0.5);
    }
    // 主干末端也算一个叶片着生点
    if (level > 0) tips.push({ pos: pts[n], dir: d.clone(), points: pts, level });
  }

  // 主干（可多干：石榴从基部分出几根）
  const stems = p.stems ?? 1;
  for (let s = 0; s < stems; s++) {
    const lean = p.trunk.lean ?? 0;
    const az = (s / stems) * Math.PI * 2 + rand(0, 1);
    const dir = new THREE.Vector3(Math.cos(az) * lean, 1, Math.sin(az) * lean).normalize();
    branch(new THREE.Vector3(0, 0, 0), dir, p.trunk.length * rand(0.85, 1.1), p.trunk.radius * (stems > 1 ? 0.6 : 1), 0, p.trunk.endRadiusK ?? 0.7);
  }
  return { segs, tips };
}

/** 按目标树高（含叶冠余量 crownPad）和冠幅半径缩放骨架；半径按平均比例缩放 */
export function fitSkeleton(sk, { height, crown, crownPad = 0.8, trunkRadius }) {
  let maxY = 0;
  let maxR = 0;
  for (const s of sk.segs) {
    maxY = Math.max(maxY, s.b.y);
    maxR = Math.max(maxR, Math.hypot(s.b.x, s.b.z));
  }
  const ky = (height - crownPad) / maxY;
  const kr = (crown - crownPad) / Math.max(maxR, 0.01);
  const scale = (v) => v.set(v.x * kr, v.y * ky, v.z * kr);
  const seen = new Set();
  for (const s of sk.segs) {
    for (const v of [s.a, s.b]) if (!seen.has(v)) { seen.add(v); scale(v); }
  }
  for (const t of sk.tips) {
    if (!seen.has(t.pos)) { seen.add(t.pos); scale(t.pos); }
    t.dir.set(t.dir.x * kr, t.dir.y * ky, t.dir.z * kr).normalize();
  }
  // 半径：让主干根部等于指定的 trunkRadius
  const r0 = Math.max(...sk.segs.filter((s) => s.level === 0).map((s) => s.ra));
  const kRad = trunkRadius / r0;
  for (const s of sk.segs) {
    s.ra *= kRad;
    s.rb *= kRad;
  }
  return sk;
}

/** 枝干几何：锥形圆管合并；UV：u 沿周长（米），v 沿长度（米） */
export function branchGeometry(segs, { radial = 8, minRadius = 0.006 } = {}) {
  const geos = [];
  const q = new THREE.Quaternion();
  for (const s of segs) {
    const dir = s.b.clone().sub(s.a);
    const len = dir.length();
    if (len < 1e-4) continue;
    const ra = Math.max(s.ra, minRadius);
    const rb = Math.max(s.rb, minRadius);
    const rs = ra > 0.05 ? radial + 4 : ra > 0.02 ? radial : 5;
    // 略微延长，让相邻两段接缝处重叠
    const g = new THREE.CylinderGeometry(rb, ra, len + Math.min(ra, 0.05), rs, 1, true);
    const uv = g.attributes.uv;
    const circ = 2 * Math.PI * ra;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * len + s.a.y);
    g.translate(0, len / 2, 0);
    q.setFromUnitVectors(UP, dir.normalize());
    g.applyQuaternion(q);
    g.translate(s.a.x, s.a.y, s.a.z);
    geos.push(g);
  }
  return mergeGeometries(geos);
}

/**
 * 叶片卡片：在 tips（以及 tip 所在细枝的点上）撒 count 张卡片。
 * size：卡片边长（米），upTilt：卡片朝上翻的程度
 */
export function leafCards(sk, material, { count, size = [0.6, 1], seed = 1, spread = 0.3, droop = 0.2 }) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const tips = sk.tips;
  for (let i = 0; i < count; i++) {
    const t = tips[Math.floor(r() * tips.length)];
    // 在该细枝靠外的那一半上取点
    const pts = t.points;
    const k = 0.4 + r() * 0.6;
    const idx = Math.min(pts.length - 2, Math.floor(k * (pts.length - 1)));
    const p = pts[idx].clone().lerp(pts[idx + 1], r());
    p.x += (r() - 0.5) * spread;
    p.y += (r() - 0.5) * spread * 0.6;
    p.z += (r() - 0.5) * spread;
    const s = size[0] + (size[1] - size[0]) * r();
    // 卡片朝外：面朝方向 ≈ 离开树心的水平方向，随机偏转；稍微下垂
    const yaw = Math.atan2(p.x, p.z) + (r() - 0.5) * 2.2;
    e.set(-(r() * 0.9 - 0.15) - droop, yaw, (r() - 0.5) * 1.4, 'YXZ');
    q.setFromEuler(e);
    m4.compose(p, q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m4);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 在细枝上找挂果点（向下偏一点） */
export function fruitPoints(sk, count, seed, { minLevel = 1, hang = 0.08 } = {}) {
  const r = rng(seed);
  const tips = sk.tips.filter((t) => t.level >= minLevel);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = tips[Math.floor(r() * tips.length)];
    const pts = t.points;
    const idx = Math.min(pts.length - 2, Math.floor((0.3 + r() * 0.7) * (pts.length - 1)));
    const p = pts[idx].clone().lerp(pts[idx + 1], r());
    p.y -= hang;
    out.push(p);
  }
  return out;
}

/** 碰撞体：一根看不见的圆柱罩住主干下部（第 6 步第一人称碰撞用） */
export function trunkCollider(radius, height = 2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 8), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.y = height / 2;
  m.userData.solid = true;
  return m;
}
