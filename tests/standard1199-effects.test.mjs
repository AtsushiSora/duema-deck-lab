import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MEI='dm24ex1-014',OIL='dm22rp1-1A',NIA='dmrp21-036';
const SMALL='dm01-108',BIG='dm01-s01',SPELL='dm24ex1-034',MORNING='dmex12-015';
const LARGE_DREAM='dmex12-s16',TSU='dmrp22-030',HAND='dm01-027',BOUNCE='dm01-086';
const SEED='dm25ex1-054',FIELD='dmrp08-005',APOCALYPSE='dm14-015';
const put=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const roundtrip=s=>JSON.parse(JSON.stringify(s));
const options=s=>s.decision?.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function classicTarget(s,x){
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}
function topShields(s,p,n=1){
 s.phase='main';
 s.extTasks=[{op:'g34_ShieldTop',source:OIL,p,n,g779Simultaneous:true}];
 act(s,'toAttack');
}
function next(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
}
const orderSource=(s,x)=>act(s,'orderEffect',a=>s.pendingEffects.some(y=>y.effectId===a.effectId&&y.uid===x.uid));
test('each official print maps to one supported card with its full spec and image',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1199.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[MEI,OIL,NIA]);
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['dm24ex1-Sec04','dm22rp1-S1','dm22rp1-3B','promoy21-008']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const canonical=row.canonicalId??row.id,live=e.card(canonical),[face]=row.faces;
  const parsed={...row,status:'complete'};
  if(!row.canonicalId)assert.deepEqual(details.cards.find(c=>c.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec(parsed,{phase:1199}),row.spec);
  const bad=structuredClone(parsed);
  bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1199}));
  assert.equal(catalogue.get(canonical).supported,true);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:canonical,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[canonical]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===canonical)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[row.id],row.image);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

test('Mei can attack a player or an untapped creature the turn it enters and breaks two shields',()=>{
 const s=setup(),target=put(s,1,'battle',SMALL);
 const x=play(s,MEI);
 give(s,0,'deck',[SMALL,SMALL,SMALL,SMALL]);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target.uid));
 attack(s,x.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Mei on a creature attack can summon a Dreammate from the top three and order the remainder after restoring',()=>{
 let s=setup();
 const target=put(s,1,'battle',SMALL),mei=play(s,MEI);
 const [one,chosen,two]=[SMALL,MEI,LARGE_DREAM].map(id=>inst(id));
 s.players[0].deck.unshift(one,chosen,two);
 const paid=s.players[0].mana.filter(x=>x.tapped).length;
 attack(s,mei.uid,target.uid);
 assert.equal(s.decision?.task?.op,'g34_RaidPick');
 assert.deepEqual(options(s),[chosen.uid,null]);
 assert.ok(!s.log.some(x=>x.text.includes(e.card(LARGE_DREAM).name)));
 s=roundtrip(s);
 pick(s,chosen.uid);
 assert.ok(has(s,0,'battle',chosen));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,paid);
 assert.equal(s.decision?.task?.op,'g34_Order');
 pick(s,two.uid);
 drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[two.uid,one.uid]);
 assert.ok(has(s,1,'grave',target));
});

test('Mei can cast a Dreammate spell under Mekraid, even with the library limited to one looked card',()=>{
 const s=setup(),mei=play(s,MEI);
 put(s,1,'battle',TSU);
 const [spell,excluded,third]=[SPELL,MORNING,SMALL].map(id=>inst(id));
 s.players[0].deck.unshift(spell,excluded,third);
 attack(s,mei.uid);
 assert.deepEqual(options(s),[spell.uid,null]);
 pick(s,spell.uid);
 assert.equal(s.decision?.task?.op,'g34_Choose');
 drain(s);
 assert.ok(has(s,0,'grave',spell));
 assert.ok(!has(s,0,'battle',excluded));
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Mei’s Escape moves its shield to hand without S Trigger when it loses a battle',()=>{
 const s=setup(),enemy=put(s,0,'battle',BIG),mei=put(s,1,'battle',MEI,{tapped:true});
 give(s,1,'shields',[MORNING]);
 const shield=s.players[1].shields[0];
 attack(s,enemy.uid,mei.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.type,'leaveReplace');
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',mei)&&has(s,1,'hand',shield));
});

test('Mei can still use a printed Guard Strike on the shield taken with Escape',()=>{
 const s=setup(),enemy=put(s,0,'battle',BIG),later=put(s,0,'battle',SMALL);
 const mei=put(s,1,'battle',MEI,{tapped:true}),shield=put(s,1,'shields','dm26ex3-026');
 attack(s,enemy.uid,mei.uid);act(s,'noBlock');
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 assert.equal(s.decision?.task?.op,'gsTarget');
 pick(s,later.uid);
 assert.ok(has(s,1,'battle',mei)&&has(s,1,'hand',shield));
 assert.equal(e.attackLocked(s,0,later),true);
});

test('Oil has mandatory shield placement followed by the optional first-placement shield',()=>{
 const s=setup(),own=s.players[0],before=own.shields.length,[first,second]=own.deck;
 const oil=play(s,OIL);
 assert.equal(own.shields.at(-1).uid,first.uid);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,true);
 assert.equal(s.decision,null);
 assert.deepEqual(own.shields.slice(before).map(x=>x.uid),[first.uid,second.uid]);
 assert.ok(own.shields.slice(before).every(x=>!x.faceUp));
 assert.equal(e.effectiveCard(oil,s).breaker,2);
});

