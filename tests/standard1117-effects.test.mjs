import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DRUM='dm25ex4-011',DUEL='dmex04-027',BAZA='dm25ex2-063';
const SHOW='dm25ex2-043',CREST='dm25ex2-070';
const FIRE='dm01-097',WATER='dm01-083',LOW='dm01-108';
const HADES='dmex13-s06',TSUNEKIN='dmex09-012',INFINITE='dmrp15-km1';

function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}
function top(s,id){
 const x=inst(id);
 s.players[0].deck.unshift(x);
 return x;
}
function play(s,id,match=()=>true){
 const x=add(s,0,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&match(a));
 return x;
}
const contains=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=x=>x.value?.uid??x.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

test('phase 1117 official definitions, print images, limits and canonical IDs',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1117.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1117}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces.at(-1).abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1117}));
 }
});

test('BOLSHA9 alternate summon pays four with fire, moves to extra and then reveals (QA 48123)',()=>{
 const s=setup();
 give(s,0,'mana',[WATER,WATER,WATER,WATER]);
 const drum=add(s,0,'hand',DRUM),hit=top(s,SHOW);
 assert.equal(e.getLegalActions(s).some(a=>a.uid===drum.uid&&a.kind==='play'),false);
 s.players[0].mana[0].cardId=FIRE;
 act(s,'play',a=>a.uid===drum.uid&&a.role==='paidAlt568'&&a.cost===4);
 assert.ok(contains(s,0,'extra',drum));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.ok(choices(s).includes(hit.uid));
 pick(s,hit.uid);
 drain(s);
 assert.ok(contains(s,0,'battle',hit));
 assert.equal(e.physicalCards(s).filter(x=>x.uid===hit.uid).length,1);
});

test('BOLSHA9 normal summon, decline, speed attack and ineligible spell fallback',()=>{
 const s=setup();
 const hit=top(s,LOW),drum=play(s,DRUM,a=>!a.alternative&&a.cost===6);
 assert.ok(contains(s,0,'battle',drum));
 assert.equal(e.effectiveCard(drum,s).breaker,2);
 pick(s,null);
 assert.ok(contains(s,0,'hand',hit));
 const spell=top(s,CREST);
 act(s,'toAttack');
 act(s,'attack',a=>a.uid===drum.uid&&a.target==='player');
 drain(s);
 assert.ok(contains(s,0,'hand',spell));
});

test('BOLSHA9 cannot deploy or recover a card it was prevented from revealing (QA 47059)',()=>{
 const s=setup();
 const hidden=top(s,LOW);
 add(s,1,'battle','dm25ex1-049');
 play(s,DRUM,a=>!a.alternative);
 drain(s);
 assert.ok(contains(s,0,'deck',hidden));
 assert.ok(!contains(s,0,'hand',hidden));
});

test('BOLSHA9 does not recover the same physical card after a deployment redirects it to mana',()=>{
 const s=setup();
 const hit=top(s,LOW);
 add(s,1,'battle','dmrp17-025');
 play(s,DRUM,a=>!a.alternative);
 pick(s,hit.uid);
 drain(s);
 assert.ok(contains(s,0,'mana',hit));
 assert.ok(!contains(s,0,'hand',hit)&&!contains(s,0,'battle',hit));
 assert.equal(e.physicalCards(s).filter(x=>x.uid===hit.uid).length,1);
});

test('BOLSHA9 counts in the original Duelist Charger and Bazagajiru by printed reading (QA 48124)',()=>{
 const s=setup();
 const drum=top(s,DRUM);
 play(s,DUEL,a=>a.face===1);
 drain(s);
 assert.ok(contains(s,0,'hand',drum));
 const baza=add(s,0,'battle',BAZA);
 const before=e.power(baza,false,s);
 s.players[0].hand=s.players[0].hand.filter(x=>x.uid!==drum.uid);
 s.players[0].grave.push(drum);
 assert.equal(e.power(baza,false,s),before+3000);
});

test('Duelow draws in order and reduces only its controller’s water spells to a minimum of one',()=>{
 const s=setup(),first=s.players[0].deck.slice(0,2).map(x=>x.uid),opp=s.players[1].deck[0].uid;
 const hand=()=>s.players[0].hand.map(x=>x.uid);
 play(s,SHOW,a=>a.face!==1);
 drain(s);
 assert.deepEqual(hand(),first);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[opp]);
 for(const [id,expected] of [['dm01-052',2],['dm10-048',1],[CREST,5]]){
  const c=e.card(id);
  assert.equal(e.summonCost(s,0,c),expected);
  assert.equal(e.summonCost(s,1,c),c.cost);
 }
});

