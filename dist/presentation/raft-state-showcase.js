import * as THREE from '../vendor/three.module.min.js';
import {createRaftResources} from './models/raft.js';
import {createRaftPresenter} from './scene/raft-presenter.js';
import {createCellLabel} from './materials/cell-label.js';

const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1d29');
const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,100);camera.position.set(0,15,20);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;document.querySelector('#world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#c4dfe7','#211c18',2.2));const sun=new THREE.DirectionalLight('#e2dac4',2.5);sun.position.set(-3,12,5);scene.add(sun);
const resources=createRaftResources(),presenter=createRaftPresenter({resources,createLabel:createCellLabel});scene.add(presenter.root);presenter.root.position.set(1.6,0,0);
const cells=(w,h)=>Array.from({length:w*h},(_,i)=>({id:`cell-${i%w}-${Math.floor(i/w)}`,x:i%w,z:Math.floor(i/w),label:`${i%w+1}-${Math.floor(i/w)+1}`,state:'intact'}));
function snapshot(preset){const view={cells:cells(preset==='expanded'?5:preset==='small'?3:4,preset==='expanded'?4:preset==='small'?2:3),units:[],defense:[],logistics:[]};view.defense=Array.from({length:4},(_,index)=>({index,cellId:`cell-${index}-2`}));view.logistics=[{index:0,cellId:'cell-0-1'},{index:1,cellId:'cell-3-1'}];
 if(preset==='damaged'){
  view.cells.find(c=>c.id==='cell-0-1').state='damaged';view.cells.find(c=>c.id==='cell-3-0').state='lost';
  view.units=[{id:'bow',definitionId:'C19',cellId:'cell-1-2',structure:4,operational:true},{id:'net',definitionId:'C20',cellId:'cell-0-1',structure:4,progress:2,operational:false,stored:{definitionId:'C09'}},{id:'water',definitionId:'C21',cellId:'cell-3-1',structure:4,progress:3,operational:true},{id:'wreck',definitionId:'C18',cellId:'cell-2-2',structure:0,operational:false}];
 }return view;
}
function show(preset){presenter.sync(snapshot(preset));document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===preset)));const s=presenter.summary;document.querySelector('#status').textContent=`${s.total} 格登记 · ${s.total-s.lost} 格在位 · 扩展 +${s.expanded} · 破损 ${s.damaged} · 脱落 ${s.lost} · 自动缩放 ${presenter.fit.scale.toFixed(2)}`;}
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.preset)));
function resize(){renderer.setSize(innerWidth,innerHeight);const width=12*innerWidth/innerHeight;camera.left=-width/2;camera.right=width/2;camera.top=6;camera.bottom=-6;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();show('initial');
renderer.setAnimationLoop(()=>renderer.render(scene,camera));addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);presenter.dispose();resources.dispose();renderer.dispose();},{once:true});
