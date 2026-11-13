import { PAWN_PALETTE } from "./pawn-engine.js";
// Shared, fixed-size art. No per-character canvases, fonts, or particle objects.
export const EFFECT_BYTES = 512 * 512 * 4;
export const REACTIONS = Object.freeze(["happy", "love", "angry", "confused", "idea", "waiting", "sale", "win", "sad", "surprised", "talk", "fresh"]);
export const FANS = Object.freeze([0, 1, 2, 3, 4, 5, 6]);
export const PROPS = Object.freeze({ card: 7, back: 8, box: 9, bag: 10, coin: 11, pack: 12, broom: 13, magnifier: 14, flag: 15, receipt: 16 });
export const BUBBLES = Object.freeze(Object.fromEntries(REACTIONS.map((name, i) => [name, 17 + i])));
export const STINK = 29, CONFETTI = 37, SPARKLE = 45;
export const CLEAN_SWEEP = Object.freeze([13, 53, 54, 55, 56, 57, 58, 59]);
const C = Object.freeze(Object.fromEntries(PAWN_PALETTE.map(({name,color}) => [name.toLowerCase(),color])));
function path(ctx, color, draw, line = 1) {
  ctx.beginPath(); draw(ctx); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = line; ctx.strokeStyle = C.ink; ctx.lineJoin = "round"; ctx.stroke();
}
function line(ctx, draw, width = 1) {
  ctx.beginPath(); draw(ctx); ctx.strokeStyle = C.ink; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.stroke();
}
function rect(ctx, x, y, w, h, color, r = 1.5) { path(ctx, color, c => c.roundRect(x, y, w, h, r)); }
function oval(ctx, x, y, rx, ry, color) { path(ctx, color, c => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)); }
function heart(ctx, x, y, size, color = C.coral) {
  path(ctx, color, c => { c.moveTo(x, y + size); c.bezierCurveTo(x - size * 2, y - size * .1, x - size, y - size, x, y - size * .3); c.bezierCurveTo(x + size, y - size, x + size * 2, y - size * .1, x, y + size); });
}
function star(ctx, x, y, radius, color = C.gold) {
  path(ctx, color, c => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? radius * .45 : radius; if (!i) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } });
}
function card(ctx, front) {
  rect(ctx, -4, -6, 8, 12, front ? C.cream : C.blue, 1.2);
  if (front) { rect(ctx, -2.6, -4.5, 5.2, 5.5, C.teal, .5); line(ctx, c => { c.moveTo(-2, 3); c.lineTo(2, 3); }); }
  else { oval(ctx, 0, 0, 2.2, 3, C.coral); }
}
function fan(ctx, count) {
  for (let i = 0; i < count; i++) {
    ctx.save(); const t = i - (count - 1) / 2;
    ctx.translate(t * 2.8, Math.abs(t) * .5); ctx.rotate(t * .11); card(ctx, false); ctx.restore();
  }
}
function prop(ctx, id) {
  if (id === PROPS.card || id === PROPS.back) card(ctx, id === PROPS.card);
  else if (id === PROPS.box) {
    rect(ctx, -10, -7, 20, 16, C.leather, 2); rect(ctx, -3, -7, 6, 16, C.sand, .5);
    line(ctx, c => { c.moveTo(-10, -2); c.lineTo(10, -2); });
  } else if (id === PROPS.bag) {
    line(ctx, c => { c.moveTo(-4, -5); c.bezierCurveTo(-6, -15, 6, -15, 4, -5); }, 1.5);
    path(ctx, C.cream, c => { c.moveTo(-8, -6); c.lineTo(8, -6); c.lineTo(10, 10); c.quadraticCurveTo(0, 13, -10, 10); });
    heart(ctx, 0, 3, 3);
  } else if (id === PROPS.coin) {
    oval(ctx, 0, 0, 6, 7, C.gold); line(ctx, c => { c.moveTo(0, -4); c.lineTo(0, 4); c.moveTo(2, -2); c.quadraticCurveTo(-4, -4, -2, 0); c.quadraticCurveTo(4, 3, -2, 3); });
  } else if (id === PROPS.pack) {
    rect(ctx, -6, -9, 12, 18, C.lavender, 1); star(ctx, 0, 0, 4, C.gold);
    for (const y of [-7, 7]) line(ctx, c => { c.moveTo(-5, y); c.lineTo(5, y); });
  } else if (id === PROPS.broom) {
    rect(ctx, -1.3, -14, 2.6, 20, C.leather, 1);
    path(ctx, C.gold, c => { c.moveTo(-4, 3); c.lineTo(4, 3); c.lineTo(8, 13); c.quadraticCurveTo(0, 15, -8, 13); });
    for (const x of [-3, 0, 3]) line(ctx, c => { c.moveTo(x * .7, 6); c.lineTo(x * 1.3, 12); }, .7);
  } else if (id === PROPS.magnifier) {
    rect(ctx, 2, 2, 3, 12, C.leather, 1); oval(ctx, 0, -3, 7, 7, C.sand); oval(ctx, 0, -3, 5, 5, C.blue);
    line(ctx, c => { c.moveTo(-2, -5); c.lineTo(0, -7); }, 1.3);
  } else if (id === PROPS.flag) {
    rect(ctx, -6, -12, 2, 26, C.leather, 1);
    path(ctx, C.coral, c => { c.moveTo(-4, -11); c.quadraticCurveTo(5, -14, 11, -8); c.lineTo(9, 0); c.quadraticCurveTo(3, -5, -4, -2); });
    star(ctx, 3, -7, 2, C.cream);
  } else {
    path(ctx, C.ivory, c => { c.moveTo(-6, -12); c.lineTo(6, -12); c.lineTo(6, 10); c.lineTo(3, 12); c.lineTo(0, 10); c.lineTo(-3, 12); c.lineTo(-6, 10); });
    for (const y of [-6, -1, 4]) line(ctx, c => { c.moveTo(-3, y); c.lineTo(3, y); }, .8);
  }
}
function face(ctx, kind) {
  oval(ctx, 0, -2, 8, 8, kind === "angry" ? C.coral : C.gold);
  if (kind === "sad") {
    for (const x of [-3, 3]) oval(ctx, x, -2, .8, 1.2, C.ink);
    line(ctx, c => { c.moveTo(-3, 3); c.quadraticCurveTo(0, -1, 3, 3); }); oval(ctx, 5, 2, 1, 1.8, C.blue);
  } else if (kind === "surprised") {
    for (const x of [-3, 3]) oval(ctx, x, -4, .8, 1.2, C.ink); oval(ctx, 0, 1, 1.5, 2, C.ink);
  } else {
    for (const x of [-3, 3]) {
      if (kind === "happy") line(ctx, c => { c.moveTo(x - 1.2, -3); c.quadraticCurveTo(x, -5, x + 1.2, -3); });
      else { oval(ctx, x, -2, .7, 1, C.ink); line(ctx, c => { c.moveTo(x - 1, x < 0 ? -5 : -4); c.lineTo(x + 1, x < 0 ? -4 : -5); }); }
    }
    line(ctx, c => { c.moveTo(-3, 1); c.quadraticCurveTo(0, kind === "angry" ? -1 : 5, 3, 1); });
  }
}
function bubble(ctx, kind) {
  path(ctx, C.ivory, c => {
    c.moveTo(-6, -14); c.lineTo(6, -14); c.quadraticCurveTo(14, -14, 14, -7); c.lineTo(14, 2);
    c.quadraticCurveTo(14, 9, 6, 9); c.lineTo(3, 9); c.lineTo(0, 14); c.lineTo(-3, 9); c.lineTo(-6, 9);
    c.quadraticCurveTo(-14, 9, -14, 2); c.lineTo(-14, -7); c.quadraticCurveTo(-14, -14, -6, -14);
  }, 1.2);
  if (["happy", "angry", "sad", "surprised"].includes(kind)) face(ctx, kind);
  else if (kind === "love") heart(ctx, 0, -3, 6);
  else if (kind === "confused") {
    line(ctx, c => { c.moveTo(-4, -7); c.bezierCurveTo(-3, -13, 7, -11, 4, -5); c.quadraticCurveTo(0, -3, 0, 0); }, 2); oval(ctx, 0, 4, .8, .8, C.ink);
  } else if (kind === "idea") {
    oval(ctx, 0, -4, 5, 6, C.gold); rect(ctx, -2, 1, 4, 4, C.sand, 1);
    for (let i = 0; i < 5; i++) { const a = Math.PI + i * Math.PI / 4; line(ctx, c => { c.moveTo(Math.cos(a) * 8, -4 + Math.sin(a) * 8); c.lineTo(Math.cos(a) * 10, -4 + Math.sin(a) * 10); }); }
  } else if (kind === "waiting") {
    oval(ctx, 0, -3, 8, 8, C.cream); line(ctx, c => { c.moveTo(0, -9); c.lineTo(0, -3); c.lineTo(4, -1); }, 1.5);
  } else if (kind === "sale") { ctx.save(); ctx.translate(0, -2); prop(ctx, PROPS.coin); ctx.restore(); }
  else if (kind === "win") {
    path(ctx, C.gold, c => { c.moveTo(-6, -10); c.lineTo(6, -10); c.lineTo(4, -2); c.quadraticCurveTo(0, 3, -4, -2); });
    line(ctx, c => { c.moveTo(-6, -8); c.bezierCurveTo(-13, -10, -10, 0, -4, -2); c.moveTo(6, -8); c.bezierCurveTo(13, -10, 10, 0, 4, -2); c.moveTo(0, 1); c.lineTo(0, 5); c.moveTo(-4, 5); c.lineTo(4, 5); }, 1.4);
  } else if (kind === "fresh") { star(ctx, -3, -4, 6, C.mint); star(ctx, 6, 2, 3, C.gold); }
  else for (const x of [-6, 0, 6]) oval(ctx, x, -3, 1.5, 1.5, C.ink);
}
function smell(ctx, frame) {
  for (let i = 0; i < 3; i++) {
    const t = (frame / 8 + i / 3) % 1, x = (i - 1) * 8 + Math.sin(t * Math.PI * 2) * 2;
    ctx.save(); ctx.globalAlpha = Math.sin(t * Math.PI) * .75;
    const y = 10 - t * 16;
    path(ctx, i % 2 ? C.mint : C.leaf, c => { c.moveTo(x - 2, y + 2); c.bezierCurveTo(x - 7, y - 2, x + 6, y - 4, x + 1, y - 9); c.bezierCurveTo(x + 10, y - 3, x - 3, y, x + 3, y + 5); }, .8);
    ctx.restore();
  }
}
function burst(ctx, frame, confetti) {
  const t = frame / 8;
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7, radius = 2 + t * 12;
    ctx.save(); ctx.globalAlpha = 1 - t * .8; ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius + t * t * 4); ctx.rotate(a + t);
    if (confetti) rect(ctx, -1, -2, 2, 4, [C.coral, C.gold, C.teal, C.lavender][i % 4], .5);
    else star(ctx, 0, 0, 2.5 - t, i % 2 ? C.mint : C.gold);
    ctx.restore();
  }
}
export function createPawnEffects() {
  let canvas = null, closed = false, builds = 0;
  function warm() {
    if (closed) throw new Error("Effects have been disposed.");
    if (canvas) return;
    canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const paint = (id, draw) => {
      ctx.save(); ctx.translate(id % 8 * 64, Math.floor(id / 8) * 64); ctx.beginPath(); ctx.rect(0, 0, 64, 64); ctx.clip();
      ctx.scale(2, 2); ctx.translate(16, 16); draw(ctx); ctx.restore();
    };
    for (let i = 0; i < 7; i++) paint(i, c => fan(c, i + 1));
    for (const id of Object.values(PROPS)) if (id !== PROPS.broom) paint(id, c => { if (id === PROPS.magnifier) c.rotate(-.25); prop(c, id); });
    for (const [frame,id] of CLEAN_SWEEP.entries()) paint(id,c=>{c.rotate(Math.sin(frame/8*Math.PI*2)*.35);c.scale(.9,.9);prop(c,PROPS.broom);});
    for (const name of REACTIONS) paint(BUBBLES[name], c => bubble(c, name));
    for (let i = 0; i < 8; i++) { paint(STINK + i, c => smell(c, i)); paint(CONFETTI + i, c => burst(c, i, true)); paint(SPARKLE + i, c => burst(c, i, false)); }
    builds++;
  }
  return {
    warm,
    draw(ctx, id, x, y, scale = 1, angle = 0, alpha = 1, stretchX = 1) {
      warm();
      if (angle === 0 && alpha === 1 && stretchX > 0) {
        ctx.drawImage(canvas, id % 8 * 64, Math.floor(id / 8) * 64, 64, 64, x - 16 * scale * stretchX, y - 16 * scale, 32 * scale * stretchX, 32 * scale); return;
      }
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(angle); ctx.scale(stretchX, 1);
      ctx.drawImage(canvas, id % 8 * 64, Math.floor(id / 8) * 64, 64, 64, -16 * scale, -16 * scale, 32 * scale, 32 * scale); ctx.restore();
    },
    drawProjected(ctx, id, x, y, scale, projection, blend = 1) {
      warm();
      ctx.save(); ctx.translate(x, y);
      ctx.transform(1 + (projection.a - 1) * blend, projection.b * blend, projection.c * blend, 1 + (projection.d - 1) * blend, 0, 0);
      ctx.drawImage(canvas, id % 8 * 64, Math.floor(id / 8) * 64, 64, 64, -16 * scale, -16 * scale, 32 * scale, 32 * scale);
      ctx.restore();
    },
    stats: () => ({ bytes: canvas ? EFFECT_BYTES : 0, builds }),
    dispose() { if (canvas) canvas.width = canvas.height = 0; canvas = null; closed = true; },
  };
}
