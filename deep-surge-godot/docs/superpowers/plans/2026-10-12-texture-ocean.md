# 双层纹理海面实施计划

目标：保留 3D 场景，海面改为不透明平面上的两层滚动纹理，接触泡沫只画实际筏格外缘。
架构：`presentation/texture_ocean.gd` 管理海面、共享资源和外缘网格；独立 shader 与 JSON 配置管理外观。规则与随机状态保持独立，原用户素材完整保留。
技术：Godot Compatibility、空间 shader、确定性的周期纹理生成脚本。

- [x] 先写 `tests/test_texture_ocean.gd`，证明当前海面超过几何预算；再验证四格外缘、脱落后更新、隐藏暂停和状态独立。
- [x] 新建周期水纹/泡沫资产生成脚本，登记稳定 ID、hash、尺寸、视觉种子与参考来源。双层滚动使用同一纹理两次采样，海面不采样屏幕或深度。
- [x] 实现独立海面组件：海面两三角形；泡沫合并为一个外缘网格，只在筏格变化时重建，移除共享边，保留洞口边。
- [x] `voyage_world.gd` 接入组件，设置小幅浮动与湿木水线，原海面资源留作历史来源，避免启动时加载形变模型。
- [x] 运行 Godot 导入、组件/资产/流程/剧情/存档测试；实际 GPU 截图检查多个时刻和 1280×720、1600×900。记录几何预算及实测帧时，更新资产和前端文档。

验证命令：`Godot_v4.7.2-stable_win64_console.exe --headless --path deep-surge-godot --script tests/test_texture_ocean.gd`；GPU 使用 `tests/texture_ocean_visual.gd`。不自动提交或推送。
