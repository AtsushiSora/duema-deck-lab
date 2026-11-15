import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const LAND='dm26ex2-008',DUEL='dm26ex2-033',BAKURO='dm26ex2-065';
const BASIC='dm01-108',BOLS='dm01-008',SONIC='dm25ex2-096',OTHER_SONIC='dm26ex2-044';
const TWIN_SONIC='dm22ex1-112',WATER_SPELL='dm01-027',HOST='dm32-047';
const EVO='dm26ex2-012',UPPER_EVO='dmrp22-059',DEMON_WORD='dm26ex2-035';
const TOKOSHIE='dmrp17-025',NINGYO='dmrp22-033';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('three verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1317.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[LAND,DUEL,BAKURO]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1317}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText),f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const top=(s,p,ids)=>{
 const xs=ids.map(inst);
 s.players[p].deck.unshift(...xs);
 return xs;
};

test('Land has immediate attack and double break, and deploys at its exact cost with speed',()=>{
 const s=field(),source=add(s,0,'hand',LAND),[exact,miss]=top(s,0,[LAND,BOLS]);
 act(s,'play',a=>a.uid===source.uid);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 attack(s,source.uid);
 assert.ok(choices(s).includes(exact.uid));
 assert.ok(!choices(s).includes(miss.uid));
 pick(s,exact.uid);
 drain(s);
 assert.ok(has(s,0,'battle',exact));
 assert.deepEqual(s.players[0].deck.slice(-1).map(x=>x.uid),[miss.uid]);
 assert.equal(s.players[1].shields.length,3);
});

test('Land grants temporary speed to a creature without printed speed and keeps the look private',()=>{
 const s=field(),source=add(s,0,'battle',LAND),[hit,spell]=top(s,0,[BASIC,WATER_SPELL]);
 attack(s,source.uid);
 assert.deepEqual(choices(s),[hit.uid,null]);
 assert.ok(!s.log.some(l=>l.type==='reveal'&&l.cardId===spell.cardId));
 pick(s,hit.uid);
 drain(s);
 assert.ok(e.effectiveCard(hit,s).speedAttacker);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===hit.uid));
 end(s);
 assert.ok(!e.effectiveCard(hit,s).speedAttacker);
});

test('Land can decline and orders both looked cards at the bottom after JSON resume',()=>{
 let s=field();
 const source=add(s,0,'battle',LAND),[a,b]=top(s,0,[BASIC,OTHER_SONIC]);
 attack(s,source.uid);
 pick(s,null);
 s=JSON.parse(JSON.stringify(s));
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,b.uid);
 drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[b.uid,a.uid]);
});

test('Land grants only the marked attack ability and uses the departed six-cost host under QA 47053',()=>{
 const s=field(),host=add(s,0,'battle',HOST,{under:[inst(LAND)]}),[six,small]=top(s,0,[BOLS,BASIC]);
 assert.ok(!e.effectiveCard(host,s).gStrike);
 attack(s,host.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===HOST);
 pick(s,host.uid);
 if(s.decision?.type==='effectOrder')
  act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===LAND);
 assert.ok(has(s,0,'hand',host));
 assert.deepEqual(choices(s),[six.uid,small.uid,null]);
 pick(s,six.uid);
 drain(s);
 assert.ok(has(s,0,'battle',six)&&e.effectiveCard(six,s).speedAttacker);
});

test('Land G Strike from a broken shield keeps the card in hand and bars a selected attacker',()=>{
 const s=field();
 s.active=1;
 const attacker=add(s,1,'battle',BASIC),other=add(s,1,'battle',BASIC);
 give(s,0,'shields',[LAND,BASIC]);
 const shield=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'gsDeclare');
 pick(s,true);
 pick(s,other.uid);
 drain(s);
 assert.ok(has(s,0,'hand',shield));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===other.uid));
});

