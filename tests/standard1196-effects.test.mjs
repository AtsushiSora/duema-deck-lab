import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PANZER='dmrp02-010',DAIKIRI='dm24rp1-016',CAPTAIN='dmsd20-010';
const NATURE='dm01-108',DARK='dm01-090',BIG='dm01-s01',SEED='dmsd20-016';
const CAST='dm01-085',SWEEP='dmx06-010',EX_LIFE='dmrp17-s11';
const put=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const battleCount=s=>s.log.filter(row=>row.type==='battle').length;
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choose=(s,pred)=>act(s,'extended',a=>pred(s.decision.choices[a.choice].value));
const field=(active=0)=>Object.assign(setup(),{active});
const targets=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);

function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function fight(s,p,ally,rival){
 s.phase='main';
 s.extTasks=[{op:'g34_Fight240',p,source:'dmrp19-011'}];
 act(s,'toAttack');
 choose(s,v=>v?.uid===ally.uid);
 choose(s,v=>v?.uid===rival.uid);
}
function drawOffer(s,value){
 assert.equal(s.decision?.task?.op,'g34_Offer');
 assert.equal(s.decision.task.source,DAIKIRI);
 choose(s,v=>value?v===true:!v);
}

test('verified prints resolve to three distinct registered names, with two aliases and their artwork',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1196.json');
 const references=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[PANZER,DAIKIRI,CAPTAIN]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dm24ex3-013',DAIKIRI],['dmrp21-042',CAPTAIN]
 ]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const official=row.canonicalId?{...row,status:'complete'}:details.cards.find(x=>x.id===id);
  assert.deepEqual(official.faces,row.faces);
  assert.deepEqual(standardCardSpec(official,{phase:1196}),row.spec);
  const bad=structuredClone(official);
  bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1196}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([live.type,live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   ['creature',face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(references.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

for(const evolved of [false,true])test('Panzer can be summoned normally or evolve on a Nature creature '+evolved,()=>{
 const s=field(),base=put(s,0,'battle',NATURE),invalid=put(s,0,'battle',DARK);
 const x=play(s,PANZER);
 const choices=e.getLegalActions(s).filter(a=>a.kind==='evolve');
 assert.ok(choices.some(a=>a.baseUid===base.uid));
 assert.ok(!choices.some(a=>a.baseUid===invalid.uid));
 act(s,'evolve',a=>evolved?a.baseUid===base.uid:!a.baseUid);
 assert.equal(e.isEvolution(x),evolved);
 assert.equal(x.under?.[0]?.uid,evolved?base.uid:undefined);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,3);
});

for(const [evolved,accept] of [[false,false],[true,false],[true,true]])test('Panzer forced attack and optional NEO battle replacement '+evolved+'/'+accept,()=>{
 let s=field(1);
 const panzer=put(s,0,'battle',PANZER);
 const base=inst(NATURE);
 if(evolved)panzer.under=[base];
 put(s,0,'battle',NATURE,{tapped:true});
 const rival=put(s,1,'battle',BIG);
 s.phase='attack';
 assert.ok(targets(s,rival).includes('player'));
 panzer.tapped=true;
 assert.deepEqual(targets(s,rival),[panzer.uid]);
 attack(s,rival.uid,panzer.uid);
 act(s,'noBlock');
 if(evolved){
  assert.equal(s.decision.task.op,'g393SG_Battle');
  assert.equal(s.decision.player,0);
  s=structuredClone(s);
  choose(s,v=>accept?v?.kind==='moveBoth':!v);
 }
 if(accept){
  assert.ok(has(s,0,'mana',panzer)&&has(s,0,'mana',base)&&has(s,1,'mana',rival));
  assert.equal(battleCount(s),0);
 }else{
  assert.ok(has(s,0,'grave',panzer)&&has(s,1,'battle',rival));
  assert.equal(battleCount(s),1);
 }
});

test('Panzer effect battle puts both stacks into their owners’ mana without EX Life replacing the move',()=>{
 const s=field(),base=inst(NATURE),panzer=put(s,0,'battle',PANZER,{under:[base]});
 s.active=1;
 const rival=play(s,EX_LIFE);
 drain(s);
 assert.ok(rival.exLifeShieldUid);
 rival.cardOwner=0;
 s.active=0;
 const shields=s.players[1].shields.length,before=physical(s);
 fight(s,0,panzer,rival);
 choose(s,v=>v?.kind==='moveBoth');
 assert.ok(has(s,0,'mana',panzer)&&has(s,0,'mana',base)&&has(s,0,'mana',rival));
 assert.equal(s.players[1].shields.length,shields);
 assert.equal(battleCount(s),0);
 assert.deepEqual(physical(s),before);
});

test('Panzer does not offer a mana replacement when a combatant cannot leave',()=>{
 const s=field(),panzer=put(s,0,'battle',PANZER,{under:[inst(NATURE)]});
 const rival=put(s,1,'battle',BIG,{g26Stay:s.turn});
 fight(s,0,panzer,rival);
 assert.equal(s.decision,null);
 assert.equal(battleCount(s),1);
 assert.ok(has(s,0,'grave',panzer)&&has(s,1,'battle',rival));
});

test('Daikiri sees its own entry, can decline it and use a cast for the same once-per-turn draw',()=>{
 const s=field();
 const rival=put(s,1,'battle',NATURE);
 play(s,DAIKIRI);
 drawOffer(s,false);
 const deck=s.players[0].deck.length;
 play(s,CAST);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===rival.uid));
 drawOffer(s,true);
 assert.equal(s.players[0].deck.length,deck-1);
 play(s,NATURE);
 assert.equal(s.decision,null);
 play(s,CAST);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===rival.uid));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,deck-1);
});

