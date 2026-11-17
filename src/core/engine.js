import * as THREE from 'three';
import { QUALITY_SETTINGS } from './quality.js';

/**
 * 渲染器 / 场景 / 相机 / 主循环。
 * 其他模块通过 engine.onUpdate(fn) 注册每帧回调：fn(dt, elapsed)；onResize(fn) 注册尺寸变化回调：fn(w, h)
 * 后期处理（GTAO）接入后用 setRenderFn 替换默认渲染函数。
 */
export function createEngine(container, quality = 'high') {
  const qs = QUALITY_SETTINGS[quality];
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qs.maxPixelRatio));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 500);

  const updaters = [];
  const resizers = [];
  const clock = new THREE.Clock();
  let frames = 0;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const fn of resizers) fn(w, h);
  }
  window.addEventListener('resize', resize);

  let render = () => renderer.render(scene, camera);

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    for (const fn of updaters) fn(dt, t);
    render();
    frames++;
    // 供 Playwright 自检脚本判断“已经画出几帧”
    if (frames === 2) window.__sceneReady = true;
  });

  return {
    renderer,
    scene,
    camera,
    quality,
    onUpdate: (fn) => updaters.push(fn),
    onResize: (fn) => resizers.push(fn),
    setRenderFn: (fn) => (render = fn),
    /** 立刻渲染一帧（截图自检读像素用） */
    renderNow: () => render(),
  };
}
