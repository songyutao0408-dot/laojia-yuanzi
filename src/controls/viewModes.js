import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VIEWS } from '../layout.js';

/**
 * 浏览模式：俯视 / 环绕 / 走进去。
 * 第 1 步实现俯视与环绕的相机预设；“走进去”（第一人称 + 碰撞 + 手机摇杆）在第 6 步完成，
 * 届时放在 src/controls/firstPerson.js。
 */
export function createViewModes(camera, domElement) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;

  const modes = {
    top() {
      // 正上方俯视：屏幕上方 = 北（-Z）
      camera.up.set(0, 0, -1);
      camera.position.set(0, 24, 0.001);
      orbit.target.set(0, 0, 0);
      orbit.enableRotate = false;
      orbit.screenSpacePanning = true;
      orbit.minDistance = 4;
      orbit.maxDistance = 45;
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
    },
    walk() {
      // 第 6 步替换为真正的第一人称控制；这里先放到起点、按儿童视线高度看一眼
      const s = VIEWS.walkStart;
      camera.up.set(0, 1, 0);
      camera.position.set(s.x, VIEWS.eyeHeight, s.z);
      orbit.target.set(s.x + s.look[0], VIEWS.eyeHeight, s.z + s.look[1]);
      orbit.enableRotate = true;
      orbit.maxPolarAngle = Math.PI;
      orbit.minDistance = 0.01;
    },
  };

  let current = null;
  function set(name) {
    if (!modes[name]) return;
    current = name;
    modes[name]();
    camera.updateProjectionMatrix();
    orbit.update();
  }

  return {
    set,
    get current() {
      return current;
    },
    update: () => orbit.update(),
  };
}
