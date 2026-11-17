import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { canvas, makeFbm, fillPixels, clamp01 } from '../textures/canvas.js';

/**
 * 厨房烟囱的炊烟：几十个软边烟团，从烟囱口冒出、慢慢长大变淡、被风吹向东南。
 * setAmount(a)：a ∈ [0,1]，清晨/傍晚做饭时 1，正午少，夜里几乎没有。
 */
const N = 70;

function puffTexture() {
  const c = canvas(128, 128);
  const n = makeFbm(5, 4, 4);
  fillPixels(c, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) * 2;
    const a = clamp01(1 - d) ** 1.6 * (0.55 + n(u, v) * 0.9);
    return [255, 255, 255, clamp01(a) * 255];
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSmoke() {
  const ch = K.chimney;
  const origin = new THREE.Vector3(ch.x, ch.top + 0.05, ch.z);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const alpha = new Float32Array(N);
  const rot = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('rot', new THREE.BufferAttribute(rot, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: puffTexture() },
      uColor: { value: new THREE.Color(0xb8b4ae) },
      uScale: { value: 1 },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 1 },
      fogFar: { value: 100 },
    },
    vertexShader: /* glsl */ `
      attribute float size; attribute float alpha; attribute float rot;
      varying float vAlpha; varying float vRot; varying float vDepth;
      uniform float uScale;
      void main() {
        vAlpha = alpha; vRot = rot;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * uScale / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform vec3 uColor;
      uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
      varying float vAlpha; varying float vRot; varying float vDepth;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float c = cos(vRot), s = sin(vRot);
        p = mat2(c, -s, s, c) * p + 0.5;
        vec4 t = texture2D(map, p);
        float f = smoothstep(fogNear, fogFar, vDepth);
        gl_FragColor = vec4(mix(uColor, fogColor, f), t.a * vAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'chimney-smoke';
  points.userData.noAO = true;

  // 粒子状态
  const age = new Float32Array(N).map(() => Math.random() * 6);
  const life = new Float32Array(N).map(() => 5 + Math.random() * 3);
  const vel = Array.from({ length: N }, () => new THREE.Vector3());
  const spin = new Float32Array(N).map(() => (Math.random() - 0.5) * 0.6);
  const reset = (i) => {
    age[i] = 0;
    life[i] = 5 + Math.random() * 3;
    pos.set([origin.x + (Math.random() - 0.5) * 0.15, origin.y, origin.z + (Math.random() - 0.5) * 0.15], i * 3);
    vel[i].set((Math.random() - 0.5) * 0.08, 0.45 + Math.random() * 0.2, (Math.random() - 0.5) * 0.08);
    rot[i] = Math.random() * 6.28;
  };
  for (let i = 0; i < N; i++) {
    reset(i);
    age[i] = Math.random() * life[i];
  }

  let amount = 1;
  const wind = new THREE.Vector3(0.35, 0, 0.22); // 西北风，烟往东南飘
  return {
    object: points,
    setAmount(a) {
      amount = a;
    },
    /** 每帧：dt 秒；renderer 用于根据像素高度换算粒子大小；fog 跟场景雾同步 */
    update(dt, renderer, camera, fog) {
      mat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      if (fog) {
        mat.uniforms.fogColor.value.copy(fog.color);
        mat.uniforms.fogNear.value = fog.near;
        mat.uniforms.fogFar.value = fog.far;
      }
      for (let i = 0; i < N; i++) {
        age[i] += dt;
        if (age[i] > life[i]) reset(i);
        const t = age[i] / life[i];
        // 越往上越受风吹、上升越慢
        vel[i].y *= 1 - dt * 0.15;
        vel[i].addScaledVector(wind, dt * 0.25 * t);
        pos[i * 3] += vel[i].x * dt;
        pos[i * 3 + 1] += vel[i].y * dt;
        pos[i * 3 + 2] += vel[i].z * dt;
        size[i] = 0.3 + t * 2.0;
        alpha[i] = amount * 0.36 * Math.min(1, t * 4) * (1 - t) ** 1.5;
        rot[i] += spin[i] * dt;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      geo.attributes.rot.needsUpdate = true;
      points.visible = amount > 0.01;
    },
  };
}
