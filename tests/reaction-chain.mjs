import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
const mode=process.argv[2]??'chair';
const {game:g,advance,setup,elements,cleanup}=await loadGame(mode);
try{
 setup();
 if(mode==='chair'){
  const desk=g.platforms.find(p=>p.id==='desk');g.state.platform=desk;g.player.root.position.set(-4.02,desk.height,-3.8);g.scene.updateMatrixWorld(true);
  assert(g.selectInteraction('pencils'));g.interact();advance(.15);assert(!g.state.chain,'no reaction before contact');advance(1);
  assert(g.state.chain);const now=g.state.now,mochi=g.mochi.root.position.clone();g.setPaused(true);advance(8);assert.equal(g.state.now,now);assert.equal(mochi.distanceTo(g.mochi.root.position),0);g.setPaused(false);
  advance(6);assert.equal(g.chairChapter.state.method,'mochi');assert(g.chairIsFree());assert.notEqual(g.chairChapter.state.stage,'won');
  assert.match(elements['chain-note'].textContent,/阿澄見到麻糬/);assert(g.jump(g.chair));advance(5);assert.equal(g.chairChapter.state.stage,'won');assert.match(elements['chain-note'].textContent,/趁機霸位/);
  g.reset();assert(!g.state.chain);assert.equal(g.chairChapter.state.stage,'working');assert(elements['chain-note'].hidden);
 }else if(mode==='cup'){
  g.player.root.position.set(-3.35,0,1.70);g.cupChapter.state.nextLookAt=Infinity;g.scene.updateMatrixWorld(true);
  assert(g.selectInteraction('cup-ball'));g.interact();advance(7.5);assert.equal(g.cupChapter.state.attention,'chain');assert.equal(g.state.chain.stage,'opportunity');assert(!g.cupChapter.state.won);
  assert(g.walkTo(-4.05,4.44));advance(3.4);assert(g.jump(g.coffeeTable));advance(1);g.beginCupSip();advance(3);
  assert(g.cupChapter.state.won,'real walk back and sip fit the opportunity');assert.equal(g.cupChapter.state.method,'借麻糬追波');
  assert.match(elements['chain-note'].textContent,/杯水少咗/);
 }else{
  g.state.ownerMode='cup-clean'; // An unavailable owner must not be commandeered by a sound.
  const ball=g.props.find(p=>p.id==='ball');g.playProp(ball);advance(10);assert.equal(g.state.ownerMode,'cup-clean');
  assert(!g.state.chain||g.state.chain.stage==='done');
 }
 assert.equal(globalThis.progressWrites.length,0);
 console.log('PASS chain '+mode+': contact, actor movement, actual owner reaction, opportunity and preserved progress.');
}finally{cleanup();}
