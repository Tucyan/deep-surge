# 数据结构与内容契约 v0.4（Three.js 一层 Demo / 筏格修订）

当前第一层默认值与相关行为由 [平衡试测 v5](first-layer-balance.md) 补充覆盖：初始饥渴 40、低风险保底、属性战术攻击、前置设施与临时防卫销毁；内容版本 first-layer-v4。下文旧版本及旧数值用于追溯。

> 更新：2026-10-03。当前交付与验证范围以 [Three.js 一层 Demo 开发方向](threejs-demo.md) 为准；Unity/C# 方案已移至 [历史参考目录](unity/architecture.md)。

本文件配合[架构](architecture.md)和[接口](interfaces.md)使用。类型以 TypeScript 记法表达设计契约，运行时采用 JavaScript ES Module + JSDoc；不要求安装 TypeScript 或构建工具。第一版规则已实现，本文仍为目标数据契约。全部运行时数据必须可 JSON 序列化；不用 Map、Set、类实例、函数、DOM 或 Three.js 对象存储游戏状态。

## 1. 基础类型与配置

```ts
type DefinitionId = string; // 内容 ID，例如 C01、R01、M01、N01
type EntityId = string;     // 本局唯一且永不复用，例如 card:17、enemy:3
type Lane = 0 | 1 | 2 | 3;  // 界面显示 ①～④
type Material = 'heat' | 'water' | 'organic' | 'energy' | 'material' | 'abyss';
type CardKind = 'resource' | 'consumable' | 'tool' | 'equipment' | 'navigation';
type Meter = { current: number; max: number };
type RandomState = { algorithm: string; version: number; seed: string; cursor: number };
type Phase = 'VoyageSupply' | 'VoyagePreparation' | 'NodeResolution'
  | 'BattleSupply' | 'BattleAction' | 'BattleResolution' | 'BattleDiscard'
  | 'VoyageSettlement' | 'VoyageDiscard' | 'Completed' | 'Failed';
interface RaftLayoutDefinition {
  cells: { layoutId: string; x: number; z: number }[];
  defenseBindings: string[]; logisticsBindings: string[]; // layoutId；四个防卫绑定
}

interface RulesConfig {
  voyageLimit: number;             // 首版测试 5
  voyageAP: number; battleAP: number; // 默认均为 3，允许试测 4
  handLimit: number;               // 10，实体张数
  logisticsSlots: number;          // 首版 2，后续上限 6
  initialRaftLayout: RaftLayoutDefinition; // 初始布局/承载绑定显式配置，不从模型猜测
  hungerPerVoyage: number; hydrationPerVoyage: number; // 10 / 10
  starvationDamage: number; dehydrationDamage: number; survivalDamageCap: number; // 2 / 3 / 4
  deepTideStartTurn: number; deepTideDamage: number; // 7 / 2，角色生命惩罚（试测）
  retreatStartTurn: number; retreatHealthDamage: number; // 2 / 4（试测）
  damagedCellDecayVoyages: number; // 2 个后续航行轮，受损当轮不计
  mentalBreakHealthDamage: number; mentalBreakSanityReset: number; // 6 / 25
  fishSpoilageAge: number;         // 3
  candidateCountWeights: { count: 2 | 3; weight: number }[];
  nodeWeights: { definitionId: DefinitionId; weight: number }[];
  supplyWeights: { definitionId: DefinitionId; weight: number }[];
  tacticalWeights: { definitionId: DefinitionId; weight: number }[];
}
```

AP、费用、伤害、年龄、进度、容量及计数均为非负整数；weight 必须有限且非负，可抽取池总权重大于零。AP 费用没有永久 3 点上限。初始状态参数、起手 C10/C11/C01/C04/C08/C07/C17 由内容启动配置记录。没有出牌用途的工具/纯原料用 `uses: []`，不能用 0 AP 伪造出牌。

初始布局配置校验 layoutId 与整数坐标唯一、四个防卫绑定和两个后勤绑定存在且互不重叠；创建局时为布局格分配唯一实体 ID，并建立 RaftSlot.cellId 引用。初始格数和具体布局仍需内容设计明确。规则筏格不必与每块装饰木板一一对应。

