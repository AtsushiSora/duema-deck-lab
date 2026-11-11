import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CHAKE='dmr14-054',SKULL='dmr14-046',STAG='dmr14-006',HELEN='dmr14-001',DIG='dmr14-005';
const PRINTS=['dm23bd4-037','dmex13-006','dmbd05-008','dmx26-014'].map(id=>[id,DIG]);
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',WATER='dm01-083',LIGHT='dm01-075';
const DRAGON='dm01-008',LIGHT_DRAGON='dmr16g-005',HAND='dm01-027',WIPE='dm14-015',ESCAPE='dmr16s-043';
const SILENT='dm10-080',UNTAP='dm26rp2-057',GEAR='dm15-008',TIG='dmr14-036';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 988 registers five official definitions and maps four reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-988.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CHAKE,SKULL,STAG,HELEN,DIG]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:DIG,count:4}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:988}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:988}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,[CHAKE,SKULL].includes(id)?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-988');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:988}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const manaTapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function seal(s,p,host,under=NATURE){
 host.sealed=true;
 return put(s,p,'seals',under,{sealOf:host.uid,faceDown:true});
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

const attackOptions=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
const canEnd=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
const passBlock=s=>{act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields');};

test('Chake taps one ally, raises its power and restricts declared attacks until the caster’s next turn',()=>{
 let s=field();
 const lure=put(s,0,'battle',FIRE),other=put(s,0,'battle',NATURE,{tapped:true});
 const foe=put(s,1,'battle',DRAGON);
 play(s,CHAKE);
 assert.deepEqual(new Set(choices(s)),new Set([lure.uid,other.uid]));
 pick(s,lure.uid);
 assert.ok(lure.tapped);
 assert.equal(e.power(lure,false,s),6000);
 end(s);
 s=restore(s);
 s.phase='attack';
 assert.ok(canEnd(s));
 assert.deepEqual(attackOptions(s,foe).map(a=>a.target),[lure.uid]);
 find(s,0,'battle',lure).tapped=false;
 assert.ok(attackOptions(s,foe).some(a=>a.target==='player'));
 assert.ok(attackOptions(s,foe).some(a=>a.target===other.uid));
 end(s);
 assert.equal(e.power(find(s,0,'battle',lure),false,s),2000);
 assert.ok(!s.g42Lures.length);
});

test('Chake’s Shield Trigger applies to a creature already tapped and can guide the next attack',()=>{
 const s=field(),lure=put(s,0,'battle',FIRE,{tapped:true});
 give(s,0,'shields',[CHAKE]);
 s.active=1;
 const one=put(s,1,'battle',FIRE),two=put(s,1,'battle',FIRE);
 attack(s,one.uid);
 passBlock(s);
 act(s,'useTrigger');
 pick(s,lure.uid);
 assert.equal(e.power(lure,false,s),6000);
 assert.ok(canEnd(s));
 assert.deepEqual(attackOptions(s,two).map(a=>a.target),[lure.uid]);
});

test('Skull Moon discards two chosen hidden positions, then may sacrifice one Dark creature',()=>{
 for(const accept of [false,true]){
  let s=field();
  const dark=put(s,0,'battle',DARK),other=put(s,0,'battle',FIRE);
  const cards=[FIRE,WATER,NATURE].map(id=>put(s,1,'hand',id));
  const skull=play(s,SKULL),all=physical(s);
  assert.deepEqual(choices(s),[0,1,2]);
  assert.ok(s.decision.choices.every(c=>!c.cardId));
  pick(s,0);
  assert.deepEqual(choices(s),[1,2]);
  s=restore(s);
  pick(s,2);
  assert.deepEqual(s.players[1].grave.map(x=>x.uid),[cards[0].uid,cards[2].uid]);
  assert.ok(has(s,1,'hand',cards[1]));
  assert.deepEqual(choices(s),[dark.uid,null]);
  pick(s,accept?dark.uid:null);
  assert.equal(has(s,0,'grave',dark),accept);
  assert.equal(has(s,0,'hand',skull),accept);
  assert.equal(has(s,0,'grave',skull),!accept);
  assert.ok(has(s,0,'battle',other));
  assert.deepEqual(physical(s),all);
 }
});

test('Skull Moon still returns after choosing a sacrifice whose destruction is replaced',()=>{
 const s=field(),protectedAlly=put(s,0,'battle',ESCAPE),skull=play(s,SKULL);
 pick(s,protectedAlly.uid);
 assert.equal(s.decision.type,'leaveReplace');
 act(s,'replaceEscape');
 if(s.decision)drain(s);
 assert.ok(has(s,0,'battle',protectedAlly)&&has(s,0,'hand',skull));
});

test('Skull Moon handles a one-card hand and an opponent with Tignus',()=>{
 for(const protectedHand of [false,true]){
  const s=field(),hidden=put(s,1,'hand',WATER),own=put(s,0,'battle',DARK);
  if(protectedHand)put(s,1,'battle',TIG);
  const spell=play(s,SKULL);
  assert.deepEqual(choices(s),[own.uid,null]);
  pick(s,own.uid);
  assert.equal(has(s,1,'hand',hidden),protectedHand);
  assert.equal(has(s,1,'grave',hidden),!protectedHand);
  assert.ok(has(s,0,'hand',spell));
 }
});

test('Stagnate requires a Light Dragon and attacks immediately as a W Breaker',()=>{
 const s=field(),spell=put(s,0,'hand',STAG);
 put(s,0,'battle',LIGHT);
 put(s,0,'battle',DRAGON);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===spell.uid));
 const base=put(s,0,'battle',LIGHT_DRAGON,{entered:s.turn});
 act(s,'play',a=>a.uid===spell.uid);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(spell.under?.some(x=>x.uid===base.uid));
 attack(s,spell.uid);
 passBlock(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Stagnate prevents only creature untaps at the opposing turn start while tapped',()=>{
 for(const mode of ['tapped','untapped','sealed']){
  const s=field(),source=put(s,0,'battle',STAG,{tapped:mode!=='untapped'});
  const enemy=put(s,1,'battle',FIRE,{tapped:true}),gear=put(s,1,'battle',GEAR,{tapped:true});
  if(mode==='sealed')seal(s,0,source);
  const mana=s.players[1].mana[0];
  mana.tapped=true;
  end(s);
  assert.equal(enemy.tapped,mode==='tapped');
  assert.ok(!mana.tapped&&!gear.tapped);
  if(mode==='tapped'){
   s.phase='main';
   play(s,UNTAP);
   pick(s,enemy.uid);
   assert.ok(!enemy.tapped&&source.tapped);
  }
 }
});

