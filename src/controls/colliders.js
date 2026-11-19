import * as THREE from 'three';
import { NORTH_HOUSE as NH, KITCHEN as K, LOT, BACK_YARD } from '../layout.js';

/**
 * 第一人称碰撞（俯视平面上的 2D 碰撞 + 高度过滤）：
 * - 从场景里收集 userData.solid = true 的 Mesh，每个变成一个“可旋转的矩形”（中心、两条轴、半宽），
 *   并记下它的高度范围；只有和“膝盖到头顶”这一段重叠的才挡人（台阶、门槛不挡，屋顶不挡）
 * - 玩家是半径 r 的圆，和矩形求最近点后推开
 * - groundHeight(x, z) 给出脚下地面高度：台阶逐级抬高，北屋室内 0.45 m，厨房 0.05 m
 */
export function buildColliders(scene) {
  scene.updateMatrixWorld(true);
  const list = [];
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || !o.userData.solid || o.isInstancedMesh) return;
    const g = o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    box.copy(g.boundingBox);
    const e = o.matrixWorld.elements;
    const ax = new THREE.Vector2(e[0], e[2]);
    const az = new THREE.Vector2(e[8], e[10]);
    const sx = ax.length();
    const sz = az.length();
    if (sx < 1e-6 || sz < 1e-6) return;
    ax.divideScalar(sx);
    az.divideScalar(sz);
    box.getCenter(v).applyMatrix4(o.matrixWorld);
    // 世界坐标下的高度范围
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) {
      const p = new THREE.Vector3(cx, cy, cz).applyMatrix4(o.matrixWorld);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
    const hx = ((box.max.x - box.min.x) / 2) * sx;
    const hz = ((box.max.z - box.min.z) / 2) * sz;
    list.push({ cx: v.x, cz: v.z, ax, az, hx, hz, y0, y1, reach: Math.hypot(hx, hz), name: o.name || o.parent?.name });
  });
  return list;
}

/**
 * 把位置 p（{x,z}）从所有碰撞体里推出去。feetY 为脚底高度，height 为身高。
 * 迭代几次以处理墙角。
 */
export function resolveCollisions(colliders, p, radius, feetY, height = 1.3) {
  const lo = feetY + 0.22; // 膝盖以下（台阶、门槛）不挡
  const hi = feetY + height;
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const c of colliders) {
      if (c.y1 < lo || c.y0 > hi) continue;
      const dx = p.x - c.cx;
      const dz = p.z - c.cz;
      if (Math.abs(dx) > c.reach + radius || Math.abs(dz) > c.reach + radius) continue;
      const lx = dx * c.ax.x + dz * c.ax.y;
      const lz = dx * c.az.x + dz * c.az.y;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx));
      const qz = Math.max(-c.hz, Math.min(c.hz, lz));
      let ox = lx - qx;
      let oz = lz - qz;
      const d = Math.hypot(ox, oz);
      if (d >= radius) continue;
      let push;
      if (d > 1e-6) {
        push = radius - d;
        ox /= d;
        oz /= d;
      } else {
        // 圆心已经在矩形里：沿穿透最浅的方向推出
        const px = c.hx - Math.abs(lx);
        const pz = c.hz - Math.abs(lz);
        if (px < pz) {
          ox = Math.sign(lx) || 1;
          oz = 0;
          push = px + radius;
        } else {
          ox = 0;
          oz = Math.sign(lz) || 1;
          push = pz + radius;
        }
      }
      // 局部方向 → 世界方向
      p.x += (ox * c.ax.x + oz * c.az.x) * push;
      p.z += (ox * c.ax.y + oz * c.az.y) * push;
      moved = true;
    }
    if (!moved) break;
  }
  // 院外最多走出去 25 m
  const lim = 25;
  p.x = Math.max(LOT.x0 - lim, Math.min(LOT.x1 + lim, p.x));
  p.z = Math.max(LOT.z0 - lim, Math.min(LOT.z1 + lim, p.z));
  return p;
}

/** 脚下地面高度 */
export function groundHeight(x, z) {
  const r = NH.rect;
  // 北屋室内（含门洞下的门槛位置）
  if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return NH.floor;
  // 台阶（两间屋连通的一长溜）：越靠近墙越高
  const st = NH.steps;
  if (x >= st.x0 && x <= st.x1 && z >= r.z1 && z <= r.z1 + st.run * st.count) {
    const fromWall = z - r.z1;
    const i = st.count - 1 - Math.floor(fromWall / st.run); // 0 = 最外一级
    return st.rise * (Math.max(0, i) + 1);
  }
  // 青石板：可以踩上去（叠着的那块更高）
  let h = 0;
  const { l, w, t } = BACK_YARD.slabSize;
  for (const sl of BACK_YARD.slabs) {
    const a = (-sl.rot * Math.PI) / 180;
    const dx = x - sl.x;
    const dz = z - sl.z;
    const lx = dx * Math.cos(a) + dz * Math.sin(a);
    const lz = -dx * Math.sin(a) + dz * Math.cos(a);
    if (Math.abs(lx) <= l / 2 && Math.abs(lz) <= w / 2) h = Math.max(h, sl.y + t);
  }
  if (h > 0) return h;
  const k = K.rect;
  if (x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1) return K.floor;
  return 0;
}
