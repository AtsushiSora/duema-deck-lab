import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VIS='dmr23-001',KAL='dmr23-034',DODO='dmr23-010',NEO='dmr23-037',TREE='dmr22-042';
const REPRINTS=['dmex13-041','dm23bd5-045'];
const NATURE='dm01-108',DARK='dm01-090',FIRE='dm01-008',MULTI='dm24ex2-019';
const EVO='dmr20-017',SURFER='dm05-024',ONIKAMASU='dmrp01-041';
const HAND='dm01-027',BOUNCE='dm01-021',D2='dm23ex2-071',OLD_D2='dmr21-036',FIELD='dmrp08-005';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function multiMana(s,p,n){
 return Array.from({length:n},()=>put(s,p,'mana',MULTI,{tapped:true}));
}
function destroy(s,p,target){
 s.active=1-p;
 s.phase='main';
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
}

test('Phase 1006 registers five official definitions and resolves both Tree reprints to the original ID',()=>{
 const m=read('tools/support-phase-1006.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VIS,KAL,DODO,NEO,TREE]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),REPRINTS.map(id=>[id,TREE]));
 for(const reprint of m.printAliases){
  assert.equal(snapshot.aliases[reprint.id],TREE);
  assert.equal(registry.get(reprint.id).id,TREE);
  assert.ok(reprint.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[reprint.id],4);
  assert.deepEqual(standardCardSpec({...reprint,status:'complete'},{phase:1006}),m.cards[4].spec);
 }
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1006}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1006}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1006');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  for(const src of [data,details,snapshot])
   assert.deepEqual(src.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const {id,image,canonicalId=id} of [...m.cards,...m.printAliases])
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonicalId,image]]);
});

test('Visenma puts an opposing non-evolution creature face up in its shields and its S-Trigger remains usable',()=>{
 const s=field(),foe=put(s,1,'battle',SURFER),own=put(s,0,'battle',NATURE);
 const evo=put(s,1,'battle',EVO,{under:[inst(DARK)]});
 put(s,1,'battle',ONIKAMASU);
 give(s,1,'shields',[]);
 const vis=play(s,VIS);
 assert.deepEqual(choices(s),[foe.uid]);
 const ids=physical(s);
 pick(s,foe.uid);
 assert.ok(has(s,0,'battle',own)&&has(s,1,'battle',evo));
 assert.deepEqual(s.players[1].shields.map(x=>[x.uid,x.faceUp]),[[foe.uid,true]]);
 s.turn++;
 attack(s,vis.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===SURFER);
 drain(s);
 assert.ok(has(s,1,'battle',foe));
 assert.deepEqual(physical(s),ids);
});

for(const mode of ['own','opponent','none'])test('Visenma wins a battle against greater power only with its own D2 field '+mode,()=>{
 const s=field(),vis=put(s,0,'battle',VIS),large=put(s,1,'battle',MULTI,{tapped:true});
 if(mode!=='none')put(s,mode==='own'?0:1,'battle',OLD_D2);
 put(s,0,'battle',FIELD);
 attack(s,vis.uid,large.uid);
 drain(s);
 assert.equal(has(s,0,'battle',vis),mode==='own');
 assert.equal(has(s,1,'grave',large),mode==='own');
});

for(const zone of ['hand','grave','decline'])test('Calambine chooses one D2 field from its own hand or grave after destruction '+zone,()=>{
 let s=field();
 const kal=put(s,0,'battle',KAL),old=put(s,1,'battle',OLD_D2);
 const hand=put(s,0,'hand',D2),grave=put(s,0,'grave',D2);
 put(s,0,'hand',FIELD);
 put(s,1,'grave',D2);
 destroy(s,0,kal);
 assert.ok(has(s,0,'grave',kal));
 assert.deepEqual(choices(s),[hand.uid,grave.uid,null]);
 const before=physical(s);
 s=JSON.parse(JSON.stringify(s));
 const chosen={hand,grave}[zone];
 pick(s,chosen?.uid??null);
 drain(s);
 assert.deepEqual(physical(s),before);
 assert.equal(has(s,1,'grave',old),!!chosen);
 assert.equal(has(s,0,'battle',hand),zone==='hand');
 assert.equal(has(s,0,'battle',grave),zone==='grave');
});

test('Calambine has Slayer and a bounce does not trigger field deployment',()=>{
 const s=field(),kal=put(s,0,'battle',KAL),large=put(s,1,'battle',FIRE,{tapped:true});
 attack(s,kal.uid,large.uid);
 drain(s);
 assert.ok(has(s,0,'grave',kal)&&has(s,1,'grave',large));
 const t=field(),other=put(t,0,'battle',KAL),incoming=put(t,0,'hand',D2);
 t.active=1;
 play(t,BOUNCE);
 pick(t,other.uid);
 assert.ok(has(t,0,'hand',other)&&has(t,0,'hand',incoming));
 assert.equal(t.decision,null);
});

