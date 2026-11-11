import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MEGA='dmr21-005',DESTINY='dmr22-s06',REPRINT='dmrp08-g02',GHOST='dmr22-026';
const NATURE='dm01-108',WEAK='dm01-083',LARGE='dm05-s04',MULTI='dm24ex2-019';
const TWIN='dmrp06-006',SPELL='dm01-027',BLOCKER='dm01-001',QX='dmrp07-m01',INFINITY='dm26rp2-S011';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
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
function armor(s,n){
 for(let i=0;i<4;i++)put(s,0,'mana',MULTI,{tapped:true,faceDown:i>=n});
}

test('Phase 1010 pins three definitions and one official alternate print without an extra battle identity',()=>{
 const m=read('tools/support-phase-1010.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MEGA,DESTINY,GHOST]);
 assert.equal(m.printAliases.length,1);
 const [alternate]=m.printAliases;
 assert.deepEqual([alternate.id,alternate.canonicalId,snapshot.aliases[REPRINT]],[REPRINT,DESTINY,DESTINY]);
 assert.ok(!data.cards.some(c=>c.id===REPRINT));
 assert.deepEqual(standardCardSpec({id:REPRINT,status:'complete',faces:alternate.faces},{phase:1010}),m.cards[1].spec);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1010}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1010}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText)||0,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1010');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const {id,canonicalId,image} of [...m.cards,alternate]){
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonicalId??id,image]]);
 }
 assert.equal(registry.get(REPRINT).id,DESTINY);
 assert.match(registry.get(GHOST).faces[0].abilityText,/−8000/);
});

test('Mega reveals and adds a Twinpact, then destroys only an enemy of strictly lower current power',()=>{
 const s=field();
 give(s,0,'deck',[TWIN,...Array(16).fill(NATURE)]);
 const top=s.players[0].deck[0],limit=e.card(TWIN).power;
 const victim=put(s,1,'battle',WEAK,{powerModifiers:[{amount:limit-1000-e.card(WEAK).power}]}),
  equal=put(s,1,'battle',WEAK,{powerModifiers:[{amount:limit-e.card(WEAK).power}]});
 const ally=put(s,0,'battle',WEAK);
 play(s,MEGA);
 const before=physical(s);
 assert.ok(has(s,0,'hand',top)&&s.log.some(x=>x.type==='reveal'&&x.text.includes(e.card(TWIN).name)));
 assert.deepEqual(choices(s),[victim.uid]);
 pick(s,victim.uid);
 assert.ok(has(s,1,'grave',victim)&&has(s,1,'battle',equal)&&has(s,0,'battle',ally));
 assert.deepEqual(physical(s),before);
});

test('Mega adds a spell without drawing and repeats the reveal on attack before W Breaker',()=>{
 const s=field(),victim=put(s,1,'battle',WEAK);
 give(s,0,'deck',[SPELL,LARGE,...Array(16).fill(NATURE)]);
 const [spell,creature]=s.players[0].deck;
 const mega=play(s,MEGA);
 assert.ok(!s.decision&&has(s,0,'hand',spell)&&has(s,1,'battle',victim));
 assert.equal(s.players[0].drawsThisTurn||0,0);
 s.turn++;
 attack(s,mega.uid);
 assert.ok(has(s,0,'hand',creature));
 assert.deepEqual(choices(s),[victim.uid]);
 pick(s,victim.uid);
 drain(s);
 assert.ok(has(s,1,'grave',victim));
 assert.equal(s.players[1].shields.length,3);
});

test('Mega compares infinite revealed power, and an equal infinite enemy is ineligible',()=>{
 const s=field(),large=put(s,1,'battle',LARGE),infinite=put(s,1,'battle',WEAK,{powerModifiers:[{amount:'∞'}]});
 give(s,0,'deck',[INFINITY,...Array(16).fill(NATURE)]);
 const top=s.players[0].deck[0];
 play(s,MEGA);
 assert.deepEqual(choices(s),[large.uid]);
 pick(s,large.uid);
 assert.ok(has(s,0,'hand',top)&&has(s,1,'grave',large)&&has(s,1,'battle',infinite));
});

