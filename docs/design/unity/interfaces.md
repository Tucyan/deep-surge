# 抽象层接口 v0.2（Unity / C#）

> 历史方案：2026-10-03 起暂停执行。当前首要目标为 [Three.js 一层 Demo](../threejs-demo.md)。此文件保留 Unity 后续参考，不约束当前 JavaScript 实现。

类型引用[数据结构](data-model.md)。本文定义纯 C# 应用入口、规则职责与 Unity 适配端口；不将接口草案当作已存在代码。类型统一位于 DeepSurge.Core，集合引用 System.Collections.Generic。

## 1. 应用层：GameSession

```csharp
// DeepSurge.Core，引用数据结构文档中的类型。
public enum CommandKind { ChooseSupply = 0, PlayCard = 1, Craft = 2, SubmitVoyage = 3, ResolveNodeOption = 4, ClaimReward = 5, DeclineReward = 6, CollectProduction = 7, PoleRepel = 8, EmergencyGuard = 9, MoveDefense = 10, SwapDefense = 11, RebuildWreck = 12, DismantleWreck = 13, EndBattleTurn = 14, Retreat = 15, DiscardCards = 16, FinishDiscard = 17 }
public enum TargetKind { Self = 0, Hull = 1, Enemy = 2, Unit = 3, DefenseSlot = 4, LogisticsSlot = 5, Candidates = 6 }
public sealed class Target {
    public TargetKind Kind; public string EnemyId; public string UnitId;
    public Lane Lane; public int Index;
}
public enum ToolRefKind { Hand = 0, Installed = 1 }
public sealed class ToolRef { public ToolRefKind Kind; public string CardId; public string UnitId; }
public sealed class GameCommand {
    public CommandKind Kind;
    public string DefinitionId; public string CardId; public string UseId; public Target Target;
    public bool AllowIneffective;
    public string RecipeId; public List<ToolRef> Tools; public List<string> IngredientCardIds;
    public string CandidateId; public string ProtectionCardId;
    public string OptionId; public List<string> CostCardIds;
    public string OfferId; public string ChoiceId; public string EnemyId; public string UnitId;
    public Lane Destination; public string FirstUnitId; public string SecondUnitId;
    public string ScrapCardId; public List<string> CardIds;
}
public sealed class CommandEnvelope {
    public string CommandId; public long ExpectedRevision; public GameCommand Command;
}
public enum ErrorCode { StaleRevision = 0, WrongPhase = 1, UnknownEntity = 2, UnknownDefinition = 3, InsufficientAP = 4, InvalidTarget = 5, MissingTool = 6, MissingIngredient = 7, DuplicateInput = 8, TemporaryRestriction = 9, MaterialMismatchConfirmationRequired = 10, LimitReached = 11, RewardAlreadyHandled = 12, HandStillOverLimit = 13, TerminalRun = 14, InvalidCommand = 15, InvariantViolation = 16 }
public sealed class RuleError { public ErrorCode Code; public string Message; public List<string> RelatedIds; }
public sealed class EffectPreview {
    public Target Target; public bool Effective; public bool? MaterialAccepted;
    public int Damage; public string BlockedReason;
}
public sealed class ActionPreview {
    public long Revision; public bool Allowed; public List<RuleError> Errors;
    public int APCost; public List<string> ConsumedCardIds; public List<CardQuantity> OutputCards;
    public List<EffectPreview> Effects; public List<string> Warnings;
}
public abstract class GameEvent { public int Sequence; public long Revision; }
public sealed class PhaseChangedEvent : GameEvent { public Phase From; public Phase To; }
public sealed class DispatchResult {
    public bool Accepted; public long Revision;
    public GameState State;            // 拒绝时 null
    public List<GameEvent> Events;     // 拒绝时空列表
    public List<RuleError> Errors;     // 接受时空列表
}
public interface IGameSession {
    GameState GetSnapshot();          // 深拷贝，调用方不能修改内部状态
    GameView GetView();
    ActionPreview Preview(GameCommand command);
    DispatchResult Dispatch(CommandEnvelope input);
    SaveDocument ExportSave();
}
```

创建新局与恢复存档通过独立工厂 `GameSessionFactory.Create(catalog, seed)`、`GameSessionFactory.Restore(catalog, save)` 完成，后者返回 `SaveResult<IGameSession>`。初始生成自动运行到 VoyageSupply。单机命令按序同步执行，不并行写状态。

Preview 只读且不推进 RNG，也不承诺不可见的随机结果：逆流桨预览只显示扣费、数量与约束，实际新候选在确认时生成。实际执行重新校验全部条件，不能信任旧预览。返回 State 为安全副本；存档及测试可取完整状态，UI 只用 GetView。

