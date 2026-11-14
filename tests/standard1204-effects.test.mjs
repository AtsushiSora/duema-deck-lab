import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const RASH='dm23rp1-033',BOGAMEN='dm23sp1-013',ELNARIC='dm23rp2-028';
const MONDO='dm23rp1-S3',JASHIN='dm22rp1-1B',MECHA='dm28-073',ABYSS='dm23rp2-005';
const AKANE='dm23rp1-S8',ASAGI='dm23rp1-072',NINGYO='dmrp22-033',GIANT_SEED='dmrp21-074';
const SMALL='dm01-108',REDIRECT='dm22ex1-086';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const put=(s,p,z,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

test('four verified prints resolve to three distinct supported cards',()=>{
 const manifest=read('support-phase-1204.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[RASH,BOGAMEN,ELNARIC]);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dm23rp2x-028']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1204}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1204}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function run(s,op,p,options={}){
 s.phase='main';
 s.extTasks=[{op,p,source:ELNARIC,...options}];
 act(s,'toAttack');
}

test('Rash must discard two distinct cards or can decline without discarding',()=>{
 for(const count of [1,2]){
  const s=setup();
  put(s,0,'battle',RASH);
  give(s,0,'hand',Array(count).fill(SMALL));
  const original=s.players[0].hand.map(x=>x.uid);
  end(s);
  if(count===2){
   pick(s,original[0]);
   assert.deepEqual(values(s),[original[1],null]);
   pick(s,null);
  }
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),original);
  assert.equal(s.players[0].grave.length,0);
  assert.equal(s.active,1);
 }
 const s=setup();
 put(s,0,'battle',RASH);
 give(s,0,'hand',[SMALL,SMALL]);
 s.active=1;
 end(s);
 assert.equal(s.players[0].grave.length,0);
 assert.equal(s.active,0);
});

test('Rash casts Mondo from a five-card deck and gains an extra turn (QA 43077)',()=>{
 let s=setup();
 put(s,0,'battle',RASH);
 give(s,0,'hand',[SMALL,SMALL]);
 give(s,0,'deck',[MONDO,SMALL,SMALL,SMALL,SMALL]);
 const [twin,left,right,draw1,draw2]=s.players[0].deck;
 const payments=s.players[0].hand.slice();
 end(s);
 const first=e.chooseAI(s);
 assert.ok(values(s)[first.choice]);
 e.step(s,first);
 pick(s,payments.find(x=>values(s).includes(x.uid)).uid);
 assert.ok(payments.every(x=>has(s,0,'grave',x)));
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.equal(s.decision.task.max,8);
 s=JSON.parse(JSON.stringify(s));
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===twin.uid&&s.decision.choices[a.choice].value.face===1);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[draw1.uid,draw2.uid]);
 assert.equal(s.extraTurns?.[0]?.player,0);
 assert.equal(s.winner,null);
 pick(s,right.uid);
 drain(s);
 assert.equal(s.active,0);
 assert.equal(s.players[0].deck.at(-1).uid,left.uid);
 assert.ok(has(s,0,'grave',twin));
});

test('Bogamen can summon from the grave, attack the player immediately and returns to the bottom',()=>{
 const s=setup(),source=put(s,0,'grave',BOGAMEN);
 put(s,1,'battle',SMALL,{tapped:true});
 act(s,'play',a=>a.uid===source.uid&&a.origin==='grave');
 assert.ok(has(s,0,'battle',source));
 attack(s,source.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 end(s);
 drain(s);
 assert.equal(s.players[0].deck.at(-1).uid,source.uid);
});

test('Bogamen can sacrifice any other friendly creature and uses Abyss Mekraid 5',()=>{
 const s=setup(),source=put(s,0,'battle',BOGAMEN),other=put(s,0,'battle',SMALL);
 put(s,0,'battle',GIANT_SEED);
 put(s,1,'battle',SMALL);
 give(s,0,'deck',[ABYSS,'dm23rp2-OR02',SMALL,SMALL,SMALL]);
 const chosen=s.players[0].deck[0];
 attack(s,source.uid);
 assert.deepEqual(values(s),[other.uid,null]);
 pick(s,other.uid);
 assert.ok(has(s,0,'grave',other));
 assert.deepEqual(values(s),[chosen.uid,null]);
 pick(s,chosen.uid);
 drain(s);
 assert.ok(has(s,0,'battle',chosen));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});

test('Bogamen has no Mekraid when it declines or has no other creature (QA 43247)',()=>{
 for(const alone of [false,true]){
  const s=setup(),source=put(s,0,'battle',BOGAMEN);
  if(!alone)put(s,0,'battle',SMALL);
  const original=s.players[0].deck.map(x=>x.uid);
  attack(s,source.uid);
  if(!alone)pick(s,null);
  drain(s);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),original);
  assert.equal(s.players[0].grave.length,0);
 }
});

