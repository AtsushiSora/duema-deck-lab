import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const XENARCH="dm22rp2-004",CHEST="dm22rp2-026",WINTER="dm22rp2-059";
const PLAIN='dm01-108',DARK='dm01-090',FIRE='dm01-097',DUAL='dm22rp2-050';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1284.json',import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(PLAIN));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;
}
const pick=(s,wanted)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
});
const options=s=>s.decision.choices.map(({value})=>value?.uid??value);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function nextTurn(s){s.phase='attack';act(s,'endTurn');drain(s);}
function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}

const WATER='dm01-083',LIGHT='dm01-075',ZARD='dmrp17-s07',MARDAN='dm22rp2-S5';
const TYPHOON='dmex17-111',DIGGLE='dm22rp2-032';
const locks=(s,y)=>s.extLimits.filter(l=>l.g190Freeze&&l.ref?.uid===y.uid);

test('seven official prints resolve to three original IDs with matching limits and definitions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[XENARCH,CHEST,WINTER]);
 assert.equal(manifest.printAliases.length,4);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),face=x.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [face.cost,Number(face.powerText),1,face.civilizations,face.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1284}),x.spec);
  assert.equal(registry.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Xenarch can decline or try destruction; the opponent chooses even if the ally stays',()=>{
 for(const accept of [false,true]){
  const s=field(),ally=add(s,0,'battle',PLAIN),foe=add(s,1,'battle',DIGGLE,{justDiverActive:true});
  add(s,1,'battle',WATER);
  play(s,XENARCH);assert.ok(options(s).includes(ally.uid));
  pick(s,accept?ally.uid:null);
  if(accept){assert.equal(s.decision.player,1);pick(s,foe.uid);}
  drain(s);
  assert.deepEqual([has(s,0,'grave',ally),has(s,1,'grave',foe)],[accept,accept]);
 }
 const s=field(),protectedAlly=play(s,ZARD),foe=add(s,1,'battle',FIRE);
 drain(s);play(s,XENARCH);pick(s,protectedAlly.uid);drain(s);
 assert.ok(has(s,0,'battle',protectedAlly)&&has(s,1,'grave',foe));
});

test('Xenarch gives G-Strike from a shield and locks the chosen opposing attacker',()=>{
 const s=field(1),a=add(s,1,'battle',PLAIN),b=add(s,1,'battle',PLAIN);
 give(s,0,'shields',[XENARCH]);const x=s.players[0].shields[0];
 attack(s,a.uid);passBlock(s);
 if(s.decision?.type==='breakShields')act(s,'breakShields');
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);pick(s,b.uid);drain(s);
 assert.ok(has(s,0,'hand',x)&&e.attackLocked(s,1,b));
 assert.equal(e.card(XENARCH).breaker,2);
});

test('discarding Xenarch leaves it in the graveyard until a later actual discard (QA 42505)',()=>{
 const s=field(),x=add(s,0,'hand',XENARCH);
 const castTyphoon=()=>{
  const spell=add(s,0,'hand',TYPHOON);
  act(s,'play',a=>a.uid===spell.uid&&a.face===1);
  if(s.decision?.choices?.some(o=>typeof o.value==='number'))pick(s,1);
 };
 castTyphoon();pick(s,x.uid);
 assert.equal(s.decision,null);assert.ok(has(s,0,'grave',x));
 castTyphoon();pick(s,s.players[0].hand[0].uid);
 assert.equal(s.decision.source,XENARCH);
 pick(s,true);drain(s);assert.ok(has(s,0,'hand',x));
});

test('Xenarch only observes actual discards and excludes all newly discarded copies in the same group',()=>{
 const s=field(),old=add(s,1,'grave',XENARCH),fresh=add(s,1,'hand',XENARCH),other=add(s,1,'hand',DARK);
 const rich=add(s,0,'battle','dm22rp2-003');
 give(s,0,'battle',[rich.cardId,...Array(4).fill(DARK)]);attack(s,s.players[0].battle[0].uid);
 assert.equal(s.decision.type,'effectOrder');
 assert.ok(s.pendingEffects.every(row=>row.uid===old.uid));
 act(s,'orderEffect',a=>a.uid===old.uid);pick(s,true);drain(s);
 assert.ok(has(s,1,'hand',old)&&has(s,1,'grave',fresh)&&has(s,1,'grave',other));
 const replaced=field(),grave=add(replaced,0,'grave',XENARCH),payment=add(replaced,0,'hand',DARK);
 add(replaced,0,'battle','dmrp19-s10');
 play(replaced,'dm22rp2-064');pick(replaced,payment.uid);pick(replaced,v=>v?.g1090Mana);drain(replaced);
 assert.ok(has(replaced,0,'grave',grave)&&has(replaced,0,'mana',payment));
});

test('Chest counts itself and each civilization independently, granting kin no duplicate unit count',()=>{
 const s=field(),chest=play(s,CHEST),ally=add(s,0,'battle',PLAIN);
 add(s,0,'battle',LIGHT);add(s,0,'battle',DARK);
 assert.ok(!e.effectiveCard(ally,s).blocker&&!e.effectiveCard(ally,s).slayer);
 add(s,0,'battle',LIGHT);
 assert.ok(e.effectiveCard(ally,s).blocker&&!e.effectiveCard(ally,s).slayer);
 add(s,0,'battle',DUAL);
 assert.ok(e.effectiveCard(ally,s).slayer);chest.sealed=true;
 assert.ok(!e.effectiveCard(ally,s).blocker&&!e.effectiveCard(ally,s).slayer);
});

