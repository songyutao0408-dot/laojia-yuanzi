import { mat, MATERIAL_KEYS, stainMat, wetMat, grassMat, fuMat } from './materials.js';
import { tileMural } from './mural.js';
import { paulowniaLeaves, pomegranateLeaves, jujubeLeaves, luffaLeaves, beanLeaves, artichokeLeaves, artichokeFlower } from './leaves.js';

/**
 * 加载时把所有程序贴图预先生成一遍：每生成一张就让出一帧，更新进度条，页面不会“卡死”。
 * 之后搭场景时材质都已在缓存里，几乎不再耗时。
 */
export async function prewarmTextures(onProgress) {
  const jobs = [
    ...MATERIAL_KEYS().map((k) => () => mat(k)),
    () => tileMural(),
    paulowniaLeaves, pomegranateLeaves, jujubeLeaves, luffaLeaves, beanLeaves, artichokeLeaves, artichokeFlower,
    stainMat, wetMat, grassMat, fuMat,
  ];
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  for (let i = 0; i < jobs.length; i++) {
    jobs[i]();
    onProgress?.((i + 1) / jobs.length);
    await nextFrame();
  }
}
