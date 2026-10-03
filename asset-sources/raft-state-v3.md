# 木筏状态映射资产 v3

2026-10-03。只改表现，不改 GameSession、卡池或扩建规则。取代主场景固定 4×3 筏板、长边框与占格装饰；旧完整木筏工坊和设备工厂保留。

| AssetId | 程序源 | 配置与依赖 |
| --- | --- | --- |
| model.raft-root | dist/presentation/models/raft-root.js:createRaftRoot | ROOT_CONFIG：4.4×1.65，低帐篷、灯、箱、绳圈、渔网；借用 texture.raft-wood；functional=false |
| presentation.raft-state | dist/presentation/scene/raft-presenter.js:createRaftPresenter | PRESENTATION_CONFIG；依赖筏板、筏根、格子文字纹理；初始格距来自 RAFT_CONFIG |
| texture.raft-cell-label | dist/presentation/materials/cell-label.js:createCellLabel | 每实例 Canvas 512×256，系统 Microsoft YaHei 字体及 sans-serif 回退；文字/战损改变才重绘，无外部 PNG |

主游戏由 scene.js 接收 GameSession.getView()；独立 raft-state.html 使用明确标注的 12/20/6 格与设备战损测试快照。20 格示例不是游戏扩建操作。model.equipment.c18–c21 保留工厂与测试，当前主场景设备用文字占位。

按 cells 的 ID 对账和 x/z 定位，槽位角色来自 defense/logistics.cellId，物品来自 units.cellId；名称查 CARDS，结构/生产阈值查 EQUIPMENT。标签显示设备名称、结构、生产进度、储存物品、停用及残骸。脱落格隐藏板与拾取代理，只留虚线文字定位。取消整船边框，不画跨越脱落格的横梁。

根区放在网格最小 z 外侧，间隔 0.15；不计入状态 cells、槽位、扩展数量或拾取对象。网格改变后重新定位根区和内容中心。整体缩放为 min(1.05,10.6/宽,10.2/深)，包括格子边界与根区，不改变规则坐标。扩展统计以初始 x=0..3、z=0..2 窗口为基准，登记总数包含脱落格。

筏板视觉种子来自固定 RAFT_CONFIG.seed 与坐标散列，不消费规则随机流。移除格时释放实例资源与标签；根区只释放私有几何/材质，不释放借用的木纹缓存；pagehide 先释放 presenter，再释放共享缓存。标签为 Sprite，深度测试关闭以避免斜视裁字。无图片裁切、新 Shader 或新网络依赖。

验证：tests/raft-presenter.test.mjs 覆盖增删坐标、脱落拾取移除、文本映射、只读视图、根区位置、扩展缩放和偏移网格。浏览器截图位于 evidence/raft-state-v3-*.png；最终检查与限制见根文档 docs/design/raft-presentation.md。
