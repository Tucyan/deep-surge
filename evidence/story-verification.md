# 第一层测试剧情验证

2026-10-12，Godot 4.7.2 / Windows / Compatibility；实际GPU为RTX 4060 Laptop、OpenGL 3.3。测试隔离用户存档，无外部下载，无提交/推送。试测设计依据：[第一层测试剧情方案](../../V0.2/第一层测试剧情方案.md)。

## 当次规则验证

`tests/test_story.gd`从真实种子22/愚者新局开始，分别完整执行学者封闭A、拖离B、紧急撤离C和独航SOLO。全部通过15次真实移动、前三站教学、普通随机池、节点结果、轮末、超限整理；6～14晚各一次行动，公共8/11/14事件只经历一次。每步JSON保存并实际重新载入后继续命令，包含对白游标、战斗、夜间选择/结果、最终支付、尾声和章节停点。

| 路线 | 章节停点 | 主要夜间行动 | HP/SAN（主动结束前） |
| --- | --- | --- | --- |
| 学者/封闭 | chapterComplete / A | 9 | 31 / 100 |
| 学者/拖离 | chapterComplete / B | 9 | 31 / 100 |
| 学者/撤离 | chapterComplete / C | 9 | 27 / 100 |
| 独航 | chapterComplete / SOLO | 9 | 31 / 100 |

测试随后显式主动结束本局，确认一次获得15点；重复结束拒绝。不把日志最终`phase=finished`误写为章节直接整局结算。

`tests/test_story_edges.gd`的服务/危机夹具明确标记test-fixture，仅用于边界：委托实际付绳索2、奖励仅一次；交换每晚一次；夜间不增加航耗/不刷新基地AP；调查前置与重复操作拒绝且状态原子回滚；异常预算/线索存档拒绝；零物资、生命1仍有C撤离出口；移动车毁人亡先于教学补给，无复活。完整路线使用正常内容，不靠夹具完成。

回归`test_flow / test_mechanics / test_routes / test_save / test_catalog / test_clean_ui`均通过。挑战种子0仍在第11站SAN失败、完成10节点；种子22仍12站Boss胜利，HP13/SAN24。保存验证新增上一版v02-2挑战档迁移，保留随机及物资。Node原始9表深度等价测试9/9通过。命令输出：[story-rules.txt](story-rules.txt)。

最终教学AP保护修改后，四条完整规则路线及`test_story_edges / test_flow / test_mechanics / test_save / test_clean_ui`再次通过；原生挑战鼠标回归12站首领胜利通过。最后单独运行原生剧情GUI，15站A再次通过并更新全部story截图。一次并行运行的GUI脚本在第12站记录导航点击未推进，保留`hud-story-blocked.png`诊断；单独运行未复现，不把它解释为已确认的规则或输入故障，也不声明自动GUI输入稳定性已全面验证。

## 实际GUI验证

`Godot --path . --script res://tests/story_ui_smoke.gd -- --capture`通过。真实1600×900原生GPU窗口，从首页剧情准备/默认强壮之人/种子22到15站A章节停点；按钮用真实鼠标输入事件，下拉框通过控件选择接口选择，不注入规则状态。通过实际合成/安装/升级教学，安装弓弩与灯、补给/燃料、教学胜利、调查线索、公共事件、危机支付和尾声；任务分页可操作。全程检测无ScrollContainer，已启用按钮在视口内。

截图：

- [独立剧情准备](hud-story-setup.png)
- [设备教学指引](hud-story-teaching.png)
- [新增舱门](hud-story-S05.png)
- [夜间一次行动](hud-story-night.png)
- [危机前夜](hud-story-P14.png)
- [最终可执行方案](hud-story-final-choice.png)
- [悬疑尾声](hud-story-EP15.png)
- [章节成果与3D木筏](hud-story-complete.png)
- [已知任务与线索](hud-story-journal.png)

已修复实际测试发现的教学手牌分页超底边；JSON数字恢复后固定航次键与战斗取模问题。第2站按制造/安装/升级顺序保留必要AP，拒绝误做其他配方造成教学卡死；操作实际收费，未免费完成或刷新AP。规则四路线与GUI完整A路线在修复后重新验证通过。

## 范围

对白/补给/夜间恢复/调查代价/危机判定/独航出口均为test-story-v1试测设计。未声称所有随机种子、全部出身、全部调查安排已平衡或一定能存活。仍存在挑战原未实现特殊节点/藏品/环境效果；本次不把它们改写或伪实现。没有第二层、夜间战斗、舱门专属3D模型、新人物图片或发行导出构建。11个固定剧情图片位置为独立AssetId纯色文字占位，航行保留原Godot 3D木筏/海面。
