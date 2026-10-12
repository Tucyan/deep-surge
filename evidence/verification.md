# Godot V0.2 页面基础验证

**重做前历史验证。当前入口已换为 flow_app.gd，验证与限制见 redo-verification.md。**

日期：2026-10-12，Asia/Singapore。本次全部命令在本机重新执行；Godot 4.7.2.stable.official.ed1daf0bf。

| 检查 | 实际结果 |
| --- | --- |
| Node 内容等价测试 | 9/9 PASS，JSON 与玩法实验源对象深度一致（包括嵌套效果/变体） |
| Godot test_session.gd | PASS：非法模式/路由、空会话访问、模式锁定、继续、视图隔离、活动局购买保护、无事件剧情/非商店节点商店/非战斗节点战斗拒绝 |
| Godot test_catalog.gd | PASS：22卡/12节点、目录副本隔离、共享纹理复用、64×64占位、未知素材回退 |
| Godot ui_smoke.gd headless | PASS：真实 GUI 鼠标事件导航、两模式、继续、重复导航生命周期；不存在常驻商店/剧情/战斗入口，节点触发对应面板，关闭返回游戏页，主页面保留为背景 |
| Godot ui_smoke.gd --capture | PASS：OpenGL 3.3 / NVIDIA RTX 4060 Laptop GPU，1440×900实际渲染，9页面截图 |

截图：home、encyclopedia、meta-shop、game、story、shop、craft、raft、battle。人工查看首页、剧情和合成截图后修复占位文字自动换行为竖排的问题，添加失败用例，修复后重新渲染全部页面通过。运行日志未报告脚本错误。

首次内容/页面会话测试按预期失败（实现缺失），实施后通过。首次编辑器导入发现一处 GDScript 无法推断动态目录返回类型，改为显式 Dictionary；后续实际游戏启动和渲染通过。

未验证：正式航行/交易/合成/战斗规则、15站剧情、完整存档、整局结算与局外成长、独立发行构建、跨平台、音效、键盘完整交互和大规模性能。按钮导航与页面截图只证明本次界面基础，不能证明正式 V0.2 游戏已完成。
