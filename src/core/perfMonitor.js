/**
 * 按实际帧率自动降档（“自动检测设备性能”的第二道保险）：
 * 每 3 秒统计一次平均帧率，低于 28 fps 就降一档，最多降到最低：
 *   1. 关环境光遮蔽（GTAO）
 *   2. 渲染像素比逐步降到 1（高分屏上最明显）
 *   3. 阴影贴图减到 1024
 *   4. 像素比再降到 0.8
 * 切换模式、调时间不会触发重新升档；刷新页面重新开始。
 */
export function createPerfMonitor(engine, { gtao, sun }) {
  const { renderer } = engine;
  let frames = 0;
  let acc = 0;
  let warm = 4; // 前 4 秒不算（贴图上传、着色器编译会卡）
  const steps = [
    () => gtao && gtao.enabled && ((gtao.enabled = false), '关闭环境光遮蔽'),
    () => renderer.getPixelRatio() > 1.01 && (setPR(Math.max(1, renderer.getPixelRatio() - 0.5)), '降低渲染分辨率'),
    () => sun.shadow.mapSize.x > 1024 && (sun.shadow.mapSize.set(1024, 1024), sun.shadow.map?.dispose(), (sun.shadow.map = null), '降低阴影精度'),
    () => renderer.getPixelRatio() > 0.81 && (setPR(0.8), '再降低渲染分辨率'),
  ];
  function setPR(pr) {
    renderer.setPixelRatio(pr);
    const el = renderer.domElement.parentElement;
    renderer.setSize(el.clientWidth, el.clientHeight);
    engine.onResizeNow?.();
  }
  const log = [];
  engine.onUpdate((dt) => {
    if (warm > 0) {
      warm -= dt;
      return;
    }
    frames++;
    acc += dt;
    if (acc < 3) return;
    const fps = frames / acc;
    frames = 0;
    acc = 0;
    if (fps >= 28 || document.hidden) return;
    for (const s of steps) {
      const did = s();
      if (did) {
        log.push(`${did}（当时 ${fps.toFixed(0)} fps）`);
        console.info('性能自动降档：', did, fps.toFixed(1), 'fps');
        warm = 2;
        return;
      }
    }
  });
  return { log };
}
