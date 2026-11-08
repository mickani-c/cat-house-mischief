import { campaignLevels as levels, ballGoal } from './campaign.js';
import { poseContact } from './contact-actions.js';
import { orderTargets } from './interaction-order.js?v=2';
import { createBlameChapter } from './blame-chapter.js';
import { makeBlameScene, hideBox } from './blame-scene.js';
import { makeCupScene } from './cup-scene.js';
import { createCupChapter } from './cup-chapter.js';
import { createChairChapter, chairMethods } from './chair-chapter.js';
import { T, bounds, cat, colliders, host, makeHouse, partitions, platforms, spots } from './scene.js?v=6';

import { makeRenderer } from './renderer.js';
import { canWitness } from './sight.js';
import { activateProp, initProps, resetProp, updateProp } from './room-props.js?v=2';

const ui = Object.fromEntries(
  [...document.querySelectorAll('[id]')].map(element => [element.id,element])
);
const preview=new URLSearchParams(location.search).get('preview');
const chairEpisode=preview==='chair';
const cupEpisode=preview==='cup';
const blameEpisode=preview==='blame';
const showcase=chairEpisode||cupEpisode||blameEpisode||preview==='study';
const blameChapter=createBlameChapter();
const cupChapter=createCupChapter();
const chairChapter=createChairChapter();
const scene = new T.Scene();
scene.background = new T.Color(0xddd3c7);
const overhead = new T.OrthographicCamera(-1,1,1,-1,.1,80);
const closeCamera=new T.OrthographicCamera(-1,1,1,-1,.1,65);
const detailCamera=new T.OrthographicCamera(-1,1,1,-1,.1,80);
const detailTarget=new T.Vector3(),detailAim=new T.Vector3(),detailOffset=new T.Vector3();
const detailLook=new T.Vector3(),detailView=new T.Vector3();
const detailCameraOffset=new T.Vector3(5.3,6.4,13.2);
const shotOffset=new T.Vector3(),shotGoalOffset=new T.Vector3();
const cameraBlockVector=new T.Vector3();
let focusMix=0;
let detailHeight=2.9;
let closeView=false;
const closeTarget=new T.Vector3();
const closeOffset=new T.Vector3(2.40,2.00,4.80);
const occlusion=new T.Ray();
const occlusionBox=new T.Box3();
const occlusionHit=new T.Vector3();
const cameraOffset = new T.Vector3(7.4,12.2,17.5);
const cameraTarget = new T.Vector3(0,.44,-.15);
const renderer = makeRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));
renderer.domElement.setAttribute('aria-label','栗子與麻糬的 3D 小屋');
ui.world.append(renderer.domElement);

scene.add(new T.HemisphereLight(0xfff4ed,0xa6a298,1.16));
const sun=new T.DirectionalLight(0xffe7c6,2.0);
sun.position.set(-7,14,4);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-13,right:13,top:12,bottom:-12,far:35});
sun.shadow.bias=-.0003;
sun.shadow.normalBias=.025;
scene.add(sun);

const ground = new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xe8d7c7,roughness:1}));
ground.rotation.x=-Math.PI/2;
ground.position.y=-.46;
ground.receiveShadow=true;
scene.add(ground);

const {bowl,kibble,mug,water,puddle,plants,looseLeaves,props,writeScreen,cameraObstacles}=makeHouse(scene);
initProps(props);
const roomDoors=props.filter(prop=>prop.kind==='door');
const roomObjects=props.filter(prop=>prop.kind!=='door');
const oranges=roomObjects.filter(prop=>prop.orange);
const bathDoor=roomDoors.find(prop=>prop.id==='bath-door');
const keyboard=roomObjects.find(prop=>prop.id==='keyboard');
const monitor=roomObjects.find(prop=>prop.id==='monitor');
const shots={
  litter:{label:'撥砂特寫',y:.32,depth:.12,height:2.9,angle:[6,13,13]},
  print:{label:'掛畫特寫',y:1.72,depth:0,height:2.9,angle:[6.0,7.0,12]},
  'cup-focus':{label:'水杯特寫',y:1.02,depth:0,height:2.8,angle:[5.5,5.0,11.5]},
  keyboard:{label:'鍵盤特寫',y:1.46,depth:-.12,height:2.6,angle:[9.1,7.3,10.1]},
  monitor:{label:'電腦特寫',y:1.62,depth:-.10,height:2.7,angle:[9.1,7.3,10.1]},
  mirror:{label:'鏡前特寫',y:1.70,depth:-.06,height:2.75},
  'bath-tap':{label:'水龍頭特寫',y:1.49,depth:-.10,height:2.55,angle:[9.0,7.1,10.4]},
  'kitchen-tap':{label:'水龍頭特寫',y:1.61,depth:-.07,height:2.55,angle:[9.0,7.1,10.4]}
};
const cupFocus={id:'cup-focus',x:-5.04,z:4.14,support:'table',contactY:.88,reach:.92};
const featuredProps=[...roomObjects.filter(prop=>shots[prop.id]),...(cupEpisode?[cupFocus]:[])];
const sightFurniture=platforms.filter(platform=>!['chair','carton','perch','sofa'].includes(platform.id))
  .map(platform=>[...platform.collider,platform.height]);
sightFurniture.push([-5.56,1.60,3.28,.30,1.42],[7.29,-2.72,1.03,1.21,2.16]);
const sightEye=new T.Vector3(),sightTarget=new T.Vector3();
const reactions={
  litter:['栗子，啲砂撥晒出嚟喇！','唉……又要掃返啲砂。'],
  scratch:['栗子，梳化唔係磨爪板呀。','唉……你明明有貓抓柱㗎。'],
  plant:['栗子，放過盆植物啦。','唉……又要執葉喇。'],
  drop:['喂，隻杯唔係玩具呀！','唉……又要抹地喇。'],
  bowl:['栗子，個碗聽到你喇。','唉……碗都俾你催工。'],
  keyboard:['栗子，你幫我打咗一行亂碼呀？','唉……今次又打咗乜呀？'],
  monitor:['栗子，個屏幕淨係睇到你個背脊！','唉……我淨係睇到一嚿毛。'],
  water:['栗子，做咩開咗水龍頭呀？','唉……又要我幫你閂水。'],
  mirror:['喂，塊鏡多咗隻貓爪印呀。','唉……嗰個爪印係邊個嘅呢？'],
  curtain:['栗子，唔好抓幅窗簾呀。','唉……窗簾又俾你當磨爪板。'],
  print:['幅畫歪咗喇，栗子。','唉……幅畫今日又要扶正。'],
  fruit:['個橙唔係波嚟㗎，栗子。','唉……個橙又滾走喇。'],
  cabinet:['入面冇你嘅零食呀。','唉……廚櫃都俾你巡過。'],
  drink:['栗子，嗰杯係我㗎！','唉……又偷飲我杯水。']
};
const chair=platforms.find(platform=>platform.id==='chair');
const coffeeTable=platforms.find(platform=>platform.id==='table');
const kitchenCounter=platforms.find(platform=>platform.id==='counter');
const fridgeStep=platforms.find(platform=>platform.id==='fridge-step');
const fridgeTop=platforms.find(platform=>platform.id==='fridge-top');
const roomLabels=[];
scene.traverse(node=>{if(node.isSprite)roomLabels.push(node);});
const player=cat(scene,0xe59a59,0xb76b46,0xffe6c6,0x87a88e);
const mochi=cat(scene,0x9e9bb2,0x77748d,0xf4e7db,0xcea182);
const owner=host(scene);
owner.root.scale.setScalar(.99);

