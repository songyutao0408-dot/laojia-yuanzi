import * as THREE from 'three';
import { WELL, TREES } from '../layout.js';

/**
 * 交互总控（不需要精确点中小东西）：
 * - 走近压水井 / 石榴树 / 枣树时，屏幕下方出现大按钮：“压水”“摘石榴”“打枣”；点按钮或按 E 执行
 * - 也可以直接点画面：选点击位置附近（约 90 像素内）够得着的果子或压水井
 * - 石榴：伸手够得着（离眼睛 2.6 m 内）才能摘；枣树高，小孩站到树下用竹竿打枣，水平 3 m 内的都能打下来
 * - 环绕/俯视模式下点果子、压水井也有效（不限距离）
 * - 西北屋里屋：站在里屋里、离灯绳 2.6 m 内出“拉灯”按钮；也可以直接点灯绳
 * - 西北屋外屋：走到电视跟前（2 m 内）出“开电视”按钮；也可以直接点电视屏幕
 */
const WELL_NEAR = 2.0;
const POME_REACH = 2.6;
const JUJUBE_REACH = 3.0;
const CLICK_RADIUS = 90;

export function createInteraction({ engine, views, pumping, picking, ui, swing, characters, westRoom }) {
  const { scene, camera, renderer } = engine;
  const well = scene.getObjectByName('well');
  const pump = well.getObjectByName('pump');
  const handle = well.getObjectByName('handle-pivot');
  const pomeGroups = scene.getObjectByName('pomegranate-fruits').children;
  const jujube = scene.getObjectByName('jujube-fruits');
  const basket = { 石榴: 0, 枣: 0 };
  const wellPos = new THREE.Vector3(WELL.x, 0, WELL.z);
  const pomeTree = TREES.find((t) => t.kind === 'pomegranate');
  const jujubeTree = TREES.find((t) => t.kind === 'jujube');

  // 枣子的世界坐标（只算一次）
  scene.updateMatrixWorld(true);
  const m4 = new THREE.Matrix4();
  const jujubePos = [];
  for (let i = 0; i < jujube.count; i++) {
    jujube.getMatrixAt(i, m4);
    jujubePos.push(new THREE.Vector3().setFromMatrixPosition(m4).applyMatrix4(jujube.matrixWorld));
  }
  const jujubeLeft = () => {
    const s = new THREE.Vector3();
    return (i) => {
      jujube.getMatrixAt(i, m4);
      s.setFromMatrixScale(m4);
      return s.x > 0.01;
    };
  };
  const alive = jujubeLeft();

  const walking = () => views.current === 'walk';
  const eye = () => camera.position;
  const playerXZ = () => {
    const p = walking() ? views.fp.position : camera.position;
    return new THREE.Vector3(p.x, 0, p.z);
  };
  const flat = (x, z) => new THREE.Vector3(x, 0, z);

  // —— 候选目标 ——
  function fruitsInReach(limitPome = POME_REACH, limitJujube = JUJUBE_REACH) {
    const out = [];
    const e = eye();
    const w = new THREE.Vector3();
    for (const g of pomeGroups) {
      if (g.userData.picked || !g.visible) continue;
      g.getWorldPosition(w);
      const d = w.distanceTo(e);
      if (d <= limitPome) out.push({ kind: '石榴', pos: w.clone(), dist: d, hit: { object: g } });
    }
    jujubePos.forEach((p, i) => {
      if (!alive(i)) return;
      const d = Math.hypot(p.x - e.x, p.z - e.z);
      if (d <= limitJujube) out.push({ kind: '枣', pos: p, dist: p.distanceTo(e), hit: { object: jujube, instanceId: i } });
    });
    return out;
  }

  /** 视线正前方附近优先：按“与视线夹角 + 距离”打分 */
  function bestFacing(list) {
    const dir = camera.getWorldDirection(new THREE.Vector3());
    let best = null;
    let bs = Infinity;
    for (const c of list) {
      const v = c.pos.clone().sub(eye()).normalize();
      const s = (1 - v.dot(dir)) * 4 + c.dist * 0.3;
      if (s < bs) {
        bs = s;
        best = c;
      }
    }
    return best;
  }

  function doPetDog() {
    if (!characters) return;
    characters.dog.nuzzle();
    ui.toast('大黄眯起眼，尾巴摇得欢，往父亲腿上蹭了又蹭');
  }
  function doLamp() {
    const on = westRoom.lamp.pull();
    ui.toast(on ? '咔哒一声，屋顶的灯泡亮了，昏黄昏黄的' : '咔哒，灯灭了');
  }
  const nearCord = (p) => {
    if (!westRoom || !westRoom.inInnerRoom(p.x, p.z)) return false;
    const c = westRoom.lamp.cordPosition();
    return Math.hypot(p.x - c.x, p.z - c.z) <= 2.6; // 里屋小，进了门洞基本就够得着
  };
  function doTv() {
    const on = westRoom.tv.toggle();
    ui.toast(on ? '啪一声，电视亮了，先是一阵雪花，沙沙的' : '电视关了，屏幕中间剩一个小亮点，慢慢没了');
  }
  const nearTv = (p) => {
    if (!westRoom || !westRoom.inOuterRoom(p.x, p.z)) return false;
    const c = westRoom.tv.position();
    return Math.hypot(p.x - c.x, p.z - c.z) <= 2.0;
  };
  function doPump() {
    pumping.pump();
    ui.toast('吱嘎——吱嘎——，水哗哗地流进桶里');
  }
  function doPick(c) {
    const got = picking.pick(c.hit);
    if (!got) return false;
    const key = got.includes('石榴') ? '石榴' : '枣';
    basket[key]++;
    ui.toast(got === '枣' ? '竹竿一打，掉下来一颗枣，脆甜！' : got === '咧开口的石榴' ? '摘了一个咧开口的石榴，籽红得发亮' : '摘了一个大石榴');
    ui.basket(basket);
    return true;
  }

  // —— 当前能做的事（按钮）——
  function availableActions() {
    const acts = [];
    const p = playerXZ();
    if (!walking()) return acts;
    if (p.distanceTo(wellPos) <= WELL_NEAR) acts.push({ label: '压水', run: doPump });
    if (nearTv(p)) acts.push({ label: westRoom.tv.on ? '关电视' : '开电视', run: doTv });
    if (nearCord(p)) acts.push({ label: westRoom.lamp.on ? '拉灯（关）' : '拉灯', run: doLamp });
    if (characters) {
      const dp = characters.dogHeadPosition();
      if (Math.hypot(p.x - dp.x, p.z - dp.z) <= 2.0) acts.push({ label: '摸摸大黄', run: doPetDog });
    }
    if (swing) {
      const sp = swing.position;
      if (Math.hypot(p.x - sp.x, p.z - sp.z) <= 1.8)
        acts.push({ label: '荡秋千', run: () => (swing.push(), ui.toast('秋千荡起来了——枣树枝吱呀吱呀地响')) });
    }
    const fruits = fruitsInReach();
    const pome = fruits.filter((f) => f.kind === '石榴');
    const jj = fruits.filter((f) => f.kind === '枣');
    if (pome.length) acts.push({ label: '摘石榴', run: () => doPick(bestFacing(pome)) });
    else if (p.distanceTo(flat(pomeTree.x, pomeTree.z)) <= pomeTree.crown + 0.8) acts.push({ label: '摘石榴', run: () => ui.toast('再往树跟前走走，伸手就够着了') });
    // 枣树高，小孩站到树底下拿竹竿打
    if (jj.length && p.distanceTo(flat(jujubeTree.x, jujubeTree.z)) <= jujubeTree.crown) acts.push({ label: '打枣', run: () => doPick(bestFacing(jj)) });
    return acts;
  }

  // —— 直接点画面：选点击处附近的目标 ——
  const proj = new THREE.Vector3();
  function clickAt(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    const cands = [];
    const toScreen = (w) => {
      proj.copy(w).project(camera);
      if (proj.z > 1) return null;
      return { x: r.left + ((proj.x + 1) / 2) * r.width, y: r.top + ((1 - proj.y) / 2) * r.height };
    };
    const near = walking() ? playerXZ().distanceTo(wellPos) <= WELL_NEAR + 0.5 : true;
    if (near) {
      for (const o of [handle, pump]) {
        const w = o.getWorldPosition(new THREE.Vector3());
        if (o === handle) w.add(new THREE.Vector3(0, 0.15, -0.35)); // 压杆中段
        cands.push({ kind: 'pump', pos: w });
      }
    }
    for (const f of walking() ? fruitsInReach() : fruitsInReach(1e9, 1e9)) cands.push(f);
    // 大黄的头：走进去时 3 m 内能点，环绕/俯视时随便点
    if (characters) {
      const dp = characters.dogHeadPosition();
      if (!walking() || dp.distanceTo(eye()) <= 3) cands.push({ kind: 'dog', pos: dp });
    }
    // 里屋的灯绳：走进去时人在里屋里才能点，环绕/俯视时随便点
    if (westRoom && (!walking() || westRoom.inInnerRoom(playerXZ().x, playerXZ().z))) cands.push({ kind: 'lamp', pos: westRoom.lamp.cordPosition() });
    // 外屋的电视：走进去时人在外屋、3 m 内能点，环绕/俯视时随便点
    if (westRoom) {
      const tp = westRoom.tv.position(new THREE.Vector3());
      if (!walking() || (westRoom.inOuterRoom(playerXZ().x, playerXZ().z) && Math.hypot(playerXZ().x - tp.x, playerXZ().z - tp.z) <= 3)) cands.push({ kind: 'tv', pos: tp });
    }
    let best = null;
    let bd = walking() ? CLICK_RADIUS : 40;
    for (const c of cands) {
      const s = toScreen(c.pos);
      if (!s) continue;
      const d = Math.hypot(s.x - clientX, s.y - clientY);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (!best) {
      // 点到了够不着的果子：提示走近
      if (walking()) {
        for (const f of fruitsInReach(1e9, 1e9)) {
          const s = toScreen(f.pos);
          if (s && Math.hypot(s.x - clientX, s.y - clientY) < 40) return ui.toast('再走近一点才够得着');
        }
      }
      return false;
    }
    if (best.kind === 'pump') doPump();
    else if (best.kind === 'dog') doPetDog();
    else if (best.kind === 'lamp') doLamp();
    else if (best.kind === 'tv') doTv();
    else doPick(best);
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
    if (moved <= 6) clickAt(e.clientX, e.clientY);
  });

  // E 键：执行第一个可做的动作；环绕模式下直接压水
  window.addEventListener('keydown', (e) => {
    if ((e.code !== 'KeyE' && e.key !== 'e' && e.key !== 'E') || e.repeat) return;
    if (!walking()) return doPump();
    const acts = availableActions();
    if (acts.length) acts[0].run();
    else ui.toast('走到压水井或果树旁边再按 E');
  });

  let acc = 1;
  return {
    tap: (x, y) => clickAt(x, y),
    actions: availableActions,
    get basket() {
      return { ...basket };
    },
    update(dt) {
      acc += dt;
      if (acc < 0.2) return;
      acc = 0;
      const acts = availableActions();
      ui.actions(acts);
      if (!walking()) return ui.hint(null);
      const p = playerXZ();
      if (acts.length) ui.hint(null);
      else if (p.distanceTo(flat(jujubeTree.x, jujubeTree.z)) <= jujubeTree.crown + 1.5) ui.hint('枣树上的枣都打完了');
      else ui.hint(null);
    },
  };
}
