import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createPerspectiveView} from '../dist/presentation/scene/camera.js';
test('camera uses mild side perspective and preserves its base position during pointer motion',()=>{
 const view=createPerspectiveView({aspect:16/9});assert.equal(view.camera.isPerspectiveCamera,true);assert.ok(view.camera.position.x>1);assert.ok(view.camera.position.y<16);view.updatePointer(0,0);assert.equal(view.camera.position.x,3);view.resize(4/3);assert.equal(view.camera.aspect,4/3);view.camera.updateMatrixWorld();const near=new THREE.Vector3(0,0,2),far=new THREE.Vector3(0,0,-4);const span=z=>Math.abs(new THREE.Vector3(-1,0,z).project(view.camera).x-new THREE.Vector3(1,0,z).project(view.camera).x);assert.ok(span(near.z)>span(far.z));
});
