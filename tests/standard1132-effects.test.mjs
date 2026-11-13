import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TANK='dm25rp2-014',WING='dm25rp2-S09',PERFE='dm25rp2-S08';
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',TATE='dm25rp2-049',DEATH='dm01-027';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
function evolve(s,base){
 if(s.decision?.type==='evolution')act(s,'evolve',a=>(a.baseUid||null)===(base?.uid??null));
}

test('ten official prints resolve to their canonical cards, with complete text and usage limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1132.json',import.meta.url)));
 const images=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[TANK,WING,PERFE]);
 assert.equal(manifest.printAliases.length,7);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1132}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(images.prints.some(p=>p.id===row.id&&p.canonicalId===id&&p.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  detail.faces=detail.faces.map(f=>({...f,abilityText:f.abilityText+'\n未知の能力'}));
  assert.throws(()=>standardCardSpec(detail,{phase:1132}));
 }
});

const topDeck=(s,p,ids)=>{give(s,p,'deck',[...ids,NATURE,NATURE,NATURE,NATURE]);return s.players[p].deck;};
const destroy=(s,target)=>{
 play(s,DEATH);
 act(s,'effect',a=>a.targets?.some(y=>y.uid===target.uid));
};

for(const chooseBase of [true,false])test('Tank Super Soul Raid reveals, allows one eligible base, and orders the rest: '+chooseBase,()=>{
 const s=setup(),[light,fire,water]=topDeck(s,0,[TATE,FIRE,'dm01-079']);
 const x=play(s,TANK);
 evolve(s,null);
 assert.equal(s.decision.task.op,'g27_RaidPick');
 assert.ok(values(s).includes(light.uid)&&!values(s).includes(fire.uid));
 pick(s,chooseBase?light.uid:null);
 while(s.decision?.task.op==='g27_Order')pick(s,values(s).at(-1));
 assert.equal(e.isEvolution(x),chooseBase);
 assert.equal(!!x.under?.includes(light),chooseBase);
 assert.deepEqual(s.players[0].deck.slice(chooseBase?-2:-3),chooseBase?[water,fire]:[water,fire,light]);
 assert.equal(s.players[0].g27Protected.length,0);
});

for(const mode of ['some','all','decline'])test('Tank transfers physical bases in the chosen order at attack end: '+mode,()=>{
 const s=setup(),second=inst(DARK),first={...inst(TATE),under:[second]},hidden={...inst(FIRE),faceDown:true};
 const x=add(s,0,'battle',TANK,{under:[first,hidden]});
 const old=inst(NATURE),target=add(s,0,'battle','dm25rp2-S06',{under:[old]});
 const ordinary=add(s,0,'battle',NATURE);
 const identities=e.physicalCards(s).map(y=>y.uid).sort();
 attack(s,x.uid);
 drainToTransfer(s);
 assert.ok(values(s).includes(target.uid)&&!values(s).includes(ordinary.uid)&&!values(s).includes(x.uid));
 pick(s,mode==='decline'?null:target.uid);
 if(mode!=='decline'){
  assert.equal(s.decision.choices.find(c=>c.value===hidden.uid).cardId,undefined);
  pick(s,hidden.uid);
  pick(s,second.uid);
  pick(s,mode==='all'?first.uid:null);
  assert.deepEqual(target.under.map(y=>y.uid),[old.uid,hidden.uid,second.uid,...(mode==='all'?[first.uid]:[])]);
  assert.ok(hidden.faceDown);
  assert.equal(e.isEvolution(x),mode==='some');
 }else assert.deepEqual(x.under,[first,hidden]);
 assert.deepEqual(e.physicalCards(s).map(y=>y.uid).sort(),identities);
});
test('Tank transfer triggers the allied under-card ability once per transferred card after JSON continuation',()=>{
 const s=setup(),bases=[inst(FIRE),inst(DARK),inst(TATE)];
 const tank=add(s,0,'battle',TANK,{under:bases.slice()});
 const recipient=add(s,0,'battle',TATE);
 const watcher=add(s,0,'battle','dm25rp2-OR1');
 give(s,1,'hand',[NATURE,NATURE,NATURE]);
 attack(s,tank.uid);
 drainToTransfer(s);
 pick(s,recipient.uid);
 pick(s,bases[0].uid);
 const resumed=JSON.parse(JSON.stringify(s));
 pick(resumed,bases[1].uid);
 const before=resumed.players[1].hand.length;
 pick(resumed,null);
 assert.equal(resumed.decision.type,'effectOrder');
 assert.equal(resumed.pendingEffects.filter(effect=>effect.uid===watcher.uid).length,2);
 const counts=()=>resumed.players[1].hand.length;
 for(let n=0;n<20&&resumed.decision&&counts()>before-2;n++){
  const d=resumed.decision;
  if(d.task?.op==='g34_Break497')pick(resumed,null);
  else e.step(resumed,e.chooseAI(resumed));
 }
 assert.equal(counts(),before-2);
 assert.deepEqual(resumed.players[0].battle.find(x=>x.uid===recipient.uid).under.map(x=>x.uid),bases.slice(0,2).map(x=>x.uid));
});

