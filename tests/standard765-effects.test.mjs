import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-765.json',import.meta.url)));
const BLUE='dm24rp4-045',PAROTTA='dm23rp2-022',RAMP='dm24rp4-022';
const BODY='dm01-108',DRAGON='dm36-048',SEED='dm25ex1-054',BIRD='dm23rp3-064';
const SPELL='dmrp17-073',MULTI='dmx22b-041';
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const order=(s,effectId)=>act(s,'orderEffect',a=>a.effectId===effectId);

test('three complete definitions and both alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:765}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:765}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const print=printAliases.find(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:print?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  if(print){
   assert.deepEqual(print.faces,row.faces);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  }
 }
});

test('Blue Eyes ignores nonqualifying entries, stacks qualifying power and loses it at its next start',()=>{
 const s=setup(),blue=put(s,0,'battle',BLUE);
 cast(s,BODY);
 assert.equal(e.power(blue,false,s),1000);
 s.active=1;
 cast(s,DRAGON);
 assert.equal(e.power(blue,false,s),1000);
 s.active=0;
 cast(s,DRAGON);
 assert.equal(e.power(blue,false,s),7000);
 assert.equal(e.effectiveCard(blue,s).breaker,2);
 cast(s,DRAGON);
 assert.equal(e.power(blue,false,s),13000);
 assert.equal(e.effectiveCard(blue,s).breaker,3);
 attack(s,blue.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 end(s);
 assert.equal(s.active,1);
 assert.equal(e.power(blue,false,s),13000);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.power(blue,false,s),1000);
 assert.equal(e.effectiveCard(blue,s).breaker,1);
});

test('a six-cost shield trigger on the opposing turn boosts Blue Eyes until its own turn starts',()=>{
 const s=setup(),blue=put(s,0,'battle',BLUE);
 give(s,0,'shields',['dmr19-081']);
 s.active=1;
 const attacker=put(s,1,'battle',BODY);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 drain(s);
 assert.equal(e.power(blue,false,s),6000);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.power(blue,false,s),1000);
});

for(const mode of ['live','left','infinity'])test('Blue Eyes reads power on resolution or uses the exact departing subject '+mode,()=>{
 let s=setup();
 const blue=put(s,0,'battle',BLUE),other=put(s,0,'battle',BLUE);
 cast(s,DRAGON);
 assert.equal(s.decision?.type,'effectOrder');
 const dragon=s.players[0].battle.find(x=>x.cardId===DRAGON);
 const pending=s.pendingEffects.find(x=>x.uid===blue.uid);
 const first=s.pendingEffects.find(x=>x.uid===other.uid);
 dragon.powerModifiers=[{amount:mode==='infinity'?'∞':2500}];
 if(mode==='left')first.task={op:'g34_ExactMove',p:0,source:BLUE,owner:0,to:'hand',target:dragon.uid};
 order(s,first.effectId);
 if(mode==='left'){
  assert.ok(s.players[0].hand.some(x=>x.uid===dragon.uid));
  assert.equal(pending.task.g765LastPower,8500);
 }
 s=restore(s);
 drain(s);
 const target=s.players[0].battle.find(x=>x.uid===blue.uid);
 const power=mode==='infinity'?Infinity:9500;
 assert.equal(e.power(target,false,s),power);
 if(mode!=='left')s.players[0].battle.find(x=>x.uid===dragon.uid).powerModifiers=[];
 assert.equal(e.power(target,false,s),power);
 assert.equal(e.effectiveCard(target,s).breaker,mode==='infinity'?'∞':2);
});

test('Parotta draws for allied Dragons including a noncreature Dragon, with no draw for a rival',()=>{
 const s=setup();
 put(s,0,'battle',PAROTTA);
 give(s,0,'deck',Array(8).fill(BODY));
 cast(s,BODY);
 assert.equal(s.players[0].deck.length,8);
 cast(s,DRAGON);
 assert.equal(s.players[0].deck.length,7);
 cast(s,SEED);
 assert.equal(s.players[0].deck.length,6);
 assert.ok(!e.isCreature(s,s.players[0].battle.find(x=>x.cardId===SEED)));
 s.active=1;
 cast(s,DRAGON);
 assert.equal(s.players[0].deck.length,6);
});