test('Chest gives Mardan-Low a second Slayer and both destroy attempts resolve (QA 42494)',()=>{
 const s=field(),m=add(s,0,'battle',MARDAN),z=add(s,1,'battle',ZARD,{tapped:true});
 add(s,0,'battle',CHEST);add(s,0,'battle',DARK);
 const shield=add(s,1,'shields',PLAIN);z.exLifeShieldUid=shield.uid;
 assert.equal(e.effectiveCard(m,s).g208SlayerCount,2);
 attack(s,m.uid,z.uid);passBlock(s);drain(s);
 assert.ok(has(s,1,'grave',z)&&has(s,1,'grave',shield));
});

test('Chest revives the same physical creature at turn end after battle loss, even if Chest leaves',()=>{
 const s=field(),chest=add(s,0,'battle',CHEST),victim=add(s,0,'battle',PLAIN);
 const foe=add(s,1,'battle','dm01-s08',{tapped:true});
 attack(s,victim.uid,foe.uid);passBlock(s);drain(s);
 assert.ok(has(s,0,'grave',victim));
 s.players[0].battle.splice(s.players[0].battle.indexOf(chest),1);
 s.players[0].grave.push(chest);
 const restored=JSON.parse(JSON.stringify(s));
 nextTurn(restored);assert.ok(has(restored,0,'battle',victim));
});

test('Chest excludes Slayer destruction after the battle (QA 42496)',()=>{
 const s=field(),winner=add(s,0,'battle','dm01-s08'),enemy=add(s,1,'battle',MARDAN,{tapped:true});
 add(s,0,'battle',CHEST);
 attack(s,winner.uid,enemy.uid);passBlock(s);drain(s);
 assert.ok(has(s,0,'grave',winner));
 nextTurn(s);assert.ok(has(s,0,'grave',winner));
});

test('Chest excludes creatures destroyed by Schoolman following ACE-Yamata’s battle win (QA 42495)',()=>{
 const s=field(),winner=add(s,0,'battle','dmbd18-003'),first=add(s,0,'battle',PLAIN),second=add(s,0,'battle',FIRE);
 const enemy=add(s,1,'battle',WATER,{tapped:true}),school=add(s,0,'mana','dmr07-013');
 add(s,0,'battle',CHEST);
 attack(s,winner.uid,enemy.uid);passBlock(s);
 pick(s,school.uid);pick(s,first.uid);pick(s,second.uid);
 act(s,'allowLeave');act(s,'allowLeave');drain(s);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
 nextTurn(s);assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
});

test('Winter casts once from hand at one water permanent, twice for one payment at two',()=>{
 for(const civil of [false,true]){
  const s=field(),a=add(s,1,'battle',FIRE),b=add(s,1,'battle',FIRE);
  add(s,0,'battle',WATER);if(civil)add(s,0,'battle','dmrp22-013');
  const spell=play(s,WINTER);pick(s,a.uid);
  if(civil){assert.equal(s.decision.source,WINTER);pick(s,b.uid);}
  drain(s);
  assert.deepEqual([locks(s,a).length,locks(s,b).length],[2,civil?2:0]);
  assert.equal(s.metrics[0].played[WINTER],civil?2:1);
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,2);
  assert.ok(has(s,0,'grave',spell));
  nextTurn(s);assert.ok(e.attackLocked(s,1,a));
  nextTurn(s);assert.equal(locks(s,a).length,0);
 }
});

test('Winter’s S-Trigger qualifies as a hand cast and the second cast is mandatory (QA 39858)',()=>{
 const s=field(1),attacker=add(s,1,'battle',PLAIN),other=add(s,1,'battle',FIRE);
 give(s,0,'battle',[WATER,'dmrp22-013']);give(s,0,'shields',[WINTER]);
 attack(s,attacker.uid);passBlock(s);
 if(s.decision?.type==='breakShields')act(s,'breakShields');
 act(s,'useTrigger');pick(s,attacker.uid);pick(s,other.uid);drain(s);
 assert.equal(s.metrics[0].played[WINTER],2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 assert.ok(e.attackLocked(s,1,other));
});

test('Winter holds a blocker through evolution until the caster’s next turn',()=>{
 const s=field(),blocker=add(s,1,'battle','dm01-084'),ally=add(s,0,'battle',PLAIN);
 const other=add(s,1,'battle',blocker.cardId);
 play(s,WINTER);pick(s,blocker.uid);drain(s);
 attack(s,ally.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),[other.uid]);
 passBlock(s);drain(s);
 nextTurn(s);act(s,'skipCharge');
 const evolution=add(s,1,'hand','dm02-024');
 act(s,'play',a=>a.uid===evolution.uid);act(s,'evolve',a=>a.baseUid===blocker.uid);drain(s);
 assert.ok(e.attackLocked(s,1,evolution));
 nextTurn(s);assert.ok(!e.attackLocked(s,1,evolution));
});

test('Winter cast from the graveyard does not qualify for another cast',()=>{
 const s=field(),a=add(s,1,'battle',FIRE),b=add(s,1,'battle',FIRE);
 const spell=add(s,0,'grave',WINTER);
 add(s,0,'battle',WATER);play(s,'dm22ex1-018');
 pick(s,spell.uid);pick(s,a.uid);drain(s);
 assert.equal(s.metrics[0].played[WINTER],1);
 assert.deepEqual([locks(s,a).length,locks(s,b).length],[2,0]);
 assert.equal(s.players[0].deck.at(-1).uid,spell.uid);
});
