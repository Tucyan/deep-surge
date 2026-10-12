# 用户素材应用验证

2026-10-12，Godot 4.7.2 / Windows / Compatibility、RTX 4060 Laptop / OpenGL 3.3；Blender 5.2.2 LTS后台处理副本。没有下载、升级、插件安装、配置修改、Git提交或推送。所有游戏测试隔离用户存档。

## 输入与绑定

- `card(5).zip`：16张透明PNG，原字节保留；绑定19个原卡牌ID＋工具/禁止工具。灯与余温、矛与矛架、弓弩与射箭、工具箱与行动卡共享图，不新增物品规则。
- `卡牌ui.zip`：4张透明PNG，三类徽章和双卡图；正面/背面通过清单图集区域分离，原像素未改。手牌和战斗使用正面，未知图鉴使用背面。
- `jvneiyangchengshuimian.blend`：源场景含一个Ocean平面、相机、两盏灯、ShaderToRGB/foam与几何节点。源自动脚本未执行，驱动器`frame/20`经检查后由导出器手动采样。原文件hash与归档一致，用户原件未覆盖。

源包/可编辑派生blend、PNG清单、尺寸/hash、映射、Blender检查/导出报告位于`asset-sources/user-pack-20261012/`；`.gdignore`隔离Godot自动导入源文件。运行文件均在`assets/`，不依赖微信目录或本机Blender。

## 海面导出与适配

导出GLB为4208720字节（约4MB），一个网格，10201顶点、20000三角面，基准＋15形变，共16姿态。源Ocean分辨率16→运行10，采样原参数帧24～249。GLB原生包含UV/法线/形变；源码保留原Ocean参考与烘焙对象。16帧泡沫数据生成404×404图集，坐标采样约1.9MB，运行只读。

Godot使用九个55米周期网格实例，共用网格/材质；以独立视觉时间循环形变和泡沫。木筏从同一坐标数据采样高度/倾斜，运动学跟随。源蓝色渐变与泡沫阈值在Godot材质适配；没有把截图作为海面。

限制：Blender ShaderToRGB不能由glTF原样携带，光照响应为适配；源几何节点喷雾实例未转换，当前泡沫为表面数据。16姿态循环不是在Godot实时运行Blender海洋模拟。木筏为刚性平面近似，各角和浪峰并非完全贴合，未声称真实浮力、流体碰撞或实时平面反射。

## 当次检查结果

- `python tools/check_supplied_assets.py`：PASS，32个hash绑定、20张原PNG的尺寸/alpha/来源一致；图集区域不越界；GLB头/大小/顶点数/15形变/UV/法线通过。
- `test_supplied_assets.gd`：PASS，实际图片加载/不叠占位字、图集正反面、分类徽章、九实例共享网格、15形变、UV、采样二进制与GLB基准坐标一致；波形变化与循环边界高度连续。
- `test_catalog / test_clean_ui / test_flow / test_mechanics / test_routes / test_save / test_story / test_story_edges`：PASS。原卡牌/普通节点等九表深度等价9/9；挑战种子22仍12站HP13/SAN24首领胜利，种子0仍第11站SAN失败；剧情四完整路线及JSON恢复/任务/夜间边界保持通过。
- 实际GPU `story_ui_smoke.gd -- --capture`：PASS，15站A，真实按钮输入及下拉选择，无规则夹具；卡面可点击、分页、教学合成/安装/升级、夜间与最终选择通过。[运行输出](supplied-story-ui.log)。
- 实际GPU `flow_ui_smoke.gd -- --capture`：PASS，种子22十二站Boss胜利；新卡面在战斗中使用、清理/结果返回正常。[运行输出](supplied-challenge-ui.log)。
- 实际GPU `supplied_visual_smoke.gd`：PASS，八个指定时刻、卡图图库、配方、背面；海面播放和截图不改变GameSession快照。[运行输出](supplied-visual.log)、[高度/接触采样](supplied-motion.json)。

波形循环10秒，两侧采样木筏高度差小于0.00002米；倾斜限制±0.15弧度。不同波形时刻角部间隙可达约0.66米、某些角部略浸水，属于上述刚性跟随近似的明确边界，未隐藏为“完整接触模拟”。

## 已检查画面

- [19张卡图和UI](supplied-card-gallery.png)
- [实际游戏与水面](supplied-ocean-00.png)
- [8时刻海面/木筏联系表](supplied-ocean-contact-sheet.jpg)
- [配方与禁用工具图标](supplied-craft.png)
- [未知图鉴卡背](supplied-card-back.png)
- [原Blender水面参考](../asset-sources/user-pack-20261012/ocean-source-preview.png)

联系表检查：海面与木筏位置连续，循环两端一致；卡牌可读，图片不拉伸，类别和动态文字独立。没有检验低端硬件、移动端、跨平台字体或发行导出性能。
