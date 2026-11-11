import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const YURIA='dm10-023',IKARI='dmrp05-033',REPRINT='dmsd07-009',KARS='dm24-025';
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',WATER='dm01-083',LIGHT='dm01-075';
const HAND='dm01-027',SURFER='dm05-024',HANZAI='dmrp16-013',PLUS='dm28-074',EX_LIFE='dmrp17-s07',KID='dmrp21-010';
const WIND='dmr05-016',FUUJIN='dmrp22-037',WATCHDOG='dmrp14-087',DUAL='dmrp20-027',SEED='dmsd20-016';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const options=s=>e.getLegalActions(s);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function pick(s,x){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return (value?.uid??value)===x.uid;
 });
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function chooseTap(s,target){
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===IKARI);
 assert.equal(s.decision?.task?.op,'g34_Target');
 assert.equal(s.decision.source,IKARI);
 assert.ok(s.decision.choices.every(o=>o.value!==null));
 pick(s,target);
}

test('Phase 918 registers the three full definitions and preserves the alternate Ikari print identity',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-918.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[YURIA,IKARI,KARS]);
 assert.deepEqual(manifest.printAliases.map(c=>[c.id,c.canonicalId]),[[REPRINT,IKARI]]);
 for(const row of manifest.cards){
  const detail=details.cards.find(c=>c.id===row.id),card=e.card(row.id),[face]=row.faces;
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:918}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:918}));
  assert.deepEqual([card.type,card.cost,card.power,card.civilizations,card.race,card.manaValue,card.limit],
   ['creature',face.cost,Number(face.powerText),face.civilizations,face.race,1,4]);
  for(const source of [data,snapshot,details])
   assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
 }
 for(const row of [...manifest.cards,...manifest.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  const ref=refs.find(c=>c.id===row.id);
  assert.deepEqual([ref.canonicalId,ref.image],[row.canonicalId??row.id,row.image]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(cat.get(row.id).id,row.canonicalId??row.id);
 }
 const deck={id:'phase918',name:'シールドと文明',cards:[YURIA,REPRINT,KARS,NATURE,FIRE,DARK,WATER,LIGHT,HAND,SURFER]
  .map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Yuria must take one own shield, with optional trigger declarations for the entire stack',()=>{
 let s=field(1);
 const root=s.players[1].shields[0],trigger=inst(HAND),unused=inst(SURFER);
 root.shieldStack=[trigger,unused];
 const enemy=put(s,0,'battle',NATURE);
 play(s,YURIA);
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.every(o=>o.value&&o.cardId===undefined));
 const before=physical(s);
 const breaks=s.metrics[1].breaks;
 s=restore(s);
 pick(s,root);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.metrics[1].breaks,breaks);
 assert.ok(find(s,1,'hand',root));
 assert.equal(s.decision.type,'trigger');
 assert.equal(s.decision.uid,trigger.uid);
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 assert.equal(s.decision.uid,unused.uid);
 act(s,'skipTrigger');
 act(s,'effect',a=>a.targets.some(t=>t.uid===enemy.uid));
 assert.ok(find(s,0,'grave',enemy));
 assert.ok(find(s,1,'grave',trigger)&&find(s,1,'hand',unused));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,6);
 assert.deepEqual(physical(s),before);
});

test('Yuria ends its entry ability when it has no shield and only takes from its own zone',()=>{
 const s=field();
 give(s,0,'shields',[]);
 const y=play(s,YURIA);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,5);
 assert.ok(find(s,0,'battle',y));
});

test('Ikari triggers twice for two cards placed simultaneously, and can lock a creature already tapped',()=>{
 let s=field();
 put(s,0,'battle',IKARI);
 const first=put(s,1,'battle',DARK,{tapped:true}),second=put(s,1,'battle',FIRE);
 const shield=s.players[0].shields[0];
 play(s,HANZAI);
 assert.equal(s.decision.task.op,'g34_TappedShieldPick842');
 assert.equal(s.players[0].shields.length,7);
 pick(s,shield);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===IKARI).length,2);
 s=restore(s);
 chooseTap(s,first);
 chooseTap(s,second);
 assert.equal(s.decision,null);
 assert.ok(find(s,1,'battle',first).skipUntap);
 assert.ok(find(s,1,'battle',second).tapped);
 end(s);
 assert.equal(s.active,1);
 assert.ok(find(s,1,'battle',first).tapped&&find(s,1,'battle',second).tapped);
 assert.ok(!find(s,1,'battle',first).skipUntap);
 end(s);
 end(s);
 assert.equal(s.active,1);
 assert.ok(!find(s,1,'battle',first).tapped&&!find(s,1,'battle',second).tapped);
});

