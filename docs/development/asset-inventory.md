# 当前展示资产盘点

盘点日期：2026-10-03。证据范围：读取本地源码、README 和文件元数据；本次未启动浏览器或渲染场景。下表描述实际旧演示，不代表首版规则已经接入。路径以工作区根为基准。

## 1. 文件资产与源资产

| 登记 ID | 当前路径 | 事实与状态 |
|---|---|---|
| image.reference-master | `water-era/dist/reference.png` | PNG，1672×941，2,679,274 字节；README 记录为用户提供参考图，legacy |
| vendor.three | `water-era/dist/vendor/three.module.min.js`、`three.core.min.js` | README 标注 r180，页面实际本地导入；保留 `vendor/LICENSE`，不手改压缩库 |
| source.raft-blender | `raft-model/raft_v004.blend` | 4,148,885 字节，可编辑木筏源；位于根仓库忽略目录，尚未作为 Three.js 运行资产接入 |
| model.raft-glb | `raft-model/raft.glb` | 6,933,148 字节；Blender 导出验证见现有报告，scene.js 没有 GLB Loader/引用，不能称为浏览器已验证 |
| model.raft-fbx | `raft-model/raft_unity.fbx` | 5,262,844 字节；Unity 实验资产，当前不作为浏览器加载格式 |

reference.png SHA-256：`daf88c5d08206f76bd5888400ad09a6139fcad1ec684b70ae25703b0cc521341`。此值用于记录本轮测得的文件版本，文件变更后需重新计算；尺寸和 hash 不构成来源授权证明。

## 2. 程序化资产

生成代码目前均在 `water-era/dist/scene.js`，使用模块内 seed=2187 的串行 rand。参数还散落在函数体中，工厂有全局 scene/raft 副作用，尚未按新规范拆分。

| 登记 ID | 当前生成入口 | 当前展示与迁移要点 |
|---|---|---|
| model.raft-cell | makeTile、makeTile 初始循环 | 初始 4×3 个代码生成组，格间距 X=2.3、Z=2.25；每组多木板与选择面。仅为旧视觉布局，非已确认的规则初始布局 |
| model.raft-frame | raft 周围浮木、框架/栏杆循环 | 组合式全船装饰；规则格脱落时需要明确哪些部件随格移除 |
| model.canopy | canopy + triangleCloth 修改 | 两处篷布/支柱，局部顶点变形；记录三角篷与普通篷的配置差异 |
| model.barrel | barrel | 木桶几何、铁环与绳线；装饰，不是持有物资实体 |
| model.chest | chest | 多处箱子，含蓝色材质变体；不可按箱子数量推导库存 |
| model.plant-box | addPlant | 种植箱与随机植物；旧操作直接生成，后续改为实体 Presenter 管理 |
| model.lantern | lantern | 支架、灯体、PointLight 与 Canvas 光晕；统一共享资源和灯光预算 |
| model.rock | rock | 多处近/远岩柱，顶点扰动；独立视觉随机，减少重复私有材质创建 |
| model.guardian | guardian 组构建 | 巨像几何、触须、发光眼；同时存在 CSS 远景参考图，不能笼统称远景全部是 3D 或全部是图片 |
| effect.ocean | oceanMat + ocean | 170×150 平面、260×230 分段、Shader 波纹；配置和最终 Shader 从替换链拆出 |
| effect.vortex | vortexMat + vortex / particles | 光效平面、岩石、点光源及 250 粒子；代码不是外部动画资产 |
| ui.tile-highlight | tileHighlight / pickTile | 选择代理和高亮；旧 pickTile 读取 window.gameState，后续改为显式展示状态和实体 ID |

海面几何分段和粒子数量是源码参数，不是本轮帧性能测量。`sceneInfo()` 已提供部分 renderer.info 输出入口，但本次未执行，不填实际 draw calls/三角面统计。

## 3. 程序化纹理与内嵌装饰

