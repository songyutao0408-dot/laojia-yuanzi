import { createEngine } from './core/engine.js';
import { detectQuality } from './core/quality.js';
import { createLighting } from './lighting/index.js';
import { createPostFX } from './lighting/postfx.js';
import { TIME_KEYS } from './lighting/timeOfDay.js';
import { createGround } from './ground/index.js';
import { createHorizon } from './ground/horizon.js';
import { createBuildings } from './buildings/index.js';
import { createTrees, updateWind } from './trees/index.js';
import { createWell } from './well/index.js';
import { createGarden } from './garden/index.js';
import { createSmoke } from './effects/smoke.js';
import { createViewModes } from './controls/viewModes.js';
import { createTimeSlider } from './ui/timeSlider.js';

const params = new URLSearchParams(location.search);
const quality = detectQuality();
const engine = createEngine(document.getElementById('app'), quality);
const { scene, camera, renderer } = engine;

// 先让“正在生成”的提示画出来，再开始（同步的）贴图生成
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const t0 = performance.now();
const lighting = createLighting(engine);
scene.add(createGround(), createHorizon());
scene.add(createBuildings());
scene.add(createTrees());
scene.add(createWell());
scene.add(createGarden());
const smoke = createSmoke();
scene.add(smoke.object);
createPostFX(engine);
const buildMs = Math.round(performance.now() - t0);
console.info(`场景生成用时 ${buildMs} ms（画质：${quality}）`);
document.getElementById('loading')?.classList.add('done');

const views = createViewModes(camera, renderer.domElement);
engine.onUpdate(() => views.update());
engine.onUpdate((dt, t) => updateWind(t));
engine.onUpdate((dt) => smoke.update(dt, renderer, camera, scene.fog));
lighting.onTimeChange((p) => smoke.setAmount(p.smoke));

// 时间：?time=dawn|noon|dusk|night，默认傍晚
const timeKey = params.get('time');
const startTime = TIME_KEYS.includes(timeKey) ? TIME_KEYS.indexOf(timeKey) : 2;
lighting.setTime(startTime);
createTimeSlider(document.getElementById('time'), startTime, (v) => lighting.setTime(v));

const buttons = document.querySelectorAll('#view-buttons button');
function setView(name) {
  views.set(name);
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
buttons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

// ?view=top|orbit|walk —— 方便截图自检和分享指定视角
setView(params.get('view') || 'orbit');
// ?cam=x,y,z,tx,ty,tz —— 指定相机位置和注视点（自检截图看室内用）
const cam = params.get('cam')?.split(',').map(Number);
if (cam?.length === 6) views.lookAt(cam.slice(0, 3), cam.slice(3));

window.__app = { engine, views, setView, lighting, buildMs, quality };
