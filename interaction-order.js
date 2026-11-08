// Defaults help discover relevant objects; an explicit player selection always stays selected.
export function orderTargets(targets,{episode,stage,friendReady=false,friendComing=false,mainLevel=0}={}){
  let priorities=[];
  if(episode==='cup')priorities=['cup','mochi'];
  else if(episode==='chair')priorities=['chair','owner'];
  else if(episode==='blame'){
    priorities=['fleeing','inspecting'].includes(stage)?['hide-box','print','blame-toy']:
      friendReady||friendComing?['print','blame-toy','mochi']:['blame-toy','print','mochi'];
  }else if(episode==='main')priorities=mainLevel===0?['owner']:mainLevel===1?['food']:mainLevel===2?['chair','owner']:mainLevel===3||mainLevel===4?['cup']:mainLevel===5?['plant-0','plant-1','plant-2','plant-3','plant-4']:mainLevel===6?['ball']:mainLevel===7?['bath-tap','kitchen-tap']:mainLevel===8?['keyboard']:mainLevel===9?['litter']:mainLevel===10?['box','mirror']:[];
  const rank=id=>{const i=priorities.indexOf(id);return i<0?100:i;};
  return targets.map((target,index)=>({target,index})).sort((a,b)=>rank(a.target.id)-rank(b.target.id)||a.index-b.index).map(item=>item.target);
}
