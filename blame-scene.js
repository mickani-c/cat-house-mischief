import * as T from './vendor/three.module.min.js';
export const hideBox={x:-6.65,z:-2.45,entry:[-6.65,-1.65],inside:[-6.65,-2.47]};
export function makeBlameScene(scene,enabled){
  const root=new T.Group();root.visible=enabled;scene.add(root);
  const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,16,10);
  const mat=new T.MeshStandardMaterial({color:0xc8a17b,roughness:1});
  function shape(parent,geo,material,x,y,z,w,h,d){const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const box=new T.Group();box.position.set(hideBox.x,0,hideBox.z);root.add(box);
  shape(box,cube,mat,0,.035,0,1.10,.07,1.12);
  const walls=[[hideBox.x-.55,hideBox.z,.045,1.12,.72],[hideBox.x+.55,hideBox.z,.045,1.12,.72],[hideBox.x,hideBox.z-.56,1.14,.045,.72]];
  for(const [x,z,w,d,h]of walls)shape(box,cube,mat,x-hideBox.x,h/2,z-hideBox.z,w,h,d);
  const rim=new T.MeshStandardMaterial({color:0xe4c5a0,roughness:1});
  shape(box,cube,rim,0,.105,.56,1.10,.21,.045);
  for(const sign of [-1,1]){
    const flap=shape(box,cube,rim,sign*.61,.73,0,.18,.025,1.12);flap.rotation.z=-sign*.45;
  }
  const paw=new T.MeshStandardMaterial({color:0x9b785d,roughness:1});
  shape(box,sphere,paw,.19,.32,.586,.075,.05,.006);
  for(let i=0;i<4;i++)shape(box,sphere,paw,.095+i*.056,.40+(i%3===0?0:.024),.588,.020,.025,.005);
  const toy=new T.Group();toy.position.set(-4.20,1.25,-3.70);root.add(toy);
  const cloth=new T.MeshStandardMaterial({color:0xb99b9e,roughness:1});
  shape(toy,sphere,cloth,0,0,0,.12,.067,.075);
  const ear=new T.MeshStandardMaterial({color:0xe4bbb2,roughness:1});
  for(const sign of [-1,1])shape(toy,sphere,ear,sign*.052,.061,.032,.038,.039,.013);
  const curve=new T.CatmullRomCurve3([new T.Vector3(-.1,0,0),new T.Vector3(-.22,0,-.06),new T.Vector3(-.27,.008,.01)]);
  shape(toy,new T.TubeGeometry(curve,12,.009,5),ear,0,0,0,1,1,1);
  return {root,toy,walls};
}
