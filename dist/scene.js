import * as THREE from './vendor/three.module.min.js';
import {createRaftPresenter} from './presentation/scene/raft-presenter.js';
import {createCellLabel} from './presentation/materials/cell-label.js';
import { createRaftResources } from './presentation/models/raft.js';

let seed=2187;
const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
const scene=new THREE.Scene();
function skyTexture(){const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d'),im=ctx.createImageData(1024,512);const grid=Array.from({length:48*24},()=>rand());const noise=(x,y)=>{const xx=Math.floor(x),yy=Math.floor(y),u=x-xx,v=y-yy;const n=(a,b)=>grid[((a%48+48)%48)+((b%24+24)%24)*48];return n(xx,yy)*(1-u)*(1-v)+n(xx+1,yy)*u*(1-v)+n(xx,yy+1)*(1-u)*v+n(xx+1,yy+1)*u*v};for(let y=0;y<512;y++)for(let x=0;x<1024;x++){const n=noise(x/83,y/45)*.57+noise(x/39,y/22)*.28+noise(x/17,y/11)*.15;const cloud=Math.max(0,n-.35)*32;const grad=y/512;const i=(y*1024+x)*4;im.data[i]=15+grad*17+cloud;im.data[i+1]=35+grad*19+cloud;im.data[i+2]=49+grad*20+cloud;im.data[i+3]=255}ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}scene.background=skyTexture();
scene.fog=new THREE.FogExp2('#26475c',.012);
const camera=new THREE.OrthographicCamera(-15.8,15.8,8.9,-8.9,.1,180);
camera.position.set(0,19,26);camera.lookAt(0,0,-1.4);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(1672,941);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.getElementById('world').appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight('#b5d8ed','#1e1110',2.2);scene.add(hemi);
const moon=new THREE.DirectionalLight('#adcddd',2.5);moon.position.set(-8,15,-9);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-13,right:13,top:12,bottom:-12,near:1,far:40});moon.shadow.bias=-.002;moon.shadow.normalBias=.025;scene.add(moon);
const fill=new THREE.DirectionalLight('#edbe82',1.3);fill.position.set(-5,8,6);scene.add(fill);
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,flatShading:true});
const ropeMat=mat('#8b7149');
function mesh(geo,material,x,y,z,parent=scene,outline=false){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(outline){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,35),new THREE.LineBasicMaterial({color:'#251f1d',transparent:true,opacity:.65}));m.add(e)}return m}
function box(x,y,z,w,h,d,material,parent=scene,outline=true){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent,outline)}
function rod(a,b,r,material,parent=scene){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);const m=mesh(new THREE.CylinderGeometry(r,r*.95,from.distanceTo(to),7),material,0,0,0,parent,true);m.position.copy(from.clone().add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return m}
function rope(points,r=.027,parent=scene,material=ropeMat){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,5,false),material,0,0,0,parent)}

