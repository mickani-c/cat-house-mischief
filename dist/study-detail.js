import * as T from './vendor/three.module.min.js';

export function decorateStudy(parent){
  const root=new T.Group();parent.add(root);
  const materials=new Map();
  const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;
  const ctx=grainCanvas.getContext('2d');ctx.fillStyle='#f5eee3';ctx.fillRect(0,0,256,256);
  for(let i=0;i<95;i++){
    ctx.beginPath();ctx.strokeStyle=i%3?'#c7ad881c':'#8e735727';ctx.lineWidth=i%7===0?1.4:.6;
    const y=(i*37)%256;ctx.moveTo(0,y);ctx.bezierCurveTo(80,y+Math.sin(i)*6,180,y+Math.cos(i)*4,256,y+Math.sin(i*2)*5);ctx.stroke();
  }
  const grain=new T.CanvasTexture(grainCanvas);grain.colorSpace=T.SRGBColorSpace;grain.anisotropy=4;
  const woodColors=new Set([0xc49a73,0xaa7757,0xd4ac83,0xc39972,0xd4b18c,0xa38261,0xc6a780,0x75583e]);
  const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,16,12),cylinder=new T.CylinderGeometry(1,1,1,24);
  function material(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.80,...(woodColors.has(color)?{map:grain,bumpMap:grain,bumpScale:.012}:{})}));return materials.get(color)}
  function shape(geo,color,x,y,z,sx,sy,sz){const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;root.add(m);return m}
  const box=(c,x,y,z,w,h,d)=>shape(cube,c,x,y,z,w,h,d);
  const cyl=(c,x,y,z,r,h,rz=r)=>shape(cylinder,c,x,y,z,r,h,rz);
  const oval=(c,x,y,z,rx,ry,rz)=>shape(sphere,c,x,y,z,rx,ry,rz);
  function line(points,color,radius=.009){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return shape(new T.TubeGeometry(c,16,radius,5),color,0,0,0,1,1,1)}
  // Shaker panels, a chamfered desk edge, drawer seams and brass hardware.
  box(0xc49a73,-5,1.175,-3.92,2.99,.032,1.15);
  box(0xf0d8af,-5,1.192,-3.342,2.91,.012,.017);
  for(const x of [-6.28,-3.72]){
    box(0xaa7757,x,.49,-3.94,.13,.94,.86);
    box(0xd4ac83,x,.10,-3.94,.15,.13,.90);
  }
  for(const y of [.33,.57,.82]){
    box(0xc39972,-6.02,y,-3.486,.55,.217,.034);
    box(0xdebd96,-6.02,y+.067,-3.459,.43,.012,.01);
    line([[-6.12,y+.02,-3.447],[-6.12,y+.045,-3.419],[-5.94,y+.045,-3.419],[-5.94,y+.02,-3.447]],0xb89a60,.011);
  }
  // Desk mat, mouse, open notebook and a lit articulated task lamp.
  box(0x6c8274,-4.93,1.197,-3.78,1.58,.015,.66);
  for(const z of [-4.10,-3.46])box(0xa8b59c,-4.93,1.207,z,1.54,.002,.004);
  oval(0xd5cbb8,-4.37,1.247,-3.64,.077,.037,.122);
  box(0x827a6f,-4.37,1.282,-3.68,.004,.003,.08);
  line([[-4.37,1.25,-3.75],[-4.4,1.21,-3.88],[-4.65,1.21,-4.06]],0x544c43,.006);
  for(let page=0;page<2;page++){
    const x=-5.75+page*.23;
    box(0xf0e5d0,x,1.213,-3.65,.225,.018,.33);
    for(let i=0;i<5;i++)box(0xc9c0ad,x,1.225,-3.75+i*.045,.17,.001,.003);
  }
  box(0xba7b61,-5.62,1.23,-3.65,.008,.005,.33);
  const pen=box(0x54695e,-5.70,1.246,-3.69,.012,.012,.25);pen.rotation.y=.5;
  cyl(0xa58f58,-6.21,1.225,-4.26,.16,.036);
  cyl(0xc5ad72,-6.21,1.37,-4.26,.017,.27);
  line([[-6.21,1.49,-4.26],[-6.12,1.72,-4.25],[-5.94,1.82,-4.20]],0x9f8d60,.019);
  const shade=shape(new T.CylinderGeometry(.5,1,1,24,1,true),0x687c67,-5.91,1.77,-4.18,.18,.19,.18);shade.rotation.z=.4;
  const bulb=oval(0xffe5a3,-5.88,1.69,-4.18,.13,.018,.13);bulb.material=new T.MeshStandardMaterial({color:0xffe8b0,emissive:0xffbf65,emissiveIntensity:.6});
  const lamp=new T.SpotLight(0xffd9a1,5,4.3,.78,.8,1.6);lamp.position.set(-5.9,1.67,-4.14);lamp.target.position.set(-5.72,1.18,-3.64);root.add(lamp,lamp.target);
  // Books gain paper blocks, spine bands and inset shelves.
  for(let row=0;row<3;row++){
    box(0xd4b18c,-7.21,.13+row*.63,-2.36,.05,.038,1.72);
    for(let i=0;i<7;i++){
      const z=-3.04+i*.20,y=.34+row*.63+(i%3)*.035,h=.36+(i%3)*.07;
      box(0xf0e3ce,-7.105,y+.01,z,.015,h*.79,.108);
      for(const dy of [-h*.31,h*.31])box(0xeed4a2,-7.099,y+dy,z,.006,.015,.12);
      box(0x6e6954,-7.094,y+.01,z,.005,.006,.060);
    }
  }
  // Low basket, a small frame and a trailing vine sit within the existing shelf footprint.
  box(0xa38261,-7.19,.29,-1.68,.39,.26,.34);
  for(let i=0;i<7;i++)box(0xc6a780,-6.987,.20+i*.028,-1.68,.008,.010,.34);
  box(0x75583e,-7.15,2.16,-2.89,.09,.31,.26);
  box(0xe3d6b9,-7.096,2.16,-2.89,.009,.26,.21);
  oval(0xa0ae8a,-7.087,2.16,-2.89,.007,.082,.066);
  cyl(0xd6c0a0,-7.44,2.12,-1.86,.12,.18);
  line([[-7.44,2.24,-1.86],[-7.17,2.16,-1.76],[-7.10,1.98,-1.72],[-7.06,1.72,-1.69]],0x748964,.012);
  for(let i=0;i<7;i++)oval(i%2?0x9aa981:0x788c68,-7.18+(i%2)*.10,2.17-i*.061,-1.74,.08,.035,.054).rotation.z=i%2?.6:-.6;
  // Window casing, latch and warm translucent shafts on the floor.
  for(const x of [-7.36,-5.48])box(0xf0debf,x,1.82,-4.66,.065,1.30,.07);
  box(0xf0debf,-6.42,2.45,-4.66,1.94,.07,.07);
  box(0xb4a17a,-6.42,1.78,-4.65,.025,.085,.036);
  for(let i=0;i<3;i++){
    const m=box(0xffe6a7,-6.75+i*.47,.010,-3.05+i*.06,.34,.003,1.63);m.rotation.y=-.36;
    m.material=new T.MeshBasicMaterial({color:0xffe6ae,transparent:true,opacity:.13,depthWrite:false});m.userData.floorOverlay=true;m.castShadow=false;
  }
  // Rug weave borders and small end tassels, kept clear of the walking path.
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)box([0xb6977a,0xf1debf,0xcdb08b][i],-4.38,.039,-1.85+side*(.83-i*.028),3.3,.004,.012);
    for(let i=0;i<19;i++)box(0xf0dcc3,-5.95+i*.175,.032,-1.85+side*.94,.014,.007,.11);
  }
  return root;
}
