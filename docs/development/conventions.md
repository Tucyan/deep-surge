# Three.js 开发规范

版本：v0.1。日期：2026-10-03。适用范围：当前 `water-era` 一层可玩 Demo。本文是开发约定，拟定目录和检查脚本尚未全部实现。

## 1. 目标与约束

先完成一层规则循环与首版内容，再精修表现。玩法依据为两份首版规则与 [筏格修订](../design/raft-cells.md)，交付范围见 [一层 Demo](../design/threejs-demo.md)。本规范规定代码和资产如何维护，不自行改变 AP、卡牌效果、怪物处罚或试测参数。

使用 JavaScript ES Module、JSDoc、Three.js 与 HTML/CSS，沿用本地 vendor 和静态 HTTP 服务。TypeScript 类型用于契约说明，不要求编译。暂不引入 React、打包器、ECS 或服务器；需要新依赖时先记录其具体用途、版本、许可证与离线运行方式。Three.js 当前本地版本按原型 README 为 r180，升级需作为单独变更验证，不混用其他版本的 addons。

根仓库维护设计与日志，`water-era` 独立仓库维护代码和运行资产。两处修改分别检查 Git 状态，提交使用明确文件列表，保留用户既有修改。资产源文件、截图和缓存的归属见 [资产维护规范](asset-maintenance.md)。

## 2. 目录与职责

下列为渐进落地的目标结构；保留现有入口及启动方式，`dist/` 在当前无构建流程下是**直接维护的运行目录**，不是可随意清空的自动构建输出。不额外创建另一套 `src/` 副本。

```text
water-era/
  package.json
  README.md
  dist/
    index.html                  页面骨架
    app.js                      组合入口：会话、输入、UI、场景与生命周期
    scene.js                    兼容入口，逐步转为场景适配导出
    style.css                   样式入口
    game/
      model.js                  ID、状态、命令的 JSDoc 契约
      content/                  cards、recipes、monsters、nodes、rules-config、raft-layout
      rules/                    cards、craft、battle、voyage、survival、raft、production
      session.js                唯一规则写入口与事务
      view.js                   只读投影和动作状态
      adapters/                 可恢复随机流、JSON/浏览器存储
    presentation/
      ui/                       手牌、候选、合成、战斗、状态、日志 Presenter
      scene/
        world.js                场景创建、更新、销毁
        raft-presenter.js       筏格/槽位/单位的实体映射
        models/                 筏格、设施、怪物、装饰的程序化工厂
        materials/              共享材质和 Canvas 纹理工厂
        shaders/                导出 GLSL 字符串的 .js 模块
        effects/                海面、涡流、粒子和灯光表现
      input.js                  DOM/键盘/Raycast → 意图 → 命令
      styles/                   按界面职责拆分 CSS
    assets/
      manifest.json             运行资产登记与映射
      images/                   cards、nodes、ui、backgrounds 等用途分目录
      models/                   经验证接入的 GLB
      textures/                 文件纹理和图集
      fonts/                    实际使用的本地字体及授权文件
    vendor/                     固定版本 Three.js、需要的 addons 与 LICENSE
  asset-sources/                原图、Blender 源、导出说明；不由静态服务发布
  scripts/                     语法、内容、资产引用等检查脚本
  tests/
    rules/                      固定种子规则用例
    fixtures/                   明确标注的测试内容/状态
  evidence/                    试玩记录与必要基准截图
```

文件以小写 kebab-case 命名，函数/变量 camelCase，类型契约 PascalCase，常量 UPPER_SNAKE_CASE。内容 ID 沿用 C/R/M/N/T，实体 ID 与资产 ID 分开；显示名不能充当持久标识。路径大小写必须一致，避免只在 Windows 上可用。

一个文件围绕一个职责组织。新增逻辑写成可读的多行代码，不继续把函数、整个样式文件或 GLSL 压在一行。文件超过约 300 行或同时包含初始化、规则、资产工厂与交互时，应评估拆分；该长度是维护提示，不是通过增加空壳文件机械达标。

## 3. 依赖与状态边界

```text
app.js（组合入口）
  ├─ GameSession → 纯规则 → 内容数据
  ├─ UI / Input → GameSession 的公开接口
  └─ Scene Presenter → 只读视图 + 领域事件 → 模型/材质工厂
```

`game/model.js`、`game/content/`、`game/rules/`、`game/session.js`、`game/view.js` 不导入 `presentation`、`scene.js` 或 Three.js，不访问 window/document、localStorage、performance 或动画帧。`game/adapters/` 的浏览器实现由入口注入；纯核心不反向引用该实现。

所有规则修改走 GameSession.dispatch。Preview 只读，提交重新验证阶段、版本、实体和费用。表现层不能直接扣 AP、发牌、判胜或给格子随机处罚。局内状态为可 JSON 序列化纯数据；DOM、Object3D、Texture 和 Material 均留在展示层。

UI 选择、高亮、合成栏预填和镜头设置为展示状态，不存进规则状态；取消预览不扣资源。Raycast 返回稳定 cellId/entityId，不能仅返回模型世界坐标决定命令目标。规则筏格数来自布局配置，不从木板 Mesh 数量推导。破损/脱落与设备结构分别投影到画面。

禁止新增 `window.gameState` 耦合。旧场景读取此变量的路径在接入 Presenter 时移除；调试入口只返回快照，正式按钮与自动化操作仍走同一个命令接口。合法按钮状态用于反馈，规则层仍承担最终校验。

## 4. 内容、随机与事件