function ring(color,size){
  const mesh=new T.Mesh(
    new T.RingGeometry(size*.81,size,40),
    new T.MeshBasicMaterial({color,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false})
  );
  mesh.rotation.x=-Math.PI/2;
  scene.add(mesh);
  return mesh;
}
const playerRing=ring(0xfff2ac,.44);
const shadowDisc=new T.CircleGeometry(1,22);
function contactShadow(){
  const parts=[];
  for(const [size,opacity] of [[.48,.09],[.39,.08],[.27,.10]]){
    const mesh=new T.Mesh(shadowDisc,new T.MeshBasicMaterial({color:0x795744,transparent:true,opacity,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;
    mesh.scale.set(size,size*.63,1);
    mesh.userData.contactShadow=true;
    mesh.userData.opacity=opacity;
    scene.add(mesh);
    parts.push(mesh);
  }
  return parts;
}
const actorShadows=[[player,contactShadow()],[mochi,contactShadow()]];
const cupSpot=[mug.position.x,mug.position.z];
const plantSpots=plants.map(plant=>[plant.position.x,plant.position.z]);
const saveKey='cat-house-current-level';
const state={now:0,level:0};
let unlockedLevel=0;
let albumOpen=false;
let albumReturnFocus=null;
let cupDropStreak=0;
let secretCupUnlocked=false;
let secretOrangeUnlocked=false,secretFridgeUnlocked=false;
let secretBathUnlocked=false,secretCozyUnlocked=false,secretHideUnlocked=false,foodCompleted=false;
const recordImageRequests=new WeakMap();
try{
  const legacy=localStorage.getItem('cat-house-campaign-version')!=='2';
  const oldSaved=Number(localStorage.getItem(saveKey));
  const saved=showcase?0:legacy&&oldSaved>=1?1:oldSaved;
  if(Number.isInteger(saved)&&saved>=0&&saved<=levels.length)state.level=saved;
  const oldUnlocked=Number(localStorage.getItem('cat-house-unlocked-level'));
  const unlocked=legacy&&oldUnlocked>=1?oldUnlocked+1:oldUnlocked;
  unlockedLevel=Math.min(levels.length,Math.max(state.level,Number.isInteger(unlocked)?unlocked:0));
  if(legacy&&!showcase){localStorage.setItem(saveKey,String(state.level));localStorage.setItem('cat-house-unlocked-level',String(unlockedLevel));localStorage.setItem('cat-house-campaign-version','2');}
  foodCompleted=localStorage.getItem('cat-house-food-complete')==='1';
  cupDropStreak=Math.min(3,Math.max(0,Number(localStorage.getItem('cat-house-cup-drop-streak'))||0));
  secretCupUnlocked=localStorage.getItem('cat-house-secret-cup')==='1';
  secretOrangeUnlocked=localStorage.getItem('cat-house-secret-orange')==='1';
  secretFridgeUnlocked=localStorage.getItem('cat-house-secret-fridge')==='1';
  secretBathUnlocked=localStorage.getItem('cat-house-secret-bath')==='1';
  secretCozyUnlocked=localStorage.getItem('cat-house-secret-cozy')==='1';
  secretHideUnlocked=localStorage.getItem('cat-house-secret-hide')==='1';
}catch{}
function saveCupDropStreak(count){
  cupDropStreak=count;
  try{localStorage.setItem('cat-house-cup-drop-streak',String(count));}catch{}
}
function collectSecretCup(){
  if(!state.secretPending||secretCupUnlocked)return;
  state.secretPending=false;
  secretCupUnlocked=true;
  try{localStorage.setItem('cat-house-secret-cup','1');}catch{}
  showSecretReward('cup');
}
function showRecordImage(image,src,alt){
  const request=(recordImageRequests.get(image)||0)+1;
  recordImageRequests.set(image,request);
  image.classList.add('record-loading');
  const reveal=()=>{if(recordImageRequests.get(image)===request)image.classList.remove('record-loading');};
  image.addEventListener('load',reveal,{once:true});
  image.addEventListener('error',reveal,{once:true});
  image.src=src;image.alt=alt;
  if(image.complete&&image.naturalWidth)reveal();
}
function showSecretReward(kind){
  const record=secretCases.find(item=>item.id===kind);
  state.secretType=kind;
  showRecordImage(ui['secret-photo'],record.photo,record.alt);
  ui['secret-caption'].textContent='秘密證物 · '+record.title;
  ui['secret-title'].textContent=record.title;
  ui['secret-description'].textContent=record.description;
  ui['secret-quote'].textContent=record.quote;
  updateAlbumCount();
  ui.toast.hidden=ui.speech.hidden=true;
  state.secretOpen=true;
  ui['secret-reward'].hidden=false;
  ui['secret-continue'].focus({preventScroll:true});
}
function collectSecret(kind){
  if(kind==='orange'){
    if(secretOrangeUnlocked)return;
    secretOrangeUnlocked=true;
  }else if(kind==='fridge'){
    if(secretFridgeUnlocked)return;
    secretFridgeUnlocked=true;
  }else if(kind==='bath'){
    if(secretBathUnlocked)return;
    secretBathUnlocked=true;
  }else if(kind==='cozy'){
    if(secretCozyUnlocked)return;
    secretCozyUnlocked=true;
  }else if(kind==='hide'){
    if(secretHideUnlocked)return;
    secretHideUnlocked=true;
  }else return;
  try{localStorage.setItem('cat-house-secret-'+kind,'1');}catch{}
  // A kitchen cleanup may finish while Chestnut is stranded. Preserve that
  // photo in the album without interrupting the current rescue scene.
  if(kind==='orange'&&(state.platform===fridgeTop||state.fridgeRescue||state.silentOrangeAfterRescue)){
    state.silentOrangeAfterRescue=false;updateAlbumCount();return;
  }
  showSecretReward(kind);
}
function closeSecretCup(){
  state.secretOpen=false;
  ui['secret-reward'].hidden=true;
  ui.world.focus({preventScroll:true});
}
function setLevel(index){
  state.level=index;
  try{if(!showcase)localStorage.setItem(saveKey,String(index));}catch{}
}
const hopOrigin=new T.Vector3();
const hopDestination=new T.Vector3();
const meowScreen=new T.Vector3();
const catMeowAudio={soft:ui['meow-soft-audio'],loud:ui['meow-loud-audio']};
catMeowAudio.soft.volume=.72;
catMeowAudio.loud.volume=.85;
const backgroundMusic=ui['background-music'];
backgroundMusic.volume=.14;
const keys=new Set();
let playerRoute=[];
const clickRay=new T.Raycaster();
const floor=new T.Plane(new T.Vector3(0,1,0),0);
const surfacePlane=new T.Plane(new T.Vector3(0,1,0),0);
const landing=new T.Vector3();
const closeFocus=new T.Vector3();
const pointer=new T.Vector2();
const activeCamera=()=>focusMix>.002?detailCamera:closeView?closeCamera:overhead;
const moveKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']);
const toSofa=[[-3.46,-2.68],spots.door,[-3.45,.76],spots.hostSofa];
const toBowl=[...toSofa.slice(0,3),[2.9,.88],spots.hostBowl];
const toHall=[...toSofa.slice(0,3),[.60,.65]];
const bathRoute=[...toSofa.slice(0,3),[.78,.63],[.77,-.36],[.78,-1.17],[.52,-2.77]];
const ownerRoutines=[
  {id:'stretch',route:[[-3.68,-2.63]],wait:3.8},
  {id:'sofa',route:toSofa,wait:5.4},
  {id:'kitchen',route:toBowl,wait:4.5},
  {id:'bath',route:bathRoute,wait:5.8}
];
const mochiStops=[
  {id:'sit',spot:[-.95,2.57]},
  {id:'bed',spot:[1.22,3.76]},
  {id:'box',spot:[3.86,2.65]},
  {id:'water',spot:[5.85,.83]},
  {id:'litter',spot:[1.27,-1.30]},
  {id:'window',spot:[6.64,2.44]},
  {id:'study',spot:[-3.37,-1.65]},
  {id:'owner',spot:[-5.70,-1.85]}
];
function interval(min,max){return min+Math.random()*(max-min);}
function differentChoice(items,previous){
  const pool=showcase&&items===ownerRoutines?items.filter(item=>item.id==='stretch'):
    showcase&&items===mochiStops?[{id:'study',spot:[-5.9,-1.8]},{id:'sit',spot:[-3.8,-1.65]},{id:'window',spot:[-6.3,-2.7]}]:items;
  const choices=pool.filter(item=>item.id!==previous);
  const available=choices.length?choices:pool;
  return available[Math.floor(Math.random()*available.length)];
}
const directions = new T.Vector3();
const right = new T.Vector3(cameraOffset.z,0,-cameraOffset.x).normalize();
const up = new T.Vector3(-cameraOffset.x,0,-cameraOffset.z).normalize();
let soundOn=true;
let audio;
let aspect=1;

function place(actor,[x,z],y=0){
  actor.root.position.set(x,y,z);
}
function distance(actor,point){
  return Math.hypot(actor.root.position.x-point[0],actor.root.position.z-point[1]);
}
function rotateToward(root,yaw,dt){
  const turn=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));
  root.rotation.y+=turn*Math.min(1,dt*12);
}
function tone(sequence,type='sine'){
  if(!soundOn||!audio||audio.state!=='running')return;
  let start=audio.currentTime;
  for(const [from,to,duration,volume] of sequence){
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type=type;osc.frequency.setValueAtTime(from,start);
    osc.frequency.exponentialRampToValueAtTime(to,start+duration);
    gain.gain.setValueAtTime(.001,start);
    gain.gain.exponentialRampToValueAtTime(volume,start+.025);
    gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);osc.stop(start+duration);
    start+=duration+.028;
  }
}
function unlockAudio(){
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!audio&&Audio)audio=new Audio();
    audio?.resume().catch(()=>{});
  }catch{}
}
function syncBackgroundMusic(){
  if(!soundOn||state.phase==='intro'||state.paused||document.hidden){
    backgroundMusic.pause();
    return;
  }
  if(backgroundMusic.paused)backgroundMusic.play().catch(()=>{});
}
function playCatMeow(loud){
  if(!soundOn)return;
  for(const clip of Object.values(catMeowAudio))clip.pause?.();
  const clip=catMeowAudio[loud?'loud':'soft'];
  if(typeof clip.play!=='function')return;
  clip.currentTime=0;
  clip.play().catch(()=>{});
}
function say(line,speaker='阿澄',duration=2.8){
  ui.speaker.textContent=speaker;
  ui.line.textContent=line;
  ui.speech.hidden=false;
  state.speechUntil=state.now+duration;
}
function toast(line,duration=2.4){
  ui.toast.textContent=line;ui.toast.hidden=false;state.toastUntil=state.now+duration;
}
function setMobileNotebook(open=false){
  if(!ui['mobile-notebook']||!ui['mobile-task-toggle'])return;
  const expanded=Boolean(open)&&state.phase!=='intro';
  document.body.classList.toggle('mobile-notebook-open',expanded);
  ui['mobile-notebook'].classList.toggle('mobile-open',expanded);
  ui['mobile-task-toggle'].setAttribute('aria-expanded',String(expanded));
  if(expanded)ui['mobile-notebook-close']?.focus({preventScroll:true});
}
function syncMobileTask(){
  if(!ui['mobile-task-toggle'])return;
  ui['mobile-task-number'].textContent=ui['task-id'].textContent;
  ui['mobile-task-title'].textContent=ui['task-title'].textContent;
  ui['mobile-task-toggle'].hidden=state.phase==='intro'||showcase;
  ui['mobile-guide'].hidden=state.phase!=='play'||showcase||state.level!==0||state.cleared;
}
function updateTask(){
  // The approved artwork carries the main game's label; keep other modes' live labels visible.
  const resetLabel=label=>{ui.reset.textContent=label;if(label==='重玩本關')ui.reset.dataset.art='reset';else delete ui.reset.dataset.art;};
  if(blameEpisode){
    ui.count.textContent=blameChapter.state.won?'達成':'單一任務';ui['task-id'].textContent=blameChapter.state.won?'✓':'03';
    ui['task-title'].textContent='唔係我，係麻糬';ui['task-goal'].textContent='弄歪掛畫，令阿澄誤會係麻糬做嘅。';resetLabel('重試嫁禍');syncMobileTask();return;
  }
  if(cupEpisode){
    ui.count.textContent=cupChapter.state.won?'達成':'單一任務';ui['task-id'].textContent=cupChapter.state.won?'✓':'02';
    ui['task-title'].textContent='你的水，特別好喝';ui['task-goal'].textContent='趁阿澄見唔到，偷飲一口杯水。';resetLabel('重試偷飲');syncMobileTask();return;
  }
  if(chairEpisode){
    ui.count.textContent=chairChapter.state.stage==='won'?'達成':'單一任務';
    ui['task-id'].textContent=chairChapter.state.stage==='won'?'✓':'01';
    ui['task-title'].textContent='這張暖凳，現在是我的';ui['task-goal'].textContent='讓阿澄離座，再跳上轉椅坐穩。方法由你決定。';
    resetLabel('重新試一次');syncMobileTask();return;
  }
  if(showcase){
    ui.count.textContent='自由試玩';ui['task-id'].textContent='01';
    ui['task-title'].textContent='在書房搗蛋';ui['task-goal'].textContent='跳上書桌，踩踩鍵盤，或者向阿澄喵一聲。';
    resetLabel('回到書房起點');syncMobileTask();return;
  }
  const level=levels[state.level];
  ui.count.textContent=level?'第 '+(state.level+1)+' 關 / '+levels.length:'自由搗蛋';
  ui['task-id'].textContent=state.cleared?'✓':level?String(state.level+1).padStart(2,'0'):'🐾';
  ui['task-title'].textContent=level?.title??'想做甚麼就做甚麼';
  ui['task-goal'].textContent=level?.goal??'屋裏的東西都可以再玩。';
  ui.task.classList.toggle('done',state.cleared);
  ui.task.setAttribute('data-aside',caseAsides[state.level]??'我冇做過');
  setCaseArt(ui['task-art'],state.level);
  resetLabel(level?'重玩本關':'由第一關重玩');
  renderCampaignMenu();
  syncMobileTask();
}
function complete(event){
  if(showcase)return;
  if(state.cleared||levels[state.level]?.event!==event)return;
  state.cleared=true;
  if(event==='feed'){foodCompleted=true;try{localStorage.setItem('cat-house-food-complete','1');}catch{}}
  const next=Math.min(levels.length,state.level+1);
  if(next>unlockedLevel){unlockedLevel=next;try{localStorage.setItem('cat-house-unlocked-level',String(next));}catch{}}
  updateAlbumCount();
  state.finishAt=state.now+(event==='feed'?2.4:1.05);
  updateTask();
  tone([[523,587,.11,.05],[659,784,.12,.055],[880,1047,.28,.055]]);
}
function restoreCup(){
  state.cupMotion=null;
  if(state.worldHistory)forgetWorld('cup');
  state.refillAt=Infinity;
  state.cupNeedsCare=false;
  state.cupFull=true;
  mug.position.set(cupSpot[0],.58,cupSpot[1]);
  mug.rotation.set(0,0,0);
  water.visible=true;water.scale.x=water.scale.z=.102;
  puddle.visible=false;
}
function reset(showIntro=false){
  keys.clear();
  playerRoute=[];
  Object.assign(state,{
    mission:{keys:0,tap:null,sandAt:null,mirror:false,hideAt:null,ballTouched:false,seatAt:null,drunkAt:null,frameAt:null,inspectAt:null,mochiUntil:0,note:''},
    phase:showIntro?'intro':'play',cleared:false,finishAt:Infinity,paused:false,pickerOpen:false,
    platform:null,hop:null,velocityY:0,walkAfterHop:null,targetId:null,motion:new T.Vector3(),landedAt:-Infinity,seatBlend:0,
    focusCandidate:null,focusCandidateAt:0,chapterCameraAt:0,cupMochiPending:false,cupWobbleAt:-Infinity,cupSipSoundAt:0,cupLastStage:'idle',
    blameHidden:false,hideRequested:false,hideRoutePhase:null,hideStartedAt:0,hideAfterSwat:false,hideBlend:0,blameMochiPending:false,blameMochiOnDesk:false,blameMochiHop:null,blameToyUntil:0,
    nextMessLook:0,actionBeat:null,lastFailure:null,ownerCueUntil:0,ownerCuePoint:null,cleanupQueue:[],cleanupJob:null,cupNeedsCare:false,secretPending:false,secretOpen:false,secretType:null,orangesNoticed:false,orangeNoiseAt:Infinity,silentOrangeAfterRescue:false,fridgeRescue:null,worldHistory:[],mochiAnswerAt:0,mochiMood:'curious',mochiAsideAt:0,blameTidied:false,
    cupGuard:null,guardReturn:null,watchfulUntil:0,watchfulKind:null,
    chain:null,chainCooldown:0,chainBeats:[],chainGlyph:null,successUntil:0,
    restSpot:null,mochiInBed:false,gesture:null,mochiPlayUntil:0,mochiHopUntil:0,greetUntil:0,
    hideSeek:null,mochiAffectionUntil:0,mochiAffectionCooldown:0,
    ownerRoutine:null,lastRoutine:null,ownerNext:state.now+interval(13,19),petReturn:'desk',
    mochiStop:null,lastMochiStop:null,mochiRestUntil:0,
    typed:'',typedUntil:0,onKeys:false,monitorSince:null,monitorReacted:false,
    mischief:null,ownerReactUntil:0,ownerSighUntil:0,ownerNextReaction:0,reactionCount:0,
    focusId:null,focusHoldUntil:0,focusPaused:false,
    scratchUntil:0,scratchPoint:spots.sofa,plantIndex:-1,plantAt:0,plantCooldown:0,
    bowlUntil:0,turnUntil:0,petUntil:0,raceStart:0,raceEnd:0,raceLost:false,
    feedRequested:false,feedingUntil:Infinity,bathSecretPending:false,
    attention:0,meowUntil:0,meowReady:0,nextMeowReply:0,meowReplyCount:0,softMeowReplyCount:0,ownerMode:'desk',ownerRoute:[],distraction:[],
    mochiRoute:[],mochiMode:'idle',speechUntil:0,toastUntil:0,nextIdle:state.now+interval(3,6)
  });
  ui['chain-note'].hidden=true;ui['mochi-thought'].hidden=true;ui['success-flash'].hidden=true;
  ui['retry-attempt'].hidden=true;ui['world-history'].textContent='';
  ui['secret-reward'].hidden=true;
  ui['help-details'].open=false;
  for(const target of [ui.world,ui.controls,ui.touch])target.inert=false;
  ui['pause-overlay'].hidden=true;ui.pause.textContent='暫停';ui.pause.dataset.art='pause';ui.pause.setAttribute('aria-pressed','false');ui.pause.disabled=showIntro;
  pickerSignature='';ui['nearby-choices'].hidden=true;
  chairChapter.reset(state.now);cupChapter.reset(state.now);blameChapter.reset(state.now);ui['chapter-result'].hidden=true;ui['cup-stop'].hidden=true;
  restoreCup();
  kibble.visible=false;
  writeScreen('今日待辦：\n完成工作，再陪貓玩。');
  for(const actor of [player,mochi]){actor.travel=0;actor.lastStepPosition=actor.root.position.clone();}
  for(const prop of props)resetProp(prop);
  for(const plant of plants)plant.rotation.set(0,0,0);
  for(const leaf of looseLeaves)leaf.visible=false;
  place(player,cupEpisode?[-4.05,4.44]:chairEpisode?[-3.85,-2.35]:showcase?[-3.85,-2.95]:[-3.47,.58]);player.root.rotation.y=showcase?.68:.55;player.head.position.y=player.headHeight;
  place(mochi,cupEpisode?[-3.45,3.25]:showcase?[-5.9,-1.8]:spots.mochiStart);mochi.root.rotation.y=showcase?.65:.3;
  place(owner,cupEpisode?[-5.85,2.65]:spots.desk,cupEpisode?.23:0);owner.root.rotation.y=cupEpisode?.42:Math.PI;
  if(cupEpisode){state.ownerMode='cup-sit';state.nextIdle=Infinity;}
  if(blameEpisode){place(mochi,[-3.45,-1.5]);state.ownerMode='blame-desk';state.nextIdle=Infinity;}
  ui.intro.hidden=!showIntro;ui.finish.hidden=true;
  ui.touch.hidden=ui.controls.hidden=showIntro;
  document.body.classList.toggle('game-active',!showIntro);
  setMobileNotebook(false);
  ui.speech.hidden=ui.toast.hidden=ui.action.hidden=ui['alt-action'].hidden=ui['target-switch'].hidden=ui['meow-bubble'].hidden=true;
  focusMix=0;
  ui['computer-feed'].hidden=ui['focus-badge'].hidden=true;
  if(chairEpisode||cupEpisode||blameEpisode)state.ownerNext=Infinity;
  for(const actor of [player,mochi]){actor.setResting(0);actor.setSitting(0);actor.body.scale.set(1,1,1);actor.gaitBlend=0;actor.lastStepPosition.copy(actor.root.position);}
  updateTask();
  syncBackgroundMusic();
}
function fits(x,z){
  if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return false;
  const collides=([cx,cz,w,d])=>Math.abs(x-cx)<w/2+.175&&Math.abs(z-cz)<d/2+.175;
  return !colliders.some(collides)&&!roomDoors.some(door=>doorBlocks(door,x,z,.20));
}
// The click-to-walk route uses the same collision bounds as the keyboard.
const spacing=.27;
const across=58;
const rows=35;
const neighbours=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function pointAt(id){return [bounds.minX+(id%across)*spacing,bounds.minZ+Math.floor(id/across)*spacing];}
function gridPoint(x,z,connected=false){
  let closest=-1, range=Infinity;
  for(let i=0;i<across*rows;i++){
    const [gx,gz]=pointAt(i);
    const d=(gx-x)**2+(gz-z)**2;
    if(d<range&&fits(gx,gz)){
      if(connected&&fits(x,z)){
        const steps=Math.max(1,Math.ceil(Math.sqrt(d)/.045));let clear=true;
        for(let j=1;j<steps;j++){if(!fits(T.MathUtils.lerp(x,gx,j/steps),T.MathUtils.lerp(z,gz,j/steps))){clear=false;break;}}
        if(!clear)continue;
      }
      range=d;closest=i;
    }
  }
  return closest;
}
function floorRoute(fromX,fromZ,x,z){
  const start=gridPoint(fromX,fromZ,true);
  const end=gridPoint(x,z);
  if(start<0||end<0)return [];
  if(start===end)return [pointAt(start)];
  const cameFrom=new Int32Array(across*rows).fill(-1);
  const queue=[start];
  cameFrom[start]=start;
  for(let head=0;head<queue.length&&cameFrom[end]===-1;head++){
    const id=queue[head];
    const col=id%across,row=Math.floor(id/across);
    for(const [dx,dz] of neighbours){
      const nx=col+dx,nz=row+dz;
      if(nx<0||nx>=across||nz<0||nz>=rows)continue;
      const next=nz*across+nx;
      if(cameFrom[next]!==-1||!fits(...pointAt(next)))continue;
      if(dx&&dz&&(!fits(...pointAt(row*across+nx))||!fits(...pointAt(nz*across+col))))continue;
      cameFrom[next]=id;queue.push(next);
    }
  }
  if(cameFrom[end]===-1)return [];
  const path=[];
  for(let id=end;id!==start;id=cameFrom[id])path.push(pointAt(id));
  return [pointAt(start),...path.reverse()];
}
function walkTo(x,z,feedback=false){
  const {x:fromX,z:fromZ}=player.root.position;
  playerRoute=floorRoute(fromX,fromZ,x,z);
  if(feedback&&!playerRoute.length)toast('呢邊有家具擋住。試吓點近少少嘅空位。');
  return playerRoute.length>0;
}
function chairIsFree(){
  if(chairEpisode)return ['leaving','waiting'].includes(chairChapter.state.stage)&&distance(owner,spots.seat)>1.12;
  const vacant=state.ownerMode==='fetch'||state.ownerMode==='routine';
  return vacant&&!state.raceLost&&distance(owner,spots.seat)>1.12;
}
function nearestOn(platform,x,z){
  const [cx,cz,w,d]=platform.surface;
  return [T.MathUtils.clamp(x,cx-w/2,cx+w/2),T.MathUtils.clamp(z,cz-d/2,cz+d/2)];
}
function inputDirection(){
  const x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
  const y=Number(keys.has('ArrowUp')||keys.has('KeyW'))-Number(keys.has('ArrowDown')||keys.has('KeyS'));
  const view=activeCamera().matrixWorld.elements;
  right.set(view[0],0,view[2]).normalize();up.set(-view[8],0,-view[10]).normalize();
  return directions.copy(right).multiplyScalar(x).addScaledVector(up,y).normalize();
}
function clearHop(x,z){
  const from=player.root.position;
  const intersects=([cx,cz,w,d])=>{
    for(let i=1;i<=8;i++){
      const fraction=i/8;
      if(Math.abs(T.MathUtils.lerp(from.x,x,fraction)-cx)<w/2+.12&&
        Math.abs(T.MathUtils.lerp(from.z,z,fraction)-cz)<d/2+.12)return true;
    }
    return false;
  };
  return !partitions.some(wall=>intersects([wall.x,wall.z,wall.w,wall.d]))&&
    !roomDoors.some(door=>{
      for(let i=1;i<=8;i++){
        if(doorBlocks(door,T.MathUtils.lerp(from.x,x,i/8),T.MathUtils.lerp(from.z,z,i/8),.16))return true;
      }
      return false;
    });
}
function jumpTarget(preferred){
  if(state.platform===fridgeTop)return null;
  const root=player.root;
  const input=inputDirection();
  const directed=input.lengthSq()>0;
  let target=null,best=Infinity;
  for(const platform of platforms){
    if(platform===state.platform||(platform===chair&&!chairIsFree()))continue;
    if(platform===fridgeStep&&state.platform!==kitchenCounter||platform===fridgeTop&&state.platform!==fridgeStep||state.platform===fridgeStep&&platform!==fridgeTop)continue;
    const [x,z]=nearestOn(platform,root.position.x,root.position.z);
    const dx=x-root.position.x,dz=z-root.position.z;
    const length=Math.hypot(dx,dz);
    if(length>1.44||!clearHop(x,z))continue;
    const alignment=length>.01?(dx*input.x+dz*input.z)/length:1;
    if(!preferred&&directed&&alignment<.37)continue;
    if(preferred&&platform!==preferred)continue;
    const score=length-(directed?alignment*.3:0);
    if(score<best){best=score;target={platform,x,z};}
  }
  if(chairEpisode&&!preferred&&chairIsFree()){
    const [x,z]=nearestOn(chair,root.position.x,root.position.z);
    if(Math.hypot(x-root.position.x,z-root.position.z)<1.44&&clearHop(x,z))return {platform:chair,x,z};
  }
  return target;
}
function floorTarget(destination){
  const {x,z}=player.root.position;
  const facing=player.root.rotation.y;
  const direction=inputDirection();
  const angle=destination?Math.atan2(destination[0]-x,destination[1]-z):
    direction.lengthSq()>0?Math.atan2(direction.x,direction.z):facing;
  for(const offset of [0,.48,-.48,.96,-.96,1.57,-1.57,2.2,-2.2,Math.PI]){
    for(const radius of [.75,1.05,1.36,1.68,2]){
      const nx=x+Math.sin(angle+offset)*radius,nz=z+Math.cos(angle+offset)*radius;
      if(fits(nx,nz)&&clearHop(nx,nz))return {platform:null,x:nx,z:nz};
    }
  }
  return null;
}
function jump(preferred=null,destination=null){
  if(state.paused)return false;
  if(state.platform===fridgeTop){toast('雪櫃太高，栗子落唔到去。');return false;}
  leaveRest();
  if(state.actionBeat&&!state.actionBeat.applied)state.actionBeat=null;
  if(state.phase!=='play'||state.hop||state.cupMotion?.kind==='drink'||(!state.platform&&(state.velocityY||player.root.position.y>.015)))return false;
  const target=destination?floorTarget(destination):jumpTarget(preferred)||(state.platform&&floorTarget());
  if(preferred&&!target)return false;
  if(cupEpisode)cupChapter.cancel();
  playerRoute=[];
  if(target){
    const root=player.root;
    hopOrigin.copy(root.position);
    hopDestination.set(target.x,target.platform?.height??0,target.z);
    state.motion.set(0,0,0);
    state.hop={platform:target.platform,start:state.now,duration:.84};
    state.walkAfterHop=destination;
    const dx=target.x-root.position.x,dz=target.z-root.position.z;
    if(Math.hypot(dx,dz)>.04)root.rotation.y=Math.atan2(dx,dz);
  }else{
    if(state.platform)return false;
    state.velocityY=4.9;
  }
  tone([[360,465,.11,.045]]);
  return true;
}
function beginPet(){
  if(blameEpisode){say('摸摸可以，今日唔好搞亂啲嘢呀。');return;}
  if(cupEpisode){say('摸摸可以，隻杯就唔好掂喇。');return;}
  if(chairEpisode){episodeOffer('soft');return;}
  state.petReturn=state.ownerMode;
  state.ownerMode='pet';
  state.petUntil=state.now+3;
  if(!state.platform){
    const dx=player.root.position.x-owner.root.position.x,dz=player.root.position.z-owner.root.position.z,range=Math.hypot(dx,dz)||1;
    const point=[owner.root.position.x+dx/range*.70,owner.root.position.z+dz/range*.70];
    if(fits(...point))walkTo(...point);
  }
  say('好啦，過嚟，摸吓你個頭。');
}
function distract(route){
  if(state.ownerMode!=='desk')return;
  state.ownerMode='fetch';
  state.distraction=route;
  state.ownerRoute=route.slice();
  state.raceStart=state.now;
  state.raceEnd=state.now+Math.max(12.5,route.length*2.65);
  state.raceLost=false;
  state.mochiRoute=[];
  state.mochiMode='alert';
  state.mochiStop=null;
}
function hiddenAtSofa(){
  const {x,z,y}=player.root.position;
  return !state.platform&&!state.hop&&!state.restSpot&&y<.28&&
    x>=-7.79&&x<=-7.34&&z>=1.42&&z<=2.78;
}
function beginHideSeek(){
  if(showcase||secretHideUnlocked||state.ownerMode!=='desk'||!hiddenAtSofa()||ownerSeesPlayer())return false;
  state.ownerMode='seek';state.ownerNext=Infinity;
  state.hideSeek={started:state.now};
  state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,-7.10,.90);
  say('咦？栗子，聲音喺邊度？','阿澄',3.1);
  return true;
}
function updateHideSeek(dt){
  if(state.ownerMode!=='seek'||!state.hideSeek)return;
  const abandon=()=>{
    state.hideSeek=null;state.ownerMode='return';
    state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,...spots.desk);
  };
  if(!hiddenAtSofa()||state.now-state.hideSeek.started>22){abandon();return;}
  if(state.ownerRoute.length)return;
  rotateToward(owner.root,Math.atan2(player.root.position.x-owner.root.position.x,player.root.position.z-owner.root.position.z),dt);
  if(!ownerSeesPlayer())return;
  state.hideSeek=null;state.ownerMode='return';
  state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,...spots.desk);
  state.ownerReactUntil=state.now+2.3;
  say('搵到你喇！原來你係想同我玩捉迷藏呀？','阿澄',4.8);
  collectSecret('hide');
}
const softMeowReplies=[
  '嗯？栗子，叫我呀？',
  '咁細聲，係咪想我摸摸你呀？',
  '行過嚟同我打招呼？我聽到喇。'
];
const loudMeowReplies=[
  '栗子又講粗口呀？我喺書房都聽到喇。',
  '如果栗子可以好似麻糬咁乖就好喇……',
  '栗子，唔使嗌咁大聲，我聽到㗎。'
];
function replyToMeow(loud){
  if(state.now<state.nextMeowReply||state.now<state.speechUntil)return false;
  const replies=loud?loudMeowReplies:softMeowReplies;
  const key=loud?'meowReplyCount':'softMeowReplyCount';
  say(replies[state[key]++%replies.length],'阿澄',3);
  state.nextMeowReply=state.now+3.5;
  state.ownerReactUntil=state.now+1.2;
  return true;
}
function meow(loud){
  if(state.paused)return;
  if(state.phase!=='play'||state.now<state.meowReady)return;
  unlockAudio();
  state.meowReady=state.now+.48;
  state.meowUntil=state.now+(loud?1.55:1.2);
  ui['meow-bubble'].textContent=loud?'喵嗚！':'喵～';
  ui['meow-bubble'].classList.toggle('loud',loud);
  ui['meow-bubble'].hidden=false;
  playCatMeow(loud);

  if(state.platform===fridgeTop){
    if(!loud){toast('阿澄似乎聽唔到呢聲喵。');return;}
    if(state.fridgeRescue?.stage==='stranded'){
      if(oranges.every(orange=>Number.isFinite(orange.started)))state.silentOrangeAfterRescue=true;
      if(state.cleanupJob){
        const key=state.cleanupJob.key;
        if(!state.cleanupQueue.includes(key))state.cleanupQueue.unshift(key);
        state.cleanupJob=null;
      }
      state.fridgeRescue.stage='coming';state.ownerMode='rescue';state.ownerRoutine=null;
      state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,6.42,-2.55);
      say('栗子？你點樣上咗雪櫃頂？企定，我嚟接你！','阿澄',4);
      toast('阿澄聽到栗子求救，正趕過嚟。',3);
    }
    return;
  }

  const bath=state.ownerRoutine;
  const bathX=player.root.position.x,bathZ=player.root.position.z;
  if(loud&&state.ownerMode==='routine'&&bath?.id==='bath'&&bath.step==='pause'&&bathDoor.latched&&
    bathX>-.9&&bathX<1.8&&bathZ>-.66&&bathZ<1.45&&player.root.position.y<.5){
    if(!state.bathSecretPending){
      state.bathSecretPending=true;
      bath.leaveAt=Math.min(bath.leaveAt,state.now+1.4);
      say('栗子，我入廁所都要跟？……唉，好啦，我開門俾你。','阿澄',3.8);
      sigh();
    }
    return;
  }
  if(!loud&&beginHideSeek())return;

  if(!showcase&&state.cupGuard&&distance(player,cupSpot)>1.8&&state.now>=state.cupGuard.minimum){
    releaseCupGuard();state.ownerCuePoint=[player.root.position.x,player.root.position.z];state.ownerCueUntil=state.now+4;
    say('嗯？栗子喺嗰邊叫我？');return;
  }
  if(blameEpisode){
    if(distance(player,spots.desk)<3.2&&blameChapter.distract(state.now,[player.root.position.x,player.root.position.z]))say(loud?'喵咁大聲？我望吓先。':'嗯？栗子，叫我呀？');
    return;
  }
  if(cupEpisode){
    const far=distance(player,cupSpot)>1.8&&!state.platform;
    if(far&&cupChapter.lookAway(state.now,'noise',7.5)){state.cupNoise=[player.root.position.x,player.root.position.z];say(loud?'咩事喵得咁大聲？我望吓先。':'嗯？栗子喺嗰邊叫我？');}
    else say(loud?'喵得咁大聲？你個水碗喺廚房呀。':'嗯？想飲水呀？');return;
  }
  if(chairEpisode){
    if(distance(player,spots.desk)<3.1)episodeOffer(loud?'loud':'soft');
    return;
  }
  const nearOwner=distance(player,[owner.root.position.x,owner.root.position.z])<2.85;
  if(state.ownerMode!=='desk'){
    if((!loud&&nearOwner||loud)&&!['rescue','seek','feed','tidy'].includes(state.ownerMode))replyToMeow(loud);
    return;
  }
  const range=distance(player,spots.desk);
  const {x,z}=player.root.position;
  const inStudy=x<-2.2&&z<-.7;
  if(loud&&range<5.5&&!inStudy){
    distract(x>2.4?toBowl:x<-2.2?toSofa:toHall);
    replyToMeow(true);
  }else if(loud&&range<3.1&&inStudy){
    state.turnUntil=state.now+2;
    state.attention=0;
    if(ownerSeesPlayer())say('嘩，嚇我一跳！你想點呀？');
    else replyToMeow(true);
  }else if(!loud&&inStudy&&range<2.85){
    state.turnUntil=state.now+2.1;
    state.attention++;
    if(range<1.47&&(state.attention>=2||state.platform?.id==='desk'))beginPet();
    else replyToMeow(false);
  }else if(!loud&&nearOwner){
    state.turnUntil=state.now+1.6;
    replyToMeow(false);
  }else if(loud)replyToMeow(true);
}
function interactionTargets(){
  if(blameEpisode&&state.blameHidden)return [{id:'hide-box',name:'紙箱',primary:{kind:'blame-hide',label:'探頭出嚟'}}];
  if(cupEpisode&&cupChapter.state.stage==='drinking')return [{id:'cup',name:'主人水杯',primary:{kind:'drink',label:'收口，扮乖'}}];
  if(state.phase!=='play'||state.hop||state.cupMotion?.kind==='drink')return [];
  if(state.restSpot?.settled)return [{id:state.restSpot.prop.id,name:state.restSpot.prop.name,primary:{kind:'leave-rest',label:'起身離開'}}];
  if(state.actionBeat)return state.actionBeat.applied?[]:[{id:'action-beat',name:'準備伸爪',primary:{kind:'cancel-beat',label:'取消動作'}}];
  const targets=[];
  const add=(id,name,primary,secondary=null)=>targets.push({id,name,primary,secondary});
  const root=player.root.position;
  if(blameEpisode&&!state.platform&&Math.hypot(root.x-hideBox.x,root.z-hideBox.z)<1.2)add('hide-box','紙箱',{kind:'blame-hide',label:'躲入紙箱'});
  const atCup=state.platform?.id==='table'&&distance(player,cupSpot)<1.08&&!state.cupMotion&&mug.position.y>.55;
  if(atCup){
    const drop={kind:'drop',label:cupEpisode?(state.now-cupChapter.state.bumpedAt<3?'再撥一下':'撥一撥水杯'):'推跌水杯'};
    if(state.cupFull)add('cup','水杯',{kind:'drink',label:cupEpisode&&cupChapter.state.stage==='approaching'?'停低，扮乖':'偷飲杯水'},drop);
    else add('cup','水杯',drop);
  }
  if(chairIsFree()&&jumpTarget(chair))add('chair','空轉椅',{kind:'chair',label:'跳上書房轉椅'});
  if(state.ownerMode==='desk'&&root.x<-2.2&&root.z<-.7&&distance(player,spots.desk)<1.47){
    add('owner','阿澄',{kind:'rub',label:state.platform?.id==='desk'?'用頭頂頂阿澄':'蹭蹭主人的腳'});
  }else if(state.ownerMode==='routine'&&!state.ownerRoute.length&&distance(player,[owner.root.position.x,owner.root.position.z])<.95&&root.y<.50){
    add('owner','阿澄',{kind:'rub',label:'貼近阿澄討摸摸'});
  }else if(distance(player,[owner.root.position.x,owner.root.position.z])<.89&&Math.abs(root.y-owner.root.position.y)<1.0){
    add('owner','阿澄',{kind:'greet',label:'蹭蹭阿澄'});
  }
  if(distance(player,[mochi.root.position.x,mochi.root.position.z])<1.25&&Math.abs(root.y-mochi.root.position.y)<.73){
    add('mochi','麻糬',{kind:'sniff',label:'同麻糬碰鼻'},{kind:'play',label:'邀麻糬玩追逐'});
  }
  for(const [plantIndex,point] of plantSpots.entries()){
    if(distance(player,point)<.96&&Math.abs(root.y-plants[plantIndex].position.y)<.48&&state.now>=state.plantCooldown){
      add('plant-'+plantIndex,'盆栽',{kind:'plant',label:'抓抓盆栽',plantIndex});
    }
  }
  if((state.platform?.id==='sofa'||distance(player,spots.sofa)<2.03&&root.y<.23)&&state.now>=state.scratchUntil)add('sofa','梳化',{kind:'scratch',label:'抓抓梳化'});
  if(root.y<.23&&distance(player,spots.bowl)<.82&&state.now>=state.bowlUntil)add('food','食碗',{kind:'bowl',label:'撥響空食碗'});
  for(const prop of [...roomDoors,...roomObjects]){
    if(!canReach(prop))continue;
    const label=prop.kind==='door'?prop.latched?'扒門等人開':prop.ajar?'用頭頂開門':'蹭蹭門邊':
      prop.kind==='water'&&prop.on?'關上水龍頭':prop.kind==='hinge'&&prop.on?'推返埋廚櫃':prop.verb;
    if(prop.kind==='curtain'){
      add(prop.id,prop.name,{kind:'scratch-curtain',label:'抓抓窗簾',prop},{kind:'prop',label,prop});
    }else if(prop.kind==='mirror'){
      targets.unshift({id:prop.id,name:prop.name,primary:{kind:'prop',label:'照鏡兼印個爪印',prop},secondary:{kind:'mirror-look',label:'淨係照照鏡',prop}});
    }else if(prop.kind==='water'&&(prop.id!=='bath-tap'||state.platform?.id!=='bath-sink')){
      targets.unshift({id:prop.id,name:prop.name,primary:{kind:'prop',label,prop}});
    }else{
      add(prop.id,prop.name,{kind:'prop',label,prop});
    }
  }
  return orderTargets(targets,{episode:preview||'main',stage:blameChapter.state.stage,friendReady:state.blameMochiOnDesk,friendComing:state.blameMochiPending||!!state.blameMochiHop,mainLevel:state.level});
}
function activeTarget(targets){
  return targets.find(target=>target.id===state.targetId)??targets[0];
}
function cycleTarget(){
  state.pickerOpen=false;ui['nearby-choices'].hidden=true;ui['target-switch'].setAttribute('aria-expanded','false');
  const targets=interactionTargets();
  if(targets.length<2)return;
  const index=targets.indexOf(activeTarget(targets));
  state.targetId=targets[(index+1)%targets.length].id;
}
function nearby(alternate=false,targets=interactionTargets()){
  const target=activeTarget(targets);
  return alternate?target?.secondary:target?.primary;
}
function doorBlocks(door,x,z,radius){
  const [cx,cz,width]=door.wall;
  const hinge=cx-width/2;
  const angle=1.38*door.amount;
  const dx=Math.cos(angle),dz=-Math.sin(angle);
  const length=T.MathUtils.clamp((x-hinge)*dx+(z-cz)*dz,0,width-.05);
  return Math.hypot(x-hinge-dx*length,z-cz-dz*length)<radius;
}
function canReach(prop){
  const feet=player.root.position;
  if(prop.orange&&Number.isFinite(prop.started))return false;
  if(prop.support&&state.platform?.id!==prop.support)return false;
  const vertical=prop.contactY-feet.y;
  if(vertical<-.27||vertical>.81)return false;
  if(prop.kind==='door')return feet.y<.23&&doorBlocks(prop,feet.x,feet.z,prop.ajar?.72:.66);
  const x=prop.kind==='ball'?prop.node.position.x:prop.x,z=prop.kind==='ball'?prop.node.position.z:prop.z;
  return Math.hypot(feet.x-x,feet.z-z)<=prop.reach;
}
function typeOnComputer(tap=false){
  if(!chairEpisode&&!blameEpisode&&state.watchfulKind==='keyboard'&&state.now<state.watchfulUntil&&ownerSeesPlayer())return;
  activateProp(keyboard,state.now);
  const letters=['jjjj','mnn','////','zzzz',' k','kkkk','qq'];
  state.typed=(state.typed+letters[Math.floor(Math.random()*letters.length)]).slice(-54);
  state.typedUntil=state.now+4.5;
  ui['computer-text'].textContent=state.typed;
  writeScreen(state.typed);
  startMischief('keyboard',1.65);
  if(!showcase&&levels[state.level]?.event==='keyboard-secret'&&!ownerSeesPlayer()){state.mission.keys++;state.mission.note='已打字 '+state.mission.keys+' / 3 次';if(state.mission.keys>=3)complete('keyboard-secret');}
  holdFocus('keyboard');
  if(tap)tone([[600,650,.08,.042],[710,440,.13,.049],[550,780,.10,.036]],'triangle');
}
function blockMonitor(){
  startMischief('monitor',1.7);
  holdFocus('monitor');
  state.monitorReacted=true;
}
function updateComputer(){
  if(state.phase!=='play')return;
  const feet=player.root.position;
  const onDesk=state.platform?.id==='desk'&&!state.hop;
  const onKeys=onDesk&&Math.abs(feet.x-keyboard.x)<.43&&Math.abs(feet.z-keyboard.z)<.135;
  if(onKeys&&!state.onKeys)typeOnComputer(true);
  state.onKeys=onKeys;
  const inFront=onDesk&&Math.abs(feet.x-monitor.x)<.43&&feet.z<-3.82;
  if(inFront){
    state.monitorSince??=state.now;
    if(!state.monitorReacted&&state.ownerMode==='desk'&&state.now-state.monitorSince>.65)blockMonitor();
  }else{
    state.monitorSince=null;
    state.monitorReacted=false;
  }
}
function playProp(prop){
  if(['bed','box'].includes(prop.id)){beginRest(prop);return;}
  if(blameEpisode&&prop.id==='print'){beginFramePrank();return;}
  if(blameEpisode&&prop.id==='blame-toy'){inviteBlameMochi();return;}
  if(prop.kind==='door'){
    if(prop.latched){
      if(state.ownerRoutine?.id==='bath'){
        state.ownerRoutine.leaveAt=Math.min(state.ownerRoutine.leaveAt,state.now+1.15);
        say('等一等先。');
      }else toast('門關實咗，栗子只好扒門');
    }else if(prop.ajar){
      prop.ajar=false;
      prop.on=true;
      toast('栗子用個頭頂開咗道門');
    }
  }else{
    if(prop.kind==='ball')aimBall(prop);
    activateProp(prop,state.now);
  }
  if(!showcase&&levels[state.level]?.event==='frame-blame'){
    if(prop.id==='print'){
      state.mission.frameAt=prop.on?state.now:null;
      state.mission.inspectAt=null;
      state.mission.note=prop.on?'掛畫歪咗。試吓引麻糬去書房，自己再伏入紙箱。':'掛畫扶正咗，再試一次。';
    }
    if(prop.id==='pencils'&&state.mission.frameAt!==null)lureMochiForBlame();
  }
  if(['pencils','shelf-book','ball','cup-ball'].includes(prop.id)&&!(prop.id==='pencils'&&levels[state.level]?.event==='frame-blame'))startReactionChain(prop);
  state.gesture={kind:prop.kind,point:[prop.x,prop.z],reachUp:prop.contactY-player.root.position.y>.45,until:state.now+(['cozy','block'].includes(prop.kind)?1.35:.74)};
  recordCampaignProp(prop);
  if(prop.kind==='dig')rememberWorld('litter','貓砂灑咗喺盆外。');
  if(prop.kind==='mirror')rememberWorld('mirror','鏡上留低咗爪印。');
  if(prop.id==='print'){if(prop.on)rememberWorld('picture','掛畫歪咗。');else forgetWorld('picture');}
  if(prop.kind==='water'){if(prop.on)rememberWorld(prop.id,'水龍頭仲開住，水聲沙沙。');else forgetWorld(prop.id);}
  if(prop.orange){
    const fallen=oranges.filter(orange=>Number.isFinite(orange.started)).length;
    forgetWorld('fruit');rememberWorld('fruit','橙跌咗 '+fallen+' / '+oranges.length+' 個，仍然喺地下。');
    if(fallen===oranges.length)state.orangeNoiseAt=state.now+1.2;
  }
  if(prop.line)say(prop.line,'栗子');
  if(prop.kind==='dig')startMischief('litter',1.1);
  if(shots[prop.id])holdFocus(prop.id);
  if(prop.kind==='screen'){
    typeOnComputer(true);
  }else if(prop.kind==='block'){
    blockMonitor();
  }else if(prop.kind==='water'||prop.kind==='sip'){
    if(prop.kind==='water'&&prop.on)startMischief('water',1.9);
    tone([[315,590,.12,.022],[360,610,.17,.034]]);
  }else{
    const reaction=prop.kind==='mirror'?'mirror':prop.id==='print'?'print':
      prop.orange?'fruit':prop.kind==='hinge'&&prop.on?'cabinet':null;
    if(reaction)startMischief(reaction,1.45);
    tone([[420,280,.12,.035],[340,250,.11,.024]],'triangle');
  }
}
function playWithMochi(chase){
  if(blameEpisode&&chase){inviteBlameMochi();return;}
  if(cupEpisode&&chase){inviteCupMochi();return;}
  if(chase&&!showcase&&levels[state.level]?.event==='frame-blame'&&state.mission.frameAt!==null){lureMochiForBlame();return;}
  const spot=[mochi.root.position.x,mochi.root.position.z];
  state.gesture={kind:chase?'wiggle':'sniff',point:spot,until:state.now+.80};
  state.mochiHopUntil=state.now+.85;
  say(chase?'喵嗚！追我吖。':'喵～', '麻糬',2);
  tone([[380,580,.16,.044],[570,310,.18,.047]]);
  if(!chase||state.mochiMode!=='idle')return;
  const angles=[0,1.57,3.14,4.71];
  const choices=angles.map(angle=>[spot[0]+Math.cos(angle)*1.48,spot[1]+Math.sin(angle)*1.48]);
  const target=choices.find(([x,z])=>[.25,.5,.75,1].every(p=>fits(T.MathUtils.lerp(spot[0],x,p),T.MathUtils.lerp(spot[1],z,p))));
  if(target){
    state.mochiMode='play';
    state.mochiRoute=[target,spot];
    state.mochiPlayUntil=state.now+2.3;
  }
}
function lureMochiForBlame(){
  if(state.mochiMode==='alibi'&&state.now<state.mission.mochiUntil)return;
  state.chain=null;state.mochiStop=null;state.mochiInBed=false;mochi.root.position.y=0;mochi.setResting(0);
  state.mochiMode='alibi';state.mochiRoute=floorRoute(mochi.root.position.x,mochi.root.position.z,-4.02,-2.10);
  state.mission.mochiUntil=state.now+24;
  state.mission.note='麻糬聽到聲，正走向書房。栗子快去客廳紙箱！';
  say('喵？邊度有聲？','麻糬',2);
}
function ownerSeesActor(actor){
  const root=owner.root.position,yaw=owner.root.rotation.y;
  const seated=['desk','cup-sit','blame-desk'].includes(state.ownerMode)||state.ownerMode==='pet'&&state.petReturn==='desk';
  sightEye.set(root.x+Math.sin(yaw)*.15,root.y+(seated?1.55:1.68),root.z+Math.cos(yaw)*.15);
  const points=[];
  if(actor.head){actor.head.updateWorldMatrix(true,false);points.push(actor.head.getWorldPosition(new T.Vector3()));}
  const position=actor.root.position;points.push(new T.Vector3(position.x,position.y+(actor.loaf?.visible?.24:.54),position.z));
  return points.some(point=>canWitness(sightEye,yaw,point,partitions,sightFurniture,(x,z)=>roomDoors.some(door=>doorBlocks(door,x,z,.060))));
}
function ownerSeesPlayer(){return ownerSeesActor(player);}

