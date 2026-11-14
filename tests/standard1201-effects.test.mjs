import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MAX='dmrp22-1A',BUG='dmrp04s-s06',DRAGON='dmex18-s07';
const NIA='dmrp21-036',SMALL='dm01-108',BIG='dm01-s01',HAND='dm01-027',BOUNCE='dm01-086';
const LIGHT='dm25ex1-054',NATURE='dmrp22-044',DARK='dm22ex1-086',DRAGON_SEED='dmrp22-025';
const put=(s,p,z,id,attributes={})=>{const x=Object.assign(inst(id),attributes);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(({value})=>value?.uid??value);
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const stepTask=(s,op,source,p,fields={})=>{s.extTasks=[{op,source,p,...fields}];act(s,'toAttack');};
const restore=s=>JSON.parse(JSON.stringify(s));
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('the five official prints resolve to three supported cards with their verified specs and art',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1201.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[MAX,BUG,DRAGON]);
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['dmrp22-S1','dmrp22-3B']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1201}),row.spec);
  const bad=structuredClone(parsed);
  bad.faces.at(-1).abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1201}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

test('Savvak can enter during an attack after tapping three seeds, including a light seed',()=>{
 let s=setup();
 const attacker=put(s,0,'battle',NIA),light=put(s,1,'battle',LIGHT),nat=put(s,1,'battle',NATURE);
 const dark=put(s,1,'battle',DARK),another=put(s,1,'battle',NATURE);
 const tapped=put(s,1,'battle',LIGHT,{tapped:true}),creature=put(s,1,'battle',SMALL);
 const max=put(s,1,'hand',MAX);
 attack(s,attacker.uid);
 assert.equal(s.decision?.task?.op,'g34_SeedDefense1201');
 assert.ok(!options(s).includes(creature.uid)&&!options(s).includes(tapped.uid));
 pick(s,nat.uid);
 pick(s,dark.uid);
 assert.deepEqual(options(s),[light.uid,null]);
 assert.ok(!nat.tapped&&!dark.tapped);
 s=restore(s);
 pick(s,light.uid);
 assert.ok(has(s,1,'battle',max)&&!has(s,1,'hand',max));
 assert.ok([light,nat,dark].every(x=>s.players[1].battle.find(y=>y.uid===x.uid).tapped));
 assert.ok(!s.players[1].battle.find(y=>y.uid===another.uid).tapped);
 assert.equal(s.players[1].mana.filter(y=>y.tapped).length,0);
 act(s,'block',a=>a.uid===max.uid);
 drain(s);
 assert.ok(has(s,1,'battle',max)&&has(s,0,'grave',attacker));
});

test('the attack trigger remains if the attacking creature destroys itself before Savvak resolves',()=>{
 const s=setup(),attacker=put(s,0,'battle','dmrp01-043'),max=put(s,1,'hand',MAX);
 const seeds=[LIGHT,NATURE,NATURE].map(id=>put(s,1,'battle',id));
 attack(s,attacker.uid);
 assert.equal(s.decision?.player,0);
 pick(s,attacker.uid);
 assert.ok(has(s,0,'grave',attacker));
 assert.equal(s.decision?.task?.op,'g34_SeedDefense1201');
 for(const seed of seeds)pick(s,seed.uid);
 assert.ok(has(s,1,'battle',max));
 assert.equal(s.decision,null);
});

test('Savvak’s seed payment can be declined or unavailable and never taps a partial selection',()=>{
 for(const [ids,cancel] of [[[LIGHT,NATURE,NATURE],true],[[NATURE,NATURE,DARK],false],[[LIGHT,NATURE],false]]){
  const s=setup(),foe=put(s,0,'battle',SMALL),max=put(s,1,'hand',MAX);
  const seeds=ids.map(id=>put(s,1,'battle',id));
  attack(s,foe.uid);
  if(cancel){pick(s,seeds[0].uid);pick(s,null);}
  assert.equal(s.decision?.type,'block');
  assert.ok(seeds.every(x=>!x.tapped)&&has(s,1,'hand',max));
  act(s,'noBlock');drain(s);
 }
});

