# Deep Surge 架构与状态流程 v0.2（Unity）

> 历史方案：2026-10-03 起暂停执行。当前首要目标为 [Three.js 一层 Demo](../threejs-demo.md)。此文件保留 Unity 后续参考，不约束当前 JavaScript 实现。

日期：2026-10-02。状态：程序设计草案；文中接口和目录均为拟定契约，不表示代码已实现。

## 1. 依据、范围与技术方向

规则来源：[整体玩法](../../../Deep-Surge-整体玩法设计-v0.1.md)和[首版内容](../../../Deep-Surge-首版卡牌与节点设计.md)。首版具体内容优先采用首版表：例如 C01 漂流木只能直接修船或作为原料，不能照搬整体文档后续示例的直接部署用途。

技术栈确定为 **Unity 6000.3.19f1 + C# + UI Toolkit（UXML / USS）**，首版目标为 Windows 本地单机。直接开发 Unity 最小可玩原型；`water-era` 只保留为视觉与交互参考，不再开发 HTML 规则 Demo。暂定正式项目目录 `deep-surge-unity/`，与按钮实验 `unity-button-lab/` 分离；本阶段仅更新文档，不创建 Unity 工程或安装依赖。

规则与应用层采用普通 C# 类，不依赖 UnityEngine、UnityEditor、MonoBehaviour、GameObject 或帧时间。UI Toolkit 承担屏幕手牌、候选、合成和日志，Unity 场景负责木筏与海面；内容编辑通过 ScriptableObject，在启动时转换为纯 C# 内容快照。先验证文字/色块 Demo 的完整循环，再接入模型与动画，不增加服务器、联机或 ECS。

当前实现对象为 C01–C24、R01–R08、M01–M03、N01–N12，以及整体规则明确要求的临时战术补给、基础指令、残骸与撤退。燃烧实际施加、精神崩溃、自然物、藏品、Boss 等不在本层启用；C07 的灭火用途保留能力定义，当前无燃烧目标时禁用。

## 2. 分层与依赖

```text
Unity UI Toolkit / 场景 Presenter / 输入适配
          ↓ 命令            ↑ 只读视图 + 事件
应用层 GameSession：校验、事务、版本、阶段推进
          ↓
纯规则模块：航行 / 卡牌 / 合成 / 战斗 / 生存 / 生产
          ↓
数据契约与内容目录 ContentCatalog

应用层 → IRandomSource / ISaveStore（端口）← Unity 文件存储适配
```

- **规则模块**只接受状态、内容和显式随机流，返回计算结果；不访问 UnityEngine.Random、Time、物理引擎、场景或文件系统。
- **应用层**是唯一状态写入口，执行命令、处理阶段及一次性标记，发布完整快照和有序事件。
- **表现层**负责选择高亮、动画、卡牌图像、模型对象和设置。动画完成不能决定胜负或扣费。
- **基础设施**实现可恢复随机流及存档。读写失败向 UI 报告，不能用失败的写盘操作回滚已提交的局内行动。

拟定目录（当前不创建代码）：

| 路径 | 职责 |
|---|---|
| `deep-surge-unity/Assets/DeepSurge/Core/Model/` | 纯 C# 状态、ID、枚举及内容定义 |
| `deep-surge-unity/Assets/DeepSurge/Core/Rules/` | 航行、卡牌、合成、战斗、生存、生产 |
| `deep-surge-unity/Assets/DeepSurge/Core/Application/` | GameSession、命令、事务、视图及端口 |
| `deep-surge-unity/Assets/DeepSurge/Unity/Content/` | ScriptableObject 内容资产类型及转换器 |
| `deep-surge-unity/Assets/DeepSurge/Unity/Presentation/` | MonoBehaviour 启动桥、UI Presenter、场景映射 |
| `deep-surge-unity/Assets/DeepSurge/Unity/Infrastructure/` | JSON DTO 转换、文件存档、日志适配 |
| `deep-surge-unity/Assets/DeepSurge/Content/` | 首版卡牌、配方、节点与测试配置资产 |
| `deep-surge-unity/Assets/DeepSurge/UI/` | UXML、USS、PanelSettings 与字体 |
| `deep-surge-unity/Assets/DeepSurge/Scenes/` | 最小规则验证场景，后续正式游戏场景 |
| `deep-surge-unity/Assets/DeepSurge/Tests/EditMode/` | 纯规则与内容转换、存档校验测试 |
| `deep-surge-unity/Assets/DeepSurge/Tests/PlayMode/` | UI 命令桥、场景生命周期与读档恢复测试 |

