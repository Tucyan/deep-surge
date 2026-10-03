# 数据结构与内容契约 v0.2（Unity / C#）

> 历史方案：2026-10-03 起暂停执行。当前首要目标为 [Three.js 一层 Demo](../threejs-demo.md)。此文件保留 Unity 后续参考，不约束当前 JavaScript 实现。

本文件配合[架构](architecture.md)和[接口](interfaces.md)使用。以下使用普通 C# class / struct / enum 表达契约，尚未编译或实现。引用类型的可选值用 null，可选值类型用 Nullable<T>（如 int?）；集合创建时初始化为空列表，不能把未初始化集合与空列表混用。Core 状态允许 Dictionary 作为运行时索引，但必须由存档转换器映射为可 JSON 序列化的 DTO；不保存委托、UnityEngine.Object、MonoBehaviour 或场景引用。示例字段可变是为了表达数据形状，实际实例只能由 GameSession 修改，内容快照不得被局内效果修改。

## 1. 基础类型与配置

```csharp
// 所有代码片段属于 DeepSurge.Core；集合使用 System.Collections.Generic。
// 内容 ID / 实体 ID 均使用 string，通过工厂及校验器保证有效性。
public enum Lane { One = 0, Two = 1, Three = 2, Four = 3 }
public enum MaterialType { Heat = 0, Water = 1, Organic = 2, Energy = 3, Material = 4, Abyss = 5 }
public enum CardKind { Resource = 0, Consumable = 1, Tool = 2, Equipment = 3, Navigation = 4 }
public enum Phase { VoyageSupply = 0, VoyagePreparation = 1, NodeResolution = 2, BattleSupply = 3, BattleAction = 4, BattleResolution = 5, BattleDiscard = 6, VoyageSettlement = 7, VoyageDiscard = 8, Completed = 9, Failed = 10 }
public struct Meter { public int Current; public int Max; }
public sealed class RandomState {
    public string Algorithm; public int Version; public string Seed; public long Cursor;
}
public sealed class CountWeight { public int Count; public int Weight; }
public sealed class DefinitionWeight { public string DefinitionId; public int Weight; }
public sealed class RulesConfig {
    public int VoyageLimit;                  // 首版测试 5
    public int VoyageAP; public int BattleAP; // 默认各 3，可试测 4
    public int HandLimit;                    // 10
    public int LogisticsSlots;               // 首版 2，后续上限 6
    public int HungerPerVoyage; public int HydrationPerVoyage; // 6 / 8
    public int StarvationDamage; public int DehydrationDamage; public int SurvivalDamageCap; // 2 / 3 / 4
    public int DeepTideStartTurn; public int DeepTideDamage;   // 7 / 2
    public int RetreatStartTurn; public int RetreatHullDamage; // 2 / 4
    public int FishSpoilageAge;               // 3
    public List<CountWeight> CandidateCountWeights;
    public List<DefinitionWeight> NodeWeights;
    public List<DefinitionWeight> SupplyWeights;
    public List<DefinitionWeight> TacticalWeights;
}
```

AP、费用、伤害、年龄、进度、容量及计数均为非负整数；Weight 使用非负整数，可抽取池总权重大于零，权重求和使用 long 并校验范围。AP 费用没有永久 3 点上限。初始状态参数、起手 C10/C11/C01/C04/C08/C07/C17 由内容启动配置记录。没有出牌用途的工具/纯原料用 `Uses` 空列表，不能用 0 AP 伪造出牌。

## 2. 内容定义：卡牌与效果

