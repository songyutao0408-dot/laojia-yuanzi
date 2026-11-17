/**
 * 设备性能分级：'high' | 'low'。
 * - URL 参数 ?quality=low|high 可强制指定
 * - 否则：手机/平板、CPU 核数 ≤ 4、内存 ≤ 4 GB 视为低端
 * 低端设备：关闭环境光遮蔽（GTAO）、阴影贴图减半、像素比上限 1.5。第 7 步会进一步细化。
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
  high: { ao: true, shadowMap: 2048, maxPixelRatio: 2 },
  low: { ao: false, shadowMap: 1024, maxPixelRatio: 1.5 },
};
