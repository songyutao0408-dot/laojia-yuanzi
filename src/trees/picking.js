import * as THREE from 'three';

/**
 * 摘果子：石榴每个果子是一个 Group（userData.fruit = 'pomegranate'）；枣子在一个 InstancedMesh 里。
 * pick(hit) 返回摘到的果子名称，或 null。摘下的果子会缩小消失（枣子把实例缩为 0）。
 */
export function createPicking() {
  const anims = [];
  const m4 = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();

  function findFruitGroup(o) {
    while (o) {
      if (o.userData?.fruit === 'pomegranate') return o;
      o = o.parent;
    }
    return null;
  }

  return {
    /** hit：Raycaster 的交点 */
    pick(hit) {
      const obj = hit.object;
      if (obj.isInstancedMesh && obj.userData.fruit === 'jujube' && hit.instanceId != null) {
        const id = hit.instanceId;
        obj.getMatrixAt(id, m4);
        m4.decompose(p, q, s);
        if (s.x < 0.01) return null;
        anims.push({ kind: 'inst', obj, id, p: p.clone(), q: q.clone(), s0: s.x, t: 0 });
        return '枣';
      }
      const g = findFruitGroup(obj);
      if (g && g.visible && !g.userData.picked) {
        g.userData.picked = true;
        anims.push({ kind: 'group', obj: g, s0: g.scale.x, y0: g.position.y, t: 0 });
        return g.userData.split ? '咧开口的石榴' : '石榴';
      }
      return null;
    },
    update(dt) {
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        a.t += dt / 0.35;
        const k = Math.max(0, 1 - a.t);
        if (a.kind === 'inst') {
          m4.compose(a.p, a.q, s.setScalar(a.s0 * k));
          a.obj.setMatrixAt(a.id, m4);
          a.obj.instanceMatrix.needsUpdate = true;
        } else {
          a.obj.scale.setScalar(a.s0 * k);
          a.obj.position.y = a.y0 + (1 - k) * 0.15;
          if (k === 0) a.obj.visible = false;
        }
        if (a.t >= 1) anims.splice(i, 1);
      }
    },
  };
}
