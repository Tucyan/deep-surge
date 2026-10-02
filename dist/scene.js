import * as THREE from './vendor/three.module.min.js';

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
const iron=mat('#242e34',.55),ropeMat=mat('#8b7149'),darkWood=mat('#322119'),nailMat=mat('#879088',.6),sailMat=mat('#b3a28a');sailMat.side=THREE.DoubleSide;

function woodTexture(){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#8c613c';ctx.fillRect(0,0,512,128);for(let i=0;i<420;i++){const y=rand()*128;ctx.strokeStyle=`rgba(${rand()>.5?'35,20,12':'202,151,85'},${.08+rand()*.24})`;ctx.lineWidth=rand()*2+.4;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<520;x+=15)ctx.lineTo(x,y+Math.sin(x*.018+i)*2.6);ctx.stroke()}for(let i=0;i<7;i++){ctx.strokeStyle='#45302170';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(rand()*512,rand()*128,11+rand()*24,2+rand()*2,.04,0,Math.PI*2);ctx.stroke()}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
const timber=woodTexture();
const woods=Array.from({length:7},(_,i)=>new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.075,.26,.35+i*.035),map:timber,roughness:.92}));
function mesh(geo,material,x,y,z,parent=scene,outline=false){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(outline){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,35),new THREE.LineBasicMaterial({color:'#251f1d',transparent:true,opacity:.65}));m.add(e)}return m}
function box(x,y,z,w,h,d,material,parent=scene,outline=true){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent,outline)}
function rod(a,b,r,material,parent=scene){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);const m=mesh(new THREE.CylinderGeometry(r,r*.95,from.distanceTo(to),7),material,0,0,0,parent,true);m.position.copy(from.clone().add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return m}
function rope(points,r=.027,parent=scene,material=ropeMat){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,5,false),material,0,0,0,parent)}

// Broad wave bands, warped fine ripples, breaking white caps and red reflected light.
const oceanMat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 vWorld;uniform float time;void main(){vec3 p=position;float h=sin(p.x*.65+time*.75)*cos(p.y*.77+time*.44)*.13+sin(p.x*1.15+p.y*1.2+time)*.06;p.z+=h;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`precision highp float;varying vec3 vWorld;uniform float time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){float a=.5,n=0.;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+3.7;a*=.5;}return n;}
void main(){vec2 p=vWorld.xz;float t=time*.33;float warp=fbm(p*.55+vec2(t,-t));float n=fbm(p*vec2(1.5,3.)+vec2(warp*3.,t));float band=sin(p.y*3.+sin(p.x*1.8+t)*1.4+warp*4.+t);float ridges=pow(max(0.,1.-abs(band)),7.);float crest=smoothstep(.66,.81,n+band*.12);vec3 col=mix(vec3(.012,.055,.081),vec3(.038,.145,.209),n);col+=ridges*vec3(.07,.15,.18)*(.3+n);col=mix(col,vec3(.34,.5,.58),crest*.73);float foam=smoothstep(.7,.82,fbm(p*vec2(2.8,5.5)+vec2(t,warp*2.)))*ridges;col+=foam*vec3(.36,.45,.5);float raftDist=length((p-vec2(-5.1,1.8))*vec2(.78,1.));float wake=exp(-pow(raftDist-5.5,2.)*4.)*smoothstep(.38,.68,n)*.18;col+=wake*vec3(.5,.65,.7);float vd=length(p-vec2(7.,2.9));float red=exp(-vd*.45)*(.25+ridges)*.6;col+=vec3(.52,.015,.025)*red;float fog=smoothstep(5.,48.,-p.y);col=mix(col,vec3(.13,.24,.31),fog*.94);gl_FragColor=vec4(col,1.);}`});
const ocean=mesh(new THREE.PlaneGeometry(170,150,260,230),oceanMat,0,-.43,-20);ocean.rotation.x=-Math.PI/2;ocean.castShadow=false;ocean.receiveShadow=false;
oceanMat.transparent=true;oceanMat.fragmentShader=oceanMat.fragmentShader.replace('crest*.73','crest*.46').replace('vec3(.038,.145,.209)','vec3(.052,.17,.233)').replace('gl_FragColor=vec4(col,1.);','gl_FragColor=vec4(col,smoothstep(-16.5,-11.8,p.y));');
oceanMat.fragmentShader=oceanMat.fragmentShader.replace('vec2(7.,2.9)','vec2(7.,-.3)').replace('vec2(-5.1,1.8)','vec2(-5.1,-1.25)');
oceanMat.fragmentShader=oceanMat.fragmentShader.replace('smoothstep(-16.5,-11.8,p.y)','smoothstep(-12.,-8.5,p.y)');

