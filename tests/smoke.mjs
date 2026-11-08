import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
const mode=process.argv[2]||'blame';
const {game:g,elements,document,window,advance,setup,cleanup}=await loadGame(mode);
try{
  setup();
  // Pausing freezes actors and deadlines, blocks actions, resumes without catching up.
  const before={now:g.state.now,owner:g.owner.root.position.clone(),cat:g.player.root.position.clone()};
  assert(g.setPaused(true));advance(12);g.meow(true);assert(!g.jump());g.interact();
  assert.equal(g.state.now,before.now);assert.equal(g.owner.root.position.distanceTo(before.owner),0);assert.equal(g.player.root.position.distanceTo(before.cat),0);
  assert.equal(elements['pause-overlay'].hidden,false);assert.equal(elements.controls.inert,true);
  assert(g.setPaused(false));advance(.1);assert(g.state.now-before.now<.2);
  document.hidden=true;document.emit('visibilitychange');assert(g.state.paused);document.hidden=false;g.setPaused(false);
  elements['help-details'].open=true;elements['help-details'].emit('toggle');assert(g.state.paused);g.reset();assert(!g.state.paused);assert.equal(elements.controls.inert,false);
  if(mode==='blame'){
    const desk=g.platforms.find(p=>p.id==='desk');assert(!g.canReach(g.portrait));assert(g.jump(desk));advance(1);
    assert.equal(g.activeTarget(g.interactionTargets()).id,'blame-toy');
    elements['target-switch'].emit('click');assert(!elements['nearby-choices'].hidden);assert(elements['nearby-choices'].children.length>=2);
    assert(g.selectInteraction('pencils'));assert.equal(g.activeTarget(g.interactionTargets()).id,'pencils');assert(!g.selectInteraction('nonexistent'));
    g.player.root.position.set(-4.02,1.17,-3.995);g.inviteBlameMochi();advance(4);
    g.state.targetId=null;assert.equal(g.activeTarget(g.interactionTargets()).id,'print');
    for(let i=0;i<260;i++){advance(.05);if(g.blameChapter.state.attention==='shelf'&&!g.ownerSeesPlayer())break;}
    assert(!g.ownerSeesPlayer());assert(g.beginFramePrank());advance(.4);g.hideBlameCat();advance(10);assert(g.state.blameHidden);assert(g.blameChapter.state.won);
    assert.equal(globalThis.progressWrites.length,0);
  }else if(mode==='chair'){
    g.meow(false);advance(.6);g.meow(false);assert(!g.chairIsFree());advance(3);assert(g.chairIsFree());assert(g.jump(g.chair));advance(5);assert.equal(g.chairChapter.state.stage,'won');
    assert(g.jumpDown());advance(1);assert.equal(g.state.platform,null);assert.equal(g.player.root.position.y,0);
  }else if(mode==='cup'){
    assert(g.jump(g.coffeeTable));advance(1);assert.equal(g.activeTarget(g.interactionTargets()).id,'cup');
    assert(g.jumpDown());advance(1);assert.equal(g.state.platform,null);assert(g.jump(g.coffeeTable));advance(1);
    g.cupChapter.state.nextLookAt=Infinity;g.cupChapter.state.attention='cup';g.cupChapter.state.lookBackAt=Infinity;advance(.6);g.beginCupSip();advance(2.6);assert.equal(g.cupChapter.state.catches,1);
    assert(g.jumpDown());advance(10);assert(g.jump(g.coffeeTable));advance(1);g.cupChapter.lookAway(g.state.now,'phone',5);advance(.7);g.beginCupSip();advance(.6);g.setPaused(true);const progress=g.cupChapter.state.progress;advance(10);assert.equal(g.cupChapter.state.progress,progress);g.setPaused(false);advance(2.6);assert(g.cupChapter.state.won);
  }else{
    assert.equal(g.state.level,2);g.keys.add('ArrowRight');const start=g.player.root.position.clone();g.movePlayer(.1,1);g.keys.clear();assert(g.player.root.position.distanceTo(start)>.05);
    g.complete('drink');assert(g.state.cleared);g.setLevel(3);assert.equal(globalThis.progressWrites.filter(([key])=>key==='cat-house-current-level').length,1);
  }
  console.log('PASS '+mode+': pause/resume, background and hint pauses, reset, inputs and chapter-specific flow.');
}finally{cleanup();}