test('QA 42392: an allied blocker survives battle loss and Slayer, but can be destroyed after the attack',()=>{
 const s=setup(),attacker=put(s,0,'battle',NIA);
 // Buff makes the ally lose the battle. Neither it nor Savvak controls the attack.
 put(s,1,'battle',MAX);
 const blocker=put(s,1,'battle','dm01-084');
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.ok(has(s,1,'battle',blocker));
 assert.ok(s.log.some(x=>x.type==='afterBattle'&&x.cardId===NIA));
 assert.equal(s.attackLifecycle,undefined);
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===blocker.uid));
 assert.ok(has(s,1,'grave',blocker));
});

for(const mode of ['johnny','johnnyHand'])test('Savvak replaces a direct-attack loss with '+mode,()=>{
 const s=setup(),attacker=put(s,0,'battle',SMALL),max=put(s,1,'battle',MAX),copy=put(s,1,'hand',MAX);
 give(s,1,'shields',[]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(s.lossEvent);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.kind===mode);
 assert.equal(s.winner,null);
 assert.ok(has(s,1,'grave',mode==='johnny'?max:copy));
 assert.ok(has(s,1,mode==='johnny'?'hand':'battle',mode==='johnny'?copy:max));
});

test('S-MAX enters without an evolution base and returns the unchosen S-MAX to hand',()=>{
 const s=setup(),one=play(s,MAX),two=play(s,MAX);
 assert.equal(s.decision?.task?.op,'g15_SmaxKeep');
 pick(s,two.uid);
 assert.ok(has(s,0,'battle',two)&&has(s,0,'hand',one));
 assert.equal(two.under?.length??0,0);
});

function bugScene(){
 const s=setup(),d=put(s,0,'grave','dmrp07-072'),wrong=put(s,0,'grave',SMALL),good=inst('dmrp07-076'),other=inst(SMALL);
 s.players[0].deck.unshift(good,other);
 const bug=play(s,BUG);
 return {s,bug,d,wrong,good,other};
}
test('Scorpion Centipede mills two together and can revive zero Mafy Gang, but end destruction still happens',()=>{
 const {s,bug,good,other}=bugScene();
 assert.ok(has(s,0,'grave',good)&&has(s,0,'grave',other));
 assert.equal(s.decision?.task?.op,'g34_Select');
 pick(s,null);
 end(s);
 assert.deepEqual(options(s),[bug.uid]);
 pick(s,bug.uid);
 assert.ok(has(s,0,'grave',bug));
 assert.equal(s.active,1);
});

test('Scorpion Centipede can choose two Mafy Gang and postpones simultaneous mandatory destruction until the turn ends',()=>{
 const {s,bug,d,good,wrong}=bugScene();
 assert.ok(!options(s).includes(wrong.uid));
 pick(s,d.uid);
 assert.ok(has(s,0,'grave',d)&&has(s,0,'grave',good));
 pick(s,good.uid);
 assert.ok(has(s,0,'battle',d)&&has(s,0,'battle',good));
 end(s);
 pick(s,d.uid);
 assert.ok(has(s,0,'battle',d));
 pick(s,good.uid);
 drain(s);
 assert.ok(has(s,0,'grave',d)&&has(s,0,'grave',good)&&has(s,0,'battle',bug));
});

test('Scorpion Centipede’s delayed destruction survives its source leaving and chooses both victims before either moves',()=>{
 let s=setup();
 const a=put(s,0,'battle',SMALL),b=put(s,0,'battle',SMALL),c=put(s,0,'battle',SMALL);
 const bug=play(s,BUG);
 if(s.decision?.task?.op==='g34_Select')pick(s,null);
 play(s,BOUNCE);act(s,'effect',x=>x.targets.some(t=>t.uid===bug.uid));
 assert.ok(has(s,0,'hand',bug));
 end(s);
 assert.ok(!options(s).includes(null));
 pick(s,a.uid);
 assert.ok(has(s,0,'battle',a)&&!options(s).includes(a.uid));
 s=restore(s);
 pick(s,b.uid);
 assert.ok(has(s,0,'grave',a)&&has(s,0,'grave',b)&&has(s,0,'battle',c));
});

