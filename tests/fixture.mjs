import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export async function loadGame(mode='blame',{saved=2,unlocked=null,version=2}={}){
  const base=fileURLToPath(new URL('../dist/',import.meta.url));
  const html=fs.readFileSync(base+'index.html','utf8');
  const context=new Proxy({measureText:()=>({width:50}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,key)=>o[key]||(()=>{})});
  class Element{
    constructor(id='',tag='div'){Object.assign(this,{id,tagName:tag.toUpperCase(),style:{},dataset:{},hidden:false,inert:false,clientWidth:1000,clientHeight:670,textContent:'',children:[],attributes:{},listeners:{},classList:{add(){},remove(){},toggle(){}}});}
    setAttribute(key,value){this.attributes[key]=value;}
    getAttribute(key){return this.attributes[key]??null;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    emit(type,event={}){for(const fn of this.listeners[type]??[])fn({target:this,preventDefault(){},...event});}
    querySelector(){return new Element();}
    focus(){globalThis.focusedElement=this;}
    getContext(){return context;}
    pause(){this.paused=true;}
    play(){this.paused=false;return Promise.resolve();}
    showModal(){this.open=true;}
    close(){this.open=false;this.emit('close');}
    removeAttribute(key){delete this.attributes[key];}
    getBoundingClientRect(){return{left:0,top:0,width:1000,height:670};}
  }
  const elements=Object.fromEntries([...html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)].map(match=>[match[2],new Element(match[2],match[1])]));
  const document=new Element(),window=new Element();
  Object.assign(document,{hidden:false,querySelectorAll:s=>s==='[id]'?Object.values(elements):[],querySelector:()=>new Element(),createElement:tag=>new Element('',tag),body:new Element()});
  Object.assign(window,{devicePixelRatio:1});
  Object.assign(globalThis,{document,window,ResizeObserver:class{observe(){}},HTMLButtonElement:Element,location:{search:mode==='main'?'':'?preview='+mode},progressWrites:[]});
  const storage=new Map([...(version===null?[]:[['cat-house-campaign-version',String(version)]]),['cat-house-current-level',String(saved)],...(unlocked===null?[]:[['cat-house-unlocked-level',String(unlocked)]])]);
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem(key,value){storage.set(key,String(value));globalThis.progressWrites.push([key,value]);}};
  globalThis.testRenderer={domElement:new Element(),setPixelRatio(){},setSize(){},setAnimationLoop(){},render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}};
  let code=fs.readFileSync(base+'game.js','utf8').replaceAll("from './","from '"+pathToFileURL(base).href).replace("import { makeRenderer } from '"+pathToFileURL(base+'renderer.js').href+"';",'const makeRenderer=()=>globalThis.testRenderer;');
  code+='\nexport {state,player,mochi,owner,props,platforms,reset,jump,jumpDown,canReach,keys,movePlayer,updateCamera,activeCamera,frame,fits,blameChapter,beginFramePrank,inviteBlameMochi,hideBlameCat,ownerSeesPlayer,ownerSeesActor,portrait,hideBox,chairChapter,chairIsFree,chair,meow,cupChapter,beginCupSip,bumpCup,coffeeTable,water,mug,puddle,complete,setLevel,setPaused,selectInteraction,interactionTargets,activeTarget,interact,walkTo,quickRetry,episodeOffer,inviteCupMochi,playProp,playerRoute,scene,updateProps,applyInteraction,detailCamera,detailLook,detailTarget,focusMix,levels,unlockedLevel,selectCampaignLevel,ballGoal,updateCampaign};';
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cat-game-check-'));const file=path.join(temp,'game.mjs');fs.writeFileSync(file,code);
  const game=await import(pathToFileURL(file));
  let ms=performance.now();
  const advance=seconds=>{for(let i=0;i<Math.ceil(seconds/.05);i++)game.frame(ms+=50);};
  const setup=()=>{game.reset();game.updateCamera(1);game.activeCamera().updateMatrixWorld();};
  return {game,elements,document,window,advance,setup,cleanup:()=>fs.rmSync(temp,{recursive:true,force:true})};
}
