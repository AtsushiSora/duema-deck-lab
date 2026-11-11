import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PAT='dmrp02-075',CURRY='dmx22b-013',TORA='dmx08-019';
const NATURE='dm01-108',BIG='dmr04-011',DESTROY='dm01-027',BOUNCE='dm01-086';
const SWEEP='dm38-013',SMALL_SWEEP='dmr05-064',JUDGE='dmr05-009',ENTRY_JUDGE='dmr06-032';
const REPEATED='dmr08-004',CHARGER='dm22ex1-030',SEAL='dmex12-035',AIRVO='dmrp08-037';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choiceUid=c=>c.value?.uid??c.value;
const pick=(s,uid)=>act(s,'extended',a=>choiceUid(s.decision.choices[a.choice])===uid);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 969 verifies three canonical cards and both print aliases',()=>{
 const m=read('tools/support-phase-969.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PAT,CURRY,TORA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmx26-031',CURRY],['promoy11-019',TORA]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:969}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:968}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:969}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-969');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(catalogue.resolveRows([{id,count:1},{id:canonicalId,count:1}]),[{id:canonicalId,count:2}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:969}),m.cards.find(row=>row.id===canonicalId).spec);
 }
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(s.decision,null);
}

function stats(s,x,power,extra){
 const current=s.players.flatMap(p=>p.battle).find(y=>y.uid===x.uid);
 assert.ok(current);
 assert.equal(e.power(current,false,s),power);
 assert.equal(e.effectiveCard(current,s).extraBreak??0,extra);
}

function judge(s,x,win=true){
 give(s,s.active,'deck',[win?BIG:NATURE,...Array(8).fill(NATURE)]);
 give(s,1-s.active,'deck',[win?NATURE:BIG,...Array(8).fill(NATURE)]);
 attack(s,x.uid);
}

function decideUntap(s,yes){
 assert.equal(s.decision.source,TORA);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,yes?true:null);
}

test('Pachin gains both bonuses per simultaneous ally destruction, breaks three shields and expires',()=>{
 let s=field(),x=put(s,0,'battle',PAT);
 const allies=[0,1].map(()=>put(s,0,'battle',NATURE,{powerModifiers:[{amount:-1000}]}));
 const enemy=put(s,1,'battle',NATURE,{powerModifiers:[{amount:-1000}]});
 const before=physical(s);
 cast(s,SMALL_SWEEP);
 assert.ok(allies.every(y=>inZone(s,0,'grave',y)));
 assert.ok(inZone(s,1,'grave',enemy));
 assert.equal(s.decision.type,'effectOrder');
 s=restore(s);
 act(s,'orderEffect');
 stats(s,x,12000,2);
 attack(s,x.uid);finishAttack(s);
 assert.equal(s.players[1].shields.length,2);
 act(s,'endTurn');
 stats(s,x,4000,0);
 assert.equal(physical(s).length,before.length+1);
});

test('Pachin ignores bounces, opposing destruction and itself in the same batch',()=>{
 const s=field(),x=put(s,0,'battle',PAT),ally=put(s,0,'battle',NATURE),enemy=put(s,1,'battle',NATURE);
 cast(s,BOUNCE);act(s,'effect',a=>a.targets.some(t=>t.uid===ally.uid));
 cast(s,DESTROY);act(s,'effect',a=>a.targets.some(t=>t.uid===enemy.uid));
 stats(s,x,4000,0);
 const second=put(s,0,'battle',NATURE);
 cast(s,SWEEP);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,0,'grave',second));
 assert.ok(!s.pendingEffects?.some(row=>row.source===PAT));
 assert.ok(!s.extLimits?.some(row=>row.source===PAT));
 assert.equal(s.decision,null);
});

test('Pachin watches on the opposing turn and resolved bonuses survive ability suppression',()=>{
 const s=field(1),x=put(s,0,'battle',PAT),ally=put(s,0,'battle',NATURE);
 cast(s,DESTROY);act(s,'effect',a=>a.targets.some(t=>t.uid===ally.uid));
 x.g35Ignored=s.turn;
 stats(s,x,8000,1);
 const next=put(s,0,'battle',NATURE);
 cast(s,DESTROY);act(s,'effect',a=>a.targets.some(t=>t.uid===next.uid));
 stats(s,x,8000,1);
});

test('Pachin keeps resolved bonuses after a seal is removed in the same turn',()=>{
 const s=field(1),x=put(s,0,'battle',PAT),ally=put(s,0,'battle',NATURE);
 cast(s,DESTROY);act(s,'effect',a=>a.targets.some(t=>t.uid===ally.uid));
 cast(s,SEAL);pick(s,x.uid);
 assert.equal(x.sealed,true);
 const [seal]=s.players[0].seals;
 cast(s,AIRVO);pick(s,seal.uid);
 assert.ok(!x.sealed);
 stats(s,x,8000,1);
});

