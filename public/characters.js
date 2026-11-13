import { runCharacterChecks } from "./character-checks.js";
import { createPawnCharacters, CHARACTER_ACTIONS, REACTIONS } from "./pawn-character.js";
import { DIRECTIONS, EXPRESSIONS, PAWN_DEFAULTS, PAWN_OPTIONS, PAWN_PALETTE, CLASS_PRESETS, normalizeAppearance } from "./pawn-engine.js";
const $ = selector => document.querySelector(selector);
const cast = createPawnCharacters(), table = { x: 240, y: 148, ux: 58, uy: 29, vx: -45, vy: 22.5 }, placed = [], keys = new Set();
let appearance = workshopLook(), paused = false, last = performance.now(), opponentTimer = 0, reportTime = 0;
function workshopLook() { try { return normalizeAppearance(JSON.parse(localStorage.getItem("pawn-engine-look")) || PAWN_DEFAULTS); } catch { return normalizeAppearance(); } }
function options(select, values, label = value => value.replaceAll("-", " ")) {
  for (const value of values) { const option = document.createElement("option"); option.value = value; option.textContent = label(value); select.append(option); }
}
options($("#class"), Object.keys(CLASS_PRESETS)); options($("#hair"), PAWN_OPTIONS.hair); options($("#hat"), PAWN_OPTIONS.hat);
options($("#direction"), DIRECTIONS); options($("#expression"), EXPRESSIONS);
options($("#action"), Object.keys(CHARACTER_ACTIONS), value => CHARACTER_ACTIONS[value].label);
$("#verify").addEventListener("click", async () => {
  const button=$("#verify"), status=$("#verify-status");button.disabled=true;
  try { const result=await runCharacterChecks({onProgress:({completed,total})=>{status.textContent=`Checking ${completed} / ${total} character cases…`;}});status.textContent=`${result.checks-result.failed} / ${result.checks} action / attachment checks passed`;status.dataset.result=JSON.stringify(result); }
  catch(error){status.textContent=error.message;status.dataset.result=JSON.stringify({error:error.message});}
  finally{button.disabled=false;}
});
const player = cast.create(appearance, { posture: "seated", direction: "north-east", onActionComplete: completed });
const opponent = cast.create({ ...CLASS_PRESETS.bard, hair: "curly" }, { posture: "seated", direction: "south-west", onActionComplete: completed });
player.act("hold-cards"); opponent.act("hold-cards"); $("#action").value = "hold-cards"; $("#direction").value = "north-east";
const previews = DIRECTIONS.map(direction => {
  const cell = document.createElement("div"), canvas = document.createElement("canvas"), label = document.createElement("small");
  cell.className = "angle"; canvas.width = 128; canvas.height = 196; canvas.setAttribute("aria-label", `Action facing ${direction}`);
  label.textContent = direction.replaceAll("-", " "); cell.append(canvas, label); $("#angles").append(cell);
  return { canvas, character: cast.create(appearance, { x: 64, y: 165, direction, posture: "seated" }).act("hold-cards") };
});
function faceVector(character) {
  const angle = DIRECTIONS.indexOf(character.direction) * Math.PI / 4;
  return { x: -Math.sin(angle), y: Math.cos(angle) };
}
const projection = Object.freeze({ a: .894427, b: .447214, c: -.894427, d: .447214 });
function surface(u, v) { return { x: table.x + u * table.ux + v * table.vx, y: table.y + u * table.uy + v * table.vy }; }
function seatPoint(character) {
  const facing = faceVector(character), dx = -facing.x, dy = -facing.y;
  const det = table.ux * table.vy - table.uy * table.vx;
  const u = (dx * table.vy - dy * table.vx) / det, v = (dy * table.ux - dx * table.uy) / det;
  const magnitude = Math.max(Math.abs(u), Math.abs(v));
  return { u: u / magnitude * .9, v: v / magnitude * .9 };
}
function seat(character) {
  const edge = seatPoint(character), mount = surface(edge.u, edge.v), rig = character.layout();
  const targetLift = character.posture === "seated" ? 6 * character.appearance.proportions.height : 0;
  character.teleport(character.x + mount.x - rig.heldX, character.y + mount.y - rig.heldY + targetLift - rig.lift);
}
function target(character) { const edge = seatPoint(character); return { ...surface(-edge.u * .3, -edge.v * .3), projection }; }
function completed(action, character, landing) {
  if (action === "play-card") { placed.push({ ...(landing || target(character)), scale: character.layout().propScale }); if (placed.length > 8) placed.shift(); }
  if (action === "open-pack") character.react("win");
}
function sync() {
  $("#hair").value = appearance.hair; $("#hat").value = appearance.hat;
  for (const key of ["height", "head", "width"]) { $("#" + key).value = Math.round(appearance.proportions[key] * 100); $("#" + key + "-value").value = $("#" + key).value + "%"; }
}
function applyLook(next) {
  appearance = normalizeAppearance(next); player.setAppearance(appearance);
  for (const { character } of previews) character.setAppearance(appearance);
  seat(player); sync(); cast.warm([player, ...previews.map(p => p.character)]).catch(error => { $("#cache").textContent = error.message; });
}
function perform() {
  const action = $("#action").value, cardCount = Number($("#cards").value);
  player.act(action, { cardCount, target: target(player) });
  for (const { character } of previews) character.act(action, { cardCount });
}
for (const key of ["height", "head", "width"]) $("#" + key).addEventListener("input", () => applyLook({ ...appearance, proportions: { ...appearance.proportions, [key]: Number($("#" + key).value) / 100 } }));
for (const key of ["hair", "hat"]) $("#" + key).addEventListener("change", () => applyLook({ ...appearance, [key]: $("#" + key).value }));
$("#class").addEventListener("change", () => { const preset = CLASS_PRESETS[$("#class").value]; applyLook(preset ? { ...appearance, ...preset, colors: { ...appearance.colors, ...preset.colors } } : workshopLook()); });
$("#restore").addEventListener("click", () => { $("#class").value = ""; applyLook(workshopLook()); });
$("#direction").addEventListener("change", () => { player.face($("#direction").value); opponent.face(DIRECTIONS[(DIRECTIONS.indexOf(player.direction) + 4) % 8]); seat(player); seat(opponent); });
$("#posture").addEventListener("change", () => { player.setPosture($("#posture").value); for (const { character } of previews) character.setPosture(player.posture); seat(player); });
$("#action").addEventListener("change", perform); $("#cards").addEventListener("change", perform); $("#replay").addEventListener("click", perform);
$("#expression").addEventListener("change", () => { player.expression = $("#expression").value; for (const { character } of previews) character.expression = player.expression; });
$("#stinky").addEventListener("change", () => { player.setStatus("stinky", $("#stinky").checked); for (const { character } of previews) character.setStatus("stinky", player.stinky); });
$("#freshen").addEventListener("click", () => { $("#stinky").checked = false; player.setStatus("stinky", false).react("fresh"); for (const { character } of previews) character.setStatus("stinky", false).react("fresh"); });
for (const kind of REACTIONS) { const button = document.createElement("button"); button.textContent = kind; button.addEventListener("click", () => { player.react(kind); for (const { character } of previews) character.react(kind); }); $("#reactions").append(button); }
$("#pause").addEventListener("click", () => { paused = !paused; $("#pause").textContent = paused ? "Resume" : "Pause"; });
$("#step").addEventListener("click", () => { paused = true; $("#pause").textContent = "Resume"; update(1 / 12); });
const validKeys = new Set(["w", "a", "s", "d", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]);
window.addEventListener("keydown", e => { if (validKeys.has(e.key) && !e.target.matches("input,select,textarea,button")) { keys.add(e.key); e.preventDefault(); } });
window.addEventListener("keyup", e => keys.delete(e.key)); window.addEventListener("blur", () => keys.clear());
function update(dt) {
  let dx = (keys.has("d") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("a") || keys.has("ArrowLeft") ? 1 : 0);
  let dy = (keys.has("s") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("w") || keys.has("ArrowUp") ? 1 : 0);
  const length = Math.hypot(dx, dy); if (length) { dx *= 55 * dt / length; dy *= 55 * dt / length; $("#posture").value = "standing"; }
  dx = Math.max(30, Math.min(450, player.x + dx)) - player.x; dy = Math.max(85, Math.min(255, player.y + dy)) - player.y;
  player.update(dt, dx, dy); if(length)$("#direction").value=player.direction; opponent.update(dt); for (const { character } of previews) character.update(dt);
  opponentTimer += dt; if (opponentTimer > 4) { opponentTimer %= 4; opponent.act("play-card", { target: target(opponent) }); }
}
function roundRect(ctx, x, y, w, h, color, r = 3) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "#000000"; ctx.lineWidth = 1.2; ctx.stroke(); }
function chair(ctx, character) {
  const r = character.layout(), width = character.appearance.proportions.width;
  roundRect(ctx, r.floorX - 10 * width, r.floorY - 8, 3, 10, "#a77250", 1);
  roundRect(ctx, r.floorX + 7 * width, r.floorY - 8, 3, 10, "#a77250", 1);
  roundRect(ctx, r.floorX - 13 * width, r.floorY - 10, 26 * width, 6, "#d8b68c", 2);
}
function polygon(ctx, points, color) {
  ctx.beginPath(); points.forEach((p,i)=>{if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();
  ctx.fillStyle=color;ctx.fill();ctx.strokeStyle="#000000";ctx.lineWidth=1.2;ctx.lineJoin="round";ctx.stroke();
}
function panel(ctx, u0, v0, u1, v1, color) { polygon(ctx,[surface(u0,v0),surface(u1,v0),surface(u1,v1),surface(u0,v1)],color); }
function drawTable(ctx) {
  const top=surface(-1,-1),right=surface(1,-1),bottom=surface(1,1),left=surface(-1,1);
  polygon(ctx,[left,bottom,{x:bottom.x,y:bottom.y+6},{x:left.x,y:left.y+6}],"#a77250");
  polygon(ctx,[bottom,right,{x:right.x,y:right.y+6},{x:bottom.x,y:bottom.y+6}],"#9c624d");
  polygon(ctx,[top,right,bottom,left],"#d8b68c");
  panel(ctx,-.86,-.8,-.07,.8,"#589b91");panel(ctx,.07,-.8,.86,.8,"#829bc5");
  for(const card of placed){ctx.save();ctx.transform(projection.a,projection.b,projection.c,projection.d,card.x,card.y);ctx.scale(card.scale,card.scale);roundRect(ctx,-4,-6,8,12,"#f3dfbd",1.2);roundRect(ctx,-2.6,-4.5,5.2,5.5,"#589b91",.5);ctx.restore();}
}
function renderScene() {
  const canvas = $("#stage"), ctx = canvas.getContext("2d"); ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.fillStyle = "#f3dfbd"; ctx.fillRect(0, 0, 480, 270); ctx.strokeStyle = "#d8b68c"; ctx.lineWidth = .5;
  for (let y = 22; y < 270; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(480, y); ctx.stroke(); }
  for(const [u,v]of [[-.85,-.85],[.85,-.85],[-.85,.85],[.85,.85]]){const p=surface(u,v);roundRect(ctx,p.x-2.5,p.y+2,5,24,"#a77250",1.5);}
  if (player.posture === "seated") chair(ctx, player); if (opponent.posture === "seated") chair(ctx, opponent);
  const actors = [player, opponent].sort((a, b) => a.y - b.y), far = actors.filter(c => c.y < table.y+24), near = actors.filter(c => c.y >= table.y+24);
  for (const character of far) character.draw(ctx, { foreground: false });
  drawTable(ctx); for (const character of far) character.drawForeground(ctx);
  for (const character of near) character.draw(ctx);
  for (const character of actors) character.drawOverhead(ctx);
  for (const { canvas, character } of previews) { const c = canvas.getContext("2d"); c.clearRect(0, 0, canvas.width, canvas.height); character.draw(c); character.drawOverhead(c); }
}
let crowdCast = null, crowd = [], crowdReady = false, crowdAbort = null, crowdStart = 0, crowdFrames = 0, crowdTimes = [], crowdWarm = null, crowdRunSeconds = 0, crowdScale = 1, crowdAllDirections = false;
async function startCrowd() {
  const abort = new AbortController(); crowdAbort = abort; crowdCast = createPawnCharacters({ maxCacheBytes: 192 * 1048576 }); crowdReady = false;
  crowdFrames = 0; crowdTimes = []; crowdStart = 0; crowdRunSeconds = 0;
  crowdScale=Number($("#crowd-scale").value);crowdAllDirections=$("#crowd-facing").value==="all";
  const count=Number($("#crowd-count").value), rows=Math.ceil(count/40), worldWidth=960/crowdScale, worldHeight=540/crowdScale;
  crowd = Array.from({ length: count }, (_, i) => {
    const look = { ...appearance, hair: PAWN_OPTIONS.hair[i % 14], hat: PAWN_OPTIONS.hat[Math.floor(i / 14) % 17], colors: { ...appearance.colors, clothes: PAWN_PALETTE[Math.floor(i / 238) % PAWN_PALETTE.length].color } };
    const character = crowdCast.create(look, { x: 20 + i % 40 * (worldWidth-40)/39, y: 125 + Math.floor(i / 40) * (worldHeight-145) / Math.max(1,rows-1), direction: DIRECTIONS[i % 8], posture: i % 2 ? "standing" : "seated" });
    character.act(["hold-cards", "restock", "browse", "clean"][i % 4]); character.setStatus("stinky", i % 5 === 0); character.react(REACTIONS[i % REACTIONS.length], { duration: 10 });
    return character;
  });
  const start = performance.now();
  try { await crowdCast.warm(crowd, { directions:crowdAllDirections?DIRECTIONS:undefined, signal: abort.signal, onProgress: ({ completed, total }) => { $("#crowd-status").textContent = `Preparing ${completed} / ${total} cache slots…`; } }); if (!abort.signal.aborted) { crowdWarm = crowdCast.stats(); crowdWarm.loadMs = performance.now() - start; crowdReady = true; } }
  catch (error) { if (!abort.signal.aborted) $("#crowd-status").textContent = error.message; }
}
$("#crowd-toggle").addEventListener("click", () => {
  if (crowdCast) { crowdAbort.abort(); crowdCast.dispose(); crowdCast = null; crowd = []; crowdReady = false; $("#crowd-toggle").textContent = "Start crowd test"; }
  else { $("#crowd-toggle").textContent = "Stop crowd test"; startCrowd(); }
});
for(const id of ["crowd-count","crowd-scale","crowd-facing"])$("#"+id).addEventListener("change",()=>{
  if(crowdCast){crowdAbort.abort();crowdCast.dispose();crowdCast=null;crowd=[];crowdReady=false;startCrowd();}
});
function drawCrowd(now, dt) {
  if (!crowdReady || !crowdCast) return;
  const ctx = $("#crowd").getContext("2d"), start = performance.now(); ctx.setTransform(crowdScale, 0, 0, crowdScale, 0, 0); ctx.fillStyle = "#f3dfbd"; ctx.fillRect(0, 0, 960/crowdScale, 540/crowdScale);
  crowdRunSeconds += dt;
  for (let i = 0; i < crowd.length; i++) {
    const character = crowd[i]; if(crowdAllDirections)character.direction = DIRECTIONS[(i + Math.floor(crowdRunSeconds / 1.8)) % 8]; character.expression = EXPRESSIONS[(i + crowdFrames) % 5];
    character.update(dt); if (!character.reaction) character.react(REACTIONS[(i + crowdFrames) % REACTIONS.length], { duration: 4 + i % 6 }); character.draw(ctx);
  }
  for (const character of crowd) character.drawOverhead(ctx);
  crowdTimes.push(performance.now() - start); if (crowdTimes.length > 300) crowdTimes.shift(); crowdFrames++;
  if (!crowdStart) crowdStart = now;
  if (now - crowdStart > 1000) {
    const stats = crowdCast.stats(), sorted = [...crowdTimes].sort((a, b) => a - b);
    const result = { count: crowd.length,renderScale:crowdScale,allDirections:crowdAllDirections,elapsedSeconds:crowdRunSeconds,sampleFrames:crowdTimes.length, fps: crowdFrames * 1000 / (now - crowdStart), p95DrawMs: sorted[Math.floor((sorted.length - 1) * .95)], memoryMiB: stats.bytes / 1048576, effectMiB: stats.effectBytes / 1048576, bodyBuilds: stats.builds - crowdWarm.builds, faceBuilds: stats.faceBuilds - crowdWarm.faceBuilds, effectBuilds: stats.effectBuilds - crowdWarm.effectBuilds, evictions: stats.evictions, warmMs: crowdWarm.loadMs };
    $("#crowd-status").textContent = `${result.count.toLocaleString()} unique looks · ${crowdScale}× sprites · ${result.fps.toFixed(0)} fps · p95 ${result.p95DrawMs.toFixed(2)} ms · ${result.memoryMiB.toFixed(1)} MiB · ${result.effectMiB.toFixed(0)} MiB shared effects · ${result.bodyBuilds}/${result.faceBuilds}/${result.effectBuilds} body/face/effect builds during play`;
    $("#crowd-status").dataset.measurement = JSON.stringify(result); crowdFrames = 0; crowdStart = now;
  }
}
function frame(now) {
  const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
  if (!paused) update(dt); renderScene(); if (!paused) drawCrowd(now, dt);
  if (now - reportTime > 250) {
    reportTime = now; const stats = cast.stats(), rig = player.layout();
    $("#action-status").textContent = `${CHARACTER_ACTIONS[player.action].label} · ${player.posture} · ${player.direction} · ${player.cardCount} cards${player.reaction ? " · " + player.reaction : ""}`;
    $("#action-status").dataset.state = JSON.stringify({ action: player.action, progress: player.actionProgress, posture: player.posture, reaction: player.reaction, stinky: player.stinky, direction: player.direction, x: player.x, y: player.y, headX: rig.headX, headY: rig.headY, heldX: rig.heldX, heldY: rig.heldY, topY: rig.topY });
    $("#cache").textContent = `${stats.looks} shared appearances · ${(stats.bytes / 1048576).toFixed(2)} MiB total · ${(stats.effectBytes / 1048576).toFixed(0)} MiB shared props / reactions / effects`;
    $("#cache").dataset.stats = JSON.stringify(stats);
  }
  requestAnimationFrame(frame);
}
seat(player); seat(opponent); sync();
await cast.warm([player, opponent, ...previews.map(p => p.character)]);
$("#verify").disabled=false;$("#crowd-toggle").disabled=false;
requestAnimationFrame(frame);
