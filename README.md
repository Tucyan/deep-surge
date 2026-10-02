# 水世代 · Three.js 场景复刻

基于提供的游戏界面制作的单页演示。海面、木筏、帆布、木桶、箱子、植物、灯笼、岩柱和红色涡流均为实时 Three.js 场景；远景中的巨像、卡牌插画及航行缩略图使用提供的参考图片，通过 CSS 裁切展示。

## 本地运行

在本目录运行 `python -m http.server 5173 --directory dist`，然后打开 http://localhost:5173。也可双击 `启动预览.cmd`。

## 操作

- 点击卡牌，再点击合成位置或木筏使用。
- 数字键 1–5 选择对应手牌；Esc 取消选择；Enter 结束回合。
- 左侧按钮查看航行图、物资、牌库和画面设置。
- 行进点可探索；涌泉可调查。
- 网页会按浏览器宽高保持参考图比例，横屏或全屏查看效果最佳。

这是视觉与交互演示，游戏进度不保存。Three.js r180 已包含在 `dist/vendor`，运行时无需访问外部 CDN，也无需安装 npm 依赖。使用现代支持 WebGL 2 的浏览器。

## 文件

`dist/index.html` 界面结构；`dist/style.css` 样式；`dist/scene.js` 三维场景；`dist/app.js` 交互。

Three.js 使用 MIT 许可证，许可证包含在 `dist/vendor/LICENSE`。参考图素材仅来自用户提供的图片。

## 新增美术素材

2026-10-03 整理用户提供的新美术包：3 张怪物立绘、6 张材料图标、4 张状态/信息图标和 5 张卡框。文件位于 `dist/assets/images/`，详见 [资产清单](dist/assets/manifest.json) 和 [来源记录](asset-sources/README.md)。原 ZIP 及 3 张合成源图已保留，图片未经修改。当前页面尚未读取这些素材；状态为 `staged-not-integrated`。

## 程序化木筏资产

启动 `npm start`，打开 [木筏资产工坊](http://127.0.0.1:5173/raft-assets.html)：查看四格木筏、独立扩展板，旋转/缩放、拼接和切换战损展示。模型已接入旧场景的筏板生成入口，规则循环仍未实现。

工厂与资源接口详见 [木筏资产说明](asset-sources/raft-procedural-v1.md)。验证命令：`npm run check`、`npm run test:assets`。
