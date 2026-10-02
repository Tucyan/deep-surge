import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {CARDS,NODES,MONSTERS} from '../dist/game/content/catalog.js';
import {cardArt,nodeArt,monsterArt} from '../dist/presentation/art.js';
const data=JSON.parse(readFileSync('dist/assets/manifest.json','utf8'));const ids=new Set();
for(const a of data.assets){assert.ok(!ids.has(a.assetId),a.assetId);ids.add(a.assetId);if(a.runtimePath){assert.ok(!a.runtimePath.includes('..'));const bytes=readFileSync('dist/'+a.runtimePath);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(bytes.readUInt32BE(16),a.width);assert.equal(bytes.readUInt32BE(20),a.height);}if(a.generator){assert.ok(existsSync('dist/'+a.generator.module));assert.ok(existsSync(a.sourceRecord));}}
for(const [catalog,art] of [[CARDS,cardArt],[NODES,nodeArt],[MONSTERS,monsterArt]])for(const id of Object.keys(catalog).filter(id=>!id.startsWith('T')))assert.ok(art[id]&&existsSync('dist/'+art[id]),id);
console.log(`${ids.size} unique asset IDs, hashes/dimensions and all C/N/M image mappings passed.`);
