import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';

const {game:g,advance,setup,elements,cleanup}=await loadGame('main',{saved:13,unlocked:13});
try{
  setup();g.state.ownerNext=Infinity;
  const counter=g.platforms.find(p=>p.id==='counter');
  const oranges=g.props.filter(p=>p.orange);
  g.state.platform=counter;g.player.root.position.set(3.4,counter.height,-3.92);
  for(const orange of oranges)g.playProp(orange);
  g.player.root.position.set(7.08,counter.height,-3.78);
  assert(g.jump());advance(1);assert.equal(g.state.platform.id,'fridge-step');
  assert(g.jump());advance(1);assert.equal(g.state.platform.id,'fridge-top');
  g.meow(true);advance(28);
  assert.equal(elements['secret-photo'].src,'/assets/records/secret-fridge.webp','rescue photo appears first');
  elements['secret-continue'].emit('click');advance(35);
  assert(oranges.every(p=>!Number.isFinite(p.started)),'Ah Ching resumes the interrupted cleanup');
  assert.equal(globalThis.localStorage.getItem('cat-house-secret-orange'),'1');
  assert(elements['secret-reward'].hidden,'earlier orange photo is saved without replacing the rescue photo');
  console.log('PASS overlapping secrets: rescue takes priority; earlier photo goes directly to album.');
}finally{cleanup();}
