import { createEngine } from './core/engine.js';
import { createLighting } from './lighting/index.js';
import { createGround } from './ground/index.js';
import { createBuildings } from './buildings/index.js';
import { createTrees } from './trees/index.js';
import { createWell } from './well/index.js';
import { createGarden } from './garden/index.js';
import { createViewModes } from './controls/viewModes.js';
import { createFootprints } from './debug/footprints.js';

const engine = createEngine(document.getElementById('app'));
const { scene, camera, renderer } = engine;

createLighting(scene);
scene.add(createGround());
scene.add(createBuildings());
scene.add(createTrees());
scene.add(createWell());
scene.add(createGarden());
// 第 1 步：用占地色块核对方位；第 2 步白模完成后删除
scene.add(createFootprints());

const views = createViewModes(camera, renderer.domElement);
engine.onUpdate(() => views.update());

const buttons = document.querySelectorAll('#view-buttons button');
function setView(name) {
  views.set(name);
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
buttons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

// ?view=top|orbit|walk —— 方便截图自检和分享指定视角
const initial = new URLSearchParams(location.search).get('view') || 'orbit';
setView(initial);

window.__app = { engine, views, setView };
