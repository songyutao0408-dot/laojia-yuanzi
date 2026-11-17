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
- `npm run build && npm run shots` → Playwright 无头浏览器截图到 `screenshots/`（已 gitignore），并检查黑屏和页面报错。机位列表在 `scripts/screenshot.mjs` 的 `SHOTS`（俯视、环绕、门口、北屋两间室内、厨房室内、院内看大门、台阶看院子）。Playwright 用本机全局安装的版本，不在 package.json 里
- 页面支持 `?view=top|orbit|walk` 直接打开指定视角，`&cam=x,y,z,tx,ty,tz` 指定相机位置/注视点；`window.__app` 暴露 engine / views 方便调试
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
  core/box.js           box() 盒子工具 + worldUV()：按世界坐标（米）生成 UV，贴图比例真实、跨墙段连续
  core/whitebox.js      白模纯色材质（第 4 步后已基本不用，保留给快速试验）
  textures/             canvas 程序生成的 PBR 贴图（颜色/法线/粗糙度），见 textures/index.js 的清单
    leaves.js           带透明通道的叶片簇贴图（泡桐/石榴/枣/丝瓜/豆角）+ leafMaterial()
    materials.js        mat(key) 材质库（首次使用时生成并缓存）；stainMat/wetMat/grassMat/coupletMat/fuMat 贴花材质
  ground/               黄土地面（院内没有砖路）、院外地面、井边湿地
  buildings/            北屋、厨房、土墙、大门、影背墙、茅厕（一个建筑一个文件）
    wall.js             通用构件：wallWithOpenings（带门窗洞的厚墙，可带过梁/窗台/玻璃）、brickBox（四墙+地坪+平顶+檐口）、baseStain（墙根泛碱泥点）
    doorsWindows.js     woodDoor（门框+门槛+向内半开的门扇+倒福）、woodWindow（木框窗棂）、couplets（春联+横批）
  trees/                泡桐（当地叫梧桐）、石榴、枣树（一种树一个文件）
    treeBuilder.js      递归生长枝干骨架 → 缩放到目标树高/冠幅 → 树皮圆管 + 叶片卡片（InstancedMesh）+ 挂果点 + 碰撞体
    wind.js             叶片风摆（onBeforeCompile 注入顶点位移），main.js 每帧 updateWind(t)
  well/                 压水井：井台、铸铁泵身、出水嘴、压杆（节点 handle-pivot / spout-tip / piston-rod 留给第 6 步动画）、铁桶、葫芦瓢
  garden/               菜地：两畦（丝瓜、豆角）、起垄、竹竿人字架、藤叶卡片、丝瓜和豆荚
  lighting/             太阳光、天空、时间切换、雾、星空、窗户灯光
  controls/             俯视/环绕/走进去 三种浏览模式、碰撞、手机摇杆
  interiors/            室内细节（以后补），见 interiors/README.md
  ui/                   样式、HUD（时间滑块、指北针等）
scripts/
  gen-plan.mjs          由 layout.js 生成 docs/plan.svg
  screenshot.mjs        自检截图
docs/
  scene-spec.md         场景权威描述
  plan.svg              俯视平面图
```

## 实现约定

- **碰撞**：参与第一人称碰撞的 Mesh 设 `userData.solid = true`（墙、树干、泵身、玻璃等；地坪、台阶、屋顶为 false）。第 6 步从场景里收集这些 Mesh 生成碰撞体
- **室内锚点**：北屋每间、厨房各有一个 `interior-anchor-<west|east|kitchen>` 节点，位于室内西北角墙内侧、地坪面，`userData.size = { w, d, h }` 为室内净空
- 北屋室内地坪 0.45 m，门洞底 = 地坪；台阶 3 级在门外
- 树冠不能用球体：用 treeBuilder 的枝干骨架 + 叶片卡片。树的外形参数在各物种文件顶部的 PARAMS 里
- **可采摘的果子**：石榴每个果子是一个 Group（userData.fruit = 'pomegranate'，split 表示咧口）；枣子是一个 InstancedMesh（userData.fruit = 'jujube'），摘掉时把对应实例矩阵缩为 0
- 自检截图：无头浏览器软件渲染很慢，每个机位 30~60 s，偶尔导航超时，脚本会自动重试一次
- **贴图与 UV**：盒子类几何用 `core/box.js` 的世界坐标 UV（单位：米），贴图 `textureSet(..., meters)` 设置 repeat = 1/meters。不平铺的画面（瓷砖画、春联）用几何体自带 0..1 UV
- **贴图都是运行时 canvas 生成**，首次打开有生成耗时（`window.__app.buildMs`）；分辨率总开关 `TEX.scale`（textures/canvas.js），第 7 步按设备性能调整
- 北屋/厨房室内墙面目前与外墙同为清水砖，顶棚白灰；室内装修（抹灰、刷白）留给 src/interiors/ 阶段决定

## 工作流程（用户要求）

分步进行；**每完成一步：更新本文件 → 截图自检 → 提交、推送、开 PR（写清做了什么、重点看哪里）→ 停下等用户确认**。
开发分支：`claude/wizardly-shannon-atq3e3`。

## 进度

- [x] **第 1 步**：项目骨架、CLAUDE.md、docs/scene-spec.md、GitHub Pages 部署、俯视平面图 `docs/plan.svg`（v4：按父亲确认的 15 m × 18 m 重新布局，门窗/茅厕已核对）
- [x] **第 2 步**：纯色方块白模（北屋、厨房含真实室内空间和门洞；各树的比例、间距）
- [x] **第 3 步**：材质与建筑细节（红砖、土墙、门窗、台阶、灶台、影背墙瓷砖画、铁门）
- [x] **第 4 步**：植物（梧桐、石榴、枣树、菜地）和压水井
- [ ] **第 5 步**：光影、Sky 天空、GTAO/SSAO、时间切换、星空、炊烟、雾
- [ ] **第 6 步**：三种浏览模式完善、第一人称碰撞、手机摇杆、压水井/摘果交互、指北针
- [ ] **第 7 步**：性能分级、单文件 HTML 打包（Release 附件或 dist-single/）、README 写在线链接和操作说明

## 待确认 / 已做的假设

见 `docs/scene-spec.md` 中所有 **【待确认】** 标记。

已确认：院子 15 m × 18 m（含北屋）；北屋每间 7.5 m × 5 m；厨房与西北屋间有约 2 m 空当；厨房门窗朝东、烟囱在西北角；南侧用土墙代替邻居房子；梧桐（v5 改为约 10 m）。

另已确认（v3）：西北屋窗只在门西侧、东北屋窗只在门东侧；空当西端有土墙；影背墙距大门三四米；茅厕东西约 2 m。

另已确认（v4）：大门无红砖门垛；菜地种丝瓜、豆角。另已确认（v5）：梧桐约 10 m 高、冠幅半径约 5 m；北屋隔墙无门。另已确认（v7）：所有砖为很淡的旧红色；院内没有砖路（裸露黄土，不要加任何通道/砖/装饰）；梧桐即泡桐；北屋墙根 0.35 m 水泥勒脚。目前 spec 中没有待确认项。
