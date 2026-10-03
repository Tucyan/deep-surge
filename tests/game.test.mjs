import {damageCell,perimeter} from '../dist/game/rules/common.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,restoreSession} from '../dist/game/session.js';
import {CARDS,RECIPES,NODES,MONSTERS} from '../dist/game/content/catalog.js';
const act=(session,command)=>{const result=session.dispatch({expectedRevision:session.getSnapshot().revision,command});assert.equal(result.accepted,true,JSON.stringify(result));if(session.getSnapshot().phase==='VoyageAction'){const end=session.dispatch({expectedRevision:session.getSnapshot().revision,command:{type:'EndVoyageAction'}});assert.equal(end.accepted,true);}return session.getSnapshot();};
// Existing route helpers explicitly end post-node actions; the revision tests exercise that boundary directly.
const prep=(s,nodeId)=>{act(s,{type:'SubmitVoyage',candidateId:(s.getSnapshot().candidates.find(c=>c.nodeId===nodeId)??s.getSnapshot().candidates[0]).id});return act(s,{type:'DrawSpring'});};

test('catalog covers all first-layer content; starting supply is one-time and costs are atomic',()=>{
 assert.equal(Object.keys(CARDS).filter(id=>id.startsWith('C')).length,24);assert.equal(Object.keys(RECIPES).length,8);assert.equal(Object.keys(NODES).length,12);assert.equal(Object.keys(MONSTERS).length,3);
 const s=createSession(42,{supplies:['C08']});assert.equal(s.getSnapshot().hand.length,7);prep(s);assert.equal(s.getSnapshot().hand.length,10);
 const before=s.getSnapshot();assert.equal(s.dispatch({expectedRevision:0,command:{type:'ChooseSupply',definitionId:'C07'}}).accepted,false);assert.deepEqual(s.getSnapshot(),before);
 const preview=s.preview({type:'Craft',recipeId:'R01'});assert.equal(preview.allowed,true);assert.deepEqual(s.getSnapshot(),before);
 act(s,{type:'Craft',recipeId:'R01'});const state=s.getSnapshot();assert.equal(state.ap,2);assert.ok(state.hand.some(c=>c.definitionId==='C11'));assert.ok(state.hand.some(c=>c.definitionId==='C13'));assert.equal(state.hand.filter(c=>c.definitionId==='C04').length,0);
 const rejected=s.getSnapshot();assert.equal(s.dispatch({expectedRevision:rejected.revision,command:{type:'Craft',recipeId:'R01'}}).accepted,false);assert.deepEqual(s.getSnapshot(),rejected);
});

test('five safe voyages settle once each and finish only after required discard',()=>{
 const s=createSession(81,{nodePool:['N01','N02'],supplies:['C01']});
 for(let round=1;round<=5;round++){
  prep(s,'N01');act(s,{type:'EnterNode'});
  if(s.getSnapshot().phase==='NodeResolution')act(s,{type:'ResolveNodeOption',optionId:'0'});
  if(s.getSnapshot().phase==='VoyageDiscard'){const st=s.getSnapshot();act(s,{type:'DiscardCards',cardIds:st.hand.slice(0,st.hand.length-10).map(c=>c.id)});}
 }
 const state=s.getSnapshot();assert.equal(state.phase,'Completed');assert.equal(state.hunger,30);assert.equal(state.hydration,30);assert.equal(state.health,30);assert.equal(state.voyageIndex,5);assert.equal(state.hand.length<=10,true);assert.equal('hull' in state,false);
});

test('save restore and rejected commands preserve RNG and deterministic replay',()=>{
 const a=createSession(2026);prep(a);const b=restoreSession(a.exportSave());assert.deepEqual(a.getSnapshot(),b.getSnapshot());const incompatible=a.exportSave();incompatible.state.randomAlgorithm='unknown-v2';assert.throws(()=>restoreSession(incompatible),/版本/);
 const invalid=a.getSnapshot();assert.equal(a.dispatch({expectedRevision:invalid.revision,command:{type:'PlayCard',cardId:'missing'}}).accepted,false);assert.deepEqual(a.getSnapshot(),invalid);
 const commands=[{type:'EnterNode'}];commands.forEach(c=>{act(a,c);act(b,c)});assert.deepEqual(a.getSnapshot(),b.getSnapshot());
});

