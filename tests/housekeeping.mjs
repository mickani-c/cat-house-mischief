import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';

const {game:g,setup,advance,cleanup}=await loadGame('main',{saved:4});
try{
  setup();
  g.state.ownerNext=Infinity;
  g.state.platform=g.coffeeTable;
  g.player.root.position.set(-5.04,.59,4.14);
  g.scene.updateMatrixWorld(true);
  g.applyInteraction(true,{kind:'drop'});
  advance(1);
  assert(g.puddle.visible,'the spill stays in the scene');
  assert(g.mug.position.y<.3,'the cup remains on its side');
  assert.equal(g.state.phase,'play','the record waits for Ah Ching to clean the scene');
  assert.equal(g.state.cleanupJob?.kind,'cup','Ah Ching sets out to clean up');
  advance(5.5);
  assert(g.puddle.visible,'the old six second auto reset is gone');
  advance(20);
  assert(!g.puddle.visible,'Ah Ching eventually mops the puddle');
  assert(g.mug.position.y>.55,'Ah Ching puts the cup back');
  assert.equal(g.state.phase,'finish','the record appears after cleanup');

  g.reset();
  g.state.ownerNext=Infinity;
  const tap=g.props.find(p=>p.id==='kitchen-tap');
  g.playProp(tap);
  advance(9);
  assert(tap.on,'an unattended running tap does not switch itself off');
  g.owner.root.position.set(4.45,0,-2.75);
  g.state.ownerMode='routine';
  g.state.ownerRoutine={id:'kitchen',route:[],step:'pause',leaveAt:Infinity};
  g.state.ownerRoute=[];
  advance(1.5);
  assert(tap.on,'the water still runs while Ah Ching approaches');
  assert.equal(g.state.cleanupJob?.prop,tap,'Ah Ching responds to the actual tap');
  advance(8);
  assert(!tap.on,'Ah Ching closes the tap at the sink');
  console.log('PASS housekeeping: persistent spill and running tap require visible owner cleanup.');
}finally{cleanup();}