let sighBuffer;
function sigh(){
  if(!soundOn||!audio||audio.state!=='running')return;
  if(!sighBuffer){
    sighBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.55),audio.sampleRate);
    const samples=sighBuffer.getChannelData(0);
    let breath=0;
    for(let i=0;i<samples.length;i++){
      breath=breath*.76+(Math.random()*2-1)*.24;
      const phase=i/samples.length;
      samples[i]=breath*Math.sin(Math.PI*phase)**1.55*(1-phase*.40);
    }
  }
  const source=audio.createBufferSource();
  const filter=audio.createBiquadFilter(),volume=audio.createGain();
  source.buffer=sighBuffer;filter.type='lowpass';filter.frequency.value=520;volume.gain.value=.17;
  source.connect(filter).connect(volume).connect(audio.destination);
  source.start();
}
function reactToMischief(kind){
  if(chairEpisode&&chairMethods[kind]&&episodeOffer(kind))return;
  if(!chairEpisode&&!blameEpisode){state.watchfulKind=kind;state.watchfulUntil=state.now+4;state.scratchUntil=state.now;state.gesture=null;}
  campaignCaught(kind);
  const lines=reactions[kind];
  if(!lines)return;
  state.ownerCuePoint=[player.root.position.x,player.root.position.z];state.ownerCueUntil=state.now+1.8;
  if(kind!=='water')scheduleCleanup(kind);
  const sighing=++state.reactionCount%3!==1;
  state.ownerReactUntil=state.now+1.45;
  state.ownerNextReaction=state.now+2.20;
  if(sighing){
    state.ownerSighUntil=state.now+.95;
    sigh();
  }
  say(lines[Number(sighing)],'阿澄',2.6);
}
function startMischief(kind,duration){
  const {x,z}=player.root.position;
  state.mischief={kind,x,z,until:state.now+duration};
  updateWitness();
}
function updateWitness(){
  const event=state.mischief;
  if(!event)return;
  if(state.now>event.until||distance(player,[event.x,event.z])>1.12){
    state.mischief=null;
    return;
  }
  if(state.now<state.ownerNextReaction||!ownerSeesPlayer())return;
  state.mischief=null;
  reactToMischief(event.kind);
}
function applyInteraction(alternate=false,prepared=null){
  if(state.paused)return;
  const action=prepared??nearby(alternate);
  if(!action)return;
  unlockAudio();
  playerRoute=[];
  if(blockWitnessedAction(action))return;
  if(action.kind==='leave-rest'){leaveRest();return;}
  if(action.kind==='mirror-look'){
    state.gesture={kind:'mirror',point:[action.prop.x,action.prop.z],reachUp:false,until:state.now+1.55};
    holdFocus('mirror');toast('栗子望住鏡入面嘅自己，扮晒無辜。');return;
  }
  if(action.kind==='cancel-beat'){state.actionBeat=null;playerRoute=[];return;}
  if(action.kind==='blame-hide'){hideBlameCat();return;}
  if(action.kind==='scratch-curtain'){
    const prop=action.prop;
    prop.scratchedAt=state.now;rememberWorld('curtain','窗簾俾栗子抓過。');
    state.gesture={kind:'scratch',point:[prop.x,prop.z],reachUp:true,until:state.now+.83};
    tone([[610,360,.10,.043],[536,291,.13,.040]],'triangle');
    startMischief('curtain',1.12);
  }else if(action.kind==='prop'){
    playProp(action.prop);
    if(blameEpisode&&action.prop.id==='pencils'&&blameChapter.state.stage==='planning')inviteBlameMochi('pencils');
  }else if(action.kind==='sniff'||action.kind==='play'){
    playWithMochi(action.kind==='play');
  }else if(action.kind==='greet'){
    state.greetUntil=state.now+1.4;
    say('我見到你啦，栗子。');
  }else if(action.kind==='rub'){
    beginPet();
  }else if(action.kind==='scratch'){
    state.scratchPoint=spots.sofa;
    state.scratchUntil=state.now+.78;
    tone([[480,290,.11,.05],[455,220,.13,.055],[510,246,.12,.047]]);
    startMischief('scratch',1.15);
    distract(toSofa);
  }else if(action.kind==='bowl'){
    state.bowlUntil=state.now+.72;
    tone([[950,690,.13,.07],[1090,751,.12,.052]]);
    if(!showcase&&levels[state.level]?.event==='feed'&&!state.cleared){
      state.feedRequested=true;
      startFeeding();
    }else{
      startMischief('bowl',1.05);
      distract(toBowl);
    }
  }else if(action.kind==='chair'){
    jump(chair);
  }else if(action.kind==='plant'){
    if(state.plantIndex>=0)plants[state.plantIndex].rotation.z=0;
    state.plantIndex=action.plantIndex;
    state.plantAt=state.now;
    state.plantCooldown=state.now+1.05;
    state.scratchUntil=state.now+.66;
    state.scratchPoint=plantSpots[action.plantIndex];
    tone([[680,390,.09,.035],[620,330,.12,.044]],'triangle');
    const [x,z]=state.scratchPoint;
    const approach=x<0?[...toSofa.slice(0,3),[x+.65,z+.50]]:
      [...toBowl.slice(0,-1),[x-.55,z+.24]];
    startMischief('plant',1.30);
    if(state.ownerMode==='desk'&&z>-.7)distract(approach);
  }else if(action.kind==='drink'){
    if(cupEpisode){beginCupSip();return;}
    if(ownerSeesPlayer()){stopCupAttempt();return;}
    state.cupMotion={kind:'drink',start:state.now};
    tone([[330,590,.10,.027],[350,640,.12,.03],[360,580,.14,.034]]);
  }else if(action.kind==='drop'){
    if(cupEpisode){bumpCup();return;}
    state.refillAt=Infinity;
    state.cupMotion={kind:'drop',start:state.now,spills:state.cupFull};
    state.scratchUntil=state.now+.38;
    state.scratchPoint=cupSpot;
    startMischief('drop',.85);
  }
}
function updateProps(t,dt){
  if(state.plantIndex>=0){
    const elapsed=t-state.plantAt;
    plants[state.plantIndex].rotation.z=Math.sin(elapsed*25)*.15*Math.max(0,1-elapsed);
    const [x,z]=plantSpots[state.plantIndex];
    for(const [i,leaf] of looseLeaves.entries()){
      const progress=T.MathUtils.clamp((elapsed-i*.065)/.84,0,1);
      const angle=i*2.39;
      leaf.visible=progress>0;
      leaf.position.set(x+Math.cos(angle)*progress*.66,.045+(1-progress**1.45)*(.89+i*.065),z+Math.sin(angle)*progress*.63);
      leaf.rotation.set(0,angle+progress*5,Math.sin(progress*Math.PI)*.76);
    }
    if(elapsed>.62){complete('plant');rememberWorld('leaves','盆栽下散咗幾片葉。');}
  }
  const motion=state.cupMotion;
  if(!motion)return;
  const elapsed=t-motion.start;
  if(motion.kind==='drink'){
    const dx=cupSpot[0]-player.root.position.x,dz=cupSpot[1]-player.root.position.z;
    const range=Math.hypot(dx,dz);
    if(range>.42){
      const step=Math.min(range-.42,dt*1.55);
      const root=player.root.position;
      const [x,z]=nearestOn(coffeeTable,root.x+dx/range*step,root.z+dz/range*step);
      root.x=x;root.z=z;
    }
    rotateToward(player.root,Math.atan2(dx,dz),dt);
    player.head.position.y=player.headHeight-.21*Math.sin(Math.min(1,elapsed/.75)*Math.PI);
    const caught=ownerSeesPlayer();
    if(elapsed<.75&&!caught)return;
    player.head.position.y=player.headHeight;
    state.cupMotion=null;
    if(caught){
      stopCupAttempt();return;
    }
    state.cupFull=false;
    if(!showcase&&!secretCupUnlocked)saveCupDropStreak(0);
    state.cupNeedsCare=true;
    scheduleCleanup('cup');
    water.visible=false;
    toast('栗子偷飲了一口水');
    finishDrinkGoal();
    return;
  }
  const progress=Math.min(1,elapsed/.58);
  mug.position.y=.58-.45*progress**1.85;
  mug.position.z=cupSpot[1]+progress*.46;
  mug.rotation.x=progress*1.56;
  if(progress<1)return;
  state.cupMotion=null;
  rememberWorld('cup','茶几旁留低一攤水。');
  state.refillAt=Infinity;
  state.cupNeedsCare=true;
  state.cupFull=false;
  water.visible=false;
  puddle.visible=motion.spills;
  if(!showcase&&!secretCupUnlocked){
    saveCupDropStreak(Math.min(3,cupDropStreak+1));
    state.secretPending=cupDropStreak===3;
  }
  scheduleCleanup('cup');
  say(state.secretPending?'又係隻杯？栗子，你等我過嚟。':'哎呀，水杯跌咗！等我執返。','阿澄',2.8);
  tone([[950,365,.15,.076],[520,160,.16,.045]],'triangle');
  complete('drop');
  if(state.cleared&&levels[state.level]?.event==='drop')state.finishAt=Infinity;
}
function returnToDesk(){
  const remaining=state.ownerMode==='watch'?state.ownerRoute:
    state.distraction.slice(0,state.distraction.length-state.ownerRoute.length).reverse();
  state.ownerMode='return';
  state.ownerRoute=[...remaining,spots.desk];
}
function finishDrinkGoal(){
  if(levels[state.level]?.event==='drink-escape'&&!showcase){
    state.mission.drunkAt=state.now;
    state.mission.note='偷飲成功！趁阿澄未發現，離開茶几。';
  }else complete('drink');
}
function finishSeatGoal(){
  if(levels[state.level]?.event==='seat-stay'&&!showcase){
    state.mission.seatAt=state.now;
    state.mission.note='坐穩啦！再守住張凳三秒。';
  }else complete('seat');
}
function landOnChair(){
  if(chairEpisode)return;
  if(state.ownerMode==='routine'){
    finishSeatGoal();
    say('趁阿澄行開，坐一陣先。','栗子');
    return;
  }
  state.mochiRoute=[];
  state.mochiMode='look';
  state.ownerMode='watch';
  const reached=state.distraction.length-state.ownerRoute.length;
  state.ownerRoute=state.distraction.slice(0,reached).reverse();
  toast('轉椅坐到啦');
  finishSeatGoal();
}

function moveAlong(actor,route,speed,dt){
  if(!route.length)return false;
  const point=route[0], root=actor.root;
  const dx=point[0]-root.position.x,dz=point[1]-root.position.z;
  const length=Math.hypot(dx,dz);
  if(length<speed*dt+.025){
    root.position.x=point[0];root.position.z=point[1];route.shift();
  }else{
    root.position.x+=dx/length*speed*dt;
    root.position.z+=dz/length*speed*dt;
  }
  if(length>.015)rotateToward(root,Math.atan2(dx,dz),dt);
  return true;
}
function catPose(actor,moving,t,dt=.016){
  const position=actor.root.position;
  if(!actor.lastStepPosition)actor.lastStepPosition=position.clone();
  const moved=Math.hypot(position.x-actor.lastStepPosition.x,position.z-actor.lastStepPosition.z);
  actor.lastStepPosition.copy(position);
  if(moving)actor.travel=(actor.travel||0)+Math.min(moved,.30);
  actor.gaitBlend=(actor.gaitBlend||0)+((moving?1:0)-(actor.gaitBlend||0))*(1-Math.exp(-dt*16));
  const phase=(actor.travel||0)/.40;
  const blend=actor.gaitBlend;
  // A four-beat walk; each foot stays down for most of its cycle.
  const offsets=[0,.52,.26,.78];
  actor.paws.forEach((paw,index)=>{
    const p=(phase+offsets[index])%1;
    const stance=p<.65;
    const fraction=stance?p/.65:(p-.65)/.35;
    const swing=stance?.59-1.18*fraction:-.59+1.18*fraction;
    paw.rotation.x+=((swing*blend)-paw.rotation.x)*(1-Math.exp(-dt*19));
    paw.rotation.y=paw.rotation.z=0;
    if(actor.shins){actor.shins[index].rotation.set(moving&&!stance?-.42*Math.sin(fraction*Math.PI):0,0,0);}
    const a=paw.rotation.x,b=actor.shins?.[index].rotation.x??0;
    paw.position.y=.067+.15*Math.cos(a)+.09*Math.cos(a+b)-.034*Math.sin(a+b)+(moving&&!stance?.045*Math.sin(fraction*Math.PI):0);
  });
  actor.body.position.y=moving?.009*Math.sin(phase*Math.PI*4):.004*Math.sin(t*2.3);
  actor.head.rotation.z=.012*Math.sin(t*1.8);
  const blink=(t+(actor===mochi?1.7:0))%4.9;
  for(const eye of actor.eyes)eye.scale.y=blink<.16?Math.max(.10,Math.abs(blink-.08)/.08):1;
  actor.tail.rotation.y=.13*Math.sin(t*2.1);
}

function movePlayer(dt,t){
  if(state.restSpot&&inputDirection().lengthSq())leaveRest();
  if(state.restSpot?.settled){catPose(player,false,t,dt);return;}
  if(state.phase!=='play'||state.hop||state.actionBeat?.start!=null||state.cupMotion?.kind==='drink'){catPose(player,false,t,dt);return;}
  if(chairEpisode&&state.platform===chair&&['settling','won'].includes(chairChapter.state.stage)){
    state.motion.set(0,0,0);catPose(player,false,t,dt);return;
  }
  const direction=inputDirection(),root=player.root;
  if(blameEpisode){
    if(direction.lengthSq()){state.blameHidden=false;state.hideRequested=false;state.hideRoutePhase=null;}
    if(state.blameHidden||blameChapter.state.stage==='swatting'){state.motion.set(0,0,0);catPose(player,false,t,dt);return;}
  }
  if(cupEpisode&&direction.lengthSq())cupChapter.cancel();
  if(cupEpisode&&cupChapter.state.stage==='drinking'){state.motion.set(0,0,0);catPose(player,false,t,dt);return;}
  let speed=state.platform?1.05:1.65;
  if(direction.lengthSq()>0){playerRoute=[];if(state.actionBeat&&!state.actionBeat.applied)state.actionBeat=null;}
  else if(playerRoute.length){
    let point=playerRoute[0];
    if(Math.hypot(point[0]-root.position.x,point[1]-root.position.z)<.065){playerRoute.shift();point=playerRoute[0];}
    if(point){direction.set(point[0]-root.position.x,0,point[1]-root.position.z);speed*=Math.min(1,direction.length()/.19);direction.normalize();}
  }
  const desired=direction.multiplyScalar(speed);
  state.motion.lerp(desired,1-Math.exp(-dt*(desired.lengthSq()?10:16)));
  if(state.motion.lengthSq()<.0004)state.motion.set(0,0,0);
  const before=root.position.clone(),nx=root.position.x+state.motion.x*dt,nz=root.position.z+state.motion.z*dt;
  if(state.platform){const [x,z]=nearestOn(state.platform,nx,nz);root.position.x=x;root.position.z=z;}
  else{
    if(fits(nx,root.position.z))root.position.x=nx;else state.motion.x=0;
    if(fits(root.position.x,nz))root.position.z=nz;else state.motion.z=0;
  }
  const dx=root.position.x-before.x,dz=root.position.z-before.z;
  const moving=Math.hypot(dx,dz)>.00015;
  if(moving)rotateToward(root,Math.atan2(dx,dz),dt);
  if(!state.platform&&(state.velocityY||root.position.y)){
    state.velocityY-=11.7*dt;root.position.y=Math.max(0,root.position.y+state.velocityY*dt);
    if(!root.position.y)state.velocityY=0;
  }
  catPose(player,moving,t,dt);
}

