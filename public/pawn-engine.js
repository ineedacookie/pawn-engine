const FRAME_WIDTH = 64, FRAME_HEIGHT = 80;
export const DIRECTIONS = Object.freeze(["south", "south-west", "west", "north-west", "north", "north-east", "east", "south-east"]);
export const STATES = Object.freeze(["idle", "walk"]);
export const ANIMATION = Object.freeze({ idle: { frames: 4, fps: 2 }, walk: { frames: 8, fps: 9 } });
export const PAWN_OUTLINE = "#000000";
export const PAWN_PALETTE = Object.freeze([
  Object.freeze({ name: "Ivory", color: "#f4ead5" }),
  Object.freeze({ name: "Cream", color: "#f3dfbd" }),
  Object.freeze({ name: "Sand", color: "#d8b68c" }),
  Object.freeze({ name: "Peach", color: "#e7b28e" }),
  Object.freeze({ name: "Tan", color: "#c88768" }),
  Object.freeze({ name: "Umber", color: "#9c624d" }),
  Object.freeze({ name: "Espresso", color: "#533b37" }),
  Object.freeze({ name: "Cocoa", color: "#684b44" }),
  Object.freeze({ name: "Leather", color: "#a77250" }),
  Object.freeze({ name: "Coral", color: "#e48378" }),
  Object.freeze({ name: "Rose", color: "#c18ab4" }),
  Object.freeze({ name: "Lavender", color: "#a48ab8" }),
  Object.freeze({ name: "Plum", color: "#8575b1" }),
  Object.freeze({ name: "Blue", color: "#829bc5" }),
  Object.freeze({ name: "Navy", color: "#536b85" }),
  Object.freeze({ name: "Teal", color: "#589b91" }),
  Object.freeze({ name: "Mint", color: "#9fbb94" }),
  Object.freeze({ name: "Leaf", color: "#79a76b" }),
  Object.freeze({ name: "Forest", color: "#587d62" }),
  Object.freeze({ name: "Gold", color: "#f0ca67" }),
  Object.freeze({ name: "Rust", color: "#b66f49" }),
  Object.freeze({ name: "Silver", color: "#a9bbc3" }),
  Object.freeze({ name: "Slate", color: "#7c8b96" }),
  Object.freeze({ name: "Charcoal", color: "#56505c" }),
  Object.freeze({ name: "Ink", color: "#000000" }),
]);
const paletteColors = new Set(PAWN_PALETTE.map(swatch=>swatch.color));
export function nearestPaletteColor(value) {
  if(typeof value!=="string" || !/^#[\da-f]{6}$/i.test(value))throw new Error("Use a six digit hex color.");
  if(paletteColors.has(value.toLowerCase()))return value.toLowerCase();
  const rgb=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
  const input=rgb(value);
  let best=PAWN_PALETTE[0].color,distance=Infinity;
  for(const swatch of PAWN_PALETTE){const score=rgb(swatch.color).reduce((sum,channel,index)=>sum+(channel-input[index])**2,0);if(score<distance){distance=score;best=swatch.color;}}
  return best;
}
export const EXPRESSIONS = Object.freeze(["happy", "neutral", "excited", "sleepy", "surprised"]);
export const PAWN_DEFAULTS = Object.freeze({ version: 2, colors: { skin: "#e7b28e", hair: "#533b37", clothes: "#79a76b", accent: "#f0ca67", bag: "#a77250", metal: "#a9bbc3" }, hair: "short", outfit: "tunic", hat: "none", bag: "none", back: "none", belt: "none", proportions: { height: 1, head: 1, width: 1 } });
export const PAWN_OPTIONS = Object.freeze({ hair: ["bald", "short", "sidepart", "pixie", "bob", "long", "wavy", "curly", "bun", "ponytail", "braid", "undercut", "mohawk", "spiky"], outfit: ["tunic", "sweater", "hoodie", "cardigan", "dress", "overalls", "robe", "armor", "chainmail", "monk", "ranger", "tabard"], hat: ["none", "beanie", "beret", "fedora", "sunhat", "hood", "helmet", "greathelm", "wizard", "rangerhood", "circlet", "flower", "bow", "laurel", "crown", "goggles", "bandana"], bag: ["none", "shoulder", "backpack", "pouch", "tote"], back: ["none", "quiver", "sword", "shield", "staff", "bow", "lute"], belt: ["none", "sword", "dagger", "potions", "scroll", "book"] });
export const CLASS_PRESETS = Object.freeze({
  warrior: {outfit:"armor",hat:"none",back:"sword",belt:"dagger",bag:"none",colors:{clothes:"#9c624d",accent:"#c88768",metal:"#a48ab8"}},
  knight: {outfit:"tabard",hat:"greathelm",back:"shield",belt:"sword",bag:"none",colors:{clothes:"#8575b1",accent:"#f0ca67",metal:"#a9bbc3"}},
  monk: {outfit:"monk",hat:"none",hair:"bald",back:"none",belt:"scroll",bag:"none",colors:{clothes:"#b66f49",accent:"#e7b28e"}},
  archer: {outfit:"ranger",hat:"none",back:"quiver",belt:"dagger",bag:"pouch",colors:{clothes:"#79a76b",accent:"#c88768"}},
  ranger: {outfit:"ranger",hat:"rangerhood",back:"bow",belt:"sword",bag:"pouch",colors:{clothes:"#587d62",accent:"#79a76b"}},
  mage: {outfit:"robe",hat:"wizard",back:"staff",belt:"book",bag:"none",colors:{clothes:"#8575b1",accent:"#d8b68c"}},
  cleric: {outfit:"chainmail",hat:"circlet",back:"staff",belt:"book",bag:"none",colors:{clothes:"#f3dfbd",accent:"#f0ca67",metal:"#a9bbc3"}},
  rogue: {outfit:"ranger",hat:"rangerhood",back:"none",belt:"dagger",bag:"pouch",colors:{clothes:"#536b85",accent:"#7c8b96"}},
  bard: {outfit:"tunic",hat:"beret",back:"lute",belt:"potions",bag:"shoulder",colors:{clothes:"#c88768",accent:"#f0ca67"}}
});

export function normalizeAppearance(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Appearance must be a JSON object.");
  if (input.version !== undefined && input.version !== 2) throw new Error("Unsupported appearance version; expected version 2.");
  if (input.expression !== undefined) throw new Error("Pass expression to draw() or atlas export options, not appearance.");
  const out = structuredClone(PAWN_DEFAULTS);
  for (const part of Object.keys(PAWN_OPTIONS)) if (input[part] !== undefined) {
    const value = input[part];
    if (!PAWN_OPTIONS[part].includes(value)) throw new Error(`Unsupported ${part}: ${input[part]}.`);
    out[part] = value;
  }
  for (const group of Object.keys(out.colors)) if (input.colors?.[group] !== undefined) {
    const value = input.colors[group]; if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) throw new Error(`Color ${group} must be a six digit hex color.`); out.colors[group] = nearestPaletteColor(value);
  }
  for (const [key, min, max] of [["height", .85, 1.15], ["head", .85, 1.15], ["width", .8, 1.2]]) if (input.proportions?.[key] !== undefined) {
    const value = Number(input.proportions[key]); if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}.`); out.proportions[key] = value;
  }
  return out;
}
export function directionFromVector(x, y, fallback = "south") {
  if (![x, y].every(Number.isFinite) || Math.hypot(x, y) < 1e-6) return DIRECTIONS.includes(fallback) ? fallback : "south";
  return DIRECTIONS[Math.round((-Math.atan2(x, y) / (Math.PI / 4) + 8) % 8) % 8];
}
export function frameIndex(state, progress = 0) {
  const spec = Object.hasOwn(ANIMATION, state) && ANIMATION[state]; if (!spec) throw new Error(`Unsupported animation state: ${state}.`);
  return Math.floor(Math.max(0, Number(progress) || 0) * spec.frames) % spec.frames;
}
function roundRect(ctx, x, y, w, h, r, fill, stroke = "#000000", line = 1.8) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke();
}
function capsule(ctx, x, y, w, h, color) { ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = PAWN_OUTLINE; ctx.lineWidth = 1.5; ctx.stroke(); }
// Wardrobe uses rounded silhouettes and sparse seams, like the concept illustration.
function shape(ctx, color, path, line = 1.4, opening = null) {
  ctx.beginPath(); path(ctx); ctx.closePath();
  ctx.save();
  if (opening) {
    // Subtract the opening from the silhouette, including where the opening
    // extends past its edge. Even-odd fill alone would add those outside areas.
    ctx.clip();
    const [x, y, rx, ry] = opening;
    ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = color; ctx.fill(opening ? "evenodd" : "nonzero");
  ctx.strokeStyle = PAWN_OUTLINE; ctx.lineWidth = line; ctx.lineJoin = "round"; ctx.stroke();
  ctx.restore();
}
function seam(ctx, path, color = "#000000", width = 1) {
  ctx.beginPath(); path(ctx); ctx.lineCap = "round";
  if(color.startsWith("rgba(255")){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();return;}
  ctx.strokeStyle=PAWN_OUTLINE;ctx.lineWidth=width>=1.5?width+1.1:width;ctx.stroke();
  if(width>=1.5 && color!==PAWN_OUTLINE){ctx.strokeStyle=nearestPaletteColor(color);ctx.lineWidth=width;ctx.stroke();}
}
function drawHair(ctx, a, side, rear, behind, profile) {
  ctx.save();
  // Full hats hide the crown of the hair, leaving cheek locks and tails below.
  if (["beanie","beret","fedora","sunhat","wizard","bandana"].includes(a.hat)) {
    ctx.beginPath(); ctx.rect(-24,-2,48,45); ctx.clip();
  }
  paintHair(ctx,a,side,rear,behind,profile); ctx.restore();
}
// Loose hair is built from one skull-following cap and one gravity-led
// curtain, rather than independently adjusted locks for each direction.
function drawLooseHair(ctx,a,side,rear,behind,profile) {
  const color=a.colors.hair,wavy=a.hair==="wavy",length=a.hair==="bob"?10:18;
  if(behind) {
    if(rear)return;
    ctx.save();if(profile)ctx.scale(side,1);
    shape(ctx,color,c=>{
      c.moveTo(-13,length);
      if(wavy)c.bezierCurveTo(-16,13,-12,7,-14,-1);
      else c.quadraticCurveTo(-14,8,-14,-1);
      c.bezierCurveTo(-15,-18,12,-18,14,-2);
      if(profile){c.lineTo(1,-1);c.lineTo(-1,length-1);c.quadraticCurveTo(-7,length+1,-13,length);}
      else {c.quadraticCurveTo(wavy?16:14,9,13,length);c.quadraticCurveTo(0,length+2,-13,length);}
    });
    ctx.restore();return;
  }
  if(rear) {
    shape(ctx,color,c=>{
      c.moveTo(-13,length);c.quadraticCurveTo(wavy?-16:-14,8,-14,-1);
      c.bezierCurveTo(-15,-18,15,-18,14,-1);
      c.quadraticCurveTo(wavy?16:14,8,13,length);c.quadraticCurveTo(0,length+2,-13,length);
    });return;
  }
  ctx.save();if(side)ctx.scale(side,1);
  if(profile) {
    // The temple is the only face/hair boundary in profile. The rest of
    // the length stays on the back plane, behind the torso.
    ctx.save();ctx.beginPath();ctx.arc(0,0,13.5,0,Math.PI*2);ctx.clip();
    shape(ctx,color,c=>{
      c.moveTo(-20,17);c.lineTo(-20,-20);c.lineTo(20,-20);c.lineTo(20,-7);
      c.lineTo(11,-7);c.quadraticCurveTo(6,-3,2,-5);c.quadraticCurveTo(-1,-3,-1,3);
      c.lineTo(-2,17);
    });ctx.restore();
  } else {
    shape(ctx,color,c=>{
      c.moveTo(-13,0);c.bezierCurveTo(-15,-18,15,-18,13,-2);
      if(a.hair==="bob"){c.quadraticCurveTo(4,-5,-3,-4);c.quadraticCurveTo(-9,-5,-13,0);}
      else {c.quadraticCurveTo(5,-1,-4,-8);c.quadraticCurveTo(-9,-3,-13,0);}
    });
    // Keep the near section connected to the temple. The far section
    // hugs the skull edge; neither moves across the projected face.
    shape(ctx,color,c=>{c.moveTo(-13,-3);c.quadraticCurveTo(-15,5,-13,length);c.quadraticCurveTo(-10,length+1,-10,length-2);c.lineTo(-10,-4);});
    const far=side?12:10;
    shape(ctx,color,c=>{c.moveTo(far,-3);c.lineTo(13,-3);c.quadraticCurveTo(wavy?15:14,8,13,length);c.quadraticCurveTo(far,length+1,far,length-2);});
  }
  ctx.restore();
}
function drawBraid(ctx,x,top,a) {
  seam(ctx,c=>{c.moveTo(x,-3);c.quadraticCurveTo(x-1,1,x,top);},a.colors.hair,4);
  for(let y=top;y<=16;y+=4)capsule(ctx,x,y,2.6,3,a.colors.hair);
  roundRect(ctx,x-2.2,18,4.4,2,1,a.colors.accent,"#000000",.7);
}
function drawPunkHair(ctx,a,side,rear,profile) {
  const color=a.colors.hair;
  ctx.save();if(profile)ctx.scale(side,1);else if(rear)ctx.scale(-1,1);
  // A lightly shaded scalp keeps shaved areas distinct from bald skin.
  ctx.save();ctx.beginPath();ctx.arc(0,0,12.5,0,Math.PI*2);ctx.clip();ctx.globalAlpha=.16;
  ctx.fillStyle=color;ctx.fillRect(-14,-14,28,28);ctx.restore();
  if(a.hair==="undercut") {
    if(profile && side<0) {
      shape(ctx,color,c=>{c.moveTo(-13,-5);c.bezierCurveTo(-12,-17,9,-17,13,-4);c.quadraticCurveTo(5,-1,0,-8);c.quadraticCurveTo(-7,-4,-13,-5);});
      for(const [x,y]of [[-7,-1],[-9,3],[-5,5],[-4,0],[-8,7]]){ctx.fillStyle=color;ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(x,y,.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    } else if(profile) {
      shape(ctx,color,c=>{c.moveTo(-13,4);c.bezierCurveTo(-17,-14,10,-19,13,-4);c.quadraticCurveTo(7,-1,2,-5);c.lineTo(-1,9);c.quadraticCurveTo(-9,12,-13,4);});
    } else {
      shape(ctx,color,c=>{c.moveTo(-13,-4);c.bezierCurveTo(-12,-17,14,-18,13,0);c.lineTo(13,8);c.quadraticCurveTo(11,8,11,-2);c.quadraticCurveTo(5,-7,1,-7);c.quadraticCurveTo(-6,-2,-13,-4);});
    }
  } else if(a.hair==="mohawk") {
    if(profile)shape(ctx,color,c=>{c.moveTo(-13,4);c.lineTo(-15,-5);c.lineTo(-13,-11);c.lineTo(-10,-9);c.lineTo(-7,-16);c.lineTo(-4,-12);c.lineTo(0,-17);c.lineTo(3,-12);c.lineTo(7,-15);c.lineTo(9,-9);c.lineTo(13,-5);c.lineTo(7,-4);c.lineTo(2,-6);c.lineTo(-1,3);});
    else shape(ctx,color,c=>{c.moveTo(-3,rear?12:-5);c.lineTo(-4,-10);c.lineTo(-2,-17);c.lineTo(0,-14);c.lineTo(3,-17);c.lineTo(5,-9);c.lineTo(3,rear?12:-5);});
  } else {
    shape(ctx,color,c=>{c.moveTo(-13,0);c.lineTo(-14,-8);c.lineTo(-10,-7);c.lineTo(-9,-14);c.lineTo(-5,-11);c.lineTo(-2,-17);c.lineTo(1,-12);c.lineTo(6,-16);c.lineTo(7,-10);c.lineTo(12,-12);c.lineTo(14,-4);c.lineTo(10,-2);c.lineTo(5,-5);c.lineTo(0,-3);c.lineTo(-5,-6);});
  }
  ctx.restore();
}
function paintHair(ctx, a, side, rear, behind, profile) {
  if (a.hair === "bald" || ["hood","rangerhood","helmet","greathelm"].includes(a.hat)) return;
  if (["undercut","mohawk","spiky"].includes(a.hair)) { if(!behind)drawPunkHair(ctx,a,side,rear,profile); return; }
  if (["bob","long","wavy"].includes(a.hair)) { drawLooseHair(ctx,a,side,rear,behind,profile); return; }
  const color=a.colors.hair,style=a.hair,tied=["bun","ponytail","braid"].includes(style);
  if(behind) {
    if(rear)return;
    if(style==="bun")capsule(ctx,-side*8,-10,6,5.5,color);
    if(style==="ponytail"){
      const x=-side*11;
      shape(ctx,color,c=>{c.moveTo(x,-7);c.bezierCurveTo(x-7,-6,x-7,9,x-2,12);c.quadraticCurveTo(x+5,10,x+3,-2);});
    }
    return;
  }
  if(rear) {
    shape(ctx,color,c=>{c.moveTo(-13,-1);c.bezierCurveTo(-15,-19,15,-19,13,-1);c.quadraticCurveTo(13,12,0,13);c.quadraticCurveTo(-13,12,-13,-1);});
    if(style==="curly")for(let i=-2;i<=2;i++)capsule(ctx,i*4.7,-10+Math.abs(i)*1.4,3.8,3.5,color);
    if(tied){
      ctx.save();ctx.translate(-side*5,0);
      if(style==="bun")capsule(ctx,0,0,5.5,5,color);
      if(style==="ponytail")shape(ctx,color,c=>{c.moveTo(-3,-2);c.bezierCurveTo(-8,6,-4,15,1,17);c.quadraticCurveTo(7,9,3,-2);});
      ctx.restore();
      if(style==="braid")drawBraid(ctx,-side*4,4,a);
    }
    return;
  }
  if(profile){
    ctx.save();ctx.scale(side,1);
    ctx.save();ctx.beginPath();ctx.arc(0,0,13.5,0,Math.PI*2);ctx.clip();
    shape(ctx,color,c=>{
      c.moveTo(-13,5);c.bezierCurveTo(-18,-14,6,-19,12,-6);
      if(style==="pixie"){c.lineTo(8,-4);c.lineTo(5,-6);c.lineTo(2,-2);}
      else if(["sidepart","ponytail"].includes(style)){c.quadraticCurveTo(8,-2,3,-5);c.quadraticCurveTo(1,-2,1,1);}
      else{c.quadraticCurveTo(8,-4,3,-5);c.lineTo(1,1);}
      c.quadraticCurveTo(0,6,-3,8);c.quadraticCurveTo(-11,11,-13,5);
    });ctx.restore();
    if(style==="curly")for(let i=0;i<4;i++)capsule(ctx,-10+i*4.7,-9-Math.sin(i)*2,3.6,3.5,color);
    // The visible braid hangs from the temple behind the cheek, not in front of the eye.
    if(style==="braid")drawBraid(ctx,-6,4,a);
    seam(ctx,c=>{c.moveTo(-9,-7);c.quadraticCurveTo(-4,-12,2,-10);},"rgba(255,255,255,.15)",1);
    ctx.restore();return;
  }
  shape(ctx,color,c=>{
    c.moveTo(-13,0);c.bezierCurveTo(-15,-18,15,-18,13,0);
    if(["sidepart","ponytail"].includes(style)){c.quadraticCurveTo(4,-1,-4,-8);c.quadraticCurveTo(-8,-3,-13,0);}
    else if(style==="pixie"){c.lineTo(7,-5);c.lineTo(3,-3);c.lineTo(-2,-7);c.lineTo(-8,-4);c.lineTo(-13,0);}
    else{c.quadraticCurveTo(4,-5,-3,-4);c.quadraticCurveTo(-9,-5,-13,0);}
  });
  if(style==="braid")drawBraid(ctx,side ? -side*10 : 10,4,a);
  if(style==="curly")for(let i=-2;i<=2;i++)capsule(ctx,i*4.1,-10+Math.abs(i)*1.1,3.8,3.5,color);
  seam(ctx,c=>{c.moveTo(-8,-9);c.quadraticCurveTo(-2,-13,5,-10);},"rgba(255,255,255,.17)",1.2);
}
function drawHat(ctx, a, side, rear, profile) {
  const color = ["rangerhood","wizard"].includes(a.hat) ? a.colors.clothes : a.colors.accent;
  if (a.hat === "none") return;
  if (["flower","bow"].includes(a.hat)) {
    const x=profile?-8:-10,y=-7;
    if(a.hat==="flower") {
      for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;capsule(ctx,x+Math.cos(angle)*2.8,y+Math.sin(angle)*2.8,2.2,2.2,color);}
      capsule(ctx,x,y,1.8,1.8,"#f0ca67");
    } else {
      shape(ctx,color,c=>{c.moveTo(x,y);c.quadraticCurveTo(x-8,y-6,x-7,y+4);c.lineTo(x,y+1);c.quadraticCurveTo(x+8,y+6,x+7,y-4);});
      capsule(ctx,x,y,1.7,2,color);
    }
    return;
  }
  if(a.hat==="laurel") {
    seam(ctx,c=>{c.moveTo(-12,0);c.bezierCurveTo(-16,-15,16,-15,12,0);},"#587d62",1.6);
    for(const flank of [-1,1])for(let i=0;i<3;i++){
      ctx.save();ctx.translate(flank*(12-i*2.6),-2-i*3);ctx.rotate(flank*.65);capsule(ctx,0,0,1.5,3,color);ctx.restore();
    }
    return;
  }
  if(a.hat==="crown") {
    shape(ctx,color,c=>{c.moveTo(-13,-3);c.lineTo(-12,-13);c.lineTo(-6,-8);c.lineTo(0,-16);c.lineTo(6,-8);c.lineTo(12,-13);c.lineTo(13,-3);c.quadraticCurveTo(0,1,-13,-3);});
    if(!rear)capsule(ctx,profile?7:0,-5.5,1.7,2.2,a.colors.clothes);
    return;
  }
  if(a.hat==="goggles") {
    seam(ctx,c=>{c.moveTo(-13,-5);c.quadraticCurveTo(0,-3,13,-5);},a.colors.bag,2.6);
    if(!rear)for(const x of profile?[6]:[-5,5]){roundRect(ctx,x-4,-8,8,6,2.5,a.colors.metal,"#000000",1.2);seam(ctx,c=>{c.moveTo(x-2,-6);c.lineTo(x,-6);},"#f4ead5",1);}
    return;
  }
  if(a.hat==="bandana") {
    shape(ctx,color,c=>{c.moveTo(-13,-1);c.bezierCurveTo(-15,-19,15,-19,13,-1);c.quadraticCurveTo(0,3,-13,-1);});
    seam(ctx,c=>{c.moveTo(-12,-2);c.quadraticCurveTo(0,0,12,-2);},"rgba(255,255,255,.35)",1.3);
    shape(ctx,color,c=>{c.moveTo(-12,-2);c.lineTo(-17,3);c.lineTo(-15,7);c.lineTo(-10,0);});
    return;
  }
  if (["helmet","greathelm"].includes(a.hat)) {
    shape(ctx,a.colors.metal,c=>{c.moveTo(-14,8);c.lineTo(-14,-5);c.bezierCurveTo(-12,-19,12,-19,14,-5);c.lineTo(14,8);c.quadraticCurveTo(0,13,-14,8);},1.4,!rear && a.hat === "helmet" ? [side*(profile?7:2),2,profile?6:11,10] : null);
    if (!rear && a.hat === "helmet") {
      seam(ctx,c=>{c.moveTo(side*2,-8);c.lineTo(side*2,-2);},a.colors.metal,3);
    } else if (!rear) {
      seam(ctx,c=>{c.moveTo(profile?side*5:-10,0);c.quadraticCurveTo(side*8,2,profile?side*13:11,0);},"#000000",2.6);
      for(let x=-5;x<=5;x+=3)seam(ctx,c=>{const px=profile?side*(8+x*.3):x;c.moveTo(px,5);c.lineTo(px,8);},"#000000",.8);
    }
    seam(ctx,c=>{c.moveTo(0,-12);c.lineTo(0,-6);},"rgba(255,255,255,.4)",1);
    return;
  }
  if (a.hat === "circlet") {
    seam(ctx,c=>{c.moveTo(-13,-3);c.quadraticCurveTo(0,1,13,-3);},color,3);
    if(!rear)capsule(ctx,side*(profile?8:4),-1,2,2.5,a.colors.clothes);
    return;
  }
  if (a.hat === "wizard") {
    capsule(ctx,side*2,-2,17,3.5,color);
    shape(ctx,color,c=>{c.moveTo(-13,-3);c.lineTo(-10,-11);c.quadraticCurveTo(-6,-13,-2,-16.5);c.quadraticCurveTo(3,-16.5,9,-12);c.lineTo(5,-12);c.lineTo(11,-8);c.lineTo(13,-3);c.quadraticCurveTo(0,0,-13,-3);});
    seam(ctx,c=>{c.moveTo(-9,-4);c.quadraticCurveTo(0,-2,9,-4);},a.colors.accent,2);
    if(!rear)shape(ctx,a.colors.accent,c=>{c.moveTo(0,-11);c.lineTo(1.5,-8.5);c.lineTo(0,-6);c.lineTo(-1.5,-8.5);},.5);
    return;
  }
  if (a.hat === "hood" || a.hat === "rangerhood") {
    shape(ctx,color,c=>{c.moveTo(-13,7);c.bezierCurveTo(-21,-17,10,-22,15,-3);c.lineTo(14,11);c.quadraticCurveTo(0,16,-13,7);},1.4,!rear ? [side*(profile?7:3),1,profile?6:10,12] : null);
    return;
  }
  if (a.hat === "beanie") {
    shape(ctx,color,c=>{c.moveTo(-14,-4);c.bezierCurveTo(-15,-20,14,-21,14,-4);c.quadraticCurveTo(0,0,-14,-4);});
    shape(ctx,color,c=>{c.moveTo(-14,-5);c.quadraticCurveTo(0,-2,14,-5);c.lineTo(14,0);c.quadraticCurveTo(0,4,-14,0);});
    for (let x=-10;x<=10;x+=4) seam(ctx,c=>{c.moveTo(x,-3);c.lineTo(x,0);},"rgba(87,54,43,.3)",.7);
  } else if (a.hat === "beret") {
    shape(ctx,color,c=>{c.moveTo(-14,-3);c.bezierCurveTo(-21,-10,-5,-19,6,-16);c.quadraticCurveTo(14,-15,16,-5);c.quadraticCurveTo(12,3,-1,-2);c.quadraticCurveTo(-10,-7,-14,-3);});
    if (!rear) seam(ctx,c=>{c.moveTo(-12,-6);c.quadraticCurveTo(-4,-11,8,-5);});
  } else {
    capsule(ctx, side*(profile?5:2), -2, (a.hat === "sunhat" ? 18 : 16)*(profile?.8:1), 4, color);
    shape(ctx,color,c=>{c.moveTo(-10,-3);c.lineTo(-8,-14);c.quadraticCurveTo(-3,-18,1,-14);c.quadraticCurveTo(5,-17,8,-13);c.lineTo(10,-3);c.quadraticCurveTo(0,0,-10,-3);});
    seam(ctx,c=>{c.moveTo(-9,-5);c.quadraticCurveTo(0,-2,9,-5);},a.colors.bag,2.4);
  }
}
function drawOutfit(ctx, a, side, rear, profile) {
  if (a.outfit === "sweater" || a.outfit === "dress") {
    seam(ctx,c=>{c.moveTo(-11,-6);c.quadraticCurveTo(0,-2,11,-6);},"rgba(90,54,43,.3)");
  }
  if (["robe","monk","ranger","tabard","armor","chainmail"].includes(a.outfit)) {
    const c = a.colors;
    if (["robe","monk"].includes(a.outfit)) {
      seam(ctx,p=>{p.moveTo(-9,-5);p.quadraticCurveTo(0,-2,9,-5);},c.accent,2);
      if(!rear) {
        seam(ctx,p=>{p.moveTo(-5,-33);p.quadraticCurveTo(0,-28,6,-24);p.lineTo(3,-6);},c.accent,1.5);
        seam(ctx,p=>{p.moveTo(-5,-18);p.quadraticCurveTo(-7,-10,-6,-6);},"rgba(87,54,43,.25)");
      }
    }
    if(a.outfit === "monk") {
      seam(ctx,p=>{p.moveTo(rear?6:-6,-34);p.lineTo(rear?-9:9,-16);},c.accent,4);
      seam(ctx,p=>{p.moveTo(-10,-14);p.quadraticCurveTo(0,-11,10,-14);},c.bag,2);
    }
    if(a.outfit === "ranger") {
      if(rear) {shape(ctx,c.accent,p=>{p.moveTo(-8,-34);p.quadraticCurveTo(0,-29,8,-34);p.lineTo(12,-10);p.quadraticCurveTo(0,-5,-12,-10);},1);}
      else {seam(ctx,p=>{p.moveTo(-10,-15);p.quadraticCurveTo(0,-12,10,-15);},c.bag,3);}
    }
    if(["armor","chainmail","tabard"].includes(a.outfit)) {
      if(a.outfit === "chainmail")for(let y=-29;y<-8;y+=4)for(let x=-6;x<=6;x+=4)seam(ctx,p=>{p.moveTo(x-1.4,y);p.quadraticCurveTo(x,y+2,x+1.4,y);},"#7c8b96",.65);
      if(a.outfit === "armor") {
        shape(ctx,c.metal,p=>{p.moveTo(-7,-32);p.quadraticCurveTo(0,-28,7,-32);p.lineTo(10,-17);p.quadraticCurveTo(0,-12,-10,-17);});
        for(const y of [-12,-8])seam(ctx,p=>{p.moveTo(-10,y);p.quadraticCurveTo(0,y+3,10,y);},"#7c8b96",1);
        seam(ctx,p=>{p.moveTo(-3,-28);p.lineTo(-5,-20);},"rgba(255,255,255,.45)",1.5);
      }
      if(a.outfit === "tabard") {
        ctx.save(); if(!rear){ctx.translate(side*(profile?8:3),0);ctx.scale(profile?.35:side?.85:1,1);}
        shape(ctx,c.clothes,p=>{p.moveTo(-7,-33);p.lineTo(7,-33);p.lineTo(8,-5);p.lineTo(0,-2);p.lineTo(-8,-5);});
        if(!rear){seam(ctx,p=>{p.moveTo(-4,-21);p.lineTo(4,-21);p.moveTo(0,-25);p.lineTo(0,-16);},c.accent,2);}
        ctx.restore();
      }
    }
  }
  ctx.save(); ctx.translate(side*(profile?8:3),0); ctx.scale(profile?.35:side?.85:1,1);
  if (a.outfit === "hoodie") {
    if (!rear) { shape(ctx,a.colors.clothes,c=>{c.moveTo(-6,-17);c.lineTo(6,-17);c.lineTo(8,-10);c.quadraticCurveTo(0,-7,-8,-10);},.8); }
    else seam(ctx,c=>{c.moveTo(-7,-31);c.quadraticCurveTo(0,-20,7,-31);},"rgba(90,54,43,.3)");
  }
  if (a.outfit === "cardigan" && !rear) {
    shape(ctx,a.colors.accent,c=>{c.moveTo(-4,-33);c.lineTo(4,-33);c.lineTo(3,-5);c.lineTo(-3,-5);},.7);
    for (let y=-23;y<=-10;y+=6) { ctx.fillStyle="#000000";ctx.beginPath();ctx.arc(side*2+2,y,.65,0,Math.PI*2);ctx.fill(); }
  }
  if (a.outfit === "overalls" && !rear) {
    roundRect(ctx,-6,-29,12,21,4,a.colors.accent,"#000000",1);
    for (const x of [-5,5]) seam(ctx,c=>{c.moveTo(x,-29);c.lineTo(x,-37);},a.colors.accent,2.6);
    seam(ctx,c=>{c.moveTo(-3,-20);c.quadraticCurveTo(0,-17,3,-20);},"#000000",.8);
  }
  ctx.restore();
}
function drawBag(ctx, a, side, rear, profile, behind) {
  if (a.bag === "none") return;
  const leather = a.colors.bag;
  if (a.bag === "backpack") {
    if (behind !== !rear) {
      if (!behind && !rear) for (const x of profile ? [-side*7] : [-6,6]) seam(ctx,c=>{c.moveTo(x,-35);c.lineTo(x*1.4,-18);},leather,2.5);
      return;
    }
    ctx.save();ctx.translate(rear?side*4:-side*(profile?15:9),0);ctx.scale(profile?.62:side?.8:1,1);
    roundRect(ctx,-8,-30,16,21,5,leather);
    if (rear) roundRect(ctx,-5,-18,10,7,2.5,leather,"#000000",1);
    seam(ctx,c=>{c.moveTo(-3,-31);c.quadraticCurveTo(0,-35,3,-31);});ctx.restore();return;
  }
  // A bag on the same anatomical hip moves behind the body when facing east.
  const far = side > 0;
  const x = (rear ? -1 : 1) * (profile ? 0 : side ? 7 : 9);
  if (!behind) {
    const shoulder = rear ? 6 : -6;
    seam(ctx,c=>{c.moveTo(shoulder,-36);c.quadraticCurveTo(0,-27,x,-18);},"#000000",3);
    seam(ctx,c=>{c.moveTo(shoulder,-36);c.quadraticCurveTo(0,-27,x,-18);},leather,1.6);
  }
  if (behind !== far) return;
  ctx.save();ctx.translate(x,-17);ctx.scale(profile?.4:side?.75:1,1);
  if (a.bag === "tote") {
    seam(ctx,c=>{c.moveTo(-4,0);c.bezierCurveTo(-5,-9,5,-9,4,0);},leather,2);
    roundRect(ctx,-7,-1,14,15,3,leather);
  } else {
    roundRect(ctx,-7,-1,14,a.bag === "pouch"?10:12,4,leather);
    if (!rear) {
      shape(ctx,leather,c=>{c.moveTo(-7,0);c.lineTo(7,0);c.lineTo(6,5);c.quadraticCurveTo(0,8,-6,5);},1);
      roundRect(ctx,-1.3,4,2.6,3,1,"#f0ca67","#000000",.8);
    }
  }
  ctx.restore();
}

function drawEquipment(ctx,a,side,rear,profile,behind) {
  const c=a.colors;
  if(a.back !== "none" && behind === !rear) {
    ctx.save();ctx.translate(profile ? -side*(a.back === "staff" ? 21 : 17) : a.back === "staff" ? -18 : rear ? (a.back === "quiver" ? -6 : side*6) : -side*6,0);ctx.scale(profile?.62:side?.85:1,1);
    if(a.back === "shield") {
      shape(ctx,c.metal,p=>{p.moveTo(-10,-31);p.quadraticCurveTo(0,-36,10,-31);p.lineTo(8,-15);p.quadraticCurveTo(0,-5,-8,-15);});
      shape(ctx,c.clothes,p=>{p.moveTo(-7,-29);p.lineTo(7,-29);p.lineTo(5,-17);p.lineTo(0,-12);p.lineTo(-5,-17);});
      if(rear)capsule(ctx,0,-24,2.5,2.5,c.accent);
    } else if(a.back === "quiver") {
      ctx.rotate(-.25);
      for(const x of [-3,0,3]) {seam(ctx,p=>{p.moveTo(x,-21);p.lineTo(x,-39);},"#c88768",1.2);shape(ctx,c.accent,p=>{p.moveTo(x,-40);p.lineTo(x-2,-37);p.lineTo(x,-33);p.lineTo(x+2,-37);},.6);}
      roundRect(ctx,-5,-28,10,21,3,c.bag);seam(ctx,p=>{p.moveTo(-4,-24);p.lineTo(4,-24);},c.accent,2);
    } else if(a.back === "sword") {
      ctx.rotate(profile ? side*.12 : .45);roundRect(ctx,-2.4,-27,4.8,28,2,c.bag);
      seam(ctx,p=>{p.moveTo(0,-36);p.lineTo(0,-27);},c.bag,3);
      seam(ctx,p=>{p.moveTo(-5,-27);p.lineTo(5,-27);},c.metal,2.3);capsule(ctx,0,-37,2,2,c.metal);
    } else if(a.back === "staff") {
      seam(ctx,p=>{p.moveTo(0,-1);p.quadraticCurveTo(1,-20,0,-40);},c.bag,2.5);
      capsule(ctx,0,-41,4,4,c.accent);capsule(ctx,0,-41,2,2,c.clothes);
    } else if(a.back === "bow") {
      seam(ctx,p=>{p.moveTo(0,-37);p.quadraticCurveTo(-14,-21,0,-4);},c.bag,2.7);
      seam(ctx,p=>{p.moveTo(0,-37);p.lineTo(0,-4);},"#d8b68c",.8);
    } else if(a.back === "lute") {
      capsule(ctx,0,-14,7,9,c.bag);roundRect(ctx,-1.7,-36,3.4,19,1,c.bag);
      capsule(ctx,0,-17,2.5,2.5,"#533b37");seam(ctx,p=>{p.moveTo(0,-34);p.lineTo(0,-10);},c.accent,.7);
    }
    ctx.restore();
  }
  if(profile && !behind && a.back !== "none") {
    seam(ctx,p=>{p.moveTo(-side*7,-33);p.quadraticCurveTo(-side*9,-25,-side*9,-18);},c.bag,1.7);
  }
  if(a.belt === "none" || behind !== (side>0))return;
  ctx.save();ctx.translate((rear?-1:1)*(profile?0:side?7:10),-14);ctx.scale(profile?.5:1,1);
  if(["sword","dagger"].includes(a.belt)) {
    ctx.rotate(-.2);const length=a.belt==="sword"?17:10;
    roundRect(ctx,-1.8,-2,3.6,length,1.5,c.bag);seam(ctx,p=>{p.moveTo(0,-8);p.lineTo(0,-2);},c.bag,2.8);seam(ctx,p=>{p.moveTo(-4,-2);p.lineTo(4,-2);},c.metal,1.7);
  } else if(a.belt === "potions") {
    for(const x of [-3,3]){roundRect(ctx,x-2,-2,4,7,2,c.accent,"#000000",.8);roundRect(ctx,x-1.3,-4,2.6,2,1,c.bag,"#000000",.6);}
  } else if(a.belt === "scroll") {roundRect(ctx,-3,-3,6,12,2,"#f3dfbd");seam(ctx,p=>{p.moveTo(-3,2);p.lineTo(3,2);},c.accent,2);}
  else {roundRect(ctx,-4,-3,8,12,1.5,c.clothes);seam(ctx,p=>{p.moveTo(-2,-2);p.lineTo(-2,8);},c.accent,1);}
  ctx.restore();
}
function paintHeadwear(ctx, a, direction) {
  const side = direction.includes("east") ? 1 : direction.includes("west") ? -1 : 0;
  const rear = direction.startsWith("north"), profile = direction === "east" || direction === "west";
  drawHair(ctx, a, side, rear, false, profile);
  ctx.save();
  if (profile) ctx.scale(side, 1); else if (rear) ctx.scale(-1, 1);
  if (a.hat !== "hood") { ctx.translate(0, -1.5); ctx.scale(1, .9); }
  drawHat(ctx, a, profile ? 1 : side, rear, profile);
  ctx.restore();
}
function paintFace(ctx, expression, direction) {
  const side = direction.includes("east") ? 1 : direction.includes("west") ? -1 : 0;
  const profile = direction === "east" || direction === "west";
  ctx.save(); ctx.translate(0, 49);
  const eye = (x, y, r = 1.8) => {
    ctx.fillStyle = "#000000"; ctx.strokeStyle = PAWN_OUTLINE; ctx.lineWidth = 1.35; ctx.lineCap = "round";
    ctx.beginPath();
    if (expression === "excited") {
      ctx.moveTo(x-r, y+.4); ctx.quadraticCurveTo(x, y-2.5, x+r, y+.4); ctx.stroke();
    } else if (expression === "sleepy") {
      ctx.moveTo(x-r, y); ctx.quadraticCurveTo(x, y+1.4, x+r, y); ctx.stroke();
    } else {
      ctx.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,248,229,.9)"; ctx.beginPath(); ctx.arc(x-r*.27, y-r*.35, r*.25, 0, Math.PI*2); ctx.fill();
    }
  };
  // The reference places the near eye low on the cheek and the far eye
  // higher around the sphere. Keep this projection consistent on both sides.
  if (profile) eye(side * 7.4, -46.2, 1.65);
  else if (side) { eye(side * .5, -45.5); eye(side * 8.2, -47.5, 1.35); }
  else { eye(-4.8, -46); eye(4.8, -46); }
  const mx = side * (profile ? 8.7 : 4.8), my = profile ? -42 : -41.5;
  ctx.save(); ctx.translate(mx, my); ctx.scale(profile ? .55 : 1, 1);
  ctx.strokeStyle = PAWN_OUTLINE; ctx.fillStyle = "#000000"; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.beginPath();
  if (expression === "surprised") { ctx.ellipse(0, .4, 1.6, 2, 0, 0, Math.PI*2); ctx.fill(); }
  else if (expression === "excited") {
    ctx.moveTo(-2.8, -.3); ctx.quadraticCurveTo(0, .7, 2.8, -.3); ctx.quadraticCurveTo(2.2, 4.8, 0, 4.5); ctx.quadraticCurveTo(-2.2, 4.8, -2.8, -.3); ctx.fill();
    ctx.fillStyle = "#e48378"; ctx.beginPath(); ctx.ellipse(0, 3.1, 1.4, .8, 0, 0, Math.PI*2); ctx.fill();
  } else if (expression === "neutral") { ctx.moveTo(-1.6, .7); ctx.lineTo(1.6, .7); ctx.stroke(); }
  else if (expression === "sleepy") { ctx.ellipse(0, 1, 1.2, .65, 0, 0, Math.PI*2); ctx.stroke(); }
  else { ctx.moveTo(-2.1, 0); ctx.quadraticCurveTo(0, 3, 2.1, 0); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}
function paintPawn(ctx, a, direction, state, frame, includeShadow = true, expression = null) {
  const walk = state === "walk", p = frame / (walk ? 8 : 4), bob = walk ? Math.abs(Math.sin(p * Math.PI * 2)) * 1.1 : Math.sin(p * Math.PI * 2) * .5;
  if (!DIRECTIONS.includes(direction)) throw new Error(`Unsupported direction: ${direction}.`);
  const c = a.colors, { height, head, width } = a.proportions;
  ctx.save(); ctx.translate(32, 72); ctx.scale(width * (["east", "west"].includes(direction) ? .84 : 1), height);
  const side = direction.includes("east") ? 1 : direction.includes("west") ? -1 : 0;
  const rear = direction.startsWith("north");
  const profile = direction === "east" || direction === "west";
  // Soft floor shadow remains fixed while the body animates above the foot anchor.
  if(includeShadow){ctx.fillStyle = "rgba(71,49,43,.2)"; ctx.beginPath(); ctx.ellipse(0, 0, 12 * width, 3.7, 0, 0, Math.PI * 2); ctx.fill();}
  ctx.translate(0, -bob);
  drawEquipment(ctx,a,side,rear,profile,true);
  drawBag(ctx, a, side, rear, profile, true);
  // Hair at the back of the head is a world layer behind the torso.
  // Use the same head anchor/scale as the foreground pass, independently of body size.
  ctx.save(); ctx.translate(side*.7,6-49);
  ctx.scale(1/(width*(profile?.84:1)),1/height); ctx.scale(head,head);
  drawHair(ctx,a,side,rear,true,profile); ctx.restore();
  // Reference silhouette: narrow shoulders and a broad, rounded, continuous base.
  ctx.beginPath(); ctx.moveTo(-7, -37);
  ctx.bezierCurveTo(-10, -30, -15, -20, -14, -9);
  ctx.bezierCurveTo(-13.5, 2, 13.5, 2, 14, -9);
  ctx.bezierCurveTo(15, -20, 10, -30, 7, -37);
  ctx.quadraticCurveTo(0, -41, -7, -37); ctx.closePath();
  ctx.fillStyle = ["armor","chainmail","tabard"].includes(a.outfit) ? c.metal : c.clothes; ctx.fill(); ctx.strokeStyle = PAWN_OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.save(); ctx.clip();
  const bodyShade = ctx.createRadialGradient(-5, -26, 2, 0, -22, 31);
  bodyShade.addColorStop(0, "rgba(255,255,255,.12)");
  bodyShade.addColorStop(.55, "rgba(255,255,255,0)");
  bodyShade.addColorStop(1, "rgba(66,37,29,.16)");
  ctx.fillStyle = bodyShade; ctx.fillRect(-18, -41, 36, 45);
  ctx.restore();
  drawOutfit(ctx, a, side, rear, profile);
  drawBag(ctx, a, side, rear, profile, false);
  drawEquipment(ctx,a,side,rear,profile,false);
  ctx.save(); ctx.translate(side * .7, 6);
  // Attach the head at the shoulders without inheriting body proportions.
  ctx.translate(0, -49);
  ctx.scale(1 / (width * (["east", "west"].includes(direction) ? .84 : 1)), 1 / height);
  ctx.translate(0, 49);
  const hr = 13 * head;
  const drawHead = (color) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -49, hr, 0, Math.PI * 2); ctx.fill();
    // Leave the lower center open so the head flows into the shoulders.
    ctx.strokeStyle = PAWN_OUTLINE; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, -49, hr, Math.PI * .78, Math.PI * 2.22); ctx.stroke();
  };
  drawHead(c.skin);
  const headShade = ctx.createRadialGradient(-4, -54, 1, 0, -49, hr);
  headShade.addColorStop(0, "rgba(255,255,255,.12)");
  headShade.addColorStop(.65, "rgba(255,255,255,0)");
  headShade.addColorStop(1, "rgba(89,44,32,.1)");
  ctx.fillStyle = headShade; ctx.beginPath(); ctx.arc(0, -49, hr - .8, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(0,-49); ctx.scale(head,head);
  if (expression !== null && !rear && a.hat !== "greathelm") paintFace(ctx, expression, direction);
  paintHeadwear(ctx, a, direction); ctx.restore();
  ctx.restore(); ctx.restore();
}
function canvasFor(width, height) { const c = document.createElement("canvas"); c.width = width; c.height = height; return c; }
function makeAtlas(appearance, scale, expression) {
  const w = FRAME_WIDTH * scale, h = FRAME_HEIGHT * scale;
  const atlas = canvasFor(w * 12, h * 8), ctx = atlas.getContext("2d");
  const frame = canvasFor(w, h), drawing = frame.getContext("2d");
  drawing.scale(scale, scale);
  // Rasterize at a fixed origin: packing coordinates must not change geometry
  // or antialiasing, particularly for scaled hood/helmet clipping paths.
  DIRECTIONS.forEach((direction, row) => {
    for (let index = 0; index < 12; index++) {
      drawing.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      paintPawn(drawing, appearance, direction, index < 4 ? "idle" : "walk", index < 4 ? index : index - 4, true, expression);
      ctx.drawImage(frame, index * w, row * h);
    }
  });
  frame.width = frame.height = 0;
  return atlas;
}
// Bodies and shared face sheets use one bounded LRU page pool. Each face
// sheet holds all expressions for a hair/hat/direction, independent of colors,
// body proportions, or entity count. Switching expression only changes a crop.
const PAGE_COLUMNS = 16, PAGE_ROWS = 8, SLOT_HEIGHT = 84;
const PAGE_BYTES = FRAME_WIDTH * PAGE_COLUMNS * SLOT_HEIGHT * PAGE_ROWS * 4;
const SHADOW_BYTES = 64 * 16 * 4, MASK_BYTES = 32 * 26 * 4, RASTER_BYTES = FRAME_WIDTH * SLOT_HEIGHT * 4;
const DIRECTION_INDEX = Object.fromEntries(DIRECTIONS.map((value, index) => [value, index]));
const EXPRESSION_INDEX = Object.fromEntries(EXPRESSIONS.map((value, index) => [value, index]));
const FACE_VISIBLE = [true, true, true, false, false, false, true, true];
const SIDE = [0, -1, -1, -1, 0, 1, 1, 1];
const HELD_X = [0, -9, -13, -8, 8, 8, 13, 9];
// A direction-specific 16×13 head-space window fits five double-resolution
// expressions into one 64×84 slot. Two blank rows between sprites prevent
// adjacent expressions bleeding into one another during filtered drawing.
const FACE_X = [-8, -13, -16, 0, 0, 0, 0, -3];
function expressionIndex(expression) {
  const index = EXPRESSION_INDEX[expression];
  if (!Number.isInteger(index)) throw new Error(`Unsupported expression: ${expression}.`);
  return index;
}

// World-space attachment points share the exact rounding/bob used by drawing.
function layoutPawn(a, { x, y, direction = "south", state = "idle", lift = 0 }, out, frame) {
  const index = DIRECTION_INDEX[direction];
  if (!Number.isInteger(index)) throw new Error(`Unsupported direction: ${direction}.`);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(lift)) throw new Error("Position and lift must be finite numbers.");
  const phase = frame / ANIMATION[state].frames * Math.PI * 2;
  const { width, height, head } = a.proportions, profile = index === 2 || index === 6;
  const sx = width * (profile ? .84 : 1);
  const bob = (state === "walk" ? Math.abs(Math.sin(phase)) * 1.1 : Math.sin(phase) * .5) * height;
  out.index = index; out.side = SIDE[index]; out.rear = !FACE_VISIBLE[index];
  out.bodyX = Math.round(x - 32); out.bodyY = Math.round(y - 72) - bob - lift;
  out.headX = out.bodyX + 32 + SIDE[index] * .7 * sx;
  out.headY = out.bodyY + 72 - 43 * height; out.headScale = head;
  // Conservative clearance includes the tallest current hair and headgear.
  out.topY = out.headY - 22 * head;
  out.heldX = out.bodyX + 32 + HELD_X[index] * sx;
  out.heldY = out.bodyY + 72 - (out.rear ? 25 : profile ? 22 : 20) * height;
  out.propScale = Math.min(width, height); out.bodyWidth = 28 * sx;
  out.lift = lift; out.floorX = x; out.floorY = y; out.shadowScaleX = sx * width; out.shadowScaleY = height;
  return out;
}

export function createPawnRenderer({ maxCacheBytes = 128 * 1024 * 1024 } = {}) {
  if (!Number.isSafeInteger(maxCacheBytes) || maxCacheBytes < PAGE_BYTES + SHADOW_BYTES + MASK_BYTES + RASTER_BYTES)
    throw new Error("The cache needs at least one page and raster buffers (2.66 MiB).");
  const maxPages = Math.floor((maxCacheBytes - SHADOW_BYTES - MASK_BYTES - RASTER_BYTES) / PAGE_BYTES);
  const records = new Map(), styles = new Map(), leases = new WeakMap(), pages = [], free = [];
  let first = null, last = null, shadow = null, mask = null, raster = null, closed = false, revision = 0, nextId = 0;
  let builds = 0, faceBuilds = 0, hits = 0, misses = 0, evictions = 0, poses = 0, faceSheets = 0, preparations = 0;
  let layoutBuilds = 0, layoutHits = 0;
  function assertOpen() { if (closed) throw new Error("Pawn renderer has been disposed."); }
  function owner(appearance, face = false) {
    return { appearance, face, id: nextId++, refs: 0, slots: Array(8).fill(null) };
  }
  function leaseFor(pawn) {
    const lease = leases.get(pawn);
    if (!lease || lease.released) throw new Error("Use a live pawn prepared by this renderer.");
    return lease;
  }
  // One private layout per handle survives interleaved world/foreground/overhead
  // passes. Never expose it: callers may freely edit their layout snapshots.
  function layoutFor(lease, options) {
    const { x, y, direction = "south", state = "idle", progress = 0, lift = 0 } = options;
    const frame = frameIndex(state, progress), rig = lease.layout;
    if (rig && rig.floorX === x && rig.floorY === y && rig.lift === lift &&
        lease.direction === direction && lease.state === state && lease.frame === frame) {
      layoutHits++; return rig;
    }
    const result = layoutPawn(lease.record.appearance, options, rig ?? {}, frame);
    lease.layout = result; lease.direction = direction; lease.state = state; lease.frame = frame;
    layoutBuilds++; return result;
  }
  function unlink(slot) {
    if (slot.prev) slot.prev.next = slot.next; else first = slot.next;
    if (slot.next) slot.next.prev = slot.prev; else last = slot.prev;
    slot.prev = slot.next = null;
  }
  function touch(slot) {
    if (slot === last) return;
    if (slot.owner) unlink(slot);
    slot.prev = last;
    if (last) last.next = slot; else first = slot;
    last = slot;
  }
  function forget(slot) {
    unlink(slot); slot.owner.slots[slot.direction] = null;
    if (slot.owner.face) faceSheets--; else poses--;
    slot.owner = null;
  }
  function freeOwner(record) {
    for (const slot of record.slots) if (slot) { forget(slot); free.push(slot); }
  }
  function newPage() {
    const canvas = canvasFor(FRAME_WIDTH * PAGE_COLUMNS, SLOT_HEIGHT * PAGE_ROWS);
    const page = { canvas, ctx: canvas.getContext("2d") }; pages.push(page);
    for (let i = 0; i < PAGE_COLUMNS * PAGE_ROWS; i++)
      free.push({ page, x: i % PAGE_COLUMNS * FRAME_WIDTH, y: Math.floor(i / PAGE_COLUMNS) * SLOT_HEIGHT, owner: null, prev: null, next: null, direction: 0 });
  }
  function paintFaces(ctx, a, direction) {
    const left = FACE_X[DIRECTION_INDEX[direction]];
    if (!mask) mask = canvasFor(32, 26);
    const occlusion = mask.getContext("2d");
    occlusion.clearRect(0, 0, 32, 26);
    occlusion.save(); occlusion.scale(2, 2); occlusion.translate(-left, .5);
    paintHeadwear(occlusion, a, direction); occlusion.restore();
    for (const [index, expression] of EXPRESSIONS.entries()) {
      ctx.save(); ctx.translate(index % 2 * 32, Math.floor(index / 2) * 28);
      ctx.beginPath(); ctx.rect(0, 0, 32, 26); ctx.clip();
      ctx.save(); ctx.scale(2, 2); ctx.translate(-left, .5);
      paintFace(ctx, expression, direction); ctx.restore();
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(mask, 0, 0); ctx.restore();
    }
  }
  function poseFor(record, direction) {
    let slot = record.slots[direction];
    if (slot) { hits++; touch(slot); return slot; }
    misses++;
    if (!free.length) {
      if (pages.length < maxPages) newPage();
      else { slot = first; forget(slot); free.push(slot); evictions++; }
    }
    slot = free.pop();
    if (!raster) raster = canvasFor(FRAME_WIDTH, SLOT_HEIGHT);
    const drawing = raster.getContext("2d"), ctx = slot.page.ctx;
    drawing.clearRect(0, 0, FRAME_WIDTH, SLOT_HEIGHT);
    try {
      if (record.face) paintFaces(drawing, record.appearance, DIRECTIONS[direction]);
      else paintPawn(drawing, record.appearance, DIRECTIONS[direction], "idle", 0, false);
      ctx.clearRect(slot.x, slot.y, FRAME_WIDTH, SLOT_HEIGHT);
      ctx.drawImage(raster, slot.x, slot.y);
    } catch (error) { free.push(slot); throw error; }
    touch(slot); slot.owner = record; slot.direction = direction; record.slots[direction] = slot;
    if (record.face) { faceSheets++; faceBuilds++; } else { poses++; builds++; }
    return slot;
  }
  function shadowImage() {
    if (!shadow) {
      shadow = canvasFor(64, 16); const ctx = shadow.getContext("2d");
      ctx.fillStyle = "rgba(71,49,43,.2)"; ctx.beginPath(); ctx.ellipse(32, 8, 12, 3.7, 0, 0, Math.PI * 2); ctx.fill();
    }
    return shadow;
  }
  return {
    prepare(input = {}) {
      assertOpen(); const appearance = normalizeAppearance(input), key = JSON.stringify(appearance);
      preparations++;
      let record = records.get(key);
      if (!record) {
        Object.freeze(appearance.colors); Object.freeze(appearance.proportions); Object.freeze(appearance);
        record = owner(appearance); record.key = key;
        // Only hair and headgear affect face visibility; head size is applied on draw.
        record.styleKey = PAWN_OPTIONS.hair.indexOf(appearance.hair) * PAWN_OPTIONS.hat.length + PAWN_OPTIONS.hat.indexOf(appearance.hat);
        let style = styles.get(record.styleKey);
        if (!style) { style = owner(appearance, true); styles.set(record.styleKey, style); }
        style.refs++; record.style = style; records.set(key, record);
      }
      record.refs++;
      const pawn = Object.freeze({ appearance: record.appearance });
      leases.set(pawn, { record, released: false }); return pawn;
    },
    layout(pawn, options, out = {}) {
      assertOpen(); return Object.assign(out, layoutFor(leaseFor(pawn), options));
    },
    draw(ctx, pawn, options = {}) {
      assertOpen(); const lease = leaseFor(pawn), record = lease.record, a = record.appearance;
      const face = expressionIndex(options.expression === undefined ? "happy" : options.expression);
      const rig = layoutFor(lease, options), index = rig.index;
      if (options.shadow !== false) ctx.drawImage(shadowImage(), rig.floorX - 32 * rig.shadowScaleX, rig.floorY - 8 * rig.shadowScaleY, 64 * rig.shadowScaleX, 16 * rig.shadowScaleY);
      const body = poseFor(record, index);
      ctx.drawImage(body.page.canvas, body.x, body.y, FRAME_WIDTH, FRAME_HEIGHT, rig.bodyX, rig.bodyY, FRAME_WIDTH, FRAME_HEIGHT);
      if (FACE_VISIBLE[index] && a.hat !== "greathelm") {
        const sheet = poseFor(record.style, index), head = rig.headScale;
        ctx.drawImage(sheet.page.canvas, sheet.x + face % 2 * 32, sheet.y + Math.floor(face / 2) * 28, 32, 26,
          rig.headX + FACE_X[index] * head, rig.headY - .5 * head, 16 * head, 13 * head);
      }
    },
    async warm(requests, { budgetMs = 4, signal, onProgress } = {}) {
      assertOpen();
      if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error("Warm-up budget must be a positive number of milliseconds.");
      const tasks = [], seen = new Set(), startRevision = revision;
      const add = (record, index, lease) => {
        const key = record.id * 8 + index;
        if (!seen.has(key)) { seen.add(key); tasks.push({ record, index, lease }); }
      };
      for (const { pawn, directions = ["south"] } of requests) {
        const lease = leaseFor(pawn);
        for (const direction of directions) {
          const index = DIRECTION_INDEX[direction];
          if (!Number.isInteger(index)) throw new Error(`Unsupported direction: ${direction}.`);
          add(lease.record, index, lease);
          if (FACE_VISIBLE[index] && lease.record.appearance.hat !== "greathelm") add(lease.record.style, index, lease);
        }
      }
      if (tasks.length > maxPages * PAGE_COLUMNS * PAGE_ROWS) throw new Error("Warm-up exceeds cache capacity. Increase maxCacheBytes or warm fewer directions.");
      if (tasks.length && !signal?.aborted) shadowImage();
      let sliceStart = performance.now();
      for (let i = 0; i < tasks.length; i++) {
        if (signal?.aborted) throw new DOMException("Pawn warm-up aborted.", "AbortError");
        assertOpen(); if (revision !== startRevision) throw new Error("Pawn cache changed during warm-up.");
        const { record, index, lease } = tasks[i];
        if (lease.released) throw new Error("Pawn was released during warm-up.");
        poseFor(record, index);
        if (performance.now() - sliceStart >= budgetMs && i + 1 < tasks.length) {
          onProgress?.({ completed: i + 1, total: tasks.length });
          await new Promise(resolve => setTimeout(resolve, 0)); sliceStart = performance.now();
        }
      }
      onProgress?.({ completed: tasks.length, total: tasks.length }); return this.stats();
    },
    release(pawn) {
      assertOpen(); const lease = leases.get(pawn);
      if (!lease || lease.released) return;
      lease.released = true; lease.layout = null; const record = lease.record;
      if (--record.refs === 0) {
        freeOwner(record); records.delete(record.key);
        if (--record.style.refs === 0) { freeOwner(record.style); styles.delete(record.styleKey); }
      }
    },
    clear() {
      revision++;
      for (const record of records.values()) record.slots.fill(null);
      for (const style of styles.values()) style.slots.fill(null);
      for (const page of pages) { page.canvas.width = 0; page.canvas.height = 0; }
      if (shadow) { shadow.width = 0; shadow.height = 0; }
      if (mask) { mask.width = 0; mask.height = 0; }
      if (raster) { raster.width = 0; raster.height = 0; }
      pages.length = free.length = 0; first = last = shadow = mask = raster = null;
      poses = faceSheets = builds = faceBuilds = hits = misses = evictions = layoutBuilds = layoutHits = 0;
    },
    stats() {
      return { bytes: pages.length * PAGE_BYTES + (shadow ? SHADOW_BYTES : 0) + (mask ? MASK_BYTES : 0) + (raster ? RASTER_BYTES : 0), maxBytes: maxCacheBytes,
        pages: pages.length, poses, faceSheets, faceSprites: faceSheets * EXPRESSIONS.length, looks: records.size,
        builds, faceBuilds, hits, misses, evictions, preparations, layoutBuilds, layoutHits, capacity: maxPages * PAGE_COLUMNS * PAGE_ROWS };
    },
    dispose() { this.clear(); records.clear(); styles.clear(); closed = true; },
  };
}

function atlasOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new Error("Atlas options must be an object.");
  const { scale = 1, expression = "happy" } = options;
  expressionIndex(expression);
  if (![1, 2].includes(scale)) throw new Error("Unsupported scale; choose 1 or 2.");
  return { scale, expression };
}
export function createAtlas(input, options) {
  const { scale, expression } = atlasOptions(options);
  return makeAtlas(normalizeAppearance(input), scale, expression);
}
export function atlasMetadata(input, options) {
  const { scale, expression } = atlasOptions(options), appearance = normalizeAppearance(input);
  const frames = {};
  DIRECTIONS.forEach((direction, row) => {
    frames[direction] = {};
    for (const [state, count, start] of [["idle", 4, 0], ["walk", 8, 4]])
      frames[direction][state] = Array.from({ length: count }, (_, index) => ({ x: (index + start) * FRAME_WIDTH * scale, y: row * FRAME_HEIGHT * scale, width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }));
  });
  return { version: 2, appearance, expression, width: FRAME_WIDTH * 12 * scale, height: FRAME_HEIGHT * 8 * scale,
    frameWidth: FRAME_WIDTH * scale, frameHeight: FRAME_HEIGHT * scale, columns: 12, rows: 8, directions: DIRECTIONS,
    animations: ANIMATION, footAnchor: { x: 32 * scale, y: 72 * scale }, collisionRadius: 9 * scale, frames };
}
