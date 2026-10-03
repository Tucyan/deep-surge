import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,restoreSession} from '../dist/game/session.js';
const act=(s,c)=>{const r=s.dispatch({expectedRevision:s.getSnapshot().revision,command:c});assert.equal(r.accepted,true,r.errors?.[0]?.message);};
const depart=(s,nodeId)=>act(s,{type:'SubmitVoyage',candidateId:(s.getSnapshot().candidates.find(c=>c.nodeId===nodeId)??s.getSnapshot().candidates[0]).id});
test('spring draws exactly three predetermined random cards once without AP or preview RNG changes',()=>{
 const s=createSession(310);depart(s);const before=s.getSnapshot();const command={type:'DrawSpring'};assert.equal(s.preview(command).allowed,true);assert.deepEqual(s.getSnapshot(),before);act(s,command);assert.equal(s.getSnapshot().hand.length,10);assert.equal(s.getSnapshot().ap,3);const done=s.getSnapshot();assert.equal(s.dispatch({expectedRevision:done.revision,command}).accepted,false);assert.deepEqual(s.getSnapshot(),done);
 const restored=restoreSession({formatVersion:1,contentVersion:done.config.version,state:before});act(restored,command);assert.deepEqual(restored.getSnapshot(),done);
});
test('node rewards remain usable above hand limit until explicit end of action',()=>{
 const s=createSession(17,{nodePool:['N01','N02']});depart(s,'N02');act(s,{type:'DrawSpring'});act(s,{type:'EnterNode'});act(s,{type:'ResolveNodeOption',optionId:'0'});
 assert.equal(s.getSnapshot().phase,'VoyageAction');assert.equal(s.getSnapshot().hand.length,12);assert.equal(s.getSnapshot().hunger,40);assert.equal(s.preview({type:'DiscardCards',cardIds:[s.getSnapshot().hand[0].id]}).allowed,false);
 act(s,{type:'EndVoyageAction'});assert.equal(s.getSnapshot().phase,'VoyageDiscard');assert.equal(s.getSnapshot().hunger,30);
});
test('AP exhaustion after node auto-ends action; battle AP exhaustion runs intents before discard',()=>{
 const save=createSession(17).exportSave();save.state.phase='VoyageAction';save.state.node={nodeId:'N01'};save.state.ap=1;const s=restoreSession(save);act(s,{type:'PlayCard',cardId:s.getSnapshot().hand.find(c=>c.definitionId==='C08').id,target:{kind:'self'}});assert.equal(s.getSnapshot().voyageIndex,2);assert.equal(s.getSnapshot().hunger,54);
 const fight=createSession(3).exportSave();fight.state.phase='BattleAction';fight.state.battleTurn=1;fight.state.ap=1;fight.state.enemies=[{id:'enemy-test',definitionId:'M02',health:3,lane:0,wet:false,bound:false,baited:false,lastBound:-2}];fight.state.node={nodeId:'N06'};const b=restoreSession(fight);act(b,{type:'PlayCard',cardId:b.getSnapshot().hand.find(c=>c.definitionId==='C08').id,target:{kind:'self'}});assert.equal(b.getSnapshot().phase,'BattleSupply');assert.equal(b.getSnapshot().battleTurn,2);assert.equal(b.getSnapshot().health,29);assert.equal(b.getSnapshot().hunger,64);
});

test('spring weighted pool contains resources and survival, never permanent advanced items',()=>{
 const counts={};for(let seed=1;seed<=400;seed++){const session=createSession(seed);const state=session.getSnapshot();assert.equal(state.supply.cards.length,3);for(const id of state.supply.cards){assert.ok(state.config.springWeights[id]>0);counts[id]=(counts[id]??0)+1;}assert.equal(session.getView().supply.count,3);assert.equal(session.getView().supply.cards,undefined);}assert.ok(counts.C01>counts.C17);assert.ok(counts.C07>counts.C18);assert.equal(Object.values(counts).reduce((a,b)=>a+b),1200);
});
test('zero AP preparation processes node before discard; direct victory keeps remaining actions',()=>{
 const data=createSession(3,{nodePool:['N01','N02']}).exportSave();data.state.phase='VoyagePreparation';data.state.node={nodeId:'N01'};data.state.candidates=[];data.state.ap=1;data.state.hand.push({id:'extra-food',definitionId:'C08',age:0,temporary:false});const s=restoreSession(data);act(s,{type:'PlayCard',cardId:'extra-food',target:{kind:'self'}});assert.equal(s.getSnapshot().phase,'VoyagePreparation');assert.equal(s.getSnapshot().ap,0);act(s,{type:'EnterNode'});act(s,{type:'ResolveNodeOption',optionId:'0'});assert.equal(s.getSnapshot().voyageIndex,2);
 const save=createSession(3).exportSave();save.state.phase='BattleAction';save.state.battleTurn=1;save.state.ap=3;save.state.node={nodeId:'N05'};save.state.enemies=[{id:'last-enemy',definitionId:'M01',health:2,lane:0,wet:false,bound:false,baited:false,lastBound:-2}];const b=restoreSession(save);act(b,{type:'PoleRepel',enemyId:'last-enemy'});assert.equal(b.getSnapshot().phase,'VoyageAction');assert.equal(b.getSnapshot().ap,1);assert.equal(b.getSnapshot().hunger,40);act(b,{type:'EndVoyageAction'});assert.equal(b.getSnapshot().hunger,30);
});
