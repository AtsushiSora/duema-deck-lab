import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CASH='promoy21-014',PAREN='dmr14-010',HIRA='dmrp01-071',KALE='dmrp03-066';
const NATURE='dm01-108',WATER='dm01-083',WATER_SPELL='dm01-086',DARK_SPELL='dm01-027';
const TWIN='dm24bd4-007',EX='dmrp18-km3',APUL='dmrp22-042',BABYLONIA='dm32-021',BAIKEN='dm29-s02';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choiceUid=c=>c.value?.uid??c.value;
const pick=(s,uid)=>act(s,'extended',a=>choiceUid(s.decision.choices[a.choice])===uid);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 970 verifies four canonical cards and both Hiraga print aliases',()=>{
 const m=read('tools/support-phase-970.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CASH,PAREN,HIRA,KALE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmrp04m-047',HIRA],['dmex04-075',HIRA]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:970}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:969}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:970}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-970');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(catalogue.resolveRows([{id,count:1},{id:canonicalId,count:1}]),[{id:canonicalId,count:2}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:970}),m.cards.find(row=>row.id===canonicalId).spec);
 }
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(s.decision,null);
}

const revealed=s=>s.log.filter(x=>x.type==='reveal'&&x.source===PAREN).map(x=>x.cardId);
const drew=(s,p)=>s.players[p].drawsThisTurn||0;

test('Cash can pay with an owned mana card or decline, with no opponent cards eligible',()=>{
 for(const accept of [false,true]){
  let s=field();
  const mana=s.players[0].mana[0],enemy=put(s,1,'battle',NATURE);
  const source=put(s,0,'hand',CASH),before=physical(s);
  act(s,'play',a=>a.uid===source.uid);
  const options=s.decision.choices.map(choiceUid);
  assert.ok(options.includes(mana.uid)&&options.includes(source.uid)&&options.includes(null));
  assert.ok(!options.includes(enemy.uid)&&!options.includes(s.players[1].mana[0].uid));
  s=restore(s);pick(s,accept?mana.uid:null);
  assert.equal(drew(s,0),accept?2:0);
  assert.equal(inZone(s,0,'grave',mana),accept);
  assert.deepEqual(physical(s),before);
 }
});

for(const mode of ['under','top','seal'])test('Cash moves one physical battlefield card '+mode,()=>{
 const s=field(),base=inst(WATER);
 const top=put(s,0,'battle','dmr16g-021',{under:[base]});
 const sealed=put(s,0,'battle',WATER,{sealed:true});
 const seal=put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 const target={under:base,top,seal}[mode];
 const before=s.players[0].deck.slice(0,2).map(x=>x.uid);
 cast(s,CASH);
 assert.ok(!s.decision.choices.some(c=>choiceUid(c)===sealed.uid));
 pick(s,target.uid);
 assert.ok(inZone(s,0,'grave',target));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),before);
 if(mode==='under')assert.ok(inZone(s,0,'battle',top));
 if(mode==='top')assert.ok(inZone(s,0,'battle',base));
 if(mode==='seal')assert.ok(!sealed.sealed);
});

test('Cash draws after EX Life replaces the selected move and after Apul prevents a mana move',()=>{
 for(const origin of ['battle','mana']){
  const s=field(),shield=s.players[0].shields[0];
  const target=origin==='battle'?put(s,0,'battle',EX,{exLifeShieldUid:shield.uid}):s.players[0].mana[0];
  if(origin==='mana')put(s,1,'battle',APUL);
  cast(s,CASH);pick(s,target.uid);
  assert.ok(inZone(s,0,origin,target));
  assert.equal(s.players[0].shields.length,origin==='battle'?4:5);
  assert.equal(drew(s,0),2);
 }
});

for(const accept of [true,false])test('Paren reveals a drawn water spell and may leave the attacker tapped '+accept,()=>{
 let s=field(),x=put(s,0,'battle',PAREN);
 give(s,0,'deck',[WATER_SPELL,NATURE,NATURE]);
 attack(s,x.uid);pick(s,1);s=restore(s);
 assert.deepEqual(revealed(s),[WATER_SPELL]);
 assert.equal(s.decision.source,PAREN);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,accept?true:null);finishAttack(s);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,!accept);
 assert.equal(s.players[0].hand[0].cardId,WATER_SPELL);
});

for(const [id,draw] of [[WATER_SPELL,false],[WATER,true],[DARK_SPELL,true]])test('Paren keeps unqualified cards and declined draws private '+id+' '+draw,()=>{
 const s=field(),x=put(s,0,'battle',PAREN);
 put(s,0,'hand',WATER_SPELL);
 give(s,0,'deck',[id,NATURE,NATURE]);
 attack(s,x.uid);pick(s,draw?1:0);finishAttack(s);
 assert.deepEqual(revealed(s),[]);
 assert.equal(drew(s,0),Number(draw));
 assert.equal(x.tapped,true);
});

