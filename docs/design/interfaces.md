# 抽象层接口 v0.4（Three.js 一层 Demo / 筏格修订）

当前第一层默认值与相关行为由 [平衡试测 v5](first-layer-balance.md) 补充覆盖：初始饥渴 40、低风险保底、属性战术攻击、前置设施与临时防卫销毁；内容版本 first-layer-v4。下文旧版本及旧数值用于追溯。

> 更新：2026-10-03。当前交付与验证范围以 [Three.js 一层 Demo 开发方向](threejs-demo.md) 为准；Unity/C# 方案已移至 [历史参考目录](unity/architecture.md)。

类型引用[数据结构](data-model.md)。本文定义应用入口、规则职责与适配端口；完整接口目标与第一版已有代码须区分。

## 1. 应用层：GameSession

```ts
interface CommandEnvelope {
  commandId: string; expectedRevision: number; command: GameCommand;
}
type Target = { kind: 'self' } | { kind: 'raftCells'; cellIds: EntityId[] }
  | { kind: 'enemy'; enemyId: EntityId }
  | { kind: 'unit'; unitId: EntityId }
  | { kind: 'defenseSlot'; lane: Lane }
  | { kind: 'logisticsSlot'; index: number }
  | { kind: 'candidates' };
type ToolRef = { kind: 'hand'; cardId: EntityId } | { kind: 'installed'; unitId: EntityId };
type GameCommand =
  | { type: 'ChooseSupply'; definitionId: DefinitionId }
  | { type: 'PlayCard'; cardId: EntityId; useId: string; target: Target; allowIneffective: boolean }
  | { type: 'Craft'; recipeId: DefinitionId; tools: ToolRef[]; ingredientCardIds: EntityId[] }
  | { type: 'SubmitVoyage'; candidateId: EntityId; protectionCardId: EntityId | null }
  | { type: 'ResolveNodeOption'; optionId: string; costCardIds: EntityId[] }
  | { type: 'ClaimReward'; offerId: EntityId; choiceId: string }
  | { type: 'DeclineReward'; offerId: EntityId }
  | { type: 'CollectProduction'; unitId: EntityId }
  | { type: 'PoleRepel'; enemyId: EntityId }
  | { type: 'EmergencyGuard' }
  | { type: 'MoveDefense'; unitId: EntityId; destination: Lane }
  | { type: 'SwapDefense'; firstUnitId: EntityId; secondUnitId: EntityId }
  | { type: 'RebuildWreck'; unitId: EntityId; scrapCardId: EntityId }
  | { type: 'DismantleWreck'; unitId: EntityId }
  | { type: 'EndBattleTurn' }
  | { type: 'Retreat' }
  | { type: 'DiscardCards'; cardIds: EntityId[] }
  | { type: 'FinishDiscard' };

type ErrorCode = 'StaleRevision' | 'WrongPhase' | 'UnknownEntity' | 'UnknownDefinition'
  | 'InsufficientAP' | 'InvalidTarget' | 'MissingTool' | 'MissingIngredient'
  | 'DuplicateInput' | 'TemporaryRestriction' | 'MaterialMismatchConfirmationRequired'
  | 'LimitReached' | 'RewardAlreadyHandled' | 'HandStillOverLimit' | 'TerminalRun'
  | 'InvalidCommand' | 'InvariantViolation' | 'CellUnavailable' | 'CannotRepairLostCell';
interface RuleError { code: ErrorCode; message: string; relatedIds: string[] }
interface EffectPreview {
  target: Target; effective: boolean; materialAccepted: boolean | null;
  damage: number; blockedReason: string | null;
}
interface ActionPreview {
  revision: number; allowed: boolean; errors: RuleError[];
  apCost: number; consumedCardIds: EntityId[];
  outputCards: { definitionId: DefinitionId; count: number }[];
  effects: EffectPreview[]; warnings: string[];
  cellImpact: { selection: 'selected' | 'randomPerimeter'; cellIds: EntityId[];
    severity: CellSeverity | null; count: number } | null; // 不提前揭示随机目标
}
interface GameEvent {
  sequence: number; revision: number; type: string;
  payload: Record<string, unknown>; // 各事件字段见下表；实现时用判别联合收紧
}
type DispatchResult =
  | { accepted: true; state: GameState; events: GameEvent[] }
  | { accepted: false; revision: number; errors: RuleError[] };
interface GameSession {
  getSnapshot(): GameState;         // 深拷贝/冻结，调用方不能修改内部状态
  getView(): GameView;
  preview(command: GameCommand): ActionPreview;
  dispatch(input: CommandEnvelope): DispatchResult;
  exportSave(): SaveDocument;
}
```

