import test from 'node:test';
import assert from 'node:assert/strict';
import {createPawnRenderer,DIRECTIONS} from '../public/pawn-engine.js';
const PAGE_BYTES=1024*640*4,SHADOW_BYTES=4096;
async function withCanvas(fn){
  const previous=globalThis.document;
  let drawCalls=0;
  const ctx=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):key==='drawImage'?()=>{drawCalls++;}:()=>{},set:()=>true});
  globalThis.document={createElement(){return{width:0,height:0,getContext:()=>ctx};}};
  try{await fn(ctx,()=>drawCalls);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}

test('500 distinct looks retain all directions without rebuilding during animation',()=>withCanvas(async ctx=>{
  const renderer=createPawnRenderer();
  const pawns=Array.from({length:500},(_,i)=>renderer.prepare({proportions:{head:.85+i*.0005}}));
  await renderer.warm(pawns.map(pawn=>({pawn,directions:DIRECTIONS})),{budgetMs:10});
  const warmed=renderer.stats();
  assert.equal(warmed.looks,500);assert.equal(warmed.builds,4000);assert.equal(warmed.pages,32);
  for(let pass=0;pass<3;pass++)for(const pawn of pawns)for(const direction of DIRECTIONS)for(const state of ['idle','walk'])renderer.draw(ctx,pawn,{x:100,y:100,direction,state,progress:pass*.23});
  assert.equal(renderer.stats().builds,warmed.builds);assert.equal(renderer.stats().evictions,0);
  assert.equal(renderer.stats().preparations,500);
  assert.equal(renderer.stats().bytes,32*PAGE_BYTES+SHADOW_BYTES);
  assert.ok(renderer.stats().bytes<=renderer.stats().maxBytes);
  renderer.dispose();assert.equal(renderer.stats().bytes,0);
}));

test('the old 18-look cache cliff is gone and animation creates no new poses',()=>withCanvas(ctx=>{
  const renderer=createPawnRenderer({maxCacheBytes:PAGE_BYTES+SHADOW_BYTES});
  const pawns=Array.from({length:18},(_,i)=>renderer.prepare({proportions:{head:.85+i*.01}}));
  for(let frame=0;frame<24;frame++)for(const pawn of pawns)renderer.draw(ctx,pawn,{x:0,y:0,state:'walk',progress:frame/8});
  assert.equal(renderer.stats().builds,18);assert.equal(renderer.stats().evictions,0);
  assert.equal(renderer.stats().bytes,PAGE_BYTES+SHADOW_BYTES);
  renderer.dispose();
}));

test('prepared appearances are immutable snapshots and share raster poses',()=>withCanvas(ctx=>{
  const renderer=createPawnRenderer(),input={hair:'long',colors:{clothes:'#79a76b'}};
  const first=renderer.prepare(input),second=renderer.prepare(input);
  input.hair='short';input.colors.clothes='#e48378';
  assert.equal(first.appearance.hair,'long');assert.equal(first.appearance.colors.clothes,'#79a76b');
  assert.throws(()=>{first.appearance.colors.clothes='#e48378';},TypeError);
  renderer.draw(ctx,first,{x:0,y:0});renderer.draw(ctx,second,{x:0,y:0});
  assert.equal(renderer.stats().looks,1);assert.equal(renderer.stats().builds,1);
  renderer.release(first);renderer.draw(ctx,second,{x:0,y:0});assert.equal(renderer.stats().builds,1);
  assert.throws(()=>renderer.draw(ctx,first,{x:0,y:0}),/live pawn/);
  renderer.release(second);assert.equal(renderer.stats().looks,0);assert.equal(renderer.stats().poses,0);
  renderer.dispose();
}));

