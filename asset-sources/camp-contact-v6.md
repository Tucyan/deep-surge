# 筏根、透视与水线资产 v6

2026-10-03。纯 Three.js 程序化资产，无新增下载或图片。游戏规则与随机流未改变。

| AssetId | 来源与配置 | 运行映射 |
| --- | --- | --- |
| model.raft-root | presentation/models/raft-root.js，createRaftRoot / ROOT_CONFIG | 主游戏与状态工坊 |
| presentation.raft-state | presentation/scene/raft-presenter.js / PRESENTATION_CONFIG | 只读快照到筏板、标签、筏根与接触轮廓 |
| presentation.perspective-camera | presentation/scene/camera.js / CAMERA_CONFIG | 主游戏与状态工坊 |
| effect.raft-water-contact | presentation/scene/water-contact.js / WATER_CONTACT_CONFIG、SEA_WAVE_GLSL | 主游戏的水线泡沫与浮动采样 |

筏根从 4.4×1.65 扩为 7.6×3.2，面积约 3.35 倍，占初始木筏平台面积约 28%。根区依旧位于功能格后侧，不计入格数、槽位或规则状态。增加错缝板、浮木端面、系泊桩、后栏绳、下垂布面与开口帐篷、床垫、板条箱及角铁、箍桶、菱形垂挂渔网、绳圈与灯笼笼架。移除遮挡营地的根区浮动标签；功能格仍用文字占位。

根实例私有材质、布面/网绳等几何由 owned 集合幂等释放；借用木纹材质、纹理及共享几何由资源池释放。重复钉头用 InstancedMesh。布面有 UV 与法线，材质为纯色粗糙布，无外部贴图。固定布局，不消费规则或视觉随机。Node 校验 footprint、有限顶点/UV/法线与三角面预算。

主相机为 36° 透视镜头，位置 (3,12,23)，看向 (-1,0,-1.4)，轻微侧视；工坊位置 (8,12,18)，看向 (1.6,0,0)，35°。鼠标偏移保留相机基础侧移。自动缩放包含营地边界，12 格约 1.01，20 格约 0.83。

水面、泡沫和 CPU 浮动采样共享同一波形：两组短波与 0.08 长涌浪。九点平均决定升沉、相对边缘采样决定俯仰/横摇；draftOffset=0.16，让浮木部分浸水。此为运动学视觉浮动，非刚体浮力模拟。getContactRects 只包含在位筏板与筏根，按真实坐标和缩放生成；分割矩形边界并剔除内部重叠边，脱落时重建，水线独立于木筏倾斜并采样水面高度。外侧 0.32 宽的分段带随波起伏，Shader 加入破碎白沫、明暗脉冲与接触暗边；透明深度测试开启、深度写入关闭，不使用全筏椭圆白圈。网格/材质私有并幂等释放，状态更新释放旧几何。

动画关闭时采用 t=0 的稳定姿态与泡沫，不消费规则随机。浮动后拾取仍通过更新后的世界矩阵；Node 验证透视投影、倾斜与拾取一致。工坊仅展示模型快照，没有海面效果；主游戏是接触效果验收入口。

验证记录：[camp-contact-v6-verification.md](../evidence/camp-contact-v6-verification.md)。
