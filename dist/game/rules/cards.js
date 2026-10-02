import {CARDS,RECIPES,EQUIPMENT,MONSTERS} from '../content/catalog.js';
import {requireRule,actionable,pay,consume,grant,log,uid,operational,unlock} from './common.js';
import {matches,hitEnemy,checkVictory} from './battle.js';
import {generateCandidates} from './voyage.js';
export function craft(state,command){actionable(state);const recipe=RECIPES[command.recipeId];requireRule(recipe,'未知配方');const tool=state.hand.find(c=>c.definitionId===recipe.tool&&!c.temporary);requireRule(tool,`缺少 ${CARDS[recipe.tool].name}`);
 let ingredients;if(command.ingredientCardIds){requireRule(new Set(command.ingredientCardIds).size===command.ingredientCardIds.length,'原料不能重复');ingredients=command.ingredientCardIds.map(id=>state.hand.find(c=>c.id===id));requireRule(ingredients.every(Boolean),'原料不存在');requireRule(ingredients.map(c=>c.definitionId).sort().join()===recipe.ingredients.slice().sort().join(),'原料不符合配方');}else ingredients=recipe.ingredients.map(id=>state.hand.find(c=>c.definitionId===id&&!c.temporary));
 requireRule(ingredients.every(c=>c&&!c.temporary),'缺少永久原料；战术牌不能制作物资');pay(state,recipe.cost);consume(state,ingredients.map(c=>c.id));grant(state,[recipe.output]);log(state,`制作 ${CARDS[recipe.output].name}：${recipe.cost} AP；工具保留。`);
}
function selectedCells(state,command){const ids=command.target?.cellIds??command.cellIds??[];requireRule(ids.length>0&&new Set(ids).size===ids.length,'请选择不同筏格');const cells=ids.map(id=>state.cells.find(c=>c.id===id));requireRule(cells.every(c=>c?.state==='damaged'),'只能修补破损格，不能修补完好或脱落格');return cells;}
export function play(state,command){actionable(state);const card=state.hand.find(c=>c.id===command.cardId);requireRule(card,'物资不存在');const def=CARDS[card.definitionId];requireRule(def.cost!==null,'此卡仅用于制作');const id=card.definitionId;const target=command.target??{kind:'self'};
 if(['C01','C15'].includes(id)){const cells=selectedCells(state,command);requireRule(cells.length<=(id==='C01'?1:2),'修补目标太多');pay(state,def.cost);for(const cell of cells){cell.state='intact';cell.damagedAtVoyage=null;log(state,`修好筏格 ${cell.label}，设备可恢复工作。`);}}
 else if(id==='C02'){const unit=state.units.find(u=>u.id===target.unitId);requireRule(unit&&unit.structure>0&&operational(state,unit),'请选择完好格上的非残骸设备');requireRule(unit.structure<EQUIPMENT[unit.definitionId].structure,'设备已满结构');pay(state,1);unit.structure=Math.min(EQUIPMENT[unit.definitionId].structure,unit.structure+3);}
 else if(EQUIPMENT[id]){const equipment=EQUIPMENT[id];const index=target.lane??target.index;requireRule(target.kind===(equipment.slot==='defense'?'defenseSlot':'logisticsSlot'),'设备位置类型不匹配');const slots=state[equipment.slot];const slot=slots.find(s=>s.index===index);requireRule(slot,'槽位不存在');requireRule(state.cells.find(c=>c.id===slot.cellId)?.state==='intact','承载格破损或脱落，不能部署');requireRule(!state.units.some(u=>u.slotKind===equipment.slot&&u.slotIndex===index),'位置已被设备或残骸占用');pay(state,def.cost);state.units.push({id:uid(state,'unit'),definitionId:id,slotKind:equipment.slot,slotIndex:index,cellId:slot.cellId,structure:equipment.structure,temporary:!!equipment.temporary,progress:0,stored:null});}
 else if(['C07','C08','C09'].includes(id)&&target.kind==='self'){pay(state,1);if(id==='C07')state.hydration=Math.min(100,state.hydration+24);else state.hunger=Math.min(100,state.hunger+(id==='C09'?18:24));}
 else if(id==='C16'){pay(state,1);grant(state,['C07']);}
 else if(id==='C22'){requireRule(state.phase==='VoyagePreparation','逆流桨只能在航行准备使用');requireRule(!state.rerollUsed,'本航行轮已经重掷');pay(state,1);state.rerollUsed=true;generateCandidates(state,state.candidates.length);}
 else if(id==='C24'){requireRule(state.phase==='VoyagePreparation','听潮筒只能在航行准备使用');requireRule(!state.revealed,'候选详情已揭示');pay(state,1);state.revealed=true;}
 else if(['C03','C06','C09','C13','C14','C17','T02'].includes(id)){
  requireRule(state.phase==='BattleAction','进攻用途只能在战斗中使用');const enemy=state.enemies.find(e=>e.id===target.enemyId);requireRule(enemy,'请选择敌人');
  if(id==='C09')requireRule(MONSTERS[enemy.definitionId].predator,'此敌人不是捕食者');
  if(id==='C03')requireRule(enemy.lastBound<state.battleTurn-1,'不能在同一回合或连续回合束缚此敌人');
  const effective=matches(def.materials,enemy);requireRule(effective||command.allowIneffective,'材料不匹配：确认无效使用才会消耗');pay(state,def.cost);
  if(effective){if(id==='C03'){enemy.bound=true;enemy.lastBound=state.battleTurn;}else if(id==='C06')enemy.wet=true;else if(id==='C09')enemy.baited=true;else{let damage=id==='C14'?4:id==='T02'?2:3;if(id==='C14'&&enemy.wet){damage++;enemy.wet=false;}if(id==='C17'&&enemy.bound){damage+=2;enemy.bound=false;}hitEnemy(state,enemy,damage);}}
  else log(state,`${def.name} 材料不匹配，对敌无效，但正常消耗。`);
 }else throw new Error('折叠锚请在提交航行时选择；该用途当前不可用');
 consume(state,[card.id]);log(state,`使用 ${def.name}，消耗 ${def.cost} AP。`);unlock(state);checkVictory(state);
}
export function unitCommand(state,command){actionable(state);const unit=state.units.find(u=>u.id===command.unitId);requireRule(unit,'设备不存在');
 if(command.type==='CollectProduction'){requireRule(operational(state,unit)&&unit.stored,'设备停用或没有产物');state.hand.push(unit.stored);unit.stored=null;unlock(state);log(state,'免费领取产物。');return;}
 if(command.type==='DismantleWreck'){requireRule(unit.structure===0,'只能拆除残骸');pay(state,1);state.units=state.units.filter(u=>u.id!==unit.id);return;}
 if(command.type==='RebuildWreck'){requireRule(unit.structure===0&&state.cells.find(c=>c.id===unit.cellId)?.state==='intact','需完好承载格上的残骸');const scrap=state.hand.find(c=>c.id===command.scrapCardId&&c.definitionId==='C02'&&!c.temporary);requireRule(scrap,'重建需要一张永久废铁');pay(state,2);consume(state,[scrap.id]);unit.structure=EQUIPMENT[unit.definitionId].structure;unit.progress=0;unit.stored=null;return;}
 requireRule(unit.slotKind==='defense','只能移动防卫设备');
 const destination=command.destination;requireRule(Number.isInteger(destination)&&Math.abs(destination-unit.slotIndex)===1,'只能操作相邻航道');const slot=state.defense.find(s=>s.index===destination);requireRule(slot&&state.cells.find(c=>c.id===slot.cellId)?.state==='intact','目标承载格不可用');
 const other=state.units.find(u=>u.slotKind==='defense'&&u.slotIndex===destination);
 if(command.type==='MoveDefense'){requireRule(!other,'目标航道已占用');pay(state,1);}else{requireRule(command.type==='SwapDefense'&&other,'相邻槽没有可交换单位');requireRule(state.cells.find(c=>c.id===unit.cellId)?.state==='intact','源承载格不可用于交换');pay(state,2);other.slotIndex=unit.slotIndex;other.cellId=unit.cellId;}
 unit.slotIndex=destination;unit.cellId=slot.cellId;
}
