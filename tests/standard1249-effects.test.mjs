import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const CORAL='dmrp05-018',DUCK='dmsd13-019',DARTS='dm36-028';
const FIRE='dm01-108',WATER='dm01-083',TWIN='dm23bd7-003',LOW_DRAGON='dm22-018';
const OTHER_CORAL='dmex18-018',FACELESS='dmr19-s02',ALLY='dmrp11-040',SEED='dmsd20-016';
const DEFENDER='dm01-001',FATHER='dmr02-005',HAND_GUARD='dmbd04-003';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(FIRE));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const values=s=>s.decision.choices.map(o=>o.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const chooseCard=(s,x,face)=>act(s,'extended',a=>{
 const v=values(s)[a.choice];
 return (v?.uid??v)===x.uid&&(face===undefined||v.face===face);
});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function play(s,id){const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;}
const room=s=>({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{},{}],events:[],expiresAt:10000});

test('Five official prints resolve to three IDs with the verified faces, limits and images',()=>{
 const manifest=read('tools/support-phase-1249.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[CORAL,DUCK,DARTS]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex09-008',CORAL],['dmrp11-077',DUCK]]);
 assert.equal(catalogue.get(OTHER_CORAL).id,OTHER_CORAL);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),face=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1249}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [face.cost,Number(face.powerText),face.race,face.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Coral draws first, offers a water face whose cost is exactly the seven-card hand and casts it for free (QA31720)',()=>{
 const s=field();
 give(s,0,'hand',[TWIN,DEFENDER,WATER,CORAL]);
 const [twin,light,small,tooCostly]=s.players[0].hand;
 play(s,CORAL);
 assert.equal(s.players[0].hand.length,7);
 assert.deepEqual(values(s),[
  {uid:twin.uid,face:1,origin:'hand'},{uid:small.uid,face:0,origin:'hand'},null
 ]);
 const tapped=s.players[0].mana.filter(x=>x.tapped).length;
 chooseCard(s,twin,1);drain(s);
 assert.ok(has(s,0,'grave',twin));
 assert.ok(has(s,0,'hand',light)&&has(s,0,'hand',tooCostly));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
});

test('Coral can play a creature, decline to play, or lose to an empty deck before choosing',()=>{
 for(const scenario of ['summon','decline','deck']){
  const s=field(),x=add(s,0,'hand',WATER);
  if(scenario==='deck')give(s,0,'deck',[FIRE,FIRE,FIRE]);
  play(s,CORAL);
  if(scenario==='deck'){
   assert.equal(s.winner,1);
   assert.ok(has(s,0,'hand',x));
  }else{
   const tapped=s.players[0].mana.filter(x=>x.tapped).length;
   if(scenario==='summon')chooseCard(s,x,0);else choose(s,null);
   assert.ok(has(s,0,scenario==='summon'?'battle':'hand',x));
   assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
  }
 }
});

test('Duck can return only another allied Joker creature and targets up to 6000 current power',()=>{
 const s=field(),x=add(s,0,'battle',DUCK),ally=add(s,0,'battle',ALLY);
 add(s,0,'battle',SEED);add(s,0,'battle',FIRE);
 const exact=add(s,1,'battle',LOW_DRAGON),strong=add(s,1,'battle',FIRE,{powerModifiers:[{amount:5000}]});
 add(s,1,'battle',DUCK);
 attack(s,x.uid);
 assert.deepEqual(values(s).map(v=>v?.uid??v),[ally.uid,null]);
 chooseCard(s,ally);
 assert.ok(has(s,0,'hand',ally));
 assert.ok(values(s).some(v=>v.uid===exact.uid));
 assert.ok(!values(s).some(v=>v.uid===strong.uid));
 chooseCard(s,exact);drain(s);
 assert.ok(has(s,1,'hand',exact));
});

test('Duck may decline, skips the effect without an ally, and still bounces after an ally stays (QA32321)',()=>{
 for(const scenario of ['decline','no ally','stays']){
  const s=field(),x=add(s,0,'battle',DUCK),victim=add(s,1,'battle',FIRE);
  give(s,1,'shields',[FIRE,FIRE]);
  const ally=scenario==='no ally'?null:add(s,0,'battle',ALLY);
  if(scenario==='stays')add(s,0,'battle',FACELESS);
  attack(s,x.uid);
  if(scenario==='stays'){
   chooseCard(s,ally);assert.ok(has(s,0,'battle',ally));
   chooseCard(s,victim);assert.ok(has(s,1,'hand',victim));
  }else{
   if(scenario==='decline')choose(s,null);
   assert.ok(has(s,1,'battle',victim));
  }
 }
});

test('Darts chooses a numbered hidden slot and draws for a match, but not for a miss or empty hand',()=>{
 for(const scenario of ['match','miss','empty']){
  let s=field();
  give(s,1,'hand',scenario==='empty'?[]:[DEFENDER,WATER]);
  const target=s.players[1].hand[1];
  play(s,DARTS);
  assert.equal(s.decision.task.op,'g9Number');
  const before=s.players[0].deck.length;
  choose(s,scenario==='match'?2:0);
  if(target){
   assert.deepEqual(s.decision.choices.map(x=>[x.value,x.cardId]),[[0,undefined],[1,undefined]]);
   const publicView=projectRoom(room(s),{uid:'a'},1).game;
   assert.ok(publicView.actions.every(x=>x.label.startsWith('裏向きの手札 ')));
   assert.deepEqual(publicView.players[1].hand,[]);
   s=JSON.parse(JSON.stringify(s));
   choose(s,1);
   assert.ok(has(s,1,'grave',target));
  }
  assert.equal(s.players[0].deck.length,before-Number(scenario==='match'));
 }
});

test('Darts compares only the selected twinpact face and uses the declared integer from the shared number choice',()=>{
 for(const cost of [7,10]){
  const s=field();give(s,1,'hand',[TWIN]);play(s,DARTS);choose(s,7);choose(s,0);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[10,7]);
  choose(s,cost);
  assert.equal(s.players[0].hand.length,Number(cost===7));
 }
 const s=field();give(s,1,'hand',[WATER]);play(s,DARTS);
 const template=e.getLegalActions(s).find(a=>a.number===0);
 e.step(s,{...template,number:27});choose(s,0);
 assert.match(s.log.find(l=>l.type==='declare').text,/27/);
 assert.equal(s.players[0].hand.length,0);
});

test('Darts never draws when the chosen discard is replaced or prevented',()=>{
 const s=field(),x=add(s,1,'hand',FATHER);
 play(s,DARTS);choose(s,e.card(x).cost);choose(s,0);drain(s);
 assert.ok(has(s,1,'mana',x));
 assert.equal(s.players[0].hand.length,0);

 const t=field(),y=add(t,1,'hand',WATER);add(t,1,'battle',HAND_GUARD);
 play(t,DARTS);choose(t,e.card(y).cost);drain(t);
 assert.ok(has(t,1,'hand',y));
 assert.equal(t.players[0].hand.length,0);
});
