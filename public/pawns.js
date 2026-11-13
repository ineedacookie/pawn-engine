import { ANIMATION, createPawnRenderer, preparePawn, releasePawn, drawPreparedPawn, PAWN_PALETTE, CLASS_PRESETS, DIRECTIONS, PAWN_DEFAULTS, PAWN_OPTIONS, atlasMetadata, createAtlas, directionFromVector, normalizeAppearance } from "/pawn-engine.js";
const $ = (s) => document.querySelector(s), copy = (v) => structuredClone(v);
let appearance = copy(PAWN_DEFAULTS), pawn = null, state = "idle", paused = false, frame = 0, last = performance.now(), move = { x: 320, y: 270, facing: "south", distance: 0 }, keys = new Set(), seed = 27, perfOn = false, perfLast = 0, perfFrames = 0, perfRate = 0;
for(const swatch of PAWN_PALETTE){const chip=document.createElement('span');chip.style.backgroundColor=swatch.color;chip.title=swatch.name;chip.setAttribute('aria-label',swatch.name);chip.setAttribute('role','img');$('#palette-key').append(chip);}
for(const select of document.querySelectorAll('[data-color]')){
  for(const swatch of PAWN_PALETTE){const option=document.createElement('option');option.value=swatch.color;option.textContent=swatch.name;select.append(option);}
}
for (const el of document.querySelectorAll("[data-part]")) {
  el.replaceChildren(...PAWN_OPTIONS[el.dataset.part].map(value => {
    const option = document.createElement("option"); option.value = value;
    option.textContent = ({sidepart:"Side part",braid:"Single braid",undercut:"Shaved side",mohawk:"Mohawk",spiky:"Spiky",bow:el.dataset.part==="hat"?"Hair bow":"Bow",pixie:"Pixie crop",ponytail:"Ponytail",shoulder:"Crossbody satchel",hood:"Headscarf",sunhat:"Sun hat",greathelm:"Knight helmet",rangerhood:"Ranger hood",wizard:"Wizard hat",monk:"Monk robe",tabard:"Knight tabard",quiver:"Arrow quiver",sword:"Sheathed sword"})[value] || value[0].toUpperCase()+value.slice(1);
    return option;
  }));
}
for(const key of Object.keys(CLASS_PRESETS)){const option=document.createElement("option");option.value=key;option.textContent=key[0].toUpperCase()+key.slice(1);$("#class-preset").append(option);}
$("#class-preset").addEventListener("change",e=>{const preset=CLASS_PRESETS[e.target.value];if(preset){const key=e.target.value;setAppearance({...appearance,...preset,colors:{...appearance.colors,...preset.colors}});e.target.value=key;}});
const gallery = $("#gallery");
for (const direction of DIRECTIONS) { const cell = document.createElement("div"); cell.className = "angle"; const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 80; canvas.dataset.direction = direction; const label = document.createElement("small"); label.textContent = direction.replaceAll("-", " "); cell.append(canvas, label); gallery.append(cell); }
function syncControls() { document.querySelectorAll("[data-color]").forEach((el) => { el.value = appearance.colors[el.dataset.color]; document.querySelector(`[data-swatch="${el.dataset.color}"]`).style.backgroundColor = el.value; }); document.querySelectorAll("[data-part]").forEach((el) => el.value = appearance[el.dataset.part]); document.querySelectorAll("[data-size]").forEach((el) => { el.value = Math.round(appearance.proportions[el.dataset.size] * 100); $(`[data-output=${el.dataset.size}]`).value = `${el.value}%`; }); }
function setAppearance(next) { appearance = normalizeAppearance(next); $("#class-preset").value=""; localStorage.setItem("pawn-engine-look", JSON.stringify(appearance)); if(pawn)releasePawn(pawn);pawn=preparePawn(appearance);syncControls(); }
function paint(ctx, canvas, x, y, dir, anim, progress, scale = 1) { ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, canvas.width / scale, canvas.height / scale); drawPreparedPawn(ctx, pawn, { x, y, direction: dir, state: anim, progress }); }
function render(now = performance.now()) {
  const elapsed = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  if (!paused) frame = (frame + elapsed * ANIMATION[state].fps) % ANIMATION[state].frames;
  const phase = frame / ANIMATION[state].frames;
  const hero = $("#hero"), hctx = hero.getContext("2d"); hctx.clearRect(0, 0, hero.width, hero.height); hctx.fillStyle = "#f4ead5"; hctx.fillRect(0, 0, hero.width, hero.height); hctx.fillStyle = "#f3dfbd"; hctx.fillRect(0, 245, 256, 75); paint(hctx, hero, 32, 72, "south", state, phase, 4);
  document.querySelectorAll(".angle canvas").forEach((c) => paint(c.getContext("2d"), c, 32, 72, c.dataset.direction, state, phase));
  $("#frame-label").textContent = `Frame ${Math.floor(frame) + 1} / ${ANIMATION[state].frames}`;
  drawArena(elapsed, now); if (perfOn) drawPerf(now); requestAnimationFrame(render);
}
function drawArena(dt, now) {
  const c = $("#arena"), ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#f4ead5"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#f3dfbd"; ctx.lineWidth = 1; for (let x=0;x<c.width;x+=32) for(let y=0;y<c.height;y+=32){ctx.strokeRect(x,y,32,32);}
  const obstacles = [{x:180,y:90,w:95,h:42},{x:390,y:190,w:110,h:46},{x:95,y:252,w:70,h:35}];
  for (const o of obstacles) { ctx.fillStyle="#a77250";ctx.fillRect(o.x,o.y,o.w,o.h);ctx.fillStyle="#c88768";ctx.fillRect(o.x+3,o.y+3,o.w-6,o.h-8); }
  let dx=(keys.has("ArrowRight")||keys.has("d")?1:0)-(keys.has("ArrowLeft")||keys.has("a")?1:0), dy=(keys.has("ArrowDown")||keys.has("s")?1:0)-(keys.has("ArrowUp")||keys.has("w")?1:0), walking=!!(dx||dy);
  if(walking){const len=Math.hypot(dx,dy);dx/=len;dy/=len;move.facing=directionFromVector(dx,dy,move.facing);const speed=105, nx=move.x+dx*speed*dt,ny=move.y+dy*speed*dt;const collides=(x,y)=>x<13||x>c.width-13||y<12||y>c.height-5||obstacles.some(o=>{const px=Math.max(o.x,Math.min(x,o.x+o.w)),py=Math.max(o.y,Math.min(y,o.y+o.h));return (x-px)**2+(y-py)**2<11**2;});if(!collides(nx,move.y))move.x=nx;if(!collides(move.x,ny))move.y=ny;move.distance+=speed*dt/48;}
  obstacles.sort((a,b)=>a.y+a.h-(b.y+b.h)); for(const o of obstacles) if(o.y+o.h<move.y){ctx.fillStyle="#684b44";ctx.fillRect(o.x,o.y+o.h-3,o.w,5);}
  drawPreparedPawn(ctx,pawn,{x:move.x,y:move.y,direction:move.facing,state:walking?"walk":"idle",progress:walking?move.distance:now/500});
  for(const o of obstacles)if(o.y+o.h>=move.y){ctx.fillStyle="#684b44";ctx.fillRect(o.x,o.y+o.h-3,o.w,5);}
}
let perfPawns=[],perfRenderer=null,perfAbort=null,perfReady=false,perfLoadMs=0,perfTimes=[],perfLastNow=0,perfLastBuilds=0;
async function initPerf(){
  perfAbort?.abort();perfRenderer?.dispose();
  const abort=new AbortController();perfAbort=abort;perfReady=false;perfRate=0;perfTimes=[];perfFrames=0;perfLast=0;perfLastNow=0;
  const count=Number($("#perf-count").value),allDirections=$("#perf-directions").value==="all";
  const renderer=createPawnRenderer({maxCacheBytes:(count>500&&allDirections?192:96)*1048576});perfRenderer=renderer;
  const started=performance.now();let seed=12345;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  perfPawns=Array.from({length:count},(_,i)=>{
    const pawn=renderer.prepare({...appearance,hair:PAWN_OPTIONS.hair[i%PAWN_OPTIONS.hair.length],hat:PAWN_OPTIONS.hat[Math.floor(i/PAWN_OPTIONS.hair.length)%PAWN_OPTIONS.hat.length],colors:{...appearance.colors,clothes:PAWN_PALETTE[Math.floor(i/(PAWN_OPTIONS.hair.length*PAWN_OPTIONS.hat.length))%PAWN_PALETTE.length].color}});
    return {pawn,x:18+random()*604,y:70+random()*270,phase:random(),dir:DIRECTIONS[i%8]};
  });
  try{
    await renderer.warm(perfPawns.map(p=>({pawn:p.pawn,directions:allDirections?DIRECTIONS:[p.dir]})),{signal:abort.signal,budgetMs:4,onProgress:({completed,total})=>{$("#perf-label").textContent=`Preparing ${completed} / ${total} poses…`;}});
    if(abort.signal.aborted)return;
    perfLoadMs=performance.now()-started;perfReady=true;perfLastBuilds=renderer.stats().builds;
  }catch(error){if(!abort.signal.aborted){$("#perf-label").textContent=error.message;perfOn=false;$("#perf-toggle").textContent="Start test";}}
}
function drawPerf(now){
  if(!perfReady)return;
  const c=$("#perf"),ctx=c.getContext("2d"),start=performance.now();ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#f4ead5";ctx.fillRect(0,0,c.width,c.height);
  const dt=perfLastNow?Math.min((now-perfLastNow)/1000,.05):0;perfLastNow=now;
  const turn=$("#perf-directions").value==="all"?Math.floor(now/1800)%8:0;
  for(let i=0;i<perfPawns.length;i++){
    const p=perfPawns[i];p.x+=Math.sin(now/1200+p.phase)*dt*14;p.y+=Math.cos(now/1600+p.phase)*dt*9;
    perfRenderer.draw(ctx,p.pawn,{x:p.x,y:p.y,direction:DIRECTIONS[(i+turn)%8],state:"walk",progress:now/1000+p.phase});
  }
  perfTimes.push(performance.now()-start);if(perfTimes.length>300)perfTimes.shift();
  if(!perfLast)perfLast=now;perfFrames++;
  if(now-perfLast>=1000){
    perfRate=perfFrames*1000/(now-perfLast);perfFrames=0;perfLast=now;
    const sorted=[...perfTimes].sort((a,b)=>a-b),p95=sorted[Math.floor((sorted.length-1)*.95)],stats=perfRenderer.stats();
    const measurement={count:perfPawns.length,uniqueLooks:stats.looks,fps:perfRate,p95DrawMs:p95,memoryMiB:stats.bytes/1048576,builds:stats.builds,buildsSinceWarm:stats.builds-perfLastBuilds,evictions:stats.evictions,loadMs:perfLoadMs,poses:stats.poses,allDirections:$("#perf-directions").value==="all",userAgent:navigator.userAgent};
    $("#perf-label").textContent=`${perfPawns.length} unique looks · ${perfRate.toFixed(0)} fps · p95 draw ${p95.toFixed(2)} ms · ${(stats.bytes/1048576).toFixed(1)} MiB · ${measurement.buildsSinceWarm} poses built during play · ${perfLoadMs.toFixed(0)} ms warm-up`;
    $("#perf-label").dataset.measurement=JSON.stringify(measurement);
  }
}
document.querySelectorAll("[data-color]").forEach((el)=>el.addEventListener("change",()=>setAppearance({...appearance,colors:{...appearance.colors,[el.dataset.color]:el.value}})));
document.querySelectorAll("[data-part]").forEach((el)=>el.addEventListener("change",()=>setAppearance({...appearance,[el.dataset.part]:el.value})));
document.querySelectorAll("[data-size]").forEach((el)=>el.addEventListener("input",()=>{const proportions={...appearance.proportions,[el.dataset.size]:Number(el.value)/100};setAppearance({...appearance,proportions});}));
document.querySelectorAll("[data-state]").forEach((el)=>el.addEventListener("click",()=>{state=el.dataset.state;frame=0;document.querySelectorAll("[data-state]").forEach(b=>b.classList.toggle("active",b===el));}));
$("#pause").addEventListener("click",e=>{paused=!paused;e.currentTarget.textContent=paused?"Play":"Pause";});$("#step").addEventListener("click",()=>{paused=true;frame=(Math.floor(frame)+1)%ANIMATION[state].frames;});
$("#reset").addEventListener("click",()=>{seed=27;setAppearance(PAWN_DEFAULTS);});$("#randomize").addEventListener("click",()=>{let n=++seed,rand=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};const choose=(arr)=>arr[Math.floor(rand()*arr.length)];setAppearance({...PAWN_DEFAULTS,expression:choose(PAWN_OPTIONS.expression),hair:choose(PAWN_OPTIONS.hair),outfit:choose(PAWN_OPTIONS.outfit),hat:choose(PAWN_OPTIONS.hat),bag:choose(PAWN_OPTIONS.bag),back:choose(PAWN_OPTIONS.back),belt:choose(PAWN_OPTIONS.belt),colors:Object.fromEntries(Object.keys(PAWN_DEFAULTS.colors).map(k=>[k,choose({skin:["#e7b28e","#f3dfbd","#9c624d","#c88768","#684b44"],hair:["#533b37","#533b37","#9c624d","#c88768","#587d62"],clothes:["#79a76b","#e48378","#829bc5","#c18ab4","#f0ca67","#589b91"],accent:["#f0ca67","#e48378","#a48ab8","#829bc5"],shoes:["#684b44","#56505c"],bag:["#a77250","#9c624d","#c88768"],metal:["#a9bbc3","#a9bbc3","#7c8b96"]}[k])])),proportions:{height:.85+rand()*.3,head:.85+rand()*.3,width:.8+rand()*.4}});});
$("#export-json").addEventListener("click",()=>download("pawn-look.json",JSON.stringify(appearance,null,2),"application/json"));$("#import-json").addEventListener("click",()=>$("#json-file").click());$("#json-file").addEventListener("change",async e=>{try{setAppearance(JSON.parse(await e.target.files[0].text()));}catch(err){alert(`Could not import appearance: ${err.message}`);}e.target.value="";});
$("#export-atlas").addEventListener("click",()=>{const scale=Number($("#export-scale").value),atlas=createAtlas(appearance,scale),metadata=atlasMetadata(appearance,scale);atlas.toBlob(blob=>{download("pawn-atlas.png",blob,"image/png");download("pawn-atlas.json",JSON.stringify(metadata,null,2),"application/json");});});
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("#perf-toggle").addEventListener("click",e=>{perfOn=!perfOn;e.currentTarget.textContent=perfOn?"Stop test":"Start test";if(perfOn)initPerf();else{perfAbort?.abort();perfRenderer?.dispose();perfRenderer=null;perfReady=false;perfPawns=[];$("#perf").getContext("2d").clearRect(0,0,640,360);$("#perf-label").textContent="Prepared poses · bounded shared texture pages";delete $("#perf-label").dataset.measurement;}});
for(const id of ["perf-count","perf-directions"])$("#"+id).addEventListener("change",()=>{if(perfOn)initPerf();});

const validKeys=new Set(["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","w","a","s","d"]);window.addEventListener("keydown",e=>{if(validKeys.has(e.key)&&!e.target.matches("input,select,textarea,button")){e.preventDefault();keys.add(e.key);}});window.addEventListener("keyup",e=>keys.delete(e.key));window.addEventListener("blur",()=>keys.clear());
try{const saved=localStorage.getItem("pawn-engine-look");if(saved)appearance=normalizeAppearance(JSON.parse(saved));}catch{localStorage.removeItem("pawn-engine-look");}pawn=preparePawn(appearance);syncControls();requestAnimationFrame(render);