// Distant drowned architecture. Broken towers are silhouettes in the sea mist.
function rock(x,z,h=2,r=.5,parent=scene,material=mat('#142a37')){const g=new THREE.CylinderGeometry(r*.28,r,h,5,2);const a=g.attributes.position;for(let i=0;i<a.count;i++){a.setX(i,a.getX(i)+(rand()-.5)*r*.45);a.setZ(i,a.getZ(i)+(rand()-.5)*r*.4)}g.computeVertexNormals();const m=mesh(g,material,x,h*.5-.35,z,parent,true);m.rotation.z=(rand()-.5)*.17;m.rotation.y=rand()*6;return m}
for(let i=0;i<66;i++){const x=-36+rand()*74,z=-12-rand()*33;rock(x,z,.6+rand()*5,.22+rand()*.85)}
for(let i=0;i<10;i++){const x=-15+rand()*5,z=-22+rand()*4;box(x,rand()*1.5+1,z,.5,2+rand()*3,.7,mat('#1b3746'));box(x,1.5,z,.9,.12,.9,mat('#253c46'))}
for(const [x,z,h,r]of [[-13,-2,2.5,.7],[3.5,-5,2.2,.65],[12,6,2.1,.65],[14,1,1.8,.7],[-14,8,1.1,.9]])rock(x,z,h,r);
const guardian=new THREE.Group();guardian.position.set(1.3,0,-29);scene.add(guardian);const silhouette=mat('#203d4d');mesh(new THREE.SphereGeometry(2.1,10,8),silhouette,0,4,0,guardian);rock(-1.8,0,5,.5,guardian,silhouette);rock(1.8,0,5.6,.6,guardian,silhouette);for(let i=0;i<8;i++){const a=i*.78;rope([[Math.cos(a)*1.6,3.2,.5],[Math.cos(a)*2.5,1.7,.9],[Math.cos(a)*3.,0,1.4]],.24,guardian,silhouette)}const eye=mesh(new THREE.TorusGeometry(.34,.064,8,40),new THREE.MeshBasicMaterial({color:'#53c5d2'}),.4,4.9,1.91,guardian);const eyeLight=new THREE.PointLight('#40d5e8',6,7);eyeLight.position.set(.4,4.9,2.5);guardian.add(eyeLight);

