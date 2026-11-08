import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';

const {game:g,elements,advance,setup,cleanup}=await loadGame('main',{saved:9,unlocked:9});
try{
  setup();
  const sink=g.platforms.find(p=>p.id==='bath-sink');
  const mirror=g.props.find(p=>p.id==='mirror');
  const tap=g.props.find(p=>p.id==='bath-tap');
  g.player.root.position.set(-.83,0,-3.50);
  assert.equal(g.canReach(mirror),false,'mirror remains out of reach from the floor');
  assert.equal(g.jump(sink),true,'cat can jump onto the washbasin');
  advance(1);
  assert.equal(g.state.platform,sink);
  g.player.root.position.set(-.83,sink.height,-4.08);
  assert.equal(g.canReach(mirror),true,'mirror is reachable across the washbasin');
  assert.equal(g.canReach(tap),true,'tap remains independently reachable');
  const targets=g.interactionTargets();
  assert.equal(targets[0].id,'mirror','mirror is discoverable before the tap');
  assert.equal(targets[0].primary.label,'照鏡兼印個爪印');
  assert.equal(targets[0].secondary.label,'淨係照照鏡');
  g.selectInteraction('mirror');
  g.interact(true);
  assert.equal(g.state.focusId,'mirror');
  assert.equal(mirror.marked,false,'looking alone leaves the mirror clean');
  g.interact();
  advance(1.2);
  assert.equal(mirror.marked,true,'paw interaction marks the mirror');
  assert.equal(mirror.effect.visible,true,'paw mark appears on the mirror');
  assert.equal(elements.reset.dataset.art,'reset','main game uses the approved button artwork');
  g.reset();
  assert.equal(mirror.marked,false);
  assert.equal(mirror.effect.visible,false,'replaying clears the paw mark');
  console.log('PASS mirror: jump, look, paw print, faucet access, replay reset.');
}finally{cleanup();}
