import * as THREE from 'three';

/**
 * 秋千：两根麻绳绑在枣树弯出来的那根枝干上，下面一块旧木板。
 * 平时随风轻轻晃；push() 推一把，荡起来再慢慢停下。
 * a、b 为两个绑绳点（树的局部坐标），seatY 为座板高度。
 */
export function createSwing(a, b, seatY) {
  const pivot = new THREE.Group();
  pivot.name = 'swing';
  pivot.rotation.order = 'YXZ'; // 先转到沿枝干的方向，再绕枝干摆
  const mid = a.clone().add(b).multiplyScalar(0.5);
  pivot.position.copy(mid);
  // 局部 x 轴沿枝干（两绑绳点连线），绕它摆动
  const axis = b.clone().sub(a).setY(0).normalize();
  pivot.rotation.y = Math.atan2(-axis.z, axis.x);
  const half = a.distanceTo(b) / 2;
  const len = mid.y - seatY;

  const rope = new THREE.MeshStandardMaterial({ color: 0xa08a5c, roughness: 1 });
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 6), rope);
    r.position.set(s * half, -len / 2, 0);
    r.castShadow = true;
    pivot.add(r);
    // 绑在枝干上的绳结
    const knot = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), rope);
    knot.position.set(s * half, 0, 0);
    knot.rotation.y = Math.PI / 2;
    pivot.add(knot);
  }
  // 座板：一块旧木板，两头钻眼穿绳
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(half * 2 + 0.12, 0.035, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.85 }),
  );
  seat.position.y = -len;
  seat.castShadow = seat.receiveShadow = true;
  pivot.add(seat);

  let amp = 0;
  let phase = 0;
  const period = 2 * Math.PI * Math.sqrt(len / 9.8);
  return {
    object: pivot,
    get position() {
      return pivot.getWorldPosition(new THREE.Vector3());
    },
    push() {
      amp = Math.min(0.75, amp + 0.4);
    },
    update(dt, t) {
      phase += (dt / period) * Math.PI * 2;
      amp *= Math.exp(-dt * 0.12); // 慢慢停下
      const idle = Math.sin(t * 0.9) * 0.025; // 风吹得轻轻晃
      pivot.rotation.x = amp * Math.sin(phase) + idle;
    },
  };
}