## 2. 内容定义：卡牌与效果

```ts
type TargetRule = 'self' | 'damagedRaftCells' | 'friendlyUnit' | 'enemy'
  | 'emptyDefense' | 'emptyLogistics' | 'friendlyBurning' | 'candidates';
type EffectSpec =
  | { kind: 'restore'; meter: 'health' | 'hunger' | 'hydration' | 'sanity'; amount: number }
  | { kind: 'repairCells'; maxCellCount: number }
  | { kind: 'repairUnit'; amount: number }
  | { kind: 'damage'; amount: number; bonus?: { status: 'wet' | 'bound'; amount: number; consume: boolean } }
  | { kind: 'status'; status: 'wet' | 'bound' | 'baited'; predatorOnly: boolean }
  | { kind: 'extinguish' }
  | { kind: 'grantCards'; cards: { definitionId: DefinitionId; count: number }[] }
  | { kind: 'deploy'; unitDefinitionId: DefinitionId }
  | { kind: 'rerollCandidates' }
  | { kind: 'revealCandidates' }
  | { kind: 'protectEnvironment'; charges: 1 };

interface CardUseDefinition {
  id: string; label: string; apCost: number; target: TargetRule;
  allowedPhases: ('VoyagePreparation' | 'BattleAction')[];
  effects: EffectSpec[]; // 有序列表；一个用途一次事务
  consume: boolean;
}
interface CardDefinition {
  id: DefinitionId; name: string; kind: CardKind;
  materials: Material[];           // 1～2 个不同类型，明确写出
  keywords: string[];              // 易腐/临时等不增加基础材料类型
  uses: CardUseDefinition[];       // 多用途必须显式选择 useId
  spoilAfterVoyages: number | null;
  lifetime: 'run' | 'battle';
}
interface UnitDefinition {
  id: DefinitionId; name: string;
  slotKind: 'defense' | 'logistics'; attack: number; maxStructure: number;
  temporary: boolean;
  production: { everyVoyages: number; capacity: number; outputCardId: DefinitionId } | null;
}
```

效果种类仅覆盖首版，不设计运行任意脚本的通用插件。目标验证由用途和规则共同约束，例如修复不能代替重建残骸，绳索检查连续回合限制。对敌 damage/status 标为进攻；extinguish、restore 和己方部署不做怪物材料检查。自定义文案不能改变效果。

示例：C01 材料 `[organic, material]`，1 AP 修好指定 1 个破损格；C15 1 AP 修好 1～2 个不同破损格（改版试测），脱落格不可修补；C04 `uses=[]`；C13 材料 `[heat, material]`，战斗攻击 1 AP、伤害 3。冷雾中的火把消耗通过节点选项定义，不强行扩大 C13 常规出牌阶段。C23 折叠锚通过 SubmitVoyage 附带的卡牌 ID 扣费和消耗，不走一般 PlayCard。

临时战术内容使用独立 `T` 前缀，例如 T01 稳妥漂木盾：1 AP，部署 0/3 临时单位，不修补永久筏格。其余 T 类内容必须先明确列出后才加入 tacticalWeights；不能从 C 池抽取永久治疗或工具。24 张物资表的计数不包含 T 类补给。

## 3. 配方、怪物与节点

