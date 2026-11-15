import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const CLAN='dmrp08-s03',REPRINT='dm22ex1-006',RITE='dmrp17-010',SPIRAL='dm01-086';
const WATER='dm01-083',FIRE='dm01-097',GREEN='dm01-108',TWIN='dmrp11-s04';
const TOUCH='dmr21-090',COLORLESS='dmsd01-011',ZERO='dmsd01-011',CHARGER='dmr21-053';
const add=(s,p,zone,id)=>{const x=inst(id);s.players[p][zone].push(x);return x;};
const pick=(s,uid)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===uid;
});
const play=(s,id)=>{const x=add(s,0,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));

test('Clanvia and its official reprint use the existing canonical ID, image and four-copy limit',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),m=read('support-phase-1338.json'),c=e.card(CLAN);
 assert.deepEqual([c.cost,c.power,c.race,c.manaValue,c.limit,c.civ],[4,4000,'ムートピア',1,4,'水']);
 assert.deepEqual(m.printAliases.map(x=>x.id),[REPRINT]);
 for(const row of [...m.cards,...m.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:CLAN,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[CLAN]);
  assert.equal(read('image-reference-prints.json').prints.find(r=>r.id===row.id).image,row.image);
 }
 assert.equal(CARD_IMAGES[CLAN],m.cards[0].image);
});

test('Clanvia shuffles and reveals exactly three, storing all revealed cards with spell faces',()=>{
 const s=setup(),own=s.players[0],rng=s.rng;
 give(s,0,'deck',[TWIN,GREEN,SPIRAL,FIRE]);
 const original=own.deck.slice();
 const clan=play(s,CLAN);
 assert.notEqual(s.rng,rng);
 assert.equal(own.deck.length,1);
 const moved=original.filter(x=>!own.deck.includes(x));
 assert.equal(moved.length,3);
 assert.deepEqual(new Set(clan.under),new Set(moved.filter(x=>[TWIN,SPIRAL].includes(x.cardId))));
 assert.deepEqual(new Set(own.grave),new Set(moved.filter(x=>[GREEN,FIRE].includes(x.cardId))));
 assert.ok(s.log.some(row=>row.type==='reveal'&&row.cardId===CLAN));
});

test('Ashen Rite can be stored by the Clanvia it just revived, with the decline still legal (QA42379)',()=>{
 for(const store of [true,false]){
  let s=setup();
  const clan=add(s,0,'grave',CLAN);
  give(s,0,'deck',Array(12).fill(GREEN));
  const rite=play(s,RITE);pick(s,clan.uid);
  assert.equal(s.decision.task.op,'g1338ClanFinish');
  assert.ok(s.players[0].battle.includes(clan));
  s=JSON.parse(JSON.stringify(s));
  pick(s,store?clan.uid:null);
  const own=s.players[0],host=own.battle.find(x=>x.uid===clan.uid);
  assert.equal(host.under?.some(x=>x.uid===rite.uid)??false,store);
  assert.equal(own.grave.some(x=>x.uid===rite.uid),!store);
  assert.equal(e.physicalCards(s).filter(x=>x.uid===rite.uid).length,1);
  assert.equal(own.grave.filter(x=>x.cardId===GREEN).length,3);
 }
});

test('attack uses one matching civilization and cannot match colorless (QA31880 and QA31881)',()=>{
 const s=setup(),clan=add(s,0,'battle',CLAN),other=add(s,0,'battle',CLAN);
 const twoColors=inst(TOUCH),empty=inst(COLORLESS),lightSpell=inst(TWIN);
 clan.under=[twoColors,empty,lightSpell];
 give(s,0,'mana',[WATER,ZERO]);give(s,1,'hand',[FIRE]);
 assert.deepEqual(e.civilizations(e.card(s.players[0].mana[1])),[]);
 attack(s,clan.uid);
 assert.deepEqual(s.decision.choices.map(({value})=>value?.uid??value),[twoColors.uid,null]);
 pick(s,twoColors.uid);
 for(let i=0;s.decision&&s.decision.type!=='block'&&i<10;i++)e.step(s,e.chooseAI(s));
 assert.ok(s.players[0].grave.includes(twoColors));
 assert.ok(!other.under?.length);
 assert.deepEqual(clan.under,[empty,lightSpell]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});

test('the spell face uses its own civilization and taps an opposing creature when cast from under',()=>{
 const s=setup(),clan=add(s,0,'battle',CLAN),twin=inst(TWIN),target=add(s,1,'battle',FIRE);
 clan.under=[twin];
 give(s,0,'mana',['dm01-075']);
 attack(s,clan.uid);
 assert.deepEqual(s.decision.choices.map(o=>o.value),[{uid:twin.uid,face:1},null]);
 pick(s,twin.uid);
 assert.equal(s.extSpells.find(f=>f.inst.uid===twin.uid).spell.summonOrigin,'battle');
 pick(s,target.uid);
 assert.ok(target.tapped);
 assert.ok(s.players[0].grave.includes(twin));
});

test('a hand-cast Charger keeps its own replacement over Clanvia (same precedence as QA38773)',()=>{
 const s=setup(),clan=add(s,0,'battle',CLAN);
 const x=play(s,CHARGER);drain(s);
 assert.ok(s.players[0].mana.includes(x));
 assert.ok(!clan.under?.length);
});
