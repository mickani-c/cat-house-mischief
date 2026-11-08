import assert from 'node:assert/strict';
import {loadGame} from './fixture.mjs';
import * as T from '../dist/vendor/three.module.min.js';
const mode=process.argv[2]??'main';
const {game:g,setup,advance,cleanup}=await loadGame(mode);
function visibleBounds(actor){const b=new T.Box3();actor.root.updateWorldMatrix(true,true);actor.root.traverseVisible(n=>{if(n.isMesh){n.geometry.computeBoundingBox();b.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld));}});return b;}
try{
 setup();
 if(mode==='blame'){
   g.player.root.position.set(-5.7,0,-3);g.hideBlameCat();advance(7);assert(g.state.blameHidden);
   const b=visibleBounds(g.player);assert(b.min.x>g.hideBox.x-.5275&&b.max.x<g.hideBox.x+.5275);assert(b.min.z>g.hideBox.z-.5375&&b.max.z<g.hideBox.z+.5375);
   g.hideBlameCat();advance(.2);assert(!g.player.loaf.visible);assert(g.player.tail.visible);
 }else{
   const bed=g.props.find(p=>p.id==='bed');g.player.root.position.set(bed.x-.55,0,bed.z);g.playProp(bed);advance(2);
   assert(g.state.restSpot?.settled);assert(g.player.loaf.visible);const b=visibleBounds(g.player);
   for(const x of [b.min.x,b.max.x])for(const z of [b.min.z,b.max.z])assert(Math.hypot(x-bed.x,z-bed.z)<.66,'cat fits inside bed rim');
   assert(b.min.y>=.215,'cat lies on cushion');g.keys.add('ArrowUp');advance(.2);g.keys.clear();assert(!g.state.restSpot);assert(g.player.tail.visible);
   const carton=g.platforms.find(p=>p.id==='carton'),box=g.props.find(p=>p.id==='box');g.state.platform=carton;g.player.root.position.set(4.2,.14,1.8);g.playProp(box);advance(2);
   assert(g.state.restSpot?.settled);const c=visibleBounds(g.player);assert(c.min.x>box.x-.64&&c.max.x<box.x+.64);assert(c.min.z>box.z-.61&&c.max.z<box.z+.61);g.interact();assert(!g.state.restSpot);
   const litter=g.props.find(p=>p.id==='litter');g.state.platform=null;g.player.root.position.set(1.4,0,-1.18);g.playProp(litter);advance(.32);
   const visible=litter.effect.children.filter(p=>p.visible);assert(visible.length>8);assert(visible.some(p=>p.position.y>.3));advance(3);
   assert(litter.effect.children.every(p=>p.visible&&Math.abs(p.position.y-.025)<.0001));assert(litter.effect.children.some(p=>p.position.z>.45),'grains land outside tray');
   g.reset();assert(!litter.effect.visible);assert(!g.player.loaf.visible);
   const book=g.props.find(p=>p.id==='shelf-book');assert(book.node.children.length>3);const initial=book.node.position.clone();g.playProp(book);advance(.6);assert(book.node.position.z>initial.z+.1);
 }
 console.log('PASS furniture '+mode+': resting fit and exit, litter flight/settling/reset, book interaction.');
}finally{cleanup();}
