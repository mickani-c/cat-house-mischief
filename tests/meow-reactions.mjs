import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';

const {game:g,setup,advance,elements,cleanup}=await loadGame('main',{saved:1,unlocked:1});
try{
  setup();
  g.state.ownerNext=Infinity;
  g.state.ownerMode='routine';
  g.state.ownerRoutine={id:'stretch',step:'pause',route:[],leaveAt:Infinity};
  g.owner.root.position.set(.5,0,.4);
  g.player.root.position.set(.9,0,.8);
  g.scene.updateMatrixWorld(true);
  g.meow(false);
  assert.match(elements.line.textContent,/栗子，叫我呀/,'soft meow beside a walking owner gets a reply');
  assert.equal(elements.speaker.textContent,'阿澄');

  g.reset();
  g.state.ownerNext=Infinity;
  g.player.root.position.set(6.2,0,2.3);
  g.scene.updateMatrixWorld(true);
  g.meow(true);
  assert.match(elements.line.textContent,/栗子又講粗口/,'a distant loud meow is heard at the desk');
  assert.equal(g.state.ownerMode,'desk','Ah Ching stays seated for distant calling');
  assert.equal(g.state.ownerRoute.length,0);

  advance(.6);
  g.meow(true);
  assert.match(elements.line.textContent,/栗子又講粗口/,'repeated calls do not spam dialogue');
  advance(3.1);
  g.meow(true);
  assert.match(elements.line.textContent,/麻糬咁乖/,'distant reactions rotate after cooldown');
  assert.equal(g.state.ownerMode,'desk');
  console.log('PASS meow reactions: nearby soft call, seated distant loud replies, cooldown and alternate dialogue.');
}finally{cleanup();}
