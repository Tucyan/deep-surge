# 3D航行与简洁HUD验证

日期：2026-10-12（Asia/Singapore）。本记录覆盖用户要求的截图布局、模式准备独立显示、3D航行和避免滚动条。

| 检查 | 本次结果 |
| --- | --- |
| test_clean_ui.gd | PASS：新局准备没有首页按钮；主界面/木筏/合成/日志/图鉴/局外店无ScrollContainer；真实SubViewport/Node3D；四逻辑格、GLB九网格；1600×900/1280×720按钮在视口内；超限手牌分组及翻页不改状态/随机 |
| 原始内容 | Node 9/9深度等价PASS，卡/节点/配方/货架未改 |
| 纯核心回归 | FLOW SESSION、MECHANICS、ROUTES、SAVE/RECOVERY通过 |
| 实际GPU鼠标 | OpenGL3.3 / RTX4060 Laptop / Godot4.7.2，1600×900：九页面、新局准备、按需机制/返回、分页和完整12航次Boss胜利通过 |

```text
MOUSE FULL ROUTE seed=22 length=12 nodes=12 result=survived
FLOW UI: PASS
CLEAN HUD: PASS
```

截图：hud-home/setup/game/craft/raft/story/shop/battle/encyclopedia/meta-shop/completed.png。主场景与新局准备及合成/战斗截图已实际查看；根据截图放大木筏主体、修正页码竖排和减少卡上重复名称。

测试输入按视口最终变换转换坐标。初次改变画布基准后旧鼠标测试坐标失配；修正变换并统一完整GPU航程为1600×900后通过。1280×720另通过界面边界检查，不把合成/商店夹具冒充随机航程。

源模型复制自raft-model/raft.glb，SHA256=822d7c0da07c14e4f5b3515b1aab098c8de0bc3cf0ad0ced884a54a0787e7613。Godot实际导入成功，原模型未改。海水/逻辑筏格/礁石/目标标志为程序化资产，记录见assets/README.md。

边界：卡牌图片仍为可替换占位；海水反光是原生材质近似，浮动非物理浮力；3D装饰不增加逻辑格。剧情15站和旧记录中未开放机制保持原限制，本次不声称新增玩法或完整视觉性能验收。旧已运行窗口不强制关闭，用户存档未由测试覆盖。
