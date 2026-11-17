import * as THREE from 'three';

/**
 * 渲染器 / 场景 / 相机 / 主循环。
 * 其他模块通过 engine.onUpdate(fn) 注册每帧回调：fn(dt, elapsed)
 */
export function createEngine(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfd9e0);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 500);

  const updaters = [];
  const clock = new THREE.Clock();
  let frames = 0;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
    if (frames === 5) window.__sceneReady = true;
  });

  return {
    renderer,
    scene,
    camera,
    onUpdate: (fn) => updaters.push(fn),
    /** 第 5 步接入后期（SSAO/GTAO）时替换默认渲染函数 */
    setRenderFn: (fn) => (render = fn),
  };
}