test('Oil can decline the first placement, never reacts to a later placement that turn, and sees the opponent’s turn',()=>{
 let s=setup();
 const own=s.players[0];
 play(s,OIL);
 pick(s,null);
 topShields(s,0);
 assert.equal(s.decision,null);
 s=roundtrip(s);next(s);
 assert.equal(s.active,1);
 const n=s.players[0].shields.length;
 topShields(s,1);
 assert.equal(s.decision,null);
 topShields(s,0,2);
 pick(s,true);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,n+3);
 assert.equal(own.shields.length,n);
});

test('Oil does not trigger when the first shield was placed before it entered',()=>{
 const s=setup();
 topShields(s,0);
 const initial=s.players[0].shields.length;
 play(s,OIL);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,initial+1);
});

test('each Oil triggers once when a simultaneous placement creates two shields',()=>{
 const s=setup();
 const a=put(s,0,'battle',OIL),b=put(s,0,'battle',OIL);
 topShields(s,0,2);
 for(const oil of [a,b]){
  if(s.decision?.type==='effectOrder')orderSource(s,oil);
  assert.equal(s.decision?.task?.op,'g34_Offer');
  pick(s,true);
 }
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,9);
});

test('Oil’s Escape applies to all own creatures and is usable during simultaneous destruction',()=>{
 const s=setup(),oil=put(s,1,'battle',OIL),ally=put(s,1,'battle',SMALL);
 const a=put(s,0,'battle',SMALL),seed=put(s,1,'battle',SEED);
 for(let i=0;i<3;i++)put(s,0,'battle',SMALL);
 give(s,1,'shields',[BOUNCE]);
 for(const x of [oil,ally])assert.equal(e.effectiveCard(x,s).escape,true);
 assert.equal(e.effectiveCard(a,s).escape,undefined);
 assert.equal(e.effectiveCard(seed,s).escape,undefined);
 const shield=s.players[1].shields[0];
 play(s,APOCALYPSE);
 assert.equal(s.decision.uid,oil.uid);
 act(s,'allowLeave');
 assert.equal(s.decision.uid,ally.uid);
 act(s,'replaceEscape');
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'grave',oil)&&has(s,1,'battle',ally)&&has(s,1,'hand',shield));
 assert.equal(e.effectiveCard(ally,s).escape,undefined);
});

for(const destination of [SMALL,SEED,null])test('Nia may destroy an ally creature or Tamaseed instead, or decline '+destination,()=>{
 let s=setup();
 const nia=put(s,1,'battle',NIA),creature=put(s,1,'battle',SMALL),seed=put(s,1,'battle',SEED);
 const field=put(s,1,'battle',FIELD),enemy=put(s,0,'battle',SMALL);
 play(s,HAND);
 classicTarget(s,nia);
 assert.equal(s.decision.uid,nia.uid);
 s=roundtrip(s);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='replaceAter').map(a=>a.uid),[creature.uid,seed.uid]);
 const target=destination===SMALL?creature:destination===SEED?seed:null;
 if(target)act(s,'replaceAter',a=>a.uid===target.uid);
 else act(s,'allowLeave');
 drain(s);
 assert.ok(has(s,1,target?'battle':'grave',nia));
 if(target)assert.ok(has(s,1,'grave',target));
 assert.ok(has(s,1,'battle',field)&&has(s,0,'battle',enemy));
});

test('Nia does not replace moving to hand',()=>{
 const s=setup(),nia=put(s,1,'battle',NIA),seed=put(s,1,'battle',SEED);
 play(s,BOUNCE);
 classicTarget(s,nia);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'hand',nia)&&has(s,1,'battle',seed));
});

test('the card destroyed in place of Nia still triggers its own destruction ability',()=>{
 const s=setup(),nia=put(s,1,'battle',NIA),warrior=put(s,1,'battle','dm21-040');
 const hand=s.players[1].hand.length;
 play(s,HAND);classicTarget(s,nia);
 act(s,'replaceAter',a=>a.uid===warrior.uid);
 drain(s);
 assert.ok(has(s,1,'battle',nia)&&has(s,1,'grave',warrior));
 assert.equal(s.players[1].hand.length,hand+2);
});

test('Nia can save itself in battle and still destroy the larger creature with Slayer',()=>{
 const s=setup(),nia=put(s,1,'battle',NIA,{tapped:true}),seed=put(s,1,'battle',SEED);
 const attacker=put(s,0,'battle',BIG);
 attack(s,attacker.uid,nia.uid);
 act(s,'noBlock');
 act(s,'replaceAter',a=>a.uid===seed.uid);
 drain(s);
 assert.ok(has(s,1,'battle',nia)&&has(s,1,'grave',seed)&&has(s,0,'grave',attacker));
});

test('two Nias cannot use the same Tamaseed as payment in one simultaneous destruction',()=>{
 const s=setup();
 const a=put(s,1,'battle',NIA),b=put(s,1,'battle',NIA),seed=put(s,1,'battle',SEED);
 put(s,1,'battle',NIA);
 for(let i=0;i<3;i++)put(s,0,'battle',SMALL);
 play(s,APOCALYPSE);
 assert.equal(s.decision.uid,a.uid);
 act(s,'replaceAter',x=>x.uid===seed.uid);
 assert.equal(s.decision.uid,b.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='replaceAter'&&a.uid===seed.uid));
 while(s.decision?.type==='leaveReplace')act(s,'allowLeave');
 drain(s);
 assert.ok(has(s,1,'battle',a)&&has(s,1,'grave',seed));
});