```csharp
public enum TargetRule { Self = 0, Hull = 1, FriendlyUnit = 2, Enemy = 3, EmptyDefense = 4, EmptyLogistics = 5, FriendlyBurning = 6, Candidates = 7 }
public enum EffectKind { Restore = 0, RepairUnit = 1, Damage = 2, Status = 3, Extinguish = 4, GrantCards = 5, Deploy = 6, RerollCandidates = 7, RevealCandidates = 8, ProtectEnvironment = 9 }
public enum MeterKind { Hull = 0, Health = 1, Hunger = 2, Hydration = 3, Sanity = 4 }
public enum StatusKind { Wet = 0, Bound = 1, Baited = 2 }
public enum LifetimeKind { Run = 0, Battle = 1 }
public enum SlotKind { Defense = 0, Logistics = 1 }
public sealed class CardQuantity { public string DefinitionId; public int Count; }
public sealed class StatusBonus { public StatusKind Status; public int Amount; public bool Consume; }
public sealed class EffectSpec {
    public EffectKind Kind;
    public MeterKind Meter; public int Amount;
    public StatusBonus Bonus;               // 无联动时 null
    public StatusKind Status; public bool PredatorOnly;
    public List<CardQuantity> Cards;
    public string UnitDefinitionId; public int Charges;
}
public sealed class CardUseDefinition {
    public string Id; public string Label; public int APCost; public TargetRule Target;
    public List<Phase> AllowedPhases; public List<EffectSpec> Effects; public bool Consume;
}
public sealed class CardDefinition {
    public string Id; public string Name; public CardKind Kind;
    public List<MaterialType> Materials;         // 1～2 个不同类型
    public List<string> Keywords; public List<CardUseDefinition> Uses;
    public int? SpoilAfterVoyages; public LifetimeKind Lifetime;
}
public sealed class ProductionDefinition {
    public int EveryVoyages; public int Capacity; public string OutputCardId;
}
public sealed class UnitDefinition {
    public string Id; public string Name; public SlotKind SlotKind;
    public int Attack; public int MaxStructure; public bool Temporary;
    public ProductionDefinition Production; // 无生产时 null
}
```

效果种类仅覆盖首版，不设计运行任意脚本的通用插件。目标验证由用途和规则共同约束，例如修复不能代替重建残骸，绳索检查连续回合限制。对敌 Damage / Status 标为进攻；Extinguish、Restore 和己方部署不做怪物材料检查。自定义文案不能改变效果。

示例：C01 材料 `Organic / Material`，用途修船 1 AP、恢复 3；C04 `Uses` 为空列表；C13 材料 `Heat / Material`，战斗攻击 1 AP、伤害 3。冷雾中的火把消耗通过节点选项定义，不强行扩大 C13 常规出牌阶段。C23 折叠锚通过 SubmitVoyage 附带的卡牌 ID 扣费和消耗，不走一般 PlayCard。

临时战术内容使用独立 `T` 前缀，例如 T01 稳妥漂木盾：1 AP，部署 0/3 临时单位，不修复船体。其余 T 类内容必须先明确列出后才加入 TacticalWeights；不能从 C 池抽取永久治疗或工具。24 张物资表的计数不包含 T 类补给。

## 3. 配方、怪物与节点

```csharp
public sealed class InputRequirement {
    public List<string> AcceptedDefinitionIds; public int Count;
}
public sealed class RecipeDefinition {
    public string Id; public int APCost;
    public List<InputRequirement> ToolRequirements; public List<InputRequirement> Ingredients;
    public List<CardQuantity> Outputs; public LifetimeKind OutputLifetime;
}
public enum IntentKind { AttackLane = 0 }
public sealed class MonsterDefinition {
    public string Id; public string Name; public int Attack; public int MaxHealth;
    public List<MaterialType> AcceptedMaterials; // null 无限制，空列表非法
    public List<string> Keywords; public IntentKind IntentKind;
}
public enum NodeKind { Safe = 0, Supply = 1, Battle = 2, Event = 3, Environment = 4, Equipment = 5 }
public enum NodeGate { Always = 0, HeatOpportunityProvided = 1, EnergyResponseAcquired = 2 }
public enum NodeEffectKind { GrantCards = 0, RestoreSanity = 1, EnvironmentHullDamage = 2, AdvanceProduction = 3 }
public sealed class NodeEffect {
    public NodeEffectKind Kind; public List<CardQuantity> Cards;
    public int Amount; public string UnitDefinitionId;
}
public sealed class NodeOptionDefinition {
    public string Id; public string Label; public int APCost;
    public List<InputRequirement> ConsumedCards; public List<NodeEffect> Effects;
}
public sealed class MonsterPoolEntry {
    public string DefinitionId; public List<CountWeight> CountWeights;
}
public sealed class NodeDefinition {
    public string Id; public string Name; public NodeKind Kind; public NodeGate Gate;
    public bool CountsAsBasicSupply; public List<NodeOptionDefinition> Options;
    public List<MonsterPoolEntry> Monsters; public List<string> PublicRisks;
}
public sealed class ContentCatalog {
    public string Version;
    public Dictionary<string, CardDefinition> Cards;
    public Dictionary<string, UnitDefinition> Units;
    public Dictionary<string, RecipeDefinition> Recipes;
    public Dictionary<string, MonsterDefinition> Monsters;
    public Dictionary<string, NodeDefinition> Nodes;
    public RulesConfig Rules;
}
```

