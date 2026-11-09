import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-709.json',import.meta.url)));

test('Phase 709 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:709}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:709}));
 }
});

const CRAWLER='dm24rp3-017',WORM='dm06-026',SHELL='dm06-037',SURVIVOR='dm05-054';
const BODY='dm01-108',SPELL='dm01-027',ATTACKER='dm01-s01';
const LOW=data.cards.find(c=>c.type==='creature'&&c.cost===1&&!c.effect&&!c.evolution&&!c.g34Tasks&&c.race==='ライトブリンガー').id;
const put=(s,p,id)=>{
 const x=inst(id);
 s.players[p].battle.push(x);
 return x;
};
const field=()=>{
 const s=setup();
 s.active=0;
 return s;
};
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===(v?.uid??v);
});
const choices=s=>s.decision.choices.filter(c=>c.value).map(c=>c.cardId);
const uids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('two verified reprints reuse the original battle definitions and restrictions',()=>{
 assert.equal(printAliases.length,2);
 for(const print of printAliases){
  const original=cards.find(c=>c.id===print.canonicalId);
  assert.equal(print.name,original.name);
  assert.ok(print.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:709}),original.spec);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[original.id]);
  assert.ok(!data.cards.some(c=>c.id===print.id));
 }
});

test('Crawler can resolve or decline Yobinion on summon after restoring the decision',()=>{
 for(const use of [true,false]){
  let s=field();
  give(s,0,'deck',[SPELL,CRAWLER,LOW,BODY,BODY]);
  const original=s.players[0].deck.map(x=>x.uid),hit=s.players[0].deck[2];
  const crawler=play(s,CRAWLER);
  const before=uids(s);
  assert.equal(s.decision.task.op,'g19Yobi');
  s=JSON.parse(JSON.stringify(s));
  pick(s,use?true:null);
  drain(s);
  assert.ok(s.players[0].battle.some(x=>x.uid===crawler.uid));
  assert.equal(s.players[0].battle.some(x=>x.uid===hit.uid),use);
  if(!use)assert.deepEqual(s.players[0].deck.map(x=>x.uid),original);
  assert.deepEqual(uids(s),before);
 }
});

test('Crawler put into battle without summoning has no Yobinion trigger',()=>{
 const s=field(),x=inst(CRAWLER);
 give(s,0,'deck',[LOW,BODY,BODY,BODY]);
 const deck=s.players[0].deck.map(y=>y.uid);
 s.players[0].hand.push(x);
 s.extTasks=[{op:'putCreature',p:0,source:BODY,origin:'hand',uid:x.uid}];
 act(s,'toAttack');
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),deck);
});

test('Crawler blocks and can choose hand or grave when destroyed in battle',()=>{
 for(const use of [true,false]){
  let s=field();
  const a=put(s,0,ATTACKER),x=put(s,1,CRAWLER),before=uids(s);
  attack(s,a.uid);
  act(s,'block',v=>v.uid===x.uid);
  assert.equal(s.decision.type,'leaveReplace');
  assert.equal(s.decision.player,1);
  s=JSON.parse(JSON.stringify(s));
  act(s,use?'replaceOmega':'allowLeave');
  drain(s);
  assert.ok(s.players[1][use?'hand':'grave'].some(y=>y.uid===x.uid));
  assert.equal(s.players[1].shields.length,5);
  assert.deepEqual(uids(s),before);
 }
});

test('Worm grants its optional grave recovery to other friendly Survivors only',()=>{
 for(const entering of [WORM,SURVIVOR,BODY]){
  const s=field();
  if(entering!==WORM)put(s,0,WORM);
  put(s,1,WORM);
  give(s,0,'grave',[BODY,SURVIVOR,SHELL]);
  give(s,1,'grave',[SURVIVOR]);
  const mine=s.players[0].grave[2];
  play(s,entering);
  if(entering===BODY){
   assert.equal(s.decision,null);
   continue;
  }
  assert.deepEqual(choices(s),[SURVIVOR,SHELL]);
  assert.equal(s.decision.player,0);
  pick(s,mine);
  assert.ok(s.players[0].hand.some(y=>y.uid===mine.uid));
  assert.equal(s.players[1].grave.length,1);
 }
});

test('two Worms offer independent recoveries even after a source leaves',()=>{
 const s=field(),first=put(s,0,WORM);
 put(s,0,WORM);
 give(s,0,'grave',[SURVIVOR]);
 const target=s.players[0].grave[0];
 play(s,SURVIVOR);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===WORM).length,2);
 s.players[0].grave.push(s.players[0].battle.shift());
 assert.ok(s.players[0].grave.includes(first));
 act(s,'orderEffect');
 pick(s,null);
 pick(s,target);
 assert.ok(s.players[0].hand.some(y=>y.uid===target.uid));
});

test('Shell searches on its own entry and grants the same search to another friendly Survivor',()=>{
 for(const entering of [SHELL,SURVIVOR]){
  const s=field();
  if(entering===SURVIVOR)put(s,0,SHELL);
  give(s,0,'deck',[BODY,SURVIVOR,WORM,SPELL,BODY]);
  const hit=s.players[0].deck[2],before=s.rng;
  play(s,entering);
  assert.equal(s.decision.task.op,'g34_LookPick');
  assert.deepEqual(choices(s),[SURVIVOR,WORM]);
  pick(s,hit);
  assert.ok(s.players[0].hand.some(x=>x.uid===hit.uid));
  assert.notEqual(s.rng,before);
  assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[WORM]);
 }
});

test('Shell can decline a match and still shuffles, but a library lock stops the search',()=>{
 const s=field();
 give(s,0,'deck',[BODY,SURVIVOR,WORM,SPELL,BODY]);
 const before=s.rng;
 play(s,SHELL);
 pick(s,null);
 assert.equal(s.players[0].hand.length,0);
 assert.notEqual(s.rng,before);
 const t=field();
 put(t,1,'dmrp07-m01');
 give(t,0,'deck',[SURVIVOR,WORM,SPELL]);
 const untouched=t.players[0].deck.map(x=>x.uid),rng=t.rng;
 play(t,SHELL);
 assert.equal(t.decision,null);
 assert.deepEqual(t.players[0].deck.map(x=>x.uid),untouched);
 assert.equal(t.rng,rng);
});
