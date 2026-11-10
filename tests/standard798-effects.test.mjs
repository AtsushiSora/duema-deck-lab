import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-798.json',import.meta.url)));
const URI="dm24rp4-044",GAJIRA="dm24rp4-001",QUAKES="dm24rp4-005";
const ONE="dm01-100",TWO="dm01-108",THREE="dm01-081",FOUR="dm01-049",FIVE="dm01-025",SIX="dm01-s06",SEVEN="dm01-s04",SEED="dmrp22-076",SPELL="dm01-027";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 798 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:798}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:798}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:798}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const task=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const top=(s,p,ids)=>{const cards=ids.map(inst);s.players[p].deck.unshift(...cards);return cards;};

for(const id of [URI,GAJIRA])test(e.card(id).name+' uses G・ストライク from an actual shield break',()=>{
 const s=setup();s.active=1;give(s,0,'shields',[id]);
 const a=put(s,1,'battle',TWO),b=put(s,1,'battle',TWO);
 attack(s,a.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 task(s,'gsDeclare');
 pick(s,true);
 task(s,'gsTarget');
 pick(s,b.uid);
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='attack'&&x.uid===b.uid));
 assert.equal(s.players[0].hand.at(-1).cardId,id);
});

test('Uriwari can attack creatures and use Guardman separately from its entry-turn effect battle',()=>{
 const s=setup(),uri=put(s,0,'battle',URI),ally=put(s,0,'battle',TWO),enemy=put(s,1,'battle',SIX);
 ally.tapped=enemy.tapped=true;
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uri.uid&&a.target===enemy.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uri.uid&&a.target==='player'));
 s.active=1;enemy.tapped=false;
 attack(s,enemy.uid,ally.uid);
 assert.notEqual(s.decision?.task?.op,'g34_FightAttacker798');
 act(s,'guardman',a=>a.uid===uri.uid);
 drain(s);
 assert.ok(uri.tapped&&has(s,0,'battle',ally)&&has(s,1,'grave',enemy));
});

for(const targetPlayer of [true,false])test('Uriwari fights a same-turn attacker without redirecting the attack '+targetPlayer,()=>{
 const s=setup();s.active=1;
 const uri=put(s,0,'battle',URI),ally=put(s,0,'battle',TWO),enemy=put(s,1,'battle',SIX);
 ally.tapped=uri.tapped=true;
 enemy.entered=s.turn;
 enemy.g34Grants=[{turn:s.turn,speedAttacker:true}];
 attack(s,enemy.uid,targetPlayer?'player':ally.uid);
 task(s,'g34_FightAttacker798');
 pick(s,true);
 assert.ok(has(s,1,'grave',enemy));
 assert.ok(has(s,0,'battle',ally)&&has(s,0,'battle',uri));
 assert.equal(s.players[0].shields.length,5);
});

test('Uriwari can decline the effect battle and then use Guardman normally',()=>{
 const s=setup();s.active=1;
 const uri=put(s,0,'battle',URI),ally=put(s,0,'battle',TWO),enemy=put(s,1,'battle',SIX);
 ally.tapped=true;
 enemy.entered=s.turn;
 enemy.g34Grants=[{turn:s.turn,speedAttacker:true}];
 attack(s,enemy.uid,ally.uid);
 task(s,'g34_FightAttacker798');
 pick(s,null);
 assert.ok(!uri.tapped);
 act(s,'guardman',a=>a.uid===uri.uid);
 drain(s);
 assert.ok(uri.tapped&&has(s,1,'grave',enemy)&&has(s,0,'battle',ally));
});

for(const attackerPlayer of [0,1])test('Gajirabyute watches either player, may pass, then deploys only once each turn '+attackerPlayer,()=>{
 const s=setup();s.active=attackerPlayer;
 put(s,0,'battle',GAJIRA);
 const first=put(s,attackerPlayer,'battle',FIVE),second=put(s,attackerPlayer,'battle',FIVE),third=put(s,attackerPlayer,'battle',FIVE);
 const allowed=put(s,0,'hand',FIVE),spare=put(s,0,'hand',FOUR),expensive=put(s,0,'hand',SIX),seed=put(s,0,'hand',SEED);
 attack(s,first.uid);
 task(s,'g34_Select');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[allowed.uid,spare.uid,null]);
 pick(s,null);
 finish(s);
 assert.ok(has(s,0,'hand',allowed));
 attack(s,second.uid);
 pick(s,allowed.uid);
 finish(s);
 assert.ok(has(s,0,'battle',allowed));
 attack(s,third.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
 finish(s);
 assert.ok(has(s,0,'hand',spare)&&has(s,0,'hand',expensive)&&has(s,0,'hand',seed));
 end(s);
 const next=put(s,s.active,'battle',FIVE);
 attack(s,next.uid);
 task(s,'g34_Select');
 pick(s,spare.uid);
 finish(s);
 assert.ok(has(s,0,'battle',spare));
});

