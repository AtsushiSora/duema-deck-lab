import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-670.json',import.meta.url)));

test('Phase 670 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:670}));
  assert.throws(()=>standardCardSpec(detail,{phase:669}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:670}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
   deck.cards[0].count--;
   deck.cards.at(-1).count++;
   assert.deepEqual(e.validateDeck(deck),[row.name+'は1枚までです']);
  }
 }
});

const LIGHT='dmr09-017',BAKU='dmr09-020',MASTER='dmr09-035';
const NAT='dm01-108',WATER='dm01-083',GUARD='dmr09-070',ZERO='dmr10-016',MILK='dm26rp2-033',STAR='dm26rp1-048';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('Sacred Light lets the opponent choose two non-evolved creatures and adds separate face-down shields',()=>{
 let s=setup();
 give(s,0,'hand',[LIGHT]);
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[STAR,NAT,WATER,MILK]);
 const [evo,first,second,third]=s.players[1].battle;
 evo.under=[inst(WATER)];
 const n=s.players[1].shields.length;
 play(s,LIGHT);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[first.uid,second.uid,third.uid]);
 pick(s,third.uid);
 s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(values(s),[first.uid,second.uid]);
 pick(s,second.uid);
 assert.equal(s.players[1].shields.length,n+2);
 for(const uid of [second.uid,third.uid]){
  assert.ok(s.players[1].shields.some(x=>x.uid===uid&&!x.faceUp&&!x.shieldStack?.length));
 }
 assert.ok(has(s.players[1].battle,evo.uid)&&has(s.players[1].battle,first.uid));
 assert.equal(s.players[0].battle.length,1);
});

for(const n of [0,1])test('Sacred Light selects every available eligible creature when fewer than two remain: '+n,()=>{
 const s=setup();
 give(s,0,'hand',[LIGHT]);
 give(s,1,'battle',[STAR,...(n?[NAT]:[])]);
 s.players[1].battle[0].under=[inst(WATER)];
 play(s,LIGHT);
 if(s.decision)pick(s,s.players[1].battle[1].uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,5+n);
 assert.equal(s.players[1].battle.length,1);
});

for(const mode of ['return','decline','replace'])test('Bakubaku offers another ally before resolving enemy bounce: '+mode,()=>{
 const s=setup();
 give(s,0,'hand',[BAKU]);
 give(s,0,'battle',[mode==='replace'?'dmrp18-km3':NAT]);
 give(s,1,'battle',[NAT,MILK]);
 const [ally]=s.players[0].battle,[ordinary,milk]=s.players[1].battle;
 const life=s.players[0].shields[0];
 if(mode==='replace')ally.exLifeShieldUid=life.uid;
 play(s,BAKU);
 assert.deepEqual(values(s),[ally.uid,null]);
 pick(s,mode==='decline'?null:ally.uid);
 if(mode!=='decline'){
  if(s.decision?.type==='leave')act(s,'replaceEx');
  assert.equal(s.decision?.task?.op,'g34_Target');
  assert.deepEqual(values(s),[milk.uid]);
  pick(s,milk.uid);
 }
 assert.equal(has(s.players[0].hand,ally.uid),mode==='return');
 assert.equal(has(s.players[0].battle,ally.uid),mode!=='return');
 assert.equal(has(s.players[1].hand,milk.uid),mode!=='decline');
 assert.ok(has(s.players[1].battle,ordinary.uid));
 if(mode==='replace')assert.ok(has(s.players[0].grave,life.uid));
});

for(const zone of ['hand','mana','decline'])test('Sakuramau Master optionally puts one Guardman from either allowed zone into battle: '+zone,()=>{
 let s=setup();
 give(s,0,'battle',[MASTER]);
 give(s,0,'hand',[GUARD,NAT]);
 const [hand]=s.players[0].hand;
 const mana={...inst(ZERO),tapped:true},hidden={...inst(GUARD),faceDown:true};
 s.players[0].mana.push(mana,hidden);
 give(s,1,'shields',[NAT,NAT]);
 const [master]=s.players[0].battle;
 attack(s,master.uid);
 assert.deepEqual(values(s),[hand.uid,mana.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,zone==='hand'?hand.uid:zone==='mana'?mana.uid:null);
 noBlock(s);
 assert.equal(s.players[0].battle.length,zone==='decline'?1:2);
 assert.equal(has(s.players[0].hand,hand.uid),zone!=='hand');
 assert.equal(has(s.players[0].mana,mana.uid),zone!=='mana');
 assert.ok(has(s.players[0].mana,hidden.uid));
 assert.equal(s.players[1].shields.length,0);
 if(zone==='mana')assert.equal(s.players[0].battle.find(x=>x.uid===mana.uid).tapped,false);
});