卡牌、配方、怪物、节点、初始筏格布局和试测参数放内容数据。规则通用行为放 rules；图像、模型和颜色映射放资产清单。不要把裁切坐标、纹理路径、节点权重或制作费混在按钮事件里。

内容载入时校验 ID、引用、数量、材料类型、权重和目标约束，错误要带内容 ID 与字段位置。首版必须保留无卡面用途的纯原料、临时物资限制、两次收费和材料匹配；工具参与配方不意味着打出工具。

规则随机流使用记录的算法、版本、seed/cursor，保持候选、物资、战斗、奖励、筏格惩罚各流隔离。展示随机使用独立视觉种子，最好按 assetId/entityId 派生；增删一棵植物不能改变节点或外围受击结果。绝不以 Math.random、时钟或相机更新来决定规则结果。

命令提交后返回完整视图与有序事件。动画播放这些事件；读档/重开/跳过动画时可直接从快照恢复。一个会话只持有一套输入订阅、一个场景更新循环；重新绑定 UI 不得发第二次补给或结算。

## 5. 场景生命周期与界面

场景适配的目标接口为 `create / sync / update / resize / pick / dispose`；语义必须一致：create 初始化资源，sync 投影快照，update 只推进视觉时间，pick 返回语义 ID，dispose 停止帧循环并移除订阅、释放所拥有资源。重复调用 sync 同一 revision 不新增重复单位。

资产工厂通过上下文接受共享资源和局部随机源，不私自写全局 scene/raft 或启动 requestAnimationFrame。每个实体有稳定对象映射，移除格子同时清除其选择代理、标签与单位模型。`scene.remove()` 与 GPU 资源释放分开管理，详见资产规范。

屏幕布局与 3D 世界坐标分离。Resize 同时处理容器、画布尺寸、镜头投影和指针归一化；Raycast 按实际 canvas.getBoundingClientRect 计算。现有 1672×941 是视觉基准，不是唯一支持分辨率。

操作按钮使用真实 button、清晰标签、禁用原因和键盘焦点。回车不能绕过弃牌阶段或误触两次提交，输入框/弹窗打开时应正确屏蔽游戏快捷键。关闭动态效果只暂停视觉动效，不能改变 AP、命令合法性或规则结果。内容文字优先 textContent；确需 HTML 模板时，只插入受控结构并转义动态文字。

## 6. 错误与性能

区分 RuleError、内容/资产加载错误和渲染错误。规则拒绝不产生资源副作用；必要资产加载失败应给明确状态和本地占位，不能卡在 loading。重复加载、对象已移除后异步返回等情况要取消或丢弃旧结果。

开发日志使用内容 ID、实体 ID、seed、revision 和命令，不用只有“操作失败”的消息；不要每帧输出控制台。生产和腐坏在航行结算执行，不能放在 update 中靠帧数计时。

性能改动先记录同一视图、画质、分辨率和机器下的 draw calls、triangles、textures/geometries、采样帧时间，再比较。首轮暂以高画质 1600×900、45 FPS 为试测目标，低画质以 30 FPS 为目标，沿用当前场景 45/30 的视觉节奏；这不是已经实测达到的承诺。新高负载效果超出目标时优先减少模型细节/灯光/粒子，不能降低规则正确性。

## 7. 修改、检查与交付

| 变更 | 必要检查 |
|---|---|
| 文档 | 相对链接、代码围栏、规则/契约一致，区分计划与完成 |
| 规则/内容 | 新增模块语法、内容引用、与改动相关的固定种子 Node 测试 |
| UI/输入 | 实际点击和键盘操作、错误提示、缩放与弹窗焦点 |
| 模型/纹理/Shader | 资产记录、固定视角截图、控制台与资源加载、交互位置、资源清理 |
| 重开/销毁 | 连续重开 5 次后的实体数、事件订阅及资源数量无逐次增长 |
| 完整一层 | 成功局/失败局、两条不同路线、最后轮结算、筏格惩罚与修补证据 |

当前已存在命令（在 `water-era` 目录执行）：

```text
npm run check
python -m http.server 5173 --directory dist
```

第一条只检查旧 `app.js` 和 `scene.js` 的语法，不覆盖全部新增模块。后续实现检查入口时应扩展为遍历所有运行 .js 模块，另设 `npm test` 对应 Node 内置测试、`check:content` 和 `check:assets`；这些脚本目前尚不存在，不能提前声称已通过。

每次交付说明变更原因、实际运行的检查与未验证项。资产改动附固定场景比较，规则改动附 seed/命令证据，不能用单张美术截图证明可玩性。长命令、下载或权限不足最多尝试 3 次；超时交由用户执行，下载优先国内镜像；GitHub 推送使用已登录 Tucyan 的 CLI，沿用根 AGENTS.md。

## 8. 渐进改造次序

1. 保留原运行页面、截图和启动方式，按 [资产盘点](asset-inventory.md)登记现状。
2. 增加 game 核心与测试，用测试状态跑通最短完整循环。
3. 将 app.js 改为组合入口，UI 模块接命令；将 scene.js 工厂和生命周期渐进拆出，不同时重写海面全部表现。
4. 引入资产清单，逐项移除散落的裁切坐标和硬编码展示参数；每次移出一个工厂检查画面与资源回收。
5. 接入筏格三态和首版实体，完成一层验收；随后再做性能精修和更复杂资产替换。

迁移时保留兼容导出直到调用方切换完成，不能只移动文件而不更新 import、CSS URL、缓存键和登记位置。本次制定规范没有执行上述重构。
