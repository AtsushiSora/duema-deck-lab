import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-638.json',import.meta.url)));
const KID='dm26rp1-053',MILL='dm24rp3-066',AMON='dm26-002',REPRINT='dmc61-008';
const FIRE='dm01-097',NATURE='dm01-108',DARK='dm01-090',LIGHT='dm01-075';
const KUSHTOR='dm26rp3-056',SIRIUS='dm25bd2-007',GOOD='dm25rp3-S06';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 638 verifies the original prints and Amon reprint without duplicating deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:638}));
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
 const {currentPrint}=cards.find(c=>c.id===AMON);
 assert.equal(currentPrint.id,REPRINT);
 assert.ok(currentPrint.verification.facesMatched);
 assert.ok(!data.cards.some(c=>c.id===REPRINT));
});

test('Mirzam Kid Shield Plus adds a physical card to the chosen group, which breaks as one shield',()=>{
 let s=setup();
 s.active=1;
 give(s,1,'hand',[KID]);
 give(s,1,'mana',Array(3).fill(LIGHT));
 give(s,1,'deck',[FIRE,NATURE,NATURE]);
 give(s,0,'battle',[FIRE]);
 const added=s.players[1].deck[0],target=s.players[1].shields[1],before=physical(s);
 act(s,'play');
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 const group=s.players[1].shields.find(x=>x.uid===target.uid);
 const contents=[group,...(group.shieldStack||[])];
 assert.deepEqual(contents.map(x=>x.uid),[target.uid,added.uid]);
 assert.ok(!contents[1].faceUp);
 assert.equal(s.players[1].shields.length,5);
 s.active=0;
 s.phase='attack';
 act(s,'attack',a=>a.shield===target.uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,4);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid).sort(),[target.uid,added.uid].sort());
 assert.deepEqual(physical(s),before);
});

test('Mirzam Kid can decline Shield Plus and has no target when there are no shields',()=>{
 for(const empty of [false,true]){
  const s=setup();
  give(s,0,'hand',[KID]);
  give(s,0,'mana',Array(3).fill(LIGHT));
  if(empty)give(s,0,'shields',[]);
  const top=s.players[0].deck[0].uid;
  act(s,'play');
  if(empty)assert.deepEqual(s.decision.choices.map(valueOf),[null]);
  pick(s,null);
  assert.equal(s.players[0].deck[0].uid,top);
  assert.equal(s.players[0].shields.length,empty?0:5);
 }
});

test('Tenjarasu optionally mills the chosen creature cost even if the mandatory destruction leaves it in play',()=>{
 for(const [id,take] of [[FIRE,false],[FIRE,true],[KUSHTOR,true]]){
  let s=setup();
  give(s,0,'hand',[MILL]);
  give(s,0,'mana',Array(4).fill(DARK));
  give(s,0,'deck',Array(6).fill(NATURE));
  give(s,1,'battle',[id]);
  const [target]=s.players[1].battle,deck=s.players[0].deck.map(x=>x.uid),cost=e.card(id).cost;
  act(s,'play');
  pick(s,target.uid);
  assert.equal(s.players[1].battle.some(x=>x.uid===target.uid),id===KUSHTOR);
  assert.equal(s.decision.task.op,'g34_Mill');
  assert.equal(s.decision.task.n,cost);
  assert.equal(s.players[0].deck.length,deck.length);
  s=JSON.parse(JSON.stringify(s));
  pick(s,take?true:null);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck.slice(take?cost:0));
  assert.deepEqual(s.players[0].grave.filter(x=>x.cardId!==MILL).map(x=>x.uid),take?deck.slice(0,cost):[]);
 }
});

test('Tenjarasu skips milling without a target and can mill the whole deck for infinite cost',()=>{
 for(const id of [null,SIRIUS]){
  const s=setup();
  give(s,0,'hand',[MILL]);
  give(s,0,'mana',Array(4).fill(DARK));
  give(s,0,'deck',Array(6).fill(NATURE));
  give(s,1,'battle',id?[id]:[]);
  act(s,'play');
  if(id){
   pick(s,s.players[1].battle[0].uid);
   assert.equal(s.decision.task.n,'∞');
   pick(s,true);
   assert.equal(s.players[0].deck.length,0);
   assert.equal(s.winner,1);
  }else{
   assert.equal(s.decision,null);
   assert.equal(s.players[0].deck.length,6);
  }
 }
});

test('Variable Amon adds one break per source to allied multicolor creatures only',()=>{
 const s=setup();
 give(s,0,'hand',[AMON]);
 give(s,0,'mana',Array(7).fill(FIRE));
 give(s,0,'battle',[GOOD,FIRE,AMON]);
 give(s,1,'battle',[GOOD]);
 const [ally,mono,first]=s.players[0].battle,[enemy]=s.players[1].battle;
 act(s,'play');
 const second=s.players[0].battle.at(-1);
 const bonus=x=>e.effectiveCard(x,s).extraBreak??0;
 assert.equal(bonus(ally),2);
 assert.equal(bonus(mono),0);
 assert.equal(bonus(enemy),0);
 assert.equal(e.effectiveCard(first,s).breaker,2);
 assert.equal(bonus(first),0);
 second.g35Ignored=s.turn;
 assert.equal(bonus(ally),1);
 delete second.g35Ignored;
 s.players[0].battle.splice(s.players[0].battle.indexOf(second),1);
 s.players[0].hand.push(second);
 const target=s.players[1].shields.slice(1,4).map(x=>x.uid);
 attack(s,ally.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.join()===target.join());
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),target);
 assert.equal(s.players[1].shields.length,2);
});
