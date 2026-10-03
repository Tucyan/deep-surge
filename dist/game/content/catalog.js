// First-layer trial content. Values follow the project design, not legacy UI.
const define=(name,kind,materials,cost,description)=>({name,kind,materials,cost,description});
export const CARDS={
 C01:define('漂流木','resource',['organic','material'],1,'修好 1 个破损筏格；或用于制作。'),
 C02:define('废铁','resource',['material'],1,'修复一件设备 3 结构；或用于制作。'),
 C03:define('绳索','resource',['material'],1,'束缚匹配敌人，取消下次攻击；不能连续回合束缚。'),
 C04:define('布条','resource',['organic','material'],null,'用于火把与滤水包制作。'),
 C05:define('蓄电碎片','resource',['energy','material'],null,'用于放电包制作。'),
 C06:define('海水','resource',['water'],1,'浸湿匹配敌人或绝壳蟹；浸湿不造成伤害，不能直接饮用。'),
 C07:define('淡水','consumable',['water'],1,'水分 +24。当前没有燃烧目标。'),
 C08:define('干粮','consumable',['organic'],1,'饱食 +24；不腐坏。'),
 C09:define('鲜鱼','consumable',['organic'],1,'饱食 +18；或诱饵使匹配捕食者停攻一次。持有 3 航行轮腐坏。'),
 C10:define('手工工具','tool',['material'],null,'保留工具，开放修补、滤水、挡板、轻弩及航行配方。'),
 C11:define('点火器','tool',['heat','material'],null,'保留工具，开放火把配方。'),
 C12:define('绝缘钳','tool',['material'],null,'保留工具，开放放电包配方。'),
 C13:define('火把','consumable',['heat','material'],1,'匹配敌人受到 3 伤害；或冷雾中驱雾。'),
 C14:define('放电包','consumable',['energy','material'],1,'匹配敌人受到 4 伤害，浸湿则 +1 并移除浸湿。'),
 C15:define('修补包','consumable',['material'],1,'修好 1～2 个不同破损格，不能补建脱落格。'),
 C16:define('滤水包','consumable',['water','material'],1,'获得 1 张淡水；饮用另付 AP。'),
 C17:define('鱼叉','consumable',['material'],1,'匹配敌人受到 3 伤害，束缚则 +2 并移除束缚。'),
 C18:define('简易挡板','equipment',['material'],1,'防卫位：0 攻 / 4 结构；战后移除。'),
 C19:define('轻弩','equipment',['material'],2,'防卫位：2 攻 / 4 结构；自动攻击同道敌人。'),
 C20:define('捕捞网','equipment',['material'],2,'后勤位：每 2 航行轮储存 1 鲜鱼，容量 1。'),
 C21:define('集雨器','equipment',['water','material'],2,'后勤位：每 2 航行轮储存 1 淡水，暴雨额外 +2 进度。'),
 C22:define('逆流桨','navigation',['material'],1,'重掷全部候选，每航行轮一次，数量不变。'),
 C23:define('折叠锚','navigation',['material'],1,'提交航行时抵消首次环境筏格损伤，不防怪物。'),
 C24:define('听潮筒','navigation',['energy','material'],1,'揭示本轮候选的具体奖励和额外选项。'),
 T01:define('稳妥漂木盾','equipment',['material'],1,'本场临时防卫：0 攻 / 3 结构。'),
 T02:define('投掷碎木','consumable',['material'],1,'匹配敌人受到 2 伤害；本场临时牌。'),
 T03:define('临时火种','consumable',['heat'],1,'匹配敌人受到 2 伤害；本场临时牌，不能制作永久物资。'),
 T04:define('临时电弧','consumable',['energy'],1,'匹配敌人受到 2 伤害；本场临时牌，不能制作永久物资。'),
};
export const MATERIAL_NAMES={heat:'热源',water:'水源',organic:'有机',energy:'能量',material:'材料',deepSea:'深海'};
export const EQUIPMENT={C18:{slot:'defense',attack:0,structure:4,temporary:true},C19:{slot:'defense',attack:2,structure:4},C20:{slot:'logistics',attack:0,structure:4,threshold:2,output:'C09'},C21:{slot:'logistics',attack:0,structure:4,threshold:2,output:'C07'},T01:{slot:'defense',attack:0,structure:3,temporary:true}};
export const RECIPES={
 R01:{tool:'C11',ingredients:['C01','C04'],output:'C13',cost:1},R02:{tool:'C12',ingredients:['C05','C02'],output:'C14',cost:1},R03:{tool:'C10',ingredients:['C01','C02'],output:'C15',cost:1},R04:{tool:'C10',ingredients:['C04','C06'],output:'C16',cost:1},R05:{tool:'C10',ingredients:['C01','C03'],output:'C18',cost:1},R06:{tool:'C10',ingredients:['C02','C03'],output:'C19',cost:1},R07:{tool:'C10',ingredients:['C01','C03'],output:'C22',cost:1},R08:{tool:'C10',ingredients:['C02','C03'],output:'C23',cost:1},
};
export const MONSTERS={
 M01:{name:'啃筏者',health:4,attack:2,materials:null,predator:true,intent:'拦截设备 -2 结构；空道随机外围 1 格轻损伤'},
 M02:{name:'胶膜水母',health:4,attack:1,materials:['heat'],intent:'拦截设备 -1 结构；空道生命 -1、SAN -1'},
 M03:{name:'绝壳蟹',health:5,attack:2,materials:['energy'],intent:'拦截设备 -2 结构；空道生命 -2'},
};
export const NODES={
 N01:{name:'平缓海面',kind:'safe',risk:'安全航行，无额外奖励',options:[{name:'平稳驶过',cards:[]}]},
 N02:{name:'漂浮物带',kind:'supply',risk:'材料补给；选择一组',options:[{name:'打捞木料与布条',cards:['C01','C04']},{name:'打捞废铁与绳索',cards:['C02','C03']}]},
 N03:{name:'涌泉喷口',kind:'supply',risk:'三张固定物资中选一张'},
 N04:{name:'升起的工具箱',kind:'supply',risk:'首次获得能量应对工具和原料'},
 N05:{name:'啃筏者水域',kind:'battle',monster:'M01',risk:'普通战斗；空道会损伤外围筏格',reward:['C01','C03']},
 N06:{name:'胶膜水母群',kind:'battle',monster:'M02',risk:'仅热源进攻有效；空道损失生命和 SAN',reward:['C04','C07']},
 N07:{name:'绝壳蟹巢',kind:'battle',monster:'M03',risk:'仅能量进攻有效；空道生命 -2',reward:['C02','C05']},
 N08:{name:'暴雨涌潮',kind:'environment',risk:'淡水 ×1；完好集雨器额外 +2 进度',options:[{name:'收集雨水',cards:['C07'],rain:true}]},
 N09:{name:'共生漂岛',kind:'event',risk:'获得一种长期设施，安装另付 AP',options:[{name:'取得捕捞网',cards:['C20']},{name:'取得集雨器',cards:['C21']}]},
 N10:{name:'沉浮观测站',kind:'event',risk:'听潮筒或 SAN 休整（+15）',options:[{name:'取得听潮筒',cards:['C24']},{name:'休整，SAN +15',cards:[],sanity:15}]},
 N11:{name:'漩涡残骸',kind:'environment',risk:'随机外围 1 格轻损伤；材料或生存补给二选一，折叠锚可保护',options:[{name:'打捞材料：废铁、蓄电碎片、漂流木',cards:['C02','C05','C01'],penalty:true},{name:'打捞补给：废铁、蓄电碎片、淡水、干粮',cards:['C02','C05','C07','C08'],penalty:true}]},
 N12:{name:'冷雾漂流物',kind:'event',risk:'可保守拾取；驱雾需要火把和 1 AP，获丰厚补给',options:[{name:'保守拾取漂流木',cards:['C01']},{name:'消耗火把驱雾（1 AP）',cards:['C04','C08','C07'],costCard:'C13',cost:1}]},
};
// Balance v5 trial defaults; original rules and reasons are recorded in docs/design/first-layer-balance.md.
export const CONFIG = {
 version: 'first-layer-v4',
 initialHunger: 40,
 initialHydration: 40,
 lowRiskNodes: ['N01', 'N02', 'N03', 'N08', 'N10', 'N12'],
 facilityOpportunityVoyage: 2,
 facilityLastVoyage: 3,
 tacticalAttacks: {M01: 'T02', M02: 'T03', M03: 'T04'},
 voyages: 5,
 ap: 3,
 handLimit: 10,
 initialCards: ['C10', 'C11', 'C01', 'C04', 'C08', 'C07', 'C17'],
 supplies: ['C01', 'C02', 'C03', 'C04', 'C06', 'C07', 'C08', 'C09', 'C17', 'C18'],
 springWeights: {C01: 14, C02: 12, C03: 10, C04: 12, C05: 8, C06: 8, C07: 12, C08: 12, C09: 6, C17: 4, C18: 2},
 nodePool: Object.keys(NODES),
};
