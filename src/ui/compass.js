import * as THREE from 'three';

/** 屏幕角落的小指北针：红针始终指向真北（-Z），随相机朝向转动 */
export function createCompass(root) {
  root.innerHTML = `
    <svg viewBox="-30 -30 60 60" width="56" height="56" aria-label="指北针">
      <circle r="27" fill="rgba(255,248,235,0.85)" stroke="#6a5038" stroke-width="1.5"/>
      <g class="dial">
        <path d="M0,-21 L6,0 L0,-3 L-6,0 Z" fill="#b8322a"/>
        <path d="M0,21 L6,0 L0,3 L-6,0 Z" fill="#8a8070"/>
        <text y="-23" text-anchor="middle" font-size="9" font-weight="700" fill="#b8322a" dy="-0.5">北</text>
      </g>
    </svg>`;
  const dial = root.querySelector('.dial');
  const d = new THREE.Vector3();
  const up = new THREE.Vector3();
  let last = null;
  return {
    update(camera) {
      camera.getWorldDirection(d);
      // 俯视时视线朝下，用相机的“上方”代表屏幕上方的方向
      if (Math.abs(d.y) > 0.95) d.copy(up.set(0, 1, 0).applyQuaternion(camera.quaternion));
      const heading = Math.atan2(d.x, -d.z); // 0 = 面朝北，正值 = 朝东
      const deg = Math.round((-heading * 180) / Math.PI);
      if (deg !== last) {
        dial.setAttribute('transform', `rotate(${deg})`);
        last = deg;
      }
    },
  };
}
