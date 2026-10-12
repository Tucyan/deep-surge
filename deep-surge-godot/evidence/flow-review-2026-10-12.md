# 当前内容与 V0.2 游戏流程核查

**历史记录：本文检查的是重做前的页面原型，所指旧脚本已经移除。当前结果以 `redo-verification.md` 为准；此处保留当时失败证据，不作为新版现状。**

检查日期：2026-10-12，Asia/Singapore。检查范围为当前 Godot 源码、继承 JSON、页面会话与自动 GUI 导航；另运行隔离会话探针，不操作用户已打开的游戏进程。

结论：**符合部分页面呈现要求；不符合完整 V0.2 正式游戏流程。** 当前是已明确标注的内容与界面预览，尚无权威游戏状态机，不应作为正式玩法验收通过。以下主要为预览阶段到正式实现的缺口，不把已注明的预览功能描述为意外回归。

依据：[玩法](../../V0.2/玩法.md)、[模式差异](../../V0.2/模式与版本差异.md)、[剧情接口](../../V0.2/剧情模式数据与接口.md)、[验收清单](../../V0.2/验收清单.md)，及用户关于游戏页为主/子页按需、卡牌节点照搬实验的最新要求。

## 正式流程差异

| 优先级 | 当前内容 | 正式要求与影响 | 位置 |
| --- | --- | --- | --- |
| P1 | 新局只写 mode/active/page；没有出身、种子、六张资源、属性、phase、航次 | 新局初始化后进入 navigation；当前无法开始真实一局 | core/page_session.gd:13 |
| P1 | 游戏页直接枚举全部12节点；新剧情局立即可以进入旧Boss | 挑战要固定候选/航次/普通池与末站；剧情要15站调度，最终不叠加旧Boss。两个模式当前仅不同标签 | pages/game_page.gd:17；core/page_session.gd:36 |
| P1 | 剧情/战斗/商店均可通过通用关闭按钮回game，再任意选择新节点 | 隐藏面板不等于当前机制完成；本航次必须先解决当前节点、收尾、轮末/弃牌，才能新导航。即便允许暂时关闭面板，也应保留机制与阻挡 | app.gd:87；core/page_session.gd:22、36 |
| P1 | 商店种类直接开shop；战斗只检查当前节点含monster | 应从当前剧情 interaction/battle 步骤授权，保存进入/返回游标和完成状态；节点类型只能提供粗筛，不能代表机制始终开放。商店入口符合“商店节点才显示”的粗要求，但没有完整剧情衔接 | core/page_session.gd:42；pages/story_page.gd:12 |
| P1 | 选项/制作/购买/出牌/维护全部禁用，战斗展示固定三类牌而非真实手牌 | 费用、AP、实例、敌方回合、胜退、奖励与恢复剧情尚不能执行，没有可玩闭环 | pages/base_page.gd:25；pages/battle_page.gd:11 |
| P1 | 无航行移动、生产、老化、超限整理、日夜/任务与章节出口 | 缺少移动一次耗损、准备/收尾、轮末一次处理与15站故事日夜，不能验收完整一层 | core/page_session.gd 全部状态字段 |
| P2 | 图鉴展示全部卡/怪物/藏品，剧情页列出全部节点变体 | 正式图鉴应按Profile发现记录；正式剧情只投影当前内容，不能提前暴露未选变体/路径。开发目录可保留在单独调试入口 | pages/reference_page.gd:47；pages/story_page.gd:20 |
| P2 | 继续仅保留内存中的页面及模式 | 当前说明诚实，但不满足真正存档继续；需版本/内容指纹、规则状态、游标、随机流、Profile及恢复验证 | core/page_session.gd:45；pages/home_page.gd:22 |

## 已符合的部分

- 首页入口齐全，两个模式选择后不能覆盖活动会话。
- 局内游戏页保留为背景，子页按需面板呈现，无永久剧情/商店/战斗页签。
- 非商店节点不能打开商店，非怪物遭遇不能打开战斗；面板期间背景按钮禁用。
- 卡牌和节点（包括变体、费用和效果）深度等价于玩法实验；素材路径不写入领域页面会话。
- 独立 JSON、AssetId、图片缓存与纯色文字回退满足当前占位素材解耦要求。
- 没有将禁用动作显示成实际收益，也明确提示完整存档和正式规则尚未移植。

## 本次运行证据

- `node --test tests/content.test.mjs`：9/9 PASS。
- `godot --headless --path . --script tests/test_session.gd`：PAGE SESSION PASS。
- `godot --headless --path . --script tests/ui_smoke.gd`：UI SMOKE PASS。
- `godot --headless --path . --script evidence/flow_probe.gd`：隔离探针输出如下：

```text
available node definitions: 12
new story session can enter old boss immediately: true
boss preview can open battle: true
closing unresolved battle allows different node: true
trader enters page directly: shop
closing shop retains permission to reopen shop: true
view has gameplay phase: false
view has voyage counter: false
view has player stats: false
```

探针证明上述现状，不代表玩法通过；现有测试只验证页面原型所定义的行为。此次检查没有修改游戏逻辑。

## 建议实施顺序

1. 建立纯数据 GameState / GameSession，以 phase、当前节点访问/机制和允许命令控制流程；UI 单独保存打开的面板，关闭面板不改领域阶段。
2. 先贯通挑战的起手→导航→移动→准备→剧情/机制→收尾→轮末/弃牌，复用导入内容；同时固定随机流与拒绝事务用例。
3. 由当前视图投影手牌、候选、允许行动与当前机制，替换全目录开发入口；交易/合成/战斗逐项启用，恢复剧情而不是直接回导航。
4. 接剧情教学、15站固定调度与有限夜间机会。教学补给、休息/调查数值、最终方案门槛仍待定，形成明确试测配置后才能启用，不填0或虚构完整路线。
5. 最后验收稳定阶段存档继续、发现记录与多条完整路线。界面截图和页面测试不能代替此验收。
