# 轮末弃牌后导航与右侧节点菜单

当前第一层默认值与相关行为由 [平衡试测 v5](first-layer-balance.md) 补充覆盖：初始饥渴 40、低风险保底、属性战术攻击、前置设施与临时防卫销毁；内容版本 first-layer-v4。下文旧版本及旧数值用于追溯。

2026-10-03，按用户截图修订。覆盖旧的“先涌泉、再在准备阶段选择节点”流程。内容版本 first-layer-v3，不改变卡池权重、饥渴扣减、战斗或筏格老化数值。

## 当前航行顺序

首次出发直接进入 VoyageNavigation。后续仅在上一航行轮行动结束、结算及弃牌检查完成后进入该阶段；手牌未超限则检查自动通过，不要求无意义的弃牌。战斗轮末弃牌回到战术补给，不生成下一批航行节点。

1. VoyageNavigation：右侧菜单显示 2～3 个候选及名称、图片、风险；点选只改变 UI 选择，确认 SubmitVoyage 才移动。候选结果在进入阶段时固定，重开菜单/预览/取消不重掷。
2. SubmitVoyage：仅导航阶段合法，锁定 node、清空 candidates，转为 VoyageSupply。其他阶段拒绝移动，包括 VoyageDiscard、VoyageAction 与 VoyagePreparation。
3. VoyageSupply：本轮免费抽三张涌泉卡，一次领取；DrawSpring 后进入 VoyagePreparation。抽牌结果仍在 beginVoyage 时预生成，导航预览不消费随机流。
4. VoyagePreparation：已到达当前节点，可制作、部署、维修或使用物资。EnterNode 处理当前节点，进入 NodeResolution 或 BattleAction；不再提供下一节点选择。AP 耗尽也允许 EnterNode，节点处理完后才结算。
5. 节点或战斗结束后，有剩余 AP 进入 VoyageAction；AP 耗尽或 EndVoyageAction 结算饥渴、老化、生产，再处理超限弃牌。
6. VoyageDiscard 完成后刷新下一航行轮 AP，产生下一批节点并进入 VoyageNavigation。第五轮完成结算与弃牌后直接 Completed，不产生第六批节点。

## 导航工具

逆流桨 C22 和听潮筒 C24 改在 VoyageNavigation 使用，保留原费用和一次限制；导航阶段不允许其他物资、制作或设备操作。折叠锚 C23 在导航提交时选择并付费，环境保护继续绑定到所选节点。AP 在进入新航行轮设为 3，导航工具及锚费用保留到准备阶段；战斗首回合仍按原规则刷新 AP。

## 布局与资产

删除 index.html 的左侧 destinations 区域；候选卡由 app.js/renderPanel 在右侧当前行动菜单中展示，弃牌期间该菜单只显示弃牌说明。节点多时菜单可滚动，保留图片、风险和已选状态。木筏、涌泉、涌泉石柱/粒子/光源一起左移 3.5 世界单位；木筏为 x=-7.3，涌泉为 x=3.5；筏格尺度与装饰根区不变，相关水面效果位置同步。

新增 presentation.navigation-panel，程序源 app.js/renderPanel 与 demo.css；源记录 [navigation-v4](../../water-era/asset-sources/navigation-v4.md)。规则模块依赖统一带 navigation-v4 URL 版本，避免浏览器混用新旧阶段代码。未新增图片裁切或 Shader 源码替换链。

旧 first-layer-v2 保存被版本检查拒绝，不静默迁移；当前仍无浏览器存档界面。实际验证见 [导航记录](../../water-era/evidence/navigation-v4-verification.md)。
