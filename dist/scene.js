import { buildCat } from './cat-model.js';
import { decorateStudy } from './study-detail.js';
import * as T from './vendor/three.module.min.js';
export { T };

export const spots = {
  desk: [-4.95,-2.68], door: [-3.45,-.68], seat: [-4.95,-2.68], sofa: [-5.56,2.23], hostSofa: [-5.45,.98],
  bowl: [5.22,.25], hostBowl: [5.1,.90], mochiStart: [.8,-1.3]
};
export const bounds = { minX:-7.72,maxX:7.72,minZ:-4.66,maxZ:4.65 };

const cream=0xf8e9d6, wood=0xa97555, lightWood=0xd5a47a, dark=0x604335;
const cube=new T.BoxGeometry(1,1,1);
const sphere=new T.SphereGeometry(1,20,14);
const rounded=new T.BoxGeometry(1,1,1,3,3,3);
const vertex=new T.Vector3(),core=new T.Vector3();
for(let i=0;i<rounded.attributes.position.count;i++){
  vertex.fromBufferAttribute(rounded.attributes.position,i);
  core.copy(vertex).clampScalar(-.37,.37);
  vertex.sub(core).normalize().multiplyScalar(.13).add(core);
  rounded.attributes.position.setXYZ(i,vertex.x,vertex.y,vertex.z);
}
rounded.computeVertexNormals();
const cylinder=new T.CylinderGeometry(1,1,1,20);
const cone=new T.ConeGeometry(1,1,4);
const materials=new Map();
const textures=new Map();
function surfaceTexture(style){
  if(textures.has(style))return textures.get(style);
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const index=(y*128+x)*4;
    const grain=style==='wood'?
      Math.sin(y*.93+Math.sin(x*.055+y*.061)*2.3)*7+Math.sin(y*2.2+x*.032)*3:
      ((x%3===0?-4:2)+(y%3===0?-5:2));
    const value=246+grain+((x*13+y*31)%7-3)*1.2;
    pixels.data.set([value,value,value,255],index);
  }
  ctx.putImageData(pixels,0,0);
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;
  textures.set(style,texture);
  return texture;
}
function finish(mesh,style){
  const key=mesh.material.color.getHex()+'-'+style;
  if(!materials.has(key)){
    const mat=mesh.material.clone();
    mat.map=surfaceTexture(style);
    mat.roughness=style==='wood'?.75:.96;
    mat.bumpMap=mat.map;mat.bumpScale=style==='wood'?.012:.008;
    materials.set(key,mat);
  }
  mesh.material=materials.get(key);
  return mesh;
}

function material(color){
  if(!materials.has(color)) materials.set(color,new T.MeshStandardMaterial({color,roughness:.82}));
  return materials.get(color);
}

function shape(parent,geo,color,x,y,z,sx,sy,sz,shadows=true){
  const mesh=new T.Mesh(geo,material(color));
  mesh.position.set(x,y,z);
  mesh.scale.set(sx,sy,sz);
  mesh.castShadow=shadows;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}

const box=(p,c,x,y,z,w,h,d,s)=>shape(p,cube,c,x,y,z,w,h,d,s);
const cushion=(p,c,x,y,z,w,h,d)=>finish(shape(p,rounded,c,x,y,z,w,h,d),'linen');
const oval=(p,c,x,y,z,w,h,d,s)=>shape(p,sphere,c,x,y,z,w,h,d,s);
const cyl=(p,c,x,y,z,r,h,r2=r,s)=>shape(p,cylinder,c,x,y,z,r,h,r2,s);

function group(parent,x=0,y=0,z=0){
  const node=new T.Group();
  node.position.set(x,y,z);
  parent.add(node);
  return node;
}

export const colliders=[];
export const platforms=[];
function platform(id,name,collider,surface,height){
  colliders.push(collider);
  platforms.push({id,name,collider,surface,height});
}
export const partitions=[];
function wall(parent,x,z,w,d,h,color=cream){
  const partition=group(parent);
  partitions.push({node:partition,x,z,w,d,h});
  const pieces=Math.ceil(Math.max(w,d)/1.3);
  const width=w>d?w/pieces:w;
  const depth=d>w?d/pieces:d;
  for(let i=0;i<pieces;i++){
    const px=w>d?x-w/2+(i+.5)*width:x;
    const pz=d>w?z-d/2+(i+.5)*depth:z;
    box(partition,color,px,h/2,pz,width,h,depth);
    box(partition,0xfff1e3,px,h-.028,pz,width+.012,.058,depth+.012);
    box(partition,0xd4a787,px,.065,pz,width+.018,.11,depth+.018,false);
  }
  colliders.push([x,z,w,d]);
}

function label(text,color){
  const bitmap=document.createElement('canvas');
  bitmap.width=480;bitmap.height=125;
  const ctx=bitmap.getContext('2d');
  ctx.beginPath();
  ctx.roundRect(13,14,454,97,44);
  ctx.fillStyle='#fff8ec';
  ctx.fill();
  ctx.lineWidth=4;ctx.strokeStyle=color;ctx.stroke();
  ctx.fillStyle='#483229';
  ctx.font='bold 54px system-ui,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,240,65);
  const map=new T.CanvasTexture(bitmap);
  map.colorSpace=T.SRGBColorSpace;
  const sprite=new T.Sprite(new T.SpriteMaterial({map,depthTest:false,transparent:true}));
  sprite.scale.set(1.62,.42,1);
  sprite.renderOrder=5;
  return sprite;
}

