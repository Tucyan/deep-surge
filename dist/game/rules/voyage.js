import {NODES,CARDS} from '../content/catalog.js?v=navigation-v4';
import {rng,uid,log,grant,requireRule,pay,consume,operational,advanceProduction,randomDamage,loseCell,harm} from './common.js?v=navigation-v4';
export function generateCandidates(state,count=2+rng(state,'nodes',2)){
 const eligible=state.config.nodePool.filter(id=>id!=='N07'||state.energyUnlocked).filter(id=>id!=='N06'||state.heatOpportunity);
 requireRule(eligible.length>=2,'节点池需要至少两种合格节点');
 const supplies=eligible.filter(id=>NODES[id].kind==='supply');
 const chosen=[];
 if(supplies.length)chosen.push(!state.toolboxClaimed&&supplies.includes('N04')?'N04':supplies[rng(state,'nodes',supplies.length)]);
 if(!chosen.length)chosen.push(eligible.filter(id=>NODES[id].kind!=='battle')[0]);
 requireRule(chosen[0],'节点池需要非战斗候选');
 while(chosen.length<Math.min(count,eligible.length)){const pool=eligible.filter(id=>!chosen.includes(id));chosen.push(pool[rng(state,'nodes',pool.length)]);}
 state.candidates=chosen.map(nodeId=>{
  const def=NODES[nodeId],candidate={id:uid(state,'node'),nodeId};
  if(nodeId==='N03'){candidate.offers=[];const pool=[...state.config.supplies,'C20','C21'];while(candidate.offers.length<3){const id=pool[rng(state,'rewards',pool.length)];if(!candidate.offers.includes(id))candidate.offers.push(id);}}
  if(def.monster){const count=nodeId==='N05'&&state.encounters.M01>0?1+rng(state,'nodes',2):1;const lanes=[0,1,2,3];candidate.enemies=Array.from({length:count},()=>({definitionId:def.monster,lane:lanes.splice(rng(state,'nodes',lanes.length),1)[0]}));}
  return candidate;
 });
 if(chosen.includes('N02'))state.heatOpportunity=true;
}
function springCard(state){const entries=Object.entries(state.config.springWeights);const total=entries.reduce((n,[,weight])=>n+weight,0);let roll=rng(state,'supply',total);for(const [id,weight] of entries){if(roll<weight)return id;roll-=weight;}throw new Error('无效涌泉卡池');}
export function beginVoyage(state){state.phase='VoyageNavigation';state.ap=state.config.ap;state.rerollUsed=false;state.revealed=false;state.node=null;state.battleTurn=null;state.enemies=[];state.guard=false;generateCandidates(state);state.supply={cards:Array.from({length:3},()=>springCard(state))};log(state,`第 ${state.voyageIndex}/${state.config.voyages} 次航行：选择目标节点并移动后，领取本轮涌泉。`);}
export function drawSpring(state){requireRule(state.phase==='VoyageSupply','本轮涌泉已抽取或当前不能抽牌');grant(state,state.supply.cards);state.supply=null;state.phase='VoyagePreparation';log(state,'从涌泉抽出三张随机卡，不消耗 AP。');}
export function chooseSupply(state,id){requireRule(state.phase==='BattleSupply','当前没有战术补给选择');requireRule(state.supply.choices.includes(id),'无效补给选项');grant(state,[id,...state.supply.fixed],true);state.supply=null;state.phase='BattleAction';}
export function finishNodeActions(state){state.phase='VoyageAction';if(state.ap===0)settleVoyage(state);else log(state,'节点结束：仍可使用剩余 AP；主动结束行动后结算与弃牌。');}
export function finishDiscard(state){requireRule(state.hand.length<=state.config.handLimit,'手牌仍然超限');if(state.afterDiscard==='battle'){state.battleTurn++;state.ap=state.config.ap;state.guardUsed=false;state.poleUsed=false;state.phase='BattleSupply';state.supply={choices:['T01','T02'],fixed:[]};}else if(state.voyageIndex>=state.config.voyages){state.phase='Completed';log(state,'第一层航行完成。灯火仍在，没有 Boss 战。');}else{state.voyageIndex++;beginVoyage(state);}}
export function discardPhase(state,scope){state.afterDiscard=scope;state.phase=scope==='battle'?'BattleDiscard':'VoyageDiscard';if(state.hand.length<=state.config.handLimit)finishDiscard(state);}
export function settleVoyage(state){
 state.hunger=Math.max(0,state.hunger-10);state.hydration=Math.max(0,state.hydration-10);
 const damage=Math.min(4,(state.hunger===0?2:0)+(state.hydration===0?3:0));harm(state,damage);
 log(state,`航行结算：饱食 -10，水分 -10${damage?`，生命 -${damage}`:''}。`);if(state.phase==='Failed')return;
 for(const cell of state.cells)if(cell.state==='damaged'&&state.voyageIndex-cell.damagedAtVoyage>=2)loseCell(state,cell);
 state.hand=state.hand.filter(card=>{if(card.definitionId==='C09'&&++card.age>=3){log(state,'一份鲜鱼腐坏，已移除。');return false;}return true;});
 for(const unit of state.units){if(unit.stored?.definitionId==='C09'&&++unit.stored.age>=3){unit.stored=null;log(state,'储存鲜鱼腐坏。');}advanceProduction(state,unit,1);}
 state.units=state.units.filter(u=>!u.temporary);state.hand=state.hand.filter(c=>!c.temporary);state.enemies=[];state.battleTurn=null;
 discardPhase(state,'voyage');
}
export function resolveNode(state,optionId){requireRule(state.phase==='NodeResolution','当前不在节点事件');const node=state.node;const def=NODES[node.nodeId];let options=def.options;
 if(node.nodeId==='N03')options=node.offers.map(id=>({name:CARDS[id].name,cards:[id]}));
 if(node.nodeId==='N04')options=[{name:state.toolboxClaimed?'取得废铁与蓄电碎片':'取得绝缘钳与能量材料',cards:state.toolboxClaimed?['C02','C05']:['C12','C05','C02']}];
 const option=options?.[Number(optionId)];requireRule(option&&String(Number(optionId))===String(optionId),'无效事件选项');
 if(option.costCard){const card=state.hand.find(c=>c.definitionId===option.costCard&&!c.temporary);requireRule(card,'缺少火把');pay(state,option.cost);consume(state,[card.id]);}
 if(option.penalty){if(node.protected)log(state,'折叠锚抵消了环境筏格损伤。');else randomDamage(state);}
 if(option.sanity)state.sanity=Math.min(100,state.sanity+option.sanity);
 if(option.rain)state.units.filter(u=>u.definitionId==='C21').forEach(u=>advanceProduction(state,u,2));
 grant(state,option.cards);if(node.nodeId==='N04')state.toolboxClaimed=true;
 log(state,`节点处理：${option.name}。`);finishNodeActions(state);
}
