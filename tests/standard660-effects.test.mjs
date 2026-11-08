import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-660.json',import.meta.url)));
const NEBULA='dmr09-054',KOHAKU='dmr12-035',ELYSIUM='dmr12-038',CHOI='dmr12-046',RHINO='dmr12-049';
const STAR='dm26rp1-048',NATURE='dm01-108',HAND='dm01-027',BLOCKER='dm01-076',LARGE='dm01-001',COST4='dm01-088',FIRE='dm01-100';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const valueOf=c=>c.value?.uid??c.value;
const values=s=>s.decision.choices.map(valueOf);
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
function destroy(s,uid){
 s.active=1;
 act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===uid);
}
function faceUpShield(s,uid){return s.players[0].shields.some(x=>x.uid===uid&&x.faceUp);}

test('Phase 660 preserves the five original IDs and verifies the full older printed abilities',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:660}));
  assert.throws(()=>standardCardSpec(detail,{phase:659}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Nebula cannot be blocked and becomes a face-up shield after a real destruction',()=>{
 const s=setup();
 give(s,0,'battle',[NEBULA]);
 give(s,1,'battle',[BLOCKER]);
 give(s,1,'hand',[HAND]);
 const [nebula]=s.players[0].battle,[blocker]=s.players[1].battle;
 attack(s,nebula.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.players[1].shields.length,4);
 s.phase='main';
 destroy(s,nebula.uid);
 assert.ok(faceUpShield(s,nebula.uid));
 assert.ok(!has(s.players[0].grave,nebula.uid));
});

for(const take of [true,false])test('Kohaku may tap one opponent creature once added face up: '+take,()=>{
 let s=setup();
 give(s,0,'battle',[KOHAKU,NATURE]);
 give(s,1,'battle',[NATURE,NATURE]);
 give(s,1,'hand',[HAND]);
 const [kohaku,ally]=s.players[0].battle,[first,second]=s.players[1].battle;
 destroy(s,kohaku.uid);
 assert.ok(faceUpShield(s,kohaku.uid));
 assert.deepEqual(values(s),[first.uid,second.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,take?second.uid:null);
 assert.equal(s.players[1].battle[1].tapped,take);
 assert.equal(s.players[1].battle[0].tapped,false);
 assert.equal(s.players[0].battle.find(x=>x.uid===ally.uid).tapped,false);
});

for(const accept of [true,false])test('Elysium can draw or decline when shielded by Shield Go: '+accept,()=>{
 const s=setup();
 give(s,0,'battle',[ELYSIUM]);
 give(s,0,'deck',[FIRE,NATURE,NATURE]);
 give(s,1,'hand',[HAND]);
 const [elysium]=s.players[0].battle,[top]=s.players[0].deck;
 destroy(s,elysium.uid);
 assert.ok(faceUpShield(s,elysium.uid));
 assert.deepEqual(values(s),[0,1]);
 pick(s,accept?1:0);
 assert.equal(has(s.players[0].hand,top.uid),accept);
});

for(const up of [true,false])test('Starman placing Elysium triggers its draw only when placed face up: '+up,()=>{
 const s=setup();
 give(s,0,'battle',[STAR]);
 give(s,0,'hand',[ELYSIUM]);
 give(s,0,'deck',[FIRE,NATURE,NATURE]);
 const [elysium]=s.players[0].hand,[first,second]=s.players[0].deck;
 attack(s);
 assert.ok(has(s.players[0].hand,first.uid));
 pick(s,elysium.uid);
 pick(s,up);
 assert.equal(faceUpShield(s,elysium.uid),up);
 if(up)pick(s,1);
 assert.equal(has(s.players[0].hand,second.uid),up);
 assert.equal(s.decision?.type,'block');
});

test('Choinori must destroy an opponent creature up to 2000 power, including the threshold',()=>{
 const s=setup();
 give(s,0,'battle',[CHOI,NATURE]);
 give(s,1,'battle',[NATURE,LARGE]);
 give(s,1,'hand',[HAND]);
 const [choi]=s.players[0].battle,[small,large]=s.players[1].battle;
 destroy(s,choi.uid);
 assert.ok(faceUpShield(s,choi.uid));
 assert.deepEqual(values(s),[small.uid]);
 pick(s,small.uid);
 assert.ok(has(s.players[1].grave,small.uid));
 assert.ok(has(s.players[1].battle,large.uid));
});

test('Rhino must move an opponent creature of cost 4 or less to its owner’s mana',()=>{
 const s=setup();
 give(s,0,'battle',[RHINO]);
 give(s,1,'battle',[COST4,LARGE]);
 give(s,1,'hand',[HAND]);
 const [rhino]=s.players[0].battle,[cost4,expensive]=s.players[1].battle;
 destroy(s,rhino.uid);
 assert.ok(faceUpShield(s,rhino.uid));
 assert.deepEqual(values(s),[cost4.uid]);
 pick(s,cost4.uid);
 assert.ok(has(s.players[1].mana,cost4.uid));
 assert.ok(has(s.players[1].battle,expensive.uid));
});
