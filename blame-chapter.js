export function createBlameChapter(){
  const state={};
  function reset(now=0){Object.assign(state,{stage:'planning',won:false,witnessed:false,attention:'work',lookBackAt:Infinity,nextLookAt:now+5.2,contactAt:Infinity,actionUntil:0,inspectAt:Infinity,verdictAt:Infinity,retryAt:Infinity,catches:0,uncertain:0,noisePoint:null});}
  function distract(now,point){if(state.stage!=='planning')return false;state.attention='noise';state.noisePoint=point.slice();state.lookBackAt=now+4.5;return true;}
  function begin(now){if(state.stage!=='planning')return null;state.stage='swatting';state.contactAt=now+.34;state.witnessed=false;return {type:'windup'};}
  function tick(now,{watched=false,friendNear=false,friendVisible=false,ownerReady=false}={}){
    if(['planning','swatting'].includes(state.stage)){
      if(state.attention!=='work'&&now>=state.lookBackAt){state.attention='work';state.nextLookAt=now+6.5;}
      if(state.attention==='work'&&now>=state.nextLookAt){state.attention='shelf';state.lookBackAt=now+5.2;}
    }
    if(state.stage==='swatting'&&now>=state.contactAt){
      state.stage='fleeing';state.witnessed=watched;state.actionUntil=now+.55;state.inspectAt=now+7.5;state.departAt=now+1.2;state.departed=false;
      return {type:'crooked'};
    }
    if(state.stage==='fleeing'){
      if(now<=state.actionUntil&&watched)state.witnessed=true;
      if(!state.departed&&now>=state.departAt){state.departed=true;state.attention='picture';return {type:'investigate'};}
      if(now>=state.inspectAt&&ownerReady){state.stage='inspecting';state.verdictAt=now+1.4;return {type:'inspect'};}
    }
    if(state.stage==='inspecting'&&now>=state.verdictAt){
      if(state.witnessed){state.stage='caught';state.catches++;state.retryAt=now+3;return {type:'caught'};}
      if(!watched&&friendNear&&friendVisible){state.stage='won';state.won=true;return {type:'win'};}
      state.stage='uncertain';state.uncertain++;state.retryAt=now+3;return {type:'uncertain',reason:watched?'both-visible':'no-witness'};
    }
    if(['caught','uncertain'].includes(state.stage)&&now>=state.retryAt){
      state.stage='planning';state.witnessed=false;state.attention='work';state.nextLookAt=now+4.8;return {type:'retry'};
    }
    return null;
  }
  reset();return {state,reset,distract,begin,tick};
}
