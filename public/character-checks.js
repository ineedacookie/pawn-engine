// Browser-only checks. Same state is rendered through automatic and explicit
// furniture layering; byte-identical output catches missing/doubled props.
import { createPawnCharacters, CHARACTER_ACTIONS, REACTIONS } from "./pawn-character.js";
import { DIRECTIONS } from "./pawn-engine.js";
export async function runCharacterChecks({ onProgress } = {}) {
  const cast = createPawnCharacters(), canvases = [document.createElement("canvas"), document.createElement("canvas")];
  for (const c of canvases) c.width = c.height = 224;
  const [a, b] = canvases.map(c => c.getContext("2d", { willReadFrequently: true }));
  const sizes = [{height:1,head:1,width:1},{height:.85,head:.85,width:.8},{height:1.15,head:1.15,width:1.2},{height:.85,head:1.15,width:1.2},{height:1.15,head:.85,width:.8}];
  const looks = [{hair:"long",hat:"none"},{hair:"mohawk",hat:"wizard"},{hair:"curly",hat:"greathelm"}];
  let checks=0,failed=0,completed=0;const failures=[],total=sizes.length*looks.length*2;
  const check=(valid,label)=>{checks++;if(!valid){failed++;if(failures.length<30)failures.push(label);}};
  const pixels=ctx=>new Uint32Array(ctx.getImageData(0,0,224,224).data.buffer);
  try {
    for(const look of looks)for(const proportions of sizes)for(const posture of ["standing","seated"]){
      const character=cast.create({...look,proportions},{x:112,y:196,posture});
      await cast.warm([character],{directions:DIRECTIONS});const before=cast.stats();
      character.setStatus("stinky",true);
      for(const direction of DIRECTIONS){
        character.face(direction);
        for(const action of Object.keys(CHARACTER_ACTIONS)){
          character.clearReaction().act(action,{cardCount:7,target:action==="play-card"?{x:112,y:130,projection:{a:.894427,b:.447214,c:-.894427,d:.447214}}:null});character.update(CHARACTER_ACTIONS[action].duration*.45||.4);
          a.clearRect(0,0,224,224);b.clearRect(0,0,224,224);
          character.draw(a);character.drawOverhead(a);
          character.draw(b,{foreground:false});character.drawForeground(b);character.drawOverhead(b);
          const expected=pixels(a),actual=pixels(b);let equal=true;
          for(let i=0;i<expected.length;i++)if(expected[i]!==actual[i]){equal=false;break;}
          check(equal,`${look.hair}/${look.hat}/${proportions.head}/${posture}/${direction}/${action}: split layering`);
        }
        character.act("idle");
        for(const reaction of REACTIONS){
          character.react(reaction).update(.25);b.clearRect(0,0,224,224);character.drawOverhead(b);
          const rig=character.layout(),data=b.getImageData(0,0,224,224).data;let visible=false,below=false,edge=false;
          for(let y=0;y<224;y++)for(let x=0;x<224;x++)if(data[(y*224+x)*4+3]){visible=true;if(y>=Math.ceil(rig.topY))below=true;if(!x||!y||x===223||y===223)edge=true;}
          check(visible&&!below&&!edge,`${look.hair}/${look.hat}/${proportions.head}/${posture}/${direction}/${reaction}: bubble clearance`);
        }
      }
      const after=cast.stats();check(after.builds===before.builds&&after.faceBuilds===before.faceBuilds&&after.effectBuilds===before.effectBuilds,"No playback rebuilds");
      character.dispose();completed++;onProgress?.({completed,total});await new Promise(resolve=>setTimeout(resolve,0));
    }
    return{checks,failed,failures,cases:total,directions:8,actions:Object.keys(CHARACTER_ACTIONS).length,reactions:REACTIONS.length};
  }finally{cast.dispose();for(const c of canvases)c.width=c.height=0;}
}
