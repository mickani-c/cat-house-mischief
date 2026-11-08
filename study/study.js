const ui=Object.fromEntries([...document.querySelectorAll('[id]')].map(element=>[element.id,element]));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const mix=(a,b,t)=>a+(b-a)*t;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const floor={left:.14,right:.91,top:.662,bottom:.930};
const tabletop={left:.565,right:.865,top:.302,bottom:.329};
const launch={x:.755,y:.710};
const keys=new Set();
const directions={
  ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],
  ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]
};
const words=['jjj','///','  mmm','  kkkkk'];
const game={now:0};
const sprite=ui.cat.getContext('2d');
const frameWidth=400,frameHeight=300,atlasColumns=4;
const clips={
  side:{first:0,count:8,idle:16},
  toward:{first:8,count:4,idle:17},
  away:{first:12,count:4,idle:18}
};
let atlas;
let shownFrame=-1;
let sound=true;
let audio;
let breath;
let ready=false;
let hud='';

function reset(){
  keys.clear();
  Object.assign(game,{
    x:.422,y:.877,onDesk:false,hop:null,walk:null,facing:1,heading:'side',gaitPhase:0,mode:'room',
    taps:0,goal:false,captionUntil:0,blockAt:Infinity,blocked:false
  });
  hud='';
  ui.stage.dataset.mode='room';
  ui.stage.classList.remove('tap');
  ui.caption.hidden=true;
  ui.draft.hidden=true;
  draw(0,false);
  updateHud();
}

function unlockAudio(){
  if(!sound)return;
  try{
    if(!audio)audio=new AudioContext();
    audio.resume().catch(()=>{});
  }catch{}
}
function clickSound(number){
  if(!sound||audio?.state!=='running')return;
  const t=audio.currentTime;
  for(const [pitch,volume] of [[132+number*21,.062],[525+number*34,.013]]){
    const source=audio.createOscillator(),gain=audio.createGain();
    source.type='triangle';
    source.frequency.setValueAtTime(pitch,t);
    source.frequency.exponentialRampToValueAtTime(pitch*.55,t+.07);
    gain.gain.setValueAtTime(volume,t);
    gain.gain.exponentialRampToValueAtTime(.001,t+.084);
    source.connect(gain).connect(audio.destination);
    source.start(t);source.stop(t+.09);
  }
}
function sigh(){
  if(!sound||audio?.state!=='running')return;
  if(!breath){
    breath=audio.createBuffer(1,Math.ceil(audio.sampleRate*.61),audio.sampleRate);
    const samples=breath.getChannelData(0);
    let noise=0;
    for(let i=0;i<samples.length;i++){
      noise=noise*.75+(Math.random()*2-1)*.25;
      samples[i]=noise*Math.sin(Math.PI*i/samples.length)**1.8;
    }
  }
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  source.buffer=breath;filter.type='lowpass';filter.frequency.value=580;gain.gain.value=.19;
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
}
function caption(line,seconds=3.8){
  ui.speaker.textContent='阿澄';
  ui.line.textContent=line;
  ui.caption.hidden=false;
  game.captionUntil=game.now+seconds;
}
function complete(line){
  if(game.goal)return;
  game.goal=true;
  caption(line,Infinity);
  sigh();
}
function inJumpRange(){
  return game.x>.655&&game.x<.89&&game.y<.775;
}
function inKeyRange(){
  return game.onDesk&&game.x<.704;
}
function jump(){
  if(!ready||game.hop||game.mode!=='room'||(!game.onDesk&&!inJumpRange()))return;
  unlockAudio();
  const up=!game.onDesk;
  game.walk=null;
  game.hop={
    fromX:game.x,fromY:game.y,fromDesk:game.onDesk,
    x:up?clamp(game.x,.716,.83):launch.x,y:up?.319:launch.y,
    up,start:game.now
  };
}
function enterShot(mode){
  game.mode=mode;
  game.walk=null;
  keys.clear();
  ui.stage.dataset.mode=mode;
  ui.caption.hidden=true;
}
function leaveShot(){
  if(game.mode==='room')return;
  enterShot('room');
  ui.draft.hidden=true;
  ui.stage.focus({preventScroll:true});
}
function type(){
  if(!ready||game.hop||game.mode==='block'||!inKeyRange()||game.goal)return;
  unlockAudio();
  if(game.mode==='room'){
    game.taps=0;
    enterShot('keyboard');
  }
  game.taps++;
  ui.draft.hidden=false;
  ui['draft-text'].textContent=words.slice(0,game.taps).join('');
  ui.stage.classList.remove('tap');
  void ui.stage.offsetWidth;
  ui.stage.classList.add('tap');
  clickSound(game.taps);
  if(game.taps===4)complete('栗子……你幫我打咗封咩信呀？');
}
function block(){
  if(!ready||game.hop||game.mode!=='room'||!inKeyRange()||game.goal)return;
  unlockAudio();
  enterShot('block');
  game.blockAt=game.now+1.20;
  game.blocked=false;
}

