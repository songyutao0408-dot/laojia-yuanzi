# src/interiors/ —— 室内细节

每个房间一个文件，导出 `createXxxInterior()`，返回 `{ group, update(dt, t, player), ... }`。
main.js 把 `group` 挂在房间的**室内原点**（`interior-anchor-<id>`）上，每帧调 `update`：

- 原点在该房间室内地坪的西北角（墙内侧），`y = 0` 是室内地坪面；
- 坐标方向与全局一致：+X 东、-Z 北、+Y 上，1 单位 = 1 米；
- 室内的尺寸/位置写在 `src/layout.js`（西北屋：`WEST_ROOM`，用的就是室内坐标），不要在这里写死；
- 要挡人的家具设 `userData.solid = true`；室内新开的门洞要加到 `controls/firstPerson.js` 的 `DOORWAYS`（进门辅助）。

计划的文件：

| 文件 | 房间 | 状态 |
|---|---|---|
| `northWest.js` | 西北屋 | 第 10 轮：隔墙（外屋/里屋）、门帘、白灰墙；里屋的炕和被子、拉线开关 + 灯泡、做蜡烛的器具、熏黑的南墙。外屋陈设待做 |
| `northEast.js` | 东北屋 | 待做 |
| `kitchen.js` | 厨房（灶台/大铁锅/柴火在第 3 步随建筑做，其余细节在这里） | 待做 |
