import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
const {game:g,setup,advance,cleanup}=await loadGame('cup');
try{
  setup();g.jump(g.coffeeTable);advance(1);g.cupChapter.lookAway(g.state.now,'phone',6);advance(1);g.beginCupSip();let focused=false;
  for(let i=0;i<90;i++){
    advance(.05);const camera=g.activeCamera(),point=g.player.root.position.clone().project(camera);
    assert(camera.position.toArray().every(Number.isFinite));assert(point.toArray().every(Number.isFinite));
    assert(Math.abs(point.x)<1&&Math.abs(point.y)<1&&Math.abs(point.z)<1,'cat remains inside the shot');
    focused ||= g.focusMix>.95;
  }
  assert(focused);assert(g.focusMix<.01);console.log('PASS camera: full zoom, transition and return keep the cat visible.');
}finally{cleanup();}
