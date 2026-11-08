import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadGame} from './fixture.mjs';

const {game:g,setup,advance,cleanup,elements}=await loadGame('main',{saved:4});
try{
  setup();
  for(let i=1;i<=3;i++){
    if(i>1)g.reset();
    g.state.ownerNext=Infinity;
    g.state.platform=g.coffeeTable;
    g.player.root.position.set(-5.04,.59,4.14);
    g.scene.updateMatrixWorld(true);
    g.applyInteraction(true,{kind:'drop'});
    advance(1);
    assert.equal(globalThis.localStorage.getItem('cat-house-cup-drop-streak'),String(i));
    assert(g.puddle.visible);
    advance(28);
    if(i<3){
      assert.equal(g.state.phase,'finish');
      assert(elements['secret-reward'].hidden,'earlier spills do not unlock the secret');
      assert.equal(globalThis.localStorage.getItem('cat-house-secret-cup'),null);
    }
  }
  assert(g.state.secretOpen,'third cleanup reveals the secret reward');
  assert(!elements['secret-reward'].hidden);
  assert.equal(globalThis.localStorage.getItem('cat-house-secret-cup'),'1');
  assert.equal(elements['album-count'].textContent,'5 / 20 張');
  const photo=new URL('../dist/assets/records/secret-cup.webp',import.meta.url);
  assert(fs.statSync(photo).size>100_000,'the bonus photo is bundled with the site');
  elements['secret-album'].emit('click');
  assert(elements.album.open,'the reward opens the album');
  assert.equal(elements['album-grid'].children.length,20);
  assert.match(elements['album-large'].src,/secret-cup\.webp$/);
  assert.match(elements['album-caption'].textContent,/第三次/);
  elements.album.close();
  advance(1.5);
  assert.equal(g.state.phase,'finish','the normal chapter result follows the secret reward');
  console.log('PASS secret cup: three cleanup cycles, distinct owner reaction, persistent bonus and album photo.');
}finally{cleanup();}