function planks(p,minX,maxX,minZ,maxZ,colors){
  const width=(maxZ-minZ)/Math.round((maxZ-minZ)/.48);
  for(let i=0;i<Math.round((maxZ-minZ)/width);i++){
    let x=minX, j=0;
    while(x<maxX-.001){
      const length=Math.min(maxX-x,j===0?1.12+(i*7%8)*.24:2.46);
      const center=minZ+(i+.5)*width;
      const tone=colors[(i*5+j*3)%colors.length];
      finish(box(p,tone,x+length/2,-.045,center,length-.016,.088,width-.013,false),'wood');
      if((i+j)%3===0&&length>.48){
        const grain=box(p,tone===colors[0]?colors[1]:colors[0],x+length*.49,.002,center+.09,length*.51,.002,.014,false);
        grain.userData.floorOverlay=true;
      }
      x+=length;j++;
    }
  }
}

function tiles(p,minX,maxX,minZ,maxZ,colors){
  const n=Math.round((maxX-minX)/.57),m=Math.round((maxZ-minZ)/.57);
  const w=(maxX-minX)/n,d=(maxZ-minZ)/m;
  box(p,0xe0d4c7,(minX+maxX)/2,-.075,(minZ+maxZ)/2,maxX-minX,.12,maxZ-minZ,false);
  for(let i=0;i<n;i++)for(let j=0;j<m;j++)
    box(p,colors[(i+j)%colors.length],minX+(i+.5)*w,-.035,minZ+(j+.5)*d,w-.028,.07,d-.028,false);
}

function plant(p,x,z,size=1,y=0){
  const node=group(p,x,y,z);
  node.scale.setScalar(size);
  cyl(node,0xc47756,0,.22,0,.24,.43);
  cyl(node,0xe5a182,0,.43,0,.27,.095);
  cyl(node,0x7c5140,0,.48,0,.218,.025);
  for(let i=0;i<7;i++){
    const a=i*2.39;
    const leaf=oval(node,i%2?0x739768:0x4f825d,Math.cos(a)*.19,.69+(i%3)*.13,Math.sin(a)*.2,.12,.33,.12);
    leaf.rotation.z=-Math.cos(a)*.62;
    leaf.rotation.x=Math.sin(a)*.62;
  }
  return node;
}

function rug(p,x,z,w,d,color,edge){
  cyl(p,edge,x,.011,z,w/2,.023,d/2,false);
  finish(cyl(p,color,x,.025,z,w*.468,.019,d*.45,false),'linen');
}

function flowingWater(parent,x,basinY,z,spoutY){
  const flow=group(parent,x,basinY,z);
  const length=spoutY-basinY;
  const stream=cyl(flow,0x7bc6d8,0,length*.50,0,.034,length,.034,false);
  cyl(flow,0xc3eff0,.024,length*.49,.013,.011,length*.91,.011,false);
  const rippleGeometry=new T.TorusGeometry(.084,.010,5,16);
  const ripples=[0xa7e3e9,0xd7f5f1].map((color,i)=>{
    const ripple=shape(flow,rippleGeometry,color,0,.014+i*.004,0,1,1,1,false);
    ripple.rotation.x=-Math.PI/2;
    return ripple;
  });
  flow.userData.stream=stream;
  flow.userData.ripples=ripples;
  flow.visible=false;
  return flow;
}

function windowAt(p,x,y,z,w,h){
  const curtains=group(p,x,y,z+.17);
  box(p,wood,x,y,z,w+.18,h+.16,.10);
  box(p,0xb9d9cf,x,y,z+.063,w,h,.03,false);
  for(let i=0;i<4;i++)oval(p,i%2?0xc7d9b4:0xa8c1a5,x+(i-1.5)*w/4,y-h*.27,z+.083,w*.18,h*.17,.014,false);
  box(p,cream,x,y,z+.103,.05,h,.035,false);
  box(p,cream,x,y,z+.103,w,.05,.035,false);
  box(p,cream,x,y-h/2-.07,z+.14,w+.28,.085,.28);
  for(const side of [-1,1]){
    const geo=new T.PlaneGeometry(.35,h*1.15,18,14),pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i);
      pos.setXYZ(i,x,y,.043*Math.cos(x*88)+.018*Math.cos(y*4));
    }
    geo.computeVertexNormals();
    const cloth=new T.Mesh(geo,new T.MeshStandardMaterial({color:0xd5b59c,roughness:1,side:T.DoubleSide}));
    cloth.position.set(side*(w/2+.005),-.015,0);cloth.castShadow=cloth.receiveShadow=true;
    // Keep this mesh visible in the compatibility renderer too.
    cloth.geometry.type='PleatedCloth';curtains.add(cloth);
  }
  const shade=box(p,0xe7bfa8,x,y,z+.20,w,h,.035,false);
  shade.visible=false;
  return {node:curtains,effect:shade};
}