test('Mega takes the fixed top card without revealing or destroying under Q.Q.QX.',()=>{
 const s=field(),top=s.players[0].deck[0],victim=put(s,1,'battle',WEAK);
 put(s,1,'battle',QX);
 play(s,MEGA);
 assert.ok(!s.decision&&has(s,0,'hand',top)&&has(s,1,'battle',victim));
 assert.ok(!s.log.some(x=>x.type==='reveal'));
});

for(const id of [DESTINY,GHOST])test(id+' is placed in mana tapped',()=>{
 const s=field(),x=put(s,0,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

test('Destiny with only three visible multicolor mana skips the hand change and cannot be blocked',()=>{
 const s=field(),old=put(s,0,'hand',SPELL),blocker=put(s,1,'battle',BLOCKER);
 armor(s,3);
 const destiny=play(s,DESTINY);
 assert.ok(!s.decision&&has(s,0,'hand',old));
 s.turn++;
 attack(s,destiny.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 drain(s);
 assert.ok(has(s,1,'battle',blocker));
 assert.equal(s.players[1].shields.length,3);
});

for(const [id,accept] of [[TWIN,true],[TWIN,false],[SPELL,false]])test('Destiny shuffles then allows a blind opponent choice '+id+' '+accept,()=>{
 let s=field();
 armor(s,4);
 give(s,0,'deck',Array(18).fill(id));
 put(s,0,'hand',id);
 put(s,0,'hand',id);
 play(s,DESTINY);
 const before=physical(s);
 assert.equal(s.players[0].deck.length,16);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[0,1,2,3]);
 assert.ok(s.decision.choices.every(c=>!c.cardId&&!c.label.includes(e.card(id).name)));
 assert.ok(e.getLegalActions(s).every(a=>!a.cardId));
 const selected=s.players[0].hand[2];
 s=JSON.parse(JSON.stringify(s));
 pick(s,2);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===id));
 if(id===TWIN){
  assert.equal(s.decision.player,0);
  assert.deepEqual(choices(s),[true,null]);
  pick(s,accept?true:null);
 }
 drain(s);
 assert.ok(has(s,0,accept?'battle':'hand',selected));
 assert.equal(s.players[0].mana.filter(y=>!y.tapped).length,43);
 assert.deepEqual(physical(s),before);
});

test('Destiny draws with an empty hand and reveals an evolution even when it cannot be put into battle',()=>{
 const s=field(),evolution='dmr05-017';
 armor(s,4);
 give(s,0,'deck',Array(20).fill(evolution));
 play(s,DESTINY);
 assert.equal(s.players[0].hand.length,4);
 const chosen=s.players[0].hand[0];
 pick(s,0);
 assert.ok(!s.decision&&has(s,0,'hand',chosen)&&s.log.some(x=>x.type==='reveal'&&x.cardId===evolution));
});

test('Ghost can return the same creature after its power falls below the bounce cap',()=>{
 const s=field(),borrowed=put(s,1,'battle',LARGE,{cardOwner:0}),tooLarge=put(s,1,'battle',LARGE);
 play(s,GHOST);
 pick(s,borrowed.uid);
 assert.equal(e.power(borrowed,false,s),7000);
 assert.deepEqual(choices(s),[borrowed.uid]);
 pick(s,borrowed.uid);
 assert.ok(has(s,0,'hand',borrowed)&&!has(s,1,'hand',borrowed)&&has(s,1,'battle',tooLarge));
});

test('Ghost resolves zero-power destruction before a second choice and can return a power 8000 creature',()=>{
 const s=field(),zero=put(s,1,'battle',WEAK),equal=put(s,1,'battle',MEGA),large=put(s,1,'battle',LARGE);
 play(s,GHOST);
 pick(s,zero.uid);
 assert.ok(has(s,1,'grave',zero));
 assert.deepEqual(choices(s),[equal.uid]);
 pick(s,equal.uid);
 assert.ok(has(s,1,'hand',equal)&&has(s,1,'battle',large));
});

test('Ghost works as a shield trigger and its surviving power reduction ends that turn',()=>{
 const s=field(),attacker=put(s,1,'battle',LARGE),other=put(s,1,'battle',WEAK);
 give(s,0,'shields',[GHOST]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===GHOST);
 pick(s,attacker.uid);
 pick(s,other.uid);
 drain(s);
 assert.equal(e.power(attacker,false,s),7000);
 assert.ok(has(s,1,'hand',other));
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(attacker,false,s),15000);
});
