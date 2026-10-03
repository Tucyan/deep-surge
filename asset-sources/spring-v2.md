# 涌泉与远景修订 v2

源：scene.js（已有远景守望者与红色涌泉程序化几何/Shader，视觉种子 2187）、app.js:animateSpringCards、demo.css: spring-button / spring-emergence。

稳定 AssetId：model.distant-guardian、model.distant-ruins、effect.spring-vortex、effect.spring-card-emergence。前两项由 scene 初始化创建，不是可复用模型工厂，GPU 生命周期仍跟随整页；不进入 GameState。远景不再采样 reference.png 的旧 UI 截图；恢复已有守望者几何，位置 (.6,-.9,-9)，缩放 .55，经过现场截图复核。画布 resize 同步 CSS 和渲染尺寸。

涌泉位于 (7,-.2,-.3)，同一相机投影到 DOM 按钮；按钮隐藏/动画开关不影响抽牌结果。涌现动画复用本轮三张卡对应的原 PNG，无新裁切/纹理，1 秒过渡，逐张延迟 100ms，结束后移除 DOM；减少动态设置关闭动画。规则先提交固定结果，再播放动画，动画不扣 AP 或决定结算。

卡池与行动阶段见根 docs/design/spring-and-action-end.md；一轮只能抽一次，预览与重复点击不能重抽。静态资源检查及实际点击涌泉、超限继续行动、结束后弃牌已验证；没有宣称已优化历史 scene Shader 替换链、所有场景资源释放或远景美术完成。

远景礁柱与遗迹改为较低的带状布局，避免高柱被画面上沿截断。66 个礁柱位于 x=-25..25、z=-15..-10，高 .4..1.8；10 个遗迹柱 x=-11..10、z=-11..-9，高 .7..1.9，以统一 distantStone 材质绘制，横梁高度随柱高确定，不再悬浮在固定世界高度。属于表现改动，不增加怪物或节点。

移除旧截图后同时把海面遮罩远端迁移至 horizonFade uniform=(-35,-25)，让遗迹所在海域保留水面，避免原来 -12..-8.5 的近端透明渐隐把远景模型衬成悬浮物。仍沿用历史 Shader 组装；没有增加新的源码替换链。
