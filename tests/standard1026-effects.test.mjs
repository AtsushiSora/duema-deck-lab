import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const EME='dmbd04-007', REPRINT='dmex04-063', SHIELD='dmrp03-033', SCYTHE='dmrp03-044', DEADHEAT='dmrp04m-019';
const LIGHT='dm01-075', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const METAL8='dmrp12-066', METAL3='dmrp11-069', METAL_EVO='dmrp17-058';
const POWER6='dm01-s04', POWER8='dmrp12-098', FIRE_MULTI='dmr02-054', DIVER='dm23ex1-003';
const spells=[[EME,LIGHT,'光',7,4],[SHIELD,LIGHT,'光',5,2],[SCYTHE,DARK,'闇',5,2],[DEADHEAT,FIRE,'火',8,4]];

function add(s,p,zone,id,properties={}){
 const card=Object.assign(inst(id),properties);
 s.players[p][zone].push(card);
 return card;
}
const choiceValues=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,value)=>act(s,'extended',a=>choiceValues(s)[a.choice]===value);
const cast=(s,card,alt=false)=>act(s,'play',a=>a.uid===card.uid&&(alt?a.role==='tapCast976':!a.alternative));
const restored=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const alternatives=(s,card)=>e.getLegalActions(s).filter(a=>a.uid===card.uid&&a.role==='tapCast976');

test('four verified spell definitions retain their official IDs, mana, artwork and restrictions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1026.json',import.meta.url)));
 for(const [id,,color,cost,count] of spells){
  const row=manifest.cards.find(c=>c.id===id),card=registry.get(id);
  assert.equal(card.supported,true);
  assert.equal(card.cost,cost);
  assert.equal(card.limit,4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(card.g976TapCast,{color,type:'creature',count});
 }
 const [reprint]=manifest.printAliases;
 assert.deepEqual(reprint.faces,manifest.cards[0].faces);
 assert.equal(registry.get(REPRINT).id,EME);
 assert.deepEqual(registry.resolveRows([EME,REPRINT].map(id=>({id,count:1}))),[{id:EME,count:2}]);
 assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey(reprint.name)).length,1);
});

for(const [id,ally,,,count] of spells)test(id+' offers alternative payment only with enough untapped matching allies',()=>{
 const s=setup(),own=s.players[0];
 give(s,0,'mana',[]);
 give(s,0,'battle',Array(count-1).fill(ally));
 add(s,0,'battle',ally,{tapped:true});
 add(s,0,'battle',NATURE);
 add(s,1,'battle',ally);
 const spell=add(s,0,'hand',id);
 assert.deepEqual(alternatives(s,spell),[]);
 const last=add(s,0,'battle',ally,{entered:s.turn});
 assert.equal(alternatives(s,spell).length,1);
 cast(s,spell,true);
 assert.deepEqual(choiceValues(s),[...own.battle.slice(0,count-1).map(x=>x.uid),last.uid,null]);
 for(const card of own.battle.slice(0,count-1))choose(s,card.uid);
 choose(s,null);
 assert.ok(own.hand.includes(spell));
 assert.equal(own.battle.filter(x=>x.tapped).length,1);
});

for(const [id,,,cost] of spells)test(id+' can be cast at its printed mana cost',()=>{
 const s=setup(),spell=add(s,0,'hand',id);
 cast(s,spell);
 drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);
 assert.ok(s.players[0].grave.includes(spell));
});

test('Luminarie offers only hand Metallic creatures and can tap the one actually deployed after restoring',()=>{
 let s=setup();
 give(s,0,'mana',[]);
 give(s,0,'battle',Array(4).fill(LIGHT));
 const eight=add(s,0,'hand',METAL8),small=add(s,0,'hand',METAL3);
 const other=add(s,0,'hand',NATURE);
 const grave=add(s,0,'grave',METAL8),spell=add(s,0,'hand',EME);
 const before=physical(s);
 cast(s,spell,true);
 for(const ally of s.players[0].battle)choose(s,ally.uid);
 assert.deepEqual(choiceValues(s),[eight.uid,small.uid,null]);
 choose(s,eight.uid);
 assert.match(s.decision.title,/カラモサをタップする/);
 assert.ok(s.players[0].battle.includes(eight));
 assert.equal(eight.tapped,false);
 s=restored(s);
 choose(s,true);
 assert.equal(s.players[0].battle.find(x=>x.uid===eight.uid).tapped,true);
 assert.ok(s.players[0].hand.some(x=>x.uid===other.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===grave.uid));
 assert.equal(s.players[0].mana.length,0);
 assert.deepEqual(physical(s),before);
});