```ts
interface RecipeDefinition {
  id: DefinitionId; apCost: number;
  toolRequirements: { acceptedDefinitionIds: DefinitionId[]; count: number }[];
  ingredients: { acceptedDefinitionIds: DefinitionId[]; count: number }[];
  outputs: { definitionId: DefinitionId; count: number }[];
  outputLifetime: 'run' | 'battle';
}
type CellSeverity = 'minor' | 'severe';
type PenaltySpec =
  | { kind: 'healthDamage'; amount: number }
  | { kind: 'sanityLoss'; amount: number }
  | { kind: 'cellDamage'; selection: 'randomPerimeter'; severity: CellSeverity; count: number };
interface MonsterDefinition {
  id: DefinitionId; name: string; attack: number; maxHealth: number;
  acceptedMaterials: Material[] | null; // null 无限制，空数组非法
  keywords: string[];                  // 捕食者必须明确配置
  intentKind: 'attackLane';
  exposedPenalties: PenaltySpec[]; // 无可工作防卫时的公开处罚，不由 attack 数值隐式推导
}
type NodeKind = 'safe' | 'supply' | 'battle' | 'event' | 'environment' | 'equipment';
type NodeGate = 'always' | 'heatOpportunityProvided' | 'energyResponseAcquired';
type NodeEffect =
  | { kind: 'grantCards'; cards: { definitionId: DefinitionId; count: number }[] }
  | { kind: 'restoreSanity'; amount: number }
  | { kind: 'environmentCellDamage'; selection: 'randomPerimeter'; severity: CellSeverity; count: number }
  | { kind: 'advanceProduction'; unitDefinitionId: DefinitionId; amount: number };
interface NodeOptionDefinition {
  id: string; label: string; apCost: number;
  consumedCards: { acceptedDefinitionIds: DefinitionId[]; count: number }[];
  effects: NodeEffect[];
}
interface NodeDefinition {
  id: DefinitionId; name: string; kind: NodeKind; gate: NodeGate;
  countsAsBasicSupply: boolean; // 保底专用，不依据文案猜测
  options: NodeOptionDefinition[];
  monsters: { definitionId: DefinitionId; countWeights: { count: number; weight: number }[] }[];
  publicRisks: string[]; // 已知损伤、弱点、需求由结构化内容派生并校验
}
interface ContentCatalog {
  version: string;
  cards: Record<DefinitionId, CardDefinition>;
  units: Record<DefinitionId, UnitDefinition>;
  recipes: Record<DefinitionId, RecipeDefinition>;
  monsters: Record<DefinitionId, MonsterDefinition>;
  nodes: Record<DefinitionId, NodeDefinition>;
  rules: RulesConfig;
}
```

配方按实体定义 ID 匹配，不接受任意同标签高级卡代替。R05 与 R07 原料相同，通过 recipeId 决定结果。工具仅作条件，不消耗；首版只使用持有工具卡，接口为未来安装设备条件保留位置。临时实例不能投入 R01–R08。

N03 的三选一奖励、N05 的敌人数/航道、工具箱首次与后续差异都必须在节点生成时解析为 NodeInstance；不在打开详情或领取时重抽。N11 先环境损伤，立即检查败亡，仍存活才进入可选奖励；N12 火把分支明确收 1 AP + C13，无火把/预算可走保守选项。可拒绝整份可选奖励，但不能通过拒绝奖励绕过已经发生的风险。

## 4. 运行时实体

```ts
interface CardInstance {
  id: EntityId; definitionId: DefinitionId;
  acquiredVoyage: number; ageInVoyages: number;
  lifetime: { kind: 'run' } | { kind: 'battle'; battleId: EntityId };
}
interface StatusInstance {
  id: EntityId; kind: 'wet' | 'bound' | 'baited';
  sourceDefinitionId: DefinitionId | null; sourceMaterials: Material[];
  appliedBattleTurn: number;
  expiry: 'consumed' | 'nextOrdinaryAttack';
}
interface UnitInstance {
  id: EntityId; definitionId: DefinitionId;
  sourceCardDefinitionId: DefinitionId; sourceMaterials: Material[];
  state: 'active' | 'wreck'; structure: Meter;
  statuses: StatusInstance[];
  temporaryUntil: { kind: 'battle'; battleId: EntityId }
    | { kind: 'voyage'; voyageIndex: number } | null;
  production: { progress: number; storedCards: CardInstance[] } | null;
}
interface EnemyInstance {
  id: EntityId; definitionId: DefinitionId; lane: Lane;
  health: Meter; statuses: StatusInstance[];
  lastBoundTurn: number | null;
}
interface EnemyIntent {
  enemyId: EntityId; battleTurn: number; kind: 'attackLane'; lane: Lane; amount: number;
  exposedPenalties: PenaltySpec[]; // 随机外围目标在执行时抽取，预览不抽取
}
interface RewardOffer {
  id: EntityId;
  choices: { id: string; cards: { definitionId: DefinitionId; count: number }[] }[];
  status: 'pending' | 'claimed' | 'declined';
}
interface NodeInstance {
  id: EntityId; definitionId: DefinitionId; generation: number;
  status: 'candidate' | 'selected' | 'resolved' | 'abandoned' | 'expired';
  detailsRevealed: boolean;
  options: NodeOptionDefinition[]; // 本实例已解析的选项
  enemySpawns: { definitionId: DefinitionId; lane: Lane }[];
  rewardOffers: RewardOffer[];
}
```