export const raft=new THREE.Group();raft.position.set(-5.15,0,1.6);scene.add(raft);
raft.position.z=-1.25;raft.scale.setScalar(1.3);guardian.position.set(.6,0,-10.6);guardian.scale.setScalar(.7);
silhouette.color.set('#1b3647');silhouette.roughness=1;eye.material.toneMapped=false;
guardian.visible=false;
const tiles=[],selectable=[];
function makeTile(x,z){const group=new THREE.Group();group.position.set(x,0,z);raft.add(group);for(let j=0;j<6;j++){const m=box(0,.06+rand()*.015,-.9+j*.355,2.19,.24,.335,woods[Math.floor(rand()*7)],group);m.rotation.y=(rand()-.5)*.012}for(const xx of [-1.07,1.07]){box(xx,.23,0,.14,.13,2.2,woods[2],group);for(const zz of [-1,1]){const n=mesh(new THREE.CylinderGeometry(.056,.06,.045,8),nailMat,xx,.31,zz,group);n.castShadow=false}}box(0,-.13,0,2.3,.15,.2,darkWood,group);const hit=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({visible:false}));hit.rotation.x=-Math.PI/2;hit.position.y=.32;hit.userData.tile={x,z};group.add(hit);selectable.push(hit);tiles.push(group);return group}
for(let x=0;x<4;x++)for(let z=0;z<3;z++)makeTile((x-1.5)*2.3,(z-1)*2.25);
// Crosswise floating logs and dark bound framing.
for(const zz of [-3.5,3.5]){rod([-4.9,-.1,zz],[4.9,-.1,zz],.23,woods[1],raft);for(let i=0;i<9;i++){const xx=-4.4+i*1.1;box(xx,-.13,zz,.4,.63,.64,woods[Math.floor(rand()*3)],raft);for(const offset of [-.12,.12]){const b=mesh(new THREE.TorusGeometry(.34,.04,4,12),darkWood,xx+offset,-.13,zz,raft);b.rotation.y=Math.PI/2}mesh(new THREE.CylinderGeometry(.045,.045,.045,6),nailMat,xx,.2,zz,raft)}}
for(const xx of [-4.75,4.75]){rod([xx,-.13,-3.7],[xx,-.13,3.7],.24,woods[1],raft);for(let i=0;i<7;i++){const zz=-3.2+i*1.07;box(xx,-.1,zz,.69,.6,.34,woods[2],raft);rope([[xx-.22,.12,zz],[xx,.28,zz],[xx+.27,.1,zz]],.07,raft,darkWood)}}
for(let x=0;x<4;x++){const xx=(x-1.5)*2.3;box(xx,.324,2.25,.58,.014,.048,mat('#cfad7d'),raft,false);box(xx,.324,2.25,.05,.014,.57,mat('#cfad7d'),raft,false)}
for(let i=0;i<8;i++){const x=-4+i*1.1;box(x,.44,-3.25,.13,.75,.14,woods[1],raft);if(i<7)box(x+.5,.65,-3.25,1.08,.11,.1,woods[3],raft)}

const cloths=[];
function canopy(x,z,w,d,h){const g=new THREE.Group();g.position.set(x,0,z);raft.add(g);const corners=[[-w/2,0,-d/2],[w/2,0,-d/2],[-w/2,0,d/2],[w/2,0,d/2]];corners.forEach((p,i)=>{const ht=h+(i===0?.65:i===1?.2:0);rod([p[0],.2,p[2]],[p[0],ht,p[2]],.064,woods[1],g);box(p[0],ht-.06,p[2],.17,.11,.17,ropeMat,g);for(let k=0;k<3;k++){const band=mesh(new THREE.TorusGeometry(.068,.025,5,10),ropeMat,p[0],.63+k*.1,p[2],g);band.rotation.x=Math.PI/2}});const geo=new THREE.PlaneGeometry(w,d,16,12);geo.rotateX(-Math.PI/2);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const xx=a.getX(i)/w+.5,zz=a.getZ(i)/d+.5;a.setY(i,h+(1-xx)*.65*(1-zz)-Math.sin(xx*Math.PI)*Math.sin(zz*Math.PI)*.46+Math.sin(xx*8)*.02)}geo.computeVertexNormals();const c=mesh(geo,sailMat,0,0,0,g);cloths.push(c);const points=[[-w/2,h+.65,-d/2],[0,h+.31,-d/2],[w/2,h+.2,-d/2],[w/2,h,d/2],[0,h-.02,d/2],[-w/2,h,d/2],[-w/2,h+.65,-d/2]];rope(points,.035,g);rope([[-w/2,h+.65,-d/2],[-w*.65,h*.6,-d*.65],[-w*.8,.22,-d*.8]],.018,g);rope([[w/2,h+.2,-d/2],[w*.7,h*.5,-d*.7],[w*.8,.2,-d*.8]],.018,g);return g}
canopy(-2.8,-1.9,2.35,1.9,2.15);canopy(2,-1.35,2.25,1.6,1.45);
const triangleCloth=cloths[0].geometry.attributes.position;for(let i=0;i<triangleCloth.count;i++){const u=triangleCloth.getX(i)/2.35+.5,v=triangleCloth.getZ(i)/1.9+.5;triangleCloth.setX(i,-1.175+u*2.35*(1-v));}triangleCloth.needsUpdate=true;cloths[0].geometry.computeVertexNormals();

