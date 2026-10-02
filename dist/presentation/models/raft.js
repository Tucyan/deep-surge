import * as THREE from '../../vendor/three.module.min.js';

/** Procedural asset v1. Y up; cell origin is the deck centre at Y=0. */
export const RAFT_CONFIG = Object.freeze({ pitchX: 2.3, pitchZ: 2.25, planks: 7, seed: 2187 });
const random = seed => {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
};

/** Shared GPU resources. Dispose only after all panels using this pool are removed. */
export function createRaftResources({ seed = RAFT_CONFIG.seed } = {}) {
  const rng = random(seed), width = 256, height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const stripe = rng() * 18;
    for (let x = 0; x < width; x++) {
      const grain = Math.sin(y * 2.4 + Math.sin(x * .034) * 1.2) * 14 + stripe + rng() * 7;
      const knot = Math.exp(-((x-171)**2/270 + (y-31-Math.sin(x*.04)*2)**2/18));
      const i = (y * width + x) * 4;
      pixels[i] = 135 + grain - knot * 50;
      pixels[i+1] = 98 + grain * .8 - knot * 38;
      pixels[i+2] = 62 + grain * .55 - knot * 25;
      pixels[i+3] = 255;
    }
  }
  const woodTexture = new THREE.DataTexture(pixels, width, height);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.magFilter = THREE.LinearFilter;
  woodTexture.minFilter = THREE.LinearMipmapLinearFilter;
  woodTexture.generateMipmaps = true; woodTexture.needsUpdate = true;
  const wood = ['#b99a70','#ac895e','#c1a47b','#9b7954','#b18e63'].map(color =>
    new THREE.MeshStandardMaterial({color, map: woodTexture, roughness: .92}));
  const materials = {
    wood,
    log: new THREE.MeshStandardMaterial({color:'#665039', map:woodTexture, roughness:.97}),
    end: new THREE.MeshStandardMaterial({color:'#a28459', roughness:1}),
    rope: new THREE.MeshStandardMaterial({color:'#b8a07a', roughness:1}),
    metal: new THREE.MeshStandardMaterial({color:'#514d43', metalness:.65, roughness:.72}),
    split: new THREE.MeshStandardMaterial({color:'#38291d', roughness:1}),
    pick: new THREE.MeshBasicMaterial({visible:false, side:THREE.DoubleSide}),
  };
  // A bevelled plank, normalized once and reused by every cell.
  const shape = new THREE.Shape();
  shape.moveTo(-.5,-.5); shape.lineTo(.5,-.5); shape.lineTo(.5,.5); shape.lineTo(-.5,.5); shape.closePath();
  const plank = new THREE.ExtrudeGeometry(shape, {depth:1, bevelEnabled:true, bevelThickness:.03, bevelSize:.025, bevelSegments:1, steps:1, curveSegments:1});
  plank.rotateX(-Math.PI/2);
  plank.translate(0,-.5,0);
  const geometries = {
    plank, box:new THREE.BoxGeometry(1,1,1),
    log:new THREE.CylinderGeometry(.145,.16,2.12,10,1),
    cap:new THREE.CylinderGeometry(.13,.13,.012,10),
    ring:new THREE.TorusGeometry(.162,.018,4,12),
    nail:new THREE.CylinderGeometry(.019,.019,.013,6),
    pick:new THREE.PlaneGeometry(RAFT_CONFIG.pitchX-.04,RAFT_CONFIG.pitchZ-.04),
  };
  let disposed = false;
  return { materials, geometries, woodTexture,
    get disposed() { return disposed; },
    dispose() {
      if (disposed) return;
      disposed = true;
      Object.values(geometries).forEach(g => g.dispose());
      [...wood,...Object.values(materials).filter(m => !Array.isArray(m))].forEach(m => m.dispose());
      woodTexture.dispose();
    },
  };
}