配方按实体定义 ID 匹配，不接受任意同标签高级卡代替。R05 与 R07 原料相同，通过 RecipeId 决定结果。工具仅作条件，不消耗；首版只使用持有工具卡，接口为未来安装设备条件保留位置。临时实例不能投入 R01–R08。

N03 的三选一奖励、N05 的敌人数/航道、工具箱首次与后续差异都必须在节点生成时解析为 NodeInstance；不在打开详情或领取时重抽。N11 先环境损伤，立即检查败亡，仍存活才进入可选奖励；N12 火把分支明确收 1 AP + C13，无火把/预算可走保守选项。可拒绝整份可选奖励，但不能通过拒绝奖励绕过已经发生的风险。

## 4. 运行时实体

```csharp
public sealed class CardLifetime { public LifetimeKind Kind; public string BattleId; }
public sealed class CardInstance {
    public string Id; public string DefinitionId;
    public int AcquiredVoyage; public int AgeInVoyages; public CardLifetime Lifetime;
}
public enum StatusExpiry { Consumed = 0, NextOrdinaryAttack = 1 }
public sealed class StatusInstance {
    public string Id; public StatusKind Kind;
    public string SourceDefinitionId; public List<MaterialType> SourceMaterials;
    public int AppliedBattleTurn; public StatusExpiry Expiry;
}
public enum UnitState { Active = 0, Wreck = 1 }
public enum TemporaryScope { Battle = 0, Voyage = 1 }
public sealed class TemporaryDeadline {
    public TemporaryScope Kind; public string BattleId; public int VoyageIndex;
}
public sealed class ProductionState { public int Progress; public List<CardInstance> StoredCards; }
public sealed class UnitInstance {
    public string Id; public string DefinitionId;
    public string SourceCardDefinitionId; public List<MaterialType> SourceMaterials;
    public UnitState State; public Meter Structure; public List<StatusInstance> Statuses;
    public TemporaryDeadline TemporaryUntil; // 永久单位 null
    public ProductionState Production;       // 无生产时 null
}
public sealed class EnemyInstance {
    public string Id; public string DefinitionId; public Lane Lane;
    public Meter Health; public List<StatusInstance> Statuses; public int? LastBoundTurn;
}
public sealed class EnemyIntent {
    public string EnemyId; public int BattleTurn; public IntentKind Kind; public Lane Lane; public int Amount;
}
public enum RewardStatus { Pending = 0, Claimed = 1, Declined = 2 }
public sealed class RewardChoice { public string Id; public List<CardQuantity> Cards; }
public sealed class RewardOffer {
    public string Id; public List<RewardChoice> Choices; public RewardStatus Status;
}
public enum NodeStatus { Candidate = 0, Selected = 1, Resolved = 2, Abandoned = 3, Expired = 4 }
public sealed class EnemySpawn { public string DefinitionId; public Lane Lane; }
public sealed class NodeInstance {
    public string Id; public string DefinitionId; public int Generation; public NodeStatus Status;
    public bool DetailsRevealed; public List<NodeOptionDefinition> Options;
    public List<EnemySpawn> EnemySpawns; public List<RewardOffer> RewardOffers;
}
```