CommandId 用于诊断，防双击依靠 ExpectedRevision：一条成功命令从 r 到 r+1，重复提交 r 必须报 StaleRevision。恢复 UI 时重新取得 revision，不能自动重放未确认命令。若以后增加跨网络重试，需增加持久化幂等记录，当前不承诺该行为。

## 2. 阶段与费用约束

| 命令 | 合法阶段 | 费用与关键约束 |
|---|---|---|
| ChooseSupply | VoyageSupply / BattleSupply | 无费用，一次处理整批；不允许跳过强制补给 |
| PlayCard | VoyagePreparation / BattleAction | 用途定义控制阶段与目标；无效对敌用途默认要求确认 |
| Craft | VoyagePreparation / BattleAction | 只付配方 AP，工具不消耗，产物进手牌 |
| SubmitVoyage | VoyagePreparation | 航行本身 0 AP，扣一次额度；附带锚另付 1 AP + 牌 |
| ResolveNodeOption | NodeResolution | 只处理所选节点的未处理选项，使用航行剩余 AP |
| ClaimReward / DeclineReward | NodeResolution | 无额外 AP，一份奖励一次；超限不阻塞领取 |
| CollectProduction | VoyagePreparation / BattleAction | 0 AP，设备完好且有储存，轮末不可领取 |
| PoleRepel | BattleAction | 2 AP / 2 伤害，每回合一次，仅无材料限制敌人 |
| EmergencyGuard | BattleAction | 1 AP，下次船体受击减 2；每回合一次，不叠加 |
| MoveDefense / SwapDefense | VoyagePreparation / BattleAction | 相邻空位移动 1 AP；相邻单位交换 2 AP |
| RebuildWreck | VoyagePreparation / BattleAction | 2 AP + 一张 C02，原位满结构，保留定义；同次清空旧生产进度 |
| DismantleWreck | VoyagePreparation / BattleAction | 1 AP，腾出位置，无材料返还 |
| EndBattleTurn | BattleAction | 不扣 AP，启动自动交战及判定，不接受重入 |
| Retreat | BattleAction | 普通战第 2 回合起，船体 -4，奖励放弃，航行正常结算 |
| DiscardCards / FinishDiscard | BattleDiscard / VoyageDiscard | 免费，实例不重复；不超限才可完成 |

候选选择高亮、合成槽位预填、折叠锚选择、取消选择、卡牌排序与查看详情属于 UI 状态，不写 GameState、不扣 AP。逆流桨和听潮筒通过 PlayCard 对 candidates 目标执行，不额外设计重复的重掷指令。

DiscardCards 只在数量超过上限时允许，单次最多弃到上限，避免把整理阶段变成任意清空手牌的操作。未超限自动通过时无需 FinishDiscard。交换是否仅限相邻、重建是否清空生产进度是首版设计决策，当前按上述规则实现并记录测试。

## 3. 纯规则服务的职责

纯规则函数对输入不原地修改，返回完整变更结果；由 GameSession 合并并提交。下面是职责边界，避免把每张牌都做成类继承层级：

| 服务 | 输入 | 输出与职责 |
|---|---|---|
| CardRules.PreviewUse / ResolveUse | 状态、定义、实例、用途、目标 | 验证费用与目标，生成效果；对敌先材料校验 |
| CraftRules.Preview / Resolve | 状态、配方、工具和原料实例 | 校验不同 ID、生命周期，扣料、扣费、产物 |
| NodeRules.Generate | 状态、配置、nodes/rewards 随机流 | 固定候选、敌人位置、具体奖励；满足非战斗和补给保底 |
| NodeRules.ResolveOption | 状态、已解析选项、成本实例 | 有序处理代价、环境伤害、设备进度、奖励 |
| BattleRules.Begin / ResolveTurn / Retreat | 状态、怪物和单位定义 | 独立 AP、意图、四道交战、控制、深潮、战后清理 |
| SurvivalRules.SettleVoyage | 状态、配置 | 一次饥渴与腐坏，无战斗计时推进 |
| ProductionRules.Advance / Collect | 完好单位、进度、卡实体 | 受容量限制的产出与领取，不重复物资 |
| InvariantRules.Validate | 状态、目录 | 检查实体引用、槽位、阶段、不变量；返回 RuleError[] |
| ViewProjector.Project | 状态、目录 | 默认风险、揭露后的详情、合法动作、手牌实体计数 |

单条 CardUse 内多个效果有序处理；若中间已败亡/胜利，后续与终局无关的效果取消。技能组合通过有限 EffectSpec 和明确规则实现，不引入任意字符串表达式求值。

## 4. 基础设施端口

