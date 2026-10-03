import * as THREE from '../../vendor/three.module.min.js';
/** Per-instance Canvas texture; stable text changes redraw in place. */
export function createCellLabel(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
 const root=new THREE.Sprite(material);root.scale.set(2.1,1.05,1);root.renderOrder=4;
 let signature='',disposed=false;
 return {root,update(lines,state='intact'){
  const next=JSON.stringify([lines,state]);if(next===signature)return;signature=next;
  ctx.clearRect(0,0,512,256);ctx.fillStyle=state==='lost'?'rgba(9,25,34,.55)':'rgba(9,28,37,.88)';ctx.fillRect(9,13,494,230);
  ctx.strokeStyle=state==='intact'?'#aa9866':state==='damaged'?'#e2a366':'#896a60';ctx.lineWidth=4;if(state==='lost')ctx.setLineDash([14,10]);else ctx.setLineDash([]);ctx.strokeRect(9,13,494,230);
  ctx.textAlign='center';ctx.textBaseline='middle';const fonts=[40,61,36],ys=[52,128,204];lines.slice(0,3).forEach((line,i)=>{ctx.font=`${i===1?'600':'400'} ${fonts[i]}px "Microsoft YaHei",sans-serif`;ctx.fillStyle=i===1?'#eee2b8':'#a5bec5';ctx.fillText(line,256,ys[i],470);});texture.needsUpdate=true;
 },dispose(){if(disposed)return;disposed=true;root.removeFromParent();texture.dispose();material.dispose();}};
}
