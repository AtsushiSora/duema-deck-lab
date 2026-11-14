import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const KAISAR='dm25ex1-018',RIN='dm25-048',MASTA='dm24-034';
const BASIC='dm01-108',ANGEL='dmd28-001',ALCADIAS='dm04-001',BRAIN='dm01-052';
const QX='dm25ex1-049',TOKOSHIE='dmrp17-025';
const CURSE='dm24-s10',DARK='dm01-s06',WATER='dm01-080',EXACT_FOUR='dm01-088';
const GENMU='dmrp15-km1';
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function startKaisar(s,id){
 const top=inst(id);
 s.players[0].deck.unshift(top);
 s.active=1;
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,0);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.equal(s.decision.task.source,KAISAR);
 return top;
}

test('five official prints resolve to three card definitions and their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1306.json',import.meta.url)));
 const {prints}=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[KAISAR,RIN,MASTA]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dmc47-019','dmc61-032']);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1306}));
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.limit,e.manaValue(c)],['creature',f.cost,Number(f.powerText),f.race,4,1]);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

test('Kaisar can enter by S-Trigger and block on a later attack',()=>{
 const s=field();
 give(s,0,'shields',[KAISAR,BASIC]);
 const enemy=add(s,1,'battle',BASIC),next=add(s,1,'battle',BASIC);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(s.players[0].shields[0].uid));
 act(s,'useTrigger',a=>a.cardId===KAISAR);
 drain(s);
 const kaisar=s.players[0].battle.find(x=>x.cardId===KAISAR);
 assert.ok(kaisar);
 attack(s,next.uid);
 act(s,'block',a=>a.uid===kaisar.uid);
 drain(s);
 assert.ok(has(s,1,'grave',next));
});

test('Kaisar can decline before looking and retains the normal draw',()=>{
 const s=field();
 add(s,0,'battle',KAISAR);
 const top=startKaisar(s,ANGEL);
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'hand',top));
 assert.equal(s.players[0].shields.length,5);
 assert.ok(!s.log.some(x=>x.kind==='look'&&x.cardId===KAISAR));
});

test('Kaisar privately inspects and deploys an Angel Command, including an evolution',()=>{
 for(const id of [ANGEL,ALCADIAS]){
  const s=field(),kaisar=add(s,0,'battle',KAISAR);
  const top=startKaisar(s,id);
  pick(s,true);
  assert.equal(s.decision.task.g585Peek[0].id,id);
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(id));
  pick(s,top.uid);
  if(id===ALCADIAS)pick(s,kaisar.uid);
  drain(s);
  assert.ok(has(s,0,'battle',top));
  assert.equal(s.players[0].shields.length,5);
  assert.equal(e.physicalCards(s).filter(x=>x.uid===top.uid).length,1);
 }
});

test('Kaisar shields the inspected card face down after declining deployment or finding a spell',()=>{
 for(const id of [ANGEL,BRAIN]){
  const s=field();
  add(s,0,'battle',KAISAR);
  const top=startKaisar(s,id);
  pick(s,true);
  assert.equal(s.decision.task.g585Peek[0].id,id);
  assert.equal(s.decision.choices.some(c=>c.value?.uid===top.uid),id===ANGEL);
  pick(s,null);
  drain(s);
  assert.ok(has(s,0,'shields',top));
  assert.ok(!top.faceUp);
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(id));
 }
});

test('Kaisar has no card to shield when Q.Q.G.QX. prevents the look (QA 47059)',()=>{
 const s=field();
 add(s,0,'battle',KAISAR);
 add(s,1,'battle',QX);
 const top=startKaisar(s,ANGEL);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'hand',top));
 assert.equal(s.players[0].shields.length,5);
 assert.ok(!s.log.some(x=>x.kind==='look'&&x.cardId===KAISAR));
});

test('Kaisar does not shield a card redirected to mana by Tokoshie',()=>{
 const s=field();
 add(s,0,'battle',KAISAR);
 add(s,1,'battle',TOKOSHIE);
 const top=startKaisar(s,ANGEL);
 pick(s,true);
 pick(s,top.uid);
 drain(s);
 assert.ok(has(s,0,'mana',top));
 assert.equal(s.players[0].shields.length,5);
 assert.equal(e.physicalCards(s).filter(x=>x.uid===top.uid).length,1);
});

test('Rimbausha gets one Power Attacker per qualifying creature, stacking until turn end (QA 35551 and 35552)',()=>{
 const s=field(),rin=add(s,0,'battle',RIN);
 add(s,0,'grave',BASIC);
 cast(s,WATER);
 drain(s);
 assert.equal(e.power(rin,true,s),1000);
 cast(s,CURSE);
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.cardId===CURSE));
 assert.equal(e.power(rin,true,s),6000);
 cast(s,DARK);
 drain(s);
 assert.equal(e.power(rin,true,s),11000);
 assert.equal(e.power(rin,false,s),1000);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(rin,true,s),1000);
 act(s,'skipCharge');
 cast(s,DARK);
 drain(s);
 assert.equal(e.power(rin,true,s),1000);
});

test('Mastacha grants both races and stacking power to its own cost-four-or-higher creatures',()=>{
 const s=field();
 const masta=add(s,0,'battle',MASTA),four=add(s,0,'battle',EXACT_FOUR),three=add(s,0,'battle',WATER);
 const enemy=add(s,1,'battle',EXACT_FOUR);
 const base=e.card(EXACT_FOUR);
 const races=x=>e.effectiveCard(x,s).race.split('/');
 assert.equal(e.power(masta,false,s),11000);
 assert.equal(e.effectiveCard(masta,s).breaker,2);
 assert.deepEqual(races(masta),['アポロニア・ドラゴン','アース・ドラゴン']);
 assert.equal(e.power(four,false,s),base.power+3000);
 assert.deepEqual(races(four),[base.race,'アポロニア・ドラゴン','アース・ドラゴン']);
 assert.equal(e.power(three,false,s),e.card(WATER).power);
 assert.deepEqual(races(three),[e.card(WATER).race]);
 assert.equal(e.power(enemy,false,s),base.power);
 assert.deepEqual(races(enemy),[base.race]);
 cast(s,MASTA);
 drain(s);
 assert.equal(e.power(four,false,s),base.power+6000);
 assert.deepEqual(races(four),[base.race,'アポロニア・ドラゴン','アース・ドラゴン']);
 add(s,1,'battle',GENMU);
 assert.equal(e.power(four,false,s),base.power+6000);
 assert.deepEqual(races(four),[base.race,'アポロニア・ドラゴン','アース・ドラゴン']);
 s.players[0].battle=s.players[0].battle.filter(x=>x.cardId!==MASTA);
 assert.equal(e.power(four,false,s),base.power);
 assert.deepEqual(races(four),[base.race]);
});

test('Mastacha enters mana tapped when charged',()=>{
 const s=field(),masta=add(s,0,'hand',MASTA);
 s.phase='charge';
 act(s,'charge',a=>a.uid===masta.uid);
 assert.ok(has(s,0,'mana',masta));
 assert.equal(masta.tapped,true);
});