// Broad wave bands, warped fine ripples, breaking white caps and red reflected light.
const oceanMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},horizonFade:{value:new THREE.Vector2(-35,-25)}},vertexShader:`varying vec3 vWorld;uniform float time;void main(){vec3 p=position;float h=sin(p.x*.65+time*.75)*cos(p.y*.77+time*.44)*.13+sin(p.x*1.15+p.y*1.2+time)*.06;p.z+=h;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`precision highp float;varying vec3 vWorld;uniform float time;uniform vec2 horizonFade;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){float a=.5,n=0.;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+3.7;a*=.5;}return n;}
void main(){vec2 p=vWorld.xz;float t=time*.33;float warp=fbm(p*.55+vec2(t,-t));float n=fbm(p*vec2(1.5,3.)+vec2(warp*3.,t));float band=sin(p.y*3.+sin(p.x*1.8+t)*1.4+warp*4.+t);float ridges=pow(max(0.,1.-abs(band)),7.);float crest=smoothstep(.66,.81,n+band*.12);vec3 col=mix(vec3(.012,.055,.081),vec3(.038,.145,.209),n);col+=ridges*vec3(.07,.15,.18)*(.3+n);col=mix(col,vec3(.34,.5,.58),crest*.73);float foam=smoothstep(.7,.82,fbm(p*vec2(2.8,5.5)+vec2(t,warp*2.)))*ridges;col+=foam*vec3(.36,.45,.5);float raftDist=length((p-vec2(-5.1,1.8))*vec2(.78,1.));float wake=exp(-pow(raftDist-5.5,2.)*4.)*smoothstep(.38,.68,n)*.18;col+=wake*vec3(.5,.65,.7);float vd=length(p-vec2(7.,2.9));float red=exp(-vd*.45)*(.25+ridges)*.6;col+=vec3(.52,.015,.025)*red;float fog=smoothstep(5.,48.,-p.y);col=mix(col,vec3(.13,.24,.31),fog*.94);gl_FragColor=vec4(col,1.);}`});
const ocean=mesh(new THREE.PlaneGeometry(170,150,260,230),oceanMat,0,-.43,-20);ocean.rotation.x=-Math.PI/2;ocean.castShadow=false;ocean.receiveShadow=false;
oceanMat.transparent=true;oceanMat.fragmentShader=oceanMat.fragmentShader.replace('crest*.73','crest*.46').replace('vec3(.038,.145,.209)','vec3(.052,.17,.233)').replace('gl_FragColor=vec4(col,1.);','gl_FragColor=vec4(col,smoothstep(-16.5,-11.8,p.y));');
oceanMat.fragmentShader=oceanMat.fragmentShader.replace('vec2(7.,2.9)','vec2(7.,-.3)').replace('vec2(-5.1,1.8)','vec2(-5.1,-1.25)');
oceanMat.fragmentShader=oceanMat.fragmentShader.replace('smoothstep(-16.5,-11.8,p.y)','smoothstep(horizonFade.x,horizonFade.y,p.y)');

// Distant drowned architecture. Broken towers are silhouettes in the sea mist.
function rock(x,z,h=2,r=.5,parent=scene,material=mat('#142a37')){const g=new THREE.CylinderGeometry(r*.28,r,h,5,2);const a=g.attributes.position;for(let i=0;i<a.count;i++){a.setX(i,a.getX(i)+(rand()-.5)*r*.45);a.setZ(i,a.getZ(i)+(rand()-.5)*r*.4)}g.computeVertexNormals();const m=mesh(g,material,x,h*.5-.35,z,parent,true);m.rotation.z=(rand()-.5)*.17;m.rotation.y=rand()*6;return m}
const distantStone=mat('#284151');
for(let i=0;i<66;i++){const x=-25+rand()*50,z=-10-rand()*5;rock(x,z,.4+rand()*1.4,.18+rand()*.5,scene,distantStone)}
for(let i=0;i<10;i++){const x=-11+rand()*21,z=-11+rand()*2,h=.7+rand()*1.2;box(x,h*.5-.35,z,.35,h,.5,distantStone,scene,false);box(x,h*.65-.35,z,.7,.1,.7,distantStone,scene,false)}
for(const [x,z,h,r]of [[-13,-2,2.5,.7],[3.5,-5,2.2,.65],[12,6,2.1,.65],[14,1,1.8,.7],[-14,8,1.1,.9]])rock(x,z,h,r);
const guardian=new THREE.Group();guardian.position.set(1.3,0,-29);scene.add(guardian);const silhouette=mat('#203d4d');mesh(new THREE.SphereGeometry(2.1,10,8),silhouette,0,4,0,guardian);rock(-1.8,0,5,.5,guardian,silhouette);rock(1.8,0,5.6,.6,guardian,silhouette);for(let i=0;i<8;i++){const a=i*.78;rope([[Math.cos(a)*1.6,3.2,.5],[Math.cos(a)*2.5,1.7,.9],[Math.cos(a)*3.,0,1.4]],.24,guardian,silhouette)}const eye=mesh(new THREE.TorusGeometry(.34,.064,8,40),new THREE.MeshBasicMaterial({color:'#53c5d2'}),.4,4.9,1.91,guardian);const eyeLight=new THREE.PointLight('#40d5e8',6,7);eyeLight.position.set(.4,4.9,2.5);guardian.add(eyeLight);

// The root camp is decorative. Playable deck panels are entirely snapshot-driven.
const raftResources=createRaftResources({seed:2187});
const raftPresenter=createRaftPresenter({resources:raftResources,createLabel:createCellLabel});
export const raft=raftPresenter.root;raft.position.set(-3.8,0,-1.1);scene.add(raft);
guardian.position.set(.6,-.9,-9);guardian.scale.setScalar(.55);
silhouette.color.set('#1b3647');silhouette.roughness=1;eye.material.toneMapped=false;
raftPresenter.sync({cells:Array.from({length:12},(_,i)=>({id:`cell-${i%4}-${Math.floor(i/4)}`,x:i%4,z:Math.floor(i/4),state:'intact',label:`${i%4+1}-${Math.floor(i/4)+1}`})),units:[],defense:[],logistics:[]});
addEventListener('pagehide',()=>{raftPresenter.dispose();raftResources.dispose();},{once:true});

// A red whirlpool with several independent turbulent spiral arms.
const vortex=new THREE.Group();vortex.position.set(7,-.2,2.9);scene.add(vortex);
vortex.position.z=-.3;
const vortexMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float time;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float wave=sin(r*39.+a*4.-time*2.1+sin(a*8.+r*20.)*.8);float strand=pow(max(0.,wave),12.);float ring=exp(-abs(r-.29)*37.)+exp(-abs(r-.61)*42.)*.55;float fade=smoothstep(1.,.65,r);float alpha=(strand*.85+ring*.7+exp(-r*3.)*.15)*fade;gl_FragColor=vec4(vec3(1.,.026+strand*.12,.008)*alpha,alpha);}`});
const pool=mesh(new THREE.PlaneGeometry(8.8,8.8),vortexMat,0,.015,0,vortex);pool.rotation.x=-Math.PI/2;pool.castShadow=false;
vortexMat.fragmentShader=vortexMat.fragmentShader.replace('pow(max(0.,wave),12.)','pow(max(0.,wave),6.)').replace('strand*.85+ring*.7+exp(-r*3.)*.15','strand*.85+ring*.85+exp(-r*2.8)*.28').replace('vec3(1.,.026+strand*.12,.008)*alpha','vec3(1.,.04+strand*.18,.012)');
const redRock=mat('#221e29');redRock.emissive=new THREE.Color('#551521');redRock.emissiveIntensity=.35;
for(let i=0;i<7;i++){const a=i*2.4,r=2.9+rand()*.7;rock(Math.cos(a)*r,Math.sin(a)*r,1.1+rand()*2,.38+rand()*.38,vortex,redRock)}
for(let i=0;i<5;i++)rock((rand()-.5)*.9,(rand()-.5)*.6,1.1+rand()*2.9,.26+rand()*.28,vortex,redRock);
const firelight=new THREE.PointLight('#ff2920',20,12,1.5);firelight.position.set(0,.9,0);vortex.add(firelight);
firelight.intensity=40;
const particlesGeo=new THREE.BufferGeometry();const positions=new Float32Array(250*3);for(let i=0;i<250;i++){const a=rand()*Math.PI*2,r=.6+rand()*3.6;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=rand()*.75;positions[i*3+2]=Math.sin(a)*r}particlesGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const particles=new THREE.Points(particlesGeo,new THREE.PointsMaterial({color:'#ff5a2c',size:.045,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));vortex.add(particles);

const raycaster=new THREE.Raycaster();
export function pickTile(nx,ny){scene.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2(nx,ny),camera);return raycaster.intersectObjects(raftPresenter.getPickMeshes())[0]?.object.userData.tile??null;}
export function setSceneSelection(){} // Compatibility: cell picking no longer requires an armed card.
export function setSceneSettings(s){settings={...settings,...s};renderer.setPixelRatio(settings.quality==='high'?Math.min(devicePixelRatio,1.7):1);}
let settings={motion:true,quality:'high'};let pointer={x:0,y:0};
export function setPointer(x,y){pointer={x,y}}
export function resizeScene(w,h){renderer.setSize(w,h);}
let last=0;const start=performance.now();
function animate(now){requestAnimationFrame(animate);if(now-last<1000/(settings.quality==='high'?45:30))return;last=now;const t=settings.motion?(now-start)/1000:0;oceanMat.uniforms.time.value=t;vortexMat.uniforms.time.value=t;raft.rotation.z=Math.sin(t*.65)*.009;raft.rotation.x=Math.sin(t*.8)*.006;raft.position.y=Math.sin(t*.8)*.037;particles.rotation.y=-t*.14;eye.material.color.setHSL(.51,.6,.56+Math.sin(t)*.07);raftPresenter.decorations.light.intensity=3+Math.sin(t*7)*.3;if(settings.motion){camera.position.x=pointer.x*.12;camera.lookAt(pointer.x*.08,0,-1.4+pointer.y*.07)}renderer.render(scene,camera)}requestAnimationFrame(animate);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('scene-error',{detail:'画面连接中断，请刷新页面重试。'}))});
export function sceneInfo(){return{threeRevision:THREE.REVISION,objects:scene.children.length,geometries:renderer.info.memory.geometries,triangles:renderer.info.render.triangles,tiles:raftPresenter.cells.size,raftSummary:raftPresenter.summary,raftScale:raftPresenter.fit.scale,canvasWidth:renderer.domElement.width,canvasHeight:renderer.domElement.height}}
window.sceneInfo=sceneInfo;

// No rule writes, state entities never hold model or texture references.
export function syncDemo(view){raftPresenter.sync(view);}
export function getRaftSummary(){return raftPresenter.summary;}

export function getSpringScreenPosition(){camera.updateMatrixWorld();const p=vortex.getWorldPosition(new THREE.Vector3()).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}