function drainToTransfer(s){
 for(let i=0;s.decision?.task?.op!=='g34_TransferBases1132'&&s.decision&&i<10;i++)e.step(s,e.chooseAI(s));
 assert.equal(s.decision?.task?.op,'g34_TransferBases1132');
}

for(const mode of ['self','self evolved','allied NEO','conventional','ordinary','skip mill'])test('Wing tracks each qualifying entry once and attaches to the entrant: '+mode,()=>{
 const s=setup(),self=mode.startsWith('self');
 const watcher=self?null:add(s,0,'battle',WING);
 const base=mode==='self evolved'?add(s,0,'battle',FIRE):mode==='conventional'?add(s,0,'battle','dm01-083'):null;
 const prior=add(s,0,'grave',DARK);
 const [,milledSpell]=topDeck(s,0,[FIRE,DEATH]);
 const id=self?WING:mode==='conventional'?'dm02-024':mode==='ordinary'?NATURE:'dm25rp2-040';
 const x=play(s,id);
 evolve(s,base);
 if(mode==='ordinary'){assert.ok(!s.decision);return;}
 assert.equal(s.decision?.task.op,'g34_Mill');
 assert.equal(s.decision.source,WING);
 pick(s,mode==='skip mill'?null:true);
 assert.equal(s.decision.task.origin,'grave');
 assert.ok(values(s).includes(prior.uid)&&!values(s).includes(milledSpell.uid));
 pick(s,prior.uid);
 assert.ok(x.under.some(y=>y.uid===prior.uid));
 assert.ok(!watcher?.under?.length);
 assert.ok(!s.decision);
 assert.equal(s.players[0].grave.length,mode==='skip mill'?0:2);
});

for(const mode of ['under','hand','decline','replacement','ordinary'])test('PERFE follows a NEO attack with optional ramp and one mana creature: '+mode,()=>{
 const s=setup(),x=add(s,0,'battle',mode==='ordinary'?NATURE:'dm25rp2-049');
 add(s,0,'battle',PERFE);
 if(mode==='replacement')add(s,1,'battle','dm22ex1-086');
 const [top]=topDeck(s,0,[FIRE]),original=s.players[0].mana.find(y=>y.cardId===DARK);
 attack(s,x.uid);
 if(mode==='ordinary'){assert.notEqual(s.decision?.source,PERFE);return;}
 assert.equal(s.decision.source,PERFE);
 pick(s,mode==='decline'?null:true);
 if(mode==='decline'){
  assert.ok(inZone(s,0,'deck',top));
  return;
 }
 assert.equal(s.decision.task.op,'g34_ManaBaseOrHand1132');
 assert.equal(inZone(s,0,'mana',top),mode!=='replacement');
 const chosen=mode==='replacement'?original:top,to=mode==='under'?'under':'hand';
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return v?.uid===chosen.uid&&v.to===to;
 });
 if(to==='under')assert.ok(x.under.includes(top)&&e.isEvolution(x));
 else assert.ok(inZone(s,0,'hand',chosen));
 if(mode==='replacement')assert.ok(inZone(s,0,'grave',top));
});

for(const mode of ['three','two','plain evolution','zero','ignored aura','self'])test('PERFE only protects positive-power NEO evolutions with at least three cards: '+mode,()=>{
 const s=setup();s.active=1;
 const base=inst(FIRE),other={...inst(NATURE),faceDown:true};
 const id=mode==='plain evolution'?'dm02-024':mode==='self'?PERFE:'dm25rp2-049';
 const x=add(s,0,'battle',id,{under:mode==='two'?[base]:[base,other]});
 if(mode!=='self')add(s,0,'battle',PERFE,mode==='ignored aura'?{g35Ignored:s.turn}:{});
 if(mode==='zero')x.powerModifiers=[{amount:-e.power(x,false,s)}];
 if(mode==='zero')act(s,'toAttack');
 else destroy(s,x);
 drain(s);
 assert.equal(inZone(s,0,'battle',x),['three','self'].includes(mode));
});