function barrel(x,z){const g=new THREE.Group();g.position.set(x,.25,z);raft.add(g);const points=[new THREE.Vector2(0,0),new THREE.Vector2(.29,0),new THREE.Vector2(.37,.22),new THREE.Vector2(.38,.52),new THREE.Vector2(.29,.8),new THREE.Vector2(0,.8)];mesh(new THREE.LatheGeometry(points,12),woods[2],0,0,0,g,true);for(const y of [.11,.65]){const ring=mesh(new THREE.TorusGeometry(y===.11?.34:.33,.04,5,12),iron,0,y,0,g);ring.rotation.x=Math.PI/2}for(let i=0;i<12;i++){const a=i/12*Math.PI*2;rope([[Math.sin(a)*.29,.01,Math.cos(a)*.29],[Math.sin(a)*.38,.4,Math.cos(a)*.38],[Math.sin(a)*.29,.8,Math.cos(a)*.29]],.012,g,darkWood)}mesh(new THREE.CylinderGeometry(.27,.27,.045,12),woods[4],0,.82,0,g)}
barrel(-.85,-2.6);barrel(-3.75,-1.5);
function chest(x,z,blue=false){const g=new THREE.Group();g.position.set(x,.28,z);raft.add(g);for(let i=0;i<5;i++)box(-.42+i*.21,.32,0,.2,.65,.67,blue?mat('#344d58'):woods[4],g);box(0,.71,0,1.06,.14,.72,blue?mat('#375667'):woods[3],g);for(const xx of [-.39,.39]){box(xx,.4,.36,.075,.78,.06,iron,g);box(xx,.78,0,.075,.05,.75,iron,g)}box(0,.43,.38,.17,.21,.06,nailMat,g);return g}
chest(1.76,-1.1);chest(3,-1.1,true);chest(-2.75,-1.8);