function updateHud(){
  const mode=game.mode;
  const phase=game.goal?'done':mode==='keyboard'?'typing':mode==='block'?'blocking':
    game.onDesk?(inKeyRange()?'at-keys':'on-desk'):inJumpRange()?'at-desk':'floor';
  const signature=[ready,phase,mode,game.taps,!!game.hop].join(':');
  if(signature===hud)return;
  hud=signature;
  const directionsByPhase={
    done:[3,'成功吸引阿澄注意！','可以返去書桌，或者重玩試另一種方法。'],
    typing:[3,'踩多幾下鍵盤','每踩一下，記事簿就會多一串字。'],
    blocking:[3,'企定，望住阿澄','栗子正在屏幕前坐低。'],
    'at-keys':[2,'到鍵盤喇','試踩鍵盤，或者索性坐喺屏幕前。'],
    'on-desk':[2,'沿枱面行向鍵盤','向左行，或者點枱面近鍵盤嗰邊。'],
    'at-desk':[1,'跳上書桌','撳空白鍵，或者用下面嘅跳躍掣。'],
    floor:[1,'行近書桌右邊','點地面移動，或者用方向鍵／WASD。']
  };
  const [step,title,tip]=directionsByPhase[phase];
  ui.step.firstChild.textContent='0'+step+' ';
  ui.prompt.textContent=ready?title:'書房載入中…';
  ui.tip.textContent=tip;
  ui.location.textContent=mode==='keyboard'?'書房 · 鍵盤特寫':mode==='block'?'書房 · 屏幕特寫':'書房 · 黃昏';
  ui.goal.textContent=game.goal?'✓ 達成 · 阿澄望過嚟喇':'目標 · 讓阿澄望一望你';
  ui.goal.classList.toggle('done',game.goal);
  ui.jump.hidden=mode!=='room';
  ui.jump.disabled=!ready||!!game.hop||(!game.onDesk&&!inJumpRange());
  ui.jump.querySelector('span').textContent=game.onDesk?'跳落地':'跳上書桌';
  ui.type.hidden=game.goal||mode==='block'||!inKeyRange();
  ui.type.querySelector('span').textContent=mode==='keyboard'?'踩鍵盤 '+game.taps+'/4':'踩鍵盤';
  ui.type.disabled=!!game.hop;
  ui.block.hidden=game.goal||mode!=='room'||!inKeyRange();
  ui.block.disabled=!!game.hop;
  ui.leave.hidden=mode==='room';
  ui.reset.hidden=!game.goal;
  ui.target.hidden=mode!=='room'||game.onDesk||!!game.hop||game.goal;
}

function bound(box,x,y){
  return {x:clamp(x,box.left,box.right),y:clamp(y,box.top,box.bottom)};
}
function walk(dt){
  const box=game.onDesk?tabletop:floor;
  let vx=0,vy=0;
  for(const code of keys){
    const [x,y]=directions[code];
    vx+=x;vy+=y;
  }
  if(vx||vy)game.walk=null;
  else if(game.walk){
    vx=game.walk.x-game.x;
    vy=(game.walk.y-game.y)*2.4;
  }
  const length=Math.hypot(vx,vy);
  if(length<.002){
    game.walk=null;
    return false;
  }
  const speed=(game.onDesk?.076:.098)*dt;
  const amount=game.walk?Math.min(speed,length):speed;
  const next=bound(box,game.x+vx/length*amount,game.y+vy/length*amount/2.4);
  const dx=next.x-game.x,dy=(next.y-game.y)*2.4;
  const travelled=Math.hypot(dx,dy);
  if(travelled>.00005){
    const depthThreshold=game.heading==='side'?1.28:.92;
    if(Math.abs(dy)>Math.abs(dx)*depthThreshold){
      game.heading=dy<0?'away':'toward';
    }else{
      game.heading='side';
      game.facing=Math.sign(dx)||game.facing;
    }
    const stride=spriteHeight(next.y,game.onDesk)*.0027;
    game.gaitPhase=(game.gaitPhase+travelled/stride)%1;
  }else{
    game.gaitPhase=0;
  }
  game.x=next.x;game.y=next.y;
  return travelled>.00005;
}
function spriteHeight(y,onDesk){
  return onDesk?19.8:mix(18,27,clamp((y-floor.top)/(floor.bottom-floor.top),0,1));
}
function paintCat(frame){
  if(!atlas||frame===shownFrame)return;
  shownFrame=frame;
  sprite.clearRect(0,0,frameWidth,frameHeight);
  sprite.drawImage(atlas,(frame%atlasColumns)*frameWidth,Math.floor(frame/atlasColumns)*frameHeight,
    frameWidth,frameHeight,0,0,frameWidth,frameHeight);
}
function draw(progress,moving){
  const hop=game.hop;
  const feetX=hop?mix(hop.fromX,hop.x,progress):game.x;
  const feetY=hop?mix(hop.fromY,hop.y,progress):game.y;
  const lift=hop?Math.sin(Math.PI*progress)*(hop.up?.094:.064):0;
  const size=hop?mix(spriteHeight(hop.fromY,hop.fromDesk),spriteHeight(hop.y,hop.up),progress):spriteHeight(feetY,game.onDesk);
  const clip=clips[game.heading];
  const frame=hop?19:moving?clip.first+Math.floor(game.gaitPhase*clip.count):clip.idle;
  paintCat(frame);
  ui.cat.style.left=(feetX*100)+'%';
  ui.cat.style.top=((feetY-lift)*100)+'%';
  ui.cat.style.height=size*1.10+'%';
  const flip=hop||game.heading==='side'?game.facing:1;
  const lean=hop&&!reducedMotion?Math.sin(Math.PI*progress)*-10*flip:0;
  ui.cat.style.transform='translate(-50%,-94%) rotate('+lean+'deg) scaleX('+flip+')';
  const shadowWidth=size*.47;
  ui['ground-shadow'].style.left=(feetX*100-shadowWidth/2)+'%';
  ui['ground-shadow'].style.top=(feetY*100-1.55)+'%';
  ui['ground-shadow'].style.width=shadowWidth+'%';
  ui['ground-shadow'].style.opacity=hop?String(1-.65*Math.sin(Math.PI*progress)):'1';
  ui.target.style.left=(launch.x*100)+'%';
  ui.target.style.top=(launch.y*100)+'%';
}

