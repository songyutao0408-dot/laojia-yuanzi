/**
 * 设备性能分级：'high' | 'low'。
 * - URL 参数 ?quality=low|high 可强制指定
 * - 否则：手机/平板、CPU 核数 ≤ 4、内存 ≤ 4 GB 视为低端
 * 低端设备：程序贴图分辨率减半、叶片少四分之一、关环境光遮蔽（GTAO）、阴影贴图减半、像素比上限 1.5。
 * 运行起来后还有 core/perfMonitor.js 按实际帧率自动降档。
 */
export function detectQuality() {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'low' || q === 'high') return q;
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  return mobile || cores <= 4 || mem <= 4 ? 'low' : 'high';
}

export const QUALITY_SETTINGS = {
  high: { ao: true, shadowMap: 2048, maxPixelRatio: 2, texScale: 1, leaf: 1 },
  low: { ao: false, shadowMap: 1024, maxPixelRatio: 1.5, texScale: 0.5, leaf: 0.75 },
};

/** 当前生效的设置（main.js 启动时 applyQuality 一次，各模块读取） */
export const Q = { tier: 'high', ...QUALITY_SETTINGS.high };
export function applyQuality(tier) {
  Object.assign(Q, QUALITY_SETTINGS[tier], { tier });
  return Q;
}
