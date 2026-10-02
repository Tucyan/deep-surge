import * as THREE from '../../vendor/three.module.min.js';
/** Four first-layer equipment silhouettes. Each instance owns all its GPU resources. */
export function createEquipment(definitionId){
 const root=new THREE.Group();root.userData.assetId='model.equipment.'+(definitionId==='T01'?'c18':definitionId.toLowerCase());
 const normal=new THREE.Group(),wreck=new THREE.Group();root.add(normal,wreck);const owned=new Set();
 const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9});owned.add(m);return m;};
 const wood=material('#8d6844'),iron=material('#45515a'),rope=material('#b39b70'),cloth=material('#a9bbb6');
 const add=(geometry,mat,x,y,z,parent=normal)=>{owned.add(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(x,y,z,w,h,d,mat=wood,parent=normal)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
 const rod=(a,b,r,mat=wood)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);const mesh=add(new THREE.CylinderGeometry(r,r,from.distanceTo(to),6),mat,0,0,0);mesh.position.copy(from.clone().add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return mesh;};
 if(['C18','T01'].includes(definitionId)){for(let i=0;i<5;i++)box(-.44+i*.22,.53,0,.205,1.02,.11);for(const y of [.26,.8])box(0,y,.075,1.18,.1,.1,iron);rod([-.42,.03,.38],[-.42,.8,0],.05);rod([.42,.03,.38],[.42,.8,0],.05);}
 if(definitionId==='C19'){box(0,.12,0,.85,.23,.55);rod([0,.2,0],[0,.73,0],.065,iron);box(0,.78,0,.14,.12,1.03);rod([-.58,.78,-.26],[0,.78,-.4],.04);rod([0,.78,-.4],[.58,.78,-.26],.04);rod([-.58,.78,-.26],[.58,.78,-.26],.014,rope);box(0,.85,-.19,.023,.023,.77,iron);}
 if(definitionId==='C20'){for(const x of [-.5,.5])rod([x,.02,0],[x,.96,0],.045);rod([-.5,.96,0],[.5,.96,0],.045);for(let i=0;i<7;i++){const x=-.45+i*.15;rod([x,.93,0],[x*.75,.2,.31],.012,rope);}for(let i=0;i<6;i++)rod([-.44,i*.12+.25,.18],[.44,i*.12+.25,.18],.012,rope);box(0,.08,.4,.92,.14,.4);}
 if(definitionId==='C21'){for(const x of [-.48,.48])for(const z of [-.38,.38])rod([x,0,z],[x,1.2,z],.04);const tray=add(new THREE.ConeGeometry(.76,.5,4,1,true),cloth,0,.94,0);tray.rotation.z=Math.PI;tray.rotation.y=Math.PI/4;cloth.side=THREE.DoubleSide;add(new THREE.CylinderGeometry(.34,.29,.55,12),wood,0,.28,0);const water=material('#4fa7b5');add(new THREE.CircleGeometry(.3,12),water,0,.565,0).rotation.x=-Math.PI/2;}
 for(let i=0;i<4;i++){const plank=box((i-1.5)*.17,.1,0,.18,.13,.7,wood,wreck);plank.rotation.y=i*.54;}
 const muzzle=new THREE.Object3D();muzzle.position.set(0,.84,-.7);root.add(muzzle);
 const baseColors=new Map([wood,iron,rope,cloth].map(m=>[m,m.color.clone()]));
 const setState=state=>{normal.visible=state!=='wreck';wreck.visible=state==='wreck';baseColors.forEach((color,m)=>m.color.copy(color).multiplyScalar(state==='disabled'?.45:1));root.userData.state=state;};
 setState('active');let disposed=false;
 return {root,anchors:{muzzle},setState,dispose(){if(disposed)return;disposed=true;root.removeFromParent();owned.forEach(o=>o.dispose());root.clear();}};
}
