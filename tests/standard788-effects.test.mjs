import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-788.json',import.meta.url)));
const FORCE="dm24ex4-061",RABI="dm24ex4-065",LEMON="dm24ex4-097";
const BODY="dm01-108",FIRE="dm01-097",WATER="dm01-083",DARK="dm01-090";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 788 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:788}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:788}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:788}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const SEED='dm25ex1-051',BLOCKER='dm01-076',ROYAL='dmex18-s13',FUJIN='dmrp22-037';
const SNOW='dmbd10-009',NINGYO='dmrp22-033',DESTROY='dm01-027',BOUNCE='dm01-086';
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

for(const blocked of [false,true])test('Force Order privately partitions the top two cards even if shielding is blocked: '+blocked,()=>{
 let s=setup();
 if(blocked)put(s,1,'battle',FUJIN);
 give(s,0,'deck',[FIRE,WATER,DARK,BODY]);
 const [hand,shield,next]=s.players[0].deck;
 const force=put(s,0,'hand',FORCE),before=physical(s);
 play(s,force);
 assert.deepEqual(choices(s),[hand.uid,shield.uid]);
 assert.ok(!JSON.stringify(s.log).includes(e.card(hand.cardId).name));
 assert.equal(e.effectiveCard(force,s).blocker,true);
 assert.equal(e.effectiveCard(force,s).breaker,2);
 pick(s,shield.uid);
 s=restore(s);
 assert.deepEqual(choices(s),[hand.uid]);
 pick(s,hand.uid);
 assert.ok(has(s,0,'hand',hand));
 assert.equal(has(s,0,'shields',shield),!blocked);
 assert.equal(s.players[0].deck[0].uid,blocked?shield.uid:next.uid);
 if(!blocked)assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.deepEqual(physical(s),before);
});

test('Silence Charger taps its target, skips exactly the opponent’s next start untap, and goes to mana',()=>{
 const s=setup(),target=put(s,1,'battle',BODY),control=put(s,1,'battle',BODY),charger=put(s,0,'hand',FORCE);
 control.tapped=true;
 play(s,charger,1);
 pick(s,target.uid);
 assert.ok(target.tapped&&has(s,0,'mana',charger)&&!has(s,0,'grave',charger));
 end(s);
 assert.ok(target.tapped&&!control.tapped);
 end(s);
 end(s);
 assert.ok(!target.tapped);
});

test('Silence Charger can finish without any creature to target',()=>{
 const s=setup(),charger=put(s,0,'hand',FORCE);
 play(s,charger,1);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',charger));
});

test('Rabisong draws two and can put a just-drawn card into the hyperspatial zone',()=>{
 const s=setup(),rabi=put(s,0,'hand',RABI),existing=put(s,0,'hand',BODY);
 give(s,0,'deck',[FIRE,WATER,DARK,BODY]);
 const [first,second]=s.players[0].deck;
 play(s,rabi);
 assert.deepEqual(choices(s),[existing.uid,first.uid,second.uid]);
 pick(s,second.uid);
 assert.ok(has(s,0,'battle',rabi)&&has(s,0,'hand',first)&&has(s,0,'extra',second));
});

test('Rabisong sending Royal into the hyperspatial zone triggers Royal’s own ability',()=>{
 const s=setup(),rabi=put(s,0,'hand',RABI),royal=put(s,0,'hand',ROYAL),before=s.players[0].deck.length;
 play(s,rabi);
 pick(s,royal.uid);
 assert.ok(has(s,0,'extra',royal));
 assert.equal(s.players[0].deck.length,before-4);
 assert.ok(s.decision);
});

test('The song may return an allied noncreature as a shield trigger before locking an opponent until the caster’s next turn',()=>{
 let s=setup();
 const attacker=put(s,1,'battle',FIRE),target=put(s,1,'battle',BLOCKER),seed=put(s,0,'battle',SEED);
 give(s,0,'shields',[RABI]);
 const [spell]=s.players[0].shields;
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.face===1);
 assert.deepEqual(choices(s),[seed.uid,attacker.uid,target.uid,null]);
 pick(s,seed.uid);
 s=restore(s);
 pick(s,target.uid);
 const live=s.players[1].battle.find(x=>x.uid===target.uid);
 assert.ok(has(s,0,'hand',seed)&&has(s,0,'grave',spell)&&!live.tapped&&e.attackLocked(s,1,live));
 assert.equal(s.extLimits.filter(x=>x.uid===target.uid&&x.kind==='block').length,1);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 end(s);
 assert.ok(!e.attackLocked(s,1,live));
 assert.equal(s.extLimits.filter(x=>x.uid===target.uid&&x.kind==='block').length,0);
});

test('The song may skip the bounce but still must choose a creature to lock',()=>{
 const s=setup(),spell=put(s,0,'hand',RABI),target=put(s,1,'battle',BLOCKER);
 play(s,spell,1);
 pick(s,null);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,1,'battle',target)&&e.attackLocked(s,1,target));
});

for(const accept of [true,false])test('Lemongrass can charge a Snow Fairy from hand and cannot choose another race: '+accept,()=>{
 const s=setup(),lemon=put(s,0,'hand',LEMON),snow=put(s,0,'hand',SNOW),plain=put(s,0,'hand',BODY);
 put(s,1,'battle',NINGYO);
 play(s,lemon);
 assert.deepEqual(choices(s),[snow.uid,null]);
 pick(s,accept?snow.uid:null);
 assert.equal(has(s,0,'mana',snow),accept);
 assert.equal(has(s,0,'hand',snow),!accept);
 assert.ok(has(s,0,'hand',plain));
 if(accept)assert.ok(snow.tapped);
});

for(const accept of [true,false])test('Lemongrass may cast Grass Trap for free after destruction and keep the same card: '+accept,()=>{
 let s=setup();
 const lemon=put(s,0,'battle',LEMON),eligible=put(s,1,'battle',SEED),tooCostly=put(s,1,'battle','dm01-001'),ally=put(s,0,'battle',BODY);
 const spell=put(s,1,'hand',DESTROY),before=physical(s);
 s.active=1;
 play(s,spell);
 act(s,'effect',a=>a.targets[0].uid===lemon.uid);
 assert.equal(s.decision.task.op,'g40_LastBurst');
 s=restore(s);
 pick(s,accept?true:null);
 if(accept){
  assert.deepEqual(choices(s),[eligible.uid]);
  pick(s,eligible.uid);
 }
 assert.equal(has(s,1,'mana',eligible),accept);
 assert.ok(has(s,1,'battle',tooCostly)&&has(s,0,'battle',ally)&&has(s,0,'grave',lemon));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.deepEqual(physical(s),before);
});

test('Returning Lemongrass to hand does not offer Last Burst',()=>{
 const s=setup(),lemon=put(s,0,'battle',LEMON),spell=put(s,1,'hand',BOUNCE);
 s.active=1;
 play(s,spell);
 act(s,'effect',a=>a.targets[0].uid===lemon.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',lemon));
});