test('Scorpion Centipede entering after end abilities were collected creates no late or next-turn payment',()=>{
 const s=setup(),bug=put(s,0,'grave',BUG);
 s.endStep={player:1,stage:'resolve',deferred:[],remaining:[],declared:[],untap:[]};
 stepTask(s,'g34_Put',BUG,0,{origin:'grave',target:bug.uid});
 if(s.decision?.task?.op==='g34_Select')pick(s,null);
 assert.ok(has(s,0,'battle',bug));
 assert.ok(!(s.g537Delays||[]).some(r=>r.source===BUG));
 drain(s);
 end(s);drain(s);
 assert.ok(has(s,0,'battle',bug));
});

test('Molnaruk sees itself and destroys one enemy per actual Dragon milled, including a Dragon seed',()=>{
 const s=setup(),a=put(s,1,'battle',SMALL),b=put(s,1,'battle',SMALL),c=put(s,1,'battle',BIG);
 const seed=put(s,1,'battle',LIGHT);
 const top=[DRAGON,DRAGON_SEED,SMALL].map(inst);
 s.players[0].deck.unshift(...top);
 play(s,DRAGON);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,true);
 assert.deepEqual(options(s),[a.uid,b.uid,c.uid]);
 assert.ok(top.every(x=>has(s,0,'grave',x))&&has(s,1,'battle',seed));
 pick(s,a.uid);
 assert.ok(has(s,1,'battle',a)&&!options(s).includes(a.uid));
 pick(s,b.uid);
 assert.ok(has(s,1,'grave',a)&&has(s,1,'grave',b)&&has(s,1,'battle',c));
});

test('Molnaruk ignores enemy Dragons and friendly non-Dragons, and can decline later Dragon entries',()=>{
 const s=setup();
 put(s,0,'battle',DRAGON);
 play(s,SMALL);assert.equal(s.decision,null);
 end(s);
 play(s,DRAGON_SEED);drain(s);assert.equal(s.decision,null);
 end(s);
 play(s,DRAGON);
 while(s.decision){if(s.decision.task?.op==='g34_Offer')pick(s,null);else act(s,'orderEffect');}
 assert.equal(s.players[0].grave.length,0);
});

test('Molnaruk reacts to a friendly Dragon seed and Calico’s Black Idol does not change cards actually milled',()=>{
 const s=setup(),foe=put(s,1,'battle',SMALL);
 put(s,0,'battle',DRAGON);
 put(s,1,'battle',DARK);
 const cards=[DRAGON_SEED,SMALL,SMALL].map(inst);
 s.players[0].deck.unshift(...cards);
 play(s,LIGHT);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,true);
 assert.deepEqual(options(s),[foe.uid]);
 pick(s,foe.uid);
 assert.ok(cards.every(x=>has(s,0,'grave',x))&&has(s,1,'grave',foe));
});

test('Molnaruk must revive a creature when attacking and keeps its triple breaker',()=>{
 const s=setup(),mol=put(s,0,'battle',DRAGON),revive=put(s,0,'grave',SMALL),spell=put(s,0,'grave',HAND);
 attack(s,mol.uid);
 assert.deepEqual(options(s),[revive.uid]);
 pick(s,revive.uid);
 assert.ok(has(s,0,'battle',revive)&&has(s,0,'grave',spell));
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

for(const id of [DRAGON,BUG])test('Slayer is present and resolves after an ordinary battle for '+id,()=>{
 const s=setup(),slayer=put(s,0,'battle',id),foe=put(s,1,'battle','dmx01-009',{tapped:true});
 if(id===DRAGON)put(s,0,'grave',SMALL);
 attack(s,slayer.uid,foe.uid);
 if(s.decision?.task?.op==='g34_Select')pick(s,options(s)[0]);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'grave',slayer)&&has(s,1,'grave',foe));
});
