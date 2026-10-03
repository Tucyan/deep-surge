import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createSession, restoreSession} from '../dist/game/session.js';
import {MONSTERS} from '../dist/game/content/catalog.js';

const act = (s, command) => {
  const r = s.dispatch({expectedRevision: s.getSnapshot().revision, command});
  assert.equal(r.accepted, true, JSON.stringify(r.errors));
};
function fixture(change) {
  const save = createSession(17).exportSave();
  change(save.state);
  return restoreSession(save);
}
function fight(monster, cards = []) {
  return fixture(st => {
    st.phase = 'BattleAction'; st.battleTurn = 1; st.ap = 3;
    st.node = {nodeId: monster === 'M02' ? 'N06' : 'N07'};
    st.hand = cards.map((definitionId, i) => ({id: `fixture-${i}`, definitionId, age: 0, temporary: false}));
    st.enemies = [{id: 'enemy-test', definitionId: monster, lane: 0,
      health: MONSTERS[monster].health, wet: false, bound: false, baited: false, lastBound: -2}];
  });
}
const play = (s, id) => act(s, {type: 'PlayCard', cardId: s.getSnapshot().hand.find(c => c.definitionId === id).id,
  target: {kind: 'enemy', enemyId: 'enemy-test'}});

test('a reduced custom late reward pool terminates without repeating offers or adding facilities', () => {
  // Isolate the regression so an unbounded unique-pick loop cannot hang the suite.
  const moduleURL = new URL('../dist/game/session.js', import.meta.url).href;
  const code = `import {createSession} from ${JSON.stringify(moduleURL)};
    const s=createSession(5,{nodePool:['N01','N03'],supplies:['C01'],facilityLastVoyage:0});
    const c=s.getSnapshot().candidates.find(c=>c.nodeId==='N03');
    console.log(JSON.stringify(c.offers));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {timeout: 1500, encoding: 'utf8'});
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ['C01']);
});

test('ignoring food and water has a cost; starting provisions prevent it with two actions', () => {
  for (const eat of [false, true]) {
    const s = createSession(81, {nodePool: ['N01', 'N02'], springWeights: {C01: 1}});
    assert.equal(s.getSnapshot().hunger, 40);
    for (let round = 1; round <= 5; round++) {
      act(s, {type: 'SubmitVoyage', candidateId: s.getSnapshot().candidates.find(c => c.nodeId === 'N01').id});
      act(s, {type: 'DrawSpring'});
      if (eat && round === 3) for (const definitionId of ['C07', 'C08']) {
        act(s, {type: 'PlayCard', cardId: s.getSnapshot().hand.find(c => c.definitionId === definitionId).id, target: {kind: 'self'}});
      }
      act(s, {type: 'EnterNode'}); act(s, {type: 'ResolveNodeOption', optionId: '0'});
      act(s, {type: 'EndVoyageAction'});
      const st = s.getSnapshot();
      if (st.phase === 'VoyageDiscard') {
        act(s, {type: 'DiscardCards', cardIds: st.hand.slice(-(st.hand.length - 10)).map(c => c.id)});
      }
    }
    const st = s.getSnapshot();
    assert.equal(st.phase, 'Completed'); assert.equal(st.health, eat ? 30 : 22);
    assert.equal(st.hunger, eat ? 14 : 0); assert.equal(st.hydration, eat ? 14 : 0);
  }
});

test('restricted enemies can be defeated without permanent attacks using repeated tactical choices', () => {
  for (const [monster, tactical] of [['M02', 'T03'], ['M03', 'T04']]) {
    const s = fight(monster);
    let turns = 0;
    while (s.getSnapshot().phase === 'BattleAction' && turns++ < 5) {
      act(s, {type: 'EndBattleTurn'});
      assert.deepEqual(s.getSnapshot().supply.choices, ['T01', tactical]);
      const before = s.exportSave(); const restored = restoreSession(before);
      assert.equal(s.preview({type: 'ChooseSupply', definitionId: tactical}).allowed, true);
      assert.deepEqual(s.exportSave(), before);
      act(s, {type: 'ChooseSupply', definitionId: tactical});
      act(restored, {type: 'ChooseSupply', definitionId: tactical});
      assert.deepEqual(s.getSnapshot(), restored.getSnapshot());
      assert.equal(s.getSnapshot().hand[0].temporary, true);
      assert.equal(s.preview({type: 'Craft', recipeId: 'R01'}).allowed, false);
      play(s, tactical);
    }
    assert.equal(s.getSnapshot().phase, 'VoyageAction');
    assert.equal(turns, monster === 'M02' ? 2 : 3);
    assert.equal(s.getSnapshot().hand.some(c => c.temporary), false);
  }
});

test('prepared attacks need a follow-up; seawater enables the crab discharge combo', () => {
  const jelly = fight('M02', ['C13']); play(jelly, 'C13');
  assert.equal(jelly.getSnapshot().enemies.length, 1);
  assert.equal(jelly.getSnapshot().enemies[0].health, 1);
  act(jelly, {type: 'EndBattleTurn'}); act(jelly, {type: 'ChooseSupply', definitionId: 'T03'}); play(jelly, 'T03');
  assert.equal(jelly.getSnapshot().phase, 'VoyageAction');
  const crab = fight('M03', ['C14']); play(crab, 'C14');
  assert.equal(crab.getSnapshot().enemies[0].health, 1);
  const wet = fight('M03', ['C06', 'C14']); play(wet, 'C06'); play(wet, 'C14');
  assert.equal(wet.getSnapshot().phase, 'VoyageAction'); assert.equal(wet.getSnapshot().health, 30);
  const wrong = fight('M02', ['C06']);
  assert.equal(wrong.preview({type: 'PlayCard', cardId: 'fixture-0', target: {kind: 'enemy', enemyId: 'enemy-test'}}).allowed, false);
});

test('claimed toolboxes leave the pool and late rewards do not offer unusable facilities', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const save = createSession(seed).exportSave();
    save.state.toolboxClaimed = true; save.state.voyageIndex = 3;
    save.state.phase = 'VoyageAction'; save.state.node = {nodeId: 'N01'}; save.state.hand = [];
    const s = restoreSession(save); act(s, {type: 'EndVoyageAction'});
    const st = s.getSnapshot();
    assert.ok(st.candidates.every(c => !['N04', 'N09'].includes(c.nodeId)));
    assert.ok(st.candidates.some(c => ['N01', 'N02', 'N03', 'N08', 'N10', 'N12'].includes(c.nodeId)));
    for (const c of st.candidates.filter(c => c.nodeId === 'N03')) assert.ok(c.offers.every(id => !['C20', 'C21'].includes(id)));
  }
});

test('second voyage guarantees an early facility opportunity alongside a low-risk choice', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const save = createSession(seed).exportSave(); save.state.phase = 'VoyageAction';
    save.state.node = {nodeId: 'N01'}; save.state.hand = []; save.state.toolboxClaimed = true;
    const s = restoreSession(save); act(s, {type: 'EndVoyageAction'});
    assert.ok(s.getSnapshot().candidates.some(c => c.nodeId === 'N09'));
    assert.ok(s.getSnapshot().candidates.some(c => ['N01', 'N02', 'N03', 'N08', 'N10', 'N12'].includes(c.nodeId)));
  }
});

test('whirlpool rewards let the player trade one cell injury for materials or survival', () => {
  for (const [optionId, expected] of [['0', ['C02', 'C05', 'C01']], ['1', ['C02', 'C05', 'C07', 'C08']]]) {
    const s = fixture(st => {st.phase = 'NodeResolution'; st.node = {nodeId: 'N11'}; st.hand = [];});
    act(s, {type: 'ResolveNodeOption', optionId});
    assert.deepEqual(s.getSnapshot().hand.map(c => c.definitionId), expected);
    assert.equal(s.getSnapshot().cells.filter(c => c.state === 'damaged').length, 1);
    const protectedRun = fixture(st => {st.phase = 'NodeResolution'; st.node = {nodeId: 'N11', protected: true}; st.hand = [];});
    act(protectedRun, {type: 'ResolveNodeOption', optionId});
    assert.equal(protectedRun.getSnapshot().cells.filter(c => c.state === 'damaged').length, 0);
  }
});

test('destroyed temporary shields free their lane while permanent wrecks remain', () => {
  for (const definitionId of ['T01', 'C19']) {
    const s = fight('M03', ['T01']); const save = s.exportSave();
    save.state.units = [{id: 'shield-test', definitionId, slotKind: 'defense', slotIndex: 0,
      cellId: 'cell-0-2', structure: 1, temporary: definitionId === 'T01', progress: 0, stored: null}];
    const b = restoreSession(save); act(b, {type: 'EndBattleTurn'});
    assert.equal(b.getSnapshot().units.length, definitionId === 'T01' ? 0 : 1);
    act(b, {type: 'ChooseSupply', definitionId: 'T01'});
    assert.equal(b.preview({type: 'PlayCard', cardId: b.getSnapshot().hand.at(-1).id,
      target: {kind: 'defenseSlot', lane: 0}}).allowed, definitionId === 'T01');
  }
});
