import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-789.json',import.meta.url)));
const SAGE="dm24ex4-066",AQ="dm24ex4-086",BRAVE="dm24ex4-060";
const BODY="dm01-108",FIRE="dm01-097",WATER="dm01-083",DARK="dm01-090";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 789 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:789}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:789}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:789}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const ILLUSION='dm24ex4-050',DEMON='dm01-s06',DRAW='dm06-085',FORCE='dm24ex4-061';
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const canAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
const alt=(s,x)=>e.getLegalActions(s).find(a=>a.uid===x.uid&&a.role==='paidAlt568');
const end=s=>{s.phase='attack';act(s,'endTurn');};
function hit(s,x,shield){
 attack(s,x.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
}

for(const accept of [false,true])test('Sage may return an opponent’s nonsummoned creature: '+accept,()=>{
 let s=setup();
 put(s,0,'battle',SAGE);
 const summon=put(s,1,'hand',BODY),spell=put(s,1,'hand',ILLUSION),entrant=put(s,1,'grave',DEMON);
 s.active=1;
 play(s,summon);
 assert.equal(s.decision,null);
 play(s,spell);
 pick(s,entrant.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[true,null]);
 s=restore(s);
 pick(s,accept?true:null);
 assert.ok(has(s,1,'battle',summon));
 assert.equal(has(s,1,'hand',entrant),accept);
 assert.equal(has(s,1,'battle',entrant),!accept);
});

test('Sage also reacts on its own turn to an opposing shield spell, without treating a Trigger summon as a non-summon',()=>{
 const s=setup();
 put(s,0,'battle',SAGE);
 const attacker=put(s,0,'battle',FIRE),other=put(s,0,'battle',BODY),entrant=put(s,1,'grave',DEMON);
 give(s,1,'shields',[ILLUSION,'dm24rp2-015']);
 const [illusion,creature]=s.players[1].shields;
 hit(s,attacker,illusion);
 act(s,'useTrigger');
 pick(s,entrant.uid);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.ok(has(s,1,'hand',entrant));
 hit(s,other,creature);
 act(s,'useTrigger');
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',creature));
});

test('Contact counts attacks before its shield trigger and expires at its caster’s next start',()=>{
 let s=setup();
 const attackers=Array.from({length:4},()=>put(s,1,'battle',FIRE));
 give(s,0,'shields',[BODY,SAGE,BODY,BODY]);
 const [first,contact]=s.players[0].shields;
 s.active=1;
 hit(s,attackers[0],first);
 hit(s,attackers[1],contact);
 act(s,'useTrigger',a=>a.face===1);
 s=restore(s);
 assert.ok(!canAttack(s,attackers[2])&&!canAttack(s,attackers[3]));
 assert.ok(e.attackLocked(s,1,s.players[1].battle.find(x=>x.uid===attackers[2].uid)));
 end(s);
 assert.ok(!e.attackLocked(s,1,s.players[1].battle.find(x=>x.uid===attackers[2].uid)));
 end(s);
 s.phase='attack';
 assert.ok(canAttack(s,attackers[2]));
});

test('Contact cast from hand permits two attacks, and an attack-lock bypass lifts the cap',()=>{
 const s=setup(),spell=put(s,0,'hand',SAGE);
 const attackers=Array.from({length:3},()=>put(s,1,'battle',FIRE));
 play(s,spell,1);
 end(s);
 hit(s,attackers[0],s.players[0].shields[0]);
 assert.ok(canAttack(s,attackers[1]));
 hit(s,attackers[1],s.players[0].shields[0]);
 assert.ok(!canAttack(s,attackers[2]));
 put(s,1,'battle','dm25rp3-DM1');
 assert.ok(canAttack(s,attackers[2]));
});

test('AQreplay adds one draw per copy at exactly the second actual draw on either player’s turn',()=>{
 const s=setup();
 put(s,0,'battle',AQ);
 put(s,0,'battle',AQ);
 const draw=put(s,0,'hand',DRAW),again=put(s,0,'hand',DRAW),before=s.players[0].deck.length;
 play(s,draw);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 assert.equal(s.players[0].deck.length,before-4);
 play(s,again);
 assert.equal(s.players[0].deck.length,before-6);
 end(s);
 s.extTasks=[{op:'draw',p:0,source:AQ,n:2}];
 s.phase='main';
 act(s,'toAttack');
 act(s,'orderEffect');
 assert.equal(s.players[0].deck.length,before-10);
});

test('AQreplay ignores a card added to hand and its spell still draws with no valid creature',()=>{
 const s=setup();
 put(s,0,'battle',AQ);
 const force=put(s,0,'hand',FORCE),chance=put(s,0,'hand',AQ),before=s.players[0].deck.length;
 play(s,force);
 pick(s,s.players[0].deck[0].uid);
 pick(s,s.decision.choices[0].value);
 assert.equal(s.players[0].drawsThisTurn||0,0);
 play(s,chance,1);
 assert.equal(s.players[0].deck.length,before-3);
 assert.equal(s.players[0].drawsThisTurn,1);
});

test('Legend Chance chooses an opposing creature, stops attacks and blocks until its caster’s next start, and draws one',()=>{
 const s=setup(),spell=put(s,0,'hand',AQ),target=put(s,1,'battle','dm01-076'),top=s.players[0].deck[0];
 play(s,spell,1);
 pick(s,target.uid);
 assert.ok(e.attackLocked(s,1,target)&&has(s,0,'hand',top));
 assert.equal(s.extLimits.filter(l=>l.kind==='block'&&l.uid===target.uid).length,1);
 end(s);
 assert.ok(e.attackLocked(s,1,target));
 end(s);
 assert.ok(!e.attackLocked(s,1,target));
});

test('Brave Link’s hand-only alternate payment requires both civilizations and pays exactly two after reload',()=>{
 let s=setup();
 give(s,0,'mana',[FIRE,BODY]);
 const spell=put(s,0,'hand',BRAVE),victim=put(s,1,'battle',DEMON),large=put(s,1,'battle','dm03-s03');
 give(s,0,'deck',[DARK,BODY,FIRE]);
 const [top]=s.players[0].deck;
 const a=alt(s,spell);
 assert.equal(a.cost,2);
 e.step(s,a,{manualMana:true});
 assert.deepEqual(s.decision.colors,['火','自然']);
 s=restore(s);
 for(const mana of s.players[0].mana)act(s,'selectMana',a=>a.uid===mana.uid);
 act(s,'confirmMana');
 assert.deepEqual(choices(s),[victim.uid]);
 pick(s,victim.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.ok(choices(s).includes(top.uid));
 pick(s,top.uid);
 assert.ok(has(s,1,'grave',victim)&&has(s,1,'battle',large)&&has(s,0,'hand',top)&&has(s,0,'grave',spell));
});

test('Brave Link has its printed cost with another card in hand and cannot use its alternate cost with one color',()=>{
 const s=setup(),spell=put(s,0,'hand',BRAVE);
 give(s,0,'mana',[FIRE,FIRE]);
 assert.equal(alt(s,spell),undefined);
 give(s,0,'mana',[FIRE,FIRE,FIRE,BODY,BODY,BODY]);
 put(s,0,'hand',BODY);
 assert.equal(alt(s,spell),undefined);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===spell.uid&&a.kind==='play').cost,6);
});

test('Brave Link’s S-Trigger needs no mana and the mana steps still resolve without a legal destruction target',()=>{
 const s=setup(),attacker=put(s,1,'battle','dm03-s03'),top=s.players[0].deck[0];
 give(s,0,'shields',[BRAVE]);
 s.active=1;
 hit(s,attacker,s.players[0].shields[0]);
 act(s,'useTrigger');
 assert.ok(has(s,1,'battle',attacker)&&has(s,0,'mana',top));
 pick(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,Number(e.civilizations(e.card(top.cardId)).length>1));
});
