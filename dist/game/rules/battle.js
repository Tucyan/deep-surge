import {CARDS,EQUIPMENT,MONSTERS,NODES} from '../content/catalog.js?v=balance-v5';
import {uid,log,grant,requireRule,pay,operational,harm,randomDamage} from './common.js?v=balance-v5';
import {finishNodeActions,discardPhase} from './voyage.js?v=balance-v5';
export function matches(materials,enemy){const accepted=MONSTERS[enemy.definitionId].materials;return !accepted||materials.some(m=>accepted.includes(m));}
export function beginBattle(state){state.phase='BattleAction';state.ap=state.config.ap;state.battleTurn=1;state.guardUsed=false;state.poleUsed=false;state.guard=false;state.enemies=state.node.enemies.map(e=>({...e,id:uid(state,'enemy'),health:MONSTERS[e.definitionId].health,wet:false,bound:false,baited:false,lastBound:-2}));for(const e of state.enemies)state.encounters[e.definitionId]++;log(state,'战斗开始：首回合没有战术补给，AP 刷新为 3。');}
export function finishBattle(state,victory){state.units=state.units.filter(u=>!u.temporary);state.hand=state.hand.filter(c=>!c.temporary);state.enemies=[];state.guard=false;if(victory){log(state,'战斗胜利，领取节点奖励。');grant(state,NODES[state.node.nodeId].reward);}else log(state,'撤退，无节点奖励。');finishNodeActions(state);}
export function checkVictory(state){if(state.phase==='BattleAction'&&state.enemies.length===0){finishBattle(state,true);return true;}return false;}
export function hitEnemy(state,enemy,damage){enemy.health-=damage;log(state,`${MONSTERS[enemy.definitionId].name} 受到 ${damage} 伤害。`);if(enemy.health<=0)state.enemies=state.enemies.filter(e=>e.id!==enemy.id);}
export function endBattleTurn(state){requireRule(state.phase==='BattleAction','当前不在战斗行动');
 for(let lane=0;lane<4;lane++){const unit=state.units.find(u=>u.slotKind==='defense'&&u.slotIndex===lane);const enemy=state.enemies.find(e=>e.lane===lane);if(unit&&enemy&&operational(state,unit)&&EQUIPMENT[unit.definitionId].attack){if(matches(CARDS[unit.definitionId].materials,enemy))hitEnemy(state,enemy,EQUIPMENT[unit.definitionId].attack);else log(state,'轻弩材料不匹配，自动攻击无效。');if(checkVictory(state))return;}}
 for(const enemy of [...state.enemies].sort((a,b)=>a.lane-b.lane)){
  const def=MONSTERS[enemy.definitionId];if(enemy.bound){enemy.bound=false;log(state,`${def.name} 被束缚，取消一次攻击。`);continue;}if(enemy.baited){enemy.baited=false;log(state,`${def.name} 被诱饵吸引，取消一次攻击。`);continue;}
  const unit=state.units.find(u=>u.slotKind==='defense'&&u.slotIndex===enemy.lane&&operational(state,u));
  if (unit) {
   unit.structure = Math.max(0, unit.structure - def.attack);
   const destroyed = unit.structure === 0;
   const suffix = destroyed ? (unit.temporary ? '，临时防卫已移除' : '，留下残骸') : '';
   log(state, `${CARDS[unit.definitionId].name} 结构 -${def.attack}${suffix}。`);
   if (destroyed && unit.temporary) state.units = state.units.filter(u => u.id !== unit.id);
  }
  else if(enemy.definitionId==='M01')randomDamage(state);else harm(state,enemy.definitionId==='M02'?1:2,enemy.definitionId==='M02'?1:0,true);
  if(state.phase==='Failed')return;
 }
 if(state.battleTurn>=7){harm(state,2);log(state,'深潮：生命 -2。');if(state.phase==='Failed')return;}
 discardPhase(state,'battle');
}
export function battleCommand(state,command){requireRule(state.phase==='BattleAction','当前不在战斗行动');
 if(command.type==='EndBattleTurn')return endBattleTurn(state);
 if(command.type==='Retreat'){requireRule(state.battleTurn>=2,'第二战斗回合起才能撤退');harm(state,4);if(state.phase!=='Failed')finishBattle(state,false);return;}
 if(command.type==='EmergencyGuard'){requireRule(!state.guardUsed&&!state.guard,'本回合已防护或已有防护待生效');pay(state,1);state.guardUsed=true;state.guard=true;log(state,'紧急防护：下一次普通生命伤害减 2，不保护 SAN、筏格或深潮。');return;}
 if(command.type==='PoleRepel'){requireRule(!state.poleUsed,'本回合已使用长杆');const enemy=state.enemies.find(e=>e.id===command.enemyId);requireRule(enemy&&!MONSTERS[enemy.definitionId].materials,'长杆只可攻击没有材料限制的敌人');pay(state,2);state.poleUsed=true;hitEnemy(state,enemy,2);checkVictory(state);return;}
 throw new Error('未知战斗命令');
}