test('Duel ramps first, deploys two different cards at the exact cost of eight, and expires next own start',()=>{
 let s=field();
 const [ramped]=top(s,0,[SONIC]),second=add(s,0,'mana',OTHER_SONIC),large=add(s,0,'mana',LAND);
 const hidden=add(s,0,'mana',SONIC,{faceDown:true}),preexisting=add(s,0,'battle',SONIC);
 cast(s,DUEL);
 assert.ok(has(s,0,'mana',ramped));
 pick(s,ramped.uid);
 assert.deepEqual(choices(s),[second.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,second.uid);
 drain(s);
 const entered=s.players[0].battle.filter(x=>[ramped.uid,second.uid].includes(x.uid));
 assert.equal(entered.length,2);
 assert.ok(entered.every(x=>e.effectiveCard(x,s).blocker));
 assert.ok(!e.effectiveCard(preexisting,s).blocker);
 assert.ok(has(s,0,'mana',large)&&has(s,0,'mana',hidden));
 end(s);
 assert.ok(entered.every(x=>e.effectiveCard(x,s).blocker));
 end(s);
 assert.ok(entered.every(x=>!e.effectiveCard(x,s).blocker));
});

test('Duel Shield Trigger pays no mana and grants nothing when entry redirects to mana',()=>{
 const s=field();
 s.active=1;
 const attacker=add(s,1,'battle',BASIC);
 add(s,1,'battle',TOKOSHIE);
 give(s,0,'shields',[DUEL,BASIC]);
 give(s,0,'mana',[]);
 const [ramped]=top(s,0,[SONIC]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,ramped.uid);
 drain(s);
 assert.ok(has(s,0,'mana',ramped));
 assert.equal(ramped.incarnation,undefined);
 assert.equal(s.players[0].battle.length,0);
 assert.ok(!s.extLimits?.some(x=>x.kind==='g521Grant'));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});

test('Duel can reveal a Sonic Command twinpact from hand and untaps the charged spell',()=>{
 const s=field(),source=add(s,0,'hand',DUEL),sonic=add(s,0,'hand',TWIN_SONIC);
 add(s,0,'hand',BASIC);
 s.phase='charge';
 act(s,'charge',a=>a.uid===source.uid);
 assert.equal(source.tapped,true);
 assert.deepEqual(choices(s),[sonic.uid,null]);
 pick(s,sonic.uid);
 assert.ok(has(s,0,'hand',sonic));
 assert.equal(source.tapped,false);
});

test('Bakuro picks one physical card from a shield stack and uses the new mana count for evolution',()=>{
 const s=field(),source=add(s,0,'hand',BAKURO);
 give(s,0,'mana',[BASIC,BASIC,BASIC,BASIC]);
 const root=s.players[0].shields[0],child=inst(EVO);
 root.shieldStack=[child];
 act(s,'play',a=>a.uid===source.uid);
 assert.ok(choices(s).includes(root.uid)&&choices(s).includes(child.uid)&&!choices(s).includes(null));
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 pick(s,child.uid);
 assert.ok(has(s,0,'shields',root)&&has(s,0,'mana',child));
 assert.deepEqual(choices(s),[child.uid]);
 pick(s,child.uid);
 pick(s,source.uid);
 drain(s);
 assert.ok(has(s,0,'battle',child));
 assert.ok(child.under.some(x=>x.uid===source.uid));
 assert.equal(s.players[0].shields.length,5);
});

test('Bakuro continues after the shield move is replaced and counts only live mana',()=>{
 const s=field(),source=add(s,0,'hand',BAKURO),shield=s.players[0].shields[0];
 give(s,0,'mana',[BASIC,EVO,UPPER_EVO,BASIC]);
 const [,eligible,capped]=s.players[0].mana;
 add(s,1,'battle',NINGYO);
 act(s,'play',a=>a.uid===source.uid);
 pick(s,shield.uid);
 assert.ok(has(s,0,'grave',shield));
 assert.deepEqual(choices(s),[eligible.uid]);
 assert.ok(has(s,0,'mana',capped));
 pick(s,eligible.uid);
 pick(s,source.uid);
 drain(s);
 assert.ok(has(s,0,'battle',eligible));
});

test('Bakuro S Back takes an actual Demonio shield, then evolves using itself as a base',()=>{
 const s=field();
 s.active=1;
 give(s,0,'shields',[DEMON_WORD,BASIC,BASIC]);
 give(s,0,'mana',[BASIC,BASIC,EVO]);
 const [payment,remaining]=s.players[0].shields,evolution=s.players[0].mana[2];
 const source=add(s,0,'hand',BAKURO),attacker=add(s,1,'battle',BASIC);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'g13_SB');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===source.uid&&
  s.decision.choices[a.choice].value.cost===payment.uid);
 assert.ok(has(s,0,'grave',payment));
 pick(s,remaining.uid);
 pick(s,evolution.uid);
 pick(s,source.uid);
 drain(s);
 assert.ok(has(s,0,'battle',evolution));
 assert.ok(evolution.under.some(x=>x.uid===source.uid));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});
