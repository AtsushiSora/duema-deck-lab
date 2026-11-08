import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-662.json',import.meta.url)));
const JET='dmr09-014',PHANTOM='dmr09-024',OUTLANDER='dmr12-013',COTTON='dm26rp2-055',CALEIL='dm26rp2-066',WHITE='dm26rp1-023';
const NATURE='dm01-108',FIRE='dm01-100',BIG='dm01-001',HAND='dm01-027';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const valueOf=c=>c.value?.uid??c.value;
const values=s=>s.decision.choices.map(valueOf);
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const cast=(s,id)=>act(s,'play',a=>a.cardId===id);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const addShield=(s,p,id,faceUp=true)=>{
 const x={...inst(id),faceUp};
 s.players[p].shields.push(x);
 return x;
};
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('Phase 662 has three whole verified definitions and preserves original deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:662}));
  assert.throws(()=>standardCardSpec(detail,{phase:661}));
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

test('Jetstone has printed blocker and double breaker and shields after destruction',()=>{
 const s=setup();
 give(s,0,'battle',[JET]);
 give(s,1,'hand',[HAND]);
 const [jet]=s.players[0].battle;
 assert.equal(e.effectiveCard(jet,s).blocker,true);
 assert.equal(e.effectiveCard(jet,s).breaker,2);
 s.active=1;
 cast(s,HAND);
 act(s,'effect',a=>a.targets[0]?.uid===jet.uid);
 assert.ok(s.players[0].shields.some(x=>x.uid===jet.uid&&x.faceUp));
 assert.equal(s.decision,null);
});

test('Only face-up Jetstones act at their own turn start, once for each physical card',()=>{
 let s=setup();
 give(s,1,'battle',[NATURE,NATURE]);
 const [first,second]=s.players[1].battle;
 const root=addShield(s,0,JET);
 root.shieldStack=[{...inst(JET),faceUp:true},inst(JET)];
 const [drawn]=s.players[0].deck;
 end(s);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,0);
 act(s,'skipCharge');
 end(s);
 assert.equal(s.decision?.type,'effectOrder');
 assert.equal(s.pendingEffects.length,2);
 assert.equal(s.players[0].hand.length,0);
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect');
 assert.deepEqual(values(s),[first.uid,second.uid,null]);
 pick(s,second.uid);
 pick(s,null);
 assert.equal(s.players[1].battle[0].tapped,false);
 assert.equal(s.players[1].battle[1].tapped,true);
 assert.ok(has(s.players[0].hand,drawn.uid));
});

test('Phantom lowers all present enemy creatures before blocking and destroys those at zero',()=>{
 const s=setup();
 addShield(s,0,PHANTOM);
 addShield(s,0,PHANTOM,false);
 give(s,0,'battle',[NATURE]);
 give(s,1,'battle',[FIRE,NATURE]);
 const [small,large]=s.players[1].battle;
 attack(s);
 assert.equal(s.decision?.type,'block');
 assert.ok(has(s.players[1].grave,small.uid));
 assert.equal(e.power(large,false,s),1000);
 noBlock(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Phantom’s power reduction survives shield loss until the turn ends',()=>{
 const s=setup();
 const phantom=addShield(s,0,PHANTOM);
 give(s,0,'battle',[NATURE,NATURE]);
 give(s,0,'hand',[CALEIL]);
 give(s,1,'battle',[BIG]);
 const [first,second]=s.players[0].battle,[enemy]=s.players[1].battle;
 attack(s,first.uid);
 noBlock(s);
 assert.equal(e.power(enemy,false,s),8000);
 // Reenter the main phase in this fixture to remove the source within the same turn.
 s.phase='main';
 cast(s,CALEIL);
 pick(s,phantom.uid);
 assert.ok(has(s.players[0].grave,phantom.uid));
 assert.equal(e.power(enemy,false,s),8000);
 attack(s,second.uid);
 noBlock(s);
 assert.equal(e.power(enemy,false,s),8000);
 end(s);
 assert.equal(e.power(enemy,false,s),9000);
});

test('Outlander counts face-up Shield Go cards individually and gives the same result from public state',()=>{
 const s=setup();
 give(s,0,'battle',[OUTLANDER]);
 const [outlander]=s.players[0].battle;
 const root=addShield(s,0,COTTON);
 root.shieldStack=[{...inst(JET),faceUp:true},inst(PHANTOM),{...inst(WHITE),faceUp:true}];
 addShield(s,1,PHANTOM);
 const view=e.observation(s,0);
 assert.equal(e.power(outlander,false,s),15000);
 assert.equal(e.effectiveCard(outlander,s).extraBreak,2);
 assert.equal(e.power(view.players[0].battle[0],false,view),15000);
 assert.equal(e.effectiveCard(view.players[0].battle[0],view).extraBreak,2);
 assert.equal(e.effectiveCard(outlander,s).shieldGo,undefined);
 attack(s,outlander.uid);
 noBlock(s);
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,3);
 const selected=s.players[1].shields.slice(-3).map(x=>x.uid);
 act(s,'breakShields',a=>a.shields.join()===selected.join());
 assert.ok(selected.every(uid=>!has(s.players[1].shields,uid)));
 assert.equal(s.metrics[0].breaks,3);
});

test('Outlander loses the power and extra break immediately when its qualifying shield leaves',()=>{
 const s=setup();
 give(s,0,'battle',[OUTLANDER]);
 give(s,0,'hand',[CALEIL]);
 const [outlander]=s.players[0].battle;
 const root=addShield(s,0,COTTON);
 assert.equal(e.power(outlander,false,s),10000);
 assert.equal(e.effectiveCard(outlander,s).extraBreak,1);
 cast(s,CALEIL);
 pick(s,root.uid);
 assert.equal(e.power(outlander,false,s),5000);
 assert.equal(e.effectiveCard(outlander,s).extraBreak||0,0);
});
