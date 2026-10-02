import * as THREE from '../vendor/three.module.min.js';
import {createRaftResources, createRaft, createExpansionPanel, RAFT_CONFIG} from './models/raft.js';

const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1d26');scene.fog=new THREE.Fog('#0b1d26',26,55);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,80);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.querySelector('#viewport').append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#c6e8ed','#423c32',2.5));
const sun=new THREE.DirectionalLight('#ffdfaa',3.5);sun.position.set(-6,12,6);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12});sun.shadow.normalBias=.02;scene.add(sun);
const rim=new THREE.DirectionalLight('#8fc9e0',2);rim.position.set(5,5,-8);scene.add(rim);
const resources=createRaftResources();
const raft=createRaft({resources});raft.root.position.set(-4.3,.17,-1.15);scene.add(raft.root);
const panel=createExpansionPanel({resources,cellId:'preview',seed:81});panel.root.position.set(3.1,.17,0);panel.root.rotation.y=-.12;scene.add(panel.root);
const seaGeometry=new THREE.PlaneGeometry(90,90,90,90);seaGeometry.rotateX(-Math.PI/2);
const seaMaterial=new THREE.MeshStandardMaterial({color:'#1d4e5a',roughness:.38,metalness:.3});
const sea=new THREE.Mesh(seaGeometry,seaMaterial);sea.position.y=-.18;sea.receiveShadow=true;scene.add(sea);
const seaPosition=seaGeometry.attributes.position, basePositions=seaPosition.array.slice();
let distance=18, azimuth=.55,elevation=.72, dragging=false,previous, animation, frame=0;
const target=new THREE.Vector3(.25,0,0);
function updateCamera(){camera.position.set(target.x+Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,target.z+Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(target);}
updateCamera();
renderer.domElement.addEventListener('pointerdown',event=>{dragging=true;previous=[event.clientX,event.clientY];renderer.domElement.setPointerCapture(event.pointerId);});
renderer.domElement.addEventListener('pointermove',event=>{if(!dragging)return;azimuth-=(event.clientX-previous[0])*.006;elevation=THREE.MathUtils.clamp(elevation+(event.clientY-previous[1])*.005,.15,1.45);previous=[event.clientX,event.clientY];updateCamera();});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.015,9,30);updateCamera();},{passive:false});
const stateButtons=[...document.querySelectorAll('[data-state]')];
stateButtons.forEach(button=>button.addEventListener('click',()=>{panel.setState(button.dataset.state);stateButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
let expansion=0;
document.querySelector('#extend').addEventListener('click',()=>{
  if(expansion>=2)return;
  const x=2+Math.floor(expansion/2),z=expansion%2;raft.addCell({id:`expansion-${expansion}`,x,z});expansion++;
  document.querySelector('#extend').disabled=expansion===2;
});
document.querySelector('#reset').addEventListener('click',()=>{
  for(let i=0;i<expansion;i++)raft.removeCell(`expansion-${i}`);expansion=0;
  document.querySelector('#extend').disabled=false;stateButtons[0].click();distance=18;azimuth=.55;elevation=.72;updateCamera();
});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
function render(now){
  const time=document.querySelector('#motion').checked?now*.001:0;
  raft.root.position.y=.17+Math.sin(time*.9)*.035;raft.root.rotation.z=Math.sin(time*.65)*.009;
  panel.root.position.y=.17+Math.sin(time*.9+.6)*.035;panel.root.rotation.z=Math.sin(time*.7)*.012;
  for(let i=0;i<seaPosition.count;i++)seaPosition.setY(i,Math.sin(basePositions[i*3]*1.7+time)*Math.cos(basePositions[i*3+2]*1.4+time*.7)*.025);
  seaPosition.needsUpdate=true;if(frame++%6===0)seaGeometry.computeVertexNormals();
  renderer.render(scene,camera);
  document.querySelector('#metrics').textContent=`${raft.cells.size} 格 · ${renderer.info.render.triangles.toLocaleString()} 三角面 · ${renderer.info.render.calls} draw calls`;
  animation=requestAnimationFrame(render);
}
animation=requestAnimationFrame(render);
addEventListener('pagehide',()=>{cancelAnimationFrame(animation);removeEventListener('resize',resize);raft.dispose();panel.dispose();resources.dispose();seaGeometry.dispose();seaMaterial.dispose();renderer.dispose();},{once:true});
