import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
const mode=process.argv[2]??'chair';
const {game:g,elements,advance,setup,cleanup}=await loadGame(mode);
const prop=id=>g.props.find(p=>p.id===id);
const stand=(platform,x,z)=>{g.state.platform=platform;g.player.root.position.set(x,platform?.height??0,z);g.player.lastStepPosition.copy(g.player.root.position);g.scene.updateMatrixWorld(true);};
try{
  setup();
  if(mode==='chair'){
    // Natural break is a genuine alternative, with no button required.
    advance(27);assert.equal(g.chairChapter.state.method,'break');assert(g.chairIsFree());assert(g.jump(g.chair));advance(5);assert.equal(g.chairChapter.state.stage,'won');
    assert.match(elements['world-history'].textContent,/暖凳/);
    for(const method of ['soft','loud','keyboard','monitor','curtain']){
      setup();g.episodeOffer(method);if(method==='soft')g.episodeOffer(method);advance(3);assert(g.chairIsFree(),method);assert(g.jump(g.chair));advance(5);assert.equal(g.chairChapter.state.stage,'won',method);
    }
    setup();const desk=g.platforms.find(p=>p.id==='desk');stand(desk,-5.65,-3.995);g.selectInteraction('study-curtain');g.interact();
    assert(g.state.actionBeat);assert(!Number.isFinite(prop('study-curtain').scratchedAt));advance(.2);assert(!Number.isFinite(prop('study-curtain').scratchedAt));
    advance(2);assert(Number.isFinite(prop('study-curtain').scratchedAt));assert.equal(g.chairChapter.state.method,'curtain');
  }else if(mode==='cup'){
    // Same objective can use a call from a different location.
    stand(null,-3.45,2.4);g.meow(true);assert.equal(g.cupChapter.state.attention,'noise');
    stand(g.coffeeTable,-5.04,3.60);advance(.65);g.beginCupSip();advance(2.7);assert(g.cupChapter.state.won);assert.equal(g.cupChapter.state.method,'叫聲引開視線');
    setup();stand(g.coffeeTable,-5.04,3.60);g.cupChapter.state.nextLookAt=Infinity;g.beginCupSip();advance(2.7);assert(g.state.lastFailure);assert(!elements['retry-attempt'].hidden);const n=g.cupChapter.state.catches;
    g.quickRetry();assert.equal(g.cupChapter.state.catches,n);assert(!g.state.lastFailure);assert.equal(g.cupChapter.state.stage,'idle');
    stand(g.coffeeTable,-5.04,3.60);g.bumpCup();assert.equal(g.cupChapter.state.stage,'idle');advance(.8);g.bumpCup();assert.equal(g.cupChapter.state.stage,'spilled');advance(1);assert(g.puddle.visible);
    advance(5.5);assert.notEqual(g.cupChapter.state.stage,'spilled');assert(!g.puddle.visible);assert(!elements['world-history'].textContent.includes('水杯'));
  }else if(mode==='blame'){
    const desk=g.platforms.find(p=>p.id==='desk');stand(desk,-4.02,-3.80);g.selectInteraction('pencils');g.interact();advance(3);assert(g.state.blameMochiOnDesk||g.state.blameMochiPending||g.state.blameMochiHop);assert.equal(g.state.blameLure,'pencils');
    advance(3);stand(desk,-4.02,-3.995);for(let i=0;i<260;i++){advance(.05);if(!g.ownerSeesPlayer()&&g.blameChapter.state.attention==='shelf')break;}
    g.state.targetId=null;g.selectInteraction('print');g.interact();assert(!prop('print').on);advance(2);assert(prop('print').on);g.hideBlameCat();advance(10);assert(g.blameChapter.state.won);assert(prop('print').on);advance(12);assert(!prop('print').on);assert(g.state.blameTidied);
    setup();g.state.lastFailure='test';g.blameChapter.state.catches=2;g.quickRetry();assert.equal(g.blameChapter.state.catches,2);assert.equal(g.blameChapter.state.stage,'planning');
  }else{
    const sink=g.platforms.find(p=>p.id==='bath-sink');const tap=prop('bath-tap');stand(sink,-.83,-3.90);assert(g.canReach(tap));g.selectInteraction(tap.id);g.interact();assert(!tap.on);advance(.15);assert(!tap.on);g.setPaused(true);advance(5);assert(!tap.on);g.setPaused(false);advance(2);assert(tap.on);
    // Mirror evidence persists; cancelled contact does not toggle anything.
    g.playProp(prop('mirror'));advance(5);assert(prop('mirror').marked);assert(prop('mirror').effect.visible);
    tap.on=false;g.selectInteraction(tap.id);g.interact();assert(g.state.actionBeat);g.keys.add('ArrowDown');advance(.1);g.keys.clear();advance(1);assert(!tap.on);
    assert.equal(globalThis.progressWrites.length,0);
  }
  console.log('PASS polish '+mode+': alternative solutions, contact timing, evidence, character flow and recovery.');
}finally{cleanup();}