test('Luminarie can decline either optional action',()=>{
 for(const deploy of [false,true]){
  const s=setup(),unit=add(s,0,'hand',METAL3);
  cast(s,add(s,0,'hand',EME));
  choose(s,deploy?unit.uid:null);
  if(deploy)choose(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].battle.includes(unit),deploy);
  assert.equal(unit.tapped,false);
 }
});

test('Luminarie taps the evolution it deploys and preserves the selected base',()=>{
 const s=setup(),base=add(s,0,'battle',METAL3),unit=add(s,0,'hand',METAL_EVO);
 cast(s,add(s,0,'hand',EME));
 choose(s,unit.uid);
 choose(s,base.uid);
 assert.ok(s.players[0].battle.includes(unit));
 choose(s,true);
 assert.equal(unit.tapped,true);
 assert.equal(unit.under[0].uid,base.uid);
});

test('Shield moves only the top card to a fresh face-down shield and consumes the next-use reduction',()=>{
 const s=setup(),own=s.players[0],spell=add(s,0,'hand',SHIELD),top=own.deck[0];
 give(s,0,'battle',[LIGHT,LIGHT]);
 const before=physical(s),shields=own.shields.map(x=>x.uid);
 s.extLimits=[{kind:'g456NextReduction',player:0,turn:s.turn,type:'spell',filter:{color:'光'},amount:3,optional:true}];
 cast(s,spell,true);
 for(const ally of own.battle)choose(s,ally.uid);
 assert.deepEqual(own.shields.map(x=>x.uid),[...shields,top.uid]);
 assert.ok(!own.shields.at(-1).faceUp);
 assert.equal(own.mana.filter(x=>x.tapped).length,0);
 assert.equal(s.extLimits.some(x=>x.kind==='g456NextReduction'),false);
 assert.deepEqual(physical(s),before);
});

test('Deathscythe targets one eligible enemy and state-based rules destroy it at zero power',()=>{
 const s=setup(),zero=add(s,1,'battle',POWER6),high=add(s,1,'battle',POWER8);
 const protectedUnit=add(s,1,'battle',DIVER,{justDiverActive:true});
 add(s,0,'battle',DARK);
 const before=physical(s);
 cast(s,add(s,0,'hand',SCYTHE));
 assert.deepEqual(choiceValues(s),[zero.uid,high.uid]);
 choose(s,zero.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(zero));
 assert.ok(s.players[1].battle.includes(protectedUnit));
 assert.equal(e.power(high,false,s),8000);
 assert.equal(physical(s).length,before.length+1);
});

test('Deathscythe leaves a surviving enemy at reduced power until the turn ends',()=>{
 const s=setup(),high=add(s,1,'battle',POWER8);
 cast(s,add(s,0,'hand',SCYTHE));
 choose(s,high.uid);
 drain(s);
 assert.equal(e.power(high,false,s),2000);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(high,false,s),8000);
});

test('Deadheat inspects four cards, can deploy a multicolored fire creature, and orders the rest after restoring',()=>{
 let s=setup();
 give(s,0,'mana',[]);
 give(s,0,'battle',Array(4).fill(FIRE));
 give(s,0,'deck',[FIRE_MULTI,NATURE,DEADHEAT,FIRE,FIRE,LIGHT]);
 const [entrant,first,second,third,next,last]=s.players[0].deck;
 const spell=add(s,0,'hand',DEADHEAT),before=physical(s);
 cast(s,spell,true);
 for(const ally of s.players[0].battle)choose(s,ally.uid);
 assert.deepEqual(choiceValues(s),[entrant.uid,third.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[FIRE_MULTI,NATURE,DEADHEAT,FIRE]);
 choose(s,entrant.uid);
 assert.ok(s.players[0].battle.includes(entrant));
 assert.equal(entrant.tapped,false);
 s=restored(s);
 choose(s,third.uid);
 choose(s,second.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[next.uid,last.uid,third.uid,second.uid,first.uid]);
 assert.deepEqual(physical(s),before);
});

test('Deadheat puts all four inspected cards on the bottom when deployment is declined',()=>{
 const s=setup();
 give(s,0,'deck',[FIRE,LIGHT,DARK,NATURE,FIRE]);
 const [a,b,c,d,next]=s.players[0].deck;
 cast(s,add(s,0,'hand',DEADHEAT));
 choose(s,null);
 for(const card of [d,c,b])choose(s,card.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[next.uid,d.uid,c.uid,b.uid,a.uid]);
 assert.equal(s.players[0].battle.length,0);
});
