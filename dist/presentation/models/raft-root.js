import * as THREE from '../../vendor/three.module.min.js';

export const ROOT_CONFIG=Object.freeze({width:4.4,depth:1.65,height:1.25});
/** Small display-only camp. Borrows wood materials, owns every other GPU resource. */
export function createRaftRoot({resources}){
 const root=new THREE.Group();root.userData={assetId:'model.raft-root',functional:false};
 const owned=new Set();
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});owned.add(m);return m;};
 const wood=resources.materials.wood[1],iron=material('#45505a'),cloth=material('#b0aa88',{side:THREE.DoubleSide}),net=material('#b09a74');
 const mesh=(geometry,mat,x,y,z)=>{owned.add(geometry);const object=new THREE.Mesh(geometry,mat);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;root.add(object);return object;};
 const box=(x,y,z,w,h,d,mat=wood)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const rod=(from,to,r,mat=wood)=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);const object=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),6),mat,0,0,0);object.position.copy(a.clone().add(b).multiplyScalar(.5));object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return object;};
 for(let i=0;i<7;i++)box(0,-.07,-.69+i*.23,4.4,.14,.21);
 for(const z of [-.55,.55])rod([-2.1,-.25,z],[2.1,-.25,z],.14);
 // One low tent, contained within the root platform; no canopy over playable cells.
 const vertices=[-1.65,.08,-.57,-.75,1.05,-.57,-1.65,.08,.57,-.75,1.05,-.57,-.75,1.05,.57,-1.65,.08,.57,-.75,1.05,-.57,.15,.08,-.57,-.75,1.05,.57,.15,.08,-.57,.15,.08,.57,-.75,1.05,.57];
 const canopy=new THREE.BufferGeometry();canopy.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));canopy.computeVertexNormals();mesh(canopy,cloth,0,0,0);
 for(const z of [-.58,.58])rod([-.75,.03,z],[-.75,1.1,z],.035);
 rod([-.75,1.1,-.58],[-.75,1.1,.58],.035);
 // Crate, bundled rope and fishing net are decoration only.
 box(.75,.22,.32,.7,.44,.6);for(const x of [.51,.99])box(x,.24,.64,.05,.46,.035,iron);box(.75,.46,.32,.74,.05,.63);
 rod([1.15,0,-.58],[1.15,.75,-.58],.035);rod([1.95,0,-.58],[1.95,.75,-.58],.035);rod([1.15,.75,-.58],[1.95,.75,-.58],.03);
 for(let i=0;i<=6;i++){const x=1.15+i*.8/6;rod([x,.15,-.58],[x,.72,-.58],.008,net);const y=.15+i*.57/6;rod([1.15,y,-.58],[1.95,y,-.58],.008,net);}
 for(let i=0;i<3;i++){const ring=mesh(new THREE.TorusGeometry(.13,.025,4,12),net,1.45,.065+i*.03,.35);ring.rotation.x=Math.PI/2;}
 rod([-1.95,.05,.43],[-1.95,.72,.43],.03,iron);box(-1.95,.56,.43,.16,.22,.16,iron);
 const flame=material('#ffda91',{emissive:'#ffc26a',emissiveIntensity:1});box(-1.95,.56,.525,.11,.14,.015,flame);
 const light=new THREE.PointLight('#ffb966',3,3,2);light.position.set(-1.95,.62,.48);root.add(light);
 let disposed=false;return {root,light,dispose(){if(disposed)return;disposed=true;root.removeFromParent();owned.forEach(r=>r.dispose());root.clear();}};
}
