import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const KAMINARI='dmr01-036',SHAN='dmr02-021',NIDO='dmr01-031';
const LIGHT='dm01-075',FIRE='dm01-097',LAND='dm01-108',KILL='dm01-027';
const HUNTER='dmr04-050',TWIN='dmrp12-s01',LIGHT_SPELL='dm01-015',SPELL_HALF='dmex06-024',NINGYO='dmrp22-033';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function run(s,op,p,more={}){
 s.phase='main';
 s.extTasks=[{op,p,source:KILL,...more}];
 act(s,'toAttack');
}
function destroy(s,p,x,to='grave',flags={}){
 run(s,'g34_ExactMove',1-p,{owner:p,target:x.uid,to,...flags});
}
function strike(s,x,target='player'){
 attack(s,x.uid,target);
 drain(s);
}

test('Phase 845 keeps the existing IDs, official stats, images, and four-card limit across printings',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-845.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KAMINARI,SHAN,NIDO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmd07-008',KAMINARI],['promoy10-009',KAMINARI],['promoy10-025',SHAN],['promoy10-018',NIDO]
 ]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:845}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:844}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:845}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.civilizations,c.limit],[f.name,f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 for(const print of m.printAliases){
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:845}),m.cards.find(x=>x.id===print.canonicalId).spec);
  assert.deepEqual(registry.resolveRows([{id:print.id,count:1},{id:print.canonicalId,count:3}]),[{id:print.canonicalId,count:4}]);
  assert.equal(m.regulationVerification.limits[print.id],4);
 }
});

for(const id of [KAMINARI,SHAN])test(e.card(id).name+' summons normally and breaks two shields',()=>{
 const s=setup(),x=put(s,0,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 drain(s);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,e.card(id).cost);
 s.turn++;
 strike(s,x);
 assert.equal(s.players[1].shields.length,3);
});

test('Kaminarizm protects itself and allied Hunters in a simultaneous destruction batch',()=>{
 const s=setup(),source=put(s,0,'battle',KAMINARI),hunter=put(s,0,'battle',HUNTER);
 const other=put(s,0,'battle',LIGHT),enemy=put(s,1,'battle',HUNTER),before=physical(s);
 run(s,'g34_Sweep',0,{both:true,to:'grave',filter:{creature:true}});
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',source)&&has(s,0,'mana',hunter));
 assert.equal(source.tapped,false);
 assert.equal(hunter.tapped,true);
 assert.ok(has(s,0,'grave',other)&&has(s,1,'grave',enemy));
 assert.deepEqual(physical(s),before);
});

test('Kaminarizm does not redirect non-destruction and can protect a Hunter whose abilities are ignored',()=>{
 const s=setup(),source=put(s,0,'battle',KAMINARI);
 const returned=put(s,0,'battle',HUNTER);
 destroy(s,0,returned,'hand');
 assert.ok(has(s,0,'hand',returned));
 const moved=put(s,0,'battle',HUNTER);
 run(s,'g34_Sweep',0,{owner:'self',excludeUid:source.uid,filter:{race:'ハンター'},g815PutInGrave:true});
 assert.ok(has(s,0,'grave',moved));
 const ignored=put(s,0,'battle',HUNTER,{g35Ignored:s.turn});
 destroy(s,0,ignored);
 assert.ok(has(s,0,'mana',ignored));
 source.g35Ignored=s.turn;
 const unprotected=put(s,0,'battle',HUNTER);
 destroy(s,0,unprotected);
 assert.ok(has(s,0,'grave',unprotected));
});

test('Kaminarizm does not chain Ningyo and cannot redirect through a move prohibition',()=>{
 const s=setup();
 put(s,0,'battle',KAMINARI);
 put(s,1,'battle',NINGYO);
 const protectedHunter=put(s,0,'battle',HUNTER);
 destroy(s,0,protectedHunter);
 assert.ok(has(s,0,'mana',protectedHunter));
 for(const id of ['dm24rp4-S07',LIGHT,'dm01-008'])put(s,0,'battle',id);
 const blocked=put(s,0,'battle',HUNTER);
 assert.ok(new Set(s.players[0].battle.map(x=>e.card(x).cost)).size>=5);
 destroy(s,0,blocked);
 assert.ok(has(s,0,'grave',blocked));
});

test('Shan Bell offers one Light creature discard, with cancellation and saved-choice resumption',()=>{
 let s=setup();
 const shan=put(s,0,'battle',SHAN);
 give(s,0,'hand',[LIGHT,HUNTER,TWIN,FIRE,LIGHT_SPELL,SPELL_HALF]);
 const [light,multi,twin,fire,spell,spellHalf]=s.players[0].hand,before=physical(s);
 destroy(s,0,shan);
 assert.equal(s.decision.mandatory,false);
 act(s,'replaceJashin');
 assert.deepEqual(legal(s,'leaveHand').map(a=>a.uid),[light.uid,multi.uid,twin.uid]);
 act(s,'cancelLeaveHand');
 act(s,'replaceJashin');
 s=structuredClone(s);
 act(s,'leaveHand',a=>a.uid===twin.uid);
 assert.ok(has(s,0,'battle',shan)&&has(s,0,'grave',twin));
 assert.ok([light,multi,fire,spell,spellHalf].every(x=>has(s,0,'hand',x)));
 assert.deepEqual(physical(s),before);
});