function fixture(change){const save=createSession(17).exportSave();change(save.state);return restoreSession(save);}
function battle(monster,cards=[]){return fixture(st=>{st.phase='BattleAction';st.battleTurn=1;st.ap=3;st.node={nodeId:monster==='M01'?'N05':monster==='M02'?'N06':'N07'};st.enemies=[{id:'enemy-fixture',definitionId:monster,lane:0,health:MONSTERS[monster].health,wet:false,bound:false,baited:false,lastBound:-2}];st.hand=cards.map((definitionId,i)=>({id:'fixture-card-'+i,definitionId,age:0,temporary:false}));});}
const use=(s,id,target,extra={})=>act(s,{type:'PlayCard',cardId:s.getSnapshot().hand.find(c=>c.definitionId===id).id,target,...extra});

test('material mismatch is transactional; confirmation consumes, torch wins immediately',()=>{
 const s=battle('M02',['C17','C13']);const command={type:'PlayCard',cardId:'fixture-card-0',target:{kind:'enemy',enemyId:'enemy-fixture'}};
 const before=s.getSnapshot();assert.equal(s.preview(command).allowed,false);assert.equal(s.dispatch({expectedRevision:before.revision,command}).accepted,false);assert.deepEqual(s.getSnapshot(),before);
 act(s,{...command,allowIneffective:true});assert.equal(s.getSnapshot().enemies[0].health,3);assert.equal(s.getSnapshot().ap,2);
 use(s,'C13',{kind:'enemy',enemyId:'enemy-fixture'});assert.notEqual(s.getSnapshot().phase,'BattleAction');assert.equal(s.getSnapshot().health,30);assert.equal(s.getSnapshot().hunger,70);
});

test('wet and bound combos work; restricted monsters reject water; repeats are blocked',()=>{
 const s=battle('M01',['C06','C14']);use(s,'C06',{kind:'enemy',enemyId:'enemy-fixture'});assert.equal(s.getSnapshot().enemies[0].wet,true);use(s,'C14',{kind:'enemy',enemyId:'enemy-fixture'});assert.ok(s.getSnapshot().log.some(l=>l.includes('5 伤害')));
 const crab=battle('M03',['C06']);assert.equal(crab.preview({type:'PlayCard',cardId:'fixture-card-0',target:{kind:'enemy',enemyId:'enemy-fixture'}}).allowed,false);
 const tied=battle('M01',['C03','C03','C17']);use(tied,'C03',{kind:'enemy',enemyId:'enemy-fixture'});assert.equal(tied.preview({type:'PlayCard',cardId:'fixture-card-1',target:{kind:'enemy',enemyId:'enemy-fixture'}}).allowed,false);use(tied,'C17',{kind:'enemy',enemyId:'enemy-fixture'});assert.ok(tied.getSnapshot().log.some(l=>l.includes('5 伤害')));
});

test('battle does not age cells or drain hunger; retreat settles once and fails if lethal',()=>{
 const s=battle('M01');act(s,{type:'EndBattleTurn'});assert.equal(s.getSnapshot().hunger,80);assert.equal(s.getSnapshot().battleTurn,2);assert.equal(s.getSnapshot().phase,'BattleSupply');act(s,{type:'ChooseSupply',definitionId:'T01'});act(s,{type:'Retreat'});assert.equal(s.getSnapshot().health,26);assert.equal(s.getSnapshot().hunger,70);assert.equal(s.getSnapshot().hand.some(c=>c.temporary),false);
 const dead=fixture(st=>{st.phase='BattleAction';st.battleTurn=2;st.health=4;});act(dead,{type:'Retreat'});assert.equal(dead.getSnapshot().phase,'Failed');
});

test('damaged cells disable retained equipment; repair restores; repeated damage loses equipment',()=>{
 const s=fixture(st=>{st.phase='VoyagePreparation';const cell=st.cells.find(c=>c.id==='cell-0-2');cell.state='damaged';cell.damagedAtVoyage=1;st.units=[{id:'unit-fixture',definitionId:'C19',slotKind:'defense',slotIndex:0,cellId:cell.id,structure:2,temporary:false,progress:0,stored:null}];});
 assert.equal(s.getView().units[0].operational,false);use(s,'C01',{kind:'raftCells',cellIds:['cell-0-2']});assert.equal(s.getView().units[0].operational,true);assert.equal(s.getSnapshot().units[0].structure,2);
 const data=s.exportSave().state;const cell=data.cells.find(c=>c.id==='cell-0-2');damageCell(data,cell);assert.equal(data.units.length,1);damageCell(data,cell);assert.equal(cell.state,'lost');assert.equal(data.units.length,0);const outer=data.cells.find(c=>c.id==='cell-1-2');damageCell(data,outer,'severe');assert.equal(outer.state,'lost');assert.ok(perimeter(data).some(c=>c.id==='cell-1-1'));assert.ok(perimeter(data).every(c=>c.state!=='lost'));
});

