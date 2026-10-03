import * as THREE from '../../vendor/three.module.min.js';
import {createExpansionPanel,RAFT_CONFIG} from '../models/raft.js';
import {createRaftRoot,ROOT_CONFIG} from '../models/raft-root.js?v=contact-v6';
import {CARDS,EQUIPMENT} from '../../game/content/catalog.js';

export const PRESENTATION_CONFIG=Object.freeze({maxWidth:10.6,maxDepth:10.2,maxScale:1.05,deckY:.19,labelY:.4});
export function cellText(view,cell){
 const defense=view.defense?.find(slot=>slot.cellId===cell.id),logistics=view.logistics?.find(slot=>slot.cellId===cell.id);
 const role=defense?`防卫 ${defense.index+1}`:logistics?`后勤 ${logistics.index+1}`:'筏格';
 const heading=`${cell.label??`${cell.x+1}-${cell.z+1}`} · ${role}`;
 if(cell.state==='lost')return [heading,'已脱落','无承载区域'];
 const unit=view.units.find(u=>u.cellId===cell.id);
 if(!unit)return [heading,'空格',cell.state==='damaged'?'破损 · 禁止放置':'完好'];
 const name=CARDS[unit.definitionId]?.name??unit.definitionId;
 const condition=unit.structure===0?'残骸':cell.state==='damaged'?'停用':`结构 ${unit.structure}/${EQUIPMENT[unit.definitionId]?.structure??unit.structure}`;
 const product=unit.stored?`存：${CARDS[unit.stored.definitionId]?.name??unit.stored.definitionId}`:EQUIPMENT[unit.definitionId]?.threshold?`进度 ${unit.progress}/${EQUIPMENT[unit.definitionId].threshold}`:'';
 return [heading,name,condition+(product?' · '+product:'')];
}
/** Reconcile by cell ID. No session writes; no hard-coded number of render panels. */
export function createRaftPresenter({resources,createLabel=()=>null}={}){
 const root=new THREE.Group(),content=new THREE.Group();root.name='state-raft';root.add(content);
 const cells=new Map(),decorations=createRaftRoot({resources});content.add(decorations.root);
 let fit={scale:1,width:0,depth:0},summary={},disposed=false;
 const sync=view=>{
  const ids=new Set(view.cells.map(c=>c.id));
  for(const [id,entry] of cells)if(!ids.has(id)){entry.panel.dispose();entry.label?.dispose();cells.delete(id);}
  for(const cell of view.cells){
   let entry=cells.get(cell.id);
   if(!entry){const panel=createExpansionPanel({resources,cellId:cell.id,seed:RAFT_CONFIG.seed^Math.imul(cell.x,193)^Math.imul(cell.z,397)});const label=createLabel();entry={panel,label};cells.set(cell.id,entry);content.add(panel.root);if(label)content.add(label.root);}
   entry.panel.root.position.set(cell.x*RAFT_CONFIG.pitchX,PRESENTATION_CONFIG.deckY,cell.z*RAFT_CONFIG.pitchZ);entry.panel.setState(cell.state);
   entry.panel.pickMesh.userData={cellId:cell.id,tile:{id:cell.id,x:cell.x,z:cell.z}};
   if(entry.label){entry.label.update(cellText(view,cell),cell.state);entry.label.root.position.set(cell.x*RAFT_CONFIG.pitchX,PRESENTATION_CONFIG.labelY,cell.z*RAFT_CONFIG.pitchZ);}
  }
  const xs=view.cells.map(c=>c.x*RAFT_CONFIG.pitchX),zs=view.cells.map(c=>c.z*RAFT_CONFIG.pitchZ);
  const minX=Math.min(...(xs.length?xs:[0]))-RAFT_CONFIG.pitchX/2,maxX=Math.max(...(xs.length?xs:[0]))+RAFT_CONFIG.pitchX/2;
  const minZ=Math.min(...(zs.length?zs:[0]))-RAFT_CONFIG.pitchZ/2,maxZ=Math.max(...(zs.length?zs:[0]))+RAFT_CONFIG.pitchZ/2;
  const centerX=(minX+maxX)/2,rootZ=minZ-ROOT_CONFIG.depth/2-.15;
  decorations.root.position.set(centerX,PRESENTATION_CONFIG.deckY,rootZ);
  const left=Math.min(minX,centerX-ROOT_CONFIG.width/2),right=Math.max(maxX,centerX+ROOT_CONFIG.width/2),back=rootZ-ROOT_CONFIG.depth/2;
  const width=right-left,depth=maxZ-back,scale=Math.min(PRESENTATION_CONFIG.maxScale,PRESENTATION_CONFIG.maxWidth/width,PRESENTATION_CONFIG.maxDepth/depth);
  content.position.set(-(left+right)/2,0,-(back+maxZ)/2);root.scale.setScalar(scale);fit={scale,width,depth};
  summary={total:view.cells.length,intact:view.cells.filter(c=>c.state==='intact').length,damaged:view.cells.filter(c=>c.state==='damaged').length,lost:view.cells.filter(c=>c.state==='lost').length,expanded:view.cells.filter(c=>c.x<0||c.x>=4||c.z<0||c.z>=3).length};
 };
 return {root,cells,decorations,get fit(){return {...fit}},get summary(){return {...summary}},sync,
  getContactRects:()=>{const scale=root.scale.x;const rect=(x,z,w,d)=>({x:root.position.x+(content.position.x+x)*scale,z:root.position.z+(content.position.z+z)*scale,w:w*scale,d:d*scale});return [...[...cells.values()].filter(e=>e.panel.root.visible).map(e=>rect(e.panel.root.position.x,e.panel.root.position.z,RAFT_CONFIG.pitchX,RAFT_CONFIG.pitchZ)),rect(decorations.root.position.x,decorations.root.position.z,ROOT_CONFIG.width,ROOT_CONFIG.depth)];},
  getPickMeshes:()=>[...cells.values()].filter(e=>e.panel.root.visible).map(e=>e.panel.pickMesh),
  getCellAnchor:id=>cells.get(id)?.label?.root??cells.get(id)?.panel.anchors.deck,
  dispose(){if(disposed)return;disposed=true;for(const e of cells.values()){e.panel.dispose();e.label?.dispose();}cells.clear();decorations.dispose();root.removeFromParent();root.clear();}
 };
}
