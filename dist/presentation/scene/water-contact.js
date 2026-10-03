import * as THREE from '../../vendor/three.module.min.js';
export const WATER_CONTACT_CONFIG=Object.freeze({seaY:-.43,oceanZ:-20,draftOffset:.16,foamWidth:.32});
export const SEA_WAVE_GLSL=`float seaHeight(vec2 p,float t){vec2 q=vec2(p.x,-(p.y+20.));return -.43+sin(q.x*.65+t*.75)*cos(q.y*.77+t*.44)*.13+sin(q.x*1.15+q.y*1.2+t)*.06+sin(p.x*.18+p.y*.14+t*.8)*.08;}`;
export function sampleSeaHeight(x,z,t){const q=-(z+20);return -.43+Math.sin(x*.65+t*.75)*Math.cos(q*.77+t*.44)*.13+Math.sin(x*1.15+q*1.2+t)*.06+Math.sin(x*.18+z*.14+t*.8)*.08;}
export function sampleRaftPose(x,z,w,d,t){
 let sum=0;for(const dx of [-w/2,0,w/2])for(const dz of [-d/2,0,d/2])sum+=sampleSeaHeight(x+dx,z+dz,t);
 return {y:sum/9+WATER_CONTACT_CONFIG.draftOffset,roll:Math.atan2(sampleSeaHeight(x+w/2,z,t)-sampleSeaHeight(x-w/2,z,t),w),pitch:-Math.atan2(sampleSeaHeight(x,z+d/2,t)-sampleSeaHeight(x,z-d/2,t),d)};
}
const inside=(x,z,r)=>Math.abs(x-r.x)<r.w/2+1e-6&&Math.abs(z-r.z)<r.d/2+1e-6;
/** Split every boundary at overlaps; suppress shared edges, including the camp. */
export function exposedEdges(rects){
 const edges=[];
 for(const r of rects)for(const [axis,fixed,lo,hi,normal] of [['x',r.z-r.d/2,r.x-r.w/2,r.x+r.w/2,-1],['x',r.z+r.d/2,r.x-r.w/2,r.x+r.w/2,1],['z',r.x-r.w/2,r.z-r.d/2,r.z+r.d/2,-1],['z',r.x+r.w/2,r.z-r.d/2,r.z+r.d/2,1]]){
  const cuts=[lo,hi,...rects.flatMap(b=>axis==='x'?[b.x-b.w/2,b.x+b.w/2]:[b.z-b.d/2,b.z+b.d/2]).filter(n=>n>lo&&n<hi)].sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){const a=cuts[i-1],b=cuts[i];if(b-a<1e-5)continue;const m=(a+b)/2,x=axis==='x'?m:fixed+normal*.001,z=axis==='x'?fixed+normal*.001:m;if(rects.some(c=>inside(x,z,c)))continue;edges.push(axis==='x'?{a:[a,fixed],b:[b,fixed],n:[0,normal]}:{a:[fixed,a],b:[fixed,b],n:[normal,0]});}
 }
 return edges;
}
export function contactDistance(x,z,rects){let distance=Infinity;for(const {a,b} of exposedEdges(rects)){const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));distance=Math.min(distance,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz));}return distance===0?0:rects.some(r=>inside(x,z,r))?-distance:distance;}
export function createWaterContact(){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:`uniform float time;varying vec2 vUv;varying vec2 vSea;${SEA_WAVE_GLSL}void main(){vUv=uv;vSea=position.xz;vec3 p=position;p.y=seaHeight(p.xz,time)+.018;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;varying vec2 vUv;varying vec2 vSea;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float grain=hash(floor(vSea*35.+vec2(time*.7,0.)));float pulse=.65+.35*sin(time*1.4+vSea.x*.8+vSea.y);float edge=pow(1.-vUv.y,2.);float lace=smoothstep(.26,.75,grain+.18*sin(vSea.x*12.+vSea.y*9.-time*2.));float foam=edge*lace*pulse;vec3 col=mix(vec3(.025,.065,.075),vec3(.78,.88,.9),smoothstep(.08,.28,foam));float alpha=edge*(.12+foam*.62)*(1.-smoothstep(.75,1.,vUv.y));gl_FragColor=vec4(col,alpha);}`});
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.name='raft-waterline-foam';mesh.frustumCulled=false;mesh.renderOrder=1;
 let disposed=false;
 return {mesh,sync(rects){const positions=[],uvs=[];for(const {a,b,n} of exposedEdges(rects)){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(length/.25));for(let i=0;i<steps;i++){const p=u=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],c=p(i/steps),d=p((i+1)/steps),w=WATER_CONTACT_CONFIG.foamWidth;for(const [v,out]of [[c,0],[d,0],[d,1],[c,0],[d,1],[c,1]]){positions.push(v[0]+n[0]*w*out,0,v[1]+n[1]*w*out);uvs.push(v===c?i/steps:(i+1)/steps,out);}}}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));mesh.geometry.dispose();mesh.geometry=geometry;},update(t){material.uniforms.time.value=t;},dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();mesh.geometry.dispose();material.dispose();}};
}
