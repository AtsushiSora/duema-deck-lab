import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {projectRoom} from '../server/duel-core.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot,PRESETS} from './target-fixture.mjs';

const VISION='dm22rp2-002',FINALE='dmrp20-011',JAW='dmrp15-028',DISPECTOR='dm23bd1-007';
const SKULL='dm32-s05',GALAXY='dm28-002',EVO='dm32-072',BASIC='dm01-108',DEMON='dm01-027',BOUNCE='dm01-086';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1332.json',import.meta.url)));
const registry=createCatalogue(snapshot,data.cards,details);
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const selected=s.decision.choices[a.choice].value;
 return (selected?.uid??selected)===value;
});

test('Vision and Skull Moon preserve their official definitions, six print IDs and four-copy limits',()=>{
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(c=>c.id),[VISION,SKULL]);
 assert.equal(manifest.printAliases.length,4);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),face=row.faces[0];
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual([c.name,c.cost,c.civilizations,c.manaValue,c.limit],[row.name,face.cost,face.civilizations,1,4]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Vision privately sees the top card and pays for a spell or a tamaseed during its controller’s turn',()=>{
 for(const topId of [DEMON,VISION,BASIC]){
  const s=setup(),vision=add(s,0,'battle',VISION);
  give(s,0,'deck',[topId,BASIC,BASIC]);
  const top=s.players[0].deck[0];
  add(s,1,'battle',BASIC);
  assert.equal(e.peekDeckTop(s,0)?.uid,top.uid);
  assert.equal(e.observation(s,1).players[0].deckTop,undefined);
  const actions=()=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.origin==='deck');
  assert.deepEqual(actions().map(a=>a.uid),topId===BASIC?[]:[top.uid]);
  if(topId!==BASIC){
   const {cost}=actions()[0];
   act(s,'play',a=>a.uid===top.uid&&a.origin==='deck');drain(s);
   assert.ok(s.players[0][topId===VISION?'battle':'grave'].some(x=>x.uid===top.uid));
   assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);
  }
  s.active=1;
  assert.equal(e.peekDeckTop(s,0),null);
  s.active=0;
  s.players[0].battle.forEach(x=>x.sealed=true);
  assert.equal(e.peekDeckTop(s,0),null);
  assert.ok(vision.sealed);
 }
});

test('Original Finale uses Attack Chance from the top of the deck with Vision (QA 42506)',()=>{
 let s=setup();
 const attacker=add(s,0,'battle',DISPECTOR);
 add(s,0,'battle',VISION);
 give(s,0,'deck',[FINALE,...Array(9).fill(BASIC)]);
 const finale=s.players[0].deck[0];
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'g34_Chance417');
 assert.equal(s.decision.task.origin,'deck');
 const room={phase:'playing',revision:1,expiresAt:2000,profiles:[{uid:'host',name:'Host'},{uid:'guest',name:'Guest'}],
  hostUid:'host',guestUid:'guest',decks:PRESETS.slice(0,2),game:s,events:[]};
 assert.equal(projectRoom(room,{uid:'host'},0).game.players[0].deckTop.id,FINALE);
 assert.ok(!JSON.stringify(projectRoom(room,{uid:'guest'},0)).includes(FINALE));
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);drain(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===finale.uid));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.ok(s.log.some(x=>x.type==='gaiaSummon'&&x.cardId===FINALE&&x.text.includes('アタック・チャンス')));
});

test('Vision cannot use a hand-only Oni End from the deck and may decline Attack Chance',()=>{
 for(const topId of [JAW,FINALE]){
  const s=setup();
  const attacker=add(s,0,'battle',DISPECTOR);
  add(s,0,'battle',VISION);
  s.players[0].shields=[];
  give(s,0,'deck',[topId,...Array(9).fill(BASIC)]);
  const top=s.players[0].deck[0];
  attack(s,attacker.uid);
  if(topId===FINALE){
   assert.equal(s.decision.task.op,'g34_Chance417');
   pick(s,null);
  }else assert.notEqual(s.decision?.task?.op,'g34_Chance417');
  drain(s);
  assert.ok(s.players[0].deck.some(x=>x.uid===top.uid));
  assert.equal(s.metrics[0].played[topId],undefined);
 }
});

test('Skull Moon evolves only over an evolution creature',()=>{
 const s=setup(),moon=add(s,0,'hand',SKULL);
 add(s,0,'battle',BASIC);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===moon.uid&&a.kind==='play'));
 const base=add(s,0,'battle',EVO);
 act(s,'play',a=>a.uid===moon.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle.find(x=>x.uid===moon.uid)?.under[0].uid,base.uid);
 assert.equal(e.effectiveCard(moon,s).breaker,3);
});

test('Skull Moon destroys Shield Force Galaxy in its place without a second replacement (QA 35832)',()=>{
 let s=setup();
 const galaxy=add(s,0,'battle',GALAXY,{g35ShieldForce:s.players[0].shields[0].uid});
 const moon=add(s,1,'battle',SKULL),shield=s.players[0].shields[0];
 assert.ok(e.effectiveCard(galaxy,s).g1304ShieldForceActive);
 cast(s,DEMON);
 act(s,'effect',a=>a.targets[0].uid===moon.uid);
 assert.equal(s.decision.player,1);
 s=JSON.parse(JSON.stringify(s));
 act(s,'replaceSkullMoon1332',a=>a.uid===galaxy.uid);drain(s);
 assert.ok(s.players[1].battle.some(x=>x.uid===moon.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===galaxy.uid));
 assert.ok(s.players[0].shields.some(x=>x.uid===shield.uid));
});

test('Skull Moon can decline destruction replacement and cannot redirect a move to hand',()=>{
 for(const [spell,zone] of [[DEMON,'grave'],[BOUNCE,'hand']]){
  const s=setup(),moon=add(s,1,'battle',SKULL),ally=add(s,0,'battle',BASIC);
  cast(s,spell);
  act(s,'effect',a=>a.targets[0].uid===moon.uid);
  if(zone==='grave')act(s,'allowLeave');
  drain(s);
  assert.ok(s.players[0].battle.includes(ally));
  assert.ok(s.players[1][zone].includes(moon));
 }
});
