import { createEngine } from './core/engine.js';
import { detectQuality, applyQuality } from './core/quality.js';
import { createPerfMonitor } from './core/perfMonitor.js';
import { TEX } from './textures/canvas.js';
import { prewarmTextures } from './textures/prewarm.js';
import { createLighting } from './lighting/index.js';
import { createPostFX } from './lighting/postfx.js';
import { TIME_KEYS } from './lighting/timeOfDay.js';
import { createGround } from './ground/index.js';
import { createHorizon } from './ground/horizon.js';
import { createBuildings } from './buildings/index.js';
import { createTrees, updateWind } from './trees/index.js';
import { createWell } from './well/index.js';
import { createGarden } from './garden/index.js';
import { createYardItems } from './yard/index.js';
import { createCharacters } from './characters/index.js';
import { createNorthWestInterior } from './interiors/northWest.js';
import { createSmoke } from './effects/smoke.js';
import { createViewModes } from './controls/viewModes.js';
import { createTimeSlider } from './ui/timeSlider.js';
import { createHUD } from './ui/hud.js';
import { createCompass } from './ui/compass.js';
import { createMusicButton } from './ui/musicButton.js';
import { createBGMPlayer } from './audio/bgm.js';
import { createTouchControls } from './controls/touch.js';
import { createInteraction } from './controls/interact.js';
import { createPumping } from './well/pumping.js';
import { createPicking } from './trees/picking.js';

const params = new URLSearchParams(location.search);
const quality = detectQuality();
const Q = applyQuality(quality);
TEX.scale = Q.texScale;
const engine = createEngine(document.getElementById('app'), quality);
const { scene, camera, renderer } = engine;

// 先生成所有程序贴图（每张之间让出一帧，显示进度），再搭场景
const t0 = performance.now();
const bar = document.querySelector('#loading .bar i');
const pct = document.querySelector('#loading .pct');
await prewarmTextures((p) => {
  if (bar) bar.style.width = `${Math.round(p * 100)}%`;
  if (pct) pct.textContent = `${Math.round(p * 100)}%`;
});
const lighting = createLighting(engine);
scene.add(createGround(), createHorizon());
scene.add(createBuildings());
// 室内：挂到各房间的室内锚点上
const westRoom = createNorthWestInterior();
scene.getObjectByName('interior-anchor-west').add(westRoom.group);
scene.add(createTrees());
scene.add(createWell());
scene.add(createGarden());
scene.add(createYardItems());
const characters = createCharacters();
scene.add(characters.group);
const smoke = createSmoke();
scene.add(smoke.object);
const postfx = createPostFX(engine);
const buildMs = Math.round(performance.now() - t0);
console.info(`场景生成用时 ${buildMs} ms（画质：${quality}）`);
document.getElementById('loading')?.classList.add('done');

const views = createViewModes(camera, renderer.domElement, scene);
engine.onUpdate((dt) => views.update(dt));

// 交互：压水井、摘果子；屏幕提示、指北针、手机摇杆
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const ui = createHUD(document.getElementById('hud2'), { touch: isTouch });
const compass = createCompass(document.getElementById('compass'));
// 背景音乐：第一次点击/按键后开始循环播放，右上角♪按钮开关
const bgm = createBGMPlayer();
const music = createMusicButton(document.getElementById('music'), bgm);
// 音乐默认开：先直接试播；被浏览器拦下就显示“进入院子 ♪”，点一下进入并开始播放
music.tryAutoplay().then((ok) => {
  if (ok || !music.wanted || bgm.playing) return;
  const enter = document.getElementById('enter');
  enter.classList.add('show');
  const go = () => {
    enter.classList.remove('show');
    music.play();
    window.removeEventListener('keydown', go);
  };
  enter.addEventListener('click', go, { once: true });
  window.addEventListener('keydown', go);
});
const pumping = createPumping(scene.getObjectByName('well'));
const swing = scene.getObjectByName('jujube')?.userData.swing;
const picking = createPicking();
const interaction = createInteraction({ engine, views, pumping, picking, ui, swing, characters, westRoom });
const touch = createTouchControls(document.getElementById('touch'), renderer.domElement, views.fp, (x, y) => interaction.tap(x, y));
engine.onUpdate((dt) => {
  pumping.update(dt);
  swing?.update(dt, engine.elapsed ?? performance.now() / 1000);
  characters.update(dt, performance.now() / 1000);
  westRoom.update(dt, performance.now() / 1000, views.current === 'walk' ? views.fp.state.pos : null);
  picking.update(dt);
  interaction.update(dt);
  compass.update(camera);
});
document.addEventListener('pointerlockchange', () => ui.setLocked(document.pointerLockElement === renderer.domElement));
views.onChange((name) => {
  ui.walkMode(name === 'walk');
  touch.show(name === 'walk' && isTouch);
  document.body.classList.toggle('walking', name === 'walk');
});
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

// ?lamp=on —— 里屋的灯一开始就开着（自检截图用）
if (params.get('lamp') === 'on') westRoom.lamp.set(true);

// ?autoperf=off 关闭按帧率自动降档（自检截图用：无头浏览器帧率极低）
const perf = params.get('autoperf') === 'off' ? null : createPerfMonitor(engine, { gtao: postfx.gtao, sun: lighting.sun });

window.__app = { westRoom, characters, bgm, engine, views, setView, lighting, buildMs, quality, pumping, interaction, perf };
