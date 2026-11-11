import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DEATH='dm23-046',ARMS='dm23-054',MASTER='dm23-039',SHAMAN='dm23-037';
const PLAIN='dm01-108',BLOCKER='dm01-082',BIG='dm01-004';
const LIGHT='dm01-078',LIGHT_TWIN='dmex06-024',WRONG_TWIN='dm25ex1-040',WATER_SPELL='dm06-085';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);

function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function declare(s,bio,kind){
 assert.equal(s.decision.task.op,'g34_BioKDeclare951');
 assert.deepEqual(choices(s),[bio.uid,null]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(bio.cardId));
 pick(s,bio);
 assert.equal(s.decision.task.op,kind);
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Phase 953 verifies all four full definitions and the original Master Finger ID',()=>{
 const m=read('tools/support-phase-953.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[DEATH,ARMS,MASTER,SHAMAN]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['promoy5-063',MASTER]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],card=e.card(id),canonical=m.cards.find(c=>c.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:953}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:953}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.race,e.civilizations(card),card.manaValue,card.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(card.supportBatch,'phase-953');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

for(const accept of [true,false])test('Deathhunter Slayer applies to the battle already starting '+accept,()=>{
 let s=field();
 const attacker=put(s,0,'battle','dm23-051'),defender=put(s,1,'battle',BIG,{tapped:true});
 const bio=put(s,0,'hand',DEATH);
 attack(s,attacker.uid,defender.uid);
 act(s,'noBlock');
 declare(s,bio,'g34_BioT952');
 s=restore(s);
 pick(s,accept?true:null);
 assert.ok(find(s,0,'grave',attacker));
 assert.ok(find(s,0,accept?'grave':'hand',bio));
 assert.ok(find(s,1,accept?'grave':'battle',defender));
 assert.equal(s.log.filter(row=>row.type==='battle').length,1);
});

test('Deathhunter Slayer stays on the surviving attacker only until its turn ends',()=>{
 const s=field();
 const attacker=put(s,0,'battle','dm23-051'),other=put(s,0,'battle','dm23-051');
 const defender=put(s,1,'battle',PLAIN,{tapped:true}),bio=put(s,0,'hand',DEATH);
 attack(s,attacker.uid,defender.uid);
 act(s,'noBlock');
 declare(s,bio,'g34_BioT952');
 pick(s,true);
 assert.equal(e.effectiveCard(attacker,s).slayer,true);
 assert.ok(!e.effectiveCard(other,s).slayer);
 end(s);
 assert.ok(!e.effectiveCard(attacker,s).slayer);
});

test('Zeblus Arms stacks fixed power before comparison and expires at turn end',()=>{
 let s=field();
 const attacker=put(s,0,'battle','dm19-109'),defender=put(s,1,'battle',BIG);
 const a=put(s,0,'hand',ARMS),b=put(s,0,'hand',ARMS);
 attack(s,attacker.uid);
 act(s,'block');
 assert.deepEqual(choices(s),[a.uid,b.uid,null]);
 pick(s,b);
 s=restore(s);
 pick(s,a);
 for(const bio of [b,a]){
  assert.equal(s.decision.task.uid,bio.uid);
  pick(s,true);
  assert.ok(find(s,0,'grave',bio));
 }
 const survivor=find(s,0,'battle',attacker);
 assert.ok(find(s,1,'grave',defender));
 assert.equal(e.power(survivor,false,s),6000);
 end(s);
 assert.equal(e.power(survivor,false,s),2000);
});

for(const mode of ['normal','locked','reentered','defeated'])test('Master Finger boosts and tracks the attacker for turn end '+mode,()=>{
 let s=field();
 const attacker=put(s,0,'battle',MASTER),other=put(s,0,'battle',MASTER,{tapped:true});
 const defender=put(s,1,'battle',mode==='defeated'?'dm17-048':BLOCKER,{tapped:true});
 const bio=put(s,0,'hand',MASTER);
 attack(s,attacker.uid,defender.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_BioKDeclare951');
 pick(s,bio);
 pick(s,true);
 assert.ok(find(s,0,'grave',bio));
 if(mode==='defeated'){
  assert.ok(find(s,0,'grave',attacker));
  end(s);
  assert.ok(find(s,0,'grave',attacker));
  return;
 }
 const survivor=find(s,0,'battle',attacker);
 assert.equal(e.power(survivor,false,s),4000);
 assert.equal(survivor.tapped,true);
 assert.ok(find(s,1,'grave',defender));
 if(mode==='locked')survivor.tapLocks=[0];
 if(mode==='reentered')survivor.incarnation=(survivor.incarnation||0)+1;
 s=restore(s);
 end(s);
 assert.equal(find(s,0,'battle',attacker).tapped,mode!=='normal');
 assert.equal(find(s,0,'battle',other).tapped,true);
 assert.equal(e.power(find(s,0,'battle',attacker),false,s),2500);
});

for(const amount of [0,1,2])test('Shaman returns up to two light spells from its own graveyard '+amount,()=>{
 let s=field();
 const attacker=put(s,0,'battle','dm19-109'),bio=put(s,0,'hand',SHAMAN);
 const a=put(s,0,'grave',LIGHT),b=put(s,0,'grave',LIGHT_TWIN),c=put(s,0,'grave',LIGHT);
 put(s,0,'grave',WRONG_TWIN);put(s,0,'grave',WATER_SPELL);put(s,0,'grave',PLAIN);put(s,1,'grave',LIGHT);
 const eligible=[a,b,c];
 attack(s,attacker.uid);
 act(s,'noBlock');
 declare(s,bio,'g34_BioK951');
 pick(s,true);
 assert.ok(find(s,0,'grave',bio));
 assert.deepEqual(choices(s),[...eligible.map(x=>x.uid),null]);
 assert.equal(s.players[1].shields.length,5);
 if(amount)pick(s,a);
 s=restore(s);
 if(amount===2)pick(s,b);
 else pick(s,null);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,4);
 for(const [i,x] of eligible.entries())assert.ok(find(s,0,i<amount?'hand':'grave',x));
});

for(const mode of ['block','creature','wrongRace','decline'])test('Shaman checks the unblocked player attack condition '+mode,()=>{
 const s=field();
 const attacker=put(s,0,'battle',mode==='wrongRace'?PLAIN:'dm19-109'),bio=put(s,0,'hand',SHAMAN);
 const defender=put(s,1,'battle',BLOCKER,{tapped:mode==='creature'});
 const spell=put(s,0,'grave',LIGHT);
 attack(s,attacker.uid,mode==='creature'?defender.uid:'player');
 act(s,mode==='block'?'block':'noBlock');
 if(mode==='decline'){
  declare(s,bio,'g34_BioK951');
  pick(s,null);
 }
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'hand',bio));
 assert.ok(find(s,0,'grave',spell));
});
