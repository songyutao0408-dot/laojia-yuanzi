import * as THREE from 'three';
import { WELL, TREES } from '../layout.js';

/**
 * 交互总控：
 * - 点击压水井（压杆、泵身）或在井旁按 E → 压水
 * - 点击石榴、枣子 → 摘下（“走进去”模式下要走到伸手够得着的地方，约 3 m 内）
 * - 走近时在屏幕下方给提示；右上角记着摘了几个
 */
const REACH = 3.2;
const WELL_NEAR = 2.3;

export function createInteraction({ engine, views, pumping, picking, ui }) {
  const { scene, camera, renderer } = engine;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const well = scene.getObjectByName('well');
  const pump = well.getObjectByName('pump');
  const fruitTargets = [];
  scene.traverse((o) => {
    if (o.name === 'pomegranate-fruits' || o.name === 'jujube-fruits') fruitTargets.push(o);
  });
  const basket = { 石榴: 0, 枣: 0 };
  const wellPos = new THREE.Vector3(WELL.x, 0, WELL.z);
  const fruitTrees = TREES.filter((t) => t.kind === 'pomegranate' || t.kind === 'jujube');

  const walking = () => views.current === 'walk';
  const playerXZ = () => {
    const p = walking() ? views.fp.position : camera.position;
    return new THREE.Vector3(p.x, 0, p.z);
  };

  function doPump() {
    pumping.pump();
    ui.toast('吱嘎——吱嘎——，水哗哗地流进桶里');
  }

  function clickAt(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    if (clientX == null) ndc.set(0, 0); // 锁定鼠标时：屏幕中心
    else ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([pump, ...fruitTargets], true);
    if (!hits.length) return false;
    const hit = hits[0];
    if (walking() && hit.distance > REACH) {
      ui.toast('再走近一点才够得着');
      return true;
    }
    let o = hit.object;
    while (o && o !== pump) o = o.parent;
    if (o === pump) {
      doPump();
      return true;
    }
    const got = picking.pick(hit);
    if (got) {
      const key = got.includes('石榴') ? '石榴' : '枣';
      basket[key]++;
      ui.toast(got === '枣' ? '摘了一颗枣，脆甜！' : got === '咧开口的石榴' ? '摘了一个咧开口的石榴，籽红得发亮' : '摘了一个大石榴');
      ui.basket(basket);
    }
    return true;
  }

  // 鼠标单击（拖动转头不算）
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') down = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch' || !down) return;
    const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down = null;
    if (moved > 5) return;
    const locked = document.pointerLockElement === renderer.domElement;
    clickAt(locked ? null : e.clientX, locked ? null : e.clientY);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' || e.repeat) return;
    if (!walking() || playerXZ().distanceTo(wellPos) <= WELL_NEAR) doPump();
    else ui.toast('走到压水井旁边再按 E');
  });

  // 走近提示（每 0.2 s 检查一次）
  let acc = 0;
  return {
    tap: (x, y) => clickAt(x, y),
    update(dt) {
      acc += dt;
      if (acc < 0.2) return;
      acc = 0;
      if (!walking()) return ui.hint(null);
      const p = playerXZ();
      if (p.distanceTo(wellPos) <= WELL_NEAR) return ui.hint(ui.touch ? '点一下压杆就能压水' : '按 E（或点压杆）压水');
      for (const t of fruitTrees) {
        if (p.distanceTo(new THREE.Vector3(t.x, 0, t.z)) <= t.crown + 1) return ui.hint(t.kind === 'jujube' ? '点树上的枣子摘一颗' : '点树上的石榴摘一个');
      }
      ui.hint(null);
    },
  };
}
