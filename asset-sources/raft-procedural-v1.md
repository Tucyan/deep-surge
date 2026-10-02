# Three.js 木筏与扩展板 v1

日期：2026-10-03。资产为项目内新写的程序化 Three.js 几何与木纹，不依赖 Blender 木筏、外部图片或新下载。可编辑源为 [模型工厂](../dist/presentation/models/raft.js)，默认配置 `RAFT_CONFIG`、视觉种子 2187；Three.js r180 本地 vendor 沿用 MIT 依赖。

## 资产与结构

- `model.raft`：按输入的格坐标组合扩展板。默认四格 2×2 仅为资产展示配置，不确定正式初始筏格数量。
- `model.raft-expansion-panel`：单格模块，七条倒角甲板、两根浮木、端面年轮、底部横撑、绑绳、钉子和连接件。
- `texture.raft-wood`：256×64 RGBA DataTexture，固定视觉种子生成木纹/木节，颜色空间 sRGB，无 DOM/Canvas 依赖。
- 绳圈、钉子及其他重复细件使用 InstancedMesh；甲板独立保留以表现破损。

坐标：Y 向上，XZ 格平面，格中心为原点，甲板锚点 Y=0；格间距 X=2.3、Z=2.25，沿用旧场景。实际木料留缝，边缘不超过格占地。尺寸为展示设计参数，不能用模型外观改变玩法面积。甲板 UV、法线及浮木封口具备测试检查。

## 接口与资源所有权

```js
const resources = createRaftResources({ seed: 2187 });
const raft = createRaft({ resources, cells: [{ id: 'cell-a', x: 0, z: 0 }] });
scene.add(raft.root);
const panel = raft.addCell({ id: 'cell-b', x: 1, z: 0 });
panel.setState('damaged'); // 只更新展示
panel.setState('intact');
raft.removeCell('cell-b');
raft.dispose();
resources.dispose();
```

`createExpansionPanel({resources, cellId, seed, state})` 返回 `{root, pickMesh, anchors: {deck}, setState, dispose}`。`pickMesh.userData.cellId` 可映射规则实体 ID。模型对象不放入 GameState。独立板可自行加入父节点；完整木筏以输入格坐标映射局部位置。

`createRaft({resources, cells, seed})` 返回 `{root, cells: Map, addCell, removeCell, dispose}`。新增展示模块检查整数格坐标、重复 ID/坐标、至少一条共享边；这是组合接口的防重叠检查，AP、材料、外围、破损禁放、设备停用/损失仍由规则核心处理。初始化允许还原任意给定格集合。

状态：完好恢复甲板；破损为局部下沉、倾斜和裂缝；脱落隐藏模块，真正移除用 `removeCell`。状态展示不计龄、不随机惩罚，也不恢复规则设备。拾取管理者只将当前可交互格的 `pickMesh` 放入射线候选，不根据可见性自动推断放置合法性。

实例 dispose 清理层级与私有实例化缓冲；共享 geometry/material/DataTexture 归 resources 管理，最后一个消费者移除后统一释放。dispose 可重复调用。旧 scene.js 已替换 makeTile，局部 Y 偏移 .19 适配原有装饰、拾取和高亮；既有帆篷、桶、箱、外围框与动画继续由旧场景维护。重复扩展不再覆盖同一位置。

## 展示与验证

启动 `npm start` 后打开 `/raft-assets.html`。拖动旋转、滚轮缩放、切换三种状态、拼接最多两块扩展板、重置和浮动开关。两块上限是展示布局限制，不是游戏木筏上限。浮动为展示动画，无刚体浮力模拟。

- `npm run check`：原入口及新增模型/展示脚本语法检查。
- `npm run test:assets`：Node 内置测试检查占地/锚点、格拼接防重叠、状态恢复、固定种子、共享释放、拾取 ID 和几何 UV/法线有效性。
- 实际浏览器检查完好、拼接、破损、脱落及重置，主场景渲染正常；检查时两页 warning/error 日志为空。
- 展示默认四格木筏加独立板及海面：28,220 三角面、76 draw calls；一块拼接加破损板：30,660 三角面、94 draw calls。数字含海面及当前 renderer 统计，不是模型本体预算或 FPS 测量。实例化前默认 256 draw calls。
- 截图见 `evidence/raft-assets-intact.png`、`evidence/raft-assets-damaged.png`、`evidence/raft-main-scene.png`。

当前交付为 Three.js 模型工厂，没有导出 GLB/FBX，没有导入正式规则核心或验证完整一层玩法。旧演示 UI 的船体数值仍是既有占位行为，此次没有以资产任务修改规则 UI。
