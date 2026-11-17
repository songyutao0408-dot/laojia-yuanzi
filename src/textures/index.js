/**
 * 程序生成贴图（canvas），不依赖任何外部图片。
 *   canvas.js     底层工具：可平铺噪声、高度→法线、打包成纹理
 *   brick.js      redBrick 清水红砖墙、brickPaving 地面铺砖
 *   earth.js      rammedEarth 夯土墙、loessGround 黄土地、concrete 水泥、mudPlaster 灶台泥面
 *   metalWood.js  rustyIron 掉漆锈铁、paintedWood 旧漆木、bark 树皮
 *   mural.js      tileMural 影背墙瓷砖画（公园 + 湖面 + 荷花）
 *   decals.js     春联、福字、墙头杂草、墙根泛碱泥点、湿地水渍（带透明通道）
 *   materials.js  mat(key) 材质库（缓存），glassMat 窗玻璃
 */
export { mat, glassMat, stainMat, wetMat, grassMat, coupletMat, fuMat } from './materials.js';
export { TEX } from './canvas.js';