test('only an allied tapped Dragon creature enables Parotta attack protection',()=>{
 const s=setup(),source=put(s,0,'battle',PAROTTA,{tapped:true}),bird=put(s,0,'battle',BIRD,{tapped:true});
 const ordinary=put(s,0,'battle',BODY,{tapped:true}),dragon=put(s,0,'battle',DRAGON);
 put(s,0,'battle',SEED,{tapped:true});
 put(s,1,'battle',DRAGON,{tapped:true});
 const attacker=put(s,1,'battle',BODY);
 s.active=1;s.phase='attack';
 const can=x=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===x.uid);
 assert.ok(can(source)&&can(bird)&&can(ordinary));
 dragon.tapped=true;
 assert.ok(!can(source)&&!can(bird)&&can(ordinary)&&can(dragon));
 source.g35Ignored=s.turn;
 assert.ok(can(bird));
 delete source.g35Ignored;
 dragon.tapped=false;
 assert.ok(can(bird));
});

test('Abundance Yobinion skips spells and equal-cost creatures, then counts its new non-summoned creature',()=>{
 let s=setup();
 put(s,0,'battle',BLUE);
 put(s,0,'battle',SEED);
 put(s,1,'battle',DRAGON);
 const equal=data.cards.find(c=>c.type==='creature'&&c.cost===7&&!c.evolution).id;
 give(s,0,'deck',[SPELL,equal,BODY,MULTI,DRAGON,BODY,BODY,BODY]);
 const [first,second,hit,multi,single]=s.players[0].deck;
 const originalMana=s.players[0].mana.length;
 cast(s,RAMP);
 assert.equal(s.decision?.task?.op,'g19Yobi');
 s=restore(s);
 pick(s,true);
 drain(s);
 const own=s.players[0];
 assert.ok(own.battle.some(x=>x.uid===hit.uid));
 assert.equal(own.battle.find(x=>x.uid===hit.uid).summonedTurn,undefined);
 assert.equal(own.mana.length,originalMana+2);
 assert.deepEqual(own.mana.slice(-2).map(x=>[x.uid,x.tapped]),[[multi.uid,true],[single.uid,false]]);
 assert.deepEqual(new Set(own.deck.slice(-2).map(x=>x.uid)),new Set([first.uid,second.uid]));
});

test('declining Yobinion still ramps exactly once per own unsealed creature',()=>{
 const s=setup();
 put(s,0,'battle',BLUE);
 put(s,0,'battle',SEED);
 const sealed=put(s,0,'battle',DRAGON);
 put(s,0,'seals',BODY,{faceDown:true,sealOf:sealed.uid});
 put(s,1,'battle',BODY);
 give(s,0,'deck',[SPELL,BODY,BODY,BODY]);
 const [top,next]=s.players[0].deck;
 const originalMana=s.players[0].mana.length;
 cast(s,RAMP);
 pick(s,null);
 drain(s);
 assert.equal(s.players[0].mana.length,originalMana+1);
 assert.equal(s.players[0].mana.at(-1).uid,top.uid);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.ok(!s.log.some(l=>l.type==='reveal'&&l.cardId===RAMP));
});

test('when Yobinion finds no smaller creature, the revealed cards return before the mandatory ramp',()=>{
 const s=setup();
 put(s,0,'battle',BLUE);
 give(s,0,'deck',[SPELL,SPELL,SPELL]);
 const ids=s.players[0].deck.map(x=>x.uid),before=s.players[0].mana.length;
 cast(s,RAMP);
 pick(s,true);
 drain(s);
 assert.equal(s.winner,null);
 assert.equal(s.players[0].battle.length,1);
 assert.equal(s.players[0].mana.length,before+1);
 assert.deepEqual(new Set([...s.players[0].deck,s.players[0].mana.at(-1)].map(x=>x.uid)),new Set(ids));
});
