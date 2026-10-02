# 程序化设备模型 v1

2026-10-03；源 `dist/presentation/models/equipment.js`，工厂 `createEquipment(definitionId)`。四个稳定 ID：`model.equipment.c18` 漂木盾（T01 临时盾复用），`model.equipment.c19` 轻弩，`model.equipment.c20` 捕捞网，`model.equipment.c21` 集雨器。

模型尺寸由工厂内几何参数确定，适配 2.3 × 2.25 米筏格；静态几何无随机数、外部图片或纹理依赖。依赖本地 Three.js r180。场景 `scene.js:syncDemo` 以实体 ID 管理实例，配置取规则视图，不直接改 GameState。轻弩提供 muzzle 锚点；其他 root 锚点用于部署。

`setState` 提供 active / disabled / wreck 展示：停用暗化并保留实例，残骸显示破损木件；恢复与停用不销毁资源。每个实例独占 geometry/material，以集合记录并且 dispose 幂等；移除单位时同时移除场景根并释放实例资源。不向规则状态放入 Three.js 对象。

验证：Node 测试四种模型筏格边界、三种状态、资源仅释放一次；浏览器实际部署临时盾、轻弩、捕捞网和集雨器。未导出 GLB、创建 LOD、碰撞体或刚体；尚未逐模型单独做多角度美术验收。首版使用简易模型，后续可以保持 AssetId 更换工厂。
