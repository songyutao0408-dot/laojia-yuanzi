import * as THREE from 'three';
import { VIEWS, NORTH_HOUSE as NH, KITCHEN as K, WEST_ROOM as WR } from '../layout.js';
import { resolveCollisions, groundHeight } from './colliders.js';

/**
 * “走进去”：第一人称漫步，视线高度 1.2 m（七八岁小孩）。
 * - 电脑：W A S D / 方向键走动，Shift 跑；按住鼠标拖动转头（不锁定鼠标，点哪里就是哪里）
 * - 手机：左下角虚拟摇杆走动，右半屏滑动转头（见 touch.js）
 * - 碰撞：不能穿墙穿树；台阶自动一级级走上去，北屋室内地坪 0.45 m
 * - 进门辅助：走到门口附近、朝门走时，自动往门洞中线靠，斜着走也能顺进去
 */
const RADIUS = 0.17;
const WALK = 1.5; // m/s，小孩走路
const RUN = 3.0;
const STEP_UP = 0.22; // 一次最多迈上去的高度

/** 门洞：pos 沿墙方向的中心、at 墙中线、axis 墙的走向、half 半宽 */
const DOORWAYS = [
  ...NH.rooms.map((r) => ({ axis: 'x', pos: r.door.x, at: NH.rect.z1 - NH.wall / 2, half: r.door.width / 2 - 0.07 })),
  { axis: 'z', pos: K.door.z, at: K.rect.x1 - K.wall / 2, half: K.door.width / 2 - 0.07 },
  // 西北屋外屋通里屋的小门洞
  { axis: 'z', pos: WR.origin.z + WR.innerDoor.z, at: WR.origin.x + WR.partition.x, half: WR.innerDoor.width / 2 - 0.05 },
];

/** 朝门洞走时把人往门洞中线拉（dirX/dirZ 为这一帧的移动方向） */
function doorAssist(p, dirX, dirZ, dt) {
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6) return;
  dirX /= len;
  dirZ /= len;
  for (const d of DOORWAYS) {
    const along = d.axis === 'x' ? p.x - d.pos : p.z - d.pos; // 偏离门洞中线多少
    const toWall = d.axis === 'x' ? d.at - p.z : d.at - p.x; // 到墙中线的距离（带方向）
    const moveToWall = d.axis === 'x' ? dirZ * Math.sign(toWall) : dirX * Math.sign(toWall);
    if (Math.abs(toWall) > 1.6 || Math.abs(along) > d.half + 0.8 || moveToWall < 0.3) continue;
    const free = d.half - RADIUS - 0.03; // 不用拉的范围
    if (Math.abs(along) <= free) continue;
    const k = Math.min(Math.abs(along) - free, 2.0 * dt) * Math.sign(along);
    if (d.axis === 'x') p.x -= k;
    else p.z -= k;
  }
}

export function createFirstPerson(camera, dom, getColliders) {
  const state = {
    enabled: false,
    pos: new THREE.Vector3(),
    feet: 0,
    yaw: 0, // 0 = 面朝北（-Z），正值向西转
    pitch: 0,
    keys: new Set(),
    move: new THREE.Vector2(), // 摇杆输入：x 右、y 前
    locked: false,
  };

  function reset() {
    const s = VIEWS.walkStart;
    state.pos.set(s.x, 0, s.z);
    state.feet = groundHeight(s.x, s.z);
    state.yaw = Math.atan2(-s.look[0], -s.look[1]);
    state.pitch = 0.03;
    apply();
  }

  function apply() {
    camera.up.set(0, 1, 0);
    camera.position.set(state.pos.x, state.feet + VIEWS.eyeHeight, state.pos.z);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }

  // —— 键盘 ——
  const onKey = (e, down) => {
    if (!state.enabled) return;
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(k)) {
      down ? state.keys.add(k) : state.keys.delete(k);
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', () => state.keys.clear());

  // —— 鼠标转头 ——
  const look = (dx, dy, k = 0.0025) => {
    state.yaw -= dx * k;
    state.pitch = Math.max(-1.3, Math.min(1.3, state.pitch - dy * k));
  };
  let drag = null;
  dom.addEventListener('pointerdown', (e) => {
    if (!state.enabled || e.pointerType === 'touch') return;
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  });
  window.addEventListener('pointermove', (e) => {
    if (!state.enabled || e.pointerType === 'touch') return;
    if (state.locked) look(e.movementX, e.movementY, 0.0022);
    else if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      look(dx, dy, 0.004);
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (!state.enabled || e.pointerType === 'touch' || !drag) return;
    drag = null;
  });
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === dom;
  });

  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  function update(dt) {
    if (!state.enabled) return;
    const k = state.keys;
    let mx = state.move.x;
    let my = state.move.y;
    if (k.has('KeyW') || k.has('ArrowUp')) my += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
    if (k.has('KeyD')) mx += 1;
    if (k.has('KeyA')) mx -= 1;
    if (k.has('ArrowLeft')) state.yaw += 1.8 * dt;
    if (k.has('ArrowRight')) state.yaw -= 1.8 * dt;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    if (len > 0.01) {
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK;
      fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
      right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
      const next = state.pos.clone().addScaledVector(fwd, my * speed * dt).addScaledVector(right, mx * speed * dt);
      doorAssist(next, next.x - state.pos.x, next.z - state.pos.z, dt);
      // 太高的台阶上不去（当作墙）
      const g = groundHeight(next.x, next.z);
      if (g - state.feet <= STEP_UP) {
        resolveCollisions(getColliders(), next, RADIUS, Math.max(g, state.feet));
        state.pos.x = next.x;
        state.pos.z = next.z;
      }
    }
    // 脚底平滑地贴合地面（上下台阶不突兀）
    const target = groundHeight(state.pos.x, state.pos.z);
    state.feet += (target - state.feet) * Math.min(1, dt * 12);
    // 走路时视线轻微起伏
    const bob = len > 0.01 ? Math.sin(performance.now() * 0.011) * 0.012 : 0;
    apply();
    camera.position.y += bob;
  }

  return {
    state,
    reset,
    update,
    look,
    setMove: (x, y) => state.move.set(x, y),
    enable(on) {
      state.enabled = on;
      state.keys.clear();
      state.move.set(0, 0);
      if (!on && document.pointerLockElement === dom) document.exitPointerLock();
    },
    get position() {
      return state.pos;
    },
  };
}