function updateHop(t){
  if(!state.hop)return;
  const elapsed=t-state.hop.start;
  const total=state.hop.duration??.84;
  const progress=T.MathUtils.clamp(elapsed/total,0,1);
  const flight=T.MathUtils.clamp((progress-.18)/.66,0,1);
  const travel=T.MathUtils.smoothstep(flight,0,1);
  const root=player.root;
  root.position.lerpVectors(hopOrigin,hopDestination,travel);
  root.position.y=T.MathUtils.lerp(hopOrigin.y,hopDestination.y,travel)+Math.sin(flight*Math.PI)*.43;
  const preparing=progress<.18;
  const crouch=preparing?Math.sin(progress/.18*Math.PI/2):progress>.84?Math.sin((progress-.84)/.16*Math.PI):0;
  player.body.scale.y=1-crouch*.14;player.body.position.y=-crouch*.018;
  const tuck=!preparing&&progress<.84?Math.sin(flight*Math.PI):0;
  player.paws.forEach((paw,i)=>{paw.rotation.x=(i%2===1?-.72:.48)*tuck;player.shins[i].rotation.x=-.60*tuck;});
  player.tail.rotation.x=-.12*tuck;
  if(progress<1)return;
  root.position.copy(hopDestination);player.body.scale.y=1;player.tail.rotation.x=0;
  const previousPlatform=state.platform;
  state.platform=state.hop.platform;state.hop=null;state.landedAt=t;
  tone([[150,75,.10,.024]],'triangle');
  if(state.platform===fridgeTop){
    state.fridgeRescue={stage:'stranded'};
  }else if(previousPlatform===fridgeTop&&state.fridgeRescue?.stage==='lowering'){
    state.fridgeRescue=null;
    say('好啦，接住你喇。下次唔好爬咁高呀。','阿澄',3);
    collectSecret('fridge');
    state.ownerMode='return';state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,...spots.desk);
  }
  if(state.platform===chair)landOnChair();
  if(previousPlatform===chair&&state.ownerMode==='watch')returnToDesk();
  if(state.walkAfterHop){walkTo(...state.walkAfterHop);state.walkAfterHop=null;}
}
function updateFridgeRescue(t){
  if(state.fridgeRescue?.stage!=='coming'||state.ownerRoute.length||state.hop)return;
  state.fridgeRescue.stage='lowering';
  playerRoute=[];keys.clear();state.motion.set(0,0,0);
  hopOrigin.copy(player.root.position);
  hopDestination.set(6.23,0,-2.43);
  state.hop={platform:null,start:t,duration:1.15};
  say('好啦，我抱你落嚟。唔好郁呀。','阿澄',2.5);
}

function beginRoutine(choice){
  state.lastRoutine=choice.id;
  state.ownerMode='routine';
  state.ownerRoute=choice.route.slice();
  state.ownerRoutine={...choice,step:'out',leaveAt:Infinity};
  if(choice.id==='bath'){
    bathDoor.on=true;bathDoor.ajar=false;bathDoor.latched=false;
  }
}
function startFeeding(){
  if(!state.feedRequested||state.cleared||!['desk','routine','return','watch','fetch'].includes(state.ownerMode))return;
  const atDesk=state.ownerMode==='desk';
  if(state.ownerRoutine?.id==='bath'){
    bathDoor.on=true;bathDoor.ajar=false;bathDoor.latched=false;
  }
  const {x,z}=owner.root.position;
  const route=atDesk?toBowl.slice():floorRoute(x,z,...spots.hostBowl);
  if(!route.length&&Math.hypot(x-spots.hostBowl[0],z-spots.hostBowl[1])>1.1)return;
  state.ownerRoutine=null;
  state.feedRequested=false;state.ownerMode='feed';state.ownerRoute=route;state.feedingUntil=Infinity;
  state.ownerNext=Infinity;say('肚餓喇？我停一停，依家餵你。','阿澄',3);
}
function updateFeeding(){
  if(state.feedRequested)startFeeding();
  if(state.ownerMode!=='feed'||state.ownerRoute.length)return;
  if(state.feedingUntil===Infinity){
    state.feedingUntil=state.now+1.8;
    say('個碗真係空晒喎，依家餵你。','阿澄',2.2);
    return;
  }
  if(state.now<state.feedingUntil)return;
  kibble.visible=true;state.ownerMode='return';state.ownerRoute=toBowl.slice(0,-1).reverse();state.ownerRoute.push(spots.desk);
  say('好啦，開飯喇，慢慢食。','阿澄',2.8);complete('feed');
}
function updateRoutine(){
  if(state.ownerMode==='desk'&&state.now>=state.ownerNext){
    beginRoutine(differentChoice(ownerRoutines,state.lastRoutine));
    return;
  }
  if(state.ownerMode!=='routine'||state.ownerRoute.length)return;
  const routine=state.ownerRoutine;
  if(routine.step==='out'){
    routine.step='pause';
    routine.leaveAt=state.now+routine.wait;
    if(routine.id==='bath'){
      const {x,z}=player.root.position;
      const mochiPosition=mochi.root.position;
      const inBath=(px,pz)=>px>-1.9&&px<2.3&&pz<-.37;
      if(!inBath(x,z)&&!inBath(mochiPosition.x,mochiPosition.z)){
        bathDoor.on=false;bathDoor.ajar=false;bathDoor.latched=true;
      }
    }
    return;
  }
  if(routine.step==='pause'&&state.now>=routine.leaveAt){
    if(routine.id==='bath'){
      bathDoor.on=true;bathDoor.ajar=false;bathDoor.latched=false;
      if(state.bathSecretPending){
        state.bathSecretPending=false;
        routine.step='welcome';routine.leaveAt=state.now+8;
        say('入嚟啦，門開咗。真係一刻都唔可以離開你。','阿澄',3.5);
        collectSecret('bath');return;
      }
    }
    routine.step='back';
    state.ownerRoute=routine.route.slice(0,-1).reverse();
    state.ownerRoute.push([-3.68,-2.63]);
    return;
  }
  if(routine.step==='welcome'){
    const {x,z}=player.root.position;
    if(!(x>-1.9&&x<2.3&&z<-.7)&&state.now<routine.leaveAt)return;
    routine.step='back';state.ownerRoute=routine.route.slice(0,-1).reverse();state.ownerRoute.push([-3.68,-2.63]);return;
  }
  if(routine.step==='back'){
    state.ownerRoutine=null;
    state.ownerNext=state.now+interval(14,27);
    if(state.platform===chair||state.hop?.platform===chair){
      state.ownerMode='watch';
      say('好啦，張凳借你坐一陣。');
    }else{
      state.ownerMode='return';
      state.ownerRoute=[spots.desk];
    }
  }
}
function updateMochiRoutine(){
  if(state.chain&&state.chain.stage!=='done')return;
  if(state.mochiMode!=='idle'||state.mochiRoute.length)return;
  if(state.nextIdle===Infinity){
    state.nextIdle=state.now+interval(2.5,5.5);
    state.mochiRestUntil=state.nextIdle;
    return;
  }
  if(state.now<state.nextIdle)return;
  const stop=differentChoice(mochiStops,state.lastMochiStop);
  state.lastMochiStop=stop.id;
  state.mochiStop=stop.id;
  const {x,z}=mochi.root.position;
  state.mochiRoute=floorRoute(x,z,...stop.spot);
  state.nextIdle=Infinity;
}
function updateMochiAffection(){
  if(showcase||state.secretOpen||state.phase!=='play'||state.mochiMode!=='idle'||
    state.mochiRoute.length||state.now>=state.mochiRestUntil||
    state.now<state.mochiAffectionCooldown)return;
  if(state.ownerMode==='desk'&&state.mochiStop==='owner'&&
    distance(mochi,[owner.root.position.x,owner.root.position.z])<1.15){
    state.mochiAffectionUntil=state.now+2.7;
    state.mochiAffectionCooldown=state.now+23;
    state.mochiHopUntil=state.now+.85;
    say('麻糬，走嚟黐住我呀？好啦，摸摸你。','阿澄',3);
  }else if(state.ownerMode==='routine'&&state.ownerRoutine?.step==='back'&&
    ['bed','box'].includes(state.mochiStop)&&
    distance(mochi,[owner.root.position.x,owner.root.position.z])<4&&ownerSeesActor(mochi)){
    state.mochiAffectionCooldown=state.now+18;
    state.ownerCuePoint=[mochi.root.position.x,mochi.root.position.z];
    state.ownerCueUntil=state.now+1.6;
    say('麻糬，搵到咁舒服嘅位瞓呀？','阿澄',2.8);
  }
}
function updateStory(dt=.05){
  if(state.phase!=='play'||state.secretOpen)return;
  if(cupEpisode||blameEpisode)return;
  if(chairEpisode){updateChairEpisode();return;}
  if(state.ownerMode==='pet'&&state.now>=state.petUntil){
    complete('pet');
    state.ownerMode=state.petReturn;
    state.attention=0;
    state.turnUntil=0;
    if(state.ownerMode==='desk')state.ownerNext=state.now+interval(12,21);
  }
  updateFeeding();
  updateRoutine();
  updateHideSeek(dt);
  if(state.ownerMode==='fetch'){
    if(state.now>=state.raceStart+5.8&&state.mochiMode==='alert'){
      state.mochiRoute=[[.1,.75],[-3.45,.75],spots.door,[-3.45,-2.68],spots.seat];
      state.mochiMode='race';
    }
    if(state.mochiMode==='race'&&!state.mochiRoute.length&&state.hop?.platform!==chair){
      state.raceLost=true;state.mochiMode='seated';mochi.root.position.y=.87;
      state.raceEnd=Math.min(state.raceEnd,state.now+2.3);
      say('喵。', '麻糬',2);
      toast('麻糬坐上了轉椅');
    }
    if(state.now>=state.raceEnd&&state.hop?.platform!==chair)returnToDesk();
  }
  if(state.ownerMode==='return'&&!state.ownerRoute.length){
    state.ownerMode='desk';
    state.ownerNext=state.now+interval(11,21);
    if(state.mochiMode!=='idle')place(mochi,spots.mochiStart);
    state.mochiRoute=[];
    state.mochiMode='idle';state.nextIdle=state.now+2;
    state.raceLost=false;
  }
  if(state.now>=state.finishAt){
    const level=levels[state.level];
    const last=state.level===levels.length-1;
    state.phase='finish';
    keys.clear();
    ui['finish-kicker'].textContent='第 '+String(state.level+1).padStart(2,'0')+' 關 ✓';
    ui['finish-title'].textContent=level.title;
    ui['finish-text'].textContent=level.line;
    ui['finish-quote'].textContent='「'+caseCaptions[state.level].replace(/^供詞：/,'')+'」';
    showRecordImage(ui['finish-photo'],recordPhoto(state.level),'第 '+(state.level+1)+' 關紀錄相片：'+level.title);
    ui['finish-caption'].textContent='證物 '+String(state.level+1).padStart(2,'0')+' · '+level.title;
    ui.next.hidden=last;
    ui.roam.hidden=!last;
    ui.finish.hidden=false;
    ui.touch.hidden=ui.controls.hidden=true;
    (last?ui.roam:ui.next).focus({preventScroll:true});
  }
  if(state.mochiMode==='play'&&(state.now>=state.mochiPlayUntil||!state.mochiRoute.length)){
    state.mochiMode='idle';
    state.mochiRoute=[];
    state.nextIdle=state.now+1.3;
  }
  if(state.mochiMode==='alibi'&&state.now>=state.mission.mochiUntil){state.mochiMode='idle';state.mochiRoute=[];state.nextIdle=state.now+2;}
  updateMochiRoutine();
}

function poseHost(walking,dt,t){
  const sitting=['desk','cup-sit','blame-desk'].includes(state.ownerMode)||state.ownerMode==='pet'&&state.petReturn==='desk';
  const petting=state.ownerMode==='pet'||chairEpisode&&state.ownerMode==='chapter-search'&&chairChapter.state.method==='soft'&&distance(player,[owner.root.position.x,owner.root.position.z])<1.0;
  const pettingMochi=t<state.mochiAffectionUntil&&state.ownerMode==='desk';
  const turning=(state.ownerMode==='desk'&&state.now<state.turnUntil)||
    (state.ownerMode==='fetch'&&!state.ownerRoute.length&&distance(player,[owner.root.position.x,owner.root.position.z])<4.15);
  const reacting=t<state.ownerReactUntil;
  const sighing=t<state.ownerSighUntil;
  const noticing=t<state.ownerCueUntil;
  const working=!noticing&&!pettingMochi&&(state.ownerMode==='desk'||blameEpisode&&state.ownerMode==='blame-desk'&&blameChapter.state.attention==='work')&&!turning&&!reacting;
  const stretch=state.ownerMode==='routine'&&state.ownerRoutine.id==='stretch'&&state.ownerRoutine.step==='pause';
  const swing=walking?Math.sin(t*10.5)*.47:0;
  if(pettingMochi&&!walking){
    rotateToward(owner.root,Math.atan2(mochi.root.position.x-owner.root.position.x,mochi.root.position.z-owner.root.position.z),dt);
  }else if(noticing&&!walking){const p=state.ownerCuePoint;rotateToward(owner.root,Math.atan2(p[0]-owner.root.position.x,p[1]-owner.root.position.z),dt);}
  else if(petting||turning||chairEpisode&&['chapter-watch','chapter-search'].includes(state.ownerMode)||(!walking&&(reacting||state.now<state.greetUntil))){
    const dx=player.root.position.x-owner.root.position.x;
    const dz=player.root.position.z-owner.root.position.z;
    rotateToward(owner.root,Math.atan2(dx,dz),dt);
  }else if(state.ownerMode==='desk'){
    rotateToward(owner.root,Math.PI,dt);
  }
  const ease=Math.min(1,dt*10);
  const mix=(target,key,value)=>{target[key]+=(value-target[key])*ease;};
  mix(owner.body.position,'y',sitting?-.14:Math.abs(swing)*.052);
  mix(owner.body.rotation,'x',petting?.53:pettingMochi?.30:sighing?.15:working?.13:0);
  mix(owner.head.rotation,'x',sighing?.29:pettingMochi?.32:petting?.19:noticing?.14:.025);
  mix(owner.head.rotation,'z',reacting&&!sighing?-.11:0);
  owner.legs.forEach(({thigh,shin},i)=>{
    mix(thigh.rotation,'x',sitting?-1.38:(i===0?swing:-swing));
    mix(shin.rotation,'x',sitting?1.35:Math.max(0,i===0?-swing:swing)*.55);
    mix(thigh.position,'y',sitting?.73:.83);
  });
  owner.arms.forEach((arm,i)=>{
    const target=pettingMochi?(i===0?-.44+.18*Math.sin(t*8):-.24):petting?(i===0?-.48+.22*Math.sin(t*14):-.20):
      working?-.89+.075*Math.sin(t*19+i):stretch?-2.2-.38*Math.sin(t*2):(i===0?-swing:swing)*.78;
    mix(arm.rotation,'x',target);
    mix(arm.rotation,'z',i===0?-.13:.13);
  });
  const petTarget=pettingMochi?mochi:player;
  if((pettingMochi||petting)&&distance(petTarget,[owner.root.position.x,owner.root.position.z])<1.18){
    owner.body.updateWorldMatrix(true,true);petTarget.head.updateWorldMatrix(true,false);
    const head=petTarget.head.getWorldPosition(new T.Vector3());head.y+=.18;
    const hand=owner.body.worldToLocal(head).sub(owner.arms[0].position);
    if(hand.length()<.64){
      const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),hand.normalize());
      owner.arms[0].quaternion.slerp(q,Math.min(1,dt*14));
    }
  }
}

function updateHud(t){
  if(!ui.speech.hidden&&t>=state.speechUntil)ui.speech.hidden=true;
  if(!ui.toast.hidden&&t>=state.toastUntil)ui.toast.hidden=true;
  ui['computer-feed'].hidden=t>=state.typedUntil||state.phase!=='play';
  const {x,y,z}=player.root.position;
  const room=z<-.7?(x<-2.2?'書房':x<2.4?'廁所':'廚房'):x>2.4&&z<1.18?'廚房':'客廳';
  if(ui.room.textContent!==room)ui.room.textContent=room;
  const targets=interactionTargets();
  const active=activeTarget(targets);
  if(state.targetId&&!targets.some(target=>target.id===state.targetId))state.targetId=null;
  ui['target-switch'].hidden=targets.length<2;
  updatePicker(targets,active);
  ui.pause.disabled=state.phase!=='play';
  if(targets.length>1){
    const label=active.name+' · '+(targets.indexOf(active)+1)+'/'+targets.length;
    if(ui['target-label'].textContent!==label)ui['target-label'].textContent=label;
  }
  const action=active?.primary;
  const alt=active?.secondary;
  ui['alt-action'].hidden=!alt;
  if(alt&&ui['alt-label'].textContent!==alt.label)ui['alt-label'].textContent=alt.label;
  ui.action.hidden=!action;
  ui['touch-act'].disabled=!action;
  if(action&&ui['action-label'].textContent!==action.label)ui['action-label'].textContent=action.label;
  const target=state.phase==='play'&&!state.hop&&jumpTarget();
  const label=state.platform===fridgeTop?'落唔到去':target?'跳上'+target.platform.name:state.platform?'跳下':'跳';
  if(ui['jump-label'].textContent!==label)ui['jump-label'].textContent=label;
  ui['jump-down'].hidden=!state.platform||state.platform===fridgeTop||!!state.hop;
  ui['jump-down-label'].textContent=state.platform?'跳下'+state.platform.name:'落地';
  updateWalkMarker();
  for(const sprite of roomLabels)sprite.visible=!showcase&&!closeView&&focusMix<.22;
  playerRing.position.set(x,y+.045,z);
  ui['map-dot'].style.background=state.platform?'#598064':'#935031';
  ui['map-dot'].style.left=(x+8)/16*100+'%';
  ui['map-dot'].style.top=(z+4.9)/9.8*100+'%';

  if(!ui['meow-bubble'].hidden){
    if(t>=state.meowUntil||state.phase!=='play')ui['meow-bubble'].hidden=true;
    else{
      activeCamera().updateMatrixWorld();
      meowScreen.set(x,y+1.04,z).project(activeCamera());
      ui['meow-bubble'].style.left=T.MathUtils.clamp((meowScreen.x+1)*50,8,92)+'%';
      ui['meow-bubble'].style.top=T.MathUtils.clamp((1-meowScreen.y)*50,11,91)+'%';
    }
  }
}
function resize(){
  const width=ui.world.clientWidth,height=ui.world.clientHeight;
  if(!width||!height)return;
  aspect=width/height;
  renderer.setSize(width,height,false);
  const viewWidth=aspect<.88?Math.max(10.7,aspect*15.2):19.8;
  const viewHeight=showcase?Math.max(cupEpisode?4.5:4.7,6.9/aspect):Math.max(11.55,viewWidth/aspect);
  overhead.left=-viewHeight*aspect/2;overhead.right=-overhead.left;
  overhead.top=viewHeight/2;overhead.bottom=-overhead.top;
  overhead.updateProjectionMatrix();
  const closeHeight=Math.max(showcase?2.85:4.05,3.8/aspect);
  closeCamera.left=-closeHeight*aspect/2;closeCamera.right=-closeCamera.left;
  closeCamera.top=closeHeight/2;closeCamera.bottom=-closeCamera.top;
  closeCamera.updateProjectionMatrix();
}
function holdFocus(id){
  if(state.focusPaused)return;
  state.focusId=id;
  state.focusHoldUntil=state.now+1.45;
}
function updateDetail(dt){
  const inRange=state.phase==='play'&&!state.hop?featuredProps.filter(canReach):[];
  if(!inRange.length)state.focusPaused=false;
  const current=inRange.find(prop=>prop.id===state.focusId);
  const selected=inRange.find(prop=>prop.id===state.targetId);
  const playerPosition=player.root.position;
  const closest=inRange.reduce((a,b)=>!a||distance(player,[b.x,b.z])<distance(player,[a.x,a.z])?b:a,null);
  const candidate=selected||closest;
  if(state.focusCandidate!==candidate?.id){state.focusCandidate=candidate?.id;state.focusCandidateAt=state.now;}
  const stationary=!state.motion.lengthSq()&&!playerRoute.length&&!state.hop;
  const passive=!chairEpisode&&!cupEpisode&&!blameEpisode&&stationary&&state.now-state.focusCandidateAt>.75;
  const active=state.focusPaused?null:
    current&&state.now<state.focusHoldUntil?current:passive?candidate:null;
  const wasActive=focusMix>.002;
  const blend=1-Math.exp(-dt*3.5);
  focusMix+=((active?1:0)-focusMix)*blend;
  if(active){
    const shot=shots[active.id];
    detailAim.set(T.MathUtils.lerp(active.x,playerPosition.x,.40),shot.y,
      T.MathUtils.lerp(active.z+shot.depth,playerPosition.z,.38));
    if(shot.angle)shotGoalOffset.set(...shot.angle);
    else shotGoalOffset.copy(detailCameraOffset);
    if(wasActive){
      detailTarget.lerp(detailAim,blend);
      shotOffset.lerp(shotGoalOffset,blend);
    }else{
      detailTarget.copy(detailAim);
      shotOffset.copy(shotGoalOffset);
    }
    detailHeight=shot.height;
    if(ui['focus-label'].textContent!==shot.label)ui['focus-label'].textContent=shot.label;
  }
  ui['focus-badge'].hidden=!active||focusMix<.28;
  if(focusMix<=.002)return;
  const base=closeView?closeCamera:overhead;
  detailLook.lerpVectors(closeView?closeTarget:cameraTarget,detailTarget,focusMix);
  if(closeView)detailOffset.copy(closeOffset).multiplyScalar(2.6);
  else detailOffset.copy(cameraOffset);
  detailView.copy(detailOffset).lerp(shotOffset,focusMix);
  detailCamera.position.copy(detailLook).add(detailView);
  detailCamera.lookAt(detailLook);
  const half=T.MathUtils.lerp(base.top,Math.max(detailHeight,2.6/aspect)*.5,focusMix);
  detailCamera.top=half;detailCamera.bottom=-half;
  detailCamera.left=-half*aspect;detailCamera.right=half*aspect;
  detailCamera.updateProjectionMatrix();
  detailCamera.updateMatrixWorld(true);
}
function updateCamera(dt){
  const following=aspect<.88&&state.phase!=='intro';
  const x=cupEpisode?-5.25:showcase?-5.10:following?T.MathUtils.clamp(player.root.position.x,-5.2,5.2):0;
  const z=cupEpisode?3.0:showcase?-2.85:following?T.MathUtils.clamp(player.root.position.z*.55,-2.1,2.1):-.15;
  cameraTarget.x+=(x-cameraTarget.x)*Math.min(1,dt*5);
  cameraTarget.z+=(z-cameraTarget.z)*Math.min(1,dt*5);
  overhead.position.copy(cameraTarget).add(cameraOffset);
  overhead.lookAt(cameraTarget);
  const focus=player.root.position;
  closeTarget.lerp(closeFocus.set(focus.x,focus.y+.42,focus.z),Math.min(1,dt*8));
  closeCamera.position.copy(closeTarget).addScaledVector(closeOffset,2.6);
  closeCamera.lookAt(closeTarget);
  overhead.updateMatrixWorld(true);closeCamera.updateMatrixWorld(true);
  updateDetail(dt);
  const viewingClose=showcase||closeView||focusMix>.30;
  const watchPoint=focusMix>.30?detailLook:closeTarget;
  const position=activeCamera().position;
  occlusion.origin.copy(watchPoint);
  cameraBlockVector.subVectors(position,watchPoint);
  occlusion.direction.copy(cameraBlockVector).normalize();
  for(const wall of partitions){
    const {x,z,w,d,h}=wall;
    occlusionBox.min.set(x-w/2,0,z-d/2);
    occlusionBox.max.set(x+w/2,h,z+d/2);
    const hit=viewingClose&&occlusion.intersectBox(occlusionBox,occlusionHit);
    wall.node.visible=!(hit&&occlusionHit.distanceToSquared(watchPoint)<Math.min(56,cameraBlockVector.lengthSq()));
  }
}

