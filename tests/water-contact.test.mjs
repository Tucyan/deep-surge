import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSeaHeight,sampleRaftPose,contactDistance} from '../dist/presentation/scene/water-contact.js';
test('raft samples the same waves as the ocean with restrained pitch and roll',()=>{
 const a=sampleRaftPose(-7.3,-1.1,9,10,0),b=sampleRaftPose(-7.3,-1.1,9,10,3);
 assert.notEqual(a.y,b.y);assert.ok(Math.abs(a.roll)<.06&&Math.abs(a.pitch)<.06);
 assert.ok(Math.abs(sampleSeaHeight(2,3,5)+.43)<=.27);
 assert.deepEqual(sampleRaftPose(-7.3,-1.1,9,10,0),a);
});
test('contact follows the union of active footprints, excluding internal edges and lost cells',()=>{
 const rects=[{x:0,z:0,w:2,d:2},{x:2,z:0,w:2,d:2}];
 assert.ok(contactDistance(1,0,rects)<-.9);assert.equal(contactDistance(3,0,rects),0);
 assert.ok(contactDistance(2,0,[rects[0]])>0);
});

import * as THREE from '../dist/vendor/three.module.min.js';
import {createWaterContact} from '../dist/presentation/scene/water-contact.js';
import {createRaftResources} from '../dist/presentation/models/raft.js';
import {createRaftPresenter} from '../dist/presentation/scene/raft-presenter.js';
import {createPerspectiveView} from '../dist/presentation/scene/camera.js';
test('waterline reconciles lost footprints and floating perspective picking stays aligned',()=>{
 const resources=createRaftResources(),presenter=createRaftPresenter({resources}),contact=createWaterContact();
 const view={cells:[{id:'a',x:0,z:0,state:'intact'},{id:'b',x:1,z:0,state:'lost'}],units:[],defense:[],logistics:[]};
 presenter.root.position.set(-7.3,0,-1.1);presenter.sync(view);assert.equal(presenter.getContactRects().length,2);
 contact.sync(presenter.getContactRects());assert.ok(contact.mesh.geometry.attributes.position.count>0);
 const pose=sampleRaftPose(-7.3,-1.1,8,6,3);presenter.root.position.y=pose.y;presenter.root.rotation.set(pose.pitch,0,pose.roll);presenter.root.updateMatrixWorld(true);
 const {camera}=createPerspectiveView();camera.updateMatrixWorld(true);const pick=presenter.getPickMeshes()[0],point=pick.getWorldPosition(new THREE.Vector3()).project(camera),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);assert.equal(ray.intersectObjects(presenter.getPickMeshes())[0].object.userData.cellId,'a');
 let geometryDisposals=0,materialDisposals=0;contact.mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);contact.mesh.material.addEventListener('dispose',()=>materialDisposals++);contact.dispose();contact.dispose();assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);presenter.dispose();resources.dispose();
});