```csharp
public interface IRandomSource {
    int NextInt(int minInclusive, int maxExclusive);
    int WeightedIndex(IReadOnlyList<int> weights);
    RandomState Snapshot();
    IRandomSource Clone(); // 事务计算使用副本；失败时丢弃
}
public sealed class SaveDocument {
    public int FormatVersion; public string ContentVersion;
    public RulesConfig Config; public GameState State;
}
public enum SaveErrorCode { InvalidData = 0, UnsupportedVersion = 1, ContentMismatch = 2, StorageUnavailable = 3 }
public sealed class SaveError { public SaveErrorCode Code; public string Message; }
public sealed class SaveResult<T> {
    public bool Ok; public T Value; public SaveError Error;
}
public interface ISaveStore {
    System.Threading.Tasks.Task<SaveResult<SaveDocument>> ReadAsync(string slot);
    System.Threading.Tasks.Task<SaveResult<bool>> WriteAsync(string slot, SaveDocument save);
}
```

Unity 文件存储实现 ISaveStore，启动桥将 Application.persistentDataPath 下的存档目录传给适配器，Core 不自行寻找平台路径。首次实现允许手动保存，自动保存只能在命令提交后稳定阶段进行；转换为显式 JSON DTO 后写入同目录临时文件，校验成功再替换目标并保留上一份好档。写入失败提示重试或导出 JSON，不覆盖好档。ReadAsync 对空槽返回 Ok=true、Value=null；成功 WriteAsync 返回 Ok=true、Value=true，错误返回 Ok=false 和 SaveError。磁盘时间只属于存档展示元数据，不能作为规则 RNG 来源。种子由新局工厂显式传入并显示在调试面板。

## 5. 表现层读取契约

```csharp
public sealed class MeterView {
    public Meter Health; public Meter Hull; public Meter Hunger; public Meter Hydration; public Meter Sanity;
}
public sealed class CardUseView { public string Id; public int APCost; public bool Enabled; public string Reason; }
public sealed class HandCardView {
    public string Id; public string DefinitionId; public string Name;
    public List<MaterialType> Materials; public List<CardUseView> Uses;
}
public sealed class CandidateView {
    public string Id; public string Name; public NodeKind Kind; public List<string> KnownRisks;
    public List<MaterialType> RequiredMaterials; public List<string> ResponseGap;
    public List<string> RevealedDetails; // 未揭露时 null
}
public sealed class UnitView {
    public string Id; public string Name; public int Attack; public Meter Structure;
    public UnitState State; public List<StatusInstance> Statuses;
}
public sealed class EnemyView {
    public string Id; public string Name; public Meter Health; public int Attack;
    public List<MaterialType> AcceptedMaterials; public List<StatusInstance> Statuses;
}
public sealed class DefenseSlotView {
    public Lane Lane; public string UnitId; public string EnemyId; public EnemyIntent Intent;
}
public sealed class LogisticsSlotView { public int Index; public string UnitId; public int StoredCount; }
public sealed class GameView {
    public long Revision; public Phase Phase; public MeterView Meters;
    public int AP; public int HandCount; public int HandLimit;
    public List<HandCardView> Hand; public List<CandidateView> Candidates;
    public List<UnitView> Units; public List<EnemyView> Enemies;
    public List<DefenseSlotView> Defense; public List<LogisticsSlotView> Logistics;
    public SupplyOffer Supply; public List<RewardOffer> Rewards; public List<CommandKind> LegalCommandTypes;
    public int VoyageIndex; public int VoyagesRemaining; public int? BattleTurn; public int? DeepTideInTurns;
}
```

rewards 只包含当前可领取奖励，不直接暴露所有候选的隐藏具体产物。已知环境损伤、材料弱点、事件最低资源需求默认可见；听潮筒只补充具体奖励与额外分支。GetSnapshot 仅用于调试、测试和保存；UI Presenter 使用 GetView 的深拷贝，不持有会话内部状态。

模型对象使用 `实体 ID → GameObject / Transform` 映射；四个逻辑航道映射到场景锚点，视觉格子不反向生成规则位置。动画播放事件，但画面切换、低画质、关闭动态效果不影响结算。读档、重启或事件序列不连续时直接重建快照画面。

## 6. 领域事件字段

每个已接受命令生成有限、有序的事件列表，sequence 在该列表中从 0 递增，revision 是提交后的版本。事件用于动画、日志与验收，不是另一个权威状态源。