单位的位置只保存在槽位中，不在 UnitInstance 再复制一份 Lane。结构为零的持久设备变 Wreck，残骸不能攻击、生产或充当工具。一次普通受击可以被 Bound / Baited 取消；攻击被取消时只消耗实际触发的一个控制，避免重复取消后凭空累积回合。Wet 在有效放电包攻击联动后清除；状态保存来源材料，为未来持续伤害沿用同一弱点判定。

## 5. 整局与阶段状态

```csharp
public sealed class SupplyOffer {
    public List<string> FixedCardIds; // 航行随机两张，生成时固定
    public List<string> Choices;      // 航行 C07/C08/C01；战斗 T01/固定随机 T 牌
}
public sealed class VoyageState {
    public int Index; public int Remaining; public int AP;
    public List<NodeInstance> Candidates; public string SelectedNodeId;
    public int CandidateGeneration; public bool Rerolled; public SupplyOffer Supply;
    public int EnvironmentProtectionCharges; public bool SettlementApplied;
}
public enum BattleResult { Ongoing = 0, Won = 1, Retreated = 2 }
public sealed class BasicCommandUsage { public bool Pole; public bool Guard; }
public sealed class BattleState {
    public string Id; public string NodeId; public int Turn; public int AP;
    public List<EnemyInstance> Enemies; public List<EnemyIntent> Intents; public SupplyOffer Supply;
    public BasicCommandUsage BasicCommandUsed; public int NextHullHitReduction;
    public BattleResult Result; public bool ResolutionApplied;
}
public sealed class GenerationHistory {
    public List<int> OfferedBasicSupplyVoyages;
    public bool ToolboxOffered; public bool ToolboxClaimed;
    public bool HeatOpportunityProvided; public bool EnergyResponseAcquired;
    public bool FirstGnawerEncounterEntered;
}
public sealed class PlayerState { public Meter Health; public Meter Hunger; public Meter Hydration; public Meter Sanity; }
public sealed class RaftState {
    public Meter Hull; public List<string> DefenseSlots; public List<string> LogisticsSlots; // null 是空位
}
public sealed class NodeStep { public bool OptionResolved; public List<string> PendingRewardIds; }
public enum RandomStreamKind { Nodes = 0, Supplies = 1, Combat = 2, Rewards = 3 }
public enum FailureReason { HealthZero = 0, HullZero = 1 }
public sealed class GameState {
    public int SchemaVersion; public string ContentVersion;
    public string RunId; public long Revision; public long NextEntitySequence; public Phase Phase;
    public PlayerState Player; public RaftState Raft; public List<CardInstance> Hand;
    public Dictionary<string, UnitInstance> Units;
    public VoyageState Voyage; public BattleState Battle; public NodeStep NodeStep;
    public GenerationHistory History; public Dictionary<RandomStreamKind, RandomState> RandomStreams;
    public FailureReason? FailureReason;
}
```

初次 Index=1、Remaining=5，提交扣 Remaining，结算完且弃牌完成后 Remaining=0 才 Completed。Revision 每条接受的命令递增一次，内部阶段不另起公共命令。终局 Snapshot 仍可保留最后战斗用于展示，但不再接受行动。

intents 保存普通攻击的航道与数值，实际执行时该道有防卫单位攻击单位，否则船体；不是把开局被攻击的单位 ID 永久锁死。UI 显示这种动态拦截规则，不能把移动后的目标变化伪装成随机重掷意图。

每三轮至少提供一次基础补给：检查当前轮及前两轮的候选记录，必要时补入基础补给；重掷后的最终候选也必须满足，不能用已移除的本轮旧候选算保底。工具箱前三轮机会同理。历史中一次机会和一次实际获取分开，保证玩家拒绝工具箱奖励不会错误解锁能量敌人。

## 6. 不变量与存档