创建新局与恢复存档通过独立工厂 `createSession(catalog, seed)`、`restoreSession(catalog, save)` 完成，恢复返回 session 或 SaveError。初始生成自动运行到 VoyageSupply。单机命令按序同步执行，不并行写状态。

preview 只读且不推进 RNG，也不承诺不可见的随机结果：逆流桨预览只显示扣费、数量与约束，实际新候选在确认时生成。实际执行重新校验全部条件，不能信任旧预览。返回 state 为安全副本；存档及测试可取完整状态，UI 只用 getView。

commandId 用于诊断，防双击依靠 expectedRevision：一条成功命令从 r 到 r+1，重复提交 r 必须报 StaleRevision。恢复 UI 时重新取得 revision，不能自动重放未确认命令。若以后增加跨网络重试，需增加持久化幂等记录，当前不承诺该行为。

## 2. 阶段与费用约束

当前目标与费用遵守 [筏格修订](raft-cells.md)。修补通过 PlayCard 选择 raftCells 目标，只接受 1～卡面上限个不同破损格；无目标、完好格、脱落格或重复 ID 拒绝，不扣卡或 AP。部署/移动/交换入位检查承载格完好，停用设备不能攻击、生产、领取或提供工具条件。修格不回血，设备结构仍独立处理。

| 命令 | 合法阶段 | 费用与关键约束 |
|---|---|---|
| ChooseSupply | VoyageSupply / BattleSupply | 无费用，一次处理整批；不允许跳过强制补给 |
| PlayCard | VoyagePreparation / BattleAction | 用途定义控制阶段与目标；无效对敌用途默认要求确认 |
| Craft | VoyagePreparation / BattleAction | 只付配方 AP，工具不消耗，产物进手牌 |
| SubmitVoyage | VoyagePreparation | 航行本身 0 AP，扣一次额度；附带锚另付 1 AP + 牌 |
| ResolveNodeOption | NodeResolution | 只处理所选节点的未处理选项，使用航行剩余 AP |
| ClaimReward / DeclineReward | NodeResolution | 无额外 AP，一份奖励一次；超限不阻塞领取 |
| CollectProduction | VoyagePreparation / BattleAction | 0 AP，设备及承载格均完好且有储存，轮末不可领取 |
| PoleRepel | BattleAction | 2 AP / 2 伤害，每回合一次，仅无材料限制敌人 |
| EmergencyGuard | BattleAction | 1 AP，下次普通角色生命受击减 2；不防 SAN/筏格/深潮；每回合一次 |
| MoveDefense / SwapDefense | VoyagePreparation / BattleAction | 相邻空位移动 1 AP；相邻单位交换 2 AP；入位承载格须完好 |
| RebuildWreck | VoyagePreparation / BattleAction | 2 AP + 一张 C02，原位满结构，保留定义；承载格须完好，同次清空旧生产进度 |
| DismantleWreck | VoyagePreparation / BattleAction | 1 AP，腾出位置，无材料返还 |
| EndBattleTurn | BattleAction | 不扣 AP，启动自动交战及判定，不接受重入 |
| Retreat | BattleAction | 普通战第 2 回合起，角色生命 -4（改版试测），奖励放弃，航行正常结算 |
| DiscardCards / FinishDiscard | BattleDiscard / VoyageDiscard | 免费，实例不重复；不超限才可完成 |

候选选择高亮、合成槽位预填、折叠锚选择、取消选择、卡牌排序与查看详情属于 UI 状态，不写 GameState、不扣 AP。逆流桨和听潮筒通过 PlayCard 对 candidates 目标执行，不额外设计重复的重掷指令。

DiscardCards 只在数量超过上限时允许，单次最多弃到上限，避免把整理阶段变成任意清空手牌的操作。未超限自动通过时无需 FinishDiscard。交换是否仅限相邻、重建是否清空生产进度是首版设计决策，当前按上述规则实现并记录测试。

