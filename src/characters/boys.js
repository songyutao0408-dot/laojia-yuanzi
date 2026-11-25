import * as THREE from 'three';
import { CHARACTERS } from '../layout.js';
import { box } from '../core/box.js';
import { createPerson, clothTex } from './person.js';

/**
 * 枣树下荡秋千的两个男孩（第 17 轮，用户要求）：
 * - 6 岁的坐在秋千座板上，两手抓着绳子，两条腿耷拉着跟着前后甩（挂在秋千上，跟着一起摆）
 * - 8 岁的站在后面，秋千荡回来的时候伸手在他背上轻轻一推（秋千一直小幅度地荡着：swing.keepAmp）
 * 6 岁的面朝院子西南（大门那边），8 岁的站在他背后。
 */
const FACE = new THREE.Vector2(-0.6, 0.8); // 坐秋千的大致面朝方向（世界 xz）

export function createBoys(swing) {
  const B = CHARACTERS.boys;
  const group = new THREE.Group();
  group.name = 'boys';
  swing.keepAmp = 0.2;
  const pivot = swing.object;
  pivot.updateWorldMatrix(true, false);

  // 秋千的前后方向：pivot 局部 +z 在世界里朝哪
  const q = new THREE.Quaternion();
  pivot.getWorldQuaternion(q);
  const fz = new THREE.Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
  const flip = fz.x * FACE.x + fz.z * FACE.y < 0; // 让坐着的孩子面朝 FACE
  const facing = flip ? fz.clone().negate() : fz.clone();

  // —— 6 岁：坐在秋千上 ——
  const rider = createPerson({
    name: 'rider',
    height: B.rider.height,
    child: true,
    skin: 0xd8a27c,
    face: { brows: 2.6, blush: 0.22, lips: '#b8645c' },
    hair: 'short',
    top: { color: 0xc8443a, sleeve: 'short' },
    bottom: { color: 0x2a3a58, kind: 'shorts' },
    shoes: { color: 0x7a5434, sole: 0x5a3a24 },
  });
  const riderRoot = new THREE.Group();
  riderRoot.rotation.y = flip ? Math.PI : 0;
  riderRoot.add(rider.body);
  swing.seat.add(riderRoot);
  const half = swing.ropeHalf;
  const R = {
    pelvis: new THREE.Vector3(0, 0.06, -0.03),
    pitch: -0.04,
    feet: [new THREE.Vector3(-0.07, -0.19, 0.3), new THREE.Vector3(0.07, -0.19, 0.3)],
    knee: [new THREE.Vector3(0, 0.3, 1), new THREE.Vector3(0, 0.3, 1)],
    hands: [new THREE.Vector3(-half + 0.015, 0.33, 0.01), new THREE.Vector3(half - 0.015, 0.33, 0.01)],
    elbow: [new THREE.Vector3(-0.35, -1, -0.1), new THREE.Vector3(0.35, -1, -0.1)],
    headPitch: 0.05,
    footYaw: 0.05,
  };

  // —— 8 岁：站在后面推 ——
  const pusher = createPerson({
    name: 'pusher',
    height: B.pusher.height,
    child: true,
    skin: 0xd2996f,
    face: { brows: 2.8, blush: 0.16, lips: '#ae5e54' },
    hair: 'short',
    top: { map: clothTex('stripe', '#f2f0ea', '#24305a', [5, 5]), sleeve: 'short' },
    bottom: { color: 0x34443a, kind: 'shorts' },
    shoes: { color: 0x1c1a1a, sole: 0xe0dad0 },
  });
  const pusherRoot = new THREE.Group();
  pusherRoot.add(pusher.body);
  // 座板静止时的位置（世界）往后退 behind
  const seatRest = new THREE.Vector3(0, -swing.length, 0);
  pivot.localToWorld(seatRest);
  pusherRoot.position.set(seatRest.x - facing.x * B.pusher.behind, 0, seatRest.z - facing.z * B.pusher.behind);
  pusherRoot.rotation.y = Math.atan2(facing.x, facing.z); // 局部 +z 朝着秋千
  pusherRoot.add(box(-0.2, 0.2, 0, 1.2, -0.2, 0.2, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false }));
  group.add(pusherRoot);

  const hip = (B.pusher.height * (0.232 * 2 + 0.04));
  const Pp = {
    pelvis: new THREE.Vector3(0, hip - 0.02, 0),
    pitch: 0.12,
    feet: [new THREE.Vector3(-0.09, 0.05, -0.14), new THREE.Vector3(0.09, 0.05, 0.16)],
    knee: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1)],
    hands: [new THREE.Vector3(), new THREE.Vector3()],
    elbow: [new THREE.Vector3(-0.6, -1, -0.3), new THREE.Vector3(0.6, -1, -0.3)],
    headPitch: 0.1,
    footYaw: 0.15,
  };
  const reach = pusher.dims.ua + pusher.dims.fa;
  const back = new THREE.Vector3();
  const rest = [new THREE.Vector3(-0.12, hip + 0.15, 0.3), new THREE.Vector3(0.12, hip + 0.15, 0.3)];

  function place(t) {
    // 坐着的：两条腿跟着秋千前后甩
    const a = swing.angle;
    const kick = Math.max(-1, Math.min(1, a / 0.25));
    const s = flip ? -1 : 1; // 秋千往“前”荡的时候 angle 的符号
    for (const f of R.feet) {
      f.z = 0.28 - s * kick * 0.07;
      f.y = -0.19 + s * kick * 0.03;
    }
    R.pitch = -0.04 + s * kick * 0.06;
    rider.pose(R);

    // 推的：孩子的后背（世界 → 推的人的身体坐标）
    pusherRoot.updateMatrixWorld(true);
    riderRoot.updateMatrixWorld(true);
    back.set(0, 0.28, -0.1);
    riderRoot.localToWorld(back);
    pusher.body.worldToLocal(back);
    const w = Math.max(0, Math.min(1, (reach + 0.08 - back.distanceTo(pusher.shoulder(0))) / 0.16));
    Pp.pitch = 0.12 + w * 0.12;
    pusher.pose(Pp); // 先按上身的新角度摆一遍，肩膀的位置才对
    for (let i = 0; i < 2; i++) {
      const target = back.clone().add(new THREE.Vector3(i ? 0.07 : -0.07, 0, 0));
      Pp.hands[i].copy(rest[i]).lerp(target, w);
    }
    Pp.headPitch = 0.1 + w * 0.1;
    pusher.pose(Pp);
  }
  place(0);

  return {
    group,
    update(dt, t) {
      place(t);
    },
  };
}