程序集用 asmdef 隔离：`DeepSurge.Core` 启用 No Engine References；`DeepSurge.Unity` 引用 Core；EditMode / PlayMode 测试程序集按需引用对应层与 Unity Test Framework。Core 不引用 Unity 程序集，Editor 辅助代码放 Editor 专用程序集。命名空间与程序集一致；契约采用普通 class / struct / enum，不依赖 record、required 或 source generator。

启动桥在 Unity 主线程加载内容快照、创建 GameSession、订阅 UI 输入。规则命令同步处理；存档 IO 可以异步，但返回后通过启动桥回到主线程更新画面。规则快照与内容不能持有 ScriptableObject 或 GameObject 引用。Unity Test Framework 包版本以未来工程实际解析结果为准，本阶段不下载或升级。

## 3. 状态机

初始物资七张，角色 30/30、船体 40/40、饱食/水分/SAN 各 80/100，手牌上限 10，防卫位四个、后勤位两个。首版统一起手，无策略加成。测试层航行额度暂取 5（来自整体文档第一层），写在 RulesConfig，不写死于流程。

```text
开局 → 生成候选 / 刷新航行 AP → VoyageSupply（选基础补给）
     → VoyagePreparation → SubmitVoyage（扣额度）
     → NodeResolution ──非战斗──→ VoyageSettlement
            └──战斗──→ BattleAction（第 1 回合，无战术补给）
                        ↓ EndBattleTurn
                    BattleResolution
                        ├─继续→ BattleDiscard → BattleSupply
                        │                      → BattleAction
                        └─胜利/撤退→ 节点奖励/结束 → VoyageSettlement
     → VoyageDiscard → 下一轮 VoyageSupply / Completed
任意致死效果 → Failed
```

BattleResolution、VoyageSettlement 是引擎内部阶段，只能自动推进；不能靠重复点击执行第二次。手牌未超限时仍自动通过弃牌阶段。用户在弃牌阶段只能弃牌、确认，不能制作、出牌或领生产物。

VoyageSupply 一次提供三张：自选淡水/干粮/漂流木之一，加两张已经固定的随机牌。BattleSupply 从第二战斗回合开始：选择稳妥漂木盾或已固定的随机临时牌之一，AP 设为基础值。首回合直接进入 BattleAction。任何打开、取消或预览行为均不重抽。

非战斗节点选项使用航行剩余 AP。战后不返回本轮准备阶段，不提供第二次航行 AP 或涌泉；只处理奖励后结算。非战斗节点中允许的卡牌动作由节点明确开放，默认只允许其选项操作，避免事件中暗增一个准备阶段。

## 4. 事务与结算顺序

每次命令依次：校验版本、阶段、实体与资源 → 在状态副本和随机流副本上计算 → 检查不变量 → 一次提交状态、随机流和事件。拒绝命令不扣 AP、不消耗卡牌、不推进随机流；预览始终不修改状态。

同一个效果内部先完成原子变更，再检查角色/船体败亡，随后检查战斗胜利。不同攻击之间立即检查死亡；败亡优先。战斗胜利一旦成立，取消剩余攻击及后续轮末惩罚。

战斗结束行动顺序：

1. 玩家单位按航道 1→4 自动攻击，新部署单位可攻击；空道无伤害。
2. 存活敌人按航道 1→4 执行保存的意图，单位挡住普通船体攻击；无免费反击。
3. 仍未终止时，从第 7 回合起船体受到额外 2 深潮伤害，普通防护不抵消。
4. 状态结算、败亡/胜利判定；继续战斗才进入弃牌及下一回合。

对敌进攻（伤害或负面状态）先判来源卡的六种材料类型，至少一种命中即可，无限制怪物直接通过。随后算状态联动、护甲和伤害。材料不匹配不会消耗目标浸湿/束缚；玩家明确确认无效使用后仍支付 AP 与卡牌。群体效果逐目标判定。

航行节点结束后一次性结算：饱食 -6、水分 -8 → 截断至零 → 饥饿伤害 2、缺水伤害 3，合计至多 4 → 败亡检查 → 鲜鱼腐坏 → 完好设施生产 → 航行轮末弃牌。战斗回合不推进这些计数。暴雨的集雨器 +2 在节点处理时推进，常规 +1 在航行结算推进。

## 5. 实体与持久性