test('Gajirabyute does not trigger on an attack against a creature',()=>{
 const s=setup();
 put(s,0,'battle',GAJIRA);
 const a=put(s,0,'battle',FIVE),b=put(s,1,'battle',TWO),x=put(s,0,'hand',FOUR);
 b.tapped=true;
 attack(s,a.uid,b.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
 finish(s);
 assert.ok(has(s,0,'hand',x));
});

test('Gajirabyute uses the original cost after the real Revolution Change in QA 45932',()=>{
 const s=setup(),gajira=put(s,0,'battle',GAJIRA),akane=put(s,0,'battle','dm23rp3-007');
 const heavy=put(s,0,'hand','dm23rp4-S07'),allowed=put(s,0,'hand',FIVE),tooMuch=put(s,0,'hand',SIX);
 attack(s,akane.uid);
 task(s,'revDeclare');
 pick(s,true);
 act(s,'orderEffect',a=>a.cardId===heavy.cardId);
 task(s,'revResolve');
 pick(s,akane.uid);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===GAJIRA);
 task(s,'g34_Select');
 assert.deepEqual(choices(s),[allowed.uid,akane.uid,null]);
 assert.ok(!choices(s).includes(tooMuch.uid));
 pick(s,allowed.uid);
 finish(s);
 assert.ok(has(s,0,'battle',heavy)&&has(s,0,'battle',allowed)&&has(s,0,'hand',akane));
 assert.equal(s.players[1].shields.length,2);
 assert.ok(has(s,0,'battle',gajira));
});

test('Quakes may deploy all three eligible cards with the same cost (QA 45924)',()=>{
 const s=setup(),source=put(s,0,'hand',QUAKES),batch=top(s,0,[SIX,SIX,SIX]);
 play(s,source);
 attack(s,source.uid);
 for(const x of batch)pick(s,x.uid);
 finish(s);
 assert.ok(batch.every(x=>has(s,0,'battle',x)));
 assert.equal(s.players[1].shields.length,3);
});

test('Quakes filters out spell, own creature cost and cards above six, while ignoring seed costs',()=>{
 const s=setup(),q=put(s,0,'battle',QUAKES);
 put(s,0,'battle',THREE);put(s,0,'battle',SEED);
 const [same,can,high]=top(s,0,[THREE,TWO,SEVEN]);
 attack(s,q.uid);
 assert.deepEqual(choices(s),[can.uid,null]);
 pick(s,can.uid);
 finish(s);
 assert.ok(has(s,0,'grave',same)&&has(s,0,'grave',high)&&has(s,0,'battle',can));
 q.tapped=false;
 const [spell,other,more]=top(s,0,[SPELL,FOUR,FIVE]);
 attack(s,q.uid);
 assert.deepEqual(choices(s),[other.uid,more.uid,null]);
 pick(s,null);
 finish(s);
 assert.ok([spell,other,more].every(x=>has(s,0,'grave',x)));
});

test('Quakes does not gain an untap trigger for the attack that fulfilled the condition (QA 45923)',()=>{
 const s=setup(),q=put(s,0,'battle',QUAKES),three=put(s,0,'battle',THREE);
 three.tapped=true;
 const batch=top(s,0,[SIX,FIVE,FOUR]);
 attack(s,q.uid);
 task(s,'g34_Select');
 for(const x of batch)pick(s,x.uid);
 finish(s);
 assert.ok(batch.every(x=>has(s,0,'battle',x)));
 assert.ok(q.tapped&&three.tapped);
});

test('Quakes keeps its untap trigger if Nicol Bolas destroys it after the attack begins (QA 45922)',()=>{
 const s=setup(),q=put(s,0,'battle',QUAKES),allies=[ONE,TWO,THREE,FOUR].map(id=>put(s,0,'battle',id));
 for(const ally of allies)ally.tapped=true;
 const nicol=put(s,1,'battle','dmx22b-128');
 s.active=1;
 attack(s,nicol.uid);
 pick(s,q.uid);
 finish(s);
 assert.ok(has(s,0,'grave',q));
 assert.ok(allies.every(x=>!x.tapped));
});

test('Quakes counts a tamaseed for variety and only untaps on attacks against a player',()=>{
 const s=setup(),q=put(s,0,'battle',QUAKES),ally=put(s,0,'battle',FOUR);
 for(const id of [SEED,THREE,FIVE])put(s,0,'battle',id);
 const a=put(s,1,'battle',ONE),b=put(s,1,'battle',SEVEN);
 ally.tapped=q.tapped=true;s.active=1;
 attack(s,a.uid,ally.uid);
 assert.ok(q.tapped);
 finish(s);
 attack(s,b.uid);
 finish(s);
 assert.equal(q.tapped,false);
});
