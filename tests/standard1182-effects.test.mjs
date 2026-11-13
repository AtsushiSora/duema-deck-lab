import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {creatureStatusModel} from '../dist/battle-insights.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const {cards,printAliases,regulationVerification}=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1182.json',import.meta.url)));
const MAIDEN='dmrp20-024',SHURA='dm25sp1-007',TATSURION='dmx12b-015';
const NATURE='dm01-108',FIRE='dm01-100',WATER='dm01-083',LIGHT='dm01-075',LIFE='dm06-110';
const MULTI='dmr23-072',MULTI_TWO='dmr23-060',MENDEL='dmx11-012',BOUNCE='dm01-086';
const add=(s,p,zone,id)=>{const x=inst(id);s.players[p][zone].push(x);return x;};
const values=s=>(s.decision?.choices||[]).map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function field(p=0){
 const s=setup();s.active=p;
 for(const q of [0,1])give(s,q,'deck',Array(20).fill(NATURE));
 return s;
}
function ramp(s,p,id){
 const x=inst(id);s.players[p].deck.unshift(x);
 const spell=add(s,p,'hand',LIFE);
 s.phase='main';play(s,spell);drain(s);
 assert.ok(s.players[p].mana.includes(x));
 return x;
}

test('nine prints share three canonical names and give the same stats, effects and copy limits',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(fs.readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of [...cards,...printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1182}),row.spec);
  assert.equal(c.cost,f.cost);assert.equal(c.power,Number(f.powerText));assert.equal(c.manaValue,1);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  const bad=structuredClone(row);bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec({...bad,status:'complete'},{phase:1182}));
 }
});

test('Maiden draws first, then can choose the card just drawn and untaps the first multicolor mana',()=>{
 const s=field(),x=add(s,0,'hand',MAIDEN),top=inst(MULTI);
 s.players[0].deck.unshift(top);
 play(s,x);
 assert.ok(e.effectiveCard(x,s).blocker);
 assert.ok(s.players[0].hand.includes(top));
 assert.deepEqual(values(s),[top.uid]);
 pick(s,top.uid);drain(s);
 assert.ok(s.players[0].mana.includes(top));
 assert.equal(top.tapped,false);
 assert.equal(ramp(s,0,MULTI_TWO).tapped,true);
});

test('Maiden tracks placements before it entered and resets on a later turn',()=>{
 const s=field(),before=ramp(s,0,MULTI),firstDraw=inst(MULTI_TWO);
 s.players[0].deck.unshift(firstDraw);
 play(s,add(s,0,'hand',MAIDEN));pick(s,firstDraw.uid);drain(s);
 assert.equal(before.tapped,true);assert.equal(firstDraw.tapped,true);
 end(s);end(s);
 assert.equal(ramp(s,0,MULTI_TWO).tapped,false);
});

test('Maiden untaps both simultaneous first multicolor placements, including after a monocolor placement',()=>{
 const s=field();
 add(s,0,'battle',MAIDEN);ramp(s,0,NATURE);
 const cards=[MULTI,MULTI_TWO].map(inst);
 s.players[0].deck.unshift(...cards);
 play(s,add(s,0,'hand',MENDEL));drain(s);
 assert.ok(cards.every(x=>s.players[0].mana.includes(x)&&!x.tapped));
});

test('Maiden also untaps the first multicolor mana on the other player turn',()=>{
 const s=field(),top=inst(MULTI);
 add(s,1,'battle',MAIDEN);s.players[1].deck.unshift(top);
 give(s,1,'shields',[LIFE]);
 attack(s,add(s,0,'battle',FIRE).uid);
 act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(s.players[1].mana.includes(top));
 assert.equal(top.tapped,false);
});

test('QA49017 Maiden already in mana cannot untap itself unless a different copy remains',()=>{
 for(const other of [false,true]){
  const s=field(1),x=add(s,0,'battle',MAIDEN);
  if(other)add(s,0,'battle',MAIDEN);
  play(s,add(s,1,'hand','dm01-039'));
  act(s,'effect',a=>a.targets[0]?.uid===x.uid);drain(s);
  assert.ok(s.players[0].mana.includes(x));
  assert.equal(x.tapped,!other);
 }
});

test('Shura forbids only opposing summons costing four or less and lasts through its departure',()=>{
 const s=field(),x=add(s,0,'hand',SHURA);
 play(s,x);drain(s);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 assert.ok(e.effectiveCard(x,s).blocker);
 const ours=add(s,0,'hand',WATER);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===ours.uid));
 end(s);s.phase='main';
 const small=add(s,1,'hand',WATER),edge=add(s,1,'hand','dm08-049'),big=add(s,1,'hand',MULTI);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&[small.uid,edge.uid].includes(a.uid)));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===big.uid));
 play(s,add(s,1,'hand',BOUNCE));act(s,'effect',a=>a.targets[0]?.uid===x.uid);drain(s);
 assert.ok(s.players[0].hand.includes(x));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===small.uid));
 end(s);end(s);s.phase='main';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===small.uid));
});

test('QA46399 an Abyss put into the battlefield by 邪侵入 is not a summon',()=>{
 const s=field(),x=add(s,0,'hand',SHURA);
 play(s,x);end(s);s.phase='main';
 const ab=add(s,1,'grave','dm22rp1-060'),spell=add(s,1,'hand','dm22rp1-017');
 assert.ok(e.card(ab).race.includes('アビス'));
 play(s,spell);pick(s,ab.uid);drain(s);
 assert.ok(s.players[1].battle.includes(ab));
});

test('Shura stops an S Trigger creature summon but leaves the shield card in hand',()=>{
 const s=field(),x=add(s,0,'hand',SHURA);
 play(s,x);drain(s);
 give(s,1,'shields',['dm04-042']);
 const trigger=s.players[1].shields[0];
 attack(s,add(s,0,'battle',FIRE).uid);
 act(s,'noBlock');drain(s);
 assert.ok(s.players[1].hand.includes(trigger));
 assert.ok(!s.players[1].battle.includes(trigger));
 assert.equal(s.metrics[1].triggers,0);
});

test('Tatsurion can attack only tapped creatures on entry turn and the player on a subsequent turn',()=>{
 const s=field(),x=add(s,0,'hand',TATSURION),tapped=add(s,1,'battle',WATER),untapped=add(s,1,'battle',WATER);
 tapped.tapped=true;
 play(s,x);
 s.phase='attack';
 assert.equal(x.entered,s.turn);
 const targets=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 assert.deepEqual(targets(),[tapped.uid]);
 assert.equal(creatureStatusModel(s,0,x.uid).rows.find(([k])=>k==='攻撃')[1],'攻撃可能');
 attack(s,x.uid,tapped.uid);act(s,'noBlock');drain(s);
 assert.ok(s.players[1].grave.includes(tapped));
 assert.ok(s.players[1].battle.includes(untapped));
 end(s);end(s);s.phase='attack';
 assert.deepEqual(targets(),['player']);
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Tatsurion still obeys entry turn attack restrictions',()=>{
 const s=field(),x=add(s,0,'hand',TATSURION),victim=add(s,1,'battle',WATER);
 victim.tapped=true;
 play(s,x);
 s.phase='attack';
 const actions=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
 assert.equal(actions().length,1);
 x.g35Ignored=s.turn;
 assert.deepEqual(actions(),[]);
});