test('aging occurs after two later voyages before production and cannot repair lost cells',()=>{
 const s=fixture(st=>{st.phase='NodeResolution';st.voyageIndex=3;st.node={nodeId:'N01'};const cell=st.cells.find(c=>c.id==='cell-0-1');cell.state='damaged';cell.damagedAtVoyage=1;st.units=[{id:'unit-age',definitionId:'C20',slotKind:'logistics',slotIndex:0,cellId:cell.id,structure:4,temporary:false,progress:2,stored:null}];});
 act(s,{type:'ResolveNodeOption',optionId:'0'});assert.equal(s.getSnapshot().cells.find(c=>c.id==='cell-0-1').state,'lost');assert.equal(s.getSnapshot().units.length,0);
 prep(s);const before=s.getSnapshot();const cmd={type:'PlayCard',cardId:before.hand.find(c=>c.definitionId==='C01').id,target:{kind:'raftCells',cellIds:['cell-0-1']}};assert.equal(s.preview(cmd).allowed,false);
});

test('rain production, capacity, free collection and food freshness are independent',()=>{
 const s=fixture(st=>{st.phase='NodeResolution';st.node={nodeId:'N08'};st.hand=[];st.units=[{id:'rain-fixture',definitionId:'C21',slotKind:'logistics',slotIndex:0,cellId:'cell-0-1',structure:4,temporary:false,progress:1,stored:null}];});
 act(s,{type:'ResolveNodeOption',optionId:'0'});assert.equal(s.getSnapshot().units[0].stored.definitionId,'C07');prep(s);const ap=s.getSnapshot().ap;act(s,{type:'CollectProduction',unitId:'rain-fixture'});assert.equal(s.getSnapshot().ap,ap);assert.equal(s.getSnapshot().units[0].stored,null);
 const fish=fixture(st=>{st.phase='NodeResolution';st.node={nodeId:'N01'};st.hand=[{id:'old-fish',definitionId:'C09',age:2,temporary:false}];});act(fish,{type:'ResolveNodeOption',optionId:'0'});assert.equal(fish.getSnapshot().hand.length,0);
});

test('candidate reroll preserves count/AP and supply, preview never advances streams',()=>{
 const s=createSession(23,{initialCards:['C22','C24','C10','C11','C01','C04','C08']});const before=s.getSnapshot();const cmd={type:'PlayCard',cardId:before.hand.find(c=>c.definitionId==='C22').id,target:{kind:'candidates'}};assert.equal(s.preview(cmd).allowed,true);assert.deepEqual(s.getSnapshot(),before);act(s,cmd);assert.equal(s.getSnapshot().candidates.length,before.candidates.length);assert.equal(s.getSnapshot().ap,2);assert.equal(s.getSnapshot().hand.length,before.hand.length-1);use(s,'C24',{kind:'candidates'});assert.ok(s.getView().candidates.every(c=>c.details!==null));
});

test('starvation loss is capped, mental breakdown and deep tide can fail the run',()=>{
 const s=fixture(st=>{st.phase='NodeResolution';st.node={nodeId:'N01'};st.hunger=0;st.hydration=0;st.health=4;});act(s,{type:'ResolveNodeOption',optionId:'0'});assert.equal(s.getSnapshot().phase,'Failed');assert.equal(s.getSnapshot().health,0);
 const san=battle('M02');const save=san.exportSave();save.state.sanity=1;const m=restoreSession(save);act(m,{type:'EndBattleTurn'});assert.equal(m.getSnapshot().sanity,25);assert.equal(m.getSnapshot().health,23);
 const tide=battle('M03');const data=tide.exportSave();data.state.battleTurn=7;data.state.health=4;const d=restoreSession(data);act(d,{type:'EndBattleTurn'});assert.equal(d.getSnapshot().phase,'Failed');
});