const blameScene=makeBlameScene(scene,blameEpisode);
const portrait=roomObjects.find(prop=>prop.id==='print');
const hideGuide=ring(0xcfb583,.48);hideGuide.visible=false;
const blameAnchor=new T.Vector3();
if(blameEpisode){
  for(const wall of blameScene.walls){colliders.push(wall.slice(0,4));sightFurniture.push(wall.slice());}
  const toyProp={id:'blame-toy',name:'逗貓鼠',verb:'引麻糬上枱玩',kind:'lure',x:-4.20,z:-3.70,node:blameScene.toy,support:'desk',contactY:1.25,reach:.76};
  initProps([toyProp]);props.push(toyProp);roomObjects.push(toyProp);
}
function beginFramePrank(){
  if(!canReach(portrait)||state.ownerMode!=='blame-desk'){
    toast('要先跳上書桌，行近掛畫，等阿澄坐返低。');return false;
  }
  const event=blameChapter.begin(state.now);if(!event)return false;
  state.lastFailure=null;
  if(state.actionBeat?.applied)blameChapter.state.contactAt=state.now;
  playerRoute=[];state.motion.set(0,0,0);
  state.gesture={kind:'tilt',point:[portrait.x,portrait.z],reachUp:true,until:state.now+.88};
  holdFocus('print');state.focusHoldUntil=state.now+.95;
  return true;
}
function inviteBlameMochi(source='toy'){
  if(state.blameMochiPending||state.blameMochiHop)return;
  if(state.blameMochiOnDesk){state.blameToyUntil=state.now+22;toast('麻糬繼續玩緊逗貓鼠。');return;}
  const route=floorRoute(mochi.root.position.x,mochi.root.position.z,-3.85,-2.95);
  if(!route.length){toast('麻糬暫時行唔到過嚟。');return;}
  state.blameMochiPending=true;state.mochiMode='blame-toy';state.mochiRoute=route;
  chainBeat(source==='pencils'?'鉛筆響咗，麻糬留意到聲音。':'逗貓鼠郁咗，麻糬想過嚟。');signalMochi('？',2.0);
  state.blameLure=source;
  say(source==='pencils'?'喵？支筆郁緊？我都想玩。':'喵？有玩具？','麻糬',2);
  state.mochiAnswerAt=state.now+(state.mochiMood==='sleepy'?.75:.25);
  tone([[690,520,.09,.02],[630,480,.10,.02]]);
}
function hideBlameCat(){
  if(state.paused)return;
  if(!blameEpisode||state.phase!=='play')return;
  if(blameChapter.state.stage==='swatting'){state.hideAfterSwat=!state.hideAfterSwat;return;}
  if(state.blameHidden||state.hideRequested){
    state.blameHidden=false;state.hideRequested=false;state.hideRoutePhase=null;playerRoute=[];return;
  }
  state.hideRequested=true;state.hideRoutePhase='start';state.hideStartedAt=state.now;
}
function planBlameHide(){
  if(state.hop)return;
  playerRoute=[];state.motion.set(0,0,0);keys.clear();
  if(state.platform){
    const landingPoint=[-5.70,-3.0];
    if(!fits(...landingPoint)||!clearHop(...landingPoint)){
      state.hideRequested=false;state.hideRoutePhase=null;toast('呢度跳唔到去紙箱。先跳落地，再試。');return;
    }
    hopOrigin.copy(player.root.position);hopDestination.set(landingPoint[0],0,landingPoint[1]);
    state.hop={platform:null,start:state.now,duration:.9};state.walkAfterHop=hideBox.entry.slice();
    player.root.rotation.y=Math.atan2(landingPoint[0]-player.root.position.x,landingPoint[1]-player.root.position.z);
  }else walkTo(...hideBox.entry);
  state.hideRoutePhase='entry';
}
function updateBlameEpisode(dt,t){
  if(!blameEpisode||state.phase!=='play'){hideGuide.visible=false;return;}
  const c=blameChapter.state;
  if(state.blameMochiPending&&!state.mochiRoute.length&&!state.blameMochiHop){
    state.blameMochiPending=false;
    state.blameMochiHop={from:mochi.root.position.clone(),to:new T.Vector3(-4.20,1.17,-3.70),start:t,up:true};
  }
  if(state.blameMochiHop){
    const hop=state.blameMochiHop,p=T.MathUtils.clamp((t-hop.start)/.84,0,1),travel=T.MathUtils.smoothstep(p,.12,.92);
    mochi.root.position.lerpVectors(hop.from,hop.to,travel);mochi.root.position.y+=Math.sin(p*Math.PI)*.36;
    mochi.paws.forEach((paw,i)=>paw.rotation.x=(i%2?-.60:.40)*Math.sin(p*Math.PI));
    if(p>=1){if(hop.up)chainBeat('麻糬跳上書桌，開始玩。');mochi.root.position.copy(hop.to);state.blameMochiOnDesk=hop.up;state.blameMochiHop=null;state.blameToyUntil=t+22;}
  }
  if(state.blameMochiOnDesk&&!state.blameMochiHop){
    rotateToward(mochi.root,Math.PI,dt);
    mochi.paws[1].rotation.x=-.25+.14*Math.sin(t*7);
    blameScene.toy.rotation.y=.10*Math.sin(t*4);
    if(c.stage==='planning'&&t>state.blameToyUntil){
      state.blameMochiOnDesk=false;
      state.blameMochiHop={from:mochi.root.position.clone(),to:new T.Vector3(-3.85,0,-2.95),start:t,up:false};
    }
  }
  if(state.hideRequested){
    if(t-state.hideStartedAt>8){state.hideRequested=false;state.hideRoutePhase=null;toast('有嘢擋住入口。行近紙箱，再試。');}
    else if(state.hideRoutePhase==='start')planBlameHide();
    else if(!state.hop&&state.hideRoutePhase==='entry'&&distance(player,hideBox.entry)<.17){walkTo(...hideBox.inside);state.hideRoutePhase='inside';}
    else if(!state.hop&&state.hideRoutePhase==='inside'&&distance(player,hideBox.inside)<.11){
      state.blameHidden=true;state.hideRequested=false;state.hideRoutePhase=null;playerRoute=[];state.motion.set(0,0,0);
      player.root.position.x=hideBox.inside[0];player.root.position.z=hideBox.inside[1];player.root.rotation.y=0;
    }
  }
  state.hideBlend=T.MathUtils.damp(state.hideBlend,state.blameHidden?1:0,12,dt);
  player.setSitting(0);
  player.setResting(state.blameHidden?1:0);
  if(!state.hop&&state.blameHidden)player.root.position.y=.07;
  const friendNear=state.blameMochiOnDesk&&!state.blameMochiHop&&Math.hypot(mochi.root.position.x-portrait.x,mochi.root.position.z-portrait.z)<1.2;
  const event=blameChapter.tick(t,{watched:ownerSeesPlayer(),friendNear,friendVisible:ownerSeesActor(mochi),ownerReady:state.ownerMode==='blame-inspect'&&!state.ownerRoute.length});
  if(event){
    if(event.type==='crooked'){
      activateProp(portrait,t);rememberWorld('picture','掛畫歪咗，麻糬仲喺附近。');tone([[490,310,.08,.035]],'triangle');
      say('咦？頭先係咪有聲？','阿澄',2.3);
      state.focusHoldUntil=t+.35;
      if(state.hideAfterSwat){state.hideAfterSwat=false;hideBlameCat();}
    }else if(event.type==='investigate'){
      chainBeat('阿澄聽見掛畫聲，起身查看。');
      state.ownerMode='blame-investigate';state.ownerRoute=[[-3.18,-2.85]];
    }else if(event.type==='caught'){
      say('栗子，我頭先親眼見到你隻爪！躲入紙箱都冇用呀。','阿澄',4);
      state.lastFailure='阿澄親眼見過你動手，躲藏唔會清除佢嘅記憶。';state.ownerSighUntil=t+.9;sigh();
    }else if(event.type==='uncertain'){
      state.lastFailure=event.reason==='both-visible'?'阿澄見到兩隻貓，無法認定係麻糬。試下避開視線。':'麻糬未留喺現場；先吸引佢上枱玩。';
      say(event.reason==='both-visible'?'你兩隻都喺度……我唔亂估。扶返正先。':'又歪咗？邊個做㗎？我都冇見到。','阿澄',3.6);
    }else if(event.type==='retry'){
      forgetWorld('picture');resetProp(portrait);state.ownerMode='blame-return';state.ownerRoute=[spots.desk];
      toast('掛畫扶正咗。可以換個時機再試。',3);
    }else if(event.type==='win'){
      celebrate('扮無辜成功！','阿澄只見到麻糬，栗子已避開視線。');
      state.blameTidyAt=t+10;state.blameToyUntil=Infinity;state.ownerSighUntil=t+1;sigh();
      say('麻糬？你喺幅畫下面玩啲乜呀……唉。','阿澄',4.3);
      state.blameMochiProtestAt=t+2.5;
      ui['chapter-method'].textContent='被親眼捉到 '+c.catches+' 次 · 證據不足 '+c.uncertain+' 次';
      ui['chapter-result'].hidden=false;updateTask();
      tone([[523,659,.12,.04],[659,784,.12,.04],[784,1047,.26,.04]]);
    }
  }
  if(state.ownerMode==='blame-investigate'&&!state.ownerRoute.length)state.ownerMode='blame-inspect';
  if(state.ownerMode==='blame-return'&&!state.ownerRoute.length)state.ownerMode='blame-desk';
  const look=c.attention==='shelf'?[-7.2,-2.2]:c.attention==='noise'?c.noisePoint:c.attention==='picture'?[portrait.x,portrait.z]:[-5,-4.19];
  if(!state.ownerRoute.length&&!['blame-tidy','blame-done'].includes(state.ownerMode))rotateToward(owner.root,Math.atan2(look[0]-owner.root.position.x,look[1]-owner.root.position.z),dt*.65);
  if(c.won){
    mochi.head.rotation.z=.16*Math.sin(t*2);
    if(t>state.blameTidyAt&&!state.blameTidied){
      state.blameTidied=true;state.ownerMode='blame-tidy';state.ownerRoute=[[-3.16,-3.95]];state.blameWipeUntil=Infinity;
      say('唉，扶返正先。麻糬，下次唔好玩幅畫啦。','阿澄',3);
    }
    if(state.ownerMode==='blame-tidy'&&!state.ownerRoute.length){
      if(state.blameWipeUntil===Infinity)state.blameWipeUntil=t+1.8;
      rotateToward(owner.root,Math.atan2(portrait.x-owner.root.position.x,portrait.z-owner.root.position.z),dt);
      owner.arms[0].rotation.x=-1.7;owner.body.rotation.x=.16;
      if(t>state.blameWipeUntil){resetProp(portrait);forgetWorld('picture');state.ownerMode='blame-done';}
    }
    if(t>=state.blameMochiProtestAt){state.blameMochiProtestAt=Infinity;say('喵？我只係玩隻老鼠咋喎。','麻糬',4);}
  }
}
function updateBlameHud(){
  if(!blameEpisode)return;
  const c=blameChapter.state,watched=ownerSeesPlayer();
  ui['chapter-panel'].hidden=c.won;
  ui['chapter-panel'].classList.toggle('watched',watched&&['planning','swatting'].includes(c.stage));
  ui['chapter-panel'].classList.toggle('inspecting',['fleeing','inspecting'].includes(c.stage));
  ui['chapter-panel'].classList.toggle('failed',['caught','uncertain'].includes(c.stage));
  const statuses={planning:watched?'阿澄：望得到栗子':c.attention==='shelf'?'阿澄：望緊書架':c.attention==='noise'?'阿澄：望緊聲音方向':'阿澄：忙住工作',swatting:'栗子：伸爪中……',fleeing:'阿澄：準備查看掛畫',inspecting:'阿澄：查看現場',caught:'阿澄：記得係栗子做嘅',uncertain:'阿澄：證據不足',won:'栗子：扮無辜成功'};
  const friend=state.blameMochiOnDesk?'麻糬喺書桌玩緊。':state.blameMochiPending||state.blameMochiHop?'麻糬過緊嚟。':'麻糬未到掛畫附近。';
  const notes={planning:friend,swatting:'地面掂唔到，要喺書桌上先撥到幅畫。',fleeing:c.witnessed?'阿澄見到栗子動手，佢記住咗。':state.blameHidden?'栗子已躲入紙箱。'+friend:friend+' 找個地方避開視線。',inspecting:state.blameHidden?'靜靜地，唔好探頭。':'主人正留意兩隻貓嘅位置。',caught:'知道係邊個做，躲起來亦不會改變。稍後可以再試。',uncertain:'只見到掛畫歪咗，仲未足以認定係麻糬。',won:'麻糬明明係清白嘅……'};
  ui['chapter-status'].textContent=statuses[c.stage];ui['chapter-note'].textContent=notes[c.stage];
  ui['seat-progress'].hidden=!['fleeing','inspecting'].includes(c.stage);
  ui['seat-fill'].style.width=(c.stage==='fleeing'?Math.max(0,(c.inspectAt-state.now)/7.5)*100:c.stage==='inspecting'?Math.max(0,(c.verdictAt-state.now)/1.4)*100:0)+'%';
  ui['hide-label'].textContent=state.blameHidden?'探頭':state.hideRequested?'取消躲藏':state.hideAfterSwat?'準備躲藏':'躲藏';
  hideGuide.visible=!state.blameHidden&&['fleeing','inspecting'].includes(c.stage);
  hideGuide.position.set(hideBox.entry[0],.042,hideBox.entry[1]);
  ui['seat-hint'].hidden=!hideGuide.visible;
  if(hideGuide.visible){
    blameAnchor.set(hideBox.x,.95,hideBox.z).project(activeCamera());
    ui['seat-hint'].style.left=T.MathUtils.clamp((blameAnchor.x+1)*50,12,88)+'%';ui['seat-hint'].style.top=T.MathUtils.clamp((1-blameAnchor.y)*50,15,80)+'%';
    ui['seat-hint'].textContent='紙箱入口 · H 躲藏';
  }
}

const cupScene=makeCupScene(scene,player,owner,cupEpisode);
if(cupEpisode){
  const ball={id:'cup-ball',name:'玩具波',verb:'拍響玩具波',kind:'wiggle',x:-3.35,z:1.1,node:cupScene.toy,contactY:.16,reach:.68};
  initProps([ball]);props.push(ball);roomObjects.push(ball);
}
const cupGuide=ring(0xd4b86d,.21);cupGuide.visible=false;
const sipStation=[-5.04,3.60];
const cupLabelPoint=new T.Vector3();
function beginCupSip(){
  const event=cupChapter.begin(state.now,{watched:ownerSeesPlayer()});
  if(!event)return;
  if(event.type==='caught'){showCupStop();return;}
  if(event.type==='approach'){
    state.lastFailure=null;
    playerRoute=[sipStation.slice()];state.targetId='cup';
    holdFocus('cup-focus');
  }else{playerRoute=[];state.motion.set(0,0,0);}
}
function inviteCupMochi(){
  if(cupChapter.state.stage==='spilled'||state.cupMochiPending)return;
  const point=cupScene.toy.position;
  if(state.now<state.mochiAnswerAt)return;
  const route=floorRoute(mochi.root.position.x,mochi.root.position.z,point.x,point.z+.3);
  if(!route.length){toast('麻糬望住你，暫時唔想郁。');return;}
  state.mochiAnswerAt=state.now+(state.mochiMood==='sleepy'?.8:.2);
  state.cupMochiPending=true;state.mochiMode='cup-toy';state.mochiRoute=route;
  say('喵？嗰邊有波玩？','麻糬',2.5);
  tone([[440,610,.13,.03],[590,420,.14,.03]]);
}
function bumpCup(){
  const event=cupChapter.bump(state.now);
  if(!event)return;
  playerRoute=[];state.motion.set(0,0,0);state.cupWobbleAt=state.now;
  state.scratchUntil=state.now+.36;state.scratchPoint=cupSpot;
  holdFocus('cup-focus');
  if(event.type==='wobble'){
    tone([[570,430,.09,.025]],'triangle');
    if(ownerSeesPlayer())say('我見到你隻手喇，唔好再撥呀。');
  }else{
    state.refillAt=Infinity;state.cupMotion={kind:'drop',start:state.now,spills:state.cupFull};
    rememberWorld('cup','水杯跌低，地上濕咗。');
    state.ownerMode='cup-clean';state.ownerRoute=[[-5.85,3.12],[-4.12,3.12],[-4.12,4.0]];
    state.mochiHopUntil=state.now+.75;state.cupMochiPending=false;
    state.ownerSighUntil=state.now+1;sigh();
    say(ownerSeesPlayer()?'栗子！嗰杯真係會跌㗎……':'咦？咩聲？又有水瀉咗？','阿澄',3.6);
  }
}
function updateCupEpisode(dt,t){
  if(!cupEpisode||state.phase!=='play'){cupGuide.visible=false;cupScene.tongue.visible=false;return;}
  const c=cupChapter.state;
  if(state.cupMochiPending&&!state.mochiRoute.length){
    state.cupMochiPending=false;cupChapter.lookAway(t,'mochi',6.2);
    state.mochiMode='cup-toy';state.cupToyUntil=t+6.2;
    say('麻糬，你又想玩呀？','阿澄',2.6);
    tone([[410,600,.13,.035],[590,350,.16,.035]]);
  }
  if(state.ownerMode==='cup-return'&&!state.ownerRoute.length){state.ownerMode='cup-sit';}
  const nearStation=Math.hypot(player.root.position.x-sipStation[0],player.root.position.z-sipStation[1])<.09;
  const event=cupChapter.tick(t,dt,{watched:ownerSeesPlayer(),onTable:state.platform===coffeeTable&&!state.hop,ready:nearStation,cleanupReady:state.ownerMode==='cup-clean'&&!state.ownerRoute.length});
  if(event){
    if(event.type==='glance'){say('覆個訊息先……','阿澄',1.7);tone([[830,720,.08,.012]],'sine');}
    else if(event.type==='sip'){playerRoute=[];state.motion.set(0,0,0);holdFocus('cup-focus');}
    else if(event.type==='caught'){showCupStop();
    }else if(event.type==='retry'){toast('先扮無事。等阿澄望開，再試。',2.6);}
    else if(event.type==='refill'){
      restoreCup();puddle.visible=false;state.ownerMode='cup-return';
      state.ownerRoute=[[-4.12,3.12],[-5.85,3.12],[-5.85,2.65]];
      forgetWorld('cup');toast('阿澄抹好地，換咗杯水。',2.8);
    }else if(event.type==='win'){
      celebrate('偷飲得手！',c.method==='借麻糬追波'?'麻糬追波，阿澄望開，杯水少咗一口。':'趁阿澄望開，栗子偷飲成功。');
      state.cupFull=false;water.scale.x=water.scale.z=.090;
      ui['chapter-method'].textContent=c.method+' · 被發現 '+c.catches+' 次 · 整瀉 '+c.spills+' 次';
      ui['chapter-result'].hidden=false;updateTask();
      say('喵。你嗰杯，果然好飲啲。','栗子',3.8);
      tone([[523,659,.11,.04],[659,784,.12,.04],[880,1047,.27,.04]]);
      state.mochiMode='cup-watch';state.mochiRoute=[];
    }
  }
  // The owner turns towards a visible source; the same sight test decides whether a sip is caught.
  const look=c.stage==='caught'?[player.root.position.x,player.root.position.z]:
    c.attention==='chain'?(state.chain?.point??[-3.35,1.4]):c.attention==='noise'?(state.cupNoise??cupSpot):c.attention==='phone'?[-7.04,2.44]:c.attention==='mochi'?[-3.35,1.1]:cupSpot;
  if(!state.ownerRoute.length&&state.ownerMode!=='cup-guard')rotateToward(owner.root,Math.atan2(look[0]-owner.root.position.x,look[1]-owner.root.position.z),dt*.58);
  cupScene.display.material.emissiveIntensity=c.attention==='phone'?.55:.04;
  cupScene.cloth.visible=state.ownerMode==='cup-clean'&&!state.ownerRoute.length;
  if(cupScene.cloth.visible){owner.body.rotation.x=.32;owner.arms[1].rotation.x=-.9+.18*Math.sin(t*9);}
  const wobble=t-state.cupWobbleAt;
  if(c.stage!=='spilled'&&!state.cupMotion)mug.rotation.z=wobble<.70?Math.sin(wobble*26)*.15*(1-wobble/.70):0;
  for(const [i,drop] of cupScene.droplets.entries()){
    const age=t-state.cupWobbleAt-.3,phase=age/1.05;
    drop.visible=c.stage==='spilled'&&phase>0&&phase<1;
    if(drop.visible){const a=i*2.39;drop.position.set(cupSpot[0]+Math.cos(a)*phase*.48,.06+Math.sin(phase*Math.PI)*(.33+i*.025),cupSpot[1]+.38+Math.sin(a)*phase*.30);}
  }
  if(puddle.visible&&c.stage==='spilled'){const spread=Math.min(1,(t-state.cupWobbleAt)/1.3);puddle.scale.set(.38*spread,.014,.17*spread);}
  owner.root.position.y=T.MathUtils.damp(owner.root.position.y,state.ownerMode==='cup-sit'?.23:0,10,dt);
  const drinking=c.stage==='drinking';
  player.head.position.y=T.MathUtils.damp(player.head.position.y,drinking?.42:player.headHeight,11,dt);
  player.head.rotation.x=drinking?.24+.035*Math.sin(t*18):0;
  player.body.rotation.x=drinking?.12:0;
  if(drinking){
    rotateToward(player.root,Math.atan2(cupSpot[0]-player.root.position.x,cupSpot[1]-player.root.position.z),dt);
    cupScene.tongue.visible=Math.sin(t*20)>.1;
    if(t>=state.cupSipSoundAt){state.cupSipSoundAt=t+.30;tone([[640,420,.045,.012]],'triangle');}
  }else cupScene.tongue.visible=false;
  if(c.stage==='caught')player.head.rotation.y=.24*Math.sin(t*3);
  else player.head.rotation.y=0;
  if(state.mochiMode==='cup-toy'&&t<state.cupToyUntil){
    cupScene.toy.position.x=-3.35+.10*Math.sin(t*7);mochi.paws[1].rotation.x=-.4+.22*Math.sin(t*9);
  }else cupScene.toy.position.x=-3.35;
  if(['cup-watch','cup-toy'].includes(state.mochiMode)&&!state.mochiRoute.length)rotateToward(mochi.root,Math.atan2(player.root.position.x-mochi.root.position.x,player.root.position.z-mochi.root.position.z),dt);
  cupGuide.visible=state.platform===coffeeTable&&c.stage!=='spilled'&&!c.won;
  cupGuide.position.set(cupSpot[0],.606,cupSpot[1]);
  cupGuide.material.color.set(ownerSeesPlayer()?0xd1a16b:0x8faf91);
}
function updateCupHud(){
  if(!cupEpisode)return;
  const c=cupChapter.state,watched=ownerSeesPlayer();
  ui['chapter-panel'].hidden=c.won;
  ui['chapter-panel'].classList.toggle('watched',watched);ui['chapter-panel'].classList.toggle('away',!watched);
  const status=c.stage==='spilled'?'阿澄：抹緊瀉出嚟嘅水':c.stage==='caught'?'阿澄：正在制止及看守':watched?'阿澄：望得到你':c.attention==='phone'?'阿澄：望緊手機':c.attention==='chain'?'阿澄：睇緊麻糬追波':c.attention==='mochi'?'阿澄：望緊麻糬':c.attention==='noise'?'阿澄：望緊叫聲方向':'阿澄：留意緊茶几';
  const messages={idle:'跳上茶几，留意阿澄望邊。你亦可以行近麻糬，邀佢玩。',approaching:'栗子行緊去杯邊。可以按 E 或「收口扮乖」停低。',drinking:watched?'阿澄望返嚟喇！快啲收口！':'舔、舔……繼續偷飲緊。',caught:'阿澄正看守杯水。先退開，或者用叫聲、麻糬引開注意。',spilled:'杯跌咗，水瀉咗。等阿澄換返杯水，再試。',won:'得手！杯水果然特別好飲。'};
  if(ui['chapter-status'].textContent!==status)ui['chapter-status'].textContent=status;
  if(ui['chapter-note'].textContent!==messages[c.stage])ui['chapter-note'].textContent=messages[c.stage];
  ui['seat-progress'].hidden=c.stage==='spilled'||c.won;
  ui['seat-fill'].style.width=(c.progress*100)+'%';
  ui['cup-stop'].hidden=!['approaching','drinking'].includes(c.stage);
}

