import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-694.json',import.meta.url)));

test('Phase 694 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:694}));
  assert.throws(()=>standardCardSpec(detail,{phase:693}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:694}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const ARM='dm08-055',POLARIS='dm13-021',BEETLE='dm10-034',CHEEKY='dm06-072';
const SMALL='dm28-063',BODY='dm01-108',GEAR='dm14-110',METEO='dm01-060',END='dmrp19-095';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id,tapped=false)=>{const x=inst(id);x.tapped=tapped;s.players[p].battle.push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>(s.decision?.choices||[]).map(x=>x.value?.uid??x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const endTurn=s=>{s.phase='attack';act(s,'endTurn');};
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Both Arm reprints resolve to the original definition with identical rules and limits',()=>{
 const {printAliases}=JSON.parse(readFileSync(new URL('../tools/support-phase-694.json',import.meta.url)));
 assert.deepEqual(printAliases.map(x=>x.id),['dmc39-033','dmc42-086']);
 for(const row of printAliases){
  assert.equal(row.canonicalId,ARM);
  assert.ok(row.verification.facesMatched);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[ARM]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:694}),cards.find(x=>x.id===ARM).spec);
  assert.ok(!data.cards.some(x=>x.id===row.id));
 }
});

for(const owner of [0,1])test('Arm triggers once per other creature from either side and expires at turn end '+owner,()=>{
 const s=field(owner),source=play(s,ARM);
 assert.equal(e.power(source,false,s),1000);
 play(s,GEAR);
 assert.equal(e.power(source,false,s),1000);
 play(s,BODY);
 play(s,SMALL);
 assert.equal(e.power(source,false,s),7000);
 endTurn(s);
 assert.equal(e.power(source,false,s),1000);
 play(s,BODY);
 assert.equal(e.power(source,false,s),4000);
 endTurn(s);
 assert.equal(e.power(source,false,s),1000);
});

test('Meteosaurus can destroy the opposing Arm before its power increase (QA 35133)',()=>{
 const s=field(),source=put(s,1,ARM);
 play(s,METEO);
 assert.equal(e.power(source,false,s),1000);
 pick(s,source.uid);
 assert.ok(has(s,1,'grave',source));
 assert.equal(s.decision,null);
});

for(const id of [POLARIS,BODY])test('Polaris strengthens the attacked creature and that modifier persists through save and turn change '+id,()=>{
 let s=field(),attacker=put(s,0,BODY),target=put(s,1,id,true);
 if(id!==POLARIS)put(s,1,POLARIS);
 attack(s,attacker.uid,target.uid);
 noBlock(s);
 assert.ok(has(s,0,'grave',attacker));
 assert.equal(e.power(target,false,s),4000);
 s=JSON.parse(JSON.stringify(s));
 const restored=s.players[1].battle.find(x=>x.uid===target.uid);
 endTurn(s);
 assert.equal(e.power(restored,false,s),4000);
});

test('Polaris strengthens the initially attacked ally even when a different ally blocks',()=>{
 const s=field(),attacker=put(s,0,BODY),target=put(s,1,BODY,true),blocker=put(s,1,CHEEKY);
 put(s,1,POLARIS);
 attack(s,attacker.uid,target.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(e.power(target,false,s),4000);
 assert.equal(e.power(blocker,false,s),1000);
});

for(const discard of [true,false])test('Beetle offers a discard to the defender, then boosts only the attacked creature until end '+discard,()=>{
 let s=field(),attacker=put(s,0,BODY),target=put(s,1,BEETLE,true),unrelated=put(s,1,BODY);
 attacker.powerModifiers=[{amount:3000}];
 give(s,1,'hand',[SMALL,BODY]);
 const cost=s.players[1].hand[1];
 attack(s,attacker.uid,target.uid);
 assert.equal(s.decision.player,1);
 assert.equal(e.power(target,false,s),4000);
 assert.deepEqual(values(s),[...s.players[1].hand.map(x=>x.uid),null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,discard?cost.uid:null);
 const unit=s.players[1].battle.find(x=>x.uid===target.uid);
 assert.equal(e.power(unit,false,s),discard?7000:4000);
 assert.equal(e.power(unrelated,false,s),2000);
 assert.equal(has(s,1,'grave',cost),discard);
 noBlock(s);
 assert.equal(has(s,1,'battle',target),discard);
 if(discard){
  endTurn(s);
  assert.equal(e.power(unit,false,s),4000);
 }
});

test('No defender buff triggers from a player attack even if Cheeky blocks it',()=>{
 const s=field(),a=put(s,0,BODY),b=put(s,1,CHEEKY);
 put(s,1,POLARIS);
 put(s,1,BEETLE);
 give(s,1,'hand',[BODY]);
 attack(s,a.uid);
 assert.equal(s.decision.type,'block');
 act(s,'block',q=>q.uid===b.uid);
 assert.equal(e.power(b,false,s),1000);
 assert.equal(s.players[1].hand.length,1);
 assert.ok(a.tapped&&b.tapped&&has(s,0,'battle',a)&&has(s,1,'battle',b));
 assert.equal(s.players[1].shields.length,5);
 assert.ok(!s.log.some(x=>x.type==='battle'));
});

test('Cheeky cancels the battle but the attack end still resolves',()=>{
 const s=field(),attacker=put(s,0,END),blocker=put(s,1,CHEEKY);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(has(s,1,'battle',blocker)&&blocker.tapped);
 assert.ok(!s.log.some(x=>x.type==='battle'));
 assert.equal(s.players[1].shields.length,5);
});

test('Cheeky cannot attack, and battling it as the original tapped target does not cancel the battle',()=>{
 const s=field(1),a=put(s,0,BODY),b=put(s,1,CHEEKY,true);
 s.phase='attack';
 b.tapped=false;
 assert.ok(!e.getLegalActions(s).some(q=>q.kind==='attack'&&q.uid===b.uid));
 s.active=0;
 b.tapped=true;
 attack(s,a.uid,b.uid);
 noBlock(s);
 assert.ok(has(s,1,'grave',b));
 assert.ok(has(s,0,'battle',a));
});

test('Sealing and unsealing a boosted Arm removes its temporary modifier (QA 37778)',()=>{
 const s=field(),source=put(s,0,ARM);
 play(s,BODY);
 assert.equal(e.power(source,false,s),4000);
 s.extTasks=[
  {op:'g35_Custom',p:0,source:ARM,uid:source.uid,name:'sealSelf',n:1},
  {op:'g35_Custom',p:0,source:ARM,uid:source.uid,name:'skullUnseal'}
 ];
 act(s,'toAttack');
 assert.equal(s.players[0].seals.length,0);
 assert.ok(has(s,0,'battle',source));
 assert.equal(e.power(source,false,s),1000);
});