for(const mode of ['three','four','face-down'])test('Dodon uses current attack power, a strict comparison and only sweeps opponents '+mode,()=>{
 const s=field(),dodo=put(s,0,'battle',DODO,{powerModifiers:[{amount:2000,attackOnly:true}]});
 const ally=put(s,0,'battle',NATURE),untargetable=put(s,1,'battle',ONIKAMASU);
 const below=put(s,1,'battle',NATURE,{powerModifiers:[{amount:8999}]});
 const equal=put(s,1,'battle',MULTI),nonCreature=put(s,1,'battle',FIELD);
 const mana=multiMana(s,0,mode==='three'?3:4);
 if(mode==='face-down')mana.at(-1).faceDown=true;
 attack(s,dodo.uid);
 drain(s);
 assert.equal(has(s,1,'grave',untargetable),mode==='four');
 assert.equal(has(s,1,'grave',below),mode==='four');
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',equal)&&has(s,1,'battle',nonCreature));
 assert.equal(s.players[1].shields.length,3);
});

test('Dodon uses its last known attack power if it leaves before the pending sweep',()=>{
 let s=field();
 const dodo=put(s,0,'battle',DODO,{buff:2000}),watcher=put(s,0,'battle','dmrp18-s10');
 put(s,0,'battle','dmrp18-s10');
 const foe=put(s,1,'battle',FIRE,{powerModifiers:[{amount:4000}]}),equal=put(s,1,'battle',MULTI);
 multiMana(s,0,4);
 attack(s,dodo.uid);
 assert.equal(s.decision.type,'effectOrder');
 const move=s.pendingEffects.find(x=>x.uid===watcher.uid),sweep=s.pendingEffects.find(x=>x.uid===dodo.uid);
 move.task.defs=[{op:'ExactMove',owner:0,to:'hand',target:dodo.uid}];
 act(s,'orderEffect',a=>a.effectId===move.effectId);
 assert.ok(has(s,0,'hand',dodo));
 assert.equal(sweep.task.g692LastPower,11000);
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.effectId===sweep.effectId);
 drain(s);
 assert.ok(has(s,1,'grave',foe)&&has(s,1,'battle',equal));
 assert.equal(s.players[1].shields.length,5);
});

for(const zone of ['hand','mana','decline'])test('Neo Bomber offers a single visible D2 field from hand or mana '+zone,()=>{
 const s=field(),old=put(s,1,'battle',OLD_D2),hand=put(s,0,'hand',D2),mana=put(s,0,'mana',D2,{tapped:true});
 put(s,0,'mana',D2,{faceDown:true});
 put(s,0,'hand',FIELD);
 put(s,0,'grave',D2);
 play(s,NEO);
 assert.deepEqual(choices(s),[hand.uid,mana.uid,null]);
 const before=physical(s),chosen={hand,mana}[zone];
 pick(s,chosen?.uid??null);
 drain(s);
 assert.deepEqual(physical(s),before);
 assert.equal(has(s,1,'grave',old),!!chosen);
 assert.equal(has(s,0,'battle',hand),zone==='hand');
 assert.equal(has(s,0,'battle',mana),zone==='mana');
});

test('D2 deployment includes cost five and excludes cost six',()=>{
 const base=e.card(D2);
 const fields=[{...base,id:'test-1006-d2-five',cost:5},{...base,id:'test-1006-d2-six',cost:6}];
 e.setCards([...data.cards,...fields]);
 try{
  for(const id of [NEO,KAL]){
   const s=field(),eligible=put(s,0,'hand',fields[0].id);
   put(s,0,'hand',fields[1].id);
   if(id===NEO)play(s,id);
   else destroy(s,0,put(s,0,'battle',id));
   assert.deepEqual(choices(s),[eligible.uid,null]);
   pick(s,eligible.uid);
   drain(s);
   assert.ok(has(s,0,'battle',eligible));
  }
 }finally{e.setCards(data.cards);}
});

for(const n of [0,1,2])test('Tree adds a new face-up shield before optional mana recovery '+n,()=>{
 let s=field();
 const top=s.players[0].deck[0],before=s.players[0].shields.length;
 const recover=[put(s,0,'mana',MULTI,{tapped:true}),put(s,0,'mana',DARK,{faceDown:true})];
 const spell=play(s,TREE);
 assert.deepEqual(s.players[0].shields.slice(before).map(x=>[x.uid,x.faceUp]),[[top.uid,true]]);
 assert.ok(choices(s).includes(null));
 const ids=physical(s);
 s=JSON.parse(JSON.stringify(s));
 for(const x of recover.slice(0,n))pick(s,x.uid);
 if(n<2)pick(s,null);
 assert.deepEqual(physical(s),ids);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),recover.slice(0,n).map(x=>x.uid));
 assert.ok(has(s,0,'grave',spell));
});

test('Tree replaces a broken shield with a new face-up card through S-Trigger',()=>{
 const s=field(),attacker=put(s,0,'battle',NATURE);
 give(s,1,'mana',[]);
 give(s,1,'shields',[TREE]);
 const top=s.players[1].deck[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===TREE);
 drain(s);
 assert.deepEqual(s.players[1].shields.map(x=>[x.uid,x.faceUp]),[[top.uid,true]]);
 assert.equal(s.players[1].mana.length,0);
});

test('The two multicolor cards enter mana tapped',()=>{
 for(const id of [DODO,TREE]){
  const s=field(),x=put(s,0,'hand',id);
  s.phase='charge';
  act(s,'charge',a=>a.uid===x.uid);
  assert.equal(s.players[0].mana.find(y=>y.uid===x.uid).tapped,true);
 }
});