## 3. 纯规则服务的职责

纯规则函数对输入不原地修改，返回完整变更结果；由 GameSession 合并并提交。下面是职责边界，避免把每张牌都做成类继承层级：

| 服务 | 输入 | 输出与职责 |
|---|---|---|
| CardRules.previewUse / resolveUse | 状态、定义、实例、用途、目标 | 验证费用与目标，生成效果；对敌先材料校验 |
| CraftRules.preview / resolve | 状态、配方、工具和原料实例 | 校验不同 ID、生命周期，扣料、扣费、产物 |
| NodeRules.generate | 状态、配置、nodes/rewards 随机流 | 固定候选、敌人位置、具体奖励；满足非战斗和补给保底 |
| NodeRules.resolveOption | 状态、已解析选项、成本实例 | 有序处理代价、环境伤害、设备进度、奖励 |
| BattleRules.begin / resolveTurn / retreat | 状态、怪物和单位定义 | 独立 AP、意图、四道交战、控制、深潮、战后清理 |
| RaftRules.applyPenalty / repair / age | 状态、严重度、目标/随机流与航行轮 | 当前外围抽取、三态变更、修补及两轮老化；脱落销毁设备及产物 |
| SurvivalRules.settleVoyage | 状态、配置 | 一次饥渴与腐坏，无战斗计时推进 |
| ProductionRules.advance / collect | 完好单位、进度、卡实体 | 受容量限制的产出与领取，不重复物资 |
| InvariantRules.validate | 状态、目录 | 检查实体引用、槽位、阶段、不变量；返回 RuleError[] |
| ViewProjector.project | 状态、目录 | 默认风险、揭露后的详情、合法动作、手牌实体计数 |

单条 CardUse 内多个效果有序处理；若中间已败亡/胜利，后续与终局无关的效果取消。技能组合通过有限 EffectSpec 和明确规则实现，不引入任意字符串表达式求值。

## 4. 基础设施端口

```ts
interface RandomSource {
  nextInt(minInclusive: number, maxExclusive: number): number;
  weightedIndex(weights: number[]): number;
  snapshot(): RandomState;
  clone(): RandomSource; // 事务计算使用副本；失败时丢弃
}
interface SaveDocument {
  formatVersion: number; contentVersion: string;
  config: RulesConfig; state: GameState;
}
interface SaveError {
  code: 'InvalidData' | 'UnsupportedVersion' | 'ContentMismatch' | 'StorageUnavailable';
  message: string;
}
type SaveResult<T> = { ok: true; value: T } | { ok: false; error: SaveError };
interface SaveStore {
  read(slot: string): Promise<SaveResult<SaveDocument | null>>;
  write(slot: string, save: SaveDocument): Promise<SaveResult<void>>;
}
```

浏览器存储为可替换 adapter。首次实现允许手动保存，自动保存只能在命令提交后稳定阶段进行；写入失败提示重试或导出 JSON，不覆盖好档。磁盘时间只属于存档展示元数据，不能作为规则 RNG 来源。种子由新局工厂显式传入并显示在调试面板。

## 5. 表现层读取契约

```ts
interface GameView {
  revision: number; phase: Phase;
  meters: { health: Meter; hunger: Meter; hydration: Meter; sanity: Meter };
  cells: { id: EntityId; x: number; z: number; state: CellState;
    isPerimeter: boolean; decayVoyagesRemaining: number | null }[];
  ap: number; handCount: number; handLimit: number;
  hand: { id: EntityId; definitionId: DefinitionId; name: string; materials: Material[];
    uses: { id: string; apCost: number; enabled: boolean; reason: string | null }[] }[];
  candidates: { id: EntityId; name: string; kind: NodeKind; knownRisks: string[];
    requiredMaterials: Material[]; responseGap: string[]; revealedDetails: string[] | null }[];
  units: { id: EntityId; name: string; attack: number; structure: Meter;
    state: 'active' | 'wreck'; statuses: StatusInstance[]; operational: boolean; blockedByCellId: EntityId | null }[];
  enemies: { id: EntityId; name: string; health: Meter; attack: number;
    acceptedMaterials: Material[] | null; statuses: StatusInstance[] }[];
  defense: { lane: Lane; cellId: EntityId; usable: boolean; unitId: EntityId | null; enemyId: EntityId | null; intent: EnemyIntent | null }[];
  logistics: { index: number; cellId: EntityId; usable: boolean; unitId: EntityId | null; storedCount: number }[];
  supply: SupplyOffer | null; rewards: RewardOffer[];
  legalCommandTypes: GameCommand['type'][];
  voyageIndex: number; voyagesRemaining: number; battleTurn: number | null;
  deepTideInTurns: number | null;
}
```

