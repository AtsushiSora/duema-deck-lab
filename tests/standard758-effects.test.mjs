import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-758.json',import.meta.url)));
const GALI='dm23-010',DOUR='dm23-020',CHOKU='promoy16-048';
const NATURE='dm01-108',FIRE='dm01-097',BLOCK='dm01-001',GATE='dm01-086',SURFER='dm05-024',SPARK='dm01-015',MULTI='dmex17-021';
function base(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);

test('three cards keep their original IDs, verified images and complete definitions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:758}));
  assert.throws(()=>standardCardSpec(detail,{phase:757}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:758}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(registry.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  assert.deepEqual(row.faces,original.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:758}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
 }
});

function breakToTrigger(s,p,attacker,trigger){
 give(s,1-p,'shields',[trigger]);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
}
const choice=(s)=>s.decision?.task?.op;

test('Galief can draw zero, one or two after the opposing trigger spell resolves',()=>{
 for(const count of [0,1,2]){
  let s=base();
  const attacker=put(s,0,'battle',NATURE),galief=put(s,0,'battle',GALI);
  const firstTwo=s.players[0].deck.slice(0,2);
  breakToTrigger(s,0,attacker,SPARK);
  act(s,'useTrigger');
  assert.equal(choice(s),'g34_DrawUpTo');
  assert.ok(galief.tapped);
  s=JSON.parse(JSON.stringify(s));
  for(let i=0;i<count;i++)pick(s,true);
  if(count<2)pick(s,null);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),firstTwo.slice(0,count).map(x=>x.uid));
 }
});

test('Dour resolves after an opposing trigger spell and ramps the actual top card or declines',()=>{
 for(const use of [false,true]){
  const s=base(),attacker=put(s,0,'battle',NATURE),dour=put(s,0,'battle',DOUR);
  give(s,0,'deck',[MULTI,...Array(8).fill(NATURE)]);
  const top=s.players[0].deck[0];
  breakToTrigger(s,0,attacker,GATE);
  act(s,'useTrigger');
  assert.equal(s.decision.type,'effect');
  act(s,'effect',a=>a.targets?.[0]?.uid===dour.uid);
  assert.ok(has(s,0,'hand',dour));
  assert.equal(choice(s),'g34_Offer');
  pick(s,use?true:null);
  assert.equal(has(s,0,'mana',top),use);
  assert.equal(has(s,0,'deck',top),!use);
  if(use)assert.ok(top.tapped);
 }
});

test('Dour offers ramp after an opposing trigger creature enters and before its entry effect',()=>{
 const s=base(),attacker=put(s,0,'battle',NATURE);
 put(s,0,'battle',DOUR);
 const top=s.players[0].deck[0];
 breakToTrigger(s,0,attacker,SURFER);
 act(s,'useTrigger');
 assert.ok(s.players[1].battle.some(x=>x.cardId===SURFER));
 assert.equal(choice(s),'g34_Offer');
 pick(s,true);
 assert.ok(has(s,0,'mana',top));
 assert.ok(s.decision?.player===1);
});

test('declined triggers, own triggers and normally played trigger cards do not activate either watcher',()=>{
 for(const id of [GALI,DOUR])for(const mode of ['declined','own','normal']){
  const s=base();
  put(s,0,'battle',id);
  const own=s.players[0],deck=own.deck.length,mana=own.mana.length;
  if(mode==='normal'){
   s.active=1;
   cast(s,SPARK);
  }else{
   const p=mode==='own'?1:0;
   s.active=p;
   const attacker=put(s,p,'battle',NATURE);
   breakToTrigger(s,p,attacker,SPARK);
   act(s,mode==='own'?'useTrigger':'skipTrigger');
  }
  drain(s);
  assert.equal(own.deck.length,deck,mode);
  assert.equal(own.mana.length,mana,mode);
 }
});

test('Chokushin pays the optional tap before blockers, survives saving and lets its ally attack again',()=>{
 let s=base();
 const attacker=put(s,0,'battle',NATURE),choku=put(s,0,'battle',CHOKU);
 const blocker=put(s,1,'battle',BLOCK);
 attack(s,attacker.uid);
 assert.equal(choice(s),'g34_TapToUntap748');
 assert.match(s.decision.title,/攻撃クリーチャー/);
 assert.ok(attacker.tapped&&!choku.tapped);
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 const get=x=>s.players[0].battle.find(y=>x.uid===y.uid);
 assert.ok(!get(attacker).tapped&&get(choku).tapped);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 act(s,'noBlock');
 drain(s);
 attack(s,attacker.uid);
 assert.notEqual(choice(s),'g34_TapToUntap748');
 assert.ok(get(attacker).tapped);
});

test('Chokushin can decline and never untaps itself or a rival attacker',()=>{
 for(const mode of ['decline','own','rival']){
  const s=base(),choku=put(s,0,'battle',CHOKU);
  const p=mode==='rival'?1:0;
  const attacker=mode==='own'?choku:put(s,p,'battle',NATURE);
  s.active=p;
  attack(s,attacker.uid);
  if(mode==='decline'){
   assert.equal(choice(s),'g34_TapToUntap748');
   pick(s,null);
  }else assert.notEqual(choice(s),'g34_TapToUntap748');
  assert.ok(attacker.tapped);
  assert.equal(choku.tapped,mode==='own');
 }
});
