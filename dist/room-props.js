import { T } from './scene.js';

const switches=new Set(['curtain','hinge','slide','lid','tilt','water']);

export function initProps(props){
  for(const prop of props){
    if(prop.node)prop.base={position:prop.node.position.clone(),rotation:prop.node.rotation.clone(),scale:prop.node.scale.clone()};
    resetProp(prop);
  }
}

export function resetProp(prop){
  prop.on=prop.kind==='door';
  prop.ajar=prop.id==='bath-door';
  prop.amount=prop.ajar?.62:prop.on?1:0;
  prop.latched=false;prop.marked=false;prop.discovered=false;
  prop.started=-Infinity;
  prop.scratchedAt=-Infinity;prop.rollFrom=null;prop.rollTo=null;prop.pushTarget=null;
  if(prop.node){
    prop.node.position.copy(prop.base.position);
    prop.node.rotation.copy(prop.base.rotation);
    prop.node.scale.copy(prop.base.scale);
  }
  if(prop.effect)prop.effect.visible=prop.kind==='screen';
}

export function activateProp(prop,t){
  if(switches.has(prop.kind))prop.on=!prop.on;
  prop.started=t;prop.discovered=false;
  if(prop.kind==='mirror')prop.marked=true;
  if(prop.kind==='ball'){
    prop.rollFrom=prop.node.position.clone();prop.rollTo=prop.pushTarget?.clone()??null;prop.pushTarget=null;
    prop.ballStart=prop.node.position.x;
    prop.ballEnd=prop.ballStart>.5+prop.base.position.x?prop.base.position.x:prop.base.position.x+1.06;
  }
}

export function updateProp(prop,t,dt){
  const {kind,node,base,effect}=prop;
  const elapsed=t-prop.started;
  const decay=Math.max(0,1-elapsed/1.10);
  const wiggle=decay?Math.sin(elapsed*23)*decay:0;
  const goal=prop.ajar?.62:prop.on?1:0;
  if(prop.amount!==goal){
    prop.amount+=(goal-prop.amount)*Math.min(1,dt*9);
    if(Math.abs(prop.amount-goal)<.008)prop.amount=goal;
  }
  const open=prop.amount;
  switch(kind){
    case 'door':node.rotation.y=1.38*open;break;
    case 'hinge':node.rotation.y=base.rotation.y-open*.92;break;
    case 'curtain':{
      const sinceScratch=t-prop.scratchedAt;
      const flutter=sinceScratch<1.1?Math.sin(sinceScratch*29)*(1-sinceScratch/1.1):0;
      node.rotation.z=base.rotation.z+flutter*.065;
      node.rotation.x=base.rotation.x+flutter*.085;
      effect.position.z=node.position.z+.030+flutter*.037;
      effect.rotation.x=flutter*.065;
      effect.visible=prop.on;
      break;
    }
    case 'slide':node.position.z=base.position.z+open*(prop.id==='desk-drawer'?.32:.21);break;
    case 'lid':node.rotation.x=-open*1.35;break;
    case 'tilt':node.rotation.z=base.rotation.z+open*.22;break;
    case 'wiggle':node.rotation.z=base.rotation.z+wiggle*.46;break;
    case 'knead':if(node)node.scale.y=base.scale.y*(1+wiggle*.13);break;
    case 'spin':
      node.rotation.y=base.rotation.y+Math.PI*2*T.MathUtils.smoothstep(elapsed,0,.95);
      break;
    case 'screen':effect.visible=true;break;
    case 'light':effect.visible=elapsed<1.2;break;
    case 'mirror':effect.visible=prop.marked;break;
    case 'water':{
      effect.visible=prop.on;
      if(prop.on){
        const {stream,ripples}=effect.userData;
        stream.scale.x=stream.scale.z=.034+.006*Math.sin(t*31);
        for(const [i,ripple] of ripples.entries()){
          const pulse=(t*2.15+i*.5)%1;
          ripple.scale.setScalar(.67+pulse*1.08);
        }
      }
      break;
    }
    case 'dig':{
      effect.visible=Number.isFinite(prop.started);
      if(effect.visible)for(const grain of effect.children){
        const p=grain.userData.launch,age=elapsed-p.delay;
        grain.visible=age>=0;if(!grain.visible)continue;
        const flight=(p.vy+Math.sqrt(p.vy*p.vy+4*4.9*(.22-.025)))/9.8;
        const t=Math.min(age,flight);
        grain.position.set(p.x+p.vx*t,Math.max(.025,.22+p.vy*t-4.9*t*t),p.z+p.vz*t);
        grain.rotation.set(t*5,t*7,t*3);
      }
      break;
    }
    case 'ball':
      if(Number.isFinite(prop.started)){
        const progress=T.MathUtils.smoothstep(elapsed,0,1.12);
        if(prop.rollTo)node.position.lerpVectors(prop.rollFrom,prop.rollTo,progress);
        else node.position.x=T.MathUtils.lerp(prop.ballStart,prop.ballEnd,progress);
        node.rotation.z=(node.position.x-base.position.x)*-7.4;node.rotation.x=(node.position.z-base.position.z)*7.4;
      }
      break;
    case 'roll':{
      const offset=Number.isFinite(prop.started)?Math.min(1,elapsed/.9):0;
      if(prop.dropTarget){
        const progress=T.MathUtils.smoothstep(offset,0,1),[x,y,z]=prop.dropTarget;
        node.position.set(T.MathUtils.lerp(base.position.x,x,progress),T.MathUtils.lerp(base.position.y,y,progress)+Math.sin(progress*Math.PI)*.20,T.MathUtils.lerp(base.position.z,z,progress));
      }else{
        node.position.z=base.position.z+offset*.73;
        node.position.y=base.position.y-Math.max(0,offset-.52)**2*4.15;
      }
      node.rotation.x=base.rotation.x+offset*7;
      break;
    }
  }
}