rewards 只包含当前可领取奖励，不直接暴露所有候选的隐藏具体产物。已知环境损伤、材料弱点、事件最低资源需求默认可见；听潮筒只补充具体奖励与额外分支。getSnapshot 不传到 DOM，不通过开发用 window.gameState 驱动正式 UI。

模型对象使用 `EntityId → Three.js Object3D` 映射；承载格及四航道槽位由内容布局绑定，模型根据 cells 显示破损或缺口，不从装饰木板反向推断规则格数。动画播放事件，但画面切换、低画质、关闭动态效果不影响结算。读档、重启或事件序列不连续时直接重建快照画面。

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
| RaftCellDamaged / RaftCellRepaired / RaftCellLost | cellId, previousState, newState, cause, removedUnitId, lostStoredCardIds |
| MentalBreakdown | healthLoss, sanityBefore, sanityAfter |
| BattleEnded | battleId, result |
| VoyageSettled | voyageIndex, hungerLoss, hydrationLoss, healthLoss |
| RunEnded | result（completed/failed）, reason |

命令被拒绝时只有 RuleError，不产生用于扣费/播放受击的事件。记录中每个 DamageApplied 的 amount 是实际损伤，材料不匹配单独记 MaterialRejected，便于检验限制而非把零伤害误判为命中。

## 7. 一次制作与使用的接口例子

在 BattleAction，状态版本 r、AP=3，手牌有点火器 tool:1、漂流木 card:2、布条 card:3。

1. `preview({type:'Craft', recipeId:'R01', tools:[{kind:'hand',cardId:'tool:1'}], ingredientCardIds:['card:2','card:3']})` 返回制作费 1、消耗两个原料、产物 C13，状态与随机流不变。
2. dispatch 相同命令及 expectedRevision=r，接受后 revision=r+1、AP=2；工具仍在手牌，新增唯一火把实例。
3. 用新增火把的实例 ID、攻击 useId 和水母 enemyId 预览，返回实际伤害 3、费用 1、材料有效。
4. dispatch expectedRevision=r+1，AP=1，火把消耗、水母移除。若最后一个敌人已消灭，直接战斗胜利，清理临时物、处理奖励；不等待 EndBattleTurn。
5. 重发第二步的 r 版本命令被拒绝，不生成第二张火把。

若换成 C17 鱼叉对水母，预览标记无效；allowIneffective=false 拒绝，true 接受并正常消耗，敌人生命及负面状态不改变。

## 第一版实现状态

独立规则已接入五次航行 Demo；实际 API、数据形状、未完成的 EffectPreview/类型化事件/端口、试测参数和验证范围见 [首版实现记录](../development/first-layer-demo-v1.md)。后续调整契约与实现时同步该记录。

最新行动与补给契约修订见 [涌泉与行动结束](spring-and-action-end.md)：DrawSpring、VoyageAction、EndVoyageAction、contentVersion first-layer-v2；该修订优先于本文旧补给描述。

表现层 `createRaftPresenter({resources,createLabel}).sync(view)` 使用现有只读视图，按格 ID 增删和更新。`getPickMeshes()` 仅返回在位格，`summary` 区分登记/完好/破损/脱落/扩展数；`dispose()` 释放私有实例，共享缓存由场景释放。它不是 GameSession 命令，不写状态；详见 [木筏状态展示](raft-presentation.md)。

导航修订：SubmitVoyage 仅在 VoyageNavigation 接受，锁定当前 node 并进入 VoyageSupply；新增 `{type:'EnterNode'}` 在 VoyagePreparation 处理已到达节点。VoyageDiscard 完成后才开启下一批候选；C22/C24 在导航阶段使用。实际接口与保存版本见 [轮末弃牌后导航](post-discard-navigation.md)。