| 登记 ID | 当前入口 | 规格/用途 |
|---|---|---|
| texture.sky-canvas | skyTexture | Canvas 1024×512，噪声/渐变天空，已在代码标记 SRGBColorSpace |
| texture.wood-canvas | woodTexture | Canvas 512×128，随机木纹；共享于 woods 材质，代码标记 SRGBColorSpace |
| texture.lantern-glow | lantern 内 Canvas | Canvas 128×128，径向渐变光晕 Sprite；后续核对颜色与 alpha 语义、缓存和释放 |
| ui.icons-inline | `dist/index.html`、`dist/app.js` SVG 与 data favicon | 图标/框线为源码资产，按组件整理；重要状态仍用文本表达 |
| ui.frames-css | `dist/style.css` | 边框、遮罩、雾、旋转装饰与 vignette；样式不是游戏规则 |

## 4. reference.png 的复用依赖

以下为实际 CSS/JS 参数，不是已经整理出的独立裁切图片。背景负偏移不能单独证明完整原图矩形；区域宽高还取决于 DOM/CSS，迁移时必须一起登记。

| 登记 ID | 实际调用点 | 已读取的定位参数 |
|---|---|---|
| image.node-city-crop | style.css 的 .destination-art / .city-art | background-size 1672×941，偏移 (-365,-118)，容器高 81 |
| image.node-island-crop | style.css 的最终 :root .island-art | background-size 1672×941，偏移 (-1439,-415)，容器高 86；前面还有旧 1280×720 声明，被后置规则覆盖 |
| image.card-art-crops | app.js cards 的 x/y + style.css .card-art | 五张旧演示牌起点 (307,646)、(524,646)、(738,646)、(953,646)、(1170,646)，高 113；不是 C01–C24 的正式资产映射 |
| image.card-frame-overlay | style.css .card:after | 偏移 (-300,-770)，background-size 1672×941，低透明纹理叠加 |
| image.horizon-crop | style.css :root .horizon-art | 原图区域定位 (700,0)，显示容器 371×228，渐变 mask；与 scene.js guardian 几何共存 |

这些消费者共享同一文件，替换 reference.png 必须同时检查卡图、节点图、远景和卡框。新首版内容不能直接把旧演示五张牌的坐标按数组顺序当作 C 编号映射。

## 5. 当前维护缺口与处理顺序

- `scene.js`、`app.js` 及 `style.css` 高度压缩，资产参数、规则演示、选择和渲染相互耦合；先按职责渐进拆分。
- 新增美术 PNG 已建立独立运行清单；Canvas、代码模型和旧参考图裁切尚未纳入该清单。本表登记其入口，不声明 registry 已加载。
- 同一视觉随机流影响所有生成次序；改用局部视觉种子，不与规则随机共用。
- Shader 有多次字符串替换，样式有后置覆盖；整理为唯一生效配置，保留视觉基线。
- 缺统一 dispose 与共享所有权；先为重开/实体移除建立资源清理，再增加动态设备与可脱落格。
- 原图源记录仅有“用户提供”的 README 说明，新增/替换资产要补具体来源与制作记录；未确认的授权状态继续如实标记。
- Blender 源、GLB 与 Unity 实验资产未进入 Three.js 运行加载链；是否替换代码木筏需先验证规则格映射，不自动复制或导入。

最初规范制定阶段只登记现状；后续新增美术文件整理见第 7 节。场景、Shader、GLB 和旧演示规则未在素材整理时修改。

## 6. 用户新增卡牌与节点资产包

本轮收到并只读检查了两个本地 ZIP：

| 资产包 | 当前来源 | 已检查内容 |
|---|---|---|
| Deep-Surge_Card-Assets_v1.zip | `D:/Users/ALmerb/Downloads/Deep-Surge_Card-Assets_v1.zip` | 9,217,187 字节；24 张 C01–C24 PNG，全部 724×543、RGBA，另含 README.txt 与 manifest.csv |
| Deep-Surge_Event-Nodes_v1.zip | `D:/Users/ALmerb/Downloads/Deep-Surge_Event-Nodes_v1.zip` | 5,087,944 字节；12 张 N01–N12 PNG，632～637×406～410、RGBA，另含 README.txt 与 manifest.csv |

两包 ZIP CRC 检查通过；CSV 编号/文件名/尺寸与 PNG 头一致，各编号完整且无重复。逐文件尺寸、字节数、SHA-256、来源条目和拟定运行路径记录在 [资产包元数据](supplied-asset-packs.json)。RGBA 表示存在 alpha 通道，不表示已逐像素验证透明背景，也未验证实际图像外观。