test('all candidates obey guaranteed noncombat/supply, energy gate, and first enemy count',()=>{
 for(let seed=1;seed<=100;seed++){
  const state=createSession(seed).getSnapshot();assert.ok([2,3].includes(state.candidates.length));assert.ok(state.candidates.some(c=>NODES[c.nodeId].kind==='supply'));assert.ok(state.candidates.every(c=>c.nodeId!=='N07'));assert.equal(new Set(state.candidates.map(c=>c.nodeId)).size,state.candidates.length);
  const combat=state.candidates.find(c=>c.nodeId==='N05');if(combat)assert.equal(combat.enemies.length,1);
 }
});

test('final reward overflow blocks completion until discard; duplicate craft input rejects atomically',()=>{
 const s=fixture(st=>{st.phase='NodeResolution';st.voyageIndex=5;st.node={nodeId:'N02'};st.hand=Array.from({length:10},(_,i)=>({id:'overflow-'+i,definitionId:'C01',age:0,temporary:false}));});act(s,{type:'ResolveNodeOption',optionId:'0'});assert.equal(s.getSnapshot().phase,'VoyageDiscard');assert.equal(s.getSnapshot().hand.length,12);act(s,{type:'DiscardCards',cardIds:['overflow-0','overflow-1']});assert.equal(s.getSnapshot().phase,'Completed');
 const c=createSession(11);prep(c);const before=c.getSnapshot();const ingredient=before.hand.find(x=>x.definitionId==='C01').id;assert.equal(c.dispatch({expectedRevision:before.revision,command:{type:'Craft',recipeId:'R01',ingredientCardIds:[ingredient,ingredient]}}).accepted,false);assert.deepEqual(c.getSnapshot(),before);
});

test('wrecks rebuild with cost, disabled units do not attack, move and swap preserve slots',()=>{
 const s=fixture(st=>{st.phase='VoyagePreparation';st.units=[{id:'wreck',definitionId:'C19',slotKind:'defense',slotIndex:0,cellId:'cell-0-2',structure:0,temporary:false,progress:0,stored:null}];st.hand.push({id:'scrap-fixture',definitionId:'C02',age:0,temporary:false});});act(s,{type:'RebuildWreck',unitId:'wreck',scrapCardId:'scrap-fixture'});assert.equal(s.getSnapshot().units[0].structure,4);assert.equal(s.getSnapshot().ap,1);act(s,{type:'MoveDefense',unitId:'wreck',destination:1});assert.equal(s.getSnapshot().units[0].cellId,'cell-1-2');
 const swapSave=s.exportSave();swapSave.state.ap=3;swapSave.state.units.push({id:'other-shield',definitionId:'C18',slotKind:'defense',slotIndex:2,cellId:'cell-2-2',structure:2,temporary:false,progress:0,stored:null});const swap=restoreSession(swapSave);act(swap,{type:'SwapDefense',unitId:'wreck',destination:2});assert.equal(swap.getSnapshot().ap,1);assert.equal(swap.getSnapshot().units.find(u=>u.id==='wreck').cellId,'cell-2-2');assert.equal(swap.getSnapshot().units.find(u=>u.id==='other-shield').cellId,'cell-1-2');
 const disabled=battle('M01');const data=disabled.exportSave();data.state.cells.find(c=>c.id==='cell-0-2').state='damaged';data.state.cells.find(c=>c.id==='cell-0-2').damagedAtVoyage=1;data.state.units=[{id:'inactive',definitionId:'C19',slotKind:'defense',slotIndex:0,cellId:'cell-0-2',structure:4,temporary:false,progress:0,stored:null}];const d=restoreSession(data);act(d,{type:'EndBattleTurn'});assert.equal(d.getSnapshot().enemies[0].health,4);
});

test('emergency guard waits for a health hit across a turn that only damages raft cells',()=>{
 const s=battle('M01');act(s,{type:'EmergencyGuard'});act(s,{type:'EndBattleTurn'});assert.equal(s.getSnapshot().guard,true);act(s,{type:'ChooseSupply',definitionId:'T01'});
 const save=s.exportSave();save.state.enemies[0].definitionId='M02';save.state.enemies[0].health=3;const guarded=restoreSession(save);act(guarded,{type:'EndBattleTurn'});assert.equal(guarded.getSnapshot().health,30);assert.equal(guarded.getSnapshot().sanity,79);assert.equal(guarded.getSnapshot().guard,false);
});
