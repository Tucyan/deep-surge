// Deterministic policy comparison through public session commands; no state injection.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createSession} from '../dist/game/session.js';
import {CONFIG} from '../dist/game/content/catalog.js';

function run(seed, manageSurvival) {
  const s = createSession(seed);
  let actions = 0, discarded = 0, toolboxAppearances = 0;
  const act = command => {
    const result = s.dispatch({expectedRevision: s.getSnapshot().revision, command});
    assert.equal(result.accepted, true, JSON.stringify(result.errors));
    actions++;
  };
  while (!['Completed', 'Failed'].includes(s.getSnapshot().phase)) {
    assert.ok(actions < 150, 'policy failed to terminate');
    const v = s.getSnapshot();
    switch (v.phase) {
      case 'VoyageNavigation': {
        toolboxAppearances += v.candidates.some(c => c.nodeId === 'N04') ? 1 : 0;
        const candidate = v.candidates.find(c => c.nodeId === 'N04')
          ?? v.candidates.find(c => CONFIG.lowRiskNodes.includes(c.nodeId));
        assert.ok(candidate, 'missing low-risk route');
        act({type: 'SubmitVoyage', candidateId: candidate.id}); break;
      }
      case 'VoyageSupply': act({type: 'DrawSpring'}); break;
      case 'VoyagePreparation': {
        const water = v.hand.find(c => c.definitionId === 'C07' && v.hydration <= 30);
        const food = v.hand.find(c => ['C08', 'C09'].includes(c.definitionId) && v.hunger <= 30);
        const card = manageSurvival && v.ap > 0 && (water ?? food);
        act(card ? {type: 'PlayCard', cardId: card.id, target: {kind: 'self'}} : {type: 'EnterNode'});
        break;
      }
      case 'NodeResolution': act({type: 'ResolveNodeOption', optionId: '0'}); break;
      case 'VoyageAction': act({type: 'EndVoyageAction'}); break;
      case 'VoyageDiscard': {
        const excess = v.hand.length - CONFIG.handLimit;
        discarded += excess;
        // Preserve starting tools/provisions by discarding newest excess cards.
        act({type: 'DiscardCards', cardIds: v.hand.slice(-excess).map(c => c.id)}); break;
      }
      default: throw new Error('unexpected phase: ' + v.phase);
    }
  }
  const v = s.getSnapshot();
  return {seed, phase: v.phase, health: v.health, hunger: v.hunger, hydration: v.hydration,
    discarded, toolboxAppearances};
}
const mean = values => Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
const report = {contentVersion: CONFIG.version, seeds: '1..100',
  limits: 'Two noncombat policies, not human play or an optimal strategy; first available low-risk choice, latest-card discard.',
  policies: [false, true].map(manage => {
    const runs = Array.from({length: 100}, (_, i) => run(i + 1, manage));
    return {policy: manage ? 'eat/drink at <=30; no crafting or facilities' : 'ignore survival; no crafting or facilities',
      completed: runs.filter(r => r.phase === 'Completed').length,
      healthRange: [Math.min(...runs.map(r => r.health)), Math.max(...runs.map(r => r.health))],
      meanDiscards: mean(runs.map(r => r.discarded)), meanToolboxAppearances: mean(runs.map(r => r.toolboxAppearances)), runs};
  })};
writeFileSync('evidence/balance-v5-simulation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({...report, policies: report.policies.map(({runs, ...summary}) => summary)}, null, 2));
