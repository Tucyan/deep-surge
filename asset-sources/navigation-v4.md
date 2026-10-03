# 导航布局资产 v4

2026-10-03。presentation.navigation-panel：由 dist/app.js 的 renderPanel 和 dist/demo.css 生成，运行入口 dist/index.html。复用 image.node.n01–n12 的现有图片，无裁切、哈希或图片尺寸变化；每项展示名称/风险/已选状态，详情受 C24 揭示结果控制。

删除左侧 destinations 容器和布局样式；右侧菜单在 VoyageNavigation 显示下一批节点，在行动与弃牌阶段隐藏列表。弃牌完成前不提供移动按钮。

场景布局调整：raft x=-3.8→-7.3；vortex x=7→3.5；其子石柱、粒子与光源随父级移动。水面涌泉红光和木筏尾流坐标在既有 Shader 配置中同步，未新增源码替换链。createRaftPresenter 的居中/等比缩放、格距及资源所有权不变，procedural model 视觉随机种子仍为 2187。

源工厂、根区与文字纹理维持 raft-state-v3，model/effect 资产 ID 保留。当前布局仍使用固定正交相机，未新增旅行动画或镜头交互。浏览器截图与规则验收位于 evidence/navigation-v4-*.png / navigation-v4-verification.md。
