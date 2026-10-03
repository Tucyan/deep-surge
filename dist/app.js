import {createSession} from './game/session.js?v=navigation-v4';
import {CARDS,RECIPES,NODES,MONSTERS,EQUIPMENT,MATERIAL_NAMES} from './game/content/catalog.js?v=navigation-v4';
import {cardArt,nodeArt,monsterArt} from './presentation/art.js';
import {syncDemo,setPointer,resizeScene,setSceneSettings,getSpringScreenPosition,getRaftSummary,pickTile} from './scene.js?v=navigation-v4';

const $=selector=>document.querySelector(selector);
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=null,view=null,selectedCandidate=null,armedAnchor=null,dialogMode=null,toastTimer;
let settings={motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,quality:'high'};
setSceneSettings(settings);
const phaseNames={VoyageNavigation:'选择下一节点',VoyageSupply:'涌泉抽牌',VoyageAction:'航行行动',VoyagePreparation:'航行准备',NodeResolution:'节点事件',BattleAction:'战斗行动',BattleSupply:'战术补给',BattleDiscard:'战斗轮末弃牌',VoyageDiscard:'航行轮末弃牌',Completed:'第一层完成',Failed:'航行失败'};
const materialText=id=>CARDS[id].materials.map(m=>MATERIAL_NAMES[m]).join(' / ');
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);}
function commandButton(label,command,{className='',disabled=false,title=''}={}){
 const preview=session?.preview(command);const blocked=disabled||!preview?.allowed;
 return `<button class="${className}" data-command="${encodeURIComponent(JSON.stringify(command))}" ${blocked?'disabled':''} title="${escape(title||(blocked?preview?.errors[0]?.message:''))}">${escape(label)}</button>`;
}
function dispatch(command){
 const result=session.dispatch({expectedRevision:view.revision,command});
 if(!result.accepted){toast(result.errors[0].message);return false;}
 view=session.getView();if(!view.candidates.some(c=>c.id===selectedCandidate))selectedCandidate=null;
 if(!view.hand.some(c=>c.id===armedAnchor))armedAnchor=null;
 render();if(command.type==='DrawSpring')animateSpringCards();if(dialogMode)renderDialog();return true;
}
function openDialog(mode){dialogMode=mode;renderDialog();if(!$('#dialog').open)$('#dialog').showModal();}
function closeDialog(){dialogMode=null;$('#dialog').close();}
function start(){const seed=Number($('#seed').value);session=createSession(Number.isFinite(seed)?seed>>>0:20261003);view=session.getView();selectedCandidate=null;armedAnchor=null;closeDialog();$('#start-screen').hidden=true;$('#end-screen').hidden=true;render();}
function stats(){const items=[['生命',view.health,30,'#d38462'],['饱食',view.hunger,100,'#d6ac62'],['水分',view.hydration,100,'#6fbacb'],['SAN',view.sanity,100,'#a297cb']];$('#stats').innerHTML=items.map(([name,n,max,color])=>`<div class="stat"><span>${name}</span><div class="bar"><i style="--color:${color};width:${n/max*100}%"></i></div><strong>${n}/${max}</strong></div>`).join('');}
function render(){
 stats();syncDemo(view);updateSpring();const raftSummary=getRaftSummary();$('.raft-label').innerHTML=`木筏 · ${raftSummary.total-raftSummary.lost} 格在位 / ${raftSummary.total} 格登记 <span>扩展 +${raftSummary.expanded} · 破损 ${raftSummary.damaged} · 脱落 ${raftSummary.lost} · 后方筏根仅装饰</span>`;$('#ap').innerHTML=`行动点 <b>${view.ap}/${view.config.ap}</b>`;
 $('#voyage').innerHTML=`第 ${view.voyageIndex} / ${view.config.voyages} 次航行 <small>${phaseNames[view.phase]} · 种子 ${view.seed}</small>`;
 $('#hand-count').textContent=`手牌 ${view.hand.length} / ${view.config.handLimit}`;
 const discard=view.phase.endsWith('Discard');$('#hand-tip').textContent=discard?`请弃置 ${view.hand.length-view.config.handLimit} 张：点击即弃牌`:'点击物资查看用途 · 工具保留，制作与使用分别付费';
 $('#hand').innerHTML=view.hand.map(card=>{const def=CARDS[card.definitionId],image=cardArt[card.definitionId]??cardArt[card.definitionId==='T01'?'C18':'C01'];return `<button class="card ${discard?'discard':''}" data-card="${card.id}" aria-label="${escape(def.name)}${discard?'，弃置':'，查看用途'}"><img src="${image}" alt="" loading="lazy"><span class="cost">${def.cost??'—'}</span>${card.temporary?'<span class="temp">本场临时</span>':''}<h3>${escape(def.name)}</h3><span class="desc">${escape(def.description)}</span><span class="material">${materialText(card.definitionId)}${card.definitionId==='C09'?` · 鲜度 ${3-card.age}轮`:''}</span></button>`;}).join('')||'<div class="empty-hand">手牌已空，谨慎使用基础指令与下一轮补给。</div>';
 renderPanel();renderBattle();
 const terminal=['Completed','Failed'].includes(view.phase);$('#end-screen').hidden=!terminal;
 if(terminal)$('#end-screen').innerHTML=`<div class="end-content"><div class="eyebrow">VOYAGE / ${view.phase==='Completed'?'SURVIVED':'LOST'}</div><h2>${view.phase==='Completed'?'第一层 · 航行完成':'灯火熄灭，航行终止'}</h2><p>${view.phase==='Completed'?'五次航行已完成，最后的生存结算与弃牌均已处理。':'生命归零。本次航行留下的经验，会成为下一次出发的准备。'}<br>生命 ${view.health}/30 · 饱食 ${view.hunger} · 水分 ${view.hydration} · SAN ${view.sanity}<br>完好筏格 ${view.cells.filter(c=>c.state==='intact').length} / ${view.cells.length} · 种子 ${view.seed}</p><button data-ui="restart" class="primary">重新航行</button><button data-ui="menu">返回开始界面</button><button data-ui="log">查看航海日志</button><p class="disclaimer">第一版 Demo · 本层不包含 Boss</p></div>`;
 $('#craft-button').disabled=!['VoyagePreparation','VoyageAction','BattleAction'].includes(view.phase);$('#raft-button').disabled=false;
}
function renderPanel(){
 let content=`<h2>${phaseNames[view.phase]}</h2>`;
 if(view.phase==='VoyageSupply'){content+='<p>涌泉每次航行凝聚三张随机卡。点击右侧涌泉抽取，不消耗 AP；每轮只能领取一次。</p>'+commandButton('从涌泉抽出三张牌',{type:'DrawSpring'},{className:'primary'})+'<p class="muted">物资与生存牌为主，少量进攻与防卫牌；可能重复。卡牌结果已固定。</p>';
 }else if(view.phase==='BattleSupply'){
  content+=`<p>${view.phase==='VoyageSupply'?'选择一张基本物资，另两张已固定的补给一起入手。':'第二回合起每回合选择一张临时战术牌，战后清除，不能制作永久物资。'}</p>`;
  content+=view.supply.choices.map(id=>commandButton(CARDS[id].name,{type:'ChooseSupply',definitionId:id},{className:'choice'})).join('');
  if(view.supply.fixed.length)content+=`<p>固定补给：${view.supply.fixed.map(id=>CARDS[id].name).join('、')}</p>`;
 }else if(view.phase==='VoyageNavigation'){
  content+=`<p>${view.voyageIndex===1?'选择出发节点，再确认移动。':'结算与弃牌已完成，请选择下一节点。'}</p>`;
  content+='<div class="panel-nodes" role="region" aria-label="下一批节点">'+view.candidates.map(node=>`<button class="destination ${selectedCandidate===node.id?'selected':''}" data-node="${node.id}" aria-label="选择航行候选：${escape(node.name)}" aria-pressed="${selectedCandidate===node.id}"><img src="${nodeArt[node.nodeId]}" alt=""><div><strong>${escape(node.name)}</strong><small>${escape(node.risk)}</small>${node.details!==null?`<small class="detail">详情：${escape(node.details||'无额外物资')}</small>`:''}</div></button>`).join('')+'</div>';
  const node=view.candidates.find(c=>c.id===selectedCandidate);
  if(armedAnchor)content+='<p>折叠锚已选择：移动时付 1 AP，抵消首次环境筏格损伤。</p>';
  content+=node?commandButton('移动至 '+node.name,{type:'SubmitVoyage',candidateId:node.id,protectionCardId:armedAnchor},{className:'primary navigation-move'}):'<button class="navigation-move" disabled>选择一个节点后移动</button>';
 }else if(view.phase==='VoyagePreparation'){
  content+=`<p>已到达：${NODES[view.node.nodeId].name}。可先饮水、进食、制作、安装或维修。</p>`;
  content+=commandButton('处理当前节点 · '+NODES[view.node.nodeId].name,{type:'EnterNode'},{className:'primary'});
  content+='<button data-ui="craft">查看确定配方</button><button data-ui="raft">查看设备与筏格</button><p class="muted">结束当前节点行动并完成轮末弃牌后，才能移动到下一节点。</p>';
 }else if(view.phase==='VoyageAction'){content+='<p>节点已处理。剩余 AP 可用于进食、饮水、合成、部署、维修和领取产物；超过十张也可继续行动。</p>'+commandButton('结束行动 · 结算与弃牌',{type:'EndVoyageAction'},{className:'primary'})+'<button data-ui="craft">查看确定配方</button><button data-ui="raft">管理设备</button>';
 }else if(view.phase==='NodeResolution'){
  const def=NODES[view.node.nodeId];content+=`<p>${def.name} · ${def.risk}</p>`;let options=def.options;
  if(view.node.nodeId==='N03')options=view.node.offers.map(id=>({name:'领取 '+CARDS[id].name}));
  if(view.node.nodeId==='N04')options=[{name:view.toolboxClaimed?'取得废铁与蓄电碎片':'取得绝缘钳、蓄电碎片与废铁'}];
  content+=options.map((option,i)=>commandButton(option.name,{type:'ResolveNodeOption',optionId:String(i)},{className:'choice'})).join('');
 }else if(view.phase==='BattleAction'){
  content+=`<p>第 ${view.battleTurn} 战斗回合 · 饥渴不在战斗回合扣减。<br>${view.battleTurn>=7?'深潮已到：每回合额外生命 -2。':`距离深潮 ${7-view.battleTurn} 回合。`}</p>`;
  content+=commandButton('结束战斗回合 · 设备先攻',{type:'EndBattleTurn'},{className:'primary'});
  content+=view.enemies.map(e=>commandButton(`长杆驱离 → ${MONSTERS[e.definitionId].name}（2 AP / 2伤害）`,{type:'PoleRepel',enemyId:e.id})).join('');
  content+=commandButton('紧急防护（1 AP）',{type:'EmergencyGuard'})+commandButton('撤退：生命 -4，无奖励',{type:'Retreat'});
  content+='<p class="muted">长杆每回合一次，只对无限制敌人有效；敌方意图见各航道。</p>';
 }else if(view.phase.endsWith('Discard'))content+='<p>手牌超限。点击下方卡牌弃置，达到 10 张后自动继续。此时不能使用物资、制作或移动。</p>'+(view.phase==='VoyageDiscard'?'<p>完成弃牌后，这里显示下一批节点；最后一轮则完成本层。</p>':'');
 else content+='<p>本局已结束。可查看日志或重新开始。</p>';
 $('#panel').innerHTML=content;$('#panel').classList.toggle('navigation-panel',view.phase==='VoyageNavigation');
}
function renderBattle(){
 if(!['BattleAction','BattleSupply','BattleDiscard'].includes(view.phase)){$('#battle').innerHTML='';return;}
 $('#battle').innerHTML=Array.from({length:4},(_,lane)=>{const enemy=view.enemies.find(e=>e.lane===lane),unit=view.units.find(u=>u.slotKind==='defense'&&u.slotIndex===lane);return `<div class="lane"><div class="lane-title">航道 ${lane+1}</div>${enemy?`<img src="${monsterArt[enemy.definitionId]}" alt="${MONSTERS[enemy.definitionId].name}"><b>${MONSTERS[enemy.definitionId].name}</b><div class="hp">生命 ${enemy.health}/${MONSTERS[enemy.definitionId].health}</div><div class="status">${enemy.wet?'浸湿 ':''}${enemy.bound?'束缚 ':''}${enemy.baited?'诱饵 ':''}</div><p>有效材料：${MONSTERS[enemy.definitionId].materials?.map(m=>MATERIAL_NAMES[m]).join(' / ')??'无限制'}<br>${MONSTERS[enemy.definitionId].intent}</p>`:'<div class="empty">海面暂时平静</div>'}<div class="unit">${unit?`${CARDS[unit.definitionId].name} · ${unit.structure===0?'残骸':unit.operational?`结构 ${unit.structure}`:'承载格破损，停用'}`:'防卫位空缺'}</div></div>`;}).join('');
}
function renderDialog(){const mode=dialogMode;if(!mode)return;let html='';
 if(mode.kind==='help')html=`<h2>航行指南</h2><p>目标：完成五次航行并活下来。本层没有 Boss。</p><ol><li>每轮从右侧涌泉随机抽三张牌，获得 3 AP；可进食、饮水、制作、安装和维修。</li><li>首次出发、或上一轮结算与弃牌检查完成后，在右侧菜单选择节点并移动；移动后领取本轮涌泉，准备好再处理当前节点。事件需要选择一次选项，战斗有独立 AP。</li><li>战斗时看清材料限制。火把对付水母，放电包对付绝壳蟹。每回合设备先攻击，之后敌人执行意图。</li><li>选择手牌查看可用目标；合成只消耗原料与制作 AP，工具保留。制作出的物资使用时仍需 AP。</li><li>每航行轮饱食、水分各 -10，归零会扣生命；战斗不重复扣饥渴。</li><li>破损筏格停用设备，两个后续航行轮未修就脱落；漂流木或修补包可修破损格，不能补建缺口。</li><li>行动点耗尽或主动结束行动后才开放弃牌；行动期间允许超过 10 张。节点奖励入手不立即弃牌，可使用剩余 AP。战斗第二回合起可撤退，代价是生命 -4 且无奖励。</li></ol><p>鼠标点击按钮操作；手牌横向滚动查看更多。暂无存档，刷新和重开会清除当前局。数值为首版试测。</p>`;
 else if(mode.kind==='settings')html=`<h2>视觉设置</h2><p>视觉设置不影响规则结算。</p><div class="buttons"><button data-ui="motion">随波动态：${settings.motion?'开启':'关闭'}</button><button data-ui="quality">画质：${settings.quality==='high'?'高':'低'}</button></div><a href="raft-assets.html" target="_blank" style="color:#dfc68e">查看独立木筏资产工坊</a><br><a href="raft-state.html" target="_blank" style="color:#dfc68e">查看木筏状态映射样例（含扩展/战损）</a>`;
 else if(mode.kind==='log')html=`<h2>航海日志 · 种子 ${view?.seed??'—'}</h2><div class="log-list">${view?.log.slice().reverse().map(line=>`<p>${escape(line)}</p>`).join('')??'<p>还未开始航行。</p>'}</div>`;
 else if(mode.kind==='craft')html='<h2>确定合成 · 制作与使用分别收费</h2><p>自动选取最早入手的匹配原料；工具保留，临时战术牌不可制作永久物资。</p>'+Object.entries(RECIPES).map(([id,r])=>`<div class="recipe"><div><strong>${id} · ${CARDS[r.output].name}</strong><p>工具：${CARDS[r.tool].name}<br>消耗：${r.ingredients.map(c=>CARDS[c].name).join(' + ')}<br>制作 ${r.cost} AP · 后续使用 ${CARDS[r.output].cost} AP</p></div>${commandButton('制作 '+CARDS[r.output].name,{type:'Craft',recipeId:id})}</div>`).join('');
 else if(mode.kind==='raft'){
  html='<h2>木筏 · 承载格与设备</h2><p>橙色为破损，虚线为脱落。防卫位绑定前排四格，后勤位绑定左右中排格。初始 12 格为本版布局试测；三维格子按当前状态逐格显示内容，后方帐篷、灯、箱子和渔网属于独立装饰根区。</p><div class="cell-grid">'+view.cells.map(c=>`<button class="${c.state}" data-cell-info="${c.id}">${c.label} · ${c.state==='intact'?'完好':c.state==='lost'?'脱落':`破损 / ${Math.max(0,2-Math.max(0,view.voyageIndex-1-c.damagedAtVoyage))}轮`}</button>`).join('')+'</div>';
  html+=view.units.map(u=>{const scrap=view.hand.find(c=>c.definitionId==='C02'&&!c.temporary);let controls='';if(u.structure===0){controls=commandButton('重建 2 AP + 废铁',{type:'RebuildWreck',unitId:u.id,scrapCardId:scrap?.id})+commandButton('拆除 1 AP',{type:'DismantleWreck',unitId:u.id});}else{if(u.stored)controls+=commandButton('免费领取 '+CARDS[u.stored.definitionId].name,{type:'CollectProduction',unitId:u.id});if(u.slotKind==='defense')for(const destination of [u.slotIndex-1,u.slotIndex+1])if(destination>=0&&destination<4){const occupied=view.units.some(n=>n.slotKind==='defense'&&n.slotIndex===destination);controls+=commandButton(`${occupied?'交换':'移动'}至航道 ${destination+1}`,{type:occupied?'SwapDefense':'MoveDefense',unitId:u.id,destination});}}
   return `<div class="unit-row">${CARDS[u.definitionId].name} · ${u.slotKind==='defense'?'防卫':'后勤'} ${u.slotIndex+1} · 结构 ${u.structure}/${EQUIPMENT[u.definitionId].structure} · ${u.structure===0?'残骸':u.operational?'工作中':'停用'}${EQUIPMENT[u.definitionId].threshold?` · 生产进度 ${u.progress}/${EQUIPMENT[u.definitionId].threshold}`:''}<div>${controls}</div></div>`;}).join('')||'<p>尚无部署设备。</p>';
 }else if(mode.kind==='card')html=cardDialog(mode.cardId);
 else if(mode.kind==='confirm')html=`<h2>材料不匹配</h2><p class="warning">这个进攻对目标没有效果。确认仍会消耗物资与 AP，不改变敌人的生命或状态。</p>${commandButton('确认无效使用（仍消耗牌与 AP）',{...mode.command,allowIneffective:true},{className:'primary'})}`;
 $('#dialog-body').innerHTML=html;
}
function cardDialog(cardId){const card=view.hand.find(c=>c.id===cardId);if(!card){dialogMode=null;$('#dialog').close();return '';}
 const id=card.definitionId,def=CARDS[id];let html=`<h2>${def.name}</h2><p>${def.description}<br>材料：${materialText(id)} · 使用 AP：${def.cost??'仅用于制作'}</p><div class="buttons">`;
 const cmd=target=>({type:'PlayCard',cardId,target});
 if(['C07','C08','C09','C16'].includes(id))html+=commandButton(id==='C16'?'滤水，获得淡水':id==='C07'?'饮用淡水':'进食',cmd({kind:'self'}));
 if(['C01','C15'].includes(id)){
  const damaged=view.cells.filter(c=>c.state==='damaged');html+=damaged.length?damaged.map(c=>commandButton('修补筏格 '+c.label,cmd({kind:'raftCells',cellIds:[c.id]}))).join(''):'<p>没有破损筏格，保留物资用于之后维修或制作。</p>';
  if(id==='C15'&&damaged.length>=2)html+='</div><p>可选择最多两个破损格：</p><div class="buttons">'+damaged.map(c=>`<label><input type="checkbox" name="repair-cell" value="${c.id}"> ${c.label}</label>`).join('')+`<button data-repair="${cardId}">修补所选格（最多2格 / 1AP）</button>`;
 }
 if(id==='C02')html+=view.units.map(u=>commandButton('维修 '+CARDS[u.definitionId].name+' · '+(u.slotIndex+1),cmd({kind:'unit',unitId:u.id}))).join('')||'<p>尚无可维修设备。</p>';
 if(EQUIPMENT[id])html+=view[EQUIPMENT[id].slot].map(slot=>commandButton(`部署到${EQUIPMENT[id].slot==='defense'?'防卫位':'后勤位'} ${slot.index+1}`,cmd(EQUIPMENT[id].slot==='defense'?{kind:'defenseSlot',lane:slot.index}:{kind:'logisticsSlot',index:slot.index}))).join('');
 if(['C03','C06','C09','C13','C14','C17','T02'].includes(id)&&view.phase==='BattleAction')html+=view.enemies.map(e=>{
  const command=cmd({kind:'enemy',enemyId:e.id}),preview=session.preview(command),mismatch=preview.errors?.some(err=>err.message.startsWith('材料不匹配'));
  return mismatch?`<button data-ineffective="${encodeURIComponent(JSON.stringify(command))}">航道 ${e.lane+1} · ${MONSTERS[e.definitionId].name}（材料不匹配）</button>`:commandButton(`航道 ${e.lane+1} · ${MONSTERS[e.definitionId].name}`,command);
 }).join('');
 if(['C22','C24'].includes(id))html+=commandButton(id==='C22'?'重掷本轮全部候选':'揭示本轮候选详情',cmd({kind:'candidates'}));
 if(id==='C23')html+=`<button data-anchor="${cardId}" ${view.phase!=='VoyageNavigation'?'disabled':''}>${armedAnchor===cardId?'取消':'选择'}移动时下锚（1 AP）</button>`;
 if(def.cost===null)html+='<p>此卡提供工具条件或制作原料。到合成界面查看可用配方。</p><button data-ui="craft">查看配方</button>';
 return html+'</div><p class="disclaimer">不可用操作变灰，悬停可查看原因。导航工具在节点选择阶段使用；其他物资在准备、航行行动或战斗行动阶段使用。</p>';
}

