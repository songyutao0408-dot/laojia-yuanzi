import * as THREE from 'three';
import { CHARACTERS } from '../layout.js';
import { box } from '../core/box.js';
import { createPerson, clothTex } from './person.js';

/**
 * 母亲（第 17 轮，用户要求）：四十岁左右，齐耳短发，坐在小板凳上洗衣服——面前一个大铝盆，
 * 盆里是水、泡着的脏衣服和一块搓衣板，她弯着腰两手按着衣服在搓衣板上搓；旁边地上堆着几件没洗的。
 * 位置在父亲东边、父亲和压水井中间（layout.CHARACTERS.mother）。动作按真实时间走。
 */
export function createMother() {
  const M = CHARACTERS.mother;
  const root = new THREE.Group();
  root.name = 'mother';
  root.position.set(M.x, 0, M.z);
  root.rotation.y = (M.rot * Math.PI) / 180;

  const p = createPerson({
    name: 'mother-body',
    height: M.height,
    skin: 0xcc966f,
    face: { brows: 2.2, lines: true, blush: 0.08, lips: '#a65a50', eyeW: 9.5 },
    hair: 'bob',
    hairColor: 0x15110e,
    top: { map: clothTex('check', '#c4d2dc', '#5f7f9e', [7, 3]), sleeve: 'rolled' },
    bottom: { color: 0x2c3242, kind: 'pants' },
    shoes: { color: 0x1a1818, sole: 0xd6d0c2 },
  });
  root.add(p.body);

  // 小板凳
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.85 });
  {
    const st = new THREE.Group();
    st.add(box(-0.16, 0.16, 0.19, 0.22, -0.1, 0.1, wood, { solid: false }));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.19, 6), wood);
        leg.position.set(sx * 0.12, 0.095, sz * 0.07);
        leg.rotation.set(sz * 0.12, 0, -sx * 0.12);
        leg.castShadow = true;
        st.add(leg);
      }
    }
    st.position.z = -0.02;
    root.add(st);
  }

  // 大铝盆：口沿卷边，盆壁磕了几个坑（颜色深浅不一）
  const BZ = 0.68; // 盆心离她多远
  const alu = new THREE.MeshStandardMaterial({ color: 0xb4b4ae, roughness: 0.42, metalness: 0.75, side: THREE.DoubleSide });
  {
    const prof = [[0, 0.004], [0.25, 0.004], [0.27, 0.02], [0.35, 0.165], [0.36, 0.172]].map(([a, b]) => new THREE.Vector2(a, b));
    const basin = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), alu);
    basin.position.z = BZ;
    basin.castShadow = basin.receiveShadow = true;
    root.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.362, 0.009, 6, 40).rotateX(Math.PI / 2), alu);
    rim.position.set(0, 0.174, BZ);
    root.add(rim);
    // 水：灰白发浑，漂着肥皂沫
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.33, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: sudsTex(), color: 0xdde4e2, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.86 }));
    water.position.set(0, 0.125, BZ);
    water.userData.noAO = true;
    root.add(water);
  }
  // 搓衣板：底在盆里远的那边，上头斜靠过来；一道道横棱
  const boardBottom = new THREE.Vector3(0, 0.03, BZ + 0.24);
  const boardTop = new THREE.Vector3(0, 0.31, BZ - 0.2);
  const boardDir = boardTop.clone().sub(boardBottom).normalize();
  {
    const board = new THREE.Group();
    const len = boardTop.distanceTo(boardBottom) + 0.04;
    const bw = new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 0.8 });
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, len, 0.018), bw);
    plank.castShadow = true;
    board.add(plank);
    const ridge = new THREE.CylinderGeometry(0.007, 0.007, 0.26, 6).rotateZ(Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const rg = new THREE.Mesh(ridge, bw);
      rg.position.set(0, -len / 2 + 0.08 + i * ((len - 0.16) / 15), 0.009);
      board.add(rg);
    }
    board.position.copy(boardBottom).lerp(boardTop, 0.5);
    board.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), boardDir);
    root.add(board);
  }
  // 衣服：盆里泡着的几件、搓衣板上按着的一件、旁边地上一堆
  const clothMats = [0x3e5a7a, 0xe6e0d0, 0x8a3a34, 0x5a6a4a, 0xd8c8a0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const lump = (mat, x, y, z, sx, sy, sz, ry = 0) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), mat);
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + Math.sin(pos.getX(i) * 4 + pos.getZ(i) * 3) * 0.12 + Math.cos(pos.getY(i) * 5 + pos.getX(i) * 2) * 0.07 + Math.sin(pos.getZ(i) * 11) * 0.03;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
    }
    m.geometry.computeVertexNormals();
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    root.add(m);
    return m;
  };
  lump(clothMats[0], -0.16, 0.12, BZ + 0.08, 0.11, 0.03, 0.09, 0.4);
  lump(clothMats[1], 0.17, 0.12, BZ + 0.05, 0.1, 0.03, 0.12, -0.3);
  lump(clothMats[2], 0.05, 0.12, BZ + 0.22, 0.09, 0.025, 0.07, 1.1);
  const onBoard = lump(clothMats[1], 0, 0, 0, 0.1, 0.03, 0.08);
  for (const [i, x, z, y] of [[3, 0.55, 0.15, 0.05], [0, 0.6, 0.35, 0.05], [4, 0.52, 0.32, 0.11], [2, 0.62, 0.2, 0.12]]) lump(clothMats[i], x, y, z, 0.15, 0.05, 0.12, x * 3);

  const blocker = box(-0.42, 0.8, 0, 1.0, -0.22, BZ + 0.4, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false });
  root.add(blocker);

  const along = boardDir.clone();
  const normal = new THREE.Vector3(0, 1, 0).sub(along.clone().multiplyScalar(along.y)).normalize(); // 搓衣板面朝上的法线
  const P = {
    pelvis: new THREE.Vector3(0, 0.29, -0.02),
    pitch: 0.8,
    feet: [new THREE.Vector3(-0.25, 0.065, 0.29), new THREE.Vector3(0.25, 0.065, 0.29)], // 脚在盆沿外面
    knee: [new THREE.Vector3(-0.7, 1, 0.5), new THREE.Vector3(0.7, 1, 0.5)],
    hands: [new THREE.Vector3(), new THREE.Vector3()],
    elbow: [new THREE.Vector3(-1, -0.4, 0), new THREE.Vector3(1, -0.4, 0)],
    headPitch: 0.15,
    headYaw: 0,
  };
  const center = boardBottom.clone().lerp(boardTop, 0.7);

  function place(t) {
    // 两手按着衣服在搓衣板上一上一下地搓，身子跟着一送一送
    const k = Math.sin(t * Math.PI * 2 * 1.25);
    const c = center.clone().addScaledVector(along, k * 0.055).addScaledVector(normal, 0.035);
    P.hands[0].copy(c).add(new THREE.Vector3(-0.07, 0, 0));
    P.hands[1].copy(c).add(new THREE.Vector3(0.07, 0, 0));
    P.pitch = 0.8 - k * 0.03;
    P.headYaw = Math.sin(t * 0.3) * 0.12;
    p.pose(P);
    onBoard.position.copy(c).addScaledVector(normal, -0.012);
    onBoard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }
  place(0);
  return { object: root, update: (dt, t) => place(t) };
}

/** 洗衣水：灰白，飘着一团团肥皂沫 */
function sudsTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  let s = 251;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#9aa6a4';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 120; i++) {
    const x = r() * 128;
    const y = r() * 128;
    const rad = 1 + r() * 4;
    g.fillStyle = `rgba(250,250,246,${0.5 + r() * 0.4})`;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
