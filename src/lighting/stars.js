import * as THREE from 'three';
import { rng } from '../textures/canvas.js';

/** 夜空：几千颗星星（大小、亮度、色温不一）+ 一轮月亮。opacity 随夜晚程度变化 */
export function createNightSky() {
  const group = new THREE.Group();
  group.name = 'night-sky';
  const r = rng(909);
  const N = 2600;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // 上半球均匀分布，越靠近地平线越少（被雾遮住）
    const u = r();
    const y = Math.pow(u, 0.7);
    const th = r() * Math.PI * 2;
    const rr = Math.sqrt(1 - y * y);
    const R = 420;
    pos.set([Math.cos(th) * rr * R, y * R, Math.sin(th) * rr * R], i * 3);
    const warm = r();
    const b = 0.5 + r() * 0.5;
    col.set([b * (0.85 + warm * 0.15), b * 0.9, b * (1 - warm * 0.2)], i * 3);
    size[i] = r() < 0.03 ? 3.2 : 1 + r() * 1.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float size; varying vec3 vColor; uniform float uPixel;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w * 0.9999;
        gl_PointSize = size * uPixel;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; uniform float uOpacity;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * 1.6, a * uOpacity);
      }`,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  group.add(stars);

  // 月亮：一个发光的圆盘 + 一圈淡淡的月晕
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xf2eedc, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 32), moonMat);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(22, 32), haloMat);
  group.add(moon, halo);

  return {
    group,
    /** night ∈ [0,1]；moonDir 为指向月亮的单位向量 */
    update(night, moonDir) {
      mat.uniforms.uOpacity.value = Math.pow(night, 2);
      moonMat.opacity = night;
      haloMat.opacity = night * 0.12;
      group.visible = night > 0.01;
      for (const m of [moon, halo]) {
        m.position.copy(moonDir).multiplyScalar(400);
        m.lookAt(0, 0, 0);
      }
    },
  };
}