test('Shan Bell can decline and cannot replace a non-destruction move or an invalid discard',()=>{
 for(const [to,hand] of [['grave',[LIGHT]],['grave',[FIRE,LIGHT_SPELL,SPELL_HALF]],['hand',[LIGHT]]]){
  const s=setup(),shan=put(s,0,'battle',SHAN);
  give(s,0,'hand',hand);
  destroy(s,0,shan,to);
  if(to==='grave'&&hand.length===1)act(s,'allowLeave');
  assert.equal(s.decision,null);
  assert.ok(has(s,0,to,shan));
  assert.equal(s.players[0].hand.length,hand.length+(to==='hand'?1:0));
 }
});

test('Shan Bell and Kaminarizm offer alternative replacements for the same Hunter',()=>{
 for(const pay of [false,true]){
  const s=setup(),shan=put(s,0,'battle',SHAN),light=put(s,0,'hand',LIGHT);
  put(s,0,'battle',KAMINARI);
  destroy(s,0,shan);
  assert.equal(s.decision.mandatory,true);
  assert.equal(legal(s,'allowLeave').length,0);
  act(s,pay?'replaceJashin':'replaceYamata');
  if(pay)act(s,'leaveHand',a=>a.uid===light.uid);
  assert.ok(has(s,0,pay?'battle':'mana',shan)&&has(s,0,pay?'grave':'hand',light));
 }
});

test('Two Shan Bells cannot reserve the same discard in a simultaneous destruction',()=>{
 const s=setup(),first=put(s,0,'battle',SHAN),second=put(s,0,'battle',SHAN),light=put(s,0,'hand',LIGHT);
 const before=physical(s);
 run(s,'g34_Sweep',0,{owner:'self',to:'grave',filter:{creature:true}});
 act(s,'replaceJashin');
 act(s,'leaveHand',a=>a.uid===light.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'grave',second)&&has(s,0,'grave',light));
 assert.deepEqual(physical(s),before);
});

test('Nidogiri can attack after and between allies, with either target, and a third attack is optional',()=>{
 let s=setup(),nido=put(s,0,'battle',NIDO),ally=put(s,0,'battle',LAND);
 const target=put(s,1,'battle',FIRE,{tapped:true});
 put(s,1,'shields',LAND);
 strike(s,ally);
 assert.equal(legal(s,'endTurn').length,0);
 strike(s,nido,target.uid);
 assert.ok(has(s,1,'grave',target));
 assert.equal(nido.tapped,false);
 const another=put(s,0,'battle',LAND);
 strike(s,another);
 assert.equal(legal(s,'endTurn').length,0);
 s=structuredClone(s);
 const dragon=s.players[0].battle.find(x=>x.uid===nido.uid);
 strike(s,dragon);
 assert.equal(dragon.tapped,true);
 dragon.tapped=false;
 assert.equal(legal(s,'endTurn').length,1);
 assert.ok(legal(s,'attack').some(a=>a.uid===dragon.uid));
 s.turn++;
 assert.equal(legal(s,'endTurn').length,0);
});

test('An opponent tap consumes the first untap for that turn and a later turn starts a new count',()=>{
 const s=setup(),nido=put(s,0,'battle',NIDO);
 s.active=1;
 run(s,'g34_TapAll',1);
 drain(s);
 assert.equal(nido.tapped,false);
 run(s,'g34_TapAll',1);
 drain(s);
 assert.equal(nido.tapped,true);
 s.turn++;
 s.active=0;
 nido.tapped=false;
 strike(s,nido);
 assert.equal(nido.tapped,false);
 assert.equal(legal(s,'endTurn').length,0);
});

test('Nidogiri permits ending with no legal attack and loses both abilities when ignored',()=>{
 for(const attrs of [{entered:1},{tapped:true},{g35Ignored:1}]){
  const s=setup();
  s.phase='attack';
  s.turn=1;
  const nido=put(s,0,'battle',NIDO,attrs);
  assert.equal(legal(s,'endTurn').length,1);
  if(attrs.g35Ignored){
   strike(s,nido);
   assert.equal(nido.tapped,true);
  }else assert.equal(legal(s,'attack').length,0);
 }
});

test('Nidogiri can end after a first attack if an untap prohibition prevents a second attack',()=>{
 const s=setup(),nido=put(s,0,'battle',NIDO,{tapLocks:[{who:1,afterTurns:999}]});
 strike(s,nido);
 assert.equal(nido.tapped,true);
 assert.equal(legal(s,'attack').length,0);
 assert.equal(legal(s,'endTurn').length,1);
});