test('Paren uses the spell face of a Twinpact and can attack again after untapping',()=>{
 const s=field(),x=put(s,0,'battle',PAREN);
 give(s,0,'deck',[TWIN,WATER_SPELL,NATURE,NATURE]);
 attack(s,x.uid);pick(s,1);
 assert.deepEqual(revealed(s),[TWIN]);
 pick(s,true);finishAttack(s);
 attack(s,x.uid);pick(s,1);pick(s,true);finishAttack(s);
 assert.deepEqual(revealed(s),[TWIN,WATER_SPELL]);
 assert.equal(s.players[1].shields.length,3);
});

test('Paren does not reveal water spells drawn by the Babylonia replacement',()=>{
 let s=field(),x=put(s,0,'battle',PAREN);
 put(s,0,'battle',BABYLONIA);
 give(s,0,'deck',[WATER_SPELL,NATURE,NATURE,NATURE]);
 attack(s,x.uid);pick(s,1);
 act(s,'replaceDraw',a=>a.replace);s=restore(s);
 act(s,'discardDraw',a=>a.cardId===NATURE);finishAttack(s);
 assert.deepEqual(revealed(s),[]);
 assert.equal(s.players[0].hand[0].cardId,WATER_SPELL);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,true);
});

test('Hiraga offers only water cards and bounces only a legal enemy creature after discard',()=>{
 let s=field();
 const target=put(s,1,'battle',NATURE);
 put(s,1,'battle',WATER,{justDiverActive:true});
 put(s,1,'battle','dmsd20-016');
 put(s,0,'battle',WATER);
 const wet=put(s,0,'hand',TWIN),dry=put(s,0,'hand',DARK_SPELL);
 cast(s,HIRA);
 assert.deepEqual(s.decision.choices.map(choiceUid),[wet.uid,null]);
 pick(s,wet.uid);s=restore(s);
 assert.deepEqual(s.decision.choices.map(choiceUid),[target.uid]);
 pick(s,target.uid);
 assert.ok(inZone(s,0,'grave',wet)&&inZone(s,0,'hand',dry)&&inZone(s,1,'hand',target));
});

test('Hiraga can decline, and its discard is allowed even without an enemy creature',()=>{
 for(const accept of [false,true]){
  const s=field(),payment=put(s,0,'hand',WATER),enemy=put(s,1,'battle','dmsd20-016');
  cast(s,HIRA);pick(s,accept?payment.uid:null);
  assert.equal(inZone(s,0,'grave',payment),accept);
  assert.ok(inZone(s,1,'battle',enemy));
  assert.equal(s.decision,null);
 }
});

test('Hiraga still bounces after a replacement moves the discarded water card to battle',()=>{
 const s=field(),enemy=put(s,0,'battle',NATURE),baiken=put(s,1,'hand',BAIKEN);
 const source=put(s,1,'hand',HIRA);
 s.extTasks=[{op:'g34_Put',p:1,source:HIRA,origin:'hand',target:source.uid}];
 act(s,'toAttack');
 assert.ok(inZone(s,1,'battle',source));
 pick(s,baiken.uid);
 assert.equal(s.decision.task.op,'discardChosen');
 pick(s,true);
 assert.equal(s.decision.source,BAIKEN);
 pick(s,null);
 pick(s,enemy.uid);
 assert.ok(inZone(s,1,'battle',baiken)&&inZone(s,0,'hand',enemy));
});

for(const blocked of [false,true])test('Kaleido draws after choosing an owned graveyard spell '+blocked,()=>{
 let s=field();
 const spell=put(s,0,'grave',TWIN),creature=put(s,0,'grave',WATER);
 const enemy=put(s,1,'grave',WATER_SPELL);
 if(blocked)put(s,1,'battle',APUL);
 const top=s.players[0].deck.slice(0,2).map(x=>x.uid);
 cast(s,KALE);
 assert.deepEqual(s.decision.choices.map(choiceUid),[spell.uid,null]);
 s=restore(s);pick(s,spell.uid);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),top);
 assert.ok(inZone(s,0,blocked?'grave':'deck',spell));
 if(!blocked)assert.equal(s.players[0].deck.at(-1).uid,spell.uid);
 assert.ok(inZone(s,0,'grave',creature)&&inZone(s,1,'grave',enemy));
});

test('Kaleido can decline and does not draw with no eligible spell',()=>{
 for(const hasSpell of [false,true]){
  const s=field();
  put(s,0,'grave',hasSpell?WATER_SPELL:WATER);
  cast(s,KALE);
  if(hasSpell)pick(s,null);
  assert.equal(drew(s,0),0);
  assert.equal(s.players[0].grave.length,1);
  assert.equal(s.decision,null);
 }
});
