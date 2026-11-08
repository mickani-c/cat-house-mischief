import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
const {game:g,setup,advance,elements,cleanup}=await loadGame('main',{saved:6});
const prop=id=>g.props.find(p=>p.id===id),surface=id=>g.platforms.find(p=>p.id===id);
function level(i){g.state.level=i;g.reset();g.state.ownerNext=Infinity;g.state.nextIdle=Infinity;}
function stand(platform,x,z){g.state.platform=platform;g.player.root.position.set(x,platform?.height??0,z);g.player.lastStepPosition.copy(g.player.root.position);g.scene.updateMatrixWorld(true);}
function unseen(){g.owner.root.position.set(-5.85,0,2.65);g.state.ownerMode='cup-sit';g.owner.root.rotation.y=Math.PI;g.state.ownerRoute=[];g.scene.updateMatrixWorld(true);}
function act(id,seconds=1.5){assert(g.selectInteraction(id),'reachable '+id);g.interact();advance(seconds);}
try{
 setup();assert.equal(g.levels.length,14);assert.equal(new Set(g.levels.map(l=>l.event)).size,14);assert.equal(g.state.level,6,'current progress resumes at seventh mission');assert.equal(elements['campaign-levels'].children.length,14);assert(!g.selectCampaignLevel(13),'locked level cannot be selected');
 // Sixth level: aim from the correct side and wait for the rolling ball to arrive.
 level(6);const ball=prop('ball'),dx=g.ballGoal.x-ball.node.position.x,dz=g.ballGoal.z-ball.node.position.z,n=Math.hypot(dx,dz);
 stand(null,ball.node.position.x-dx/n*.48,ball.node.position.z-dz/n*.48);assert(!g.state.cleared);act('ball',2.7);assert(g.state.cleared,'ball target is scored');assert.equal(g.unlockedLevel,7);advance(1.2);assert.equal(g.state.phase,'finish');elements.next.emit('click');assert.equal(g.state.level,7);assert.equal(g.state.phase,'play');
 // Seventh: same tap, enough elapsed time, no witness.
 level(7);const sink=surface('bath-sink'),tap=prop('bath-tap');stand(sink,-.83,-3.90);act('bath-tap',1.8);assert(tap.on);assert(!g.state.cleared);act('bath-tap');assert(!tap.on);assert(g.state.cleared);
 // Eighth: only unobserved typing counts, and a witness clears the accumulated work.
 level(8);unseen();stand(surface('desk'),-5,-3.64);advance(.1);assert(g.state.mission.keys>=1);act('keyboard');act('keyboard');assert(g.state.cleared);
 level(8);stand(surface('desk'),-5,-3.64);g.owner.root.position.set(-5,0,-3.05);g.owner.root.rotation.y=Math.PI;g.state.ownerMode='cup-sit';g.scene.updateMatrixWorld(true);assert(g.ownerSeesPlayer());act('keyboard');assert.equal(g.state.mission.keys,0);assert(!g.state.cleared);
 // Ninth: scattering alone does not finish the mission; the cat must leave through the doorway.
 level(9);stand(null,1.41,-1.20);act('litter',2);assert(g.state.mission.sandAt!==null);assert(!g.state.cleared);assert(g.walkTo(1.1,.3));advance(5);assert(g.state.cleared);
 // Tenth: an empty-handed hide does not count, and pausing cannot advance the three seconds.
 level(10);stand(surface('carton'),3.86,1.65);g.playProp(prop('box'));advance(4);assert(!g.state.cleared);g.interact();
 stand(surface('bath-sink'),-.83,-4.04);act('mirror',2);assert(g.state.mission.mirror);assert(g.jumpDown());advance(1);assert(g.walkTo(3.86,2.65));advance(7);assert(g.jump(surface('carton')));advance(1);act('box',2);
 assert(g.state.restSpot?.settled);assert(!g.ownerSeesPlayer());g.setPaused(true);const now=g.state.now;advance(10);assert.equal(g.state.now,now);assert(!g.state.cleared);g.setPaused(false);advance(3);assert(g.state.cleared);advance(1.2);assert.equal(g.state.phase,'finish');assert.equal(g.unlockedLevel,11);assert.equal(elements.next.hidden,false);elements.next.emit('click');assert.equal(g.state.level,11);assert.equal(g.state.phase,'play');
 // Bonus chapter: sitting on the chair must last, rather than counting the landing alone.
 level(11);unseen();g.state.ownerMode='routine';g.state.ownerRoutine={id:'sofa',route:[],step:'pause',leaveAt:Infinity};stand(null,-4.95,-1.85);assert(g.jump(surface('chair')));advance(1.1);assert.equal(g.state.platform?.id,'chair');assert(!g.state.cleared);advance(3.1);assert(g.state.cleared);
 // The cup chapter requires an escape after the sip.
 level(12);unseen();stand(surface('table'),-5.04,4.14);act('cup',1.4);assert(g.state.mission.drunkAt!==null);assert(!g.state.cleared);assert(g.jumpDown());advance(1.2);assert(g.walkTo(-3.4,3.1));advance(3);assert(g.state.cleared);
 // The framed-picture chapter requires the picture, Mochi near it, and Chestnut hidden.
 level(13);unseen();stand(surface('desk'),-4.02,-4.10);act('print',1.1);assert(g.state.mission.frameAt!==null);stand(surface('desk'),-4.02,-3.78);act('pencils',1.1);assert.equal(g.state.mochiMode,'alibi');assert(g.state.mochiRoute.length>0,'Mochi can actually reach the study');assert(!g.state.cleared);
 stand(surface('carton'),3.86,1.65);g.playProp(prop('box'));advance(1.2);assert(g.state.restSpot?.settled);advance(12);assert.equal(g.state.mochiRoute.length,0,'Mochi reaches the study');assert(g.state.mochiMode==='alibi');g.owner.root.position.set(-4.95,0,-2.68);g.state.ownerMode='desk';g.owner.root.rotation.y=Math.PI;g.scene.updateMatrixWorld(true);advance(2.4);assert(g.state.cleared);
 assert.equal(g.unlockedLevel,14);advance(1.2);assert.equal(g.state.phase,'finish');assert.equal(elements.next.hidden,true);assert.equal(elements.roam.hidden,false);elements.roam.emit('click');assert.equal(g.state.level,14);assert.equal(g.state.phase,'play');
 assert(g.selectCampaignLevel(10),'completed missions can be replayed');assert.equal(g.state.level,10);assert.equal(g.unlockedLevel,14);assert(!g.state.mission.mirror,'replay resets mission-specific state');
 console.log('PASS campaign: 14 unique levels, memo art, migrated saves, timed seat/cup and framed-picture alibi, locks, witness rules and free roam.');
}finally{cleanup();}