test('page eviction is bounded and evicted directions are regenerated correctly',()=>withCanvas(ctx=>{
  const renderer=createPawnRenderer({maxCacheBytes:PAGE_BYTES+SHADOW_BYTES});
  const pawns=Array.from({length:129},(_,i)=>renderer.prepare({proportions:{head:.85+i*.001}}));
  for(const pawn of pawns)renderer.draw(ctx,pawn,{x:0,y:0,direction:'west'});
  assert.equal(renderer.stats().poses,128);assert.equal(renderer.stats().evictions,1);
  const built=renderer.stats().builds;renderer.draw(ctx,pawns[0],{x:0,y:0,direction:'west'});
  assert.equal(renderer.stats().builds,built+1);assert.ok(renderer.stats().bytes<=PAGE_BYTES+SHADOW_BYTES);
  renderer.dispose();
}));

test('warm-up rejects impossible working sets, supports cancellation, and survives clear via a fresh warm-up',()=>withCanvas(async ctx=>{
  const renderer=createPawnRenderer({maxCacheBytes:PAGE_BYTES+SHADOW_BYTES});
  const pawns=Array.from({length:17},(_,i)=>renderer.prepare({proportions:{head:.85+i*.01}}));
  await assert.rejects(renderer.warm(pawns.map(pawn=>({pawn,directions:DIRECTIONS}))),/capacity/);
  assert.equal(renderer.stats().builds,0);
  const controller=new AbortController();controller.abort();
  await assert.rejects(renderer.warm([pawns[0]],{signal:controller.signal}),{name:'AbortError'});
  await renderer.warm([pawns[0]]);renderer.clear();assert.equal(renderer.stats().bytes,0);
  renderer.draw(ctx,pawns[0],{x:0,y:0});assert.equal(renderer.stats().builds,1);
  await assert.rejects(renderer.warm([pawns[0]],{budgetMs:0}),/budget/);
  assert.throws(()=>renderer.draw(ctx,pawns[0],{x:0,y:0,direction:'constructor'}),/direction/);
  renderer.dispose();assert.throws(()=>renderer.draw(ctx,pawns[0],{x:0,y:0}),/disposed/);
}));

test('the compatibility drawing path still observes mutable input changes',()=>withCanvas(ctx=>{
  const renderer=createPawnRenderer(),look={hair:'short'};
  renderer.drawAppearance(ctx,look,{x:0,y:0});look.hair='long';renderer.drawAppearance(ctx,look,{x:0,y:0});
  assert.equal(renderer.stats().builds,2);renderer.dispose();
}));

test('warm-up cooperatively cancels and detects a cache reset between batches',()=>withCanvas(async()=>{
  const renderer=createPawnRenderer(),pawn=renderer.prepare({});
  const controller=new AbortController();
  await assert.rejects(renderer.warm([{pawn,directions:DIRECTIONS}],{budgetMs:Number.MIN_VALUE,signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
  renderer.clear();
  await assert.rejects(renderer.warm([{pawn,directions:DIRECTIONS}],{budgetMs:Number.MIN_VALUE,onProgress:()=>renderer.clear()}),/cache changed/);
  renderer.dispose();
}));

test('prepared drawing avoids cloning/serialization and streaming legacy looks does not leak metadata',()=>withCanvas(async ctx=>{
  const renderer=createPawnRenderer({maxCacheBytes:PAGE_BYTES+SHADOW_BYTES}),pawn=renderer.prepare({});
  await renderer.warm([{pawn,directions:DIRECTIONS}]);
  const clone=globalThis.structuredClone,stringify=JSON.stringify;
  try{
    globalThis.structuredClone=()=>{throw new Error('clone in drawing loop');};
    JSON.stringify=()=>{throw new Error('serialization in drawing loop');};
    for(const direction of DIRECTIONS)renderer.draw(ctx,pawn,{x:0,y:0,direction,state:'walk',progress:.5});
  }finally{globalThis.structuredClone=clone;JSON.stringify=stringify;}
  renderer.release(pawn);
  for(let i=0;i<1000;i++)renderer.drawAppearance(ctx,{proportions:{head:.85+i*.0001}},{x:0,y:0});
  assert.equal(renderer.stats().looks,128);assert.equal(renderer.stats().poses,128);
  renderer.clear();assert.equal(renderer.stats().looks,0);renderer.dispose();
}));