两包的状态为 inspected-not-imported：已盘点，未解压到运行目录，旧页面仍使用 reference.png。后续卡图通过 C 编号绑定，节点图通过 N 编号绑定；按文件名排序或 CSV 行号关联内容均不可替代显式映射。这两个包不包含 T 类战术牌、怪物单独立绘或筏格破损状态资产；后续怪物立绘新增情况见第 7 节。

建议运行路径为 `dist/assets/images/cards/CXX_*.png`、`dist/assets/images/nodes/NXX_*.png`。接入时保留原包/CSV 作为制作源和记录，检查解压目标位于指定资产目录，再提取指定 PNG；不执行包内脚本、不将说明当玩法规则。节点图尺寸略不同，按统一容器等比显示，不能强行拉伸或假设全部同宽同高。正式 AP、名字、材料和风险仍由当前规则数据生成。

包内说明仅提供用途、格式和制作用途信息，本轮未据此改变玩法，也未确认超出用户提供事实的作者或许可。Downloads 是当前输入位置，后续接入前需保存可恢复源，不能把个人 Downloads 路径写进网页运行引用。

## 7. 新增美术包 v1：已整理，待接入

用户提供 `Deep-Surge_New-Art-Assets_v1.zip`，10,820,447 字节，共 18 张独立 PNG、3 张合成源图及 README/CSV。原 ZIP 与制作源保存到 [来源目录](../../water-era/asset-sources/README.md)，18 张 PNG 保存到运行资产目录，并登记到 [运行清单](../../water-era/dist/assets/manifest.json)。逐条尺寸、哈希和原包条目见 [完整元数据](supplied-asset-packs.json)。

| 类别 | 原包编号 | 数量 | 运行目录 | 绑定约定 |
|---|---|---|---|---|
| 怪物立绘 | M01–M03 | 3 | `assets/images/monsters/` | 明确绑定对应怪物；图片不是 3D 模型 |
| 材料图标 | T01–T06 | 6 | `assets/images/material-icons/` | 热源、水源、有机、能量、材料、深海；原包 T 编号与战术牌编号独立 |
| 状态/信息图标 | S01–S04 | 4 | `assets/images/status-icons/` | 浸湿、束缚、燃烧、材料弱点；燃烧预留，材料弱点为信息徽章 |
| 卡框模板 | K01–K05 | 5 | `assets/images/card-templates/` | 原料、消耗品、工具、设备、航行工具；使用不同尺寸时保持比例 |

### 独立素材规格

| 原包编号 | 名称 | 像素尺寸 |
|---|---|---|
| M01 | 啃筏者 | 1443×1086 |
| M02 | 胶膜水母 | 1448×1086 |
| M03 | 绝壳蟹 | 1448×1057 |
| T01 | 热源 | 396×502 |
| T02 | 水源 | 419×460 |
| T03 | 有机 | 430×487 |
| T04 | 能量 | 462×510 |
| T05 | 材料 | 482×485 |
| T06 | 深海 | 460×539 |
| S01 | 浸湿 | 461×638 |
| S02 | 束缚 | 499×714 |
| S03 | 燃烧 | 479×607 |
| S04 | 材料弱点 | 492×592 |
| K01 | 原料 | 397×739 |
| K02 | 消耗品 | 396×727 |
| K03 | 工具 | 397×742 |
| K04 | 设备 | 396×778 |
| K05 | 航行工具 | 378×730 |

合成源图：`card_templates_5up_final.png` 1983×793、`materials_6up.png` 1448×1086、`statuses_4up.png` 2048×768；保留在 `asset-sources/new-art-v1/source_sheets/`。本次没有重新裁切或生成派生图片。

新包状态为 `staged-not-integrated`：文件分类保存并登记，但当前 HTML/Three.js 尚未读取这些素材或清单。前两个包仍为 `inspected-not-imported`。当前总计盘点 57 张 PNG，其中新包 18 张已放入运行资产目录、3 张作为制作源保留。

ZIP CRC、CSV 映射与尺寸、PNG 头、源文件和分类文件哈希验证通过；全部 PNG 为 RGBA。未逐像素检查透明度，未做浏览器视觉验证。包内说明仅作为制作资料，没有据此新增状态、调整 AP 或改变玩法。

## 8. Three.js 木筏与扩展板 v1

