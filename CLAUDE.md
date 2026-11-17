# CLAUDE.md —— 新会话接手必读

## 项目目标

用 Three.js 做一个**写实风格**的 3D 场景，复刻用户七八岁时（约 1990 年代）河北邢台任县农村老家的院子。
可以俯视、环绕旋转查看，也能以小孩视角（1.2 m）第一人称"走进去"。这是长期迭代项目，以后会继续加细节（如北屋室内）。

- **场景的权威描述是 [`docs/scene-spec.md`](docs/scene-spec.md)**。用户补充或修改细节时：先改 spec → 再改 `src/layout.js` / 代码 → `npm run plan` 重新生成平面图。
- 平面图：[`docs/plan.svg`](docs/plan.svg)（由 `scripts/gen-plan.mjs` 从 `src/layout.js` 生成，不要手改）。
- 风格红线：写实、温暖怀旧；不要卡通/低多边形；不要现代元素（空调外机、铝合金门窗、瓷砖外墙）。

## 坐标约定（全项目统一）

| 项 | 约定 |
|---|---|
| 单位 | 1 单位 = 1 米 |
| X | **+X = 东** |
| Z | **-Z = 北**，+Z = 南 |
| Y | +Y = 上，院子地面 y = 0 |
| 原点 | 整个宅院（院墙围合范围）的中心；宅院范围 X ∈ [-7.5, 7.5]，Z ∈ [-9, 9]（东西 15 m × 南北 18 m） |
| 矩形 | `src/layout.js` 中统一用 `{ x0, x1, z0, z1 }`（z0 在北，z1 在南） |
| 室内原点 | 每个房间室内地坪的西北角（墙内侧），见 `src/interiors/README.md` |

**所有尺寸/位置只写在 `src/layout.js` 里**，各模块从那里读，不要在模块里写死坐标。

## 技术栈与命令

- Vite 8 + Three.js 0.187（`three/addons/...` 引入扩展）
- `npm run dev` 本地开发
- `npm run build` → `dist/`（base = `/laojia-yuanzi/`，用于 GitHub Pages）
- `npm run build:single` → `dist-single/index.html`（vite-plugin-singlefile，所有资源内联，可双击打开）
- `npm run plan` → 重新生成 `docs/plan.svg`
- `npm run build && npm run shots` → Playwright 无头浏览器截 俯视/环绕/门口 三张图到 `screenshots/`（已 gitignore），并检查黑屏和页面报错。Playwright 用本机全局安装的版本，不在 package.json 里
- 页面支持 `?view=top|orbit|walk` 直接打开指定视角；`window.__app` 暴露 engine / views 方便调试
- 部署：`.github/workflows/deploy.yml`，push 到 `main` 自动构建并发布到 GitHub Pages
  （线上地址：https://songyutao0408-dot.github.io/laojia-yuanzi/ ）

## 目录结构与模块职责

```
index.html              页面 + HUD（视角按钮）
vite.config.js          base 路径 / 单文件打包模式
src/
  main.js               入口：创建 engine，按模块组装场景，绑定 UI
  layout.js             ★ 唯一的尺寸/位置数据源（纯数据，不 import three）
  core/engine.js        渲染器、场景、相机、主循环（onUpdate 注册每帧回调；setRenderFn 留给后期）
  core/geom.js          矩形小工具
  textures/             canvas 程序生成的 PBR 贴图（颜色/法线/粗糙度）
  ground/               黄土地面、院外地面、红砖小路
  buildings/            北屋、厨房、土墙、大门、影背墙、茅厕（一个建筑一个文件）
  trees/                梧桐、石榴、枣树（一种树一个文件）
  well/                 压水井（建模 + 压水交互）
  garden/               菜地（菜畦、竹竿架、黄瓜豆角）
  lighting/             太阳光、天空、时间切换、雾、星空、窗户灯光
  controls/             俯视/环绕/走进去 三种浏览模式、碰撞、手机摇杆
  interiors/            室内细节（以后补），见 interiors/README.md
  ui/                   样式、HUD（时间滑块、指北针等）
  debug/footprints.js   第 1 步临时用的占地色块，第 2 步白模完成后删除
scripts/
  gen-plan.mjs          由 layout.js 生成 docs/plan.svg
  screenshot.mjs        自检截图
docs/
  scene-spec.md         场景权威描述
  plan.svg              俯视平面图
```

## 工作流程（用户要求）

分步进行；**每完成一步：更新本文件 → 截图自检 → 提交、推送、开 PR（写清做了什么、重点看哪里）→ 停下等用户确认**。
开发分支：`claude/wizardly-shannon-atq3e3`。

## 进度

- [x] **第 1 步**：项目骨架、CLAUDE.md、docs/scene-spec.md、GitHub Pages 部署、俯视平面图 `docs/plan.svg`（v2：按父亲确认的 15 m × 18 m 重新布局）
- [ ] **第 2 步**：纯色方块白模（北屋、厨房含真实室内空间和门洞；各树的比例、间距）
- [ ] **第 3 步**：材质与建筑细节（红砖、土墙、门窗、台阶、灶台、影背墙瓷砖画、铁门）
- [ ] **第 4 步**：植物（梧桐、石榴、枣树、菜地）和压水井
- [ ] **第 5 步**：光影、Sky 天空、GTAO/SSAO、时间切换、星空、炊烟、雾
- [ ] **第 6 步**：三种浏览模式完善、第一人称碰撞、手机摇杆、压水井/摘果交互、指北针
- [ ] **第 7 步**：性能分级、单文件 HTML 打包（Release 附件或 dist-single/）、README 写在线链接和操作说明

## 待确认 / 已做的假设

见 `docs/scene-spec.md` 中所有 **【待确认】** 标记。

已确认：院子 15 m × 18 m（含北屋）；北屋每间 7.5 m × 5 m；厨房与西北屋间有约 2 m 空当；厨房门窗朝东、烟囱在西北角；南侧用土墙代替邻居房子；梧桐约 4.6 m。

仍待确认：
- 北屋门窗位置（目前每间门居中、两侧各一窗）
- 空当西端是否有墙（目前用土墙封住）
- 影背墙尺寸；影背墙到茅厕实际约 8 m（原描述 3～4 m）