一张物资一个实例 ID，同名显示堆叠不能合并其计数或鲜度。出牌、合成、弃牌销毁物资，不进入循环牌库。部署移出手牌并生成单位，保存来源定义及材料类型；设备毁坏留原位残骸。设备结构、角色生命、船体战损保留。

临时战术牌标记本场战斗 ID，不能维修长期资源或进入永久配方；战后清除全部该战斗临时手牌与单位。C18 临时挡板也在战后清除，存活轻弩保留。临时防卫物在准备阶段部署时，暂定在下一次战斗结束或本航行节点结束（未战斗）清除，防止无限跨轮占位；该时限是设计决策，需纸面验证。

撤退仅普通战斗第 2 回合起允许；船体 -4，无奖励，临时单位清除，永久设备保留，节点标为放弃，继续正常航行结算。撤退扣血致死则直接 Failed。

## 6. 需确认或试测的参数

以下不是从规则凭空推导的既定数值，首次实现应保留配置与记录：

| 问题 | 本文处理 |
|---|---|
| 各节点和涌泉随机权重、随机战术牌池 | 内容配置必填；未定前使用显式固定测试目录，不借用后续商店权重 |
| 2/3 候选概率、M01 后续 1/2 只概率及初始航道 | 明确配置并保存生成结果；不隐式平均分配 |
| 鲜鱼腐坏后的产物 | 暂定直接移除；鲜鱼入手后每次航行结算计 1，达到 3 移除 |
| 设施储满时的生产进度 | 暂定储满暂停，产出后进度减阈值；不无限累积 |
| 绳索连续回合限制 | 同一敌人保存最后成功束缚的战斗回合，下一回合不可再施加 |
| 折叠锚取消准备的 AP | 选卡和预览免费；提交航行时一次扣 1 AP 并消耗卡，取消无需退款 |
| 热源机会与能量解锁 | 热源记录曾提供获取机会；能量需实际取得工具及两种原料的同一时刻，解锁后永久记忆，本局丢料仍显示应对缺口 |
| 工具箱后续奖励明细 | 必须由内容配置给出；不自动沿用第一次的绝缘钳奖励 |

这批决策集中在 RulesConfig / 内容配置中，不散落在 UI。SAN 归零等后续机制在首版动作中不可触发；后续启用需增加对应状态与验收用例。

## 7. 开始编码时的验收基线

- 起手七张 + 首次补给三张 = 十张；AP 不是叠加，战后无重复补给。
- 1 AP 制作火把，原料消失、点火器保留；再用火把另付 1 AP。
- 鱼叉攻击水母预览 0，确认后消耗；火把造成 3 并立即获胜，取消敌方攻击。
- 海水不能浸湿绝壳蟹；无材料限制敌人浸湿后放电包造成 5 并清除状态。
- 同材料配方可选不同结果，实例不能重复填槽，工具不能兼作原料。
- 战斗持续多回合只结算一次航行饥渴；第 7 回合深潮、撤退损伤不被折叠锚抵消。
- 超限行动可继续，弃牌阶段不能再出牌；胜利奖励后仍需航行结算和最后弃牌才完成本层。
- 重开界面、预览、读档不改变节点/奖励/意图；逆流桨保持数量和保底。
- 设备毁坏变残骸，2 AP + 废铁重建，1 AP 拆除无材料返还；后勤残骸不生产。
- 保存后继续与从同一保存点重新执行同一命令序列得到相同状态和事件。

最小 Demo 依次完成纯 C# 规则及 EditMode 测试 → UI Toolkit 文字/色块完整一层循环 → PlayMode 集成验证 → 木筏资产和海面表现。规则测试使用显式种子和配置，不等动画或物理帧；PlayMode 验证点击后的命令、禁用态和画面恢复，不重复全部规则用例。

本阶段检查文档链接、契约一致性与 Git 差异；上列行为必须在后续代码实现后再通过测试证明。现有按钮实验的验证只证明本机编辑器与 UI Toolkit 环境可用，不表示正式游戏已经编译、资产已导入或 Demo 已完成。

## 8. 技术依据

- [Unity 6.3 UI Toolkit](https://docs.unity3d.com/6000.3/Documentation/Manual/UIElements.html)：界面结构与样式方案。
- [Unity 6.3 程序集定义](https://docs.unity3d.com/6000.3/Documentation/Manual/class-AssemblyDefinitionImporter.html)：Core 与 Unity 适配层隔离。
- [Unity 6.3 EditMode / PlayMode 测试](https://docs.unity.cn/6000.3/Documentation/Manual/test-framework/edit-mode-vs-play-mode-tests.html)：规则与运行时验证分工。
