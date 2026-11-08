import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadGame} from './fixture.mjs';

const {game:g,setup,advance,elements,cleanup}=await loadGame('main',{saved:14,unlocked:14});
try{
  assert.equal(g.state.phase,'intro');
  assert.equal(elements.intro.hidden,false);
  elements['intro-album'].emit('click');
  assert(elements.album.open,'title screen opens the collected-photo album');
  assert.equal(elements['album-grid'].children.length,20);
  assert.equal(elements.intro.hidden,false,'album returns to the title screen');
  elements.album.close();
  setup();g.state.ownerNext=Infinity;
  assert(g.fits(-7.52,1.65),'the nook from the screenshot is reachable');

  g.player.root.position.set(-7.52,0,1.65);g.scene.updateMatrixWorld(true);
  assert(!g.ownerSeesPlayer(),'the sofa hides Chestnut from the desk');
  g.meow(false);
  assert.equal(g.state.ownerMode,'seek');
  assert(g.state.ownerRoute.length>0,'Ah Ching searches physically');
  assert(!g.state.secretOpen,'the meow alone does not award the photo');
  advance(7);
  assert(g.state.secretOpen,'Ah Ching actually arrives and finds Chestnut');
  assert.equal(g.state.secretType,'hide');
  assert.match(elements['secret-photo'].src,/secret-hide\.webp$/);
  assert.equal(globalThis.localStorage.getItem('cat-house-secret-hide'),'1');
  assert.equal(elements['album-count'].textContent,'14 / 20 張');
  assert(fs.statSync(new URL('../dist/assets/records/secret-hide.webp',import.meta.url)).size>100_000);

  elements['secret-continue'].emit('click');g.reset();g.state.ownerNext=Infinity;
  g.state.nextIdle=0;g.state.lastMochiStop='sit';
  const originalRandom=Math.random;Math.random=()=>.99;
  try{advance(.05);}finally{Math.random=originalRandom;}
  assert.equal(g.state.mochiStop,'owner');
  assert(g.state.mochiRoute.length>0,"Mochi can find the owner's desk");
  advance(11.5);
  assert(g.state.mochiAffectionUntil>g.state.now,'Ah Ching pets Mochi during work');
  assert.match(elements.line.textContent,/麻糬，走嚟黐住我/);
  console.log('PASS finale: quiet sofa hide-and-seek requires discovery; Mochi reaches and receives an owner reaction.');
}finally{cleanup();}

const title=await loadGame('main',{saved:5,unlocked:6,version:null});
try{
  assert.equal(title.game.state.phase,'intro');
  assert.equal(title.game.state.level,1,'the old save is preserved before using restart');
  title.elements['intro-restart'].emit('click');
  assert.equal(title.game.state.level,0);
  assert.equal(title.game.state.phase,'play');
  assert.equal(title.elements.intro.hidden,true);
  assert.equal(title.game.unlockedLevel,7,'restart retains unlocked levels');
  assert.equal(title.elements['album-count'].textContent,'6 / 20 張','restart retains collected photos');
  console.log('PASS title screen: restart begins level one without discarding album progress.');
}finally{title.cleanup();}
