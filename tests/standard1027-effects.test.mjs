import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const BULLET='dmrp03-076', CREST='dmrp04s-033', CIRCLE='dmrp03-064', MARKET='dmrp04m-015';
const DARK='dm01-090', NATURE='dm01-108', STRONG='dm01-s04', SEED='dm22ex1-086';
const FUJIN='dmrp22-037', CYCLE='dm22ex1-018', EX='dmrp17-s07', GENMU='dmrp15-km1';
const REPRINTS=['dmbd07-b-013','dmex03-052'];
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));

function add(s,p,zone,id,properties={}){
 const card=Object.assign(inst(id),properties);
 s.players[p][zone].push(card);
 return card;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const cast=(s,card,alt=false)=>act(s,'play',a=>a.uid===card.uid&&(alt?a.role==='tapCast976':!a.alternative));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('four official card definitions and two reprints preserve catalogue identity, images and restrictions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const manifest=read('tools/support-phase-1027.json');
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(c=>c.id),[BULLET,CREST,CIRCLE,MARKET]);
 for(const row of manifest.cards){
  const card=registry.get(row.id);
  assert.equal(card.supported,true);
  assert.equal(card.cost,row.faces[0].cost);
  assert.equal(card.manaValue,1);
  assert.equal(card.limit,4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey(card.name)).length,1);
 }
 assert.deepEqual(registry.resolveRows([CREST,...REPRINTS].map(id=>({id,count:1}))),[{id:CREST,count:3}]);
 for(const row of manifest.printAliases){
  assert.deepEqual(row.faces,manifest.cards[1].faces);
  assert.deepEqual(refs.find(x=>x.id===row.id),{
   id:row.id,canonicalId:CREST,name:row.name,image:row.image,source:row.source
  });
 }
});

test('Bullet casts as a shield trigger, reduces the chosen enemy by exactly 4000 and expires that turn',()=>{
 const s=Object.assign(setup(),{active:1});
 give(s,0,'mana',[]);
 give(s,0,'shields',[BULLET]);
 const target=add(s,1,'battle',STRONG),other=add(s,1,'battle',NATURE);
 const ally=add(s,0,'battle',NATURE);
 attack(s,target.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===BULLET);
 assert.deepEqual(values(s),[target.uid,other.uid]);
 pick(s,target.uid);
 assert.equal(e.power(target,false,s),2000);
 assert.equal(e.power(other,false,s),2000);
 assert.equal(e.power(ally,false,s),2000);
 act(s,'endTurn');
 assert.equal(e.power(target,false,s),6000);
});

test('Bullet can be paid with four mana and a creature at zero power is destroyed',()=>{
 const s=setup(),target=add(s,1,'battle',DARK,{powerModifiers:[{amount:2000}]});
 const spell=add(s,0,'hand',BULLET),before=physical(s);
 cast(s,spell);
 pick(s,target.uid);
 drain(s);
 assert.ok(inZone(s,1,'grave',target));
 assert.ok(inZone(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.deepEqual(physical(s),before);
});

test('Circle shield trigger grants Blocker to current allied creatures until the start of their next turn',()=>{
 let s=Object.assign(setup(),{active:1});
 give(s,0,'shields',[CIRCLE]);
 give(s,0,'battle',[NATURE,NATURE,SEED]);
 give(s,1,'battle',[NATURE,NATURE]);
 const [ally,other,seed]=s.players[0].battle;
 const [first,next]=s.players[1].battle;
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===CIRCLE);
 assert.ok(e.effectiveCard(ally,s).blocker&&e.effectiveCard(other,s).blocker);
 assert.ok(!e.effectiveCard(seed,s).blocker&&!e.effectiveCard(next,s).blocker);
 const late=add(s,0,'battle',NATURE);
 assert.ok(!e.effectiveCard(late,s).blocker);
 s=restore(s);
 attack(s,next.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),[ally.uid,other.uid]);
 act(s,'block',a=>a.uid===ally.uid);
 act(s,'endTurn');
 const survivor=s.players[0].battle.find(x=>x.uid===other.uid);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(survivor,s).blocker);
});

test('Circle can be cast for one light mana and does not untap its recipients',()=>{
 const s=setup(),unit=add(s,0,'battle',NATURE,{tapped:true});
 cast(s,add(s,0,'hand',CIRCLE));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(e.effectiveCard(unit,s).blocker);
 assert.equal(unit.tapped,true);
});