function moveByClick(event){
  if(!ready||game.mode!=='room'||game.hop||event.button!==0)return;
  const rect=ui.stage.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
  if(game.onDesk){
    game.walk=bound(tabletop,x,y);
  }else{
    game.walk=y<floor.top&&x>.49?{...launch}:bound(floor,x,y);
  }
  ui.stage.focus({preventScroll:true});
}
ui.stage.addEventListener('pointerup',event=>{if(!event.target.closest('#companion'))moveByClick(event);});
ui.companion.addEventListener('click',()=>{
  ui.companion.classList.remove('pet');void ui.companion.offsetWidth;ui.companion.classList.add('pet');
  ui.companion.querySelector('span').textContent='呼嚕～';
});
ui.jump.addEventListener('click',jump);
ui.type.addEventListener('click',type);
ui.block.addEventListener('click',block);
ui.leave.addEventListener('click',leaveShot);
ui.reset.addEventListener('click',()=>{reset();ui.stage.focus({preventScroll:true});});
ui.sound.addEventListener('click',()=>{
  sound=!sound;
  ui.sound.setAttribute('aria-pressed',String(sound));
  ui.sound.textContent=sound?'音效開':'音效關';
  if(sound)unlockAudio();
});
window.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||!ready)return;
  const code=event.code||event.key;
  if(directions[code]){
    if(game.mode==='room')keys.add(code);
    event.preventDefault();
  }else if(code==='Space'&&!(event.target instanceof HTMLButtonElement)){
    event.preventDefault();
    if(!event.repeat)jump();
  }else if(!event.repeat&&code==='KeyE')type();
  else if(!event.repeat&&code==='KeyF')block();
  else if(code==='Escape')leaveShot();
});
window.addEventListener('keyup',event=>keys.delete(event.code||event.key));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
for(let i=0;i<18;i++){
  const mote=document.createElement('i');
  mote.style.left=(39+(i*17%58))+'%';mote.style.top=(14+(i*23%74))+'%';
  mote.style.setProperty('--dur',(5+i%6)+'s');
  mote.style.setProperty('--delay',(-i%7)+'s');
  ui.dust.append(mote);
}

function preload(url){
  const image=new Image();
  image.src=url;
  return image.decode().then(()=>image);
}
reset();
Promise.all(['chestnut-motion','study','keyboard','keys-raised','block'].map(asset=>preload('./assets/'+asset+'.webp'))).then(([motion])=>{
  atlas=motion;
  ready=true;draw(0,false);updateHud();
}).catch(()=>{ui['load-error'].hidden=false;});
let previous=performance.now();
function frame(now){
  const dt=Math.max(0,Math.min(.06,(now-previous)/1000));
  previous=now;
  game.now+=dt;
  if(ready&&game.mode==='room'){
    if(game.hop){
      const progress=clamp((game.now-game.hop.start)/.70,0,1);
      draw(progress,false);
      if(progress===1){
        const {x,y,up}=game.hop;
        game.hop=null;
        game.x=x;game.y=y;game.onDesk=up;
      }
    }else draw(0,walk(dt));
  }
  if(game.mode==='block'&&!game.blocked&&game.now>=game.blockAt){
    game.blocked=true;
    complete('唉……成個屏幕淨係見到你嚿背脊。');
  }
  if(game.now>=game.captionUntil)ui.caption.hidden=true;
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
