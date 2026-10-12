# 雾色与近筏遮罩验证（2026-10-12）

基于用户已有的远端深度雾与三层低空雾继续调整。保留海面波形、海面色板、月光/灯笼/调色、雾层高度0.35/0.95/1.8米、雾层数量及密度。

- 深度雾/背景改为#495b61，低空雾#697c76，经现有冷夜调色后呈低饱和灰青，与海面蓝色分离；14/38米与镜头缩放保留，过渡curve调为1.1。
- 雾纹理过渡更柔和，base_haze=0.42、band_softness=0.12；三层drift分别[0.015,0.006]、[0.018,-0.003]、[0.009,0.006]，降低飘动速度。
- 新增clear_bounds同步真实在位筏格包围范围，clear_fade=1.6/5.8米随镜头缩放；木筏及附近雾层透明。只增加少量遮罩计算，不增加雾层、纹理、摄像机或规则状态。
- night_mist注册稳定shader.voyage.night-mist；config v2、scene.voyage v8与hash同步。

验证：test_fog先因缺少近筏遮罩失败，改后通过。test_toon_ocean与test_clean_ui通过；41个旧素材＋新增夜海/调色/雾的45个hash绑定完整性检查通过。

实际GPU：Godot4.7.2 / Compatibility / RTX4060，toon_ocean_visual六时刻、两种分辨率、脱落与状态隔离通过，日志fog-ocean-gpu.log；fog_visual两时刻、4×3扩展木筏视觉夹具、1600×900/1280×720与状态隔离通过，日志fog-visual.log。已实际查看普通与扩展画面，近筏清晰、远端灰青雾与海面分层。截图fog-t0.png、fog-t6.png、fog-wide-raft.png、fog-wide-raft-1280.png。

4×3为独立视觉夹具，不改变真实游戏或宣称新增扩展玩法；未验证发行构建与其他显卡。用户原有未提交的海面改动保留，本次未提交/推送。
