# 纹理海面验证（2026-10-12）

当前默认运行：`texture_ocean.gd`，Godot 4.7.2、Compatibility / OpenGL 3.3、RTX 4060 Laptop GPU。用户海面模型仅归档，不再启动加载；本次独立实现双层UV滚动与外缘泡沫，没有复制网络示例的代码或图片。

## 功能与预算

- 基线测试先失败：原默认海面180000三角形，不支持按真实筏格更新接触泡沫。
- 新默认海面2三角形，四格外缘8条/泡沫16三角形，共18三角形，两绘制surface。此数字只包括海面和接触效果，不包括木筏、礁石和UI。
- `test_texture_ocean.gd`通过：四格共享边隐藏、L形凹角更新、单格四边、全部脱落隐藏、扩展木筏中心洞口保留、不变布局不重建、视觉更新不修改规则/随机、首页暂停更新，日志`texture-component.log`。
- 不透明海面两次纹理采样；外缘共用一个泡沫材质。无逐帧形变、CPU波形采样、屏幕/深度采样、额外泡沫视口或常驻粒子。
- 筏底四角在0/2/5/8秒检查全部浸水，最低约-0.216米、最高约-0.135米。浮动幅度2.5厘米，泡沫固定水面；湿木水线按世界高度混合。
- 原生GPU四时刻、1600×900与1280×720、L形脱落截图通过；已实际目视检查水纹、接触与脱落画面。截图为`texture-ocean-t*.png`、`texture-ocean-1280.png`、`texture-ocean-detached.png`。

## 本机测量

详见[原始数据](texture-ocean-metrics.json)和[GPU日志](texture-ocean-gpu.log)。配置v2放大浪纹后重新测量：10000次视觉更新平均CPU墙钟4.4437微秒；完整应用120帧样本的中位墙钟8.342ms、P95 8.714ms。包含UI、木筏、显示节奏等开销，不等于单独海面GPU时间；没有用几何下降比例宣称FPS提升比例。未验证独立发布构建或其他显卡。

配置v2：水纹视觉尺度约扩大2.33倍，法线强度0.65→1.8，提高双层流速和浪纹色差。重新运行GPU四时刻/两种分辨率/脱落截图、接触组件与38个hash绑定检查通过。几何仍为海面2+泡沫16三角形，木筏浮动幅度不变，筏底持续浸水。下文完整规则/剧情/挑战回归为此次纹理参数调整之前同一天的基线记录，本次不改规则代码。

## 当次回归

`test_catalog`、`test_supplied_assets`、`test_clean_ui`、`test_flow`、`test_mechanics`、`test_routes`、`test_save`、`test_story`、`test_story_edges`均exit0，日志为`texture-test_*.log`。素材完整性检查38个hash绑定/20张原图通过；Node原玩法9组数据一致性测试9/9通过。

`story_ui_smoke.gd`实际15站鼠标按钮/下拉/3D/无滚动条通过；`flow_ui_smoke.gd`实际12站挑战Boss胜利通过，日志为`texture-story-ui.log`与`texture-challenge-ui.log`。

`supplied_visual_smoke.gd`当前海面8时刻、卡背、合成页及19卡图完整GPU素材回归通过，日志`texture-supplied-ui.log`。

本版为平面水纹、接触泡沫/暗部与湿木水线；没有真实撞水流体、刚体浮力、木筏镜面倒影或SSR。原`supplied-*`证据保留为之前模型海面的历史记录，新素材回归截图使用`supplied-texture-*`名称。
