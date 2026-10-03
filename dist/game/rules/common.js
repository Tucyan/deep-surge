import {CARDS,EQUIPMENT} from '../content/catalog.js?v=balance-v5';
export const copy=value=>structuredClone(value);
export const requireRule=(condition,message)=>{if(!condition)throw new Error(message);};
export function rng(state,stream,max){const value=(Math.imul(state.random[stream],1664525)+1013904223)>>>0;state.random[stream]=value;return Math.floor(value/4294967296*max);}
export const uid=(state,prefix)=>`${prefix}-${++state.nextId}`;
export function log(state,message){state.log.push(message);if(state.log.length>150)state.log.shift();}
export function grant(state,definitions,temporary=false){for(const definitionId of definitions){requireRule(CARDS[definitionId],'未知物资');state.hand.push({id:uid(state,'card'),definitionId,age:0,temporary});}if(definitions.length)log(state,'获得：'+definitions.map(id=>CARDS[id].name).join('、'));unlock(state);}
export function unlock(state){if(['C12','C05','C02'].every(id=>state.hand.some(c=>c.definitionId===id)))state.energyUnlocked=true;}
export function consume(state,ids){state.hand=state.hand.filter(c=>!ids.includes(c.id));}
export function pay(state,cost){requireRule(state.ap>=cost,'行动点不足');state.ap-=cost;}
export function actionable(state){requireRule(['VoyagePreparation','VoyageAction','BattleAction'].includes(state.phase)&&state.ap>0,'当前阶段不能使用物资或制作');}
export function cellFor(state,unit){return state.cells.find(c=>c.id===unit.cellId);}
export function operational(state,unit){return unit.structure>0&&cellFor(state,unit)?.state==='intact';}
export function perish(state){if(state.health<=0){state.health=0;state.phase='Failed';log(state,'生命归零，航行失败。');return true;}return false;}
export function harm(state,health=0,sanity=0,guardable=false){if(guardable&&health>0&&state.guard){health=Math.max(0,health-2);state.guard=false;}state.health-=health;state.sanity=Math.max(0,state.sanity-sanity);if(perish(state))return;if(state.sanity===0){state.health-=6;state.sanity=25;log(state,'精神崩溃：生命 -6，SAN 恢复至 25。');perish(state);}}
export function perimeter(state){const active=state.cells.filter(c=>c.state!=='lost');return active.filter(c=>[[1,0],[-1,0],[0,1],[0,-1]].some(([x,z])=>!active.some(n=>n.x===c.x+x&&n.z===c.z+z))).sort((a,b)=>a.id.localeCompare(b.id));}
export function loseCell(state,cell){cell.state='lost';cell.damagedAtVoyage=null;state.units=state.units.filter(u=>u.cellId!==cell.id);log(state,`筏格 ${cell.label} 脱落，承载设备和产物损失。`);}
export function damageCell(state,cell,severity='minor'){if(cell.state==='lost')return;if(severity==='severe'||cell.state==='damaged')loseCell(state,cell);else{cell.state='damaged';cell.damagedAtVoyage=state.voyageIndex;log(state,`筏格 ${cell.label} 破损，2 个后续航行轮未修会脱落。`);}}
export function randomDamage(state){const pool=perimeter(state);if(pool.length)damageCell(state,pool[rng(state,'raftDamage',pool.length)]);}
export function advanceProduction(state,unit,count){if(!operational(state,unit)||unit.stored)return;const def=EQUIPMENT[unit.definitionId];if(!def.threshold)return;unit.progress+=count;if(unit.progress>=def.threshold){unit.progress-=def.threshold;unit.stored={id:uid(state,'stored'),definitionId:def.output,age:0,temporary:false};log(state,`${CARDS[unit.definitionId].name} 完成生产，可以免费领取。`);}}
