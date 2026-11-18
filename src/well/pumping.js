import * as THREE from 'three';

/**
 * 压水井动画：压一下 = 压杆连压 4 下（每下约 0.55 s），活塞杆跟着上下；
 * 第一下之后出水嘴开始出水，水柱落进铁桶，桶里水面慢慢升高、泛起涟漪；停压后水流渐小。
 */
export function createPumping(well) {
  const pivot = well.getObjectByName('handle-pivot');
  const rod = well.getObjectByName('piston-rod');
  const tip = well.getObjectByName('spout-tip');
  const water = well.getObjectByName('bucket-water');
  const bucket = well.getObjectByName('bucket');
  const UP = pivot.rotation.x; // 抬起
  const DOWN = -0.18; // 压到底
  const rodY = rod.position.y;

  // 水柱：从出水口落到水面，竖直细圆柱，贴图滚动模拟流动
  const streamTex = (() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 128;
    const g = c.getContext('2d');
    for (let y = 0; y < 128; y++) {
      const a = 0.55 + 0.45 * Math.sin(y * 0.35) * Math.sin(y * 0.13);
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(0, y, 16, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const streamMat = new THREE.MeshStandardMaterial({ color: 0xcfe0e4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0, alphaMap: streamTex, depthWrite: false });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, 1, 10, 1, true), streamMat);
  stream.userData.noAO = true;
  stream.visible = false;
  well.add(stream);
  // 涟漪
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03, 24).rotateX(-Math.PI / 2), rippleMat);
  ripple.userData.noAO = true;
  bucket.add(ripple);

  let strokes = 0; // 剩余要压的次数
  let phase = 0; // 当前这一下的进度 0..1
  let flow = 0; // 出水量 0..1
  let level = water.position.y;
  const MAX_LEVEL = 0.285;
  const tipW = new THREE.Vector3();
  const waterW = new THREE.Vector3();

  return {
    get busy() {
      return strokes > 0;
    },
    /** 开始压水（正在压时再按会多压几下） */
    pump() {
      strokes = Math.min(strokes + 4, 8);
    },
    update(dt) {
      if (strokes > 0) {
        phase += dt / 0.55;
        // 压下快、抬起慢
        const p = phase < 0.45 ? phase / 0.45 : 1 - (phase - 0.45) / 0.55;
        const e = p * p * (3 - 2 * p);
        pivot.rotation.x = UP + (DOWN - UP) * e;
        rod.position.y = rodY + e * 0.06;
        if (phase >= 1) {
          phase = 0;
          strokes--;
        }
        flow = Math.min(1, flow + dt * 1.5);
      } else {
        flow = Math.max(0, flow - dt * 0.8);
      }
      // 水柱
      stream.visible = flow > 0.02;
      if (stream.visible) {
        tip.getWorldPosition(tipW);
        water.getWorldPosition(waterW);
        well.worldToLocal(tipW);
        well.worldToLocal(waterW);
        const h = Math.max(0.02, tipW.y - waterW.y);
        stream.scale.set(0.4 + flow * 0.6, h, 0.4 + flow * 0.6);
        stream.position.set(tipW.x, waterW.y + h / 2, tipW.z);
        streamMat.opacity = 0.75 * flow;
        streamTex.offset.y -= dt * 3;
        level = Math.min(MAX_LEVEL, level + dt * 0.004 * flow);
        water.position.y = level;
      }
      // 涟漪一圈圈扩散
      const rp = (performance.now() / 600) % 1;
      ripple.position.set(0, level + 0.002, 0.04);
      ripple.scale.setScalar(1 + rp * 4);
      rippleMat.opacity = flow * (1 - rp) * 0.6;
    },
  };
}
