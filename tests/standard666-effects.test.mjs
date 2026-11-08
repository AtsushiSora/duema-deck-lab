import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-666.json',import.meta.url)));

test('Phase 666 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:666}));
  assert.throws(()=>standardCardSpec(detail,{phase:665}));
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

const CROM='dmr09-008',MANGAN='dmr10-022',TIME='dmr10-024',HEPA='dmr10-030';
const NAT='dm01-108',OTHER_GO='dmr09-060',BLOCKER='dm01-076',BIG='dm01-001',HAND='dm01-027';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const shield=(s,p,id,faceUp=true)=>{
 const x={...inst(id),faceUp};
 s.players[p].shields.push(x);
 return x;
};
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('Cromwell untaps during only its first attack on each turn',()=>{
 const s=setup();
 give(s,0,'battle',[CROM]);
 const [source]=s.players[0].battle;
 attack(s,source.uid);
 assert.equal(source.tapped,false);
 noBlock(s);
 attack(s,source.uid);
 noBlock(s);
 assert.equal(source.tapped,true);
 act(s,'endTurn');
 drain(s);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(s.active,0);
 attack(s,source.uid);
 noBlock(s);
 assert.equal(source.tapped,false);
});

test('Cromwell gives only allied creatures Speed Attacker while face up, including as a stacked card',()=>{
 const s=setup();
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[NAT]);
 const [own]=s.players[0].battle,[enemy]=s.players[1].battle;
 own.entered=s.turn;
 s.phase='attack';
 const canAttack=()=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===own.uid);
 const root=shield(s,0,NAT,false),crom={...inst(CROM),faceUp:false};
 root.shieldStack=[crom];
 const opposingCrom=shield(s,1,CROM);
 assert.equal(canAttack(),false);
 opposingCrom.faceUp=false;
 crom.faceUp=true;
 assert.equal(e.effectiveCard(enemy,s).speedAttacker,undefined);
 assert.equal(canAttack(),true);
 const observed=e.observation(s,0);
 assert.equal(e.effectiveCard(observed.players[0].battle[0],observed).speedAttacker,true);
 give(s,1,'battle',['dmrp15-km1']);
 assert.equal(canAttack(),false);
 give(s,1,'battle',[]);
 root.shieldStack=[];
 assert.equal(canAttack(),false);
});

test('Mangan untaps at the end of its own turn without Shield Go and gains Blocker only with a face-up Shield Go',()=>{
 const s=setup();
 give(s,0,'battle',[MANGAN]);
 give(s,1,'battle',[MANGAN]);
 const [own]=s.players[0].battle,[enemy]=s.players[1].battle;
 own.tapped=enemy.tapped=true;
 const hidden=shield(s,0,OTHER_GO,false);
 shield(s,1,OTHER_GO);
 shield(s,0,NAT);
 assert.equal(!!e.effectiveCard(own,s).blocker,false);
 hidden.faceUp=true;
 assert.equal(e.effectiveCard(own,s).blocker,true);
 hidden.faceUp=false;
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(own.tapped,false);
 assert.equal(!!e.effectiveCard(own,s).blocker,false);
 assert.equal(s.active,1);
});

test('Hepatica gets 4000 power and W-Breaker once, and cannot be blocked by smaller creatures',()=>{
 const s=setup();
 give(s,0,'battle',[HEPA]);
 give(s,1,'battle',[BLOCKER,BLOCKER]);
 const [source]=s.players[0].battle,[low,equal]=s.players[1].battle;
 low.powerModifiers=[{amount:2000,expires:'end',who:1}];
 equal.powerModifiers=[{amount:6000,expires:'end',who:1}];
 assert.equal(e.power(source,false,s),4000);
 assert.equal(e.effectiveCard(source,s).breaker??1,1);
 shield(s,0,OTHER_GO);
 shield(s,0,CROM);
 assert.equal(e.power(source,false,s),8000);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 const targets=s.players[1].shields.slice(1,3).map(x=>x.uid);
 attack(s,source.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),[equal.uid]);
 noBlock(s);
 act(s,'breakShields',a=>a.shields.join()===targets.join());
 assert.equal(s.players[1].shields.length,3);
 assert.ok(targets.every(uid=>has(s.players[1].hand,uid)));
 s.players[0].shields=s.players[0].shields.filter(x=>!x.faceUp);
 assert.equal(e.power(source,false,s),4000);
 assert.equal(e.effectiveCard(source,s).breaker??1,1);
});

for(const selected of ['ally','enemy','skip'])test('Time Paradox may return a cost-four-or-less creature of either side: '+selected,()=>{
 let s=setup();
 give(s,0,'battle',[TIME,NAT]);
 give(s,1,'battle',['dm01-088',BIG]);
 const [source,ally]=s.players[0].battle,[enemy,big]=s.players[1].battle;
 shield(s,0,OTHER_GO);
 attack(s,source.uid);
 assert.equal(s.decision?.task?.op,'g34_Target');
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[source.uid,ally.uid,enemy.uid,null]);
 const uid={ally:ally.uid,enemy:enemy.uid,skip:null}[selected];
 s=JSON.parse(JSON.stringify(s));
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);
 noBlock(s);
 assert.equal(has(s.players[0].hand,ally.uid),selected==='ally');
 assert.equal(has(s.players[1].hand,enemy.uid),selected==='enemy');
 assert.ok(has(s.players[1].battle,big.uid));
});

test('Time Paradox returns to hand on destruction even with no face-up Shield Go',()=>{
 const s=setup();
 give(s,0,'battle',[TIME]);
 give(s,1,'hand',[HAND]);
 shield(s,1,OTHER_GO);
 const [source]=s.players[0].battle;
 attack(s,source.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Target');
 noBlock(s);
 s.active=1;
 s.phase='main';
 act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===source.uid);
 if(s.decision?.type==='leave')act(s,'replaceOmega');
 assert.ok(has(s.players[0].hand,source.uid));
 assert.ok(!has(s.players[0].grave,source.uid));
});

for(const gain of [true,false])test('Time Paradox checks its condition when the attack effect resolves: '+gain,()=>{
 let s=setup();
 const watcher='dmrp15-058';
 give(s,0,'battle',[TIME,watcher]);
 give(s,1,'battle',[NAT]);
 const [source]=s.players[0].battle;
 const sg=shield(s,0,OTHER_GO,!gain);
 attack(s,source.uid);
 assert.equal(s.decision?.type,'effectOrder');
 // Change the public condition while the attack trigger is waiting to resolve.
 sg.faceUp=gain;
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId===TIME);
 assert.equal(s.decision?.task?.op==='g34_Target',gain);
});
