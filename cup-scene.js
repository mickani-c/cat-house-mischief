import * as T from './vendor/three.module.min.js';
export function makeCupScene(scene,player,owner,enabled){
  const root=new T.Group();root.visible=enabled;scene.add(root);
  const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,14,10);
  function mesh(parent,geometry,color,x,y,z,sx,sy,sz){const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const phone=new T.Group();phone.position.set(-7.04,1.13,2.44);phone.rotation.x=-.12;phone.rotation.y=.2;root.add(phone);
  mesh(phone,cube,0x6b665e,0,0,0,.20,.023,.34);
  const display=mesh(phone,cube,0x89a694,0,.014,0,.17,.004,.29);
  for(let i=0;i<3;i++)mesh(phone,cube,0xe9e3c7,0,.017,-.07+i*.052,.105,.001,.016);
  display.material.emissive=new T.Color(0x6eaa95);display.material.emissiveIntensity=.05;
  const toy=new T.Group();toy.position.set(-3.35,.13,1.1);root.add(toy);
  mesh(toy,sphere,0xc68f7e,0,0,0,.13,.13,.13);
  mesh(toy,sphere,0xf5d5ae,0,0,0,.132,.039,.132).rotation.z=.6;
  const coaster=mesh(root,new T.CylinderGeometry(1,1,1,26),0xbd9d72,-5.04,.588,4.14,.21,.014,.21);
  coaster.castShadow=false;
  const droplets=[];
  for(let i=0;i<8;i++){
    const drop=mesh(root,sphere,0x98c8cd,0,0,0,.025+i%3*.006,.040,.025);drop.visible=false;droplets.push(drop);
  }
  const tongue=mesh(player.head,sphere,0xda9991,0,-.119,.247,.020,.008,.029);tongue.visible=false;
  const cloth=mesh(owner.arms[1],cube,0xe5d7bc,0,-.41,.07,.19,.020,.19);cloth.visible=false;
  return {root,toy,display,droplets,tongue,cloth};
}