test('Bogamen continues after Jashin replaces its destruction (QA 43246)',()=>{
 const s=setup(),source=put(s,0,'battle',BOGAMEN),jashin=put(s,0,'battle',JASHIN);
 give(s,0,'hand',[SMALL,SMALL]);
 give(s,0,'deck',[ABYSS,SMALL,SMALL,SMALL]);
 attack(s,source.uid);
 pick(s,jashin.uid);
 act(s,'replaceJashin');
 act(s,'leaveHand');
 act(s,'leaveHand');
 assert.ok(has(s,0,'battle',jashin));
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.equal(s.decision.task.max,5);
});

test('Elnaric blocks and can attack a tapped creature but cannot attack a player',()=>{
 const s=setup(),elnaric=put(s,0,'battle',ELNARIC),other=put(s,1,'battle',SMALL,{tapped:true});
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===elnaric.uid);
 assert.deepEqual(attacks.map(a=>a.target),[other.uid]);
 other.tapped=false;
 s.active=1;
 attack(s,other.uid);
 act(s,'block',a=>a.uid===elnaric.uid);
 drain(s);
 assert.ok(has(s,1,'grave',other));
 assert.equal(s.players[0].shields.length,5);
});

for(const active of [0,1]){
 test('Elnaric counts both cards added to one shield during turn of player '+active,()=>{
  let s=setup();
  s.active=active;
  give(s,0,'deck',[SMALL,SMALL,MECHA,SMALL,SMALL,SMALL]);
  const eligible=s.players[0].deck[2];
  const shield=s.players[0].shields[0].uid;
  for(let i=0;i<2;i++){
   run(s,'g71_Plus',0);
   pick(s,shield);
  }
  assert.equal(s.players[0].shields.length,5);
  assert.equal(s.players[0].shields[0].shieldStack.length,2);
  // The placements count even before Elnaric enters.
  put(s,0,'battle',ELNARIC);
  s=JSON.parse(JSON.stringify(s));
  end(s);
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.task.max,8);
  assert.deepEqual(values(s),[eligible.uid,null]);
  pick(s,eligible.uid);
  drain(s);
  assert.ok(has(s,0,'battle',eligible));
 });
}

test('Elnaric counts simultaneous placements even if a shield leaves later in the turn',()=>{
 const s=setup();
 put(s,0,'battle',ELNARIC);
 give(s,0,'deck',[SMALL,SMALL,MECHA,SMALL,SMALL,SMALL]);
 run(s,'g34_ShieldTop',0,{n:2,g779Simultaneous:true});
 const added=s.players[0].shields.at(-1).uid;
 run(s,'g34_ShieldGrave588',0,{n:1,required:true,owner:'self'});
 pick(s,added);
 drain(s);
 assert.equal(s.players[0].shields.length,6);
 end(s);
 assert.equal(s.decision.task.op,'g34_RaidPick');
});

test('Elnaric excludes placements from the previous turn, the other player and replacements',()=>{
 const s=setup();
 put(s,0,'battle',ELNARIC);
 give(s,0,'deck',[SMALL,SMALL,MECHA,SMALL,SMALL,SMALL,SMALL]);
 run(s,'g34_ShieldTop',0,{n:1});
 end(s);
 assert.equal(s.active,1);
 run(s,'g34_ShieldTop',1,{n:2,g779Simultaneous:true});
 run(s,'g34_ShieldTop',0,{n:1});
 put(s,1,'battle',REDIRECT);
 run(s,'g34_ShieldTop',0,{n:1});
 assert.equal(s.players[0].grave.length,1);
 end(s);
 assert.equal(s.active,0);
 assert.notEqual(s.decision?.task?.op,'g34_RaidPick');
});

test('Akane Mekraids after Ningyo redirects the attempted move, and may still decline (QA 43071)',()=>{
 for(const accept of [true,false]){
  let s=setup();
  const source=put(s,0,'battle',AKANE),other=put(s,0,'battle',ASAGI);
  put(s,1,'battle',NINGYO);
  give(s,0,'deck',[GIANT_SEED,SMALL,SMALL,SMALL]);
  attack(s,source.uid);
  assert.equal(s.decision.task.op,'g17_Scarlet');
  assert.deepEqual(values(s),[other.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,accept?other.uid:null);
  if(accept){
   assert.ok(has(s,0,'grave',other));
   assert.equal(s.decision.task.op,'g17_Mekraid');
  }else{
   assert.ok(has(s,0,'battle',other));
   assert.notEqual(s.decision?.task?.op,'g17_Mekraid');
  }
  drain(s);
 }
});
