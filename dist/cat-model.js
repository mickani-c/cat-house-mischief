import * as T from './vendor/three.module.min.js';

// The original rounded cats, with adapters for the later movement and sitting poses.
export function buildCat(parent,coat,mark,creamColor,collarColor){
  const root=new T.Group(),body=new T.Group();parent.add(root);root.add(body);
  const sphere=new T.SphereGeometry(1,20,14),cube=new T.BoxGeometry(1,1,1),cone=new T.ConeGeometry(1,1,4);
  const materials=new Map();
  function material(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.82}));return materials.get(color);}
  function shape(node,geo,color,x,y,z,w,h,d,shadows=true){const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=shadows;m.receiveShadow=true;node.add(m);return m;}
  const oval=(p,c,x,y,z,w,h,d,s)=>shape(p,sphere,c,x,y,z,w,h,d,s);
  const box=(p,c,x,y,z,w,h,d,s)=>shape(p,cube,c,x,y,z,w,h,d,s);
  function group(node,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);node.add(g);return g;}
  oval(body,coat,0,.40,-.10,.255,.25,.43);
  oval(body,creamColor,0,.37,.22,.20,.22,.17);
  oval(body,coat,0,.45,-.31,.218,.214,.243);
  const walkingTorso=body.children.slice();
  const head=group(body,0,.62,.30),eyes=[];
  oval(head,coat,0,0,0,.283,.254,.228);
  for(const sign of [-1,1]){
    const ear=shape(head,cone,coat,sign*.17,.226,-.012,.167,.31,.114);
    ear.rotation.y=Math.PI/4;ear.rotation.z=-sign*.22;
    const inner=shape(head,cone,0xf3afa4,sign*.171,.235,.058,.102,.20,.063);
    inner.rotation.y=Math.PI/4;inner.rotation.z=-sign*.22;
    const eye=group(head,sign*.101,.021,.221);eyes.push(eye);
    oval(eye,0xfff7df,sign*.004,.004,-.020,.063,.072,.025);
    oval(eye,collarColor,0,0,0,.043,.058,.020);
    oval(eye,0x302829,0,0,.016,.025,.051,.013);
    oval(eye,0xffffff,-.009,.021,.028,.012,.017,.008);
    oval(head,creamColor,sign*.062,-.077,.195,.105,.071,.045);
    oval(head,0xeea397,sign*.177,-.045,.181,.050,.030,.019);
    for(let i=0;i<2;i++){
      const whisker=box(head,0x79564e,sign*.229,-.087+i*.031,.20,.103,.010,.012,false);
      whisker.rotation.z=sign*(.05+i*.18);
    }
    oval(head,mark,sign*.101,.154,.147,.025,.060,.039).rotation.z=sign*.30;
  }
  oval(head,mark,0,.176,.154,.028,.062,.031);
  oval(head,0xa65e61,0,-.061,.244,.041,.023,.018);
  const mouth=oval(head,0x6b4145,0,-.129,.23,.036,.043,.019);mouth.visible=false;
  const collar=group(body);
  oval(collar,collarColor,0,.48,.249,.197,.048,.165);
  oval(collar,0xffcd71,0,.45,.402,.05,.061,.026);
  const paws=[],shins=[],feet=[];
  for(const x of [-.16,.16])for(const z of [-.34,.19]){
    const joint=group(body,x,.30,z);joint.userData.restY=.30;
    oval(joint,coat,0,-.11,0,.088,.176,.091);
    const shin=group(joint,0,-.15,0);
    const foot=oval(shin,creamColor,0,-.09,.034,.094,.067,.118);
    paws.push(joint);shins.push(shin);feet.push(foot);
  }
  const tail=group(body,0,.34,-.43);
  const curve=new T.CatmullRomCurve3([
    new T.Vector3(0,0,0),new T.Vector3(.08,.11,-.19),new T.Vector3(.18,.29,-.40),
    new T.Vector3(.26,.48,-.41),new T.Vector3(.32,.58,-.30)
  ]);
  shape(tail,new T.TubeGeometry(curve,12,.070,7),coat,0,0,0,1,1,1);
  oval(tail,mark,.32,.575,-.303,.069,.068,.066);
  for(let i=0;i<3;i++){
    const stripe=oval(body,mark,0,.625-i*.006,-.15-i*.105,.17-i*.016,.032,.033);
    stripe.rotation.y=.18;walkingTorso.push(stripe);
  }
  const sittingBody=group(body);sittingBody.visible=false;
  oval(sittingBody,coat,0,.25,-.16,.27,.245,.28);
  oval(sittingBody,coat,0,.45,.09,.23,.27,.22);
  oval(sittingBody,creamColor,0,.43,.245,.18,.22,.09);
  const curl=new T.CatmullRomCurve3([new T.Vector3(.01,.08,-.35),new T.Vector3(.27,.075,-.30),new T.Vector3(.33,.07,-.06),new T.Vector3(.22,.07,.16)]);
  shape(sittingBody,new T.TubeGeometry(curl,20,.07,7),coat,0,0,0,1,1,1);
  oval(sittingBody,mark,.22,.07,.16,.071,.070,.071);
  const loaf=group(body);loaf.visible=false;
  oval(loaf,coat,0,.22,-.08,.285,.205,.33);
  oval(loaf,creamColor,0,.19,.17,.22,.14,.18);
  for(const x of [-.115,.115])oval(loaf,creamColor,x,.065,.265,.09,.058,.11);
  const tucked=new T.CatmullRomCurve3([new T.Vector3(-.19,.12,-.27),new T.Vector3(-.29,.10,-.12),new T.Vector3(-.28,.09,.14),new T.Vector3(-.16,.09,.24)]);
  shape(loaf,new T.TubeGeometry(tucked,18,.052,7),coat,0,0,0,1,1,1);
  let restActive=false;
  function setResting(amount){
    if(amount<=.01&&!restActive)return;
    restActive=amount>.01;const resting=amount>.5;
    loaf.visible=resting;
    if(resting){
      walkingTorso.forEach(mesh=>mesh.visible=false);sittingBody.visible=false;tail.visible=false;collar.visible=false;
      paws.forEach(paw=>paw.visible=false);
      head.position.set(0,.34,.15);head.rotation.x=.10;head.rotation.z=0;
      body.position.y=.002*Math.sin(performance.now()/1000*2);body.rotation.set(0,0,0);body.scale.set(1,1,1);
    }else if(!restActive){
      walkingTorso.forEach(mesh=>mesh.visible=true);tail.visible=collar.visible=true;paws.forEach(paw=>paw.visible=true);
      head.position.set(0,.62,.30);head.rotation.set(0,0,0);body.scale.set(1,1,1);
    }
  }
  function setSitting(amount){
    const seated=amount>.5;
    walkingTorso.forEach(mesh=>{mesh.visible=!seated;});sittingBody.visible=seated;tail.visible=!seated;
    head.position.y=.62+.04*amount;head.position.z=.30-.10*amount;collar.position.z=-.07*amount;
    paws.forEach((paw,i)=>{if(i===0||i===2)paw.visible=!seated;});
  }
  return {root,body,head,paws,shins,feet,tail,mouth,eyes,setSitting,setResting,loaf,headHeight:.62};
}