export function makeHouse(scene){
  const p=group(scene);
  const props=[];
  const feature=(id,name,verb,kind,x,z,node,options={})=>{
    props.push({id,name,verb,kind,x,z,node,contactY:.24,reach:.74,...options});
    return node;
  };
  const shadowMaterial=new T.MeshBasicMaterial({color:0x735341,opacity:.10,transparent:true,depthWrite:false});
  function floorDetail(x,z,w,d,material){
    const mesh=new T.Mesh(cylinder,material);
    mesh.position.set(x,.017,z);mesh.scale.set(w,.002,d);
    mesh.userData.floorOverlay=true;
    p.add(mesh);
    return mesh;
  }
  for(const [x,z,w,d] of [[-5.54,2.27,1.77,.81],[-5.4,3.9,1,.50],[-5,-3.85,1.52,.58],[5.18,-3.7,2.4,.43],[7.22,-2.2,.58,.43],[6.1,3.55,.62,.6]]){
    floorDetail(x,z,w,d,shadowMaterial);
  }
  const sunPatch=new T.MeshBasicMaterial({color:0xfff1bb,opacity:.25,transparent:true,depthWrite:false});
  for(const [x,z] of [[-6.42,-3.1],[5.25,-2.85]]){
    for(let i=0;i<3;i++){
      const patch=floorDetail(x+i*.41,z+i*.20,.30,.72,sunPatch);
      patch.rotation.y=-.45;
    }
  }
  box(p,0xc89575,0,-.25,0,16.45,.39,10.2);
  box(p,0xf8d8b5,0,-.09,0,16.18,.12,9.92);
  planks(p,-8,8,-.7,4.9,[0xeac19a,0xe6b68d,0xf2cca5,0xeec7a0,0xe8b98e]);
  planks(p,-8,-2.2,-4.9,-.7,[0xe6b08c,0xeab896,0xdfa784,0xebbc97]);
  tiles(p,-2.2,2.4,-4.9,-.7,[0xd2dfd9,0xe6eee5]);
  tiles(p,2.4,8,-4.9,1.18,[0xe9dfcd,0xf5edda]);
  wall(p,0,-4.91,16.18,.19,2.63);
  wall(p,-8,0,.16,9.9,1.60);
  wall(p,8,0,.16,9.9,1.30);
  wall(p,-2.2,-2.82,.15,4.06,1.40,0xeed3be);
  wall(p,2.4,-2.82,.15,4.06,1.40,0xdde7d7);
  wall(p,-6.12,-.7,3.76,.15,.60,0xf0d3ba);
  wall(p,-2.51,-.7,.61,.15,.60,0xf0d3ba);
  wall(p,-1.48,-.7,1.41,.15,.60,0xdce8d9);
  wall(p,1.66,-.7,1.46,.15,.60,0xdce8d9);
  box(p,wood,-3.52,.021,-.7,1.4,.042,.32,false);
  box(p,wood,.08,.021,-.7,1.69,.042,.32,false);

  const studyCurtain=windowAt(p,-6.42,1.82,-4.78,1.78,1.15);
  const kitchenCurtain=windowAt(p,5.12,1.88,-4.78,2.05,1.09);
  feature('study-curtain','書房窗簾','拉拉窗簾','curtain',-5.65,-4.44,studyCurtain.node,{effect:studyCurtain.effect,support:'desk',contactY:1.72,reach:.73});
  feature('kitchen-curtain','廚房窗簾','拉拉窗簾','curtain',5.94,-4.45,kitchenCurtain.node,{effect:kitchenCurtain.effect,support:'counter',contactY:1.78,reach:.73});
  for(const [id,name,x,width,color] of [['study-door','書房門',-4.23,1.42,0xd3a582],['bath-door','廁所門',-.77,1.70,0xb3c0aa]]){
    const panel=group(p,x,0,-.70);
    panel.rotation.y=1.38;
    box(panel,color,width/2,.67,0,width-.08,1.32,.075);
    box(panel,0xf8e5d2,width/2,.81,.042,width-.25,.65,.022);
    box(panel,0xf2dfca,width/2,.29,.042,width-.25,.29,.022);
    oval(panel,0xb78552,width-.19,.72,.080,.047,.052,.045);
    feature(id,name,'推推門','door',x+width*.59,-.70,panel,{reach:1.0,wall:[x+width/2,-.70,width,.08]});
  }
  const frame=group(p,-4.02,1.84,-4.74);
  box(frame,wood,0,0,0,.60,.72,.07);
  box(frame,0xf7e7cc,0,0,.046,.51,.63,.030);
  for(let i=0;i<5;i++)oval(frame,0x8ca384,(i%2?1:-1)*.075,-.19+i*.085,.065,.058,.10,.009,false).rotation.z=i%2?.6:-.55;
  feature('print','植物掛畫','撥歪掛畫','tilt',-4.02,-4.42,frame,{support:'desk',contactY:1.55,reach:.60});
  const rooms=[['書房',-3.30,2.84,-4.7,'#c9947d'],['廁所',.05,2.84,-4.7,'#90a899'],['廚房',6.83,2.84,-4.7,'#b69a73'],['客廳',-6.64,.32,4.65,'#c9947d']];
  for(const [name,x,y,z,color] of rooms){
    const marker=label(name,color);marker.position.set(x,y,z);p.add(marker);
  }

  // 書房
  rug(p,-4.38,-1.85,4.05,2.04,0xe1b8a6,0xf8dfc7);
  finish(box(p,wood,-5.0,1.07,-3.92,2.94,.19,1.11),'wood');
  for(const x of [-6.26,-3.74])for(const z of [-4.3,-3.55])box(p,dark,x,.51,z,.115,1.02,.11);
  const drawer=group(p,-5.95,.82,-3.93);
  box(drawer,0xe5c09f,0,0,0,.70,.30,.84);
  box(drawer,wood,0,.01,.44,.22,.04,.04);
  feature('desk-drawer','書桌抽屜','拉拉抽屜','slide',-5.96,-3.28,drawer,{contactY:.58,reach:.67});
  box(p,0x5a5a63,-5.0,1.68,-4.19,1.17,.70,.10);
  box(p,0x42605b,-5.0,1.68,-4.124,1.06,.58,.02);
  const screen=group(p,-5,1.68,-4.101);
  for(let i=0;i<6;i++)box(screen,i%2?0xf1c495:0xa6dfbc,-.16+i%2*.08,.21-i*.074,0,.65-(i%3)*.08,.028,.014,false);
  screen.visible=false;
  const documentCanvas=document.createElement('canvas');
  documentCanvas.width=256;documentCanvas.height=144;
  const documentContext=documentCanvas.getContext('2d');
  const documentTexture=new T.CanvasTexture(documentCanvas);
  documentTexture.colorSpace=T.SRGBColorSpace;
  const display=new T.Mesh(new T.PlaneGeometry(1.045,.562),new T.MeshBasicMaterial({map:documentTexture}));
  display.position.z=.023;
  screen.add(display);
  function writeScreen(text){
    documentContext.fillStyle='#2b403a';documentContext.fillRect(0,0,256,144);
    documentContext.fillStyle='#b7bca2';documentContext.font='12px system-ui,sans-serif';
    documentContext.fillText('阿澄的記事簿',13,19);
    documentContext.fillStyle='#ffead0';documentContext.font='16px monospace';
    const rows=text.match(/.{1,23}/g)??[];
    rows.forEach((row,i)=>documentContext.fillText(row,13,50+i*23));
    documentTexture.needsUpdate=true;
  }
  feature('keyboard','電腦鍵盤','踩鍵盤打字','screen',-5,-3.64,null,{effect:screen,support:'desk',contactY:1.24,reach:.53});
  feature('monitor','電腦屏幕','坐低擋住屏幕','block',-5,-3.98,null,{support:'desk',contactY:1.72,reach:.42});
  for(let i=0;i<3;i++)box(p,0xe1eee1,-5.12,1.79-i*.11,-4.108,.60-i*.08,.028,.014,false);
  box(p,0x5a5a63,-5,1.27,-4.19,.28,.24,.20);
  box(p,0x594d49,-5,1.196,-3.64,.84,.043,.28);
  for(let row=0;row<4;row++)for(let i=0;i<13;i++){
    if(row===3&&i>2&&i<8)continue;
    const width=row===3&&i===2?.31:.049;
    box(p,0xd6c8b4,-5.365+i*.060+(row===3&&i===2?.14:0),1.225,-3.745+row*.060,width,.017,.046,false);
  }
  const pencilCup=group(p,-4.02,1.17,-3.84);
  cyl(pencilCup,0xd6937c,0,.11,0,.11,.23);
  for(let i=0;i<4;i++)box(pencilCup,[0x8aa786,0xecc17c,0xaf8fa2,0xe8aa97][i],-.063+i*.041,.25,0,.025,.24,.025).rotation.z=(i-1.5)*.16;
  feature('pencils','筆筒','撥撥鉛筆','wiggle',-4.02,-3.78,pencilCup,{support:'desk',contactY:1.43,reach:.55});
  const deskPlant=plant(p,-6.17,-3.91,.52,1.16);
  platform('desk','書桌',[-5.0,-3.92,2.94,1.11],[-5.0,-3.72,2.58,.55],1.17);
  const swivel=group(p,spots.desk[0],0,spots.desk[1]);
  swivel.rotation.y=Math.PI;
  cyl(swivel,0x5c5458,0,.34,0,.10,.58);
  for(let i=0;i<5;i++){
    const foot=group(swivel);foot.rotation.y=i*Math.PI*2/5;
    box(foot,0x5c5458,0,.13,.24,.10,.085,.56);
    oval(foot,0x574e50,0,.076,.49,.092,.078,.082);
  }
  finish(oval(swivel,0x898488,0,.73,.015,.53,.143,.48),'linen');
  box(swivel,0x6b6267,0,.99,-.37,.11,.60,.10);
  finish(oval(swivel,0x8b868a,0,1.26,-.43,.50,.58,.15),'linen').rotation.x=.15;
  for(const x of [-.48,.48]){
    box(swivel,0x675e62,x,.87,-.08,.076,.31,.09);
    oval(swivel,0x928b8d,x,1.01,.01,.10,.065,.27);
  }
  feature('swivel','轉椅','轉一轉張椅','spin',-4.95,-2.68,swivel,{support:'chair',contactY:.92,reach:.56});
  platform('chair','轉椅',[...spots.seat,.98,.94],[-4.95,-2.76,.63,.52],.87);
  const shelf=group(p,-7.46,0,-2.36);shelf.rotation.y=Math.PI/2;
  // Open bookcase: thin back, side panels, and actual horizontal shelves.
  finish(box(shelf,wood,0,1.02,-.24,1.78,2.04,.06),'wood');
  for(const x of [-.85,.85])finish(box(shelf,wood,x,1.02,0,.08,2.04,.55),'wood');
  for(const y of [.10,.72,1.34,2.00])finish(box(shelf,wood,0,y,0,1.70,.07,.55),'wood');
  const books=[0xc88f83,0x8fa698,0xd2ad78,0xa498ac,0xdac8af];
  for(let r=0;r<3;r++){
    let cursor=-.74;const count=r===1?5:7;
    for(let i=0;i<count;i++){
      const w=[.13,.17,.11,.16,.14,.12,.13][i],h=[.42,.47,.36,.44,.39,.46,.37][(i+r)%7];
      const book=group(shelf,cursor+w/2,.135+r*.62,.055);book.userData.book=true;book.userData.shelfY=.135+r*.62;
      const color=books[(i+r)%books.length];
      box(book,0xeee2cd,0,h/2,-.012,w-.025,h-.025,.285);
      for(const side of [-1,1])box(book,color,side*(w/2-.006),h/2,0,.012,h,.32);
      box(book,color,0,h/2,.156,w,h,.018);
      for(const y of [.10,h-.08])box(book,0xe6d6b7,0,y,.167,w*.65,.009,.004);
      box(book,0xe8d4b0,0,h*.52,.168,w*.38,.05,.004);
      if(i===count-1){book.rotation.z=-.075;book.position.x+=.016;}
      if(i===5&&r===0)feature('shelf-book','書架上的書','抽一抽本書','slide',-6.91,-2.55,book,{contactY:.40,reach:.65});
      cursor+=w+.026;
    }
    if(r===1){
      for(let i=0;i<3;i++){
        const stack=group(shelf,.50,.135+r*.62+i*.068,.055);stack.userData.book=true;
        box(stack,books[(i+2)%5],0,.031,0,.40,.062,.32);
        box(stack,0xe9ddc5,0,.031,.166,.36,.040,.008);
      }
    }
  }
  colliders.push([-7.46,-2.36,.55,1.78]);

  // 廁所
  box(p,0xe9d8c0,-.83,.48,-4.25,1.44,.96,.93);
  box(p,0xfaf0dd,-.83,1.0,-4.25,1.56,.13,1);
  oval(p,0xffffff,-.83,1.067,-4.14,.49,.11,.32);
  oval(p,0xb5cfc5,-.83,1.145,-4.14,.35,.026,.22);
  cyl(p,0xb68f62,-.83,1.20,-4.47,.041,.25);
  box(p,wood,-.83,1.78,-4.77,1.17,.86,.075);
  box(p,0xb6d1ce,-.83,1.78,-4.72,1.08,.77,.034,false);
  box(p,0xf8f4e8,1.39,.68,-4.46,.78,.92,.49);
  oval(p,0xf8f4e8,1.39,.46,-3.98,.44,.22,.62);
  oval(p,0xb8d1c6,1.39,.63,-3.91,.29,.022,.39);
  const lid=group(p,1.39,.65,-4.27);
  oval(lid,0xf8f4e9,0,0,.32,.40,.043,.42);
  feature('toilet','坐廁','揭揭廁板','lid',1.39,-3.35,lid,{contactY:.65,reach:.66});
  const pawPrint=group(p,-.60,1.62,-4.681);
  oval(pawPrint,0x819f9b,0,0,0,.065,.047,.006,false);
  for(let i=0;i<4;i++)oval(pawPrint,0x819f9b,(i-1.5)*.042,.07+(i===0||i===3?0:.02),0,.019,.026,.006,false);
  pawPrint.rotation.z=-.22;
  pawPrint.visible=false;
  feature('mirror','鏡子','照鏡兼印個爪印','mirror',-.83,-4.47,null,{effect:pawPrint,support:'bath-sink',contactY:1.65,reach:.92});
  box(p,0xb68f62,-.83,1.36,-4.35,.081,.054,.26);
  const bathWater=flowingWater(p,-.83,1.15,-4.24,1.337);
  feature('bath-tap','洗手盆','撥開水龍頭','water',-.83,-4.24,null,{effect:bathWater,support:'bath-sink',contactY:1.34,reach:.66});
  box(p,0xf9f4e9,1.39,.2,-4.05,.50,.4,.60);
  rug(p,.14,-2.65,2.25,1.30,0x8daea4,0xc9dad0);
  const bathPlant=plant(p,-1.72,-1.54,.62);
  platform('bath-sink','洗手盆',[-.83,-4.25,1.56,1],[-.83,-4.08,1.25,.48],1.10);
  colliders.push([1.39,-4.09,.86,1.20]);

  // 開放式廚房
  const kitchen=group(p,5.2,0,-4.23);
  box(kitchen,0x8fae96,0,.58,0,4.72,1.14,1.08);
  box(kitchen,0xffe5bd,0,1.18,0,4.79,.16,1.15);
  for(let i=0;i<6;i++){
    const door=group(kitchen,-2.26+i*.77,.61,.557);
    box(door,0xa4bda1,.33,0,0,.67,.85,.053);
    box(door,0xe5c594,.33,.17,.049,.22,.045,.056);
    feature('cabinet-'+i,'廚櫃 '+(i+1),'打開廚櫃','hinge',3.27+i*.77,-3.45,door,{contactY:.78,reach:i===5?.66:.55});
  }
  box(kitchen,0x535e5a,1.20,1.277,0,1.29,.038,.78);
  for(const x of [.89,1.52])for(const z of [-.18,.19])cyl(kitchen,0x7c8273,x,1.302,z,.14,.018);
  box(kitchen,0xabaca1,-.36,1.28,0,.89,.046,.60);
  box(kitchen,0x8d9a91,-.36,1.31,0,.68,.016,.41);
  cyl(kitchen,0xbea579,-.36,1.44,-.24,.045,.30);
  box(kitchen,0xbea579,-.36,1.58,-.16,.09,.06,.24);
  const kitchenWater=flowingWater(kitchen,-.36,1.325,-.065,1.55);
  feature('kitchen-tap','廚房鋅盤','撥開水龍頭','water',4.84,-4.20,null,{effect:kitchenWater,support:'counter',contactY:1.54,reach:.66});
  const hobLight=cyl(kitchen,0xd88960,1.36,1.32,.29,.054,.015);
  hobLight.visible=false;
  feature('hob','爐面','踩踩感應掣','light',6.4,-4.23,null,{effect:hobLight,support:'counter',contactY:1.31,reach:.61,line:'嗶！鎖定咗，栗子撳唔到。'});
  const fruit=cyl(kitchen,0xd99975,-1.68,1.30,.17,.29,.10);
  fruit.receiveShadow=false;
  for(let i=0;i<4;i++){
    const x=-1.91+(i%2)*.24,z=.05+Math.floor(i/2)*.22;
    const piece=group(kitchen,x,1.39,z);
    oval(piece,0xe7a144,0,0,0,.108,.106,.108);
    cyl(piece,0x76935a,0,.105,0,.017,.027);
    feature(i?'fruit-'+i:'fruit','橙 '+(i+1),'撥落橙','roll',5.2+x,-4.23+z,piece,{
      orange:true,support:'counter',contactY:1.41,reach:.57,
      dropTarget:[x+(i%2?.16:-.13),.115,1.40+Math.floor(i/2)*.24]
    });
  }
  box(p,0xf1e6d5,7.29,1.08,-2.72,1.03,2.16,1.21);
  const fridge=group(p,7.73,1.49,-2.08);
  box(fridge,0xfff6e6,-.47,0,0,.94,1.18,.09);
  box(fridge,0xba9475,-.76,-.18,.07,.056,.33,.075);
  box(fridge,0xcc8879,-.31,.26,.056,.14,.21,.03);
  feature('fridge','雪櫃','蹭蹭雪櫃','look',7.11,-1.94,null,{reach:.68,line:'門太重，栗子用臉蹭了蹭。'});
  const freezer=group(p,7.73,.48,-2.08);
  box(freezer,0xfff6e6,-.47,0,0,.94,.76,.09);
  box(freezer,0xba9475,-.76,.17,.07,.055,.13,.075);
  feature('freezer','冰格','扒一扒冰格','scratch',7.33,-1.81,null,{contactY:.50,reach:.63});
  platform('counter','廚房枱面',[5.2,-4.23,4.8,1.16],[5.2,-4.04,4.48,.52],1.26);
  box(p,0xe9d2b1,7.08,1.62,-3.46,.63,.16,.32);
  box(p,0xc8ab86,7.08,1.69,-3.46,.61,.025,.30,false);
  platform('fridge-step','雪櫃旁的小落腳位',[7.08,-3.46,.63,.32],[7.08,-3.46,.54,.25],1.70);
  box(p,0xfff6e6,7.29,2.18,-2.72,1.03,.045,1.21);
  platform('fridge-top','雪櫃頂',[7.29,-2.72,1.03,1.21],[7.29,-2.72,.78,.72],2.21);
  colliders.push([7.29,-2.72,1.03,1.21]);
  rug(p,5.25,-2.71,2.56,1.03,0xe2b394,0xf5d6b7);
  const bowl=group(p,spots.bowl[0],0,spots.bowl[1]);
  box(bowl,0xb5b48d,.25,.025,-.07,1.52,.045,.76,false);
  cyl(bowl,0xe5a682,0,.11,0,.31,.17);
  cyl(bowl,0xf6cb9d,0,.19,0,.33,.065);
  cyl(bowl,0xb77758,0,.229,0,.25,.018);
  const kibble=group(bowl,0,0,0);
  for(let i=0;i<17;i++){
    const a=i*2.39996,r=.045+.145*Math.sqrt(i/17);
    const piece=new T.Mesh(new T.SphereGeometry(.034,8,6),new T.MeshStandardMaterial({color:i%3===0?0xb47739:0x93603c,roughness:.94}));
    piece.scale.set(1.1,.45,.78);piece.position.set(Math.cos(a)*r,.248+Math.sin(i*1.7)*.008,Math.sin(a)*r);
    kibble.add(piece);
  }
  kibble.visible=false;
  cyl(bowl,0x8faeaa,.63,.105,0,.28,.15);
  cyl(bowl,0xbadbd5,.63,.19,0,.235,.045);
  feature('cat-water','貓咪水碗','飲自己碗水','sip',5.85,.25,null,{reach:.66});

  // 客廳
  rug(p,-4.72,2.60,5.62,3.88,0xe7b5a0,0xf3d1bd);
  rug(p,3.60,3.09,3.21,2.02,0xd7c9a6,0xf5deba);
  const sofa=group(p,-5.56,0,2.23);
  box(sofa,0xb37559,0,.27,0,3.12,.29,1.40);
  cushion(sofa,0xd1a791,0,.54,0,3.28,.40,1.50);
  cushion(sofa,0xc4967e,0,1.00,-.63,3.28,.91,.33);
  for(const x of [-1.51,1.51])cushion(sofa,0xd2aa93,x,.83,.01,.46,.52,1.55);
  for(const x of [-.99,0,.99]){
    cushion(sofa,0xe6c4a8,x,.77,.17,.97,.26,1.04);
    cushion(sofa,0xd7b29a,x,1.13,-.40,.97,.67,.38);
  }
  cushion(sofa,0xd5a06e,-1.10,1.12,-.08,.61,.57,.27).rotation.z=.24;
  const pillow=cushion(sofa,0x9dae94,.99,1.14,-.10,.58,.52,.25);
  pillow.rotation.z=-.27;
  feature('cushion','梳化咕臣','踩踩咕臣','knead',-4.57,2.36,pillow,{support:'sofa',contactY:1.05,reach:.62,line:'軟綿綿，踩多兩下先。'});
  platform('sofa','梳化',[-5.56,2.23,3.3,1.5],[-5.56,2.46,2.52,.67],.90);
  const table=group(p,-5.38,0,3.90);
  for(const x of [-.67,.67])for(const z of [-.28,.28])box(table,wood,x,.24,z,.11,.48,.11);
  finish(box(table,lightWood,0,.52,0,1.82,.12,.92),'wood');
  const book=group(table,-.26,.60,-.06);
  book.rotation.y=.21;
  box(book,0xe7d7ba,0,0,0,.44,.035,.29);
  box(book,0x819780,0,.024,0,.47,.018,.32);
  feature('book','茶几上的書','推推本書','slide',-5.64,3.84,book,{support:'table',contactY:.64,reach:.56});
  const mug=group(p,-5.04,.58,4.14);
  cyl(mug,0xe0a481,0,.105,0,.132,.21);
  cyl(mug,0xffe3c3,0,.212,0,.137,.030);
  cyl(mug,0xa77160,0,.229,0,.108,.011,false);
  const water=cyl(mug,0x90c5cc,0,.239,0,.102,.012,false);
  const handle=shape(mug,new T.TorusGeometry(.078,.025,7,16),0xe0a481,.13,.119,0,1,1,1);
  handle.rotation.y=.05;
  const puddle=oval(p,0x9ac4ca,-5.0,.041,4.52,.38,.014,.17,false);
  puddle.visible=false;
  platform('table','茶几',[-5.38,3.90,1.82,.92],[-5.43,3.91,1.45,.62],.59);
  const plants=[
    plant(p,-7.28,.24,1.18),
    plant(p,7.34,3.75,1.31),
    plant(p,2.85,-.15,.77),
    bathPlant,deskPlant
  ];
  const looseLeaves=Array.from({length:5},(_,i)=>{
    const leaf=oval(p,i%2?0x739768:0x4f825d,0,0,0,.078,.016,.15,false);
    leaf.visible=false;
    return leaf;
  });
  cyl(p,0xa9826b,6.1,.08,3.54,.55,.16);
  cyl(p,0xc7a587,6.1,.51,3.54,.11,.88);
  cyl(p,0xe0c298,6.1,1.00,3.54,.49,.16);
  oval(p,0xead3ad,6.1,1.12,3.54,.47,.14,.44);
  for(let i=0;i<7;i++)cyl(p,0xab8866,6.1,.24+i*.10,3.54,.119,.022);
  const teaser=group(p,6.1,1.08,3.94);
  box(teaser,0xbd987b,.08,-.16,0,.012,.34,.013);
  oval(teaser,0xbe7784,.08,-.36,0,.09,.12,.078);
  feature('teaser','逗貓吊球','拍一拍吊球','wiggle',6.1,3.94,teaser,{contactY:.72,reach:.59});
  feature('post','貓抓柱','磨磨爪','scratch',6.1,3.54,null,{contactY:.58,reach:.74});
  platform('perch','貓抓台',[6.1,3.54,1.02,.93],[6.1,3.54,.65,.62],1.22);
  const bed=group(p,1.24,0,3.85);
  cyl(bed,0xddc19c,0,.09,0,.76,.16);
  oval(bed,0xb2a8b9,0,.16,0,.65,.07,.60);
  const bedRim=shape(bed,new T.TorusGeometry(.67,.09,10,40),0xd9bd9e,0,.21,0,1,1,1);bedRim.rotation.x=Math.PI/2;
  feature('bed','貓床','走入貓床伏低','cozy',1.24,3.85,null,{reach:.90,contactY:.23,restHeight:.22,line:'收好隻尾，瞓一陣先。'});
  feature('living-rug','客廳地氈','喺地氈打滾','cozy',-3.92,3.05,null,{reach:.65});
  feature('study-rug','書房地氈','喺地氈打滾','cozy',-4.42,-1.67,null,{reach:.62});
  feature('bath-mat','廁所地墊','踩踩地墊','knead',.14,-2.65,null,{reach:.62});
  feature('kitchen-mat','廚房地墊','踩踩地墊','knead',5.25,-2.71,null,{reach:.64});
  const litter=group(p,1.41,0,-1.98);
  cushion(litter,0xaab39e,0,.09,0,1.13,.17,.81);
  box(litter,0xd7c4a0,0,.188,0,.91,.056,.60);
  for(const x of [-.52,.52])box(litter,0xbac0a8,x,.237,0,.10,.17,.76);
  for(const z of [-.37,.37])box(litter,0xbac0a8,0,.207,z,1.08,.105,.105);
  const sand=group(litter);
  for(let i=0;i<28;i++){
    const grain=oval(sand,i%3?0xe3d0ac:0xcbb58c,0,0,0,.020+(i%3)*.005,.018,.025);
    grain.userData.launch={x:((i*7)%13-6)*.025,z:.16+(i%4)*.025,vx:((i*11)%17-8)*.16,vz:.85+(i%6)*.13,vy:1.25+(i%5)*.17,delay:i*.018};
    grain.visible=false;
  }
  sand.visible=false;
  feature('litter','貓砂盆','撥撥貓砂','dig',1.41,-1.66,null,{effect:sand,reach:.64});
  const toyBall=group(p,2.68,.13,4.12);
  oval(toyBall,0xb66c68,0,0,0,.135,.135,.135);
  oval(toyBall,0xf3c7a0,0,0,0,.139,.036,.139).rotation.z=.66;
  feature('ball','毛冷球','拍走毛冷球','ball',2.68,4.12,toyBall,{reach:.60,contactY:.13});
  const carton=group(p,3.86,0,1.65);
  box(carton,0xbc956e,0,.065,0,1.44,.13,1.38);
  for(const x of [-.68,.68])box(carton,0xc9a37d,x,.36,0,.075,.65,1.38);
  for(const z of [-.65,.65])box(carton,0xd2ab81,0,.33,z,1.44,.59,.075);
  for(const sign of [-1,1]){
    const flap=box(carton,0xe0bb91,sign*.77,.71,0,.22,.025,1.38);flap.rotation.z=-sign*.45;
  }
  box(carton,0xf1d1aa,0,.49,.695,.26,.14,.022).rotation.z=.10;
  platform('carton','紙箱',[3.86,1.65,1.44,1.38],[3.86,1.65,1.20,1.14],.14);
  feature('box','紙箱','伏入紙箱','cozy',3.86,1.65,null,{support:'carton',contactY:.14,reach:.90,restHeight:.14,line:'隻尾都收埋咗，你睇我唔到。'});
  feature('window-rug','窗邊地氈','伸個懶腰','cozy',3.60,3.09,null,{reach:.64});

  decorateStudy(p);
  return { bowl, kibble, mug, water, puddle, plants, looseLeaves, props, writeScreen, cameraObstacles:[shelf,sofa] };
}

