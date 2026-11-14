import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const FLAUM='dm23rp2-001',STEADY='dm23rp2-003',NOBLIS='dm23rp2-006';
const MECHA='dm23rp2-028',MECHA_SEED='dmrp22-048',SKY='dm23rp2-050';
const MONDO='dm23rp1-S3',MAGIC='dm23rp1-058',EVOLUTION='dmr23-002',TWIN='dm23rp2-013';
const ARMORED='dm23sd1-013',FIRE_SEED='dmsd21-014',FIRE='dm01-097',SMALL='dm01-108',TSU='dmrp22-030';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const put=(s,p,z,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

test('eleven verified prints resolve to three distinct supported cards',()=>{
 const manifest=read('support-phase-1206.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[FLAUM,STEADY,NOBLIS]);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dm23rp2-11B','dm23rp2x-001','dm23rp2x-11B','dm23rp2x-01X',
  'dm23rp2x-003','dm23rp2x-03X','dm23rp2x-006','dm23rp2x-06X']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1206}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1206}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function run(s,op,p,options={}){
 s.phase='main';
 s.extTasks=[{op,p,source:FLAUM,...options}];
 act(s,'toAttack');
}

const raidCards=s=>s.decision.choices.map(o=>o.value).filter(Boolean);
const pickFace=(s,x,face=0)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid&&s.decision.choices[a.choice].value.face===face);

for(const [id,bodies,extra] of [
 [FLAUM,[MECHA],SKY],
 [STEADY,[MONDO],TWIN],
 [NOBLIS,[FIRE,FIRE],FIRE_SEED]
]){
 test(id+' costs six only at its own battlefield threshold',()=>{
  const s=setup(),c=e.card(id);
  assert.equal(e.summonCost(s,0,c),9);
  for(const body of bodies)put(s,0,'battle',body,{tapped:true});
  put(s,1,'battle',extra);
  put(s,0,'grave',extra);
  const ownExtra=put(s,0,'battle',extra,{sealed:true});
  assert.equal(e.summonCost(s,0,c),9);
  ownExtra.sealed=false;
  assert.equal(e.summonCost(s,0,c),6);
  cast(s,id);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
  assert.equal(s.decision.task.op,'g34_DoubleRaidPick');
 });
 test(id+' triggers its W Mekraid only when summoned',()=>{
  const s=setup(),source=put(s,0,'hand',id),original=s.players[0].deck.map(x=>x.uid);
  run(s,'g34_Put',0,{origin:'hand',target:source.uid});
  assert.ok(has(s,0,'battle',source));
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),original);
 });
}

test('Flaum inspects six, lets the player choose zero, and bottoms the six in their chosen order',()=>{
 const s=setup();
 give(s,0,'deck',[MECHA,FLAUM,SMALL,SKY,MECHA_SEED,SMALL,MECHA]);
 const ids=s.players[0].deck.map(x=>x.uid);
 cast(s,FLAUM);
 assert.deepEqual(s.decision.task.ids,ids.slice(0,6));
 const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],decks:[{},{}],events:[],expiresAt:10000};
 const own=projectRoom(room,{uid:'a'},1).game,opponent=projectRoom(room,{uid:'b'},1).game;
 assert.deepEqual(own.inspectedCards.map(x=>x.id),[MECHA,FLAUM,SMALL,SKY,MECHA_SEED,SMALL]);
 assert.equal(opponent.inspectedCards,undefined);
 assert.deepEqual(opponent.actions,[]);
 assert.deepEqual(values(s),[ids[0],ids[3],ids[4],null]);
 pick(s,null);
 for(const uid of ids.slice(0,6).reverse().slice(0,-1))pick(s,uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[ids[6],...ids.slice(0,6).reverse()]);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.equal(s.players[0].battle.length,1);
});

test('Steady publicly commits both faces before casting in the chosen order (QA 45572 and 43077)',()=>{
 let s=setup();
 give(s,0,'deck',[MAGIC,MONDO,SMALL,STEADY,SMALL,SMALL,SMALL,SMALL,SMALL,SMALL]);
 const [body,twin,left,large,middle,right,...drawn]=s.players[0].deck;
 cast(s,STEADY);
 assert.deepEqual(raidCards(s).map(x=>[x.uid,x.face]),[[body.uid,0],[twin.uid,0],[twin.uid,1]]);
 pickFace(s,body);
 assert.equal(s.log.some(x=>x.type==='reveal'&&x.cardId===body.cardId),false);
 pickFace(s,twin,1);
 assert.equal(s.decision.task.op,'g34_DoubleRaidUse');
 assert.deepEqual(raidCards(s).map(x=>[x.uid,x.face]),[[body.uid,0],[twin.uid,1]]);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[body.cardId,twin.cardId]);
 assert.equal(s.players[0].battle.length,1);
 s=JSON.parse(JSON.stringify(s));
 pickFace(s,twin,1);
 assert.ok(has(s,0,'grave',twin));
 assert.ok(has(s,0,'battle',body));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),drawn.map(x=>x.uid));
 assert.equal(s.extraTurns?.[0]?.player,0);
 assert.equal(s.decision.task.op,'g34_Order');
 for(const x of [right,large,left])pick(s,x.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[right,large,left,middle].map(x=>x.uid));
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,9);
 assert.deepEqual(s.log.filter(x=>x.type==='gaiaSummon').map(x=>x.cardId),[twin.cardId,body.cardId]);
});

