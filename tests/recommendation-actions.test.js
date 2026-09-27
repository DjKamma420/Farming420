import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECOMMENDATION_ACTION_TYPE,
  generateRecommendationActions,
  recommendationActionFromRow,
} from '../src/recommendation-actions.js';

function row(overrides = {}) {
  return {
    item: {
      id: 'tool-example',
      name: 'Example Tool',
      category: 'Tool',
      section: 'tools',
      cropScope: 'Melon',
      status: 'ACTIVE',
      source: 'https://example.test/source',
      lastVerified: '2026-09-27',
    },
    activityMode: 'farm',
    acquisitionMode: 'BUYABLE',
    costKnown: true,
    cost: 12_500_000,
    directCoinCost: 0,
    activeGrindHours: null,
    gain: 20,
    modeled: 'fortune',
    deltaFortune: 20,
    deltaOverbloom: 0,
    marginalCoinsHour: 750_000,
    costSource: { currentLevel: 1, targetLevel: 2 },
    ...overrides,
  };
}

test('buyable physical planner rows become purchase actions with preserved economics', () => {
  const action = recommendationActionFromRow(row());

  assert.equal(action.type, RECOMMENDATION_ACTION_TYPE.PURCHASE);
  assert.equal(action.sourceUpgrade.id, 'tool-example');
  assert.equal(action.directCost, 12_500_000);
  assert.equal(action.profitDeltaPerHour, 750_000);
  assert.deepEqual(action.currentState, { level: 1, known: true });
  assert.deepEqual(action.targetState, { level: 2, known: true });
  assert.deepEqual(action.sources, ['https://example.test/source']);
  assert.equal(action.lastVerified, '2026-09-27');
  assert.equal(action.confidence, 'sourced-active');
});

test('earned progress becomes a grind action and keeps active time separate from coin cost', () => {
  const action = recommendationActionFromRow(row({
    acquisitionMode: 'EARNED',
    costKnown: true,
    cost: 5_000_000,
    directCoinCost: 0,
    activeGrindHours: 2.5,
  }));

  assert.equal(action.type, RECOMMENDATION_ACTION_TYPE.GRIND);
  assert.equal(action.directCost, 0);
  assert.equal(action.activeTimeSeconds, 9_000);
});

test('crafts, unlock gates and installed upgrades get distinct action types', () => {
  const craft = recommendationActionFromRow(row({
    item: { ...row().item, id: 'tool-mk-ii', name: 'Tool Mk. II', category: 'Tool Tier' },
  }));
  const unlock = recommendationActionFromRow(row({
    item: { ...row().item, id: 'tool-overclocker-3000', name: 'Tool level gate', category: 'Tool Level Gate' },
  }));
  const reforge = recommendationActionFromRow(row({
    item: { ...row().item, id: 'tool-reforge', name: 'Tool Reforge', category: 'Tool Reforge' },
  }));

  assert.equal(craft.type, RECOMMENDATION_ACTION_TYPE.CRAFT);
  assert.equal(unlock.type, RECOMMENDATION_ACTION_TYPE.UNLOCK);
  assert.equal(reforge.type, RECOMMENDATION_ACTION_TYPE.UPGRADE);
});

test('unknown economics stay unknown instead of becoming zero', () => {
  const action = recommendationActionFromRow(row({
    acquisitionMode: 'UNKNOWN',
    costKnown: false,
    cost: 0,
    marginalCoinsHour: null,
    costSource: {},
  }));

  assert.equal(action.directCost, null);
  assert.equal(action.profitDeltaPerHour, null);
  assert.deepEqual(action.currentState, { level: null, known: false });
  assert.equal(action.prerequisites, null);
  assert.equal(action.prerequisitesModeled, false);
});

test('batch generation returns action records rather than raw upgrade rows', () => {
  const actions = generateRecommendationActions([row(), row({
    item: { ...row().item, id: 'farming-skill', name: 'Farming Skill', category: 'Account/Skill' },
    acquisitionMode: 'EARNED',
  })]);

  assert.equal(actions.length, 2);
  assert.match(actions[0].id, /^action:/);
  assert.equal(actions[1].type, RECOMMENDATION_ACTION_TYPE.GRIND);
  assert.equal(actions[0].evaluation.item.id, 'tool-example');
});


test('action ids describe the target and do not depend on list position', () => {
  const first = recommendationActionFromRow(row());
  const second = recommendationActionFromRow(row());
  assert.equal(first.id, second.id);
  assert.equal(first.id, 'action:tool-example:farm:default:level-2');
});


test('active rows without source metadata do not claim verified confidence', () => {
  const action = recommendationActionFromRow(row({
    item: {
      ...row().item,
      id: 'missing-evidence',
      source: null,
      lastVerified: null,
    },
  }));
  assert.equal(action.confidence, 'incomplete-evidence');
});