export function cat(scene,coat,mark,creamColor,collarColor,appearance='calico'){
  return buildCat(scene,coat,mark,creamColor,collarColor);
}

export function host(scene){
  const root=group(scene);
  const body=group(root);
  const head=group(body,0,1.68,0);
  const skin=0xeec4a4, hair=0x975b40, hairLight=0xb97953;
  const jumper=0xf4e5cb, knit=0xfff3df, pants=0x9c7766, glasses=0xb58159;
  // Loose curls belong to the torso, so they do not swing like a solid helmet.
  oval(body,hair,0,1.29,-.145,.33,.48,.19);
  for(const s of [-1,1]){
    for(let i=0;i<3;i++){
      const y=1.57-i*.17;
      const lock=oval(body,i%2?hairLight:hair,s*(.251+.026*Math.sin(i*2.7)),y,-.026-i*.007,
        .09+i*.007,.17,.092);
      lock.rotation.z=s*(i%2?-.22:.20);
    }
    oval(body,hair,s*.237,.91,-.095,.13,.18,.12);
    oval(body,hairLight,s*.29,.87,-.013,.075,.11,.077);
  }
  oval(body,jumper,0,1.12,.015,.31,.41,.20);
  oval(body,knit,0,1.43,.058,.157,.072,.133);
  oval(body,skin,0,1.49,.048,.086,.12,.077);
  // Flat knit lines survive the game's simplified renderer without jagged overlaps.
  for(const s of [-1,1]){
    for(let i=0;i<3;i++)
      box(body,i%2?0xe9d7bd:knit,s*(.072+i*.052),1.12,.216-i*.012,.008,.48,.006,false);
  }
  oval(head,hair,0,.049,-.072,.296,.34,.239);
  oval(head,skin,0,-.016,.073,.225,.256,.195);
  oval(head,hair,-.092,.187,.143,.169,.095,.109).rotation.z=-.45;
  oval(head,hairLight,.113,.182,.144,.143,.085,.107).rotation.z=.38;
  oval(head,hair,.19,-.027,-.068,.102,.279,.158).rotation.z=-.10;
  oval(head,hairLight,-.21,-.03,-.063,.087,.25,.13).rotation.z=.12;
  // The fringe breaks into soft strands instead of covering the glasses.
  for(const s of [-1,1])for(let i=0;i<3;i++){
    const curl=oval(head,i%2?hair:hairLight,s*(.05+i*.071),.226-i*.024,.12+i*.011,.055,.072,.075);
    curl.rotation.z=s*(i%2?.35:-.32);
  }
  for(const s of [-1,1]){
    oval(head,skin,s*.216,-.035,.045,.049,.074,.049);
    oval(head,0xa76240,s*.085,.015,.252,.027,.020,.009);
    oval(head,0x392b29,s*.085,.016,.260,.012,.015,.009);
    oval(head,0xca8b78,s*.147,-.067,.221,.039,.017,.009);
    oval(head,hair,s*.092,.078,.247,.048,.008,.012).rotation.z=-s*.11;
    const rim=new T.Mesh(new T.TorusGeometry(.067,.005,6,32),material(glasses));
    rim.position.set(s*.085,.010,.273);rim.scale.set(1.08,.87,1);
    head.add(rim);
    const arm=box(head,glasses,s*.177,.024,.214,.058,.007,.007,false);
    arm.rotation.y=s*.25;
  }
  box(head,glasses,0,.025,.277,.029,.007,.009,false);
  oval(head,0xe6a887,0,-.052,.267,.030,.036,.026);
  oval(head,0x9c645c,0,-.124,.249,.043,.011,.011);
  const arms=[],legs=[];
  for(const s of [-1,1]){
    const arm=group(body,s*.269,1.315,.003);
    oval(arm,jumper,0,-.17,0,.119,.25,.122);
    oval(arm,knit,0,-.347,.005,.108,.045,.112);
    for(let i=0;i<3;i++)
      oval(arm,0xe5d0b3,s*.032,-.12-i*.073,.113,.009,.045,.009,false);
    oval(arm,skin,0,-.421,.012,.077,.093,.070);
    arms.push(arm);
    const thigh=group(root,s*.124,.83,0);
    oval(thigh,pants,0,-.205,0,.116,.25,.13);
    const shin=group(thigh,0,-.395,0);
    oval(shin,pants,0,-.161,0,.096,.214,.105);
    oval(shin,0xf5e1bf,0,-.34,.069,.103,.081,.17);
    legs.push({thigh,shin});
  }
  return {root,body,head,arms,legs};
}
