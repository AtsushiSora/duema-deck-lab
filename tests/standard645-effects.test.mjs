import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-645.json',import.meta.url)));
const FUMENDA='dm24rp4-066',DEVIL='dmrp18-041',DURIKEN='dmrp06-021',SIMONE='dmrp03-041',FUSSI='dmr13-027';
const STRONG='dm01-059',KIRYU='dmrp19-027',BIMNAM='dmrp18-042',APUL='dmrp22-042';
const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const end=s=>{act(s,'endTurn');drain(s);};
function loseBattle(s,p,x,y){
 s.active=p;
 y.tapped=true;
 attack(s,x.uid,y.uid);
 drain(s);
}
function assertGrave(s,p,x){assert.ok(s.players[p].grave.some(y=>y.uid===x.uid));}

test('Phase 645 verifies five original cards and one reprint with stable deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(cards.length,5);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:645}));
  assert.throws(()=>standardCardSpec(detail,{phase:644}));
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
 const [reprint]=printAliases;
 assert.equal(printAliases.length,1);
 assert.ok(reprint.verification.facesMatched);
 assert.equal(reprint.canonicalId,FUMENDA);
 assert.ok(!data.cards.some(c=>c.id===reprint.id));
 assert.deepEqual(standardCardSpec({...reprint,status:'complete'},{phase:645}),cards.find(c=>c.id===FUMENDA).spec);
});

for(const id of [DEVIL,DURIKEN,SIMONE,FUSSI])test(id+' returns only after being destroyed on its own turn',()=>{
 for(const ownTurn of [true,false]){
  let s=setup();
  give(s,0,'battle',[id]);
  give(s,1,'battle',[STRONG]);
  const [body]=s.players[0].battle,[enemy]=s.players[1].battle,before=physical(s);
  loseBattle(s,ownTurn?0:1,ownTurn?body:enemy,ownTurn?enemy:body);
  assertGrave(s,0,body);
  assert.equal(!!s.g537Delays?.some(d=>d.uid===body.uid),ownTurn);
  s=JSON.parse(JSON.stringify(s));
  end(s);
  assert.equal(s.players[0].battle.some(x=>x.uid===body.uid),ownTurn);
  assert.deepEqual(physical(s),before);
 }
});

test('Fumenda cannot attack and returns at the end of either players turn',()=>{
 for(const active of [0,1]){
  const s=setup();
  give(s,0,'battle',[FUMENDA]);
  const [body]=s.players[0].battle;
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid));
  if(active===1){
   give(s,1,'battle',[STRONG]);
   loseBattle(s,1,s.players[1].battle[0],body);
  }else{
   s.extTasks=[{op:'g34_Target',p:0,source:FUMENDA,owner:'self',to:'grave'}];
   s.phase='main';
   act(s,'toAttack');
   drain(s);
  }
  assertGrave(s,0,body);
  end(s);
  assert.ok(s.players[0].battle.some(x=>x.uid===body.uid));
 }
});

test('Simone mills two cards on entry and mills the next two when it returns',()=>{
 const s=setup();
 give(s,0,'hand',[SIMONE]);
 give(s,1,'battle',[STRONG]);
 const [simone]=s.players[0].hand,top=s.players[0].deck.slice(0,4).map(x=>x.uid);
 act(s,'play');
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),top.slice(0,2));
 simone.entered=0;
 loseBattle(s,0,simone,s.players[1].battle[0]);
 end(s);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),top);
});

test('Devil Sasage discounts one mana and returns on the same turn',()=>{
 const s=setup();
 give(s,0,'hand',[KIRYU]);
 give(s,0,'battle',[DEVIL]);
 const [devil]=s.players[0].battle;
 act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(devil.uid));
 drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(KIRYU).cost-1);
 assertGrave(s,0,devil);
 s.phase='attack';
 end(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===devil.uid));
});

test('Devil destroyed by Bimnam after returning is not returned a second time',()=>{
 const s=setup();
 give(s,0,'battle',[DEVIL]);
 give(s,1,'battle',[STRONG,BIMNAM]);
 const [devil]=s.players[0].battle,[enemy,bimnam]=s.players[1].battle;
 loseBattle(s,0,devil,enemy);
 assertGrave(s,0,devil);
 const serial=devil.zoneSerial;
 end(s);
 assertGrave(s,0,devil);
 assert.equal(devil.zoneSerial,serial+2);
 assert.ok(s.players[1].battle.some(x=>x.uid===bimnam.uid));
 assert.ok(!s.g537Delays?.some(d=>d.uid===devil.uid));
});

test('Fussissi stays in the grave when movement from the grave is prohibited',()=>{
 const s=setup();
 give(s,0,'battle',[FUSSI]);
 give(s,1,'battle',[STRONG,APUL]);
 const [fussi]=s.players[0].battle;
 loseBattle(s,0,fussi,s.players[1].battle[0]);
 assertGrave(s,0,fussi);
 end(s);
 assertGrave(s,0,fussi);
 assert.ok(!s.g537Delays?.some(d=>d.uid===fussi.uid));
});