test('Curry boosts only its other allied Curry creatures and active copies stack',()=>{
 const s=field(),x=put(s,0,'battle',CURRY),other=put(s,0,'battle',CURRY),third=put(s,0,'battle',CURRY);
 const enemy=put(s,1,'battle',CURRY),nonCurry=put(s,0,'battle',NATURE);
 stats(s,x,9000,2);stats(s,enemy,3000,0);stats(s,nonCurry,e.card(NATURE).power,0);
 third.sealed=true;other.g35Ignored=s.turn;
 stats(s,x,3000,0);stats(s,other,6000,1);
 x.g35Ignored=s.turn;
 stats(s,other,3000,0);
});

test('Curry actually breaks three shields with two allies and the bonus falls when an ally leaves',()=>{
 const s=field(),x=put(s,0,'battle',CURRY),ally=put(s,0,'battle',CURRY);
 put(s,0,'battle',CURRY);
 attack(s,x.uid);finishAttack(s);
 assert.equal(s.players[1].shields.length,2);
 s.phase='main';
 cast(s,BOUNCE);act(s,'effect',a=>a.targets.some(t=>t.uid===ally.uid));
 stats(s,x,6000,1);
});

for(const yes of [true,false])test('Toramaru may untap the current attacker after a single judge '+yes,()=>{
 let s=field(),x=put(s,0,'battle',JUDGE),source=put(s,0,'battle',TORA,{tapped:true});
 judge(s,x);s=restore(s);
 decideUntap(s,yes);finishAttack(s);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,!yes);
 assert.equal(s.players[0].battle.find(y=>y.uid===source.uid).tapped,true);
});

test('Toramaru ignores a loss and offers once on the first win, even when declined',()=>{
 const s=field(),attackers=[0,1,2].map(()=>put(s,0,'battle',JUDGE));
 put(s,0,'battle',TORA);
 judge(s,attackers[0],false);finishAttack(s);
 judge(s,attackers[1]);decideUntap(s,false);finishAttack(s);
 judge(s,attackers[2]);finishAttack(s);
 assert.ok(attackers.every(x=>x.tapped));
});

test('Toramaru entering after the first judge win cannot use the next win in that turn',()=>{
 let s=field(),x=put(s,0,'battle',JUDGE);
 cast(s,ENTRY_JUDGE);
 assert.match(s.log.find(row=>row.type==='judgeResult')?.text,/勝ち/);
 s=restore(s);
 cast(s,TORA);
 judge(s,x);finishAttack(s);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,true);
});

test('Toramaru waits until repeated judge shield breaks are resolved',()=>{
 let s=field(),x=put(s,0,'battle',REPEATED);
 put(s,0,'battle',TORA);
 judge(s,x);
 assert.equal(s.decision.type,'judgeContinue');
 act(s,'judgeAgain');s=restore(s);
 assert.equal(s.judge.wins,2);
 act(s,'stopJudge');assert.equal(s.decision.type,'judgeBreak');
 act(s,'judgeBreak');assert.equal(s.decision.type,'judgeBreak');
 act(s,'judgeBreak');decideUntap(s,true);finishAttack(s);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,false);
});

test('Toramaru cannot trigger through suppression or for an opposing attacker',()=>{
 const s=field(),foe=put(s,1,'battle',TORA);
 put(s,0,'battle',TORA,{g35Ignored:s.turn});
 const x=put(s,0,'battle',JUDGE);
 judge(s,x);pick(s,foe.uid);finishAttack(s);
 assert.equal(x.tapped,true);
});

test('A Charger win outside an attack consumes the first win until the next turn',()=>{
 const s=field(),first=put(s,0,'battle',JUDGE),next=put(s,1,'battle','dmr05-084');
 put(s,0,'battle',TORA);put(s,1,'battle',TORA);
 const spell=put(s,0,'hand',CHARGER);
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 assert.ok(inZone(s,0,'mana',spell));
 const firstTurn=s.turn;
 judge(s,first);pick(s,s.players[1].battle.find(y=>y.cardId===TORA).uid);finishAttack(s);
 assert.equal(first.tapped,true);
 put(s,1,'battle',TORA);
 act(s,'endTurn');
 assert.ok(s.turn>firstTurn);
 judge(s,next);
 assert.equal(s.decision.source,'dmr05-084');
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 decideUntap(s,true);
 finishAttack(s);
 assert.equal(next.tapped,false);
});

test('Toramaru cannot untap an attacker that has already returned to hand',()=>{
 const s=field(),x=put(s,0,'battle','dmr05-049');
 put(s,0,'battle',TORA);
 judge(s,x);
 assert.equal(s.decision.source,x.cardId);
 pick(s,x.uid);
 assert.ok(inZone(s,0,'hand',x));
 assert.equal(s.attack,null);
 assert.equal(s.decision,null);
});