单位的位置只保存在槽位中，不在 UnitInstance 再复制一份 lane。结构为零的持久设备变 wreck，残骸不能攻击、生产或充当工具。一次普通受击可以被 bound/baited 取消；攻击被取消时只消耗实际触发的一个控制，避免重复取消后凭空累积回合。wet 在有效放电包攻击联动后清除；状态保存来源材料，为未来持续伤害沿用同一弱点判定。

## 5. 整局与阶段状态

```ts
type CellState = 'intact' | 'damaged' | 'lost';
interface RaftCell {
  id: EntityId; x: number; z: number; // 木筏布局整数坐标，不是海域导航地图
  state: CellState; damagedAtVoyage: number | null;
}
interface RaftSlot { cellId: EntityId; occupantId: EntityId | null }
interface SupplyOffer {
  fixedCardIds: DefinitionId[];   // 航行随机两张，在生成时固定
  choices: DefinitionId[];       // 航行 C07/C08/C01，战斗 T01/一个固定随机 T 牌
}
interface VoyageState {
  index: number; remaining: number; ap: number;
  candidates: NodeInstance[]; selectedNodeId: EntityId | null;
  candidateGeneration: number; rerolled: boolean;
  supply: SupplyOffer | null;
  environmentProtectionCharges: number;
  settlementApplied: boolean;
}
interface BattleState {
  id: EntityId; nodeId: EntityId; turn: number; ap: number;
  enemies: EnemyInstance[]; intents: EnemyIntent[];
  supply: SupplyOffer | null;
  basicCommandUsed: { pole: boolean; guard: boolean };
  nextHealthHitReduction: number;
  result: 'ongoing' | 'won' | 'retreated';
  resolutionApplied: boolean;
}
interface GenerationHistory {
  offeredBasicSupplyVoyages: number[]; // 记录“提供机会”，非玩家是否选择
  toolboxOffered: boolean; toolboxClaimed: boolean;
  heatOpportunityProvided: boolean; energyResponseAcquired: boolean;
  firstGnawerEncounterEntered: boolean;
}
interface GameState {
  schemaVersion: number; contentVersion: string;
  runId: EntityId; revision: number; nextEntitySequence: number;
  phase: Phase;
  player: { health: Meter; hunger: Meter; hydration: Meter; sanity: Meter };
  raft: { cells: Record<EntityId, RaftCell>; defenseSlots: RaftSlot[]; logisticsSlots: RaftSlot[] };
  hand: CardInstance[];
  units: Record<EntityId, UnitInstance>;
  voyage: VoyageState; battle: BattleState | null;
  nodeStep: { optionResolved: boolean; pendingRewardIds: EntityId[] } | null;
  history: GenerationHistory;
  randomStreams: Record<'nodes' | 'supplies' | 'combat' | 'rewards' | 'raftDamage', RandomState>;
  failureReason: 'healthZero' | null;
}
```

初次 index=1、remaining=5，提交扣 remaining，结算完且弃牌完成后 remaining=0 才 Completed。revision 每条接受的命令递增一次，内部阶段不另起公共命令。终局 snapshot 仍可保留最后战斗用于展示，但不再接受行动。

intents 保存普通攻击的航道与数值，实际执行时该道承载格完好且设备可工作的防卫单位承受结构攻击，否则执行 exposedPenalties 中明确的生命/SAN/筏格处罚；不是把开局被攻击的单位 ID 永久锁死。UI 显示这种动态拦截规则，不能把移动后的目标变化伪装成随机重掷意图。

