# 新增美术资产来源

记录日期：2026-10-03。用户提供 `Deep-Surge_New-Art-Assets_v1.zip`，原文件位于 `D:/Users/ALmerb/Downloads/`。作者和许可未另外确认。

- [原始 ZIP](packs/Deep-Surge_New-Art-Assets_v1.zip)：10,820,447 字节。
- SHA-256：`1ed4c3796baebc31c41b647018bd8ce924f7add0a93869424394663307b91329`。
- [包内说明](new-art-v1/README.txt)和 [CSV 映射](new-art-v1/manifest.csv)原样保留；其内容是资产资料，不覆盖玩法文档或开发约定。
- 三张合成源图原样保存在 `new-art-v1/source_sheets/`，用于追溯和后续裁切。
- 18 张独立 PNG 按原始字节分类保存到 `../dist/assets/images/`，未缩放、裁切、压缩或改名。
- [运行资产登记](../dist/assets/manifest.json)记录尺寸、哈希、资产 ID、原包条目；`staged-not-integrated` 表示文件已就位，当前页面尚未加载。

恢复方式：从保存的 ZIP 中按清单的 `archiveEntry` 提取指定 PNG 到 `runtimePath`，核对 SHA-256；源图、README 和 CSV 留在本目录，不由 `dist` 静态服务发布。不要执行包内文件。

材料 T01–T06 只是原包编号，不绑定游戏战术牌 T 编号。S03 燃烧为预留素材，S04 材料弱点是信息徽章；素材存在不代表规则已实现。K01–K05 分别登记为原料、消耗品、工具、设备、航行工具卡框。包内说明称此版卡框移除了顶部类别徽章、统一蓝色 AP 图标底；该说明只记录制作版本，未验证渲染外观。

验证范围：ZIP CRC、CSV 文件映射/尺寸、PNG 头、复制后逐文件 SHA-256。RGBA 只证明有 alpha 通道，未验证透明像素、视觉质量或浏览器显示效果。旧卡牌/事件节点两个包仍为只读盘点状态，未在此次自动导入。

## 程序化模型源

新增 Three.js 木筏与扩展板工厂，详见 [木筏 v1](raft-procedural-v1.md)。源为 JavaScript、配置与视觉种子，纹理程序生成；与上述尚未接入的 PNG 状态独立。
