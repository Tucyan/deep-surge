import * as THREE from '../../vendor/three.module.min.js';

export const CAMERA_CONFIG=Object.freeze({fov:36,position:Object.freeze([3,12,23]),target:Object.freeze([-1,0,-1.4]),near:.1,far:180});
/** A mild oblique perspective; pointer motion offsets the base, never resets it. */
export function createPerspectiveView({aspect=16/9,position=CAMERA_CONFIG.position,target=CAMERA_CONFIG.target,fov=CAMERA_CONFIG.fov}={}){
 const camera=new THREE.PerspectiveCamera(fov,aspect,CAMERA_CONFIG.near,CAMERA_CONFIG.far);
 const updatePointer=(x=0,y=0)=>{camera.position.set(position[0]+x*.12,position[1],position[2]);camera.lookAt(target[0]+x*.08,target[1],target[2]+y*.07);};
 updatePointer();return {camera,updatePointer,resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();}};
}
