import * as THREE from '../../vendor/three.module.min.js';

export const ROOT_CONFIG=Object.freeze({width:7.6,depth:3.2,height:2,version:'v5'});
/** Display-only camp. Shared wooden resources are borrowed; everything else is private. */
export function createRaftRoot({resources}){
 if(!resources||resources.disposed)throw new Error('A live raft resource pool is required');
 const root=new THREE.Group();root.name='decorative-camp';root.userData={assetId:'model.raft-root',functional:false};
 const owned=new Set(),borrowed=new Set(Object.values(resources.geometries));
 const group=name=>{const g=new THREE.Group();g.name=name;root.add(g);return g;};
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});owned.add(m);return m;};
 const wood=resources.materials.wood,iron=material('#39444a',{metalness:.65,roughness:.63}),cloth=material('#c8bea2',{side:THREE.DoubleSide}),seam=material('#9b8662'),ropeMat=resources.materials.rope;
 const mesh=(geometry,mat,x,y,z,parent=root,scale=[1,1,1])=>{if(!borrowed.has(geometry))owned.add(geometry);const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(x,y,z,w,h,d,mat=wood[1],parent=root)=>mesh(resources.geometries.box,mat,x,y,z,parent,[w,h,d]);
 const rod=(from,to,r,mat=wood[1],parent=root)=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);const o=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),mat,0,0,0,parent);o.position.copy(a.clone().add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return o;};
 const rope=(points,r=.022,parent=root,mat=ropeMat)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,5,false),mat,0,0,0,parent);
 const surface=(points,indices,mat,parent)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>[(p[0]+1.4)/2.8,(p[2]+1.1)/2.2]),2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,0,0,0,parent);};

 // Staggered deck boards, end grain, floating logs, iron nails and mooring rails.
 const deck=group('deck'),nails=[];
 for(let row=0;row<8;row++){const z=-1.4+row*.4,join=row%2?-.8:.6;for(const [lo,hi] of [[-3.78,join-.012],[join+.012,3.78]]){box((lo+hi)/2,-.08,z,hi-lo,.16,.378,wood[row%wood.length],deck);for(const x of [lo+.09,hi-.09])for(const dz of [-.125,.125])nails.push([x,.013,z+dz]);}}
 const nailMesh=new THREE.InstancedMesh(resources.geometries.nail,iron,nails.length),matrix=new THREE.Matrix4();nails.forEach((p,i)=>{matrix.makeTranslation(...p);nailMesh.setMatrixAt(i,matrix);});deck.add(nailMesh);
 for(const z of [-1.25,1.25]){rod([-3.52,-.31,z],[3.52,-.31,z],.2,resources.materials.log,deck);for(const x of [-3.52,3.52]){const cap=mesh(new THREE.CircleGeometry(.18,12),resources.materials.end,x,-.31,z,deck);cap.rotation.y=x<0?-Math.PI/2:Math.PI/2;}}
 const mooring=group('mooring');for(const x of [-3.55,3.55])for(const z of [-1.35,1.35]){rod([x,.03,z],[x,.43,z],.065,wood[3],mooring);for(let i=0;i<3;i++)rope([[x-.09,.18+i*.045,z],[x,.16+i*.045,z+.09],[x+.09,.18+i*.045,z],[x,.2+i*.045,z-.09],[x-.09,.18+i*.045,z]],.018,mooring);}
 rope([[-3.55,.43,-1.35],[0,.26,-1.35],[3.55,.43,-1.35]],.025,mooring);

 // Fabric roof: real sag, UVs, ridge seams, two open entrance flaps and tension ropes.
 const tent=group('tent');tent.position.set(-1.4,0,-.1);
 const roofY=(u,v)=>.2+1.5*(1-u)-.10*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
 for(const side of [-1,1]){const points=[],indices=[],nx=10,nz=10;for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const u=i/nx,v=j/nz;points.push([side*1.35*u,roofY(u,v),-1.08+2.16*v]);}for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=i*(nz+1)+j;indices.push(a,a+1,a+nz+1,a+1,a+nz+2,a+nz+1);}surface(points,indices,cloth,tent);
  for(const z of [-1.08,1.08])rope([[0,1.7,z],[side*.67,.89,z],[side*1.35,.2,z]],.012,tent,seam);
  for(const z of [-1,1])rope([[side*1.33,.21,z],[side*1.48,.12,z+.1],[side*1.65,.03,z+.2]],.017,tent);
 }
 for(const z of [-1.08,1.08])rod([0,.03,z],[0,1.83,z],.046,wood[3],tent);rod([0,1.73,-1.17],[0,1.73,1.17],.045,wood[3],tent);
 surface([[-1.34,.18,1.08],[0,1.7,1.08],[-.28,.9,1.13],[-.55,.18,1.17]],[0,1,2,0,2,3],cloth,tent);
 surface([[1.34,.18,1.08],[0,1.7,1.08],[.28,.9,1.13],[.55,.18,1.17]],[0,2,1,0,3,2],cloth,tent);
 box(0,.08,.25,1.15,.08,1.1,material('#6a7169'),tent);box(0,.14,.73,1,.14,.36,material('#b5ab91'),tent);
 for(const x of [-.52,.52])rope([[x,.2,1.17],[x,.38,1.13]],.025,tent); // Tied entrance edges.

 // Slatted crates with framed lids, metal corner straps, diagonal braces and handles.
 const cargo=group('cargo-crates');
 function crate(cx,cy,cz,w,h,d){for(let i=0;i<4;i++)box(cx,cy+(i+.5)*h/4,cz,w,.94*h/4,d,wood[i%wood.length],cargo);for(const x of [-1,1])for(const z of [-1,1])box(cx+x*(w/2-.055),cy+h/2,cz+z*(d/2+.012),.1,h,.045,wood[3],cargo);for(let i=0;i<4;i++)box(cx-w/2+(i+.5)*w/4,cy+h+.025,cz,w/4-.015,.06,d+.04,wood[2],cargo);for(const x of [-1,1])box(cx+x*w*.32,cy+h/2,cz+d/2+.04,.05,h+.04,.025,iron,cargo);rod([cx-w*.4,cy+.08,cz+d/2+.07],[cx+w*.4,cy+h-.08,cz+d/2+.07],.037,wood[3],cargo);box(cx,cy+h*.6,cz+d/2+.08,w*.22,.045,.03,iron,cargo);}
 crate(.8,.02,.62,1.15,.72,.8);crate(.83,.8,.63,.85,.55,.66);crate(2.05,.02,.95,.92,.55,.67);
 const barrel=group('barrel');barrel.position.set(2.95,.48,.2);mesh(new THREE.CylinderGeometry(.32,.35,.92,12,3),wood[3],0,0,0,barrel);for(const y of [-.31,.25]){const band=mesh(new THREE.TorusGeometry(.346,.03,5,16),iron,0,y,0,barrel);band.rotation.x=Math.PI/2;}mesh(new THREE.CylinderGeometry(.31,.31,.04,12),wood[2],0,.48,0,barrel);

 // Suspended fishing net with actual sag, diamond weave and small cork floats.
 const net=group('fishing-net');const netPoint=(u,v)=>[.35+2.7*u,.26+1.01*v-.2*Math.sin(Math.PI*u)*v,-1.2+.16*Math.sin(Math.PI*u)*v];
 for(const x of [.35,3.05])rod([x,.02,-1.2],[x,1.34,-1.2],.045,wood[3],net);
 rope([netPoint(0,1),netPoint(.5,1),netPoint(1,1)],.035,net);
 for(const direction of [-1,1])for(let k=-6;k<=15;k++){const points=[];for(let j=0;j<=18;j++){const v=j/18,u=(k+direction*v*5)/15;if(u>=0&&u<=1)points.push(netPoint(u,v));}if(points.length>=2)rope(points,.009,net);}
 for(let i=0;i<8;i++){const p=netPoint((i+.5)/8,1);mesh(new THREE.SphereGeometry(.045,6,4),wood[2],...p,net);}
 // Loose coil by the crates.
 for(let i=0;i<4;i++){const coil=mesh(new THREE.TorusGeometry(.19+i*.012,.025,5,20),ropeMat,2.05,.06+i*.038,.12,cargo);coil.rotation.x=Math.PI/2;}
 rope([[2.27,.05,.12],[2.4,.035,.28],[2.45,.035,.64]],.025,cargo);

 // Lantern: roof, base, open metal cage, warm glass and a handle on a wooden post.
 const lantern=group('lantern');lantern.position.set(-3.23,0,.88);rod([0,.03,0],[0,1.46,0],.055,wood[3],lantern);rod([0,1.45,0],[.35,1.45,0],.04,iron,lantern);rope([[.35,1.45,0],[.35,1.32,0]],.013,lantern,iron);
 const glow=material('#ffdfaa',{emissive:'#ffb45e',emissiveIntensity:1.1,roughness:.3});mesh(new THREE.CylinderGeometry(.12,.12,.28,8),glow,.35,1.06,0,lantern);mesh(new THREE.ConeGeometry(.22,.18,8),iron,.35,1.3,0,lantern);mesh(new THREE.CylinderGeometry(.19,.19,.055,8),iron,.35,.88,0,lantern);
 for(let i=0;i<4;i++){const a=i*Math.PI/2,x=.35+Math.cos(a)*.15,z=Math.sin(a)*.15;rod([x,.89,z],[x,1.24,z],.017,iron,lantern);}
 const handle=mesh(new THREE.TorusGeometry(.08,.013,5,12,Math.PI),iron,.35,1.31,0,lantern);handle.rotation.z=0;
 const light=new THREE.PointLight('#ffb966',3,4.5,2);light.position.set(-2.88,1.1,.88);root.add(light);
 let disposed=false;return {root,light,dispose(){if(disposed)return;disposed=true;root.removeFromParent();owned.forEach(r=>r.dispose());root.clear();}};
}
