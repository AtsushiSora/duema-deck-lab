import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const ALICE='dmr11-010',CARNE='dm23bd6-009',PRIUS='promoy5-018';
const SMALL='dm01-108',TRIGGER='dm01-027',BLOCKER='dm01-001',SEED='dmsd20-016',SERAPH='dm26-038';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=rows=>rows.map(x=>x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const view=(s,uid)=>projectRoom({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{},{}],events:[],expiresAt:10000},{uid},1).game;
function move(s,p,x,to){
 s.phase='main';
 s.extTasks=[{op:'g34_ExactMove',p:1-p,source:TRIGGER,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
 act(s,'toAttack');drain(s);
}

test('Eight verified prints resolve to three original IDs and preserve their official images',()=>{
 const m=read('tools/support-phase-1247.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[ALICE,CARNE,PRIUS]);
 assert.deepEqual(m.printAliases.map(row=>[row.id,row.canonicalId]),[
  ['dmx22b-099',ALICE],['dmx25-014',ALICE],['dmex13-026',ALICE],['promoy13-046',ALICE],['dm24bd5-049',CARNE]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),face=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1247}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [face.cost,Number(face.powerText),face.race,face.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

for(const top of [0,1,2])test('Alice puts '+top+' of two selected cards on top and the rest on the bottom in order',()=>{
 let s=field();
 give(s,0,'deck',[SMALL,BLOCKER,TRIGGER,SMALL,SMALL]);
 const previous=add(s,0,'hand',SERAPH),alice=add(s,0,'hand',ALICE);
 const [first,second,third,...rest]=s.players[0].deck;
 play(s,alice);pick(s,true);
 assert.deepEqual(ids(s.players[0].hand),ids([previous,first,second,third]));
 pick(s,second.uid);
 assert.ok(s.players[0].hand.includes(second));
 assert.deepEqual(view(s,'b').actions,[]);
 assert.equal(view(s,'b').players[0].hand.length,0);
 pick(s,previous.uid);
 s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(choices(s),[0,1,2]);
 pick(s,top);
 const selected=[second,previous];
 assert.deepEqual(ids(s.players[0].deck),ids([...selected.slice(0,top),...rest,...selected.slice(top)]));
 assert.deepEqual(ids(s.players[0].hand),ids([first,third]));
});

test('Alice may decline the draw and loses before moving cards back when the library empties',()=>{
 for(const accepted of [false,true]){
  const s=field();give(s,0,'deck',[SMALL,TRIGGER,BLOCKER]);
  const start=ids(s.players[0].deck);
  play(s,add(s,0,'hand',ALICE));
  pick(s,accepted?true:null);
  assert.equal(s.winner,accepted?1:null);
  assert.deepEqual(ids(s.players[0].deck),accepted?[]:start);
  assert.equal(s.players[0].hand.length,accepted?3:0);
 }
});

test('Carne never sees its own summon, which consumes the first summon or cast for both players',()=>{
 const s=field(),x=add(s,0,'hand',CARNE),y=add(s,0,'hand',SMALL);
 play(s,x);
 assert.equal(s.decision,null);
 play(s,y);assert.equal(s.decision,null);
 end(s);s.phase='main';
 const first=add(s,1,'hand',SMALL);
 play(s,first);
 assert.equal(s.decision.player,0);
 const top=s.players[0].deck[0];
 pick(s,1);assert.ok(has(s,0,'hand',top));
 play(s,add(s,1,'hand',SMALL));assert.equal(s.decision,null);
});

test('Carne observes the first opponent shield-trigger cast or summon and distinct copies may decline',()=>{
 for(const trigger of [TRIGGER,'dm15-033']){
  const s=field(1);
  const attacker=add(s,1,'battle',SMALL);
  add(s,0,'battle',CARNE);add(s,1,'battle',CARNE);
  give(s,0,'shields',[trigger,SMALL]);
  attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===trigger);
  if(trigger===TRIGGER)act(s,'effect',a=>a.targets.some(t=>t.uid===attacker.uid));
  const before=s.players.map(p=>p.deck.length);
  for(const p of [1,0]){
   assert.equal(s.decision.player,p);
   assert.equal(s.decision.task.source,CARNE);
   pick(s,p===0?1:0);
  }
  assert.deepEqual(s.players.map(p=>p.deck.length),[before[0]-1,before[1]]);
 }
});

test('Carne ignores seed use and placements, and only destruction sends it to mana tapped',()=>{
 const s=field();
 const carne=add(s,0,'battle',CARNE),placed=add(s,0,'hand',SMALL);
 s.extTasks=[{op:'g34_Put',p:0,source:BLOCKER,origin:'hand',target:placed.uid}];
 act(s,'toAttack');assert.ok(has(s,0,'battle',placed));
 assert.equal(s.decision,null);
 s.phase='main';
 play(s,add(s,0,'hand',SEED));drain(s);
 play(s,add(s,0,'hand',SMALL));
 assert.equal(s.decision.task.source,CARNE);pick(s,0);
 move(s,0,carne,'hand');assert.ok(has(s,0,'hand',carne));
 const other=add(s,0,'battle',CARNE);
 move(s,0,other,'grave');assert.ok(has(s,0,'mana',other)&&other.tapped);
});

test('Prius privately inspects the full library, selects only an Arc Seraphim creature and shuffles the rest',()=>{
 const s=field();
 give(s,0,'deck',[SMALL,SERAPH,PRIUS,BLOCKER,TRIGGER]);
 const [first,multi,mono]=s.players[0].deck;
 play(s,add(s,0,'hand',PRIUS));
 assert.deepEqual(choices(s),[multi.uid,mono.uid,null]);
 assert.deepEqual(view(s,'a').inspectedCards.map(({id})=>id),[SMALL,SERAPH,PRIUS,BLOCKER,TRIGGER]);
 assert.equal(view(s,'b').inspectedCards,undefined);
 e.setRandomSource(()=>0);
 try{pick(s,multi.uid);}finally{e.setRandomSource(null);}
 assert.ok(has(s,0,'mana',multi)&&multi.tapped);
 assert.notEqual(s.players[0].deck[0].uid,first.uid);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Prius shuffles on a declined or fruitless search and honors a prohibition on looking or shuffling',()=>{
 for(const scenario of ['decline','empty','locked']){
  const s=field();
  give(s,0,'deck',[SMALL,scenario==='empty'?TRIGGER:SERAPH,BLOCKER]);
  const start=ids(s.players[0].deck),mana=s.players[0].mana.length;
  if(scenario==='locked')add(s,1,'battle','dmrp07-m01');
  e.setRandomSource(()=>0);
  try{
   play(s,add(s,0,'hand',PRIUS));
   if(scenario==='locked')assert.equal(s.decision,null);
   else{
    assert.deepEqual(choices(s),scenario==='empty'?[null]:[start[1],null]);
    pick(s,null);
   }
  }finally{e.setRandomSource(null);}
  assert.equal(s.players[0].mana.length,mana);
  if(scenario==='locked')assert.deepEqual(ids(s.players[0].deck),start);
  else assert.notDeepEqual(ids(s.players[0].deck),start);
 }
});