新增 `model.raft`、`model.raft-expansion-panel` 与 `texture.raft-wood`，源/接口/资源所有权和验证证据见 [程序化木筏记录](../../water-era/asset-sources/raft-procedural-v1.md)。模型工厂 `presentation/models/raft.js` 不依赖场景和 GameState；按格坐标组合，支持完好/破损/脱落的展示，使用共享资源及实例化细件。

主场景的 makeTile 已迁到新板工厂，旧帆篷、外围框和其他装饰保留；新增 `/raft-assets.html` 独立工坊，默认 2×2 仅是展示配置。木纹为固定种子 DataTexture，不使用新增 PNG 包。新增资产清单 ready 状态仅代表资产测试与浏览器展示验证，未实现或验收正式玩法。

## 9. 第一层 Demo 接入更新（2026-10-03）

第 6/7 节的未导入/未接入状态为当时盘点结果。现在 C01–C24、N01–N12 共 36 张 PNG 已按原字节导入运行目录，原 ZIP 保存在 asset-sources/packs；全部 C/N/M 通过 presentation/art.js 显式映射。54 张运行 PNG 加 3 项木筏资产与 4 项设备模型，共 61 个 AssetId；3 张合成源 PNG 另外保存。

新增 model.equipment.c18/c19/c20/c21（临时 T01 复用 C18），工厂 presentation/models/equipment.js，资源由实例独占释放，支持 active/disabled/wreck。场景只读视图映射，详见 [设备源记录](../../water-era/asset-sources/equipment-procedural-v1.md)。新增的 HTML/CSS 界面装饰由 app.js/demo.css 维护，未新增图片裁切或 Shader 源码替换链。

C/N/M 标为 integrated-unverified（已接入但未逐张视觉验收）；其他材料/状态/卡框 15 张仍 staged-not-integrated。设备 generated-tested 表示模型尺寸、状态与资源测试已通过，浏览器路线实际部署；并非多角度美术验收完成。完整验证与截图见 [首版记录](first-layer-demo-v1.md)。

## 10. 涌泉与远景 v2

移除当前入口的 reference.png 远景裁切，恢复已有 3D 守望者并调整布局；保留源图。登记 model.distant-guardian、model.distant-ruins、effect.spring-vortex、effect.spring-card-emergence，源记录 water-era/asset-sources/spring-v2.md；后者仅复用现有卡图动画，无新图片裁切。运行清单现有 65 个 AssetId；61 项旧资产计数保留为历史验证。

## 11. 木筏状态映射 v3

主场景改为动态格子对账、每格文字占位与紧凑装饰筏根，移除固定 4×3 拼接、长边框及占格营地装饰。新增 model.raft-root、presentation.raft-state、texture.raft-cell-label，共 68 个 AssetId。源/配置与释放约定见 [资产记录](../../water-era/asset-sources/raft-state-v3.md)，行为与验证边界见 [木筏状态展示](../design/raft-presentation.md)。

原完整木筏与设备工厂保留，设备模型当前不在主场景渲染，不能把旧部署模型截图作为当前画面。新增 raft-state.html 使用独立快照展示 12/20/6 格与战损；扩建操作仍未实现。文字纹理为每实例 Canvas，无新增外部图片或裁切。

## 12. 导航布局 v4

木筏、涌泉及其近景附件整体左移，删除左侧候选容器，在右侧菜单显示轮末弃牌后产生的下一批节点。新增 presentation.navigation-panel，复用 N01–N12 图片；运行清单共 69 个 AssetId。effect.spring-vortex 维持原 ID，更新 v4 布局记录；木筏模型工厂/纹理源不变。详见 [导航源记录](../../water-era/asset-sources/navigation-v4.md) 和 [规则修订](../design/post-discard-navigation.md)。

## 筏根、透视与水线 v6（2026-10-03）

model.raft-root / presentation.raft-state 更新为 v6；新增 presentation.perspective-camera 和 effect.raft-water-contact，共 71 项 AssetId。营地为 7.6×3.2 的展示区；相机、波形采样、浮动和接触泡沫作为程序化资产登记。源与资源所有权见 [维护记录](../../water-era/asset-sources/camp-contact-v6.md)。工坊展示模型，海面接触效果在主游戏验收。
