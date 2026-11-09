import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-698.json',import.meta.url)));

test('Phase 698 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:698}));
  assert.throws(()=>standardCardSpec(detail,{phase:697}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:698}));
 }
});

const HORN='dm12-030',TRIELLE='dm26-035',GIGA='dm12-010';
const BODY='dm01-108',DARK='dm01-090',FIRE='dm01-097',DUAL='dmrp13-090',SPARK='dm01-015';
const DRAW='dm06-085',DRAW_TRIGGER='dmr19-046';
const put=(s,p,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p].battle.push(x);return x;};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(x=>x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const play=(s,id)=>{const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid);return x;};

test('Clone Horn counts both graves and recalculates its W-Breaker at 6000',()=>{
 const s=setup(),horn=put(s,0,HORN);
 give(s,0,'hand',[HORN]);give(s,1,'mana',[HORN]);give(s,1,'grave',[BODY]);
 assert.equal(e.power(horn,false,s),3000);
 assert.ok(!e.effectiveCard(horn,s).breaker||e.effectiveCard(horn,s).breaker===1);
 give(s,1,'grave',[BODY,HORN]);
 assert.equal(e.power(horn,false,s),6000);
 assert.equal(e.effectiveCard(horn,s).breaker,2);
 give(s,0,'grave',[HORN]);
 assert.equal(e.power(horn,false,s),9000);
 give(s,1,'grave',[]);
 horn.powerModifiers=[{amount:-1}];
 assert.equal(e.power(horn,false,s),5999);
 assert.equal(e.effectiveCard(horn,s).breaker,1);
});

test('Clone Horn actually breaks two shields with one grave copy',()=>{
 const s=setup(),horn=put(s,0,HORN);
 give(s,1,'grave',[HORN]);give(s,1,'shields',[BODY,BODY]);
 attack(s,horn.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 for(let i=0;s.decision;i++){assert.ok(i<8);e.step(s,e.chooseAI(s));}
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[1].hand.length,2);
});

test('Trielle cannot pay with one multicolor card, or with a tapped third card',()=>{
 for(const ids of [[TRIELLE],[DARK,FIRE,BODY]]){
  const s=setup(),trielle=put(s,0,TRIELLE);
  give(s,0,'mana',ids);
  if(ids.length===3)s.players[0].mana[2].tapped=true;
  attack(s,trielle.uid);
  assert.equal(s.decision.type,'block');
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,ids.length===3?1:0);
  assert.equal(s.players[0].shields.length,5);
 }
});

test('Trielle only offers assignments that leave a distinct card for each remaining color',()=>{
 let s=setup();
 const trielle=put(s,0,TRIELLE),enemy=put(s,1,BODY,{tapped:true});
 give(s,0,'mana',[DARK,DUAL,BODY]);
 give(s,0,'shields',[BODY,SPARK]);give(s,1,'shields',[BODY,TRIELLE]);
 const [dark,dual,nature]=s.players[0].mana,ownShield=s.players[0].shields[1],enemyShield=s.players[1].shields[1];
 attack(s,trielle.uid,enemy.uid);
 assert.ok(values(s).includes(dark.uid));
 assert.ok(!values(s).includes(dual.uid));
 pick(s,dark.uid);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 s=JSON.parse(JSON.stringify(s));
 assert.ok(values(s).includes(dual.uid));
 pick(s,dual.uid);
 pick(s,nature.uid);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.equal(s.decision.player,0);
 pick(s,ownShield.uid);
 assert.equal(s.decision.player,1);
 assert.ok(has(s,0,'shields',ownShield));
 pick(s,enemyShield.uid);
 assert.ok(has(s,0,'mana',ownShield));
 assert.ok(has(s,1,'mana',enemyShield));
 assert.equal(s.players[1].mana.find(x=>x.uid===enemyShield.uid).tapped,true);
 assert.equal(s.players[0].mana.find(x=>x.uid===ownShield.uid).tapped,false);
 assert.ok(!s.triggers);
});

test('Trielle can decline the cost without tapping any selected mana',()=>{
 const s=setup(),trielle=put(s,0,TRIELLE);
 give(s,0,'mana',[DARK,FIRE,BODY]);
 attack(s,trielle.uid);
 pick(s,s.players[0].mana[0].uid);
 pick(s,null);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.deepEqual(s.players.map(p=>p.shields.length),[5,5]);
 assert.equal(s.decision.type,'block');
});

test('Giga Brand counts the regular draw and discards the opponent hand only after two draws',()=>{
 for(const extra of [false,true]){
  const s=setup();put(s,0,GIGA);give(s,1,'hand',[BODY]);
  end(s);
  assert.equal(s.active,1);
  assert.equal(s.players[1].drawsThisTurn,1);
  if(extra){s.phase='main';play(s,DRAW);assert.equal(s.players[1].drawsThisTurn,3);}
  const hand=s.players[1].hand.slice();
  end(s);
  assert.ok(hand.every(x=>has(s,1,extra?'grave':'hand',x)));
  assert.equal(s.players[1].hand.length,extra?0:2);
 }
});

test('Giga Brand ignores cards added from shields and watches the opponent on either turn',()=>{
 const s=setup(),giga=put(s,0,GIGA);
 give(s,1,'shields',[BODY,BODY]);
 const attacker=put(s,0,BODY);
 attack(s,attacker.uid);if(s.decision?.type==='block')act(s,'noBlock');
 for(let i=0;s.decision;i++){assert.ok(i<8);e.step(s,e.chooseAI(s));}
 assert.equal(s.players[1].drawsThisTurn||0,0);
 assert.equal(s.players[1].hand.length,1);
 end(s);
 assert.equal(s.players[1].hand.length,2);
 const t=setup(),source=put(t,0,GIGA),body=put(t,0,BODY);
 give(t,1,'shields',[DRAW_TRIGGER]);
 attack(t,body.uid);
 if(t.decision?.type==='block')act(t,'noBlock');
 act(t,'useTrigger');
 const draw=t.decision.choices.find(x=>x.label.includes('2枚引く'));
 assert.ok(draw);
 pick(t,draw.value);
 assert.equal(t.players[1].drawsThisTurn,2);
 assert.ok(t.players[1].hand.length>0);
 end(t);
 assert.equal(t.players[1].hand.length,1);
 assert.ok(has(s,0,'battle',giga)&&has(t,0,'battle',source));
});