export function addPlant(x=3.4,z=2.25){const g=new THREE.Group();g.position.set(x,.22,z);raft.add(g);box(0,.08,0,1.14,.17,.92,mat('#362b1f'),g);for(const zz of [-.5,.5])for(let y=0;y<2;y++)box(0,.22+y*.19,zz,1.3,.16,.11,woods[3],g);for(const xx of [-.62,.62])for(let y=0;y<2;y++)box(xx,.22+y*.19,0,.1,.16,.95,woods[2],g);for(let i=0;i<14;i++){const xx=(rand()-.5)*.9,zz=(rand()-.5)*.7,ht=.4+rand()*.65;rod([xx,.15,zz],[xx+.1,.3+ht,zz],.015,mat('#5d7928'),g);for(let j=0;j<4;j++){const leaf=mesh(new THREE.SphereGeometry(1,5,4),mat(j%2?'#537b20':'#8ba633'),xx+(j%2?.13:-.13),.32+ht*j/4,zz,g);leaf.scale.set(.25,.045,.11);leaf.rotation.z=(j%2?1:-1)*.65;leaf.rotation.y=rand()*3}}return g}
addPlant();
const flames=[];
function lantern(x,z,h){const g=new THREE.Group();g.position.set(x,0,z);raft.add(g);rod([0,.2,0],[0,h+.4,0],.055,darkWood,g);rod([0,h+.4,0],[.27,h+.4,0],.025,iron,g);rod([.27,h+.4,0],[.27,h+.12,0],.02,iron,g);mesh(new THREE.ConeGeometry(.18,.15,6),iron,.27,h+.05,0,g);const glowing=new THREE.MeshBasicMaterial({color:'#ffd972'});mesh(new THREE.CylinderGeometry(.11,.1,.29,6),glowing,.27,h-.14,0,g);mesh(new THREE.CylinderGeometry(.17,.16,.06,6),iron,.27,h-.31,0,g);for(let i=0;i<4;i++){const a=i*Math.PI/2;rod([.27+Math.cos(a)*.13,h-.31,Math.sin(a)*.13],[.27+Math.cos(a)*.13,h+.01,Math.sin(a)*.13],.017,iron,g)}const light=new THREE.PointLight('#ff9e37',10,5,1.7);light.position.set(.27,h-.12,0);g.add(light);flames.push(light);const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');const grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,182,62,.65)');grad.addColorStop(.2,'rgba(255,145,30,.3)');grad.addColorStop(1,'rgba(255,100,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.position.set(.27,h-.14,0);sprite.scale.set(1.4,1.4,1.4);g.add(sprite)}
lantern(-4,-2.4,1.9);lantern(-3.3,-.6,.63);

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

const raycaster=new THREE.Raycaster();let hovered=null;
const tileHighlight=new THREE.Mesh(new THREE.PlaneGeometry(2.05,2.05),new THREE.MeshBasicMaterial({color:'#6ee6e9',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));tileHighlight.rotation.x=-Math.PI/2;tileHighlight.position.y=.38;tileHighlight.visible=false;raft.add(tileHighlight);
export function pickTile(nx,ny){raycaster.setFromCamera(new THREE.Vector2(nx,ny),camera);const hits=raycaster.intersectObjects(selectable);hovered=hits[0]?.object.userData.tile??null;tileHighlight.visible=!!hovered&&!!window.gameState?.selected;if(hovered){tileHighlight.position.x=hovered.x;tileHighlight.position.z=hovered.z}return hovered}
export function expandRaft(){makeTile(5.75,2.25);rod([6.9,-.13,1.12],[6.9,-.13,3.4],.23,woods[1],raft);}
export function setSceneSettings(s){settings={...settings,...s};renderer.setPixelRatio(settings.quality==='high'?Math.min(devicePixelRatio,1.7):1);}
let settings={motion:true,quality:'high'};let pointer={x:0,y:0};
export function setPointer(x,y){pointer={x,y}}
export function resizeScene(w,h){renderer.setSize(w,h,false);}
let last=0;const start=performance.now();
function animate(now){requestAnimationFrame(animate);if(now-last<1000/(settings.quality==='high'?45:30))return;last=now;const t=settings.motion?(now-start)/1000:0;oceanMat.uniforms.time.value=t;vortexMat.uniforms.time.value=t;raft.rotation.z=Math.sin(t*.65)*.009;raft.rotation.x=Math.sin(t*.8)*.006;raft.position.y=Math.sin(t*.8)*.037;particles.rotation.y=-t*.14;eye.material.color.setHSL(.51,.6,.56+Math.sin(t)*.07);flames.forEach((l,i)=>l.intensity=10+Math.sin(t*7+i)*1.2);if(settings.motion){camera.position.x=pointer.x*.12;camera.lookAt(pointer.x*.08,0,-1.4+pointer.y*.07)}renderer.render(scene,camera)}requestAnimationFrame(animate);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('scene-error',{detail:'画面连接中断，请刷新页面重试。'}))});
export function sceneInfo(){return{threeRevision:THREE.REVISION,objects:scene.children.length,geometries:renderer.info.memory.geometries,triangles:renderer.info.render.triangles,tiles:tiles.length,canvasWidth:renderer.domElement.width,canvasHeight:renderer.domElement.height}}
window.sceneInfo=sceneInfo;