每三轮至少提供一次基础补给：检查当前轮及前两轮的候选记录，必要时补入基础补给；重掷后的最终候选也必须满足，不能用已移除的本轮旧候选算保底。工具箱前三轮机会同理。历史中一次机会和一次实际获取分开，保证玩家拒绝工具箱奖励不会错误解锁能量敌人。

## 6. 不变量与存档

当前规则依据 [筏格修订](raft-cells.md)。破损格必须有 damagedAtVoyage，完好/脱落格为 null；受损当轮不老化，两个后续航行轮未修补则脱落。脱落时清空对应槽位、销毁设备及储存产物，保留格 ID 与坐标表示缺口。外围由当前未脱落格的四邻接实时派生，按稳定 ID 排序后用 raftDamage 随机流选择，不能在预览中推进。

部署、移动/交换入位、残骸重建需检查承载格完好；攻击、生产、领取产物、安装设备工具条件同时检查设备和承载格。修格不修设备结构，脱落格不能通过修补恢复。原存档有 hull 而无 cells 时需拒绝或显式迁移，不能把原 40 点船体换算成格子。

生命/SAN 同一处罚先全部应用，生命归零先失败；存活且 SAN 从正值归零才执行一次基础崩溃（生命 -6、SAN 回 25）并再次检查败亡。

- 同局所有实体 ID 唯一；卡只能处于手牌、设施储存或转成单位后的单一位置。
- meter 满足 `0 ≤ current ≤ max`；四条航道固定，后勤位数量符合配置；槽位 cellId/occupantId 必须存在，占用不得重复，槽位可因承载格破损/脱落不可用。
- 残骸结构为零、完好设备结构大于零；怪物死亡立即移除；手牌数量不强制实时小于上限。
- 同一轮候选 2 或 3 个、定义不重复且至少一个非战斗；过期候选不能提交。
- 战斗首回合没有 supply；进入新战斗 AP 不读取航行剩余值。
- 免费生产领取仅移动储存卡到手牌，不新建重复物资；恢复和重建不能超过上限。
- 不存在循环弃牌堆、Boss 核心、货币或地图坐标字段；海域导航不存坐标；筏格物理布局坐标由内容明确配置，用于四邻接外围判定。

存档包含完整 GameState、规则配置快照和内容版本。保存点限定在稳定可交互阶段或终局，不在自动结算中途。读取前检查 JSON 形状、枚举、范围、引用、ID 唯一、阶段相容和版本；不支持的版本报告错误并保留旧档，不静默重开。内容版本升级需显式迁移，不能用新版数值重新解释已有怪物和物资。

随机算法及其版本必须固定并能由 seed/cursor 恢复；五个随机流隔离，打开奖励动画不会影响下一轮节点。首版回放为“起始快照 + 已接受命令序列 + 结果摘要”，无需引入事件溯源数据库。

## 第一版实现状态

独立规则已接入五次航行 Demo；实际 API、数据形状、未完成的 EffectPreview/类型化事件/端口、试测参数和验证范围见 [首版实现记录](../development/first-layer-demo-v1.md)。后续调整契约与实现时同步该记录。

最新行动与补给契约修订见 [涌泉与行动结束](spring-and-action-end.md)：DrawSpring、VoyageAction、EndVoyageAction、contentVersion first-layer-v2；该修订优先于本文旧补给描述。

木筏展示沿用现有 cells 的 id/x/z/state 与 units.cellId，以及 defense/logistics 的 cellId；根区、Three.js 对象和文字纹理不加入 GameState。登记数包含脱落格，在位数排除脱落格，扩展展示以初始 4×3 坐标窗口为基准。状态版本不变；[表现 v3](raft-presentation.md) 不代表已实现扩建命令。

新增 VoyageNavigation 阶段，contentVersion 更新 first-layer-v3；state 的 JSON 形状和随机算法不变。导航时 node=null/candidates 固定，移动后 node 锁定、candidates 清空；涌泉内部 cards 不通过只读视图暴露（只显示 count=3）。保存版本不自动迁移，旧阶段解释以 [导航修订](post-discard-navigation.md) 为准。
