// Explicit migration tool. Never run automatically during game startup.
import {CARDS} from '../../玩法实验/src/content/cards.js';
import {NODES,MONSTERS,SHOP} from '../../玩法实验/src/content/nodes.js';
import {EQUIPMENT,RECIPES} from '../../玩法实验/src/content/equipment.js';
import {META_SHOP,TECH,RELICS} from '../../玩法实验/src/content/relics.js';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../',import.meta.url);
const tables = {cards:CARDS,nodes:NODES,enemies:MONSTERS,equipment:EQUIPMENT,recipes:RECIPES,shops:Object.fromEntries(SHOP.map(x=>[x.id,x])),meta_shop:META_SHOP,tech:TECH,relics:RELICS};
await mkdir(new URL('content/data/',root),{recursive:true});
await mkdir(new URL('assets/',root),{recursive:true});
const provenance = [];
for(const path of ['cards.js','nodes.js','equipment.js','relics.js']) {
  const bytes = await readFile(new URL(`../../玩法实验/src/content/${path}`,import.meta.url));
  provenance.push({path:`玩法实验/src/content/${path}`,sha256:createHash('sha256').update(bytes).digest('hex')});
}
for(const [name,data] of Object.entries(tables)) {
  await writeFile(new URL(`content/data/${name}.json`,root),JSON.stringify(data,null,2)+'\n');
}
await writeFile(new URL('content/manifest.json',root),JSON.stringify({version:'godot-v02-pages-1',source:provenance,tables:Object.fromEntries(Object.keys(tables).map(x=>[x,`res://content/data/${x}.json`]))},null,2)+'\n');
const assets = {};
const colors={resource:'#284c57',survival:'#326253',combat:'#674543',equipment:'#555d44',action:'#4b496a',currency:'#756439',negative:'#533c55'};
for(const [id,card] of Object.entries(CARDS)) assets[`card.${id}`]={path:'',color:colors[card.kind],label:card.name,version:1,source:'procedural-solid-label-v1'};
for(const [id,node] of Object.entries(NODES)) assets[`node.${id}`]={path:'',color:'#244b5b',label:node.name,version:1,source:'procedural-solid-label-v1'};
for(const [id,enemy] of Object.entries(MONSTERS)) assets[`enemy.${id}`]={path:'',color:'#694550',label:enemy.name,version:1,source:'procedural-solid-label-v1'};
for(const [id,relic] of Object.entries(RELICS)) assets[`relic.${id}`]={path:'',color:'#655f40',label:relic.name,version:1,source:'procedural-solid-label-v1'};
assets['scene.ocean']={path:'',color:'#123542',label:'深潮海域',version:1,source:'procedural-solid-label-v1'};
await writeFile(new URL('assets/manifest.json',root),JSON.stringify({version:1,assets},null,2)+'\n');
console.log('Imported '+Object.entries(tables).map(([key,data])=>`${key}=${Object.keys(data).length}`).join(', '));
