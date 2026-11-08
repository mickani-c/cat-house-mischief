export function createCupChapter(){
  const state={};
  function reset(now=0){Object.assign(state,{stage:'idle',won:false,progress:0,exposure:0,catches:0,spills:0,attention:'cup',nextLookAt:now+5.5,lookBackAt:Infinity,cooldown:0,guardUntil:0,bumpedAt:-Infinity,refillAt:Infinity,method:null});}
  function lookAway(now,source='phone',seconds=4.8){
    if(state.won||state.stage==='spilled')return false;
    if(state.stage==='caught'){if(source==='phone'||now<state.cooldown)return false;state.stage='idle';state.guardUntil=0;}
    state.attention=source;state.lookBackAt=now+seconds;return true;
  }
  function caught(now){
    if(state.won||state.stage==='spilled'||state.stage==='caught')return null;
    state.stage='caught';state.catches++;state.progress=state.exposure=0;state.cooldown=now+1.5;state.guardUntil=now+6;
    state.attention='cup';state.lookBackAt=Infinity;return {type:'caught'};
  }
  function begin(now,{watched=false}={}){
    if(state.won||now<state.cooldown||!['idle','approaching','drinking'].includes(state.stage))return null;
    if(state.stage==='approaching'||state.stage==='drinking'){state.stage='idle';state.exposure=0;return {type:'stop'};}
    if(watched)return caught(now);
    state.stage='approaching';return {type:'approach'};
  }
  function cancel(){if(['approaching','drinking'].includes(state.stage)){state.stage='idle';state.exposure=0;}}
  function bump(now){
    if(state.stage==='spilled'||now<state.cooldown)return null;
    cancel();
    if(now-state.bumpedAt<3){
      state.stage='spilled';state.spills++;state.progress=0;state.exposure=0;state.refillAt=now+5.5;
      state.attention='cup';state.lookBackAt=Infinity;state.bumpedAt=-Infinity;
      return {type:'spill'};
    }
    state.bumpedAt=now;return {type:'wobble'};
  }
  function tick(now,dt,{watched=false,onTable=false,ready=false,cleanupReady=true}={}){
    if(state.stage==='spilled'){
      if(now>=state.refillAt&&cleanupReady){state.stage=state.won?'won':'idle';state.cooldown=now+.8;state.nextLookAt=now+4;return {type:'refill'};}
      return null;
    }
    if(state.stage==='caught'){
      if(watched&&onTable)state.guardUntil=Math.max(state.guardUntil,now+1.5);
      if(now>=Math.max(state.cooldown,state.guardUntil)){state.stage='idle';state.nextLookAt=now+3.2;return {type:'retry'};}
      return null;
    }
    if(state.attention!=='cup'&&now>=state.lookBackAt){state.attention='cup';state.nextLookAt=now+6.3;}
    if(!state.won&&state.attention==='cup'&&now>=state.nextLookAt){lookAway(now,'phone',4.8);return {type:'glance'};}
    if(['approaching','drinking'].includes(state.stage)&&!onTable){cancel();return {type:'stop'};}
    if(watched&&['approaching','drinking'].includes(state.stage))return caught(now);
    if(state.stage==='approaching'&&ready){state.stage='drinking';return {type:'sip'};}
    if(state.stage!=='drinking')return null;
    if(!watched){
      state.progress=Math.min(1,state.progress+dt/1.65);
      state.method=state.attention==='chain'?'借麻糬追波':state.attention==='mochi'?'麻糬分散注意':state.attention==='noise'?'叫聲引開視線':state.attention==='phone'?'趁主人望手機':'利用視線死角';
      if(state.progress>=1){state.stage='won';state.won=true;return {type:'win'};}
    }
    return null;
  }
  reset();return {state,reset,lookAway,begin,cancel,bump,tick,caught};
}
