import * as THREE from 'three';
import { CHARACTERS } from '../layout.js';
import photoUrl from './father-front.webp?url';

/**
 * 父亲：用用户提供的正面全身照抠出来的人像（father-front.webp，已去背景、补了被遮住的鞋），
 * 做成立在院子里的“照片人”，像真人。用户明确同意把照片放进仓库和公开网站。
 *
 * - 始终转向观看的人（只绕竖轴转，最多偏离正南 ±57°；再往侧面/背后看就是一张薄片，背面显示成暗的剪影）
 * - 转动的轴穿过他垂着的右手，所以从哪个角度看，右手都搭在大黄头上
 * - 照片本身带着拍摄时的光，不再受场景光照；只按时间整体调色（傍晚偏暖、夜里变暗）
 * - 影子：一张看不见的同样剪影始终朝着太阳，投出完整的人影
 *
 * 照片尺寸 449 × 1200 像素，对应身高 1.72 m；右手手心在 (52, 662) 像素处。
 */
const IMG_W = 449;
const IMG_H = 1200;
const HAND_PX = [52, 662];
const MAX_YAW = 1.0; // 弧度，约 57°

export function createFather() {
  const F = CHARACTERS.father;
  const s = F.height / IMG_H; // 米/像素
  const w = IMG_W * s;
  const h = IMG_H * s;
  const handX = (HAND_PX[0] - IMG_W / 2) * s; // 手相对照片中线（负 = 画面左 = 他的右手）
  const handY = (IMG_H - HAND_PX[1]) * s;

  const root = new THREE.Group();
  root.name = 'father';
  // root 放在右手的竖轴上
  root.position.set(F.handX, 0, F.handZ);

  const tex = new THREE.TextureLoader().load(photoUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // 照片平面：以右手为原点，往右（他的身体那边）展开
  const geo = new THREE.PlaneGeometry(w, h).translate(-handX, h / 2, 0);
  const front = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.FrontSide, toneMapped: false });
  const back = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.BackSide, color: 0x2a2622, toneMapped: false });
  const card = new THREE.Group();
  const frontMesh = new THREE.Mesh(geo, front);
  const backMesh = new THREE.Mesh(geo, back);
  for (const m of [frontMesh, backMesh]) {
    m.userData.noAO = true;
    m.renderOrder = 1;
  }
  card.add(frontMesh, backMesh);
  root.add(card);

  // 影子：同样的剪影，看不见，始终正对太阳
  const shadowMat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
  const shadowCard = new THREE.Mesh(geo, shadowMat);
  shadowCard.castShadow = true;
  shadowCard.userData.noAO = true;
  root.add(shadowCard);

  // 脚下一团柔和的接地阴影（照片人自己的影子不够贴地）
  const blob = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.42).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }),
  );
  contact.position.set(-handX - 0.03, 0.006, 0.02);
  contact.userData.noAO = true;
  root.add(contact);

  // 碰撞：人占的地方（他身体中线在手的右边约 0.25 m）
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  blocker.position.set(-handX - 0.02, 0.8, 0);
  blocker.userData.solid = true;
  root.add(blocker);

  const camPos = new THREE.Vector3();
  const rootPos = new THREE.Vector3();
  const tint = new THREE.Color(1, 1, 1);
  return {
    object: root,
    handHeight: handY,
    /** 按时间调色：p 为 lighting 的插值参数 */
    setLight(p) {
      const sun = new THREE.Color(p.light.color);
      const level = THREE.MathUtils.lerp(1, 0.3, p.night) * THREE.MathUtils.lerp(0.92, 1, Math.min(1, p.light.elev / 40));
      tint.setRGB(1, 1, 1).lerp(sun, 0.28 * (1 - p.night)).lerp(new THREE.Color(0x8ea6d6), 0.35 * p.night).multiplyScalar(level);
      front.color.copy(tint);
      // 影子剪影朝着太阳（只绕竖轴）
      const az = THREE.MathUtils.degToRad(p.light.az);
      shadowCard.rotation.y = Math.atan2(Math.sin(az), -Math.cos(az)) - root.rotation.y;
    },
    update(dt, t, camera) {
      camera.getWorldPosition(camPos);
      root.getWorldPosition(rootPos);
      let yaw = Math.atan2(camPos.x - rootPos.x, camPos.z - rootPos.z); // 0 = 正南
      yaw = THREE.MathUtils.clamp(yaw, -MAX_YAW, MAX_YAW);
      card.rotation.y = yaw;
    },
  };
}