document.addEventListener('click',event=>{
 if(event.target.tagName==='CANVAS'&&view){const cell=pickTile(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);if(cell){const unit=view.units.find(u=>u.cellId===cell.id);toast(`筏格 ${cell.x+1}-${cell.z+1}：${unit?CARDS[unit.definitionId].name:'空格'}，${view.cells.find(c=>c.id===cell.id)?.state==='damaged'?'破损':'完好'}`);}return;}
 const button=event.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.command){const command=JSON.parse(decodeURIComponent(button.dataset.command));if(dispatch(command)&&dialogMode?.kind==='confirm')closeDialog();return;}
 if(button.dataset.card){if(view.phase.endsWith('Discard'))dispatch({type:'DiscardCards',cardIds:[button.dataset.card]});else openDialog({kind:'card',cardId:button.dataset.card});return;}
 if(button.dataset.node){selectedCandidate=button.dataset.node;render();return;}
 if(button.dataset.ineffective){openDialog({kind:'confirm',command:JSON.parse(decodeURIComponent(button.dataset.ineffective))});return;}
 if(button.dataset.anchor){armedAnchor=armedAnchor===button.dataset.anchor?null:button.dataset.anchor;closeDialog();render();return;}
 if(button.dataset.repair){const ids=[...document.querySelectorAll('[name=repair-cell]:checked')].map(el=>el.value);dispatch({type:'PlayCard',cardId:button.dataset.repair,target:{kind:'raftCells',cellIds:ids}});return;}
 if(button.dataset.cellInfo){const c=view.cells.find(c=>c.id===button.dataset.cellInfo);toast(`筏格 ${c.label}：${c.state==='intact'?'完好':c.state==='lost'?'已脱落，当前不能补建':'破损，需漂流木或修补包修复'}`);return;}
 const ui=button.dataset.ui;if(!ui)return;
 if(ui==='restart'){start();return;}if(ui==='menu'){closeDialog();$('#end-screen').hidden=true;$('#start-screen').hidden=false;return;}
 if(ui==='motion'){settings.motion=!settings.motion;setSceneSettings(settings);renderDialog();return;}
 if(ui==='quality'){settings.quality=settings.quality==='high'?'low':'high';setSceneSettings(settings);renderDialog();return;}
 openDialog({kind:ui});
});
$('#spring-button').addEventListener('click',()=>{if(view?.phase==='VoyageSupply')dispatch({type:'DrawSpring'});});
$('#start-button').addEventListener('click',start);$('#start-help').addEventListener('click',()=>openDialog({kind:'help'}));$('#close-dialog').addEventListener('click',closeDialog);$('#dialog').addEventListener('cancel',()=>dialogMode=null);
for(const [id,kind] of [['craft-button','craft'],['raft-button','raft'],['log-button','log'],['help-button','help'],['settings-button','settings']])$('#'+id).addEventListener('click',()=>{if(session||['help','settings','log'].includes(kind))openDialog({kind});});
function animateSpringCards(){if(!settings.motion)return;const point=getSpringScreenPosition();view.hand.slice(-3).forEach((card,i)=>{const element=document.createElement('img');element.className='spring-emergence';element.alt='';element.src=cardArt[card.definitionId];element.style.left=point.x+'px';element.style.top=point.y+'px';element.style.setProperty('--travel-x',(Math.min(innerWidth-90,150+i*145)-point.x)+'px');element.style.setProperty('--travel-y',(innerHeight-140-point.y)+'px');element.style.animationDelay=(i*100)+'ms';$('#game').appendChild(element);setTimeout(()=>element.remove(),1300+i*100);});}
function updateSpring(){const button=$('#spring-button');const point=getSpringScreenPosition();button.style.left=point.x+'px';button.style.top=point.y+'px';button.hidden=!view||view.phase!=='VoyageSupply';}
function resize(){resizeScene(innerWidth,innerHeight);updateSpring();}addEventListener('resize',resize);resize();
addEventListener('pointermove',event=>setPointer(event.clientX/innerWidth-.5,event.clientY/innerHeight-.5));
