import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import { createRaftResources, createRaft, createExpansionPanel, RAFT_CONFIG } from '../dist/presentation/models/raft.js';

test('panels stay inside their grid footprint and expose a flat deck anchor', () => {
  const resources = createRaftResources();
  const panel = createExpansionPanel({ resources, cellId: 'edge', seed: 42 });
  const bounds = new THREE.Box3().setFromObject(panel.root);
  assert.ok(bounds.max.x - bounds.min.x <= RAFT_CONFIG.pitchX);
  assert.ok(bounds.max.z - bounds.min.z <= RAFT_CONFIG.pitchZ);
  assert.equal(panel.anchors.deck.position.y, 0);
  assert.equal(panel.pickMesh.userData.cellId, 'edge');
  panel.dispose(); resources.dispose();
});

test('raft composes cells by coordinate; damaged and lost visuals can recover', () => {
  const resources = createRaftResources();
  const raft = createRaft({ resources, cells: [{id:'a',x:0,z:0},{id:'b',x:1,z:0}] });
  assert.equal(raft.cells.get('b').root.position.x, RAFT_CONFIG.pitchX);
  raft.addCell({id:'c',x:1,z:1});
  assert.equal(raft.cells.size, 3);
  assert.throws(() => raft.addCell({id:'duplicate',x:1,z:1}));
  assert.throws(() => raft.addCell({id:'remote',x:4,z:4}));
  const cell = raft.cells.get('c');
  cell.setState('damaged'); assert.equal(cell.root.userData.state, 'damaged');
  cell.setState('lost'); assert.equal(cell.root.visible, false);
  cell.setState('intact'); assert.equal(cell.root.visible, true);
  assert.throws(() => cell.setState('unknown'));
  raft.removeCell('c'); assert.equal(raft.cells.size, 2);
  raft.dispose(); resources.dispose();
});

test('seeded visual generation is repeatable and instances do not dispose shared resources', () => {
  const resources = createRaftResources({ seed: 19 });
  const a = createExpansionPanel({resources, seed: 17});
  const b = createExpansionPanel({resources, seed: 17});
  const transforms = panel => panel.root.children.map(o => [o.name, ...o.position.toArray(), ...o.rotation.toArray(), ...o.scale.toArray(), o.material?.color?.getHex()]);
  assert.deepEqual(transforms(a), transforms(b));
  let disposed = 0;
  resources.materials.wood[0].addEventListener('dispose', () => disposed++);
  a.dispose(); assert.equal(disposed, 0);
  assert.ok(b.root.children.length > 0);
  resources.dispose(); resources.dispose(); assert.equal(disposed, 1);
  b.dispose();
});

test('deck picking reports the cell and all mesh UVs and normals are finite', () => {
  const resources = createRaftResources();
  const panel = createExpansionPanel({resources, cellId:'pickable'});
  panel.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0,4,0), new THREE.Vector3(0,-1,0));
  const hit = ray.intersectObject(panel.pickMesh)[0];
  assert.equal(hit.object.userData.cellId, 'pickable');
  panel.root.traverse(object => {
    if(!object.isMesh)return;
    for(const attribute of ['position','normal','uv']) {
      const data = object.geometry.getAttribute(attribute);
      assert.ok(data, attribute);
      assert.ok(data.array.every(Number.isFinite));
    }
  });
  panel.dispose(); resources.dispose();
});
