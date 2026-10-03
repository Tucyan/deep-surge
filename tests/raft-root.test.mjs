import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createRaftResources} from '../dist/presentation/models/raft.js';
import {createRaftRoot,ROOT_CONFIG} from '../dist/presentation/models/raft-root.js';
test('camp occupies a larger bounded footprint, with distinct decorative parts and finite geometry',()=>{
 const resources=createRaftResources(),camp=createRaftRoot({resources});assert.ok(ROOT_CONFIG.width*ROOT_CONFIG.depth>=22);assert.equal(camp.root.userData.functional,false);
 for(const name of ['tent','cargo-crates','lantern','fishing-net','deck'])assert.ok(camp.root.getObjectByName(name),name);
 const bounds=new THREE.Box3().setFromObject(camp.root);assert.ok(bounds.min.x>=-ROOT_CONFIG.width/2-.02);assert.ok(bounds.max.x<=ROOT_CONFIG.width/2+.02);assert.ok(bounds.min.z>=-ROOT_CONFIG.depth/2-.02);assert.ok(bounds.max.z<=ROOT_CONFIG.depth/2+.02);
 let triangles=0;camp.root.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite));assert.ok(o.geometry.attributes.normal);assert.ok(o.geometry.attributes.uv);triangles+=(o.geometry.index?.count??p.count)/3;}});assert.ok(triangles<16000);camp.dispose();resources.dispose();
});
test('camp releases private resources exactly once and leaves borrowed cache live',()=>{
 const resources=createRaftResources(),camp=createRaftRoot({resources}),shared=new Set([...Object.values(resources.geometries),...resources.materials.wood,...Object.values(resources.materials).filter(v=>!Array.isArray(v))]),privateResources=new Set();let sharedDisposals=0;shared.forEach(r=>r.addEventListener('dispose',()=>sharedDisposals++));camp.root.traverse(o=>{if(o.isMesh){for(const r of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!shared.has(r))privateResources.add(r);}});let disposals=0;privateResources.forEach(r=>r.addEventListener('dispose',()=>disposals++));camp.dispose();camp.dispose();assert.equal(disposals,privateResources.size);assert.equal(sharedDisposals,0);assert.equal(resources.disposed,false);resources.dispose();
});