const seatGuide=ring(0xe6b14c,.55);
seatGuide.material.opacity=.55;
const episodeAnchor=new T.Vector3();
const occlusionRay=new T.Raycaster();
const occlusionDirection=new T.Vector3(),catLookPoint=new T.Vector3();
const swivelProp=roomObjects.find(prop=>prop.id==='swivel');
const chairBack=swivelProp.node.children.filter(node=>node.isMesh&&node.position.y>.94);
const fadeMeshes=[];
const occludingNodes=[owner.root,...cameraObstacles,...chairBack,...roomDoors.map(prop=>prop.node)];
for(const node of occludingNodes)node.traverse(child=>{
  if(!child.isMesh)return;
  child.material=child.material.clone();
  fadeMeshes.push({mesh:child,opacity:1});
});
function updateOccluders(dt){
  const camera=activeCamera();
  player.head.getWorldPosition(catLookPoint);
  occlusionDirection.subVectors(catLookPoint,camera.position);
  occlusionRay.set(camera.position,occlusionDirection.clone().normalize());
  occlusionRay.far=Math.max(0,occlusionDirection.length()-.16);
  const blocking=new Set(occlusionRay.intersectObjects(occludingNodes,true).map(hit=>hit.object));
  catLookPoint.copy(player.root.position);catLookPoint.y+=.36;
  occlusionDirection.subVectors(catLookPoint,camera.position);occlusionRay.set(camera.position,occlusionDirection.clone().normalize());
  occlusionRay.far=Math.max(0,occlusionDirection.length()-.16);
  for(const hit of occlusionRay.intersectObjects(occludingNodes,true))blocking.add(hit.object);
  const ownerBlocking=[...blocking].some(mesh=>{let p=mesh;while(p){if(p===owner.root)return true;p=p.parent;}return false;});
  for(const item of fadeMeshes){
    const isOwner=(()=>{let p=item.mesh;while(p){if(p===owner.root)return true;p=p.parent;}return false;})();
    const faded=state.phase==='play'&&(showcase||closeView||focusMix>.3)&&(isOwner?ownerBlocking:blocking.has(item.mesh));
    const target=faded?.24:1;
    item.opacity+=(target-item.opacity)*(1-Math.exp(-dt*12));
    if(Math.abs(item.opacity-target)<.005)item.opacity=target;
    item.mesh.material.opacity=item.opacity;item.mesh.material.transparent=item.opacity<.995;
    item.mesh.material.depthWrite=item.opacity>.995;
  }
}
function episodeOffer(kind){
  if(!chairEpisode||state.phase!=='play')return false;
  const event=chairChapter.offer(kind,state.now);
  if(!event)return false;
  state.turnUntil=state.now+2;
  say(event.line,'阿澄',3.2);
  if(event.type==='rise'){
    state.ownerMode='chapter-rise';state.ownerRoute=[];
    if(kind!=='mochi'){state.mochiMode='chapter-watch';state.mochiRoute=[[-5.75,-1.15]];}
    state.mochiHopUntil=kind==='loud'?state.now+.60:0;
    state.focusHoldUntil=Math.min(state.focusHoldUntil,state.now+.9);
    state.ownerReactUntil=state.now+1;
    updateTask();
  }
  return true;
}
function updateChairEpisode(){
  const chapter=chairChapter.state;
  const event=chairChapter.tick(state.now,{
    away:distance(owner,spots.seat)>1.12,arrived:!state.ownerRoute.length,
    onChair:state.platform===chair,jumping:!!state.hop
  });
  if(event){
    if(event.type==='rise'){
      state.ownerMode='chapter-rise';state.turnUntil=state.now+1;say(event.line,'阿澄',3);
    }else if(event.type==='depart'){
      state.ownerMode='chapter-away';state.ownerRoute=chapter.method==='mochi'&&state.chain?.source==='pencils'?[[-3.7,-2.65],[-3.55,-1.75]]:[[-5.90,-2.65],[-6.45,-1.75]];
    }else if(event.type==='return'){
      state.ownerMode='chapter-return';state.ownerRoute=[[-5.90,-2.65],spots.desk];
      say('玩具搵唔到，做埋啲嘢先。');
    }else if(event.type==='retry'){
      state.ownerMode='desk';state.ownerNext=Infinity;
      toast('阿澄坐返低喇。再試一次，或者換個方法。',3.5);
      state.mochiMode='idle';state.nextIdle=state.now+2;
    }else if(event.type==='settle'){
      playerRoute=[];state.motion.set(0,0,0);state.chapterCameraAt=state.now;
      state.ownerMode='chapter-watch';state.ownerRoute=[[-5.95,-1.75]];
      toast('張凳仲暖㗎……坐穩先。',2.3);
      state.focusHoldUntil=0;
    }else if(event.type==='look'){
      state.ownerMode='chapter-watch';state.ownerSighUntil=state.now+1.15;sigh();
      say('……原來你由頭到尾都係想要我張凳。','阿澄',4.5);
      state.mochiRoute=[];state.mochiMode='chapter-watch';
    }else if(event.type==='escaped'){
      state.ownerMode='chapter-search';state.ownerRoute=[];
      toast('未坐穩就跳走咗。張凳仲空住。');
    }else if(event.type==='win'){
      ui['chapter-result'].hidden=false;
      rememberWorld('chair','栗子霸住暖凳，阿澄只好企喺旁邊。');
      ui['chapter-method'].textContent='今次用咗：'+chairMethods[chapter.method].name;
      celebrate('暖凳到手！',chapter.method==='mochi'?'阿澄去睇麻糬，栗子趁機霸位。':'阿澄行開，栗子成功坐穩暖凳。');
      tone([[523,659,.12,.045],[659,784,.12,.045],[784,1047,.30,.05]]);
      updateTask();
    }
  }
  if(chapter.stage==='waiting'&&state.ownerMode==='chapter-away')state.ownerMode='chapter-search';
  if(chapter.stage==='working')updateMochiRoutine();
  if(state.mochiMode==='chapter-watch'&&!state.mochiRoute.length){
    rotateToward(mochi.root,Math.atan2(player.root.position.x-mochi.root.position.x,player.root.position.z-mochi.root.position.z),.03);
  }
}
function updateEpisodePose(dt,t){
  const sitting=chairEpisode&&state.platform===chair&&!state.hop&&['settling','won'].includes(chairChapter.state.stage);
  state.seatBlend+=((sitting?1:0)-state.seatBlend)*(1-Math.exp(-dt*6));
  if(chairEpisode)player.setSitting(state.seatBlend);
  if(sitting){
    rotateToward(player.root,.55,dt);
    player.body.position.y=-.018*state.seatBlend;
    for(const paw of player.paws)paw.rotation.x*=Math.exp(-dt*12);
    for(const shin of player.shins)shin.rotation.x*=Math.exp(-dt*12);
  }
  if(sitting&&chairChapter.state.stage==='won'){player.head.rotation.x=.12;for(const eye of player.eyes)eye.scale.y=.40+.08*Math.sin(t);player.tail.rotation.y=.06*Math.sin(t);}
  if(chairEpisode&&chairChapter.state.stage==='working'&&chairChapter.state.breakAt-t<4){owner.arms[0].rotation.x=-1.8;owner.head.rotation.z=.07;}
  const landing=t-state.landedAt;
  if(!state.hop&&landing<.20)player.body.scale.y=1-.055*Math.sin(landing/.20*Math.PI);
  else if(!state.hop)player.body.scale.y=1;
}
function updateEpisodeHud(){
  const chapter=chairChapter.state;
  seatGuide.visible=chairEpisode&&state.phase==='play'&&chairIsFree()&&!state.hop;
  seatGuide.position.set(spots.seat[0],chair.height+.025,spots.seat[1]);
  seatGuide.scale.setScalar(1+.035*Math.sin(state.now*3));
  ui['seat-hint'].hidden=!seatGuide.visible;
  if(seatGuide.visible){
    episodeAnchor.set(spots.seat[0],chair.height+1.04,spots.seat[1]).project(activeCamera());
    ui['seat-hint'].style.left=T.MathUtils.clamp((episodeAnchor.x+1)*50,12,88)+'%';
    ui['seat-hint'].style.top=T.MathUtils.clamp((1-episodeAnchor.y)*50,15,80)+'%';
    ui['seat-hint'].textContent=jumpTarget(chair)?'空凳 · 可以跳上去':'空凳 · 行近少少';
  }
  if(!chairEpisode)return;
  ui['chapter-panel'].hidden=chapter.stage==='won';
  const messages={working:['阿澄：忙住工作','栗子想要張暖凳。點樣令佢行開，由你決定。'],rising:['阿澄：準備起身','等佢離開張凳，再搵位跳上去。'],leaving:['阿澄：行開咗','張轉椅就喺書桌前。'],waiting:['阿澄：暫時行開','張凳仲暖住，趁而家。'],returning:['阿澄：準備坐返低','今次未趕得切？可以繼續試。'],settling:['栗子：坐穩先……','睇吓阿澄幾時發現你嘅真正目的。'],won:['栗子：霸位成功','可以留低玩，或者重試另一個方法。']};
  const [status,line]=messages[chapter.stage];
  const waitLine=chapter.stage==='working'&&chapter.breakAt-state.now<7?'阿澄開始伸懶腰，似乎就快休息。':line;
  if(ui['chapter-status'].textContent!==status)ui['chapter-status'].textContent=status;
  if(ui['chapter-note'].textContent!==waitLine)ui['chapter-note'].textContent=waitLine;
  ui['seat-progress'].hidden=chapter.stage!=='settling';
  ui['seat-fill'].style.width=chapter.stage==='settling'?Math.min(100,(state.now-chapter.holdAt)/3.5*100)+'%':'0%';
}

const noiseRing=ring(0xd3b16c,.20);noiseRing.visible=false;
const thoughtPoint=new T.Vector3();
function chainBeat(line){
  if(state.chainBeats.at(-1)===line)return;
  state.chainBeats.push(line);state.chainBeats=state.chainBeats.slice(-3);
  ui['chain-note'].textContent='剛才發生：'+state.chainBeats.join(' → ');ui['chain-note'].hidden=false;
}
function signalMochi(text,seconds=2){state.chainGlyph={text,until:state.now+seconds};}
function celebrate(label,line){
  state.successUntil=state.now+2.2;ui['success-flash'].textContent='✧ '+label+' ✧';ui['success-flash'].hidden=false;
  chainBeat(line);
}
function startReactionChain(prop){
  if(blameEpisode||state.phase!=='play'||state.now<state.chainCooldown||state.chain&&state.chain.stage!=='done')return false;
  if(chairEpisode&&chairChapter.state.stage!=='working'||cupEpisode&&['caught','spilled','won'].includes(cupChapter.state.stage))return false;
  const point=cupEpisode?[-3.35,1.4]:prop.id==='shelf-book'?[-6.72,-2.35]:prop.id==='pencils'?[-3.18,-2.5]:[prop.node?.position.x??prop.x,prop.z+.35];
  if(distance(mochi,[prop.x,prop.z])>5.5)return false;
  const route=floorRoute(mochi.root.position.x,mochi.root.position.z,...point);
  if(!route.length){signalMochi('？',1);return false;}
  const delay=state.mochiMood==='sleepy'?.95:.35;
  state.chain={stage:'heard',source:prop.id,point,sourcePoint:[prop.x,prop.z],height:prop.contactY,started:state.now,readyAt:state.now+delay,route,until:state.now+12};
  state.chainCooldown=state.now+3.5;state.mochiRoute=[];state.mochiMode='chain-hear';
  if(chairEpisode)chairChapter.state.breakAt=Math.max(chairChapter.state.breakAt,state.now+16);
  if(!showcase&&state.ownerMode==='desk')state.ownerNext=Math.max(state.ownerNext,state.now+12);
  signalMochi(state.mochiMood==='sleepy'?'嗯？':'？',delay+1.5);
  chainBeat(prop.id==='cup-ball'?'玩具波響咗。':prop.id==='pencils'?'鉛筆碰撞，傳出細聲。':'物件郁咗，麻糬聽到聲。');
  return true;
}
function finishReactionChain(line){
  const c=state.chain;if(!c)return;c.stage='done';
  if(cupEpisode&&state.ownerMode==='cup-investigate'){state.ownerMode='cup-return';state.ownerRoute=[[-3.7,3.06],[-5.85,3.06],[-5.85,2.65]];}
  if(state.mochiMode.startsWith('chain-')){state.mochiMode='idle';state.mochiRoute=[];state.nextIdle=state.now+3;}
  if(line)chainBeat(line);
}
function updateReactionChain(dt,t){
  const c=state.chain;
  noiseRing.visible=!!c&&t-c.started<1.25;
  if(noiseRing.visible){
    const age=t-c.started;noiseRing.position.set(c.sourcePoint[0],c.height+.035,c.sourcePoint[1]);
    noiseRing.scale.setScalar(1+age*2);noiseRing.material.opacity=.7*(1-age/1.25);
  }
  if(c&&c.stage!=='done'){
    if(t>c.until){finishReactionChain('麻糬睇完，暫時走開。');}
    else if(c.stage==='heard'){
      rotateToward(mochi.root,Math.atan2(c.sourcePoint[0]-mochi.root.position.x,c.sourcePoint[1]-mochi.root.position.z),dt);
      if(t>=c.readyAt){c.stage='approaching';state.mochiMode='chain-walk';state.mochiRoute=c.route.map(point=>point.slice());signalMochi('♪',2);chainBeat('麻糬循聲走近。');}
    }else if(c.stage==='approaching'&&!state.mochiRoute.length){
      c.stage='playing';c.point=[mochi.root.position.x,mochi.root.position.z];c.arrivedAt=t;c.until=t+6;
      state.mochiMode='chain-play';signalMochi('喵？',2);chainBeat('麻糬開始查看，輕輕叫咗一聲。');
    }else if(c.stage==='playing'){
      rotateToward(mochi.root,Math.atan2(c.sourcePoint[0]-mochi.root.position.x,c.sourcePoint[1]-mochi.root.position.z),dt);
      mochi.paws[1].rotation.x=-.48+.22*Math.sin(t*8);mochi.tail.rotation.y=.24*Math.sin(t*3.5);
      // The owner first hears a nearby cat, turns, then reacts only after actually seeing Mochi.
      if(cupEpisode&&!c.ownerDeparted&&state.ownerMode==='cup-sit'&&t-c.arrivedAt>.55){
        c.ownerDeparted=true;c.until=t+8;state.ownerMode='cup-investigate';state.ownerRoute=[[-5.85,3.06],[-3.7,3.06],[-3.7,2.5]];
        chainBeat('阿澄聽到麻糬，起身繞過梳化查看。');
      }
      const receptive=chairEpisode?chairChapter.state.stage==='working':cupEpisode?state.ownerMode==='cup-investigate'&&!state.ownerRoute.length:state.ownerMode==='desk';
      if(receptive&&t-c.arrivedAt>.55&&distance(owner,c.point)<3.8){
        state.ownerCuePoint=c.point;state.ownerCueUntil=t+.45;
        rotateToward(owner.root,Math.atan2(c.point[0]-owner.root.position.x,c.point[1]-owner.root.position.z),dt);
        if(ownerSeesActor(mochi)){
          if(chairEpisode){
            if(episodeOffer('mochi')){c.stage='opportunity';c.until=t+24;chainBeat('阿澄見到麻糬，起身行開。');}
          }else if(cupEpisode){
            if(cupChapter.lookAway(t,'chain',11.5)){c.stage='opportunity';c.until=t+11.5;chainBeat('阿澄望住麻糬追波，暫時冇望杯水。');say('麻糬，個波又走咗去邊呀？','阿澄',2.6);}
          }else{
            c.stage='opportunity';c.until=t+4.5;state.ownerCueUntil=c.until;chainBeat('阿澄望住麻糬，工作停咗一陣。');say('麻糬，玩細聲啲呀。','阿澄',2.8);
          }
        }
      }
    }else if(c.stage==='opportunity'){
      if(chairEpisode&&['returning','working'].includes(chairChapter.state.stage)||cupEpisode&&['caught','spilled'].includes(cupChapter.state.stage))finishReactionChain();
      else if(chairEpisode&&chairChapter.state.stage==='won'||cupEpisode&&cupChapter.state.won)finishReactionChain();
      else if(state.mochiMode==='chain-play'){mochi.paws[1].rotation.x=-.38+.18*Math.sin(t*7);}
    }
  }
  const glyph=state.chainGlyph;
  ui['mochi-thought'].hidden=!glyph||t>=glyph.until||state.phase!=='play';
  if(!ui['mochi-thought'].hidden){
    mochi.head.getWorldPosition(thoughtPoint);thoughtPoint.y+=.50;activeCamera().updateMatrixWorld();thoughtPoint.project(activeCamera());
    ui['mochi-thought'].textContent=glyph.text;ui['mochi-thought'].style.left=T.MathUtils.clamp((thoughtPoint.x+1)*50,8,92)+'%';ui['mochi-thought'].style.top=T.MathUtils.clamp((1-thoughtPoint.y)*50,10,88)+'%';
  }
  ui['success-flash'].hidden=t>=state.successUntil||state.phase!=='play';
  if(t<state.successUntil&&!state.hop){player.head.rotation.z=.07*Math.sin((state.successUntil-t)*4);for(const eye of player.eyes)eye.scale.y=.35;}
}

const ballGoalRing=ring(0xe2b65b,ballGoal.radius);ballGoalRing.visible=false;
let campaignMenuSignature='';
const caseCaptions=[
  '供詞：先摸摸我，工作遲啲做。','供詞：個碗響咗，你聽到未？','供詞：凳暖咗，就係我嘅。','供詞：呢杯水比較有故事。',
  '供詞：杯係自己行落去。','供詞：我幫盆栽剪頭髮。','供詞：一爪成名。',
  '供詞：我只係檢查水壓。','供詞：份文件需要喵文。','供詞：有啲砂想出去旅行。','供詞：紙箱可以做證人。',
  '供詞：坐多三秒，張凳就係我嘅。','供詞：飲完都要識得走。','供詞：麻糬應該唔介意做證人。'
];
const caseAsides=['先扮乖','開飯未呀','凳係我嘅','就飲一啖','杯自己跌','葉會郁呀','一爪入圈','水聲好聽','喵文機密','砂識飛喵','我喺紙箱','霸住唔走','飲完開溜','麻糬做證'];
const recordPhoto=index=>index===1?'/cat-house-mischief/assets/records/food.webp':'/cat-house-mischief/assets/records/'+String(index===0?1:index).padStart(2,'0')+'.webp'+(index===2?'?v=2':'');
const secretCases=[
  {id:'cup',title:'第三次，真係嬲喇！',line:'阿澄拿住抹布，麻糬睇到呆咗；栗子仲係一臉無辜。',description:'栗子連續三次推跌水杯。阿澄邊抹地邊忍唔住發脾氣；麻糬目擊全程。',quote:'「我真係只係掂咗一下……三次。」',photo:'/cat-house-mischief/assets/records/secret-cup.webp',alt:'栗子第三次推跌水杯，阿澄拿著抹布生氣，麻糬在旁看呆了'},
  {id:'orange',title:'橙色通緝令',line:'四個橙全部落地，阿澄當場責備，栗子繼續扮無辜。',description:'栗子把果盤的四個橙逐一撥落地。阿澄發現後忍唔住鬧牠，仲要自己逐個執返。',quote:'「佢哋自己碌落去㗎……」',photo:'/cat-house-mischief/assets/records/secret-orange.webp',alt:'四個橙散在廚房地上；阿澄指著橙責備一臉無辜的栗子，麻糬在旁觀看'},
  {id:'fridge',title:'最高處的求救聲',line:'栗子上咗雪櫃落唔返，大聲喵叫，阿澄趕來抱牠落地。',description:'栗子由廚房枱跳到細小落腳位，再爬上雪櫃。上到去先知落唔返，只好大聲叫阿澄救。',quote:'「我係上嚟巡邏，唔係驚高喵！」',photo:'/cat-house-mischief/assets/records/secret-fridge.webp',alt:'栗子困在雪櫃頂大聲叫，阿澄在下面伸手準備接牠，麻糬抬頭看'},
  {id:'bath',title:'廁所門外的合唱',line:'阿澄入廁所關門，栗子喺門外大叫，終於等到佢無奈開門。',description:'阿澄才剛關門，栗子就在外面大聲喵。阿澄嘆一口氣，開門讓栗子跟入去。',quote:'「我入廁所都要有你陪，係咪呀？」',photo:'/cat-house-mischief/assets/records/secret-bath.webp',alt:'栗子在浴室門外大叫，阿澄無奈開門讓牠進去'},
  {id:'cozy',title:'今日乖得有啲過份',line:'栗子和麻糬各自伏在貓床、紙箱，阿澄剛好經過，幸福得不敢作聲。',description:'兩隻貓剛好同時伏低，一隻在貓床，一隻在紙箱。阿澄走出來見到這一幕，靜靜笑了。',quote:'「你哋今日咁乖……真係好幸福。」',photo:'/cat-house-mischief/assets/records/secret-cozy.webp',alt:'栗子伏在貓床、麻糬伏在紙箱，阿澄在旁溫柔地看著牠們'},
  {id:'hide',title:'梳化背後的捉迷藏',line:'栗子在梳化旁輕聲喵，阿澄循聲找來，原來佢哋玩緊捉迷藏。',description:'栗子躲在梳化與盆栽之間，輕聲叫了一聲。阿澄走近找到牠，笑住認輸。',quote:'「搵到你喇！下次到我匿，好唔好？」',photo:'/cat-house-mischief/assets/records/secret-hide.webp',alt:'栗子躲在梳化後方，阿澄蹲下找到牠，麻糬在旁觀看'}
];
const albumCases=[...levels,...secretCases];
const secretIsUnlocked=id=>id==='cup'?secretCupUnlocked:id==='orange'?secretOrangeUnlocked:id==='fridge'?secretFridgeUnlocked:id==='bath'?secretBathUnlocked:id==='cozy'?secretCozyUnlocked:secretHideUnlocked;
const normalIsUnlocked=index=>index<unlockedLevel&&(index!==1||foodCompleted);
const collectedCount=()=>unlockedLevel-(unlockedLevel>1&&!foodCompleted?1:0)+secretCases.filter(record=>secretIsUnlocked(record.id)).length;
function updateAlbumCount(){ui['album-count'].textContent=collectedCount()+' / '+albumCases.length+' 張';}
function renderAlbum(selected=Math.max(0,unlockedLevel-1)){
  updateAlbumCount();
  ui['album-summary'].textContent='已收藏 '+collectedCount()+' / '+albumCases.length+' 張';
  ui['album-grid'].replaceChildren(...albumCases.map((level,index)=>{
    const bonus=index>=levels.length,unlocked=bonus?secretIsUnlocked(level.id):normalIsUnlocked(index);
    const slot=document.createElement(unlocked?'button':'div');
    slot.className='album-slot'+(bonus?' bonus':'')+(unlocked?'':' locked')+(unlocked&&index===selected?' selected':'');
    if(unlocked){slot.type='button';slot.setAttribute('aria-label',bonus?'放大秘密相片：'+level.title:'放大第 '+(index+1)+' 關：'+level.title);slot.addEventListener('click',()=>renderAlbum(index));}
    const number=document.createElement('b');number.textContent=bonus?'✦ 秘密':String(index+1).padStart(2,'0');
    if(unlocked){const img=document.createElement('img');img.src=bonus?level.photo:recordPhoto(index);img.alt='';img.loading='lazy';slot.append(img);}
    else{const lock=document.createElement('span');lock.className='album-lock';lock.textContent='？';slot.append(lock);}
    const title=document.createElement('small');title.textContent=unlocked?level.title:bonus?'神秘案件':'未揭曉';
    slot.append(number,title);return slot;
  }));
  if(collectedCount()>0){
    const requested=albumCases[selected];
    const index=requested&&(selected>=levels.length?secretIsUnlocked(requested.id):normalIsUnlocked(selected))?selected:normalIsUnlocked(Math.max(0,unlockedLevel-1))?Math.max(0,unlockedLevel-1):normalIsUnlocked(0)?0:levels.length+secretCases.findIndex(record=>secretIsUnlocked(record.id));
    const level=albumCases[index],bonus=index>=levels.length;
    showRecordImage(ui['album-large'],bonus?level.photo:recordPhoto(index),bonus?'秘密任務相片：'+level.title:'第 '+(index+1)+' 關紀錄相片：'+level.title);
    ui['album-large'].hidden=false;ui['album-empty'].hidden=true;
    ui['album-caption'].textContent=(bonus?'秘密證物':'證物 '+String(index+1).padStart(2,'0'))+' · '+level.title+'　｜　'+level.line;
  }else{
    ui['album-large'].removeAttribute('src');ui['album-large'].hidden=true;ui['album-empty'].hidden=false;ui['album-caption'].textContent='尚未收集紀錄相片';
  }
}
function openAlbum(selected){
  if(showcase||ui.album.open)return;
  albumReturnFocus=document.activeElement;
  renderAlbum(Number.isInteger(selected)?selected:state.phase==='finish'?state.level:Math.max(0,unlockedLevel-1));
  keys.clear();albumOpen=true;ui.album.showModal();ui['album-close'].focus();
}
const caseArt=[-1,-3,6,7,8,-2,0,1,2,3,4,6,7,5];
const singleCaseArt={
  [-1]:'petting-memo.png',
  [-2]:'plant-doodle.png',
  [-3]:'food-bowl-memo.webp'
};
function setCaseArt(element,index){
  const art=caseArt[index]??5;
  element.setAttribute('data-art-type',art<0?'single':'atlas');
  if(art<0){element.style.backgroundImage=`url('/cat-house-mischief/assets/${singleCaseArt[art]??singleCaseArt[-2]}')`;element.style.backgroundSize='contain';element.style.backgroundPosition='center';}
  else{element.style.backgroundImage="url('/cat-house-mischief/assets/case-doodles.png')";element.style.backgroundSize=art===7?'350% 300%':'300% 300%';element.style.backgroundPosition=(art%3)*50+'% '+Math.floor(art/3)*50+'%';}
}
function renderCampaignMenu(){
  updateAlbumCount();
  ui['campaign-menu'].hidden=showcase;
  if(showcase)return;
  const signature=state.level+':'+unlockedLevel+':'+state.cleared+':'+foodCompleted;
  if(signature===campaignMenuSignature)return;campaignMenuSignature=signature;
  ui['campaign-unlocked'].textContent='已開放 '+Math.min(levels.length,unlockedLevel+1)+' / '+levels.length;
  ui['campaign-levels'].replaceChildren(...levels.map((level,index)=>{
    const button=document.createElement('button');button.type='button';button.disabled=index>unlockedLevel;
    const number=document.createElement('span');number.className='case-number';number.textContent=normalIsUnlocked(index)?'✓':index>unlockedLevel?'⌁':String(index+1).padStart(2,'0');
    const title=document.createElement('strong');title.textContent=level.title;
    const art=document.createElement('span');art.className='case-illustration';art.setAttribute('aria-hidden','true');setCaseArt(art,index);
    const note=document.createElement('small');note.textContent=caseCaptions[index];
    const status=document.createElement('span');status.className='case-status';status.textContent=index>unlockedLevel?'未解鎖':normalIsUnlocked(index)||index===state.level&&state.cleared?'已破案':'進行中';
    button.append(number,art,title,note,status);
    button.setAttribute('aria-label','第 '+(index+1)+' 關：'+level.title);button.setAttribute('data-done',String(normalIsUnlocked(index)));
    if(index===state.level)button.setAttribute('aria-current','step');
    button.addEventListener('click',()=>selectCampaignLevel(index));return button;
  }));
}
function selectCampaignLevel(index){
  if(showcase||!Number.isInteger(index)||index<0||index>=levels.length||index>unlockedLevel)return false;
  setLevel(index);reset();ui['campaign-menu'].open=false;setMobileNotebook(false);ui.world.focus({preventScroll:true});return true;
}
function aimBall(prop){
  const from=prop.node.position,dx=from.x-player.root.position.x,dz=from.z-player.root.position.z,length=Math.hypot(dx,dz)||1;
  let target=from.clone();
  for(const fraction of [.2,.4,.6,.8,1]){
    const x=from.x+dx/length*fraction,z=from.z+dz/length*fraction;
    if(!fits(x,z)||x<bounds.minX+.14||x>bounds.maxX-.14||z<bounds.minZ+.14||z>bounds.maxZ-.14)break;
    target.x=x;target.z=z;
  }
  prop.pushTarget=target;
  if(!showcase)state.mission.ballTouched=true;
}
function campaignCaught(kind){
  if(showcase||!state.mission)return;
  const m=state.mission,event=levels[state.level]?.event;
  if(event==='keyboard-secret'&&kind==='keyboard'){m.keys=0;m.note='打字被發現，累計歸零。等主人行開再試。';}
  if(event==='tap-secret'&&kind==='water'&&m.tap){m.tap.failed=true;m.note='玩水被發現。關返水，換個時機再試。';}
  if(event==='litter-escape'&&kind==='litter'){m.sandAt=null;m.note='撥砂被發現，換個時機再試。';}
}
function recordCampaignProp(prop){
  if(showcase||state.cleared)return;
  const m=state.mission,event=levels[state.level]?.event,watched=ownerSeesPlayer();
  if(event==='tap-secret'&&prop.kind==='water'){
    if(prop.on){m.tap={id:prop.id,at:state.now,failed:watched};m.note=watched?'玩水被發現。關返水再試。':'水已開，玩一秒後記得關返。';}
    else if(m.tap?.id===prop.id){
      if(!m.tap.failed&&!watched&&state.now-m.tap.at>=1)complete('tap-secret');
      else m.note=m.tap.failed||watched?'被發現咗，要重新開水再試。':'太快關水，未玩夠一秒。重新開水再試。';
      m.tap=null;
    }
  }
  if(event==='litter-escape'&&prop.kind==='dig'){
    m.sandAt=watched?null:state.now;m.note=watched?'主人見到，今次唔算。':'貓砂灑出盆外，趁未被發現離開廁所。';
  }
  if(event==='mirror-hide'&&prop.kind==='mirror'&&!watched){m.mirror=true;m.hideAt=null;m.note='爪印留低咗。去客廳紙箱伏好。';}
}
function updateCampaign(){
  const active=!showcase&&state.phase==='play'&&!state.cleared,event=levels[state.level]?.event,m=state.mission;
  ballGoalRing.visible=active&&event==='ball-goal';ballGoalRing.position.set(ballGoal.x,.045,ballGoal.z);ballGoalRing.scale.setScalar(1+.03*Math.sin(state.now*3));
  if(showcase)return;
  ui['campaign-tip'].textContent=levels[state.level]?.hint??levels.length+' 關已完成！可以自由探索，亦可從列表重玩。';
  if(active){
    if(event==='ball-goal'&&m.ballTouched){
      const ball=roomObjects.find(prop=>prop.id==='ball');
      if(state.now-ball.started>1.1&&Math.hypot(ball.node.position.x-ballGoal.x,ball.node.position.z-ballGoal.z)<=ballGoal.radius)complete(event);
    }else if(event==='tap-secret'&&m.tap){
      const prop=roomObjects.find(prop=>prop.id===m.tap.id);
      if(prop?.on&&distance(player,[prop.x,prop.z])<1.2&&ownerSeesPlayer())campaignCaught('water');
    }else if(event==='litter-escape'&&m.sandAt!==null){
      if(state.now-m.sandAt<1.1&&ownerSeesPlayer())campaignCaught('litter');
      else if(state.now-m.sandAt>=1.1){
        const {x,z}=player.root.position;
        if((z>-.45||x<-2.3||x>2.5)&&!ownerSeesPlayer())complete(event);
      }
    }else if(event==='mirror-hide'&&m.mirror){
      const mirror=roomObjects.find(prop=>prop.id==='mirror');
      if(!mirror.marked){m.mirror=false;m.hideAt=null;m.note='爪印被抹走咗。再搵個時機留低爪印。';}
      else if(state.restSpot?.settled&&state.restSpot.prop.id==='box'&&!ownerSeesPlayer()){
        m.hideAt??=state.now;const elapsed=state.now-m.hideAt;m.note='紙箱內躲好：'+Math.min(3,Math.floor(elapsed))+' / 3 秒';if(elapsed>=3)complete(event);
      }else m.hideAt=null;
    }else if(event==='seat-stay'){
      if(state.platform===chair&&!state.hop&&m.seatAt!==null){
        const seconds=state.now-m.seatAt;
        m.note='坐穩轉椅：'+Math.min(3,Math.floor(seconds))+' / 3 秒';
        if(seconds>=3)complete(event);
      }else if(m.seatAt!==null){m.seatAt=null;m.note='離開咗凳，等機會再霸位。';}
    }else if(event==='drink-escape'&&m.drunkAt!==null){
      if((state.platform===coffeeTable||state.hop)&&ownerSeesPlayer()){m.drunkAt=null;m.note='阿澄見到你偷飲，今次唔算。換個時機再試。';}
      else if(state.platform!==coffeeTable&&!state.hop&&distance(player,cupSpot)>1.0)complete(event);
    }else if(event==='frame-blame'&&m.frameAt!==null){
      if(!portrait.on){m.frameAt=null;m.inspectAt=null;m.note='掛畫已被扶正，要重新出手。';}
      else if(state.restSpot?.settled&&state.restSpot.prop.id==='box'&&!ownerSeesPlayer()&&
        state.mochiMode==='alibi'&&!state.mochiRoute.length&&distance(mochi,[portrait.x,portrait.z])<3.5){
        if(m.inspectAt===null){m.inspectAt=state.now;m.note='栗子藏好咗。等阿澄發現掛畫同麻糬……';}
        if(state.ownerMode==='desk'&&state.now-m.inspectAt>1.2){
          rotateToward(owner.root,Math.atan2(mochi.root.position.x-owner.root.position.x,mochi.root.position.z-owner.root.position.z),.16);
          if(ownerSeesActor(mochi)){say('幅畫點解歪咗？麻糬……係你呀？','阿澄',3);complete(event);}
        }
      }else m.inspectAt=null;
    }
  }
  ui['campaign-progress'].textContent=state.cleared?'✓ 任務完成':m.note;
}