test('Steady can use the first summoned Magic as the second card’s evolution base',()=>{
 const s=setup();
 give(s,0,'deck',[MAGIC,EVOLUTION,SMALL,SMALL,SMALL,SMALL,SMALL,SMALL]);
 const [body,evolution]=s.players[0].deck;
 cast(s,STEADY);
 pickFace(s,evolution);
 assert.ok(values(s).includes(body.uid)&&!values(s).includes(evolution.uid));
 pickFace(s,body);
 const choices=raidCards(s);
 if(s.decision.task.op==='g34_DoubleRaidUse'&&choices.length>1)pickFace(s,body);
 assert.match(s.decision.title,/進化元/);
 pick(s,body.uid);
 drain(s);
 const x=s.players[0].battle.find(x=>x.uid===evolution.uid);
 assert.equal(x.under[0].uid,body.uid);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Noblis can use one of the available Armored faces and stop',()=>{
 const s=setup();
 give(s,0,'deck',[ARMORED,SKY,SMALL,SMALL,NOBLIS,SMALL,SMALL]);
 const [eligible,unused]=s.players[0].deck;
 cast(s,NOBLIS);
 assert.deepEqual(values(s),[eligible.uid,unused.uid,null]);
 pickFace(s,eligible);
 pick(s,null);
 assert.ok(has(s,0,'battle',eligible));
 assert.ok(!has(s,0,'battle',unused));
 assert.equal(s.decision.task.op,'g34_Order');
 drain(s);
 assert.ok(has(s,0,'deck',unused));
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Curve restricts W Mekraid to the published top card',()=>{
 const s=setup();
 put(s,1,'battle',TSU);
 give(s,0,'deck',[MECHA,SKY,MECHA_SEED,SMALL,SMALL,SMALL]);
 const [top,second]=s.players[0].deck;
 cast(s,FLAUM);
 assert.deepEqual(values(s),[top.uid,null]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.text.includes(e.card(MECHA).name)));
 pickFace(s,top);
 drain(s);
 assert.ok(has(s,0,'battle',top));
 assert.equal(s.players[0].deck[0].uid,second.uid);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

for(const active of [0,1]){
 test('Flaum untaps its own Mecha, including a Tamaseed, at the end of player '+active+'’s turn',()=>{
  const s=setup();
  s.active=active;
  const source=put(s,0,'battle',FLAUM,{tapped:true});
  const mecha=put(s,0,'battle',MECHA,{tapped:true});
  const seed=put(s,0,'battle',MECHA_SEED,{tapped:true});
  const other=put(s,0,'battle',SMALL,{tapped:true}),enemy=put(s,1,'battle',MECHA,{tapped:true});
  // Pause at a second end ability before the next turn's automatic untap.
  put(s,0,'battle','dm24ex1-015');
  s.players[0].mana=[inst(SMALL)];
  end(s);
  act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===FLAUM);
  assert.equal(s.active,active);
  assert.equal(source.tapped,false);
  assert.equal(mecha.tapped,false);
  assert.equal(seed.tapped,false);
  assert.equal(other.tapped,true);
  assert.equal(enemy.tapped,true);
 });
}

test('Steady protects friendly Magic from attacks and blocks until it leaves',()=>{
 const s=setup(),source=put(s,0,'battle',STEADY,{tapped:true});
 const magic=put(s,0,'battle',MAGIC,{tapped:true}),other=put(s,0,'battle',SMALL,{tapped:true});
 const enemy=put(s,1,'battle',SMALL),blocker=put(s,1,'battle',MECHA);
 s.active=1;
 s.phase='attack';
 const targets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===enemy.uid).map(a=>a.target);
 assert.ok(targets.includes(other.uid)&&!targets.includes(magic.uid)&&!targets.includes(source.uid));
 s.active=0;
 magic.tapped=false;
 attack(s,magic.uid);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid),false);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==source.uid);
 magic.tapped=false;
 attack(s,magic.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Noblis gives its side’s Armored +3000 only during battle and wins a battle through that bonus',()=>{
 const s=setup(),source=put(s,0,'battle',NOBLIS);
 const ally=put(s,0,'battle',ARMORED),normal=put(s,0,'battle',SMALL);
 const enemy=put(s,1,'battle',SKY,{tapped:true});
 assert.equal(e.power(ally,false,s),3000);
 assert.equal(e.matchupPower(source,enemy,true,s),13000);
 assert.equal(e.matchupPower(ally,enemy,true,s),6000);
 assert.equal(e.matchupPower(normal,enemy,true,s),e.card(SMALL).power);
 assert.equal(e.matchupPower(enemy,ally,false,s),5500);
 attack(s,ally.uid,enemy.uid);
 drain(s);
 assert.ok(has(s,0,'battle',ally));
 assert.ok(has(s,1,'grave',enemy));
});

test('All three W Mekraid creatures break exactly two shields on a player attack',()=>{
 for(const id of [FLAUM,STEADY,NOBLIS]){
  const s=setup(),source=put(s,0,'battle',id);
  attack(s,source.uid);
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('A copied summon-entry ability performs W Mekraid for the copying player (QA 49408)',()=>{
 const s=setup();
 give(s,0,'deck',[MECHA,SMALL,SMALL,SMALL,SMALL,SMALL,SMALL]);
 const host=put(s,0,'battle',SMALL);
 const entries=e.entryAbilities(s,0,FLAUM,{source:SMALL,uid:host.uid,jBig:true});
 assert.equal(entries.length,1);
 s.extTasks=[entries[0].task];
 act(s,'toAttack');
 assert.equal(s.decision.task.op,'g34_DoubleRaidPick');
 assert.equal(s.decision.player,0);
});