test('Daikiri sees a Tamaseed on either turn and shares usage with spells in the opposite order',()=>{
 const s=field(),watcher=put(s,0,'battle',DAIKIRI);
 const rival=put(s,1,'battle',NATURE);
 play(s,CAST);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===rival.uid));
 const deck=s.players[0].deck.length;
 drawOffer(s,false);
 // A Tamaseed entry and its own ability are ordered separately.
 play(s,SEED);
 if(s.decision.type==='effectOrder')act(s,'orderEffect',a=>a.uid===watcher.uid);
 drawOffer(s,true);
 assert.equal(s.players[0].hand.length,1);
 drain(s);
 assert.equal(s.players[0].deck.length,deck-1);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,1);
 play(s,NATURE);
 assert.equal(s.decision,null);
 give(s,0,'shields',[CAPTAIN]);
 const attacker=put(s,1,'battle',BIG);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 drawOffer(s,true);
 assert.equal(s.players[0].hand.length,2);
});

test('simultaneous destruction uses Daikiri before it leaves and returns only tapped creatures to their owners',()=>{
 const s=field(1),source=put(s,0,'battle',DAIKIRI),tapped=put(s,0,'battle',NATURE,{tapped:true,cardOwner:1});
 const untapped=put(s,0,'battle',NATURE),other=put(s,1,'battle',NATURE,{tapped:true});
 const spell=put(s,1,'hand',SWEEP);
 const before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',source)&&has(s,0,'grave',untapped)&&has(s,1,'grave',other));
 assert.ok(has(s,1,'hand',tapped));
 assert.deepEqual(physical(s),before);
});

for(const destination of ['hand','mana'])test('tapped Caddy can use its own replacement or Daikiri’s '+destination,()=>{
 const s=field(1),source=put(s,0,'battle',DAIKIRI),caddy=put(s,0,'battle','dm22rp1-049',{tapped:true});
 play(s,SWEEP);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.player,0);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='replaceOmega'));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='replaceYamata'));
 act(s,destination==='hand'?'replaceOmega':'replaceYamata');
 assert.ok(has(s,0,destination,caddy)&&has(s,0,'grave',source));
 assert.equal(s.decision,null);
});

test('tapped Daikiri returns itself after losing a battle, while a mana move stays a mana move',()=>{
 const s=field(1),watcher=put(s,0,'battle',DAIKIRI,{tapped:true});
 const attacker=put(s,1,'battle',BIG);
 attack(s,attacker.uid,watcher.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'hand',watcher));
 const next=put(s,0,'battle',DAIKIRI,{tapped:true}),panzer=put(s,1,'battle',PANZER,{under:[inst(NATURE)]});
 fight(s,1,panzer,next);
 choose(s,v=>v?.kind==='moveBoth');
 assert.ok(has(s,0,'mana',next));
});

test('Captain enters tapped from a shield and forces the next legal attack',()=>{
 const s=field(1),attacker=put(s,1,'battle',NATURE),next=put(s,1,'battle',NATURE);
 give(s,0,'mana',[]);
 give(s,0,'shields',[CAPTAIN]);
 const shield=s.players[0].shields[0],before=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 const captain=s.players[0].battle.find(x=>x.uid===shield.uid);
 assert.ok(captain?.tapped);
 assert.equal(s.decision,null);
 assert.equal(s.metrics[0].triggers,1);
 assert.deepEqual(targets(s,next),[captain.uid]);
 assert.deepEqual(physical(s),before);
});

test('Captain gains 4000 power and a second break only while an own face-up Tamaseed is in play',()=>{
 const s=field(),captain=play(s,CAPTAIN);
 const seed=put(s,0,'battle',SEED),other=put(s,1,'battle',SEED);
 const stats=()=>[e.power(captain,false,s),e.effectiveCard(captain,s).breaker??1];
 assert.equal(captain.tapped,true);
 assert.deepEqual(stats(),[6000,2]);
 // A Tamaseed used as an evolution source loses its characteristics (QA41071).
 const evolved=put(s,0,'battle',PANZER);
 evolved.under=s.players[0].battle.splice(s.players[0].battle.indexOf(seed),1);
 assert.deepEqual(stats(),[2000,1]);
 other.faceDown=true;
 const hidden=put(s,0,'battle',SEED,{faceDown:true});
 assert.deepEqual(stats(),[2000,1]);
 hidden.faceDown=false;
 captain.tapped=false;
 const shields=s.players[1].shields.length;
 captain.entered=0;
 attack(s,captain.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,shields-2);
});
