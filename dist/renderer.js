import { T } from './scene.js';

export function makeRenderer() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {antialias:true, alpha:false, powerPreference:'high-performance'});
  if (context) {
    const renderer = new T.WebGLRenderer({canvas,context,antialias:true});
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.02;
    return renderer;
  }
  return softwareRenderer();
}

const v1=new T.Vector3(),v2=new T.Vector3(),v3=new T.Vector3();
const light=new T.Vector3(-.35,.84,.42).normalize();
const sphere=new T.SphereGeometry(1,16,10);
const closeSphere=new T.SphereGeometry(1,24,16);
const cylinder=new T.CylinderGeometry(1,1,1,12);
const cone=new T.ConeGeometry(.15,.32,4);
const ring=new T.RingGeometry(.81,1,22);
const geometryCache=new WeakMap();
const closeGeometryCache=new WeakMap();

function geometryData(geometry,close){
  const cache=close?closeGeometryCache:geometryCache;
  if(cache.has(geometry))return cache.get(geometry);
  const simple=geometry.type==='SphereGeometry'?(close?closeSphere:sphere):
    geometry.type==='CylinderGeometry'?cylinder:
      geometry.type==='ConeGeometry'&&geometry.parameters.height===.32?cone:geometry;
  const points=simple.attributes.position;
  const index=simple.index;
  const pointsArray=Array.from({length:points.count},(_,i)=>new T.Vector3().fromBufferAttribute(points,i));
  const faces=[];
  const id=i=>index?index.getX(i):i;
  if(simple.type==='BoxGeometry'){
    for(let i=0;i<index.count;i+=6)faces.push([id(i),id(i+1),id(i+4),id(i+2)]);
  }else if(simple.type==='RingGeometry'){
    const size=geometry.parameters.outerRadius;
    const positions=ring.attributes.position;
    pointsArray.length=0;
    for(let i=0;i<positions.count;i++)pointsArray.push(new T.Vector3().fromBufferAttribute(positions,i).multiplyScalar(size));
    for(let i=0;i<ring.index.count;i+=6){
      const idx=j=>ring.index.getX(j);
      faces.push([idx(i),idx(i+1),idx(i+4),idx(i+2)]);
    }
  }else{
    const count=index?index.count:points.count;
    for(let i=0;i<count;i+=3)faces.push([id(i),id(i+1),id(i+2)]);
  }
  const projected=pointsArray.map(()=>new T.Vector3());
  const world=pointsArray.map(()=>new T.Vector3());
  let vertexColors=null;
  if(geometry.attributes.color){
    const source=geometry.attributes.color;
    vertexColors=pointsArray.map((_,i)=>{
      let id=i;
      if(simple!==geometry){
        const u=simple.attributes.uv.getX(i),v=simple.attributes.uv.getY(i);
        id=Math.round((1-v)*geometry.parameters.heightSegments)*(geometry.parameters.widthSegments+1)+Math.round(u*geometry.parameters.widthSegments);
      }
      return new T.Color().fromBufferAttribute(source,id);
    });
  }
  const result={pointsArray,faces,projected,world,vertexColors};
  cache.set(geometry,result);
  return result;
}
function softwareRenderer(){
  const canvas=document.createElement('canvas'),buffer=document.createElement('canvas');
  const ctx=buffer.getContext('2d'),display=canvas.getContext('2d');
  const view=new T.Matrix4(), worldScale=new T.Vector3(),frustum=new T.Frustum();
  const paint=new Map();
  let background;
  let scale=1,width=1,height=1,loop;
  function color(mat,brightness){
    const bucket=Math.round(brightness*14);
    const id=mat.color.getHex()+':'+bucket;
    if(!paint.has(id)){
      const c=mat.color.clone().convertLinearToSRGB();
      const b=bucket/14;
      paint.set(id,'rgb('+[c.r,c.g,c.b].map(v=>Math.round(Math.min(1,v*b)*255)).join(',')+')');
    }
    return paint.get(id);
  }
  function render(scene,camera){
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(view);
    const near=camera.top-camera.bottom<6.2;
    const draw=[];
    scene.traverseVisible(obj=>{
      if(obj.isSprite){
        v1.setFromMatrixPosition(obj.matrixWorld).applyMatrix4(view);
        worldScale.setFromMatrixScale(obj.matrixWorld);
        const distance=camera.isPerspectiveCamera?obj.getWorldPosition(v2).applyMatrix4(camera.matrixWorldInverse).z:0;
        const unit=camera.isPerspectiveCamera?height/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(.1,-distance)):height/(camera.top-camera.bottom);
        if(v1.z>1||v1.z< -1)return;
        draw.push({image:obj.material.map.image,x:(v1.x+1)*width/2,y:(1-v1.y)*height/2,w:unit*worldScale.x,h:unit*worldScale.y,depth:-10});
      }
      if(!obj.isMesh||obj.geometry.type==='PlaneGeometry'||!frustum.intersectsObject(obj))return;
      const {pointsArray,faces,projected,world,vertexColors}=geometryData(obj.geometry,near);
      for(let i=0;i<pointsArray.length;i++){
        world[i].copy(pointsArray[i]).applyMatrix4(obj.matrixWorld);
        projected[i].copy(world[i]).applyMatrix4(view);
      }
      const mat=obj.material;
      for(const ids of faces){
        const a=projected[ids[0]],b=projected[ids[1]],c=projected[ids[2]];
        if(a.z< -1||b.z< -1||c.z< -1)continue;
        const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        if(mat.side!==T.DoubleSide&&area<=.000002)continue;
        const coords=ids.map(i=>[(projected[i].x+1)*width/2,(1-projected[i].y)*height/2]);
        if(coords.every(([x])=>x<0)||coords.every(([x])=>x>width)||
          coords.every(([,y])=>y<0)||coords.every(([,y])=>y>height))continue;
        const p=world[ids[0]],q=world[ids[1]],r=world[ids[2]];
        v3.subVectors(q,p).cross(v2.subVectors(r,p)).normalize();
        const brightness=mat.isMeshBasicMaterial?1:.72+.31*Math.max(0,v3.dot(light));
        const y=obj.matrixWorld.elements[13];
        const groundLayer=y<-.07?3-y:y<0?2:
          (obj.geometry.type==='CylinderGeometry'&&obj.scale.y<.032&&y<.032?1.6-y:0);
        const depth=mat.depthTest?((obj.userData.floorOverlay?1.70:obj.userData.contactShadow?1.42:groundLayer)||(a.z+b.z+c.z)/3):-9;
        let fill=color(mat,brightness);
        if(vertexColors){
          const c=vertexColors[ids[0]].clone().add(vertexColors[ids[1]]).add(vertexColors[ids[2]]).multiplyScalar(brightness/3).convertLinearToSRGB();
          fill='rgb('+[c.r,c.g,c.b].map(v=>Math.round(Math.min(1,v)*255)).join(',')+')';
        }
        draw.push({coords,depth,color:fill,opacity:mat.opacity,curved:obj.geometry.type!=='BoxGeometry'});
      }
    });
    draw.sort((a,b)=>b.depth-a.depth);
    ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
    for(const item of draw){
      if(item.image){
        ctx.drawImage(item.image,item.x-item.w/2,item.y-item.h/2,item.w,item.h);
        continue;
      }
      ctx.globalAlpha=item.opacity;
      ctx.fillStyle=ctx.strokeStyle=item.color;
      ctx.beginPath();ctx.moveTo(...item.coords[0]);
      for(let i=1;i<item.coords.length;i++)ctx.lineTo(...item.coords[i]);
      ctx.closePath();ctx.fill();
      if(item.opacity===1){ctx.lineWidth=item.curved?.20:.55;ctx.stroke();}
    }
    ctx.globalAlpha=1;
    // Present only the completed frame; slow canvas devices must never show the clearing pass.
    display.drawImage(buffer,0,0);
  }
  return {
    domElement:canvas, render,
    setPixelRatio(value){scale=Math.min(value,1.15);},
    setSize(w,h){
      canvas.width=width=Math.round(w*scale);canvas.height=height=Math.round(h*scale);
      buffer.width=width;buffer.height=height;
      background=ctx.createLinearGradient(0,0,0,height);
      background.addColorStop(0,'#e7ded3');background.addColorStop(1,'#c6b4aa');
    },
    setAnimationLoop(callback){
      loop=callback;
      function step(time){if(loop){loop(time);requestAnimationFrame(step);}}
      requestAnimationFrame(step);
    }
  };
}
