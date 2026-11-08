import assert from 'node:assert/strict';
import {makeRenderer} from '../dist/renderer.js';
import {T} from '../dist/scene.js';
const canvases=[],events=[];
globalThis.document={createElement(){
  const canvas={width:300,height:150,style:{},getContext(type){if(type==='webgl2')return null;return context;}};
  const id=canvases.length;const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage(source){events.push({type:'present',id,source});}}, {get:(o,k)=>o[k]??(()=>{if(k==='fillRect')events.push({type:'clear',id});})});
  canvases.push(canvas);return canvas;
}};
const renderer=makeRenderer();renderer.setPixelRatio(1);renderer.setSize(960,640);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,30);camera.position.set(3,3,5);camera.lookAt(0,0,0);
scene.add(new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xabcdef})));
renderer.render(scene,camera);
const presented=events.filter(e=>e.type==='present');assert.equal(presented.length,1);const buffer=presented[0].source;
assert.equal(buffer.width,960);assert.equal(buffer.height,640);assert.notEqual(buffer,renderer.domElement);
assert(events.findIndex(e=>e.type==='clear')<events.findIndex(e=>e.type==='present'));
renderer.setSize(600,360);renderer.render(scene,camera);assert.equal(buffer.width,600);assert.equal(buffer.height,360);
console.log('PASS fallback renderer: resize and present complete frames from a separate canvas.');