test('Stagnate denies the Silent Skill option during the lock and allows it when untapped',()=>{
 for(const locked of [true,false]){
  const s=field();
  put(s,0,'battle',STAG,{tapped:locked});
  const enemy=put(s,1,'battle',SILENT,{tapped:true});
  s.phase='attack';
  act(s,'endTurn');
  assert.equal(s.decision?.type==='silent496',!locked);
  if(!locked)act(s,'silent496',a=>!a.yes);
  assert.equal(enemy.tapped,locked);
 }
});

function destroyWithHand(s,x){
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}
test('Helen watches own creature destruction and optionally deploys an eligible top card',()=>{
 for(const self of [false,true]){
  let s=field(),helen=put(s,0,'battle',HELEN),ally=put(s,0,'battle',FIRE);
  give(s,0,'deck',[WATER,STAG,NATURE,FIRE]);
  const [eligible,ineligible]=s.players[0].deck;
  destroyWithHand(s,self?helen:ally);
  assert.equal(s.decision.player,0);
  assert.deepEqual(choices(s),[eligible.uid,null]);
  s=restore(s);
  pick(s,eligible.uid);
  assert.ok(has(s,0,'battle',eligible));
  assert.equal(s.players[0].deck.at(-1).uid,ineligible.uid);
  assert.equal(has(s,0,'battle',helen),!self);
 }
});

test('Helen may decline and reorder the two viewed cards on the bottom',()=>{
 const s=field(),helen=put(s,0,'battle',HELEN);
 give(s,0,'deck',[FIRE,WATER,NATURE]);
 const [first,second,last]=s.players[0].deck;
 destroyWithHand(s,helen);
 pick(s,null);
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,second.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[last.uid,second.uid,first.uid]);
});

test('Helen sees only its own destruction when it is destroyed simultaneously with other allies',()=>{
 const s=field();
 const helen=put(s,0,'battle',HELEN);
 for(const p of [0,1])for(let n=0;n<3;n++)put(s,p,'battle',FIRE);
 give(s,0,'deck',[FIRE,WATER,NATURE,FIRE,WATER]);
 s.active=1;
 play(s,WIPE);
 assert.ok(has(s,0,'grave',helen));
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,s.players[0].deck[0].uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].battle.length,1);
 assert.equal(s.log.filter(x=>x.cardId===HELEN&&x.type==='look').length,1);
});

test('Diglupion ramps the top card only with another visible allied Dragon',()=>{
 for(const mode of ['ally','enemy','sealed','none']){
  const s=field(),top=s.players[0].deck[0];
  if(mode!=='none'){
   const other=put(s,mode==='enemy'?1:0,'battle',DRAGON);
   if(mode==='sealed')seal(s,0,other);
  }
  put(s,0,'battle',FIRE);
  const dig=play(s,DIG);
  assert.equal(manaTapped(s,0),3);
  assert.equal(has(s,0,'mana',dig),mode!=='ally');
  assert.equal(has(s,0,'mana',top),mode==='ally');
  assert.equal(has(s,0,'battle',dig),mode==='ally');
 }
});
