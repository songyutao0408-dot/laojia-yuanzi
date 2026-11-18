import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VIEWS } from '../layout.js';
import { createFirstPerson } from './firstPerson.js';
import { buildColliders } from './colliders.js';

/**
 * 三种浏览模式：
 *   top   俯视：从正上方看整个院子，屏幕上方 = 北；可缩放、平移（手机单指平移、双指缩放）
 *   orbit 环绕：自由旋转、缩放，默认从东南方斜上方看
 *   walk  走进去：第一人称（firstPerson.js），视线高度 1.2 m，有碰撞
 */
export function createViewModes(camera, domElement, scene) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;

  let colliders = null;
  const fp = createFirstPerson(camera, domElement, () => (colliders ??= buildColliders(scene)));
  const listeners = [];

  const modes = {
    top() {
      camera.up.set(0, 0, -1);
      camera.position.set(0, 30, 0.001);
      orbit.target.set(0, 0, 0);
      orbit.enableRotate = false;
      orbit.screenSpacePanning = true;
      orbit.minDistance = 4;
      orbit.maxDistance = 60;
      orbit.maxPolarAngle = Math.PI;
      orbit.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
      orbit.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    },
    orbit() {
      camera.up.set(0, 1, 0);
      camera.position.set(...VIEWS.orbitStart.position);
      orbit.target.set(...VIEWS.orbitStart.target);
      orbit.enableRotate = true;
      orbit.screenSpacePanning = false;
      orbit.minDistance = 2;
      orbit.maxDistance = 60;
      orbit.maxPolarAngle = Math.PI * 0.49; // 不钻到地底下
      orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
      orbit.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    },
    walk() {
      fp.reset();
    },
  };

  let current = null;
  function set(name) {
    if (!modes[name]) return;
    current = name;
    const walking = name === 'walk';
    orbit.enabled = !walking;
    fp.enable(walking);
    modes[name]();
    camera.updateProjectionMatrix();
    if (!walking) orbit.update();
    for (const fn of listeners) fn(name);
  }

  return {
    set,
    fp,
    get current() {
      return current;
    },
    onChange: (fn) => listeners.push(fn),
    update(dt) {
      if (current === 'walk') fp.update(dt);
      else orbit.update();
      // 环绕时别把目标点拖出院子太远
      if (current !== 'walk') {
        orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -20, 20);
        orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -20, 20);
      }
    },
    /** 直接把相机放到 pos、看向 target（自检截图用；在 walk 模式下改变第一人称位置和朝向） */
    lookAt(pos, target) {
      if (current === 'walk') {
        const s = fp.state;
        s.pos.set(pos[0], 0, pos[2]);
        s.feet = pos[1] - VIEWS.eyeHeight;
        const dx = target[0] - pos[0];
        const dy = target[1] - pos[1];
        const dz = target[2] - pos[2];
        s.yaw = Math.atan2(-dx, -dz);
        s.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        return;
      }
      camera.up.set(0, 1, 0);
      camera.position.set(...pos);
      orbit.target.set(...target);
      orbit.enableRotate = true;
      orbit.minDistance = 0.01;
      orbit.maxPolarAngle = Math.PI;
      orbit.update();
    },
  };
}