for(const fresh of [true,false])test('Crest can attach to a new or existing shield group after restoring '+fresh,()=>{
 let s=setup();
 give(s,0,'shields',fresh?[]:[NATURE]);
 const top=s.players[0].deck[0],old=s.players[0].shields[0];
 const spell=add(s,0,'hand',CREST),before=physical(s);
 cast(s,spell);
 assert.deepEqual(values(s),fresh?[top.uid]:[old.uid,top.uid]);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 s=restore(s);
 pick(s,fresh?top.uid:old.uid);
 const root=s.players[0].shields[0];
 assert.equal(s.players[0].shields.length,fresh?1:2);
 assert.deepEqual(root.shieldStack.map(x=>[x.uid,x.faceUp]),[[spell.uid,true]]);
 assert.ok(!inZone(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.deepEqual(physical(s),before);
});

test('Crest goes to the grave when the replacement cannot attach to any shield',()=>{
 for(const guard of [SEED,FUJIN,GENMU]){
  const s=setup(),top=s.players[0].deck[0];
  give(s,0,'shields',[]);
  add(s,1,'battle',guard);
  const spell=add(s,0,'hand',CREST),before=physical(s);
  cast(s,spell);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].shields.length,0);
  assert.ok(inZone(s,0,'grave',spell));
  assert.ok(inZone(s,0,guard===SEED?'grave':'deck',top));
  assert.deepEqual(physical(s),before);
 }
});

test('Crest cast from the grave adds a face-down shield and leaves its destination to the caster effect',()=>{
 const s=setup(),top=s.players[0].deck[0];
 const crest=add(s,0,'grave',CREST),spell=add(s,0,'hand',CYCLE);
 cast(s,spell);
 pick(s,crest.uid);
 drain(s);
 assert.equal(s.players[0].shields.at(-1).uid,top.uid);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.equal(s.players[0].deck.at(-1).uid,crest.uid);
 assert.ok(s.players[0].shields.every(root=>!root.shieldStack?.length));
});

test('Crest cast from the hand takes priority over Zardiclicas deck-bottom replacement',()=>{
 const s=setup(),crest=add(s,0,'hand',CREST);
 give(s,0,'shields',[]);
 const zard=add(s,0,'hand',EX),all=physical(s),crestShield=s.players[0].deck[1];
 cast(s,zard);
 pick(s,crest.uid);
 assert.deepEqual(values(s),[s.players[0].shields[0].uid,crestShield.uid]);
 pick(s,crestShield.uid);
 const root=s.players[0].shields.find(x=>x.uid===crestShield.uid);
 assert.deepEqual(root.shieldStack.map(x=>[x.uid,x.faceUp]),[[crest.uid,true]]);
 assert.ok(!inZone(s,0,'deck',crest));
 assert.deepEqual(physical(s),all);
});

test('Market taps four different dark creatures and draws for the full destruction attempt count',()=>{
 let s=setup();
 give(s,0,'mana',[]);
 give(s,0,'battle',[DARK,DARK,DARK]);
 const ordinary=s.players[0].battle[0],spell=add(s,0,'hand',MARKET);
 const eligible=()=>e.getLegalActions(s).filter(a=>a.uid===spell.uid&&a.role==='tapCast976');
 const exShield=s.players[0].shields[0];
 const saved=add(s,0,'battle',EX,{exLifeShieldUid:exShield.uid});
 const enemy=add(s,1,'battle',DARK);
 assert.deepEqual(eligible(),[]);
 add(s,0,'battle',DARK);
 assert.equal(eligible().length,1);
 const before=physical(s),draw=s.players[0].deck.slice(0,4).map(x=>x.uid);
 cast(s,spell,true);
 for(const unit of s.players[0].battle.filter(x=>x!==saved))pick(s,unit.uid);
 pick(s,ordinary.uid);
 assert.ok(inZone(s,0,'battle',ordinary));
 s=restore(s);
 pick(s,saved.uid);
 pick(s,null);
 drain(s);
 assert.ok(inZone(s,0,'grave',ordinary)&&inZone(s,0,'grave',exShield));
 assert.ok(inZone(s,0,'battle',saved)&&inZone(s,1,'battle',enemy));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),draw);
 assert.equal(s.players[0].mana.length,0);
 assert.deepEqual(physical(s),before);
});

test('Market can be paid normally and can choose zero creatures without drawing',()=>{
 const s=setup(),deckSize=s.players[0].deck.length;
 give(s,0,'battle',[DARK,NATURE]);
 cast(s,add(s,0,'hand',MARKET));
 pick(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.equal(s.players[0].battle.length,2);
 assert.equal(s.players[0].deck.length,deckSize);
 assert.equal(s.players[0].hand.length,0);
});
