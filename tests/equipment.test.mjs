import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createEquipment} from '../dist/presentation/models/equipment.js';
test('all four equipment models fit one cell and dispose owned resources once',()=>{
 for(const id of ['C18','C19','C20','C21']){
  const model=createEquipment(id);const box=new THREE.Box3().setFromObject(model.root);assert.ok(box.max.x-box.min.x<2.3);assert.ok(box.max.z-box.min.z<2.25);
  model.setState('disabled');assert.equal(model.root.userData.state,'disabled');model.setState('wreck');assert.equal(model.root.children[0].visible,false);assert.equal(model.root.children[1].visible,true);model.setState('active');
  let count=0;const geometry=model.root.children[0].children[0].geometry;geometry.addEventListener('dispose',()=>count++);model.dispose();model.dispose();assert.equal(count,1);
 }
});
