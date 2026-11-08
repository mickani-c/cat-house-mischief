import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
const mode=process.argv[2]??'main';
const {game:g,setup,advance,cleanup,elements}=await loadGame(mode,{saved:3});
const front=()=>{g.state.platform=g.coffeeTable;g.player.root.position.set(-5.04,.58,3.60);g.owner.root.position.set(-5.04,0,2.90);g.owner.root.rotation.y=0;g.state.ownerMode=mode==='cup'?'cup-sit':'watch';g.state.ownerRoute=[];g.scene.updateMatrixWorld(true);};
try{
 setup();front();assert(g.ownerSeesPlayer(),'owner directly faces actual cat head');assert(g.selectInteraction('cup'));
 g.interact();assert(g.state.cupGuard,'visible sip is actually stopped');assert.equal(g.state.cupMotion,null);assert(g.water.visible);assert(!g.state.cleared);
 if(mode==='cup'){assert.equal(g.cupChapter.state.stage,'caught');assert.equal(g.cupChapter.state.progress,0);}
 for(let i=0;i<100;i++){g.interact();advance(.12);}
 assert(g.water.visible);assert(!g.state.cleared);assert(!g.cupChapter.state.won);assert(g.state.cupGuard,'spamming cannot bypass guard while cat remains');
 const now=g.state.now;g.setPaused(true);advance(10);assert.equal(g.state.now,now);g.setPaused(false);
 assert(g.jumpDown());advance(11);assert(!g.state.cupGuard,'retreat eventually releases guard');
 // An actual distraction leaves a valid opportunity. The owner still uses physical sight.
 if(mode==='cup'){
  assert(g.jump(g.coffeeTable));advance(1);g.cupChapter.lookAway(g.state.now,'phone',6);advance(1);assert(!g.ownerSeesPlayer());g.beginCupSip();advance(3);assert(g.cupChapter.state.won);
 }else{
  front();g.state.ownerMode='cup-sit';g.owner.root.rotation.y=Math.PI;g.scene.updateMatrixWorld(true);assert(!g.ownerSeesPlayer());g.interact();advance(.85);assert(g.state.cleared,'unseen sip remains possible');
 }
 console.log('PASS intervention '+mode+': direct sight blocks, progress reset, spam protection, pause, retreat and unseen success.');
}finally{cleanup();}