function stopCupAttempt(){
  if(cupEpisode){const event=cupChapter.caught(state.now);if(event)showCupStop();return;}
  state.cupMotion=null;player.head.position.y=player.headHeight;state.lastFailure='阿澄當場制止咗偷飲。先退開，等佢望開或分散注意。';
  showCupStop();
}
function showCupStop(){
  playerRoute=[];state.motion.set(0,0,0);state.actionBeat=null;state.gesture=null;
  state.ownerReactUntil=state.now+1.5;state.ownerSighUntil=state.now+.7;
  state.lastFailure='阿澄制止咗動作，未完成嘅偷飲進度已清除。先退開或引開注意。';
  if(!state.cupGuard){
    const saved=state.guardReturn?.saved??{mode:state.ownerMode,route:state.ownerRoute.map(point=>point.slice()),position:owner.root.position.clone(),started:state.now};
    state.guardReturn=null;state.cupGuard={saved,minimum:state.now+1.5,until:state.now+6};
    state.ownerMode='cup-guard';
    state.ownerRoute=cupEpisode?[[-5.85,3.06],[-3.65,3.06],[-3.65,4.05]]:floorRoute(owner.root.position.x,owner.root.position.z,-3.65,4.05);
    say('栗子，唔好掂我隻杯！退開少少。','阿澄',3.5);sigh();
    chainBeat('阿澄打斷偷飲，行近看守杯水。');
  }
}
function releaseCupGuard(){
  const guard=state.cupGuard;if(!guard)return;
  state.cupGuard=null;state.guardReturn={saved:guard.saved};state.ownerMode='guard-return';
  state.ownerRoute=cupEpisode?[[-3.65,3.06],[-5.85,3.06],[guard.saved.position.x,guard.saved.position.z]]:floorRoute(owner.root.position.x,owner.root.position.z,guard.saved.position.x,guard.saved.position.z);
  state.ownerNext=state.now+8;
}
function updateCupGuard(dt,t){
  if(state.guardReturn&&state.ownerMode==='guard-return'&&!state.ownerRoute.length){
    const saved=state.guardReturn.saved;state.guardReturn=null;state.ownerMode=saved.mode;state.ownerRoute=saved.route;
    if(state.ownerRoutine&&Number.isFinite(state.ownerRoutine.leaveAt))state.ownerRoutine.leaveAt+=t-saved.started;
  }
  const guard=state.cupGuard;if(!guard)return;
  if(cupEpisode&&cupChapter.state.stage!=='caught'){releaseCupGuard();return;}
  if(!cupEpisode){
    if(ownerSeesPlayer()&&state.platform===coffeeTable)guard.until=Math.max(guard.until,t+1.5);
    if(t>=guard.until){releaseCupGuard();return;}
  }
  if(!state.ownerRoute.length){
    rotateToward(owner.root,Math.atan2(player.root.position.x-owner.root.position.x,player.root.position.z-owner.root.position.z),dt);
    owner.arms[0].rotation.x=-1.0;owner.arms[0].rotation.z=-.4;
  }
}
function blockWitnessedAction(action){
  if(chairEpisode||blameEpisode)return false;
  if(action.kind==='mirror-look')return false;
  const visible=ownerSeesPlayer();
  if(['drink','drop'].includes(action.kind)&&(visible||state.cupGuard)){
    if(cupEpisode&&cupChapter.state.won)return false;
    stopCupAttempt();return true;
  }
  if(!visible)return false;
  const prop=action.prop;
  const kind=action.kind==='plant'?'plant':action.kind==='scratch'?'scratch':action.kind==='scratch-curtain'?'curtain':
    prop?.kind==='water'&&!prop.on?'water':prop?.id==='print'&&!prop.on?'print':prop?.kind==='mirror'?'mirror':prop?.kind==='dig'?'litter':
    prop?.kind==='screen'?'keyboard':prop?.kind==='block'?'monitor':null;
  if(!kind)return false;
  campaignCaught(kind);
  state.actionBeat=null;state.gesture=null;state.scratchUntil=state.now;state.watchfulKind=kind;state.watchfulUntil=state.now+4;
  state.ownerCuePoint=[player.root.position.x,player.root.position.z];state.ownerCueUntil=state.now+2.5;
  if(state.now>=state.ownerNextReaction){state.ownerNextReaction=state.now+2;state.ownerReactUntil=state.now+1.2;say(reactions[kind][0],'阿澄',3);toast('阿澄望住，栗子收返隻爪。');}
  return true;
}

function beginRest(prop){
  leaveRest();playerRoute=[];state.motion.set(0,0,0);state.gesture=null;
  state.restSpot={prop,settled:false,started:state.now};
  if(state.platform)playerRoute=[[prop.x,prop.z]];else if(walkTo(prop.x,prop.z))playerRoute.push([prop.x,prop.z]);
}
function leaveRest(){
  if(!state.restSpot)return;
  if(state.restSpot.prop.id==='bed')player.root.position.y=0;
  state.restSpot=null;player.setResting(0);playerRoute=[];state.motion.set(0,0,0);
}
function updateResting(mochiRest){
  const rest=state.restSpot;
  if(rest){
    if(!rest.settled&&distance(player,[rest.prop.x,rest.prop.z])<.075){
      rest.settled=true;playerRoute=[];state.motion.set(0,0,0);say(rest.prop.line,'栗子',2.4);
    }
    if(rest.settled){
      player.root.position.set(rest.prop.x,rest.prop.restHeight,rest.prop.z);player.root.rotation.y=.25;
      player.setResting(1);for(const eye of player.eyes)eye.scale.y=.28;
    }else if(state.now-rest.started>5){leaveRest();toast('行近少少，再試入去。');}
  }
  if(mochiRest&&['bed','box'].includes(state.mochiStop)){
    const home=roomObjects.find(prop=>prop.id===state.mochiStop);
    mochi.root.position.set(home.x,home.restHeight,home.z);mochi.root.rotation.y=-.3;
    mochi.setResting(1);state.mochiInBed=true;for(const eye of mochi.eyes)eye.scale.y=.23;
  }
}
function updateCozySecret(mochiRest){
  if(showcase||secretCozyUnlocked||state.phase!=='play'||state.secretOpen)return;
  const catSpot=state.restSpot?.settled&&state.restSpot.prop.id;
  if(!['bed','box'].includes(catSpot)||!mochiRest||!['bed','box'].includes(state.mochiStop)||catSpot===state.mochiStop)return;
  if(state.ownerMode!=='routine'||state.ownerRoutine?.step!=='back'||state.ownerRoute.length===0)return;
  const {x,z}=owner.root.position;
  if(z<.2||x<-2.7||x>5.8)return;
  if(!ownerSeesActor(player)||!ownerSeesActor(mochi))return;
  say('吓，你哋兩個一齊乖乖瞓？……咁樣望住你哋，真係好幸福。','阿澄',5);
  state.ownerReactUntil=state.now+2.5;
  collectSecret('cozy');
}

function rememberWorld(id,line){
  if(state.worldHistory.some(item=>item.id===id))return;
  state.worldHistory.push({id,line});renderHistory();
}
function forgetWorld(id){state.worldHistory=state.worldHistory.filter(item=>item.id!==id);renderHistory();}
function renderHistory(){ui['world-history'].textContent=state.worldHistory.map(item=>item.line).join(' ');}
function quickRetry(){
  if(state.paused||!state.lastFailure)return;
  const catches=cupChapter.state.catches,spills=cupChapter.state.spills;
  const blameCatches=blameChapter.state.catches,uncertain=blameChapter.state.uncertain;
  reset();cupChapter.state.catches=catches;cupChapter.state.spills=spills;
  blameChapter.state.catches=blameCatches;blameChapter.state.uncertain=uncertain;
  toast('再嚟！試下換個方法或者時機。');ui.world.focus({preventScroll:true});
}
function interact(alternate=false){
  if(state.paused||state.phase!=='play')return;
  const action=nearby(alternate);if(!action)return;
  if(action.kind==='cancel-beat'){if(!state.actionBeat?.applied){state.actionBeat=null;state.gesture=null;playerRoute=[];}return;}
  const tactile=['prop','scratch-curtain','plant','drop','scratch','bowl'].includes(action.kind);
  if(!tactile||action.prop?.kind==='cozy'){applyInteraction(alternate,action);return;}
  if(state.actionBeat)return;
  const point=action.prop?[action.prop.kind==='ball'?action.prop.node.position.x:action.prop.x,action.prop.kind==='ball'?action.prop.node.position.z:action.prop.z]:
    action.kind==='drop'?cupSpot:action.kind==='plant'?plantSpots[action.plantIndex]:action.kind==='bowl'?spots.bowl:spots.sofa;
  const height=action.prop?.contactY??(action.kind==='drop'?.73:action.kind==='plant'?plants[action.plantIndex].position.y+.38:action.kind==='bowl'?.16:.55);
  const root=player.root.position,dx=root.x-point[0],dz=root.z-point[1],range=Math.hypot(dx,dz)||1;
  let destination=[point[0]+dx/range*.34,point[1]+dz/range*.34];
  if(state.platform)destination=nearestOn(state.platform,...destination);
  else if(!fits(...destination))destination=[root.x,root.z];
  state.actionBeat={action,point:point.slice(),height,destination,start:null,applied:false,requested:state.now};
  if(state.platform)playerRoute=[destination];else walkTo(...destination);
  if(shots[action.prop?.id])holdFocus(action.prop.id);
}
function updateActionBeat(dt,t){
  const beat=state.actionBeat;if(!beat)return;
  if(state.hop||t-beat.requested>5){state.actionBeat=null;return;}
  if(beat.start===null){
    if(distance(player,beat.destination)>.10&&playerRoute.length)return;
    playerRoute=[];state.motion.set(0,0,0);beat.start=t;
  }
  const elapsed=t-beat.start;
  const dx=beat.point[0]-player.root.position.x,dz=beat.point[1]-player.root.position.z;
  rotateToward(player.root,Math.atan2(dx,dz),dt*1.6);
  if(!beat.applied&&elapsed>=.40){
    // Recheck reach at contact; walking away never triggers an action from a distance.
    if(beat.action.prop&&!canReach(beat.action.prop)){state.actionBeat=null;toast('仲差少少，行近啲再伸爪。');return;}
    beat.applied=true;applyInteraction(false,beat.action);
  }
  if(beat.action.prop?.kind!=='block'&&beat.action.prop?.kind!=='cozy')poseContact(player,beat.point,beat.height,Math.min(1,elapsed/.8));
  if(elapsed>=.8){state.actionBeat=null;state.gesture=null;}
}
function updatePlayerFeedback(){
  document.body.classList.toggle('chapter-won',chairEpisode&&chairChapter.state.stage==='won'||cupEpisode&&cupChapter.state.won||blameEpisode&&blameChapter.state.won);
  const watching=ownerSeesPlayer();
  ui['awareness'].hidden=state.phase!=='play';
  ui['awareness'].textContent=state.cupGuard?'阿澄正在看守杯水':state.blameHidden?'紙箱內 · 栗子藏好咗':watching?'阿澄望得到你':'阿澄暫時睇唔到你';
  ui['awareness'].classList.toggle('seen',watching&&!state.blameHidden);
  ui['retry-attempt'].hidden=!state.lastFailure||state.paused;
  if(state.lastFailure)ui['failure-reason'].textContent=state.lastFailure;
  ui['failure-reason'].hidden=!state.lastFailure;
  const names={curious:'好奇，留意緊周圍',sleepy:'眼瞓，叫醒後先過嚟',playful:'想玩，尾巴郁郁'};
  ui['mochi-mood'].textContent='麻糬：'+names[state.mochiMood];
}
function updatePersonality(dt,t){
  state.mochiMood=['curious','sleepy','playful'][Math.floor(t/18)%3];
  const reserved=state.blameMochiPending||state.blameMochiHop||state.blameMochiOnDesk||state.cupMochiPending||state.mochiRoute.length||state.mochiMode==='seated';
  if(!reserved&&state.mochiMode==='idle'){
    const phase=t%12;
    if(phase>7&&phase<9.4){mochi.head.rotation.x=.32;mochi.paws[1].rotation.x=-1.5+.12*Math.sin(t*8);mochi.head.rotation.z=.10;}
    else if(state.mochiMood==='sleepy'){mochi.head.rotation.x=.10;for(const eye of mochi.eyes)eye.scale.y=.40+.06*Math.sin(t);}
    else{rotateToward(mochi.root,Math.atan2(player.root.position.x-mochi.root.position.x,player.root.position.z-mochi.root.position.z),dt*.20);}
    if(state.mochiMood==='playful')mochi.tail.rotation.y=.28*Math.sin(t*4);
    if((cupEpisode||blameEpisode)&&t>=state.nextIdle){
      const stops=cupEpisode?[[-3.45,3.25],[-3.3,1.4],[-4.1,3.1]]:[[-3.45,-1.5],[-5.8,-1.5],[-3.45,-2.6]];
      const point=stops[Math.floor(t/9)%stops.length];
      state.mochiRoute=floorRoute(mochi.root.position.x,mochi.root.position.z,...point);state.nextIdle=t+9;
    }
  }
  if(blameEpisode&&blameChapter.state.won){
    const target=new T.Vector3(player.root.position.x,mochi.root.position.y+.64,player.root.position.z);
    const local=mochi.root.worldToLocal(target);mochi.head.rotation.y=T.MathUtils.clamp(Math.atan2(local.x,local.z),-.65,.65);
    mochi.tail.rotation.y=.25*Math.sin(t*5); // An indignant glance at the actual culprit.
  }
}
function scheduleCleanup(kind,prop=null){
  const key=kind==='water'&&prop?`${kind}:${prop.id}`:kind;
  if(showcase||state.cleanupQueue.includes(key)||state.cleanupJob?.key===key)return;
  if(['plant','print','mirror','water','curtain','cup','oranges'].includes(kind))state.cleanupQueue.push(key);
}
function updateHousekeeping(dt,t){
  if(showcase||state.fridgeRescue?.stage==='coming'||state.fridgeRescue?.stage==='lowering')return;
  const allOrangesDown=oranges.every(orange=>Number.isFinite(orange.started));
  if(allOrangesDown&&!state.orangesNoticed&&t>=state.orangeNoiseAt){
    const inKitchen=owner.root.position.x>2.4&&owner.root.position.z<1.2;
    if(!inKitchen&&state.ownerMode==='desk'){
      state.ownerMode='orange-investigate';state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,4.05,-2.55);
      say('咦？廚房點解有嘢跌落地？','阿澄',2.8);
    }
    if(inKitchen&&(state.ownerMode==='orange-investigate'&&!state.ownerRoute.length||Math.hypot(owner.root.position.x-3.65,owner.root.position.z+2.9)<4.2)){
      state.orangesNoticed=true;state.ownerReactUntil=t+2.2;state.ownerSighUntil=t+1.8;
      say('栗子！成盤橙都俾你撥落地！唔可以咁玩㗎！','阿澄',4.5);
      scheduleCleanup('oranges');
    }
  }
  if(t>=(state.nextMessLook??0)&&!state.cleanupJob){
    state.nextMessLook=t+1;
    const dirty=roomObjects.find(prop=>(prop.id==='print'&&prop.on&&levels[state.level]?.event!=='frame-blame'||prop.kind==='mirror'&&prop.marked||prop.kind==='water'&&prop.on)&&!prop.discovered&&
      (ownerSeesActor({root:{position:new T.Vector3(prop.x,prop.contactY-.64,prop.z)}})||
        prop.kind==='water'&&Math.hypot(owner.root.position.x-prop.x,owner.root.position.z-prop.z)<2.25));
    if(dirty){
      dirty.discovered=true;const kind=dirty.id==='print'?'print':dirty.kind==='mirror'?'mirror':'water';scheduleCleanup(kind,dirty);
      say(kind==='water'?'咦，水龍頭仲開住？閂返先。':kind==='mirror'?'塊鏡有爪印……抹返乾淨先。':'幅畫歪咗？扶返正先。','阿澄',2.7);
    }
  }
  if(!state.cleanupJob&&state.cleanupQueue.length){
    const key=state.cleanupQueue[0],kind=key.split(':')[0];
    const tap=kind==='water'?roomObjects.find(p=>p.id===key.slice(6)):null;
    const nearbyTap=tap&&state.ownerMode==='routine'&&
      Math.hypot(owner.root.position.x-tap.x,owner.root.position.z-tap.z)<2.25;
    const nearbyOranges=kind==='oranges'&&state.ownerMode==='orange-investigate'&&!state.ownerRoute.length;
    if(!((state.ownerMode==='desk'||kind==='cup'&&state.ownerMode==='watch')&&!state.ownerRoute.length||nearbyTap||nearbyOranges))return;
    state.cleanupQueue.shift();
    const prop=kind==='print'?portrait:kind==='mirror'?roomObjects.find(p=>p.id==='mirror'):
      kind==='water'?tap:kind==='curtain'?roomObjects.find(p=>Number.isFinite(p.scratchedAt)):null;
    if(kind==='water'&&!prop?.on||kind==='cup'&&!state.cupNeedsCare)return;
    const point=kind==='cup'?[cupSpot[0],cupSpot[1]+(puddle.visible?.46:0)]:kind==='oranges'?[3.65,-2.9]:prop?[prop.x,prop.z]:plantSpots[state.plantIndex];
    if(!point)return;
    const choices=kind==='cup'?
      [[cupSpot[0]+1.10,cupSpot[1]+.24],[cupSpot[0]+1.10,cupSpot[1]],[cupSpot[0],cupSpot[1]+1.05]]:
      [[point[0]+.75,point[1]+.5],[point[0],point[1]+.9],[point[0]-.9,point[1]+.4]];
    const route=choices.filter(p=>fits(...p)).map(p=>floorRoute(owner.root.position.x,owner.root.position.z,...p)).find(r=>r.length);
    if(!route){state.cleanupQueue.unshift(key);state.nextMessLook=t+2;return;}
    if(nearbyTap){state.ownerRoutine=null;if(bathDoor.latched){bathDoor.latched=false;bathDoor.on=true;}}
    state.cleanupJob={key,kind,prop,point,until:null};state.ownerMode='tidy';state.ownerRoute=route;
  }
  const job=state.cleanupJob;if(!job||state.ownerMode!=='tidy')return;
  if(state.ownerRoute.length)return;
  if(job.until===null){
    job.until=t+(job.kind==='cup'&&state.secretPending?3.0:1.8);
    if(job.kind==='cup'&&state.secretPending){
      state.ownerReactUntil=t+2.8;state.ownerSighUntil=t+2.2;sigh();
      say('栗子！第三次喇！呢個杯真係唔係玩具呀，我會嬲㗎！','阿澄',4.6);
    }
  }
  rotateToward(owner.root,Math.atan2(job.point[0]-owner.root.position.x,job.point[1]-owner.root.position.z),dt);
  owner.body.rotation.x=.24;owner.arms[1].rotation.x=-1+.15*Math.sin(t*9);
  if(t<job.until)return;
  if(job.prop){if(job.kind==='water')job.prop.on=false;else resetProp(job.prop);}
  if(job.kind==='oranges'){
    for(const orange of oranges)resetProp(orange);
    forgetWorld('fruit');collectSecret('orange');
  }
  if(job.kind==='cup')restoreCup();
  if(job.kind==='plant'){if(state.plantIndex>=0)plants[state.plantIndex].rotation.set(0,0,0);state.plantIndex=-1;for(const leaf of looseLeaves)leaf.visible=false;forgetWorld('leaves');}
  if(job.kind==='print')forgetWorld('picture');
  if(job.kind==='mirror')forgetWorld('mirror');
  if(job.kind==='water')forgetWorld(job.prop.id);
  if(job.kind==='curtain')forgetWorld('curtain');
  state.cleanupJob=null;state.ownerMode='return';state.ownerRoute=floorRoute(owner.root.position.x,owner.root.position.z,...spots.desk);
  if(job.kind==='cup'&&state.cleared&&levels[state.level]?.event==='drop')state.finishAt=t+1.05;
  if(job.kind==='cup')collectSecretCup();
  if(!state.secretOpen)say(job.kind==='cup'?'好啦，水杯放返好，地下都抹乾淨喇。':job.kind==='water'?'水龍頭閂返喇。栗子，唔好再撥開呀。':job.kind==='oranges'?'四個橙都執返好喇。栗子，唔准再玩果盤。':'執好喇。栗子，留返啲嘢俾我呀。','阿澄',2.5);
}

