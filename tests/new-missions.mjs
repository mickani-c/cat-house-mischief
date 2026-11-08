import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadGame} from './fixture.mjs';

const {game:g,setup,advance,elements,cleanup}=await loadGame('main',{saved:1,unlocked:1});
try{
  setup();
  assert.equal(g.levels[1].event,'feed');
  assert.equal(g.levels[1].hint,'');
  assert.match(elements['task-art'].style.backgroundImage,/food-bowl-memo\.webp/,'level 02 uses the hungry kitten and food bowl illustration');
  assert.equal(elements['task-art'].getAttribute('data-art-type'),'single');
  g.state.ownerNext=Infinity;
  assert(g.walkTo(5.22,.25),'the cat can reach the bowl from the level start');
  advance(8);
  assert.equal(g.interactionTargets()[0].id,'food','the food bowl is the default action on arrival');
  g.interact();advance(25);
  assert(g.state.cleared,'owner comes to the bowl and serves dinner');
  assert.equal(g.state.phase,'finish');
  assert.match(elements['finish-photo'].src,/food\.webp$/);
  assert.equal(globalThis.localStorage.getItem('cat-house-food-complete'),'1');

  g.reset();
  g.player.root.position.set(5.22,0,.25);
  g.owner.root.position.set(4.85,0,.9);
  g.state.ownerMode='routine';
  g.state.ownerRoutine={id:'kitchen',step:'out',route:[],wait:4.5,leaveAt:Infinity};
  g.state.ownerRoute=[[5.1,.9]];
  g.scene.updateMatrixWorld(true);
  assert(g.interactionTargets().some(target=>target.id==='owner'));
  assert.equal(g.interactionTargets()[0].id,'food','the food bowl stays the default action even beside the owner');
  g.interact();advance(1);
  assert.equal(g.state.ownerMode,'feed','owner interrupts her kitchen routine to feed the cat');
  assert.match(elements.line.textContent,/餵你/,'owner says she is going to feed the cat');
  advance(5);
  assert(g.state.cleared,'feeding completes without waiting for the owner to return to the desk');

  g.reset();
  g.state.ownerNext=g.state.now;
  g.player.root.position.set(5.22,0,.25);g.scene.updateMatrixWorld(true);
  assert(g.selectInteraction('food'));
  g.interact();advance(1);
  assert.equal(g.state.ownerMode,'feed','feeding takes priority over a due owner routine');

  g.reset();
  const feedingDoor=g.props.find(p=>p.id==='bath-door');
  g.state.ownerMode='routine';
  g.state.ownerRoutine={id:'bath',step:'pause',route:[],wait:5.8,leaveAt:g.state.now+5};
  g.state.ownerRoute=[];
  g.owner.root.position.set(.52,0,-2.77);
  feedingDoor.latched=true;feedingDoor.on=false;
  g.player.root.position.set(5.22,0,.25);g.scene.updateMatrixWorld(true);
  assert(g.selectInteraction('food'));
  g.interact();advance(1);
  assert.equal(g.state.ownerMode,'feed','owner responds even from a closed bathroom');
  assert.equal(feedingDoor.latched,false,'bathroom door opens when the owner leaves');
  advance(25);assert(g.state.cleared,'owner reaches the bowl and serves food');

  g.reset();g.state.ownerNext=Infinity;
  const door=g.props.find(p=>p.id==='bath-door');
  g.state.ownerMode='routine';g.state.ownerRoutine={id:'bath',step:'pause',route:[],leaveAt:g.state.now+5};g.state.ownerRoute=[];
  g.owner.root.position.set(.52,0,-2.77);door.latched=true;door.on=false;
  g.player.root.position.set(.65,0,.4);g.scene.updateMatrixWorld(true);
  g.meow(false);assert.equal(g.state.bathSecretPending,false,'soft meow does not trigger rescue');
  advance(.6);g.meow(true);assert(g.state.bathSecretPending);
  advance(1.5);assert.equal(door.latched,false);assert(g.state.secretOpen);assert.equal(g.state.secretType,'bath');
  assert.equal(globalThis.localStorage.getItem('cat-house-secret-bath'),'1');
  assert.match(elements['secret-photo'].src,/secret-bath\.webp$/);

  elements['secret-continue'].emit('click');g.reset();
  const bed=g.props.find(p=>p.id==='bed');
  g.state.ownerNext=Infinity;g.state.nextIdle=Infinity;
  g.state.restSpot={prop:bed,settled:true,started:g.state.now};
  g.player.root.position.set(bed.x,bed.restHeight,bed.z);
  g.state.mochiStop='box';g.state.mochiRestUntil=g.state.now+6;g.state.mochiRoute=[];
  g.owner.root.position.set(.78,0,.4);g.owner.root.rotation.y=.5;
  g.state.ownerMode='routine';g.state.ownerRoutine={id:'bath',step:'back',route:[],leaveAt:Infinity};
  g.state.ownerRoute=[[.78,.63],[.6,.65]];g.scene.updateMatrixWorld(true);
  advance(.05);assert(g.state.secretOpen,'owner sees both cats resting in separate places');
  assert.equal(g.state.secretType,'cozy');assert.equal(globalThis.localStorage.getItem('cat-house-secret-cozy'),'1');
  assert.match(elements['secret-photo'].src,/secret-cozy\.webp$/);
  assert.equal(elements['album-count'].textContent,'4 / 20 張');
  elements['secret-continue'].emit('click');g.reset();g.state.ownerNext=Infinity;
  g.state.nextIdle=0;g.state.lastMochiStop='sit';
  const random=Math.random;Math.random=()=>.21;
  try{advance(.05);}finally{Math.random=random;}
  assert.equal(g.state.mochiStop,'box');
  assert(g.state.mochiRoute.length>0,'Mochi finds a path to the box entrance');
  advance(8);assert.equal(g.mochi.root.position.y,.14,'Mochi settles fully in the box');
  for(const name of ['food','secret-bath','secret-cozy'])assert(fs.statSync(new URL('../dist/assets/records/'+name+'.webp',import.meta.url)).size>100_000);
  console.log('PASS new missions: food, closed bathroom door, two resting cats, owner reactions, photos and saved unlocks.');
}finally{cleanup();}

const migrated=await loadGame('main',{saved:5,unlocked:6,version:null});
try{
  migrated.setup();
  assert.equal(migrated.game.state.level,1,'old players first see the new feeding mission');
  assert.equal(migrated.game.unlockedLevel,7,'old completed chapters stay accessible');
  assert.equal(migrated.elements['album-count'].textContent,'6 / 20 張','new food photo remains collectible');
  assert(!migrated.elements['album-summary'].textContent.includes('秘密案件藏喺相簿最後'));
  console.log('PASS migration: progress retained and undiscovered food photo stays locked.');
}finally{migrated.cleanup();}