| type | payload 必需字段 |
|---|---|
| PhaseChanged | from, to |
| APChanged | scope（voyage/battle）, before, after, reason |
| CardsGranted / CardsConsumed / CardsDiscarded | cardIds, definitionIds, reason |
| CandidatesGenerated / CandidatesRerolled | candidateIds, generation |
| VoyageSubmitted | nodeId, voyageIndex, remaining |
| NodeOptionResolved | nodeId, optionId |
| RewardHandled | offerId, status, choiceId（拒绝为 null） |
| UnitDeployed / UnitWrecked / UnitRebuilt / UnitRemoved | unitId, definitionId |
| UnitMoved | unitId, fromLane, toLane |
| MaterialRejected | sourceDefinitionId（基础指令为 null）, targetEnemyId |
| DamageApplied | targetKind, targetId, amount, cause, sourceMaterials |
| StatusApplied / StatusRemoved | targetId, statusId, kind, reason |
| ProductionAdvanced / ProductionCollected | unitId, progress, storedCount |
| BattleEnded | battleId, result |
| VoyageSettled | voyageIndex, hungerLoss, hydrationLoss, healthLoss |
| RunEnded | result（completed/failed）, reason |

命令被拒绝时只有 RuleError，不产生用于扣费/播放受击的事件。记录中每个 DamageApplied 的 amount 是实际损伤，材料不匹配单独记 MaterialRejected，便于检验限制而非把零伤害误判为命中。

## 7. 一次制作与使用的接口例子

在 BattleAction，状态版本 r、AP=3，手牌有点火器 tool:1、漂流木 card:2、布条 card:3。

1. 使用下方 C# Craft 命令调用 Preview，返回制作费 1、消耗两个原料、产物 C13，状态与随机流不变。
2. Dispatch 相同命令及 ExpectedRevision=r，接受后 revision=r+1、AP=2；工具仍在手牌，新增唯一火把实例。
3. 用新增火把的实例 ID、攻击 UseId 和水母 EnemyId 预览，返回实际伤害 3、费用 1、材料有效。
4. Dispatch ExpectedRevision=r+1，AP=1，火把消耗、水母移除。若最后一个敌人已消灭，直接战斗胜利，清理临时物、处理奖励；不等待 EndBattleTurn。
5. 重发第二步的 r 版本命令被拒绝，不生成第二张火把。

若换成 C17 鱼叉对水母，预览标记无效；AllowIneffective=false 拒绝，true 接受并正常消耗，敌人生命及负面状态不改变。


```csharp
var command = new GameCommand {
    Kind = CommandKind.Craft, RecipeId = "R01",
    Tools = new List<ToolRef> { new ToolRef { Kind = ToolRefKind.Hand, CardId = "tool:1" } },
    IngredientCardIds = new List<string> { "card:2", "card:3" }
};
ActionPreview preview = session.Preview(command); // session 为 IGameSession
DispatchResult result = session.Dispatch(new CommandEnvelope {
    CommandId = "craft:1", ExpectedRevision = r, Command = command
});
```

## 8. C# 命令字段约束与 Unity 生命周期

首版 GameCommand 用 CommandKind + 具体字段表达命令，避免依赖多态 JSON。工厂初始化所有集合；各 Kind 的必填字段如下，其他字段必须保持默认值，否则返回 InvalidCommand。Target / ToolRef 按其 Kind 校验对应 ID 和槽位，不能凭默认 Lane=0 绕过目标选择。

| CommandKind | 有效字段 |
|---|---|
| ChooseSupply | DefinitionId |
| PlayCard | CardId, UseId, Target, AllowIneffective |
| Craft | RecipeId, Tools, IngredientCardIds |
| SubmitVoyage | CandidateId, ProtectionCardId（可 null） |
| ResolveNodeOption | OptionId, CostCardIds |
| ClaimReward / DeclineReward | OfferId，以及 ClaimReward 的 ChoiceId |
| CollectProduction / DismantleWreck | UnitId |
| PoleRepel | EnemyId |
| MoveDefense | UnitId, Destination |
| SwapDefense | FirstUnitId, SecondUnitId |
| RebuildWreck | UnitId, ScrapCardId |
| DiscardCards | CardIds |
| EmergencyGuard / EndBattleTurn / Retreat / FinishDiscard | 无额外字段 |

事件在 Core 中采用 GameEvent 的具体派生类，每类字段按第 6 节表格定义，禁止 Dictionary<string, object> 动态 payload。事件只用于当次表现和日志；存档保存状态，不序列化多态事件列表。需要导出回放时使用 CommandKind 的具体字段 DTO 和版本，而非将派生事件直接写盘。

GameBootstrap（MonoBehaviour）构建内容、存储适配器和会话。UI Presenter 在 OnEnable 绑定 UIDocument 根元素的事件，在 OnDisable 解除绑定；重新启用时用当前快照重绘，不重新创建局或补给。普通 C# IGameSession 不跟随 GameObject 销毁自动重开；由启动桥明确管理其生命周期。

UI 点击统一构造 CommandEnvelope；按钮禁用只是反馈，Dispatch 仍执行全部校验。动画队列不阻塞规则终局；播放期间可暂时阻止新的输入，但不能延迟扣费或让协程重复结算。场景对象与 Unity API 仅在主线程访问，异步存档回调必须由桥接层调度回主线程。
