# 风格化冷夜海面 v1（2026-10-12）

用户反馈原GLB海面"效果很差"，要求三渲二风格化浪花、整体阴暗；色调选择"深蓝冷夜"，整体暗蓝。本版为当前默认海面，原GLB海面保留为回退（`voyage_world.gd` 的 `ocean_style_override = "model"` 可强制，仅供旧回归测试）。

## 实现

- `presentation/toon_ocean.gd` + `assets/shaders/toon_ocean.gdshader`：4组Gerstner波（主涌浪15米/0.30米及三组碎浪），顶点着色器位移；GDScript用同一公式加8次不动点反解求 `height_at`，供木筏浮动与测试，结果确定，只由视觉时间驱动。
- 近景64米/200细分平面（80802三角形），20～30米外振幅衰减到0；远景600米平面（2三角形）在近景范围内discard，下沉3厘米防止深度冲突。
- 着色：unshaded手工光照，按键光N·L与浪高量化为5档暗蓝色带（fwidth抗锯齿硬边）；菲涅尔偏冷蓝；月光高光为柔和光带加噪声打碎的硬闪点；灯笼为暖色微弱光池加暖色闪点。
- 浪花：逐波 `pow(sin θ, 18)` 浪脊线（按最陡波归一，主涌浪单独即可成线），叠加Gerstner雅可比折叠与浪高，fbm噪声侵蚀为断续硬边泡沫；高阈值浅色泡沫核心；Voronoi边缘细纹只在浪脊附近低强度出现；随距离18～42米淡出。
- 船边：沿用原接触方案——筏格包围盒外1.2米起、2.4米内过渡到共同切平面，木筏/湿木/外缘泡沫共享水线。新增按真实在位筏格（最多48格）SDF生成的外扩接触环，脱落后更新；原 `texture_ocean` 外缘泡沫条保留，颜色/不透明度改为冷夜配置。
- 环境：深度雾16～72米（水面着色器内同参数手工雾，`fog_disabled` 避免Compatibility下unshaded雾行为差异）、环境光0.38、冷月光、灯笼2.6、礁石加深；航行SubViewportContainer挂 `night_grade.gdshader` 做降饱和/冷色/暗角，HUD不受影响。
- 全部参数在 `assets/data/toon-ocean.json`（`data.ocean.toon-config`），登记命令 `python -X utf8 tools/register_toon_ocean.py`。镜头未改动（用户尚未确认是否压低视角）。

这是风格化表现近似：没有真实流体、浮力、倒影或屏幕/深度采样。参数为本次目视调校值，不是最终美术定稿。

## 当次验证

Godot 4.7.2 / Compatibility / RTX 4060 Laptop GPU。

- `test_toon_ocean.gd` PASS：默认使用夜海且不再加载GLB、调色材质存在、8时刻×5点顶点正向位移与反解高度误差<1厘米、各格筏底浸水、外缘泡沫边与切平面一致、倾斜限幅、远景振幅归零、脱落后接触环格数更新、规则与随机快照不变。首次运行因测试读取 `material` 命中同名方法而失败，改用 `get_material()` 后通过。
- `toon_ocean_visual.gd` PASS：实际GPU六时刻、1600×900/1280×720、单格脱落截图 `toon-ocean-*.png`；筏底相对水位约-0.175米。`toon-ocean-metrics.json`：视觉更新1000次140.273毫秒（约0.14毫秒/次），整应用帧墙钟中位8.333ms、P95 9.349ms；单次本机测量，非孤立GPU计时。
- 调色探针（临时脚本，已删除）：开/关调色时左侧角落亮度0.1041→0.0905、中部0.2112→0.1996，确认调色实际生效。
- 回归：content.test.mjs 9/9、check_supplied_assets（44个hash绑定）、test_model_ocean（强制回退）、test_texture_ocean、test_flow、test_mechanics、test_routes、test_save、test_catalog、test_clean_ui、test_story、test_story_edges、test_supplied_assets 全部PASS。
- GPU界面：supplied_visual_smoke、flow_ui_smoke、story_ui_smoke 均PASS，日志 `toon-*.log`。`--capture` 重新生成了 `hud-*.png` 与 `supplied-current-*`，现为夜海画面。
- 未运行：`model_ocean_visual.gd`、`texture_ocean_visual.gd`（会覆盖旧版证据图与 `model-ocean-metrics.json`；两脚本已改为强制GLB路径以保持原行为，但本次未实际执行）。未验证发行构建与其他显卡。