- 同局所有实体 ID 唯一；卡只能处于手牌、设施储存或转成单位后的单一位置。
- meter 满足 `0 ≤ current ≤ max`；四个防卫位固定，后勤位数量符合配置；槽位 ID 必须存在且不得重复。
- 残骸结构为零、完好设备结构大于零；怪物死亡立即移除；手牌数量不强制实时小于上限。
- 同一轮候选 2 或 3 个、定义不重复且至少一个非战斗；过期候选不能提交。
- 战斗首回合没有 supply；进入新战斗 AP 不读取航行剩余值。
- 免费生产领取仅移动储存卡到手牌，不新建重复物资；恢复和重建不能超过上限。
- 不存在循环弃牌堆、Boss 核心、货币或地图坐标字段；视觉坐标仅由渲染适配管理。

存档包含完整 GameState、规则配置快照和内容版本。保存点限定在稳定可交互阶段或终局，不在自动结算中途。读取前检查 JSON 形状、枚举、范围、引用、ID 唯一、阶段相容和版本；不支持的版本报告错误并保留旧档，不静默重开。内容版本升级需显式迁移，不能用新版数值重新解释已有怪物和物资。

随机算法及其版本必须固定并能由 seed/cursor 恢复；四个随机流隔离，打开奖励动画不会影响下一轮节点。首版回放为“起始快照 + 已接受命令序列 + 结果摘要”，无需引入事件溯源数据库。


## 7. Unity 内容编辑与 JSON DTO 边界

Unity 适配层提供 CardDefinitionAsset、RecipeDefinitionAsset、MonsterDefinitionAsset、NodeDefinitionAsset、RulesConfigAsset 等 ScriptableObject；它们只承载静态配置。ContentCatalogBuilder 检查重复 ID、失效引用、配方数量、材料类型、权重与首版范围，再深拷贝生成纯 C# ContentCatalog。图像、字体和 Prefab 引用放独立表现资产，以 DefinitionId 查找，不进入 Core。

EffectSpec / NodeEffect 用 enum 加明确字段表达有限效果集；Kind 决定有效字段，内容校验器拒绝缺字段或冲突字段。示例没有任意对象 payload 或动态脚本求值，不靠 ScriptableObject 的 OnEnable 执行规则。ContentCatalog 的 Dictionary 只在运行时构建，编辑资产及保存格式采用列表。

首版使用 Unity 适配层的 JsonUtility 处理显式 `[Serializable]` DTO，不直接对 GameState 调用 ToJson。JsonUtility 不支持 Dictionary，因此转换器必须把 Units、RandomStreams 转为列表，恢复时校验重复键再重建字典；属性和多态事件不交给默认序列化器。所有嵌套 DTO 只使用可序列化字段、列表和具体类型，Nullable 与空槽按以下约定转换。[Unity JSON 序列化说明](https://docs.unity3d.com/6000.3/Documentation/Manual/json-serialization.html)

| Core 数据 | 存档 DTO 表达 |
|---|---|
| Units 字典 | UnitInstanceDto 列表，Id 作为键；重复 Id 拒绝 |
| RandomStreams 字典 | RandomStreamDto 列表，包含稳定 KindCode 和 RandomStateDto |
| int? / FailureReason? | HasValue + Value / 稳定 Code，不能依赖 Nullable 的默认序列化 |
| 空防卫位/后勤位 | SlotDto 的 Occupied=false；有实体时 true + UnitId |
| Battle / Supply / TemporaryUntil 等可选对象 | HasBattle / HasSupply / HasTemporaryUntil 等显式存在标记及具体 DTO |
| 无材料限制 | HasMaterialRestriction=false；有限制时 true + 非空 Materials |
| 枚举 | 稳定整数 Code，显式编号，不随声明顺序改变；非法 Code 拒绝 |
| 内容和配置快照 | 具体字段及列表 DTO；ContentVersion 必须对应可用内容版本 |

DTO 类型均在 Unity/Infrastructure 中，Core 不标注 SerializeField 或依赖 JsonUtility。保存文档中的 FormatVersion 与 State.SchemaVersion 分别控制外层格式及规则状态迁移，ContentVersion 控制内容相容性。上述 DTO 映射是全部状态的必需转换约定，示例模型仍为设计契约，不能据此宣称读档可用。