let pickerSignature='';
const walkMarker=ring(0x9ab993,.19);
walkMarker.visible=false;
function setPaused(paused,reason='manual'){
  if(state.phase!=='play')return false;
  state.paused=paused;keys.clear();state.motion.set(0,0,0);
  for(const target of [ui.world,ui.controls,ui.touch])target.inert=paused;
  state.pickerOpen=false;ui['nearby-choices'].hidden=true;ui['target-switch'].setAttribute('aria-expanded','false');
  ui['pause-overlay'].hidden=!paused;ui.pause.textContent=paused?'繼續':'暫停';ui.pause.dataset.art=paused?'continue':'pause';ui.pause.setAttribute('aria-pressed',String(paused));
  ui['pause-reason'].textContent=reason==='hint'?'睇提示期間，主人、貓咪同所有計時都暫停。':reason==='background'?'剛才切換咗分頁，遊戲已幫你暫停。準備好再繼續。':'主人、貓咪同所有計時都暫停咗。';
  if(paused){ui.resume.focus({preventScroll:true});if(audio?.state==='running')audio.suspend().catch(()=>{});}
  else{ui['help-details'].open=false;unlockAudio();ui.world.focus({preventScroll:true});}
  syncBackgroundMusic();
  return true;
}
function jumpDown(){
  if(!state.platform||state.paused||state.hop)return false;
  if(state.platform===fridgeTop){toast('雪櫃太高，栗子落唔到去。');return false;}
  const {x,z}=player.root.position,angle=player.root.rotation.y;
  return jump(null,[x+Math.sin(angle),z+Math.cos(angle)]);
}
function selectInteraction(id){
  if(state.paused)return false;
  const target=interactionTargets().find(target=>target.id===id);
  if(!target){toast('行近返嗰件物件，先可以互動。');return false;}
  state.targetId=id;state.pickerOpen=false;pickerSignature='';
  ui['nearby-choices'].hidden=true;ui['target-switch'].setAttribute('aria-expanded','false');
  updateHud(state.now);
  ui.world.focus({preventScroll:true});return true;
}
function updatePicker(targets,active){
  if(targets.length<2||state.phase!=='play'){state.pickerOpen=false;}
  ui['nearby-choices'].hidden=!state.pickerOpen;ui['target-switch'].setAttribute('aria-expanded',String(state.pickerOpen));
  if(!state.pickerOpen)return;
  const signature=targets.map(target=>target.id+':'+target.primary?.label+':'+(target.id===active?.id)).join('|');
  if(signature===pickerSignature)return;
  pickerSignature=signature;
  const buttons=targets.map(target=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(target.id===active?.id));
    button.setAttribute('aria-label','選擇'+target.name);const name=document.createElement('strong'),verb=document.createElement('small');
    name.textContent=target.name;verb.textContent=target.primary?.label??'';button.append(name,verb);
    button.addEventListener('click',()=>selectInteraction(target.id));return button;
  });
  ui['nearby-choices'].replaceChildren(...buttons);
}
function updateWalkMarker(){
  const goal=state.hop?[hopDestination.x,hopDestination.z]:playerRoute.at(-1);
  walkMarker.visible=!!goal&&state.phase==='play'&&!state.paused;
  if(goal){
    const surface=state.hop?hopDestination.y:state.platform?.height??0;
    walkMarker.material.color.set(state.hop?0xd4b36a:0x9ab993);
    walkMarker.position.set(goal[0],surface+.043,goal[1]);walkMarker.scale.setScalar(1+.045*Math.sin(state.now*4));
  }
}

let orbitDrag=null;
function orbit(delta){
  if(focusMix>.002)state.focusPaused=true;
  for(const offset of [cameraOffset,closeOffset]){
    const radius=Math.hypot(offset.x,offset.z),angle=Math.atan2(offset.x,offset.z)+delta;
    offset.x=Math.sin(angle)*radius;offset.z=Math.cos(angle)*radius;
  }
}
renderer.domElement.addEventListener('pointerdown',event=>{
  if(event.button!==0||(!showcase&&!closeView))return;
  if(state.paused)return;
  orbitDrag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove',event=>{
  if(!orbitDrag)return;
  const dx=event.clientX-orbitDrag.x;
  if(Math.hypot(event.clientX-orbitDrag.startX,event.clientY-orbitDrag.startY)>7)orbitDrag.moved=true;
  if(orbitDrag.moved)orbit(-dx*.008);
  orbitDrag.x=event.clientX;orbitDrag.y=event.clientY;
});
renderer.domElement.addEventListener('pointercancel',()=>{orbitDrag=null;});
ui['orbit-left'].addEventListener('click',()=>orbit(-Math.PI/8));
ui['orbit-right'].addEventListener('click',()=>orbit(Math.PI/8));
ui['hide-cat'].addEventListener('click',()=>{hideBlameCat();ui.world.focus({preventScroll:true});});
ui['cup-stop'].addEventListener('click',()=>{cupChapter.cancel();playerRoute=[];state.motion.set(0,0,0);ui.world.focus({preventScroll:true});});
ui['retry-attempt'].addEventListener('click',quickRetry);
ui['chapter-replay'].addEventListener('click',()=>{reset();ui.world.focus({preventScroll:true});});
ui['camera-home'].addEventListener('click',()=>{
  cameraOffset.set(7.4,12.2,17.5);closeOffset.set(2.40,2.00,4.80);
  closeView=false;state.focusPaused=true;ui.view.textContent='貓咪近鏡';ui.view.dataset.art='closeup';ui.view.setAttribute('aria-pressed','false');
});
if(!showcase){
  ui['sample-link'].textContent='罪狀清單';ui['sample-link'].dataset.art='cases';ui['sample-link'].href='#campaign-menu';
  ui['sample-link'].addEventListener('click',event=>{event.preventDefault();ui['campaign-menu'].open=true;ui['campaign-menu'].scrollIntoView?.({block:'nearest'});});
}
if(showcase){
  document.body.classList.add('showcase');
  document.title='暖木書房 · 3D可玩樣板';
  const brandEyebrow=document.querySelector('.brand .eyebrow');
  if(brandEyebrow)brandEyebrow.textContent='3D 小屋 · 書房造型樣板';
  document.querySelector('.sidehead h2').textContent='書房小試玩';
  document.querySelector('.sidehead .eyebrow').textContent='A LITTLE AFTERNOON';
  ui['sample-link'].textContent='返回闖關';delete ui['sample-link'].dataset.art;ui['sample-link'].href='/cat-house-mischief/';
  ui['sample-tools'].hidden=false;
  cameraTarget.set(-5.1,.72,-2.85);
}

if(chairEpisode){
  document.title='工位繼承貓 · 一個任務，多種方法';
  document.querySelector('.brand .eyebrow').textContent='3D 小品 · 工位繼承貓';
  document.querySelector('.sidehead h2').textContent='栗子的霸位大計';
  ui['chapter-panel'].hidden=false;
  document.querySelector('#sample-tools > p:not(.eyebrow)').textContent='點地面行路，拖動轉視角。空白鍵跳躍，E／F互動，Q／R喵叫。';
  document.querySelector('.sample-note').textContent='靠近物件查看可做的動作。按 G 可以切換附近的對象。';
}
if(cupEpisode){
  document.body.classList.add('cup-episode');document.title='你的水特別好喝 · 偷飲小關';
  document.querySelector('.brand .eyebrow').textContent='3D 小品 · 你的水特別好喝';
  document.querySelector('.sidehead h2').textContent='栗子的偷飲大計';
  ui['chapter-panel'].hidden=false;ui['seat-progress'].setAttribute('aria-label','偷飲進度');
  document.querySelector('#chapter-panel details p').textContent='阿澄會偶爾望手機。地上嘅玩具波可以拍響；留意麻糬同阿澄之後嘅反應。亦可以喺離茶几遠少少嘅地面喵叫，引佢望另一邊，再返回茶几。你亦可以行近麻糬，邀佢去玩具旁玩。跳上茶几後，再行近水杯。E 偷飲或停低，F 撥杯。';
  document.querySelector('#chapter-result > strong').textContent='神不知，貓不覺';
  document.querySelector('#chapter-result > p').textContent='自己碗水冇郁，主人杯水少咗。';
  ui['chapter-replay'].textContent='再試另一個方法';
  ui['chapter-next'].href='/cat-house-mischief/?preview=blame';ui['chapter-next'].textContent='下一幕：嫁禍麻糬 →';
  document.querySelector('.sample-note').textContent='偷飲期間再按 E 或「收口扮乖」即可停低。主人望返過嚟之前，要識得收口呀。';
  document.querySelector('#sample-tools > p:not(.eyebrow)').textContent='點地面行路，拖動轉視角。空白鍵跳上茶几；E／F 互動，G 切換附近對象。';
  ui['camera-home'].textContent='客廳全景';cameraTarget.set(-5.25,.60,3.0);
}
if(blameEpisode){
  document.title='唔係我，係麻糬 · 嫁禍小關';
  document.querySelector('.brand .eyebrow').textContent='3D 小品 · 唔係我，係麻糬';
  document.querySelector('.sidehead h2').textContent='栗子的嫁禍大計';ui['chapter-panel'].hidden=false;ui['hide-cat'].hidden=false;
  ui['seat-progress'].setAttribute('aria-label','主人查看掛畫前的時間');
  document.querySelector('#chapter-panel details p').textContent='書桌有逗貓鼠，撥鉛筆亦會吸引麻糬上枱。阿澄會望書架；亦可以先喵一聲引佢望另一邊。弄歪掛畫後，H 或「躲藏」會引導栗子跳落地，再由入口躲入紙箱；你亦可自行走到主人視線以外。';
  document.querySelector('#chapter-result > strong').textContent='清白的是麻糬';
  document.querySelector('#chapter-result > p').textContent='阿澄只見到麻糬喺現場。栗子靜靜地留喺紙箱。';
  ui['chapter-replay'].textContent='再試另一個時機';ui['chapter-next'].href='/cat-house-mischief/?preview=cup';ui['chapter-next'].textContent='再去偷飲杯水';
  document.querySelector('.sample-note').textContent='主人見過栗子動手就會記住。紙箱有真實開口，躲藏期間亦可以按 H 或方向鍵走出嚟。';
  document.querySelector('#sample-tools > p:not(.eyebrow)').textContent='空白鍵跳上書桌；E／F 互動；G 切換對象；H 躲藏或探頭。';
}
for(const link of document.querySelectorAll('.episode-nav a')){
  if(link.getAttribute('href')==='/cat-house-mischief/?preview='+preview)link.setAttribute('aria-current','page');
}
const observer=new ResizeObserver(resize);observer.observe(ui.world);
resize();
reset(true);
ui.start.disabled=false;
ui.start.textContent='開始遊戲';
ui['intro-progress'].textContent=!showcase&&state.level>0&&state.level<levels.length?'上次玩到第 '+(state.level+1)+' 關，栗子會由嗰度繼續。':!showcase&&state.level===levels.length?'上次已完成第 14 關，栗子可以繼續自由搗蛋。':'';
ui['intro-progress'].hidden=!ui['intro-progress'].textContent;
ui.start.classList.toggle('long-label',!showcase&&state.level>=9&&state.level<levels.length);
function playLevel(){
  reset();
  ui.world.focus({preventScroll:true});
}
ui.start.addEventListener('click',()=>{unlockAudio();playLevel();});
ui['intro-restart'].addEventListener('click',()=>{unlockAudio();setLevel(0);playLevel();});
ui['intro-album'].addEventListener('click',()=>openAlbum());
ui['mobile-task-toggle'].addEventListener('click',()=>setMobileNotebook(!document.body.classList.contains('mobile-notebook-open')));
ui['mobile-notebook-close'].addEventListener('click',()=>{setMobileNotebook(false);ui.world.focus({preventScroll:true});});
ui.replay.addEventListener('click',playLevel);
ui['secret-continue'].addEventListener('click',closeSecretCup);
ui['secret-album'].addEventListener('click',()=>{const index=levels.length+secretCases.findIndex(record=>record.id===state.secretType);closeSecretCup();openAlbum(index);});
ui['album-open'].addEventListener('click',openAlbum);
ui['finish-album'].addEventListener('click',openAlbum);
ui['album-close'].addEventListener('click',()=>ui.album.close());
ui.album.addEventListener('close',()=>{albumOpen=false;albumReturnFocus?.focus({preventScroll:true});});
ui.album.addEventListener('click',event=>{if(event.target===ui.album)ui.album.close();});
ui.reset.addEventListener('click',()=>{
  if(state.phase==='intro')return;
  if(state.level===levels.length)setLevel(0);
  playLevel();
});
ui.next.addEventListener('click',()=>{
  if(state.phase!=='finish'||state.level>=levels.length-1)return;
  setLevel(state.level+1);
  playLevel();
});
ui.roam.addEventListener('click',()=>{
  if(state.phase!=='finish'||state.level!==levels.length-1)return;
  setLevel(levels.length);
  playLevel();
});
ui.action.addEventListener('click',()=>{interact();ui.world.focus({preventScroll:true});});
ui['target-switch'].addEventListener('click',()=>{state.pickerOpen=!state.pickerOpen;pickerSignature='';updatePicker(interactionTargets(),activeTarget(interactionTargets()));});
ui['alt-action'].addEventListener('click',()=>{interact(true);ui.world.focus({preventScroll:true});});
renderer.domElement.addEventListener('pointerup',event=>{
  const dragged=orbitDrag?.moved;orbitDrag=null;
  if(dragged||state.paused)return;
  state.pickerOpen=false;ui['nearby-choices'].hidden=true;
  state.actionBeat=null;leaveRest();
  if(cupEpisode)cupChapter.cancel();
  if(blameEpisode){state.hideRequested=false;state.blameHidden=false;state.hideRoutePhase=null;}
  if(state.phase!=='play'||event.button!==0)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  clickRay.setFromCamera(pointer,activeCamera());
  if(state.platform&&!state.hop){
    surfacePlane.constant=-state.platform.height;
    if(clickRay.ray.intersectPlane(surfacePlane,landing)){
      const [x,z]=nearestOn(state.platform,landing.x,landing.z);
      if(showcase||Math.hypot(x-landing.x,z-landing.z)<.10){
        playerRoute=[[x,z]];
        ui.world.focus({preventScroll:true});
        return;
      }
    }
  }
  if(clickRay.ray.intersectPlane(floor,landing)){
    if(state.platform)jump(null,[landing.x,landing.z]);
    else if(!state.hop)walkTo(landing.x,landing.z,true);
  }
  ui.world.focus({preventScroll:true});
});
ui['touch-act'].addEventListener('pointerdown',event=>{event.preventDefault();interact();});
ui['jump-down'].addEventListener('click',()=>{jumpDown();ui.world.focus({preventScroll:true});});
ui.pause.addEventListener('click',()=>setPaused(!state.paused));
ui.resume.addEventListener('click',()=>setPaused(false));
ui['help-details'].addEventListener('toggle',()=>{if(ui['help-details'].open&&state.phase==='play')setPaused(true,'hint');});
ui.jump.addEventListener('click',()=>{jump();ui.world.focus({preventScroll:true});});
ui['soft-meow'].addEventListener('click',()=>{meow(false);ui.world.focus({preventScroll:true});});
ui['loud-meow'].addEventListener('click',()=>{meow(true);ui.world.focus({preventScroll:true});});
ui.view.addEventListener('click',()=>{
  if(focusMix>.002)state.focusPaused=true;
  closeView=!closeView;
  ui.view.textContent=closeView?(cupEpisode?'客廳全景':showcase?'書房全景':'看全屋'):'貓咪近鏡';
  ui.view.dataset.art=closeView?'overview':'closeup';
  ui.view.setAttribute('aria-pressed',String(closeView));
  ui.world.focus({preventScroll:true});
});
ui.sound.addEventListener('click',()=>{
  soundOn=!soundOn;ui.sound.textContent=soundOn?'音效開':'音效關';ui.sound.dataset.art=soundOn?'sound-on':'sound-off';
  ui.sound.setAttribute('aria-pressed',String(soundOn));
  if(soundOn)unlockAudio();
  else for(const clip of Object.values(catMeowAudio))clip.pause?.();
  syncBackgroundMusic();
});
for(const button of document.querySelectorAll('[data-key]')){
  const code=button.dataset.key;
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();
    if(state.paused)return;
    button.setPointerCapture(event.pointerId);
    keys.add(code);
  });
  for(const end of ['pointerup','pointercancel','lostpointercapture']){
    button.addEventListener(end,()=>keys.delete(code));
  }
}
const codeFromKey={p:'KeyP',h:'KeyH',w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',e:'KeyE',f:'KeyF',g:'KeyG',q:'KeyQ',r:'KeyR',' ':'Space'};
function controlCode(event){
  const key=event.key?.toLowerCase();
  return moveKeys.has(event.code)||['Space','KeyE','KeyF','KeyG','KeyQ','KeyR','KeyH','KeyP'].includes(event.code)?event.code:
    codeFromKey[key]||({up:'ArrowUp',left:'ArrowLeft',down:'ArrowDown',right:'ArrowRight'}[key])||event.key;
}
window.addEventListener('keydown',event=>{
  const code=controlCode(event);
  if(state.phase!=='play'||state.secretOpen||event.altKey||event.ctrlKey||event.metaKey)return;
  if(code==='KeyP'&&!event.repeat){setPaused(!state.paused);event.preventDefault();return;}
  if(state.paused)return;
  if(code==='Escape'&&state.pickerOpen){state.pickerOpen=false;ui['nearby-choices'].hidden=true;event.preventDefault();return;}
  if(blameEpisode&&code==='KeyH'&&!event.repeat){hideBlameCat();event.preventDefault();return;}
  if(cupEpisode&&code==='Escape'){cupChapter.cancel();playerRoute=[];event.preventDefault();return;}
  if(moveKeys.has(code)){
    event.preventDefault();keys.add(code);
  }else if(code==='Space'&&!(event.target instanceof HTMLButtonElement)){
    event.preventDefault();if(!event.repeat)jump();
  }else if((code==='KeyE'||code==='KeyF')&&!event.repeat){
    event.preventDefault();interact(code==='KeyF');
  }else if(code==='KeyG'&&!event.repeat){
    event.preventDefault();cycleTarget();
  }else if((code==='KeyQ'||code==='KeyR')&&!event.repeat){
    event.preventDefault();meow(code==='KeyR');
  }
});
window.addEventListener('keyup',event=>keys.delete(controlCode(event)));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(state.phase==='play')setPaused(true,'background');}syncBackgroundMusic();});

let previous=performance.now();
function frame(ms){
  const dt=Math.min(.30,Math.max(0,(ms-previous)/1000));
  previous=ms;
  if(state.paused||albumOpen||state.secretOpen)return;
  state.now+=dt;
  const t=state.now;
  const steps=Math.max(1,Math.ceil(dt/.052));
  for(let i=0;i<steps;i++)movePlayer(dt/steps,t);
  if(state.mochiInBed){mochi.root.position.y=0;mochi.setResting(0);state.mochiInBed=false;}
  const ownerWalking=moveAlong(owner,state.ownerRoute,2.14,dt);
  updateFridgeRescue(t);
  if(state.mochiMode==='idle'&&state.mochiRoute.length&&!fits(...state.mochiRoute[0])){
    state.mochiRoute=[];
    state.nextIdle=t+2;
  }
  const mochiWalking=t>=state.mochiAnswerAt&&moveAlong(mochi,state.mochiRoute,
    state.mochiMode==='race'||state.mochiMode==='play'?2.36:.92,dt);
  for(const prop of props)updateProp(prop,t,dt);
  updateHop(t);
  updateComputer();
  if(state.phase==='play'){
    updateProps(t,dt);
    updateWitness();
  }
  updateCampaign();
  updateStory(dt);
  updateMochiAffection();
  poseHost(ownerWalking,dt,t);
  catPose(mochi,mochiWalking,t+.9,dt);
  const mochiRest=state.mochiMode==='idle'&&!mochiWalking&&t<state.mochiRestUntil;
  mochi.body.rotation.z=0;
  mochi.head.rotation.x=mochiRest&&['water','litter'].includes(state.mochiStop)?.20+.10*Math.sin(t*8):0;
  if(state.mochiMode==='alert'||state.mochiMode==='look'){
    rotateToward(mochi.root,Math.atan2(spots.seat[0]-mochi.root.position.x,spots.seat[1]-mochi.root.position.z),dt);
  }
  const scratching=t<state.scratchUntil;
  if(scratching){
    const dx=state.scratchPoint[0]-player.root.position.x,dz=state.scratchPoint[1]-player.root.position.z;
    rotateToward(player.root,Math.atan2(dx,dz),dt);
    player.paws[1].rotation.x=-.82+.65*Math.sin(t*31);
    player.paws[3].rotation.x=-.82-.65*Math.sin(t*31);
  }
  const gesture=state.gesture;
  const gesturing=gesture&&t<gesture.until;
  player.body.rotation.x=gesturing&&gesture.reachUp?-.34:0;
  if(gesturing){
    if(gesture.reachUp)player.body.position.y+=.12;
    const dx=gesture.point[0]-player.root.position.x,dz=gesture.point[1]-player.root.position.z;
    if(Math.hypot(dx,dz)>.10)rotateToward(player.root,Math.atan2(dx,dz),dt);
    if(gesture.kind==='block'){
      player.body.position.y=-.11;
    }else if(gesture.kind==='cozy'){
      player.body.rotation.z=Math.sin((gesture.until-t)*Math.PI/1.35)*1.30;
      player.body.position.y=-.06;
    }else if(gesture.kind==='sip'||gesture.kind==='sniff'){
      player.head.rotation.x=Math.sin(t*16)*.14;
    }else{
      player.paws[1].rotation.x=-.53+.55*Math.sin(t*26);
      player.paws[3].rotation.x=-.38-.5*Math.sin(t*26);
    }
  }else{
    player.body.rotation.z=0;
    player.head.rotation.x=0;
  }
  if(t<state.mochiHopUntil&&state.mochiMode!=='seated'){
    mochi.body.position.y+=.16*Math.abs(Math.sin((state.mochiHopUntil-t)*9));
  }
  bowl.rotation.z=t<state.bowlUntil?Math.sin(t*34)*(state.bowlUntil-t)*.22:0;
  player.mouth.visible=t<state.meowUntil-.30;
  if(player.mouth.visible)player.mouth.scale.y=.027+Math.abs(Math.sin(t*23))*.033;
  if(state.ownerMode==='watch'&&!ownerWalking){
    rotateToward(owner.root,Math.atan2(player.root.position.x-owner.root.position.x,player.root.position.z-owner.root.position.z),dt);
  }
  for(const [actor,parts] of actorShadows){
    const {x,y,z}=actor.root.position;
    const surface=actor===player?state.platform?.height??0:blameEpisode&&state.blameMochiOnDesk?1.17:state.mochiMode==='seated'?.87:0;
    for(const [i,shadow] of parts.entries()){
      shadow.position.set(x+.045,surface+.044+i*.001,z-.14);
      shadow.material.opacity=shadow.userData.opacity*Math.max(.15,1-(y-surface)*.72);
      shadow.userData.contactShadow=surface===0;
    }
  }
  updateEpisodePose(dt,t);
  updateCupEpisode(dt,t);
  updateBlameEpisode(dt,t);
  updateActionBeat(dt,t);updatePersonality(dt,t);updateHousekeeping(dt,t);updateResting(mochiRest);updateCozySecret(mochiRest);updateReactionChain(dt,t);updateCupGuard(dt,t);updatePlayerFeedback();
  updateCamera(dt);updateOccluders(dt);updateHud(t);
  updateEpisodeHud();
  updateCupHud();
  updateBlameHud();
  renderer.render(scene,activeCamera());
}
renderer.setAnimationLoop(frame);