test('Ikari sees a card added to an existing shield and shares placement timing with another watcher',()=>{
 const s=field(),shield=s.players[0].shields[0];
 put(s,0,'battle',IKARI);
 put(s,0,'battle',WATCHDOG);
 const enemy=put(s,1,'battle',FIRE);
 const before=s.players[0].deck.length;
 play(s,PLUS);
 assert.equal(s.decision.task.op,'g71_Plus');
 pick(s,shield);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(shield.shieldStack.length,1);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===IKARI).length,1);
 chooseTap(s,enemy);
 drain(s);
 assert.ok(enemy.tapped);
 assert.equal(s.players[0].deck.length,before-2);
});

test('Ikari sees a seal moved to shields when that move unseals Ikari itself',()=>{
 const s=field(1),watcher=put(s,0,'battle',IKARI,{sealed:true});
 const seal=put(s,0,'seals',DARK,{faceDown:true,sealOf:watcher.uid});
 const enemy=put(s,1,'battle',FIRE);
 play(s,KID);
 pick(s,seal);
 assert.ok(!watcher.sealed);
 assert.ok(find(s,0,'shields',seal));
 chooseTap(s,enemy);
 assert.ok(enemy.tapped);
});

test('Only a surviving Ikari sees two simultaneous shield placements from the battle zone',()=>{
 const s=field(1),staying=put(s,0,'battle',IKARI);
 const leaving=put(s,0,'battle',IKARI,{powerModifiers:[{amount:-2000}]}),body=put(s,0,'battle',FIRE);
 const enemy=put(s,1,'battle','dm01-s08');
 play(s,WIND);
 assert.ok(find(s,0,'battle',staying));
 assert.ok(find(s,0,'shields',leaving)&&find(s,0,'shields',body));
 const entries=s.pendingEffects.filter(e=>e.source===IKARI);
 assert.deepEqual(entries.map(e=>e.uid),[staying.uid,staying.uid]);
 chooseTap(s,enemy);
 chooseTap(s,enemy);
 assert.ok(enemy.tapped&&enemy.skipUntap);
 assert.equal(s.decision,null);
});

test('Ikari does not trigger for a shield addition that was prevented or while abilities are ignored',()=>{
 for(const blocker of [FUUJIN,GEN]){
  const s=field(),enemy=put(s,1,'battle',FIRE);
  put(s,1,'battle',blocker);
  put(s,0,'battle',IKARI);
  play(s,EX_LIFE);
  drain(s);
  assert.ok(!enemy.tapped);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].shields.length,blocker===FUUJIN?5:6);
 }
});

test('Kars adds fire to allied darkness or nature on the battlefield and buffs other fire creatures',()=>{
 const s=field();
 const kars=put(s,0,'battle',KARS),dark=put(s,0,'battle',DARK),fire=put(s,0,'battle',FIRE);
 const water=put(s,0,'battle',WATER),dual=put(s,0,'battle',DUAL),enemy=put(s,1,'battle',DARK);
 const seed=put(s,0,'battle',SEED),hand=put(s,0,'hand',NATURE),other=s.players[0].mana.find(x=>x.cardId===NATURE);
 assert.deepEqual(e.zoneCard(s,0,hand,'hand').civilizations,undefined);
 assert.deepEqual(e.zoneCard(s,0,other,'mana').civilizations,undefined);
 const nature=play(s,NATURE);
 assert.deepEqual(e.effectiveCard(dark,s).civilizations,['闇','火']);
 assert.deepEqual(e.effectiveCard(nature,s).civilizations,['自然','火']);
 assert.deepEqual(e.effectiveCard(dual,s).civilizations,['光','闇','火']);
 assert.equal(e.effectiveCard(water,s).civ,'水');
 assert.equal(e.effectiveCard(enemy,s).civ,'闇');
 assert.equal(e.effectiveCard(seed,s).civ,e.card(SEED).civ);
 assert.equal(e.power(kars,false,s),2000);
 for(const x of [dark,nature,fire,dual])assert.equal(e.power(x,false,s),e.card(x).power+1000);
 for(const x of [water,enemy])assert.equal(e.power(x,false,s),e.card(x).power);
});

test('Kars bonuses from different copies stack and disappear when their sources leave or are muted',()=>{
 const s=field(),first=put(s,0,'battle',KARS),second=put(s,0,'battle',KARS),dark=put(s,0,'battle',DARK);
 assert.equal(e.power(first,false,s),3000);
 assert.equal(e.power(second,false,s),3000);
 assert.equal(e.power(dark,false,s),4000);
 s.active=1;
 play(s,SURFER);
 act(s,'effect',a=>a.targets.some(t=>t.uid===second.uid));
 assert.equal(e.power(first,false,s),2000);
 assert.equal(e.power(dark,false,s),3000);
 put(s,1,'battle',GEN);
 assert.equal(e.effectiveCard(dark,s).civ,'闇');
 assert.equal(e.power(dark,false,s),2000);
});
