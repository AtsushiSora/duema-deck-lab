import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LUPIA='dm23sd1-013',ASAGI='dm23rp1-072',KOHAKU='dm23rp1-048';
const SMALL='dm01-108',SEED='dmrp21-074',GIANT='dm23rp4-067',BIG_GIANT='dmr20-023';
const NINGYO='dmrp22-033',CURVE='dmrp22-030',DESTROY='dm01-027',BOUNCE='dm01-086';
const ARMORED='dm24ex4-032',NON_ARMORED_SPELL='dmex04-027';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const put=(s,p,z,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const paid=s=>s.players[0].mana.filter(y=>y.tapped).length;

test('seven verified prints resolve to three distinct supported cards',()=>{
 const manifest=read('support-phase-1203.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[LUPIA,ASAGI,KOHAKU]);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dm24ex1-079','dm23rp1-20A','dm23rp1-22B','promoy22-005']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1203}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1203}));
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

for(const [id,max,shields] of [[ASAGI,5,4],[KOHAKU,8,3]]){
 test(id+' moves another Giant element before Mekraid and breaks the printed number of shields',()=>{
  let s=setup();
  const attacker=put(s,0,'battle',id),other=put(s,0,'battle',SEED,{tapped:true});
  put(s,0,'battle',SMALL);
  put(s,1,'battle',ASAGI);
  give(s,0,'deck',[GIANT,BIG_GIANT,SEED,SMALL,SMALL,SMALL]);
  const [six,nine,seed]=s.players[0].deck;
  attack(s,attacker.uid);
  assert.deepEqual(values(s),[other.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,other.uid);
  assert.ok(has(s,0,'mana',other));
  assert.equal(s.decision.task.op,'g34_RaidPick');
  assert.equal(s.decision.task.max,max);
  assert.deepEqual(values(s),max===5?[seed.uid,null]:[six.uid,seed.uid,null]);
  const chosen=max===5?seed:six;
  const rest=max===5?[nine,six]:[nine,seed];
  pick(s,chosen.uid);
  assert.ok(has(s,0,'battle',chosen));
  assert.equal(paid(s),0);
  pick(s,rest[0].uid);
  drain(s);
  assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),rest.map(x=>x.uid));
  assert.equal(s.players[1].shields.length,shields);
 });

 test(id+' can decline or attack with no other Giant without looking at the deck',()=>{
  for(const hasGiant of [true,false]){
   const s=setup(),attacker=put(s,0,'battle',id);
   if(hasGiant)put(s,0,'battle',SEED);
   give(s,0,'deck',[SEED,GIANT,BIG_GIANT,SMALL]);
   const deck=s.players[0].deck.map(x=>x.uid);
   attack(s,attacker.uid);
   if(hasGiant)pick(s,null);
   drain(s);
   assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);
   assert.equal(s.players[1].shields.length,shields);
  }
 });
}

test('Kohaku still performs Mekraid when the move to mana is replaced (QA 43071)',()=>{
 const s=setup(),attacker=put(s,0,'battle',KOHAKU),other=put(s,0,'battle',ASAGI);
 put(s,1,'battle',NINGYO);
 give(s,0,'deck',[SEED,GIANT,SMALL,SMALL]);
 attack(s,attacker.uid);
 pick(s,other.uid);
 assert.ok(has(s,0,'grave',other));
 assert.equal(s.decision.task.op,'g34_RaidPick');
 pick(s,null);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('the CPU can choose an inexpensive tapped Giant to start Mekraid',()=>{
 const s=setup(),attacker=put(s,0,'battle',KOHAKU);
 put(s,0,'battle',GIANT);
 const other=put(s,0,'battle',SEED,{tapped:true});
 give(s,0,'deck',[GIANT,SMALL,SMALL,SMALL]);
 attack(s,attacker.uid);
 const action=e.chooseAI(s);
 assert.equal(values(s)[action.choice],other.uid);
 e.step(s,action);
 assert.equal(s.decision.task.op,'g34_RaidPick');
});

test('Asagi uses only the first card under Curve and puts it on the bottom on decline (QA 42991)',()=>{
 const s=setup(),attacker=put(s,0,'battle',ASAGI),other=put(s,0,'battle',SEED);
 put(s,1,'battle',CURVE);
 give(s,0,'deck',[SEED,ASAGI,SMALL,SMALL,SMALL]);
 const [first,second]=s.players[0].deck;
 attack(s,attacker.uid);
 pick(s,other.uid);
 assert.deepEqual(values(s),[first.uid,null]);
 pick(s,null);
 drain(s);
 assert.equal(s.players[0].deck[0].uid,second.uid);
 assert.equal(s.players[0].deck.at(-1).uid,first.uid);
});

test('Asagi uses an eligible spell face and its draw skips the two reserved cards (QA 43047)',()=>{
 const s=setup(),attacker=put(s,0,'battle',ASAGI),other=put(s,0,'battle',SEED);
 give(s,0,'deck',['dm23ex1-017',GIANT,BIG_GIANT,SMALL,SMALL,SMALL]);
 const [twin,left,right,draw1,draw2]=s.players[0].deck;
 attack(s,attacker.uid);
 pick(s,other.uid);
 assert.deepEqual(s.decision.choices.filter(o=>o.value).map(o=>o.value),[{uid:twin.uid,face:1}]);
 pick(s,twin.uid);
 assert.ok(has(s,0,'grave',twin));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[draw1.uid,draw2.uid]);
 pick(s,right.uid);
 drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[right.uid,left.uid]);
});

test('Bolshack Baku Lupia attacks on its summon turn and Mekraids on destruction',()=>{
 const s=setup(),bird=put(s,0,'hand',LUPIA),enemy=put(s,1,'battle',BIG_GIANT,{tapped:true});
 give(s,0,'deck',[ARMORED,NON_ARMORED_SPELL,SMALL,SMALL,SMALL]);
 const [armored,bolshack]=s.players[0].deck;
 act(s,'play',a=>a.uid===bird.uid);
 const mana=paid(s);
 attack(s,bird.uid,enemy.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',bird));
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(s.decision.choices.filter(o=>o.value).map(o=>o.value),
  [{uid:armored.uid,face:0},{uid:bolshack.uid,face:0}]);
 pick(s,armored.uid);
 drain(s);
 assert.ok(has(s,0,'battle',armored));
 assert.equal(paid(s),mana);
});

test('Bolshack Baku Lupia Mekraids when destroyed by a spell and ignores a bounce',()=>{
 for(const [spell,zone] of [[DESTROY,'grave'],[BOUNCE,'hand']]){
  const s=setup(),bird=put(s,0,'battle',LUPIA),removal=put(s,1,'hand',spell);
  give(s,0,'deck',[ARMORED,ASAGI,SMALL,SMALL]);
  const first=s.players[0].deck[0];
  s.active=1;
  act(s,'play',a=>a.uid===removal.uid);
  act(s,'effect',a=>a.targets.some(t=>t.uid===bird.uid));
  assert.ok(has(s,0,zone,bird));
  if(zone==='grave'){
   assert.equal(s.decision.task.op,'g34_RaidPick');
   assert.equal(s.decision.player,0);
   pick(s,first.uid);
   drain(s);
   assert.ok(has(s,0,'battle',first));
  }else{
   assert.equal(s.decision,null);
   assert.equal(s.players[0].deck[0].uid,first.uid);
  }
 }
});