test('Show Time uses the highest selected cost after opponent deployment and excludes evolution cards',()=>{
 const s=setup();
 const low=add(s,0,'hand',LOW),six=add(s,0,'hand',DRUM);
 const oppLow=add(s,1,'hand',LOW),oppSix=add(s,1,'hand',DRUM);
 const evo=add(s,1,'hand','dm02-s01');
 assert.ok(e.card(evo).evolution);
 play(s,SHOW,a=>a.face===1);
 assert.equal(s.decision.player,1);
 assert.ok(!choices(s).includes(evo.uid));
 pick(s,oppLow.uid);
 pick(s,oppSix.uid);
 assert.equal(s.decision.player,0);
 assert.ok(contains(s,1,'battle',oppLow)&&contains(s,1,'battle',oppSix));
 assert.ok(!choices(s).includes(low.uid));
 pick(s,six.uid);
 drain(s);
 assert.ok(contains(s,0,'battle',six));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
});

test('Show Time can summon any legal creature if the opponent declines',()=>{
 const s=setup(),low=add(s,0,'hand',LOW);
 add(s,1,'hand',HADES);
 play(s,SHOW,a=>a.face===1);
 pick(s,null);
 assert.equal(s.decision.player,0);
 pick(s,low.uid);
 assert.ok(contains(s,0,'battle',low));
});

test('Show Time counts the cost of a creature redirected to mana (QA 34332)',()=>{
 const s=setup(),low=add(s,0,'hand',LOW),ownHigh=add(s,0,'hand',HADES);
 add(s,0,'battle',TSUNEKIN);
 give(s,1,'mana',[]);
 const enemyHigh=add(s,1,'hand',HADES);
 play(s,SHOW,a=>a.face===1);
 pick(s,enemyHigh.uid);
 assert.ok(contains(s,1,'mana',enemyHigh));
 assert.ok(!choices(s).includes(low.uid));
 pick(s,ownHigh.uid);
 assert.ok(contains(s,0,'battle',ownHigh));
});

test('Show Time preserves the infinite threshold across state serialization (QA 34331)',()=>{
 let s=setup();
 const own=add(s,0,'hand',INFINITE),finite=add(s,0,'hand',HADES);
 const enemy=add(s,1,'hand',INFINITE);
 play(s,SHOW,a=>a.face===1);
 pick(s,enemy.uid);
 s=JSON.parse(JSON.stringify(s));
 assert.ok(contains(s,1,'battle',enemy));
 assert.ok(!choices(s).includes(finite.uid));
 pick(s,own.uid);
 assert.ok(contains(s,0,'battle',own));
});

test('Crest sweeps face up by physical card count and attaches to its existing shield',()=>{
 const s=setup();
 const ally=add(s,0,'battle',LOW),high=add(s,1,'battle',DRUM);
 const base=inst(LOW),low=add(s,1,'battle',LOW,{under:[base],justDiverActive:true});
 const target=add(s,1,'battle',SHOW,{cardOwner:0});
 const ownShield=s.players[0].shields[0];
 const crest=play(s,CREST);
 const shielded=s.players.flatMap(p=>p.shields).filter(x=>[base.uid,low.uid,target.uid].includes(x.uid));
 assert.equal(shielded.length,3);
 assert.ok(shielded.every(x=>x.faceUp));
 assert.ok(contains(s,0,'shields',target));
 assert.equal(s.players[0].hand.length,3);
 assert.ok(contains(s,0,'battle',ally)&&contains(s,1,'battle',high));
 pick(s,ownShield.uid);
 assert.ok(s.players[0].shields[0].shieldStack.some(x=>x.uid===crest.uid&&x.faceUp));
 assert.equal(s.players[0].shields.length,6);
});

test('Crest draws zero for prevented movements and goes to grave if it has no shield to attach to',()=>{
 const s=setup();
 give(s,0,'shields',[]);
 const low=add(s,1,'battle',LOW,{cardOwner:0});
 add(s,1,'battle','dmrp22-037',{powerModifiers:[{amount:2000}]});
 const crest=play(s,CREST);
 drain(s);
 assert.ok(contains(s,1,'battle',low));
 assert.equal(s.players[0].hand.length,0);
 assert.ok(contains(s,0,'grave',crest));
});
