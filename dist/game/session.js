import {CONFIG,CARDS,NODES,MONSTERS} from './content/catalog.js?v=balance-v5';
import {copy,requireRule,grant,uid,log,consume,pay,operational} from './rules/common.js?v=balance-v5';
import {beginVoyage,chooseSupply,resolveNode,finishDiscard,drawSpring,finishNodeActions,settleVoyage} from './rules/voyage.js?v=balance-v5';
import {beginBattle,battleCommand,endBattleTurn} from './rules/battle.js?v=balance-v5';
import {craft,play,unitCommand} from './rules/cards.js?v=balance-v5';

function invariant(state){requireRule(state.health>=0&&state.health<=30,'生命不变量');requireRule(state.ap>=0&&state.ap<=state.config.ap,'AP 不变量');const entities=[...state.hand,...state.units,...state.units.filter(u=>u.stored).map(u=>u.stored),...state.enemies];requireRule(new Set(entities.map(e=>e.id)).size===entities.length,'重复实体 ID');for(const c of state.hand)requireRule(CARDS[c.definitionId],'未知卡定义');requireRule(new Set(state.units.map(u=>u.slotKind+u.slotIndex)).size===state.units.length,'重复设备槽位');for(const u of state.units)requireRule(state.cells.some(c=>c.id===u.cellId&&c.state!=='lost'),'设备承载格不存在');}
function execute(state,command){requireRule(!['Completed','Failed'].includes(state.phase),'本局已结束');const type=command.type;
 if(type==='DrawSpring')drawSpring(state);
 else if(type==='EndVoyageAction'){requireRule(state.phase==='VoyageAction','节点结束后才能结束航行行动');settleVoyage(state);}
 else if(type==='ChooseSupply')chooseSupply(state,command.definitionId);
 else if(type==='Craft')craft(state,command);
 else if(type==='PlayCard')play(state,command);
 else if(type==='SubmitVoyage'){
  requireRule(state.phase==='VoyageNavigation','只能在轮末弃牌检查通过后选择下一节点');const node=state.candidates.find(c=>c.id===command.candidateId);requireRule(node,'候选已失效');
  const protection=command.protectionCardId?state.hand.find(c=>c.id===command.protectionCardId&&c.definitionId==='C23'):null;
  if(command.protectionCardId){requireRule(protection,'折叠锚不存在');pay(state,1);consume(state,[protection.id]);}
  state.node={...node,protected:!!protection};state.candidates=[];log(state,`驶向 ${NODES[node.nodeId].name}${protection?'，已下锚保护':''}。`);
  state.phase='VoyageSupply';
 }else if(type==='EnterNode'){
  requireRule(state.phase==='VoyagePreparation'&&state.node,'当前没有已到达的节点');
  if(NODES[state.node.nodeId].kind==='battle')beginBattle(state);else state.phase='NodeResolution';
 }else if(type==='ResolveNodeOption')resolveNode(state,command.optionId);
 else if(['EndBattleTurn','Retreat','PoleRepel','EmergencyGuard'].includes(type))battleCommand(state,command);
 else if(['CollectProduction','DismantleWreck','RebuildWreck','MoveDefense','SwapDefense'].includes(type))unitCommand(state,command);
 else if(type==='DiscardCards'){
  requireRule(['VoyageDiscard','BattleDiscard'].includes(state.phase),'只在轮末弃牌');const ids=command.cardIds;requireRule(Array.isArray(ids)&&ids.length>0&&new Set(ids).size===ids.length,'弃牌输入重复或为空');requireRule(ids.length<=state.hand.length-state.config.handLimit,'只能弃到手牌上限');requireRule(ids.every(id=>state.hand.some(c=>c.id===id)),'弃牌不存在');consume(state,ids);log(state,`弃置 ${ids.length} 张牌。`);if(state.hand.length<=state.config.handLimit)finishDiscard(state);
 }else if(type==='FinishDiscard'){requireRule(['VoyageDiscard','BattleDiscard'].includes(state.phase),'当前不在弃牌阶段');finishDiscard(state);}
 else throw new Error('未知命令');
 if(state.ap===0&&state.phase==='VoyageAction')settleVoyage(state);
 else if(state.ap===0&&state.phase==='BattleAction')endBattleTurn(state);
 invariant(state);
}
function candidateDetails(state,c){
 const def=NODES[c.nodeId];
 if(def.monster)return `${c.enemies.length} 只${MONSTERS[def.monster].name}；航道 ${c.enemies.map(e=>e.lane+1).join('、')}；胜利得 ${def.reward.map(id=>CARDS[id].name).join('、')}`;
 if(c.nodeId==='N03')return '三选一：'+c.offers.map(id=>CARDS[id].name).join(' / ');
 if(c.nodeId==='N04')return state.toolboxClaimed?'废铁 + 蓄电碎片':'绝缘钳 + 蓄电碎片 + 废铁';
 return def.options.map(o=>`${o.name} → ${o.cards.length?o.cards.map(id=>CARDS[id].name).join(' + '):'无物资奖励'}${o.sanity?`，SAN +${o.sanity}`:''}${o.costCard?`；消耗${CARDS[o.costCard].name}，${o.cost} AP`:''}`).join('；或 ');
}
function responseGap(state,c){
 if(!['N06','N07'].includes(c.nodeId))return '';
 const attack=c.nodeId==='N06'?'C13':'C14',recipe=c.nodeId==='N06'?'R01':'R02';
 if(state.hand.some(card=>card.definitionId===attack))return '已有'+CARDS[attack].name;
 const result=sessionProbeCraft(state,recipe);
 return result?'具备制作'+CARDS[attack].name+'的工具和材料':'应对缺口：缺少'+CARDS[attack].name+'或其制作条件';
}
function sessionProbeCraft(state,recipeId){try{const draft=copy(state);draft.phase='VoyagePreparation';draft.ap=3;craft(draft,{type:'Craft',recipeId});return true;}catch{return false;}}
function session(initial){let state=initial;
 const preview=command=>{const draft=copy(state);try{execute(draft,command);return {allowed:true,apCost:Math.max(0,state.ap-draft.ap),errors:[]};}catch(error){return {allowed:false,apCost:0,errors:[{message:error.message}]};}};
 return {getSnapshot:()=>copy(state),getView:()=>{
  const view=copy(state);delete view.random;delete view.nextId;if(view.supply?.cards)view.supply={count:3};
  view.candidates=view.candidates.map(c=>({id:c.id,nodeId:c.nodeId,name:NODES[c.nodeId].name,risk:(c.nodeId==='N04'&&state.toolboxClaimed?'后续工具箱：只给废铁与蓄电碎片':NODES[c.nodeId].risk)+(responseGap(state,c)?'；'+responseGap(state,c):''),kind:NODES[c.nodeId].kind,details:state.revealed?candidateDetails(state,c):null}));
  view.units=view.units.map(u=>({...u,operational:operational(state,u)}));return view;
 },preview,
 dispatch({expectedRevision,command}){if(expectedRevision!==state.revision)return {accepted:false,errors:[{message:'状态已更新，请重新操作'}]};const draft=copy(state);const oldLength=state.log.length;try{execute(draft,command);draft.revision=state.revision+1;state=draft;return {accepted:true,state:copy(state),events:state.log.slice(oldLength).map((message,sequence)=>({type:'Log',sequence,revision:state.revision,message}))};}catch(error){return {accepted:false,errors:[{message:error.message}]};}},
 exportSave:()=>({formatVersion:1,contentVersion:CONFIG.version,state:copy(state)}),
 };
}
export function createSession(seed=20261003,overrides={}){const config={...copy(CONFIG),...copy(overrides)};requireRule(config.supplies.length>0,'补给池不能为空');if(overrides.supplies&&!overrides.springWeights)config.springWeights=Object.fromEntries(config.supplies.map(id=>[id,1]));requireRule(Object.entries(config.springWeights).length>0&&Object.entries(config.springWeights).every(([id,w])=>CARDS[id]&&Number.isInteger(w)&&w>0),'涌泉权重必须为正整数且卡牌存在');const state={schemaVersion:1,randomAlgorithm:'lcg32-v1',revision:0,nextId:0,seed:seed>>>0,config,random:Object.fromEntries(['nodes','rewards','supply','tactical','raftDamage'].map((key,i)=>[key,((seed>>>0)^Math.imul(i+1,2654435761))>>>0])),health:30,hunger:config.initialHunger,hydration:config.initialHydration,sanity:80,ap:3,voyageIndex:1,hand:[],units:[],cells:[],defense:[],logistics:[],enemies:[],candidates:[],log:[],encounters:{M01:0,M02:0,M03:0},energyUnlocked:false,heatOpportunity:true,toolboxClaimed:false};
 for(let z=0;z<3;z++)for(let x=0;x<4;x++)state.cells.push({id:`cell-${x}-${z}`,label:`${x+1}-${z+1}`,x,z,state:'intact',damagedAtVoyage:null});
 state.defense=Array.from({length:4},(_,index)=>({index,cellId:`cell-${index}-2`}));state.logistics=[{index:0,cellId:'cell-0-1'},{index:1,cellId:'cell-3-1'}];
 grant(state,config.initialCards);beginVoyage(state);invariant(state);return session(state);
}
export function restoreSession(save){requireRule(save?.formatVersion===1&&save.contentVersion===CONFIG.version,'不支持的存档版本');const state=copy(save.state);requireRule(state.schemaVersion===1&&state.randomAlgorithm==='lcg32-v1','不支持的状态或随机算法版本');invariant(state);return session(state);}
