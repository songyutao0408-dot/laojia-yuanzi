import * as THREE from 'three';

/**
 * 人物/动物用的小工具：
 * - Limb：两点之间的一段“肢体”（锥台 + 两头圆球），每帧可重新摆
 * - solveTwoBone：两段骨骼（大臂 + 小臂）的解析 IK，给定肩、目标和肘部朝向，求肘的位置
 */
const UP = new THREE.Vector3(0, 1, 0);

export class Limb {
  /** r0 起点半径、r1 终点半径；sx/sz 截面压扁比例（例如前臂略扁） */
  constructor(material, r0, r1, { radial = 12, sx = 1, sz = 1, caps = true } = {}) {
    this.group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(r1, r0, 1, radial, 1, true).translate(0, 0.5, 0);
    geo.scale(sx, 1, sz);
    this.body = new THREE.Mesh(geo, material);
    this.body.castShadow = this.body.receiveShadow = true;
    this.group.add(this.body);
    if (caps) {
      this.capA = new THREE.Mesh(new THREE.SphereGeometry(r0, radial, 8).scale(sx, 1, sz), material);
      this.capB = new THREE.Mesh(new THREE.SphereGeometry(r1, radial, 8).scale(sx, 1, sz), material);
      for (const c of [this.capA, this.capB]) {
        c.castShadow = true;
        this.group.add(c);
      }
    }
    this.q = new THREE.Quaternion();
    this.d = new THREE.Vector3();
  }
  /** a、b 为同一父坐标系下的两个端点；twist 绕自身轴转（让压扁的截面朝向对） */
  set(a, b, twist = 0) {
    this.d.subVectors(b, a);
    const len = this.d.length();
    this.q.setFromUnitVectors(UP, this.d.normalize());
    if (twist) this.q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, twist));
    this.body.position.copy(a);
    this.body.quaternion.copy(this.q);
    this.body.scale.set(1, len, 1);
    if (this.capA) {
      this.capA.position.copy(a);
      this.capA.quaternion.copy(this.q);
      this.capB.position.copy(b);
      this.capB.quaternion.copy(this.q);
    }
  }
}

/**
 * 两段骨骼 IK：肩 S、目标 T、大臂长 a、小臂长 b、pole 为肘部大致朝向（世界/父坐标方向）。
 * 返回 { elbow, end }，end 为够得着的终点（够不着时沿方向伸直）。
 */
export function solveTwoBone(S, T, a, b, pole) {
  const dir = new THREE.Vector3().subVectors(T, S);
  let d = dir.length();
  dir.normalize();
  d = Math.min(d, a + b - 1e-4);
  d = Math.max(d, Math.abs(a - b) + 1e-4);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const ang = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
  // 弯曲平面：由 dir 和 pole 决定
  const p = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const elbow = S.clone()
    .addScaledVector(dir, Math.cos(ang) * a)
    .addScaledVector(p, Math.sin(ang) * a);
  const end = S.clone().addScaledVector(dir, d);
  return { elbow, end };
}

/** 椭球：半轴 rx, ry, rz */
export function ellipsoid(material, rx, ry, rz, seg = 24) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.66)), material);
  m.scale.set(rx, ry, rz);
  m.castShadow = m.receiveShadow = true;
  return m;
}
