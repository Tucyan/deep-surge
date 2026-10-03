# 战术卡展示映射 balance-v5

2026-10-03；稳定 AssetId：`presentation.tactical-card-aliases`。程序源 `dist/presentation/art.js` 的 cardArt.T01–T04，消费者 `dist/app.js`。

T01 盾复用 C18 挡板；T02 碎木复用 C01 漂流木；T03 临时火种复用 C13 火把；T04 临时电弧复用 C14 放电包。依赖既有 image.card.c18/c01/c13/c14，不新增图片、裁切、纹理或视觉随机。源图来自用户已登记的卡牌 ZIP，尺寸/hash/源版本沿用原清单记录。

这些是临时牌视觉别名，不能按原图上的永久牌属性执行。费用、材料、名称、伤害及临时标志由纯内容定义与 app 实时文字呈现；T03/T04 是战术内容 ID，和素材包 T 材料图标编号没有绑定关系。

临时牌规则测试与实际浏览器证据见 `evidence/balance-v5-verification.md`。本记录只声明复用映射，不声明新美术制作完成。