/** One expansion panel. Owns its hierarchy, borrows all GPU resources from resources. */
export function createExpansionPanel({resources, cellId='panel', seed=RAFT_CONFIG.seed, state='intact'} = {}) {
  if (!resources || resources.disposed) throw new Error('A live raft resource pool is required');
  const {materials:m, geometries:g} = resources;
  const rng = random(seed), root = new THREE.Group();
  root.name = 'raft-panel'; root.userData = {assetId:'model.raft-expansion-panel', cellId};
  const mesh = (name, geometry, material, position, scale=[1,1,1]) => {
    const object = new THREE.Mesh(geometry,material);
    object.name = name; object.position.set(...position); object.scale.set(...scale);
    object.castShadow = true; object.receiveShadow = true; root.add(object); return object;
  };
  const boards=[];
  for(let i=0;i<RAFT_CONFIG.planks;i++) {
    const board = mesh('deck-plank-'+i,g.plank,m.wood[Math.floor(rng()*m.wood.length)],
      [0,-.078,-.91+i*.303], [2.09,.145,.275]);
    board.rotation.y = (rng()-.5)*.008; boards.push(board);
    for(const x of [-.79,.79]) mesh('iron-nail',g.nail,m.metal,[x,.002,board.position.z]);
  }
  for(const z of [-.71,.71]) {
    const log=mesh('floating-log',g.log,m.log,[0,-.26,z]); log.rotation.z=Math.PI/2;
    for(const x of [-1.065,1.065]) {
      const end=mesh('end-grain',g.cap,m.end,[x,-.26,z]);end.rotation.z=Math.PI/2;
      for(const radius of [.045,.086]) {
        const ring=mesh('growth-ring',g.ring,m.split,[x*1.006,-.26,z],[radius/.162,radius/.162,.23]);
        ring.rotation.y=Math.PI/2;
      }
    }
    for(const x of [-.78,.78]) for(const offset of [-.026,.026]) {
      const ring=mesh('rope-lashing',g.ring,m.rope,[x+offset,-.26,z]);ring.rotation.y=Math.PI/2;
    }
  }
  for(const x of [-.78,.78]) mesh('underside-batten',g.box,m.log,[x,-.15,0],[.12,.12,1.95]);
  for(const z of [-.93,.93]) {
    mesh('rope-cross-tie',g.box,m.rope,[0,-.025,z],[1.85,.025,.035]);
    for(const x of [-.79,.79]) mesh('splice-bracket',g.box,m.metal,[x,.012,z],[.16,.023,.12]);
  }
  // Fracture slivers are hidden when intact; no continuous hull HP is introduced.
  const splits=[];
  for(let i=0;i<3;i++) {
    const split=mesh('fracture',g.box,m.split,[.25+i*.09,.004,-.08+i*.06],[.018,.014,.23]);
    split.rotation.y=-.6+i*.15; splits.push(split);
  }
  // Instance repeated rigid details by shared geometry/material; boards remain mutable.
  const batches = new Map();
  for (const object of [...root.children]) {
    if (boards.includes(object) || splits.includes(object)) continue;
    const key=object.geometry.uuid+':'+object.material.uuid;
    if(!batches.has(key))batches.set(key,[]);
    batches.get(key).push(object);
  }
  const instanceMeshes=[];
  for(const objects of batches.values()) {
    const first=objects[0];
    const batch=new THREE.InstancedMesh(first.geometry,first.material,objects.length);
    batch.name='details-'+first.name;batch.castShadow=true;batch.receiveShadow=true;
    objects.forEach((object,index)=>{object.updateMatrix();batch.setMatrixAt(index,object.matrix);root.remove(object);});
    batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch);instanceMeshes.push(batch);
  }
  const deck = new THREE.Object3D();deck.name='deck-anchor';root.add(deck);
  const pickMesh=mesh('cell-pick-proxy',g.pick,m.pick,[0,.04,0]);
  pickMesh.rotation.x=-Math.PI/2;pickMesh.castShadow=false;pickMesh.receiveShadow=false;
  pickMesh.userData={cellId};
  let disposed=false;
  const setState = value => {
    if(!['intact','damaged','lost'].includes(value)) throw new Error('Unknown raft cell state');
    root.userData.state=value; root.visible=value!=='lost';
    splits.forEach(split => split.visible=value==='damaged');
    boards.forEach((board,i) => {
      board.rotation.z=value==='damaged' && i>=3 && i<=5 ? (i-4.5)*.035 : 0;
      board.position.y=-.078-(value==='damaged' && i===4 ? .05 : 0);
    });
  };
  setState(state);
  return { root, pickMesh, anchors:{deck}, setState,
    dispose() { if(disposed)return; disposed=true;instanceMeshes.forEach(mesh=>mesh.dispose());root.removeFromParent();root.clear(); },
  };
}

/** A coordinate-based raft assembly. The caller owns gameplay legality and the resource pool. */
export function createRaft({resources, cells=[{id:'0:0',x:0,z:0},{id:'1:0',x:1,z:0},{id:'0:1',x:0,z:1},{id:'1:1',x:1,z:1}], seed=RAFT_CONFIG.seed} = {}) {
  const root=new THREE.Group();root.name='modular-raft';root.userData.assetId='model.raft';
  const panels=new Map();
  const addCell = ({id,x,z,state='intact'}, requireNeighbor=true) => {
    if(!Number.isInteger(x)||!Number.isInteger(z)||typeof id!=='string'||!id)throw new Error('Invalid cell coordinate or ID');
    if(panels.has(id)||[...panels.values()].some(p=>p.x===x&&p.z===z))throw new Error('Duplicate raft cell');
    if(requireNeighbor && panels.size && ![...panels.values()].some(p=>Math.abs(p.x-x)+Math.abs(p.z-z)===1))throw new Error('Expansion must share an edge');
    const panel=createExpansionPanel({resources,cellId:id,state,seed:(seed ^ Math.imul(x,73856093) ^ Math.imul(z,19349663))>>>0});
    panel.x=x;panel.z=z;panel.root.position.set(x*RAFT_CONFIG.pitchX,0,z*RAFT_CONFIG.pitchZ);
    panels.set(id,panel);root.add(panel.root);return panel;
  };
  try { cells.forEach(cell=>addCell(cell,false)); }
  catch(error) {panels.forEach(panel=>panel.dispose());throw error;}
  return { root, cells:panels, addCell,
    removeCell(id) {const panel=panels.get(id);if(panel){panel.dispose();panels.delete(id);}},
    dispose() {panels.forEach(panel=>panel.dispose());panels.clear();root.removeFromParent();},
  };
}
