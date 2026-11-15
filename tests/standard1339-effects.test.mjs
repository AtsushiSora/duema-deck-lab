import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const BENZO='dm22ex1-061',CLAN='dmrp08-s03',LIGHT='dm01-075',PLAIN='dm01-083',FIRE='dm01-097';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const play=(s,x,face)=>act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
const pick=(s,v)=>act(s,'extended',a=>{
 const {value}=s.decision.choices[a.choice];
 return (value?.uid??value)===v;
});
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));

test('Benzo has one canonical definition and three verified alternate prints',()=>{
 const manifest=read('support-phase-1339.json'),registry=createCatalogue(snapshot,data.cards,details),card=e.card(BENZO);
 assert.deepEqual([card.cost,card.power,card.race,card.civilizations,card.limit],[4,2000,'パンドラボックス',['闇'],4]);
 assert.deepEqual([card.spellFace.name,card.spellFace.cost,card.spellFace.civilizations,card.spellFace.trigger],
  ['星龍の暴発',7,['光'],true]);
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['promoy22-048','dm26rp1-T003','dm24ex1-047']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:BENZO,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[BENZO]);
  assert.equal(read('image-reference-prints.json').prints.find(x=>x.id===row.id).image,row.image);
 }
 assert.equal(CARD_IMAGES[BENZO],manifest.cards[0].image);
});

test('the actual Benzo under Clanvia stays in the battle zone and becomes tapped without a new entry (QA45545)',()=>{
 let s=setup();
 const clan=add(s,0,'battle',CLAN),benzo=inst(BENZO);
 clan.under=[benzo];
 give(s,0,'mana',[LIGHT]);
 const shields=s.players[0].shields.map(x=>x.uid);
 const entries=s.players[0].enteredThisTurn;
 attack(s,clan.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,benzo.uid);
 const x=s.players[0].battle.find(x=>x.uid===benzo.uid);
 assert.ok(x);
 assert.equal(x.tapped,true);
 assert.equal(s.players[0].enteredThisTurn,entries);
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),shields);
 assert.equal(e.physicalCards(s).filter(y=>y.uid===benzo.uid).length,1);
 assert.ok(s.extLimits.some(r=>r.kind==='g1339ShieldTriggers'&&r.who===0));
});

test('a hand cast on its owner’s turn enters and the shield it breaks can use the new trigger',()=>{
 const s=setup(),x=add(s,0,'hand',BENZO),shield=inst(PLAIN);
 s.players[0].shields=[shield];
 play(s,x,1);act(s,'extended');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);
 assert.ok(s.players[0].battle.includes(x));
 assert.equal(x.tapped,false);
 assert.ok(!s.players[0].shields.length);
 assert.ok(s.players[0].battle.includes(shield));
 assert.ok(!s.players[0].grave.includes(x));
 assert.ok(s.extLimits.some(r=>r.kind==='g1339ShieldTriggers'&&r.who===0));
});

test('a declaration on the opponent’s turn grants triggers without deploying the spell card, and expires at the next own start',()=>{
 const s=setup(),benzo=inst(BENZO),attacker=add(s,0,'battle',FIRE);
 s.players[1].shields=[benzo];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===benzo.uid&&a.face===1);
 drain(s);
 assert.ok(s.players[1].grave.includes(benzo));
 assert.equal(s.players[1].battle.length,0);
 assert.ok(s.extLimits.some(r=>r.kind==='g1339ShieldTriggers'&&r.who===1));
 const next=add(s,0,'battle',FIRE),shield=inst(PLAIN);
 s.players[1].shields=[shield];
 attack(s,next.uid);act(s,'noBlock');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid&&(a.face??0)===0));
 act(s,'skipTrigger');drain(s);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(s.active,1);
 assert.ok(!s.extLimits.some(r=>r.kind==='g1339ShieldTriggers'&&r.who===1));
});

test('Good and Evil casts the stolen spell for its own shields and Benzo enters for the card owner (QA47370)',()=>{
 const s=setup(),benzo=add(s,1,'hand',BENZO);
 add(s,0,'battle','dm25rp3-S06');
 const discard=add(s,0,'hand','dm01-094');
 play(s,discard,0);
 assert.equal(s.decision.task.op,'stealSpell');
 pick(s,true);
 assert.ok(s.players[1].battle.includes(benzo));
 assert.ok(!s.players[0].battle.includes(benzo));
 assert.ok(s.extLimits.some(r=>r.kind==='g1339ShieldTriggers'&&r.who===0));
 assert.ok(!s.extLimits.some(r=>r.kind==='g1339ShieldTriggers'&&r.who===1));
 assert.equal(s.decision.player,1);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('the S-Trigger grant applies to all six cards in the single shield broken by Benzo (QA46592)',()=>{
 const s=setup(),benzo=add(s,0,'hand',BENZO),cards=Array.from({length:6},()=>inst(PLAIN));
 const [root,...rest]=cards;
 root.shieldStack=rest;
 s.players[0].shields=[root];
 play(s,benzo,1);act(s,'extended');
 assert.deepEqual(new Set(Object.keys(s.triggers.eligibleFaces)),new Set(cards.map(x=>x.uid)));
 for(const eligible of Object.values(s.triggers.eligibleFaces))assert.deepEqual(eligible,[0]);
 assert.equal(s.players[0].shields.length,0);
 drain(s);
});
