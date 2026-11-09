import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-690.json',import.meta.url)));

test('Phase 690 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:690}));
  assert.throws(()=>standardCardSpec(detail,{phase:689}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:690}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const EYE='dm07-025',BALL='dm03-025',SCOUT='dm11-042',QX='dmrp07-m01';
const SMALL='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',SECRET='dmrp02-s10';
const field=(p=0)=>Object.assign(setup(),{active:p});
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const peek=s=>s.decision?.task?.g585Peek?.map(x=>x.id);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('Stinger Ball reprint verifies to its original identity',()=>{
 const {printAliases:[row]}=JSON.parse(readFileSync(new URL('../tools/support-phase-690.json',import.meta.url)));
 assert.equal(row.id,'dmc27-025');
 assert.equal(row.canonicalId,BALL);
 assert.ok(row.verification.facesMatched);
 assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[BALL]);
 assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:690}),cards.find(x=>x.id===BALL).spec);
 assert.ok(!data.cards.some(x=>x.id===row.id));
});

for(const id of [EYE,BALL])test('Attacker chooses one opposing shield to inspect privately, then the original attack resumes '+id,()=>{
 let s=field();
 give(s,0,'battle',[id]);
 give(s,1,'shields',[SMALL,SECRET,LIGHT]);
 s.players[1].shields[1].shieldStack=[inst(FIRE)];
 const groups=structuredClone(s.players[1].shields),selected=groups[1].uid;
 attack(s);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[...groups.map(x=>x.uid),null]);
 assert.ok(s.decision.choices.slice(0,3).every(x=>!x.cardId));
 s=JSON.parse(JSON.stringify(s));
 pick(s,selected);
 assert.deepEqual(peek(s),[SECRET,FIRE]);
 assert.deepEqual(s.players[1].shields,groups);
 const look=s.log.find(x=>x.type==='look');
 assert.equal(look.cardId,id);
 assert.ok(!look.text.includes(e.card(SECRET).name));
 assert.ok(!JSON.stringify(e.observation(s,1).decision).includes(SECRET));
 pick(s,null);
 noBlock(s);
 assert.equal(s.players[1].shields.length,2);
 assert.ok(s.players[1].shields.some(x=>x.uid===selected));
});

for(const id of [EYE,BALL])test('Attacker may decline the look and can still battle without an opposing shield '+id,()=>{
 for(const decline of [true,false]){
  const s=field();
  give(s,0,'battle',[id]);
  give(s,1,'battle',[SMALL]);
  if(!decline)give(s,1,'shields',[]);
  const enemy=s.players[1].battle[0];
  enemy.tapped=true;
  attack(s,s.players[0].battle[0].uid,enemy.uid);
  if(decline)pick(s,null);
  noBlock(s);
  assert.ok(s.players[0].grave.some(x=>x.cardId===id));
  assert.equal(s.players[1].shields.length,decline?5:0);
  assert.ok(!s.log.some(x=>x.type==='look'));
 }
});

for(const p of [0,1])test('Time Scout privately looks at the opposing top card and preserves both library orders '+p,()=>{
 let s=field(p);
 give(s,p,'deck',[SMALL,LIGHT]);
 give(s,1-p,'deck',[SECRET,FIRE,LIGHT]);
 give(s,1-p,'battle',[QX]);
 const decks=structuredClone(s.players.map(x=>x.deck)),rng=s.rng;
 play(s,SCOUT);
 assert.equal(s.decision.player,p);
 assert.deepEqual(peek(s),[SECRET]);
 assert.equal(s.decision.task.g585Peek[0].label,'相手の山札の上');
 s=JSON.parse(JSON.stringify(s));
 pick(s,null);
 assert.deepEqual(s.players.map(x=>x.deck),decks);
 assert.equal(s.rng,rng);
 assert.ok(!s.log.some(x=>x.type==='reveal'||x.cardId===SECRET));
 assert.equal(s.decision,null);
});

test('Time Scout has no choice when the opposing library is empty',()=>{
 const s=field();
 give(s,1,'deck',[]);
 play(s,SCOUT);
 assert.equal(s.decision,null);
 assert.ok(!s.log.some(x=>x.type==='look'));
});

test('Online inspection sends and renders the private card for the viewing seat only',async()=>{
 const s=field();
 give(s,1,'deck',[SECRET,FIRE]);
 play(s,SCOUT);
 const {projectRoom}=await import('../server/duel-core.mjs');
 const {onlineScreenHTML}=await import('../dist/online-ui.js');
 const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],events:[],expiresAt:10000};
 const viewer={uid:'a'},other={uid:'b'};
 const seen=projectRoom(room,viewer,1),hidden=projectRoom(room,other,1);
 assert.deepEqual(seen.game.inspectedCards,[{id:SECRET,label:'相手の山札の上',name:e.card(SECRET).name}]);
 assert.ok(!JSON.stringify(hidden).includes(SECRET));
 assert.equal(projectRoom(room,viewer,10000).game.inspectedCards,undefined);
 const render=(room,user)=>onlineScreenHTML({room,connected:true},{user,actionsOpen:true});
 assert.ok(render(seen,viewer).includes(e.card(SECRET).name));
 assert.ok(!render(hidden,other).includes(e.card(SECRET).name));
 pick(s,null);
 assert.equal(projectRoom(room,viewer,1).game.inspectedCards,undefined);
});
