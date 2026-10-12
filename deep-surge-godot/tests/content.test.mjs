import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../../玩法实验/src/content/cards.js';
import {NODES, MONSTERS, SHOP} from '../../玩法实验/src/content/nodes.js';
import {EQUIPMENT, RECIPES} from '../../玩法实验/src/content/equipment.js';
import {META_SHOP, TECH, RELICS} from '../../玩法实验/src/content/relics.js';

for (const [table, source] of Object.entries({cards:CARDS,nodes:NODES,enemies:MONSTERS,equipment:EQUIPMENT,recipes:RECIPES,shops:Object.fromEntries(SHOP.map(x=>[x.id,x])),meta_shop:META_SHOP,tech:TECH,relics:RELICS})) {
  test(`${table}: Godot JSON 与玩法实验完全一致`, () => {
    const path = new URL(`../content/data/${table}.json`, import.meta.url);
    assert.ok(exists(path), '尚未迁移内容');
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), source);
  });
}
function exists(path) { try { readFileSync(path); return true; } catch { return false; } }
