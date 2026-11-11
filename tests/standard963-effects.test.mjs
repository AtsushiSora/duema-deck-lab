import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TWIN='dm22ex1-113',BARGANTIS='dm19-018',CHAOS='dm02-027',BANJO='dmc34-017';
const PALM='dm09-032',WAVE='dm11-024',PLAIN='dm01-108';
const BIG='dm01-s01',BLOCKER='dm01-076',DRAW='dm06-085',WORM='dm03-027';
const DREAM='dm34-052',SPELL='dm01-110',JIL='dm09-037';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const zone=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(16).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

test('Phase 963 keeps four canonical types and resolves nine official reprints',()=>{
 const m=read('tools/support-phase-963.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[TWIN,BARGANTIS,CHAOS,BANJO]);
 const wormPrints=['dm18-067','dmc42-044','dmc55-052','dmc61-044'];
 const banjoPrints=['promoy5-039','dmc41-006','dmc55-011','dmx09-026','dmex12-044'];
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[
  ...wormPrints.map(id=>[id,CHAOS]),...banjoPrints.map(id=>[id,BANJO])
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],d={...row,status:'complete'};
  const canonical=m.cards.find(r=>r.id===id);
  assert.deepEqual(standardCardSpec(d,{phase:963}),canonical.spec);
  for(const [i,face] of d.faces.entries()){
   const faces=d.faces.map((f,j)=>i===j?{...face,abilityText:face.abilityText+'未知の能力。'}:f);
   assert.throws(()=>standardCardSpec({...d,faces},{phase:963}));
  }
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-963');
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 const spell=e.playFaces(e.card(TWIN))[1];
 assert.deepEqual([spell.type,spell.name,spell.cost],['spell','無限掌',1]);
 assert.notEqual(TWIN,PALM);
 assert.ok(data.cards.some(c=>c.id===PALM&&c.type==='spell'));
 assert.equal(catalogue.resolveRows([{id:TWIN,count:1},{id:PALM,count:1}]).length,2);
});

test('Sapient needs two other active Wave Strikers across both players for power and attack access',()=>{
 const s=field(),self=put(s,0,'hand',TWIN),one=put(s,0,'battle',WAVE),target=put(s,1,'battle',PLAIN);
 act(s,'play',a=>a.uid===self.uid&&a.face===0);
 const x=s.players[0].battle.find(y=>y.uid===self.uid);
 x.entered=s.turn-1;
 s.phase='attack';
 const canAttack=()=>legal(s,'attack',a=>a.uid===x.uid&&a.target===target.uid);
 assert.equal(e.power(x,false,s),2000);
 assert.equal(canAttack(),false);
 const two=put(s,1,'battle',WAVE);
 assert.equal(e.power(x,false,s),6000);
 assert.equal(canAttack(),true);
 two.g35Ignored=s.turn;
 assert.equal(e.power(x,false,s),2000);
 assert.equal(canAttack(),false);
 delete two.g35Ignored;
 assert.equal(canAttack(),true);
 s.players[0].battle.splice(s.players[0].battle.indexOf(one),1);
 assert.equal(canAttack(),false);
});

test('Sapient spell face pays one fire mana and untaps the chosen winner after each battle',()=>{
 let s=field(),self=put(s,0,'hand',TWIN),attacker=put(s,0,'battle',BIG);
 const first=put(s,1,'battle',PLAIN,{tapped:true}),second=put(s,1,'battle',PLAIN,{tapped:true});
 const before=physical(s);
 act(s,'play',a=>a.uid===self.uid&&a.face===1&&a.cost===1);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,1);
 assert.deepEqual(choices(s),[attacker.uid]);
 pick(s,attacker);
 s=restore(s);
 for(const victim of [first,second]){
  attack(s,attacker.uid,victim.uid);act(s,'noBlock');
  assert.equal(s.players[0].battle.find(y=>y.uid===attacker.uid).tapped,false);
 }
 assert.deepEqual(zone(s,0,'grave'),[self.uid]);
 assert.deepEqual(zone(s,1,'grave'),[first.uid,second.uid]);
 assert.deepEqual(physical(s),before);
});

test('Sapient spell face untaps before an opposing death ability taps the winner',()=>{
 const s=field(),self=put(s,0,'hand',TWIN),attacker=put(s,0,'battle',BIG);
 const victim=put(s,1,'battle',JIL,{tapped:true});
 act(s,'play',a=>a.uid===self.uid&&a.face===1);pick(s,attacker);
 attack(s,attacker.uid,victim.uid);act(s,'noBlock');
 assert.equal(attacker.tapped,false);
 pick(s,attacker);
 assert.equal(attacker.tapped,true);
});

for(const mode of ['accept','decline','late','opponent'])test('Bargantis offers one extra card only on its first own-turn draw '+mode,()=>{
 const s=field(mode==='opponent'?1:0),p=s.active;
 put(s,0,'battle',BARGANTIS);
 if(mode==='late')s.players[p].drawsThisTurn=1;
 cast(s,DRAW);
 assert.equal(s.players[p].hand.length,2);
 if(['accept','decline'].includes(mode)){
  assert.equal(s.decision?.source,BARGANTIS);
  pick(s,mode==='accept'?1:0);
 }
 assert.equal(s.decision,null);
 cast(s,DRAW);
 assert.equal(s.decision,null);
 assert.equal(s.players[p].hand.length,mode==='accept'?5:4);
});

for(const mode of ['direct','blocked','creature','empty'])test('Bargantis discards only its own hand on an unblocked attack against its player '+mode,()=>{
 const s=field(1),source=put(s,0,'battle',BARGANTIS),attacker=put(s,1,'battle',PLAIN);
 const blocker=put(s,0,'battle',BLOCKER),enemyHand=put(s,1,'hand',PLAIN);
 const startingShields=zone(s,0,'shields');
 const ownHand=mode==='empty'?[]:[put(s,0,'hand',PLAIN),put(s,0,'hand',SPELL),put(s,0,'hand',DREAM)];
 if(mode==='creature')source.tapped=true;
 attack(s,attacker.uid,mode==='creature'?source.uid:'player');
 act(s,mode==='blocked'?'block':'noBlock',a=>mode!=='blocked'||a.uid===blocker.uid);
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.deepEqual(zone(s,1,'hand'),[enemyHand.uid]);
 const discarded=s.players[0].grave.filter(y=>ownHand.some(x=>x.uid===y.uid)).map(y=>y.uid);
 assert.deepEqual(discarded,mode==='direct'?ownHand.map(x=>x.uid):[]);
 if(mode==='direct'||mode==='empty'){
  const broken=startingShields.filter(uid=>!zone(s,0,'shields').includes(uid));
  assert.equal(broken.length,1);
  assert.deepEqual(zone(s,0,'hand'),broken);
 }
});

for(const mode of ['choose','decline','empty'])test('Chaos Worm requires a friendly Parasite Worm and optionally destroys a single enemy '+mode,()=>{
 let s=field(),self=put(s,0,'hand',CHAOS);
 put(s,0,'battle',PLAIN);
 put(s,1,'battle',WORM);
 assert.equal(legal(s,'play',a=>a.uid===self.uid),false);
 if(mode==='empty')give(s,1,'battle',[]);
 const base=put(s,0,'battle',WORM),enemy=mode==='empty'?null:put(s,1,'battle',PLAIN);
 const before=physical(s);
 act(s,'play',a=>a.uid===self.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 if(enemy){
  assert.deepEqual(choices(s),[s.players[1].battle[0].uid,enemy.uid,null]);
  s=restore(s);pick(s,mode==='choose'?enemy:null);
 }else if(s.decision){
  assert.deepEqual(choices(s),[null]);
  pick(s,null);
 }
 assert.equal(s.decision,null);
 const x=s.players[0].battle.find(y=>y.uid===self.uid);
 assert.deepEqual(x.under.map(y=>y.uid),[base.uid]);
 assert.equal(zone(s,1,'grave').includes(enemy?.uid),mode==='choose');
 assert.deepEqual(physical(s),before);
});

for(const mode of ['choose','decline','no-match'])test('Banjo privately searches, reveals only a chosen Dream Mate, and always shuffles '+mode,()=>{
 let s=field(),self=put(s,0,'hand',BANJO);
 give(s,0,'deck',[PLAIN,mode==='no-match'?PLAIN:DREAM,SPELL,PLAIN,PLAIN]);
 const hit=s.players[0].deck[1],before=physical(s),random=s.rng;
 act(s,'play',a=>a.uid===self.uid);
 if(mode!=='no-match'){
  assert.deepEqual(choices(s),[hit.uid,null]);
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(DREAM));
  s=restore(s);pick(s,mode==='choose'?hit:null);
 }
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,0,'hand'),mode==='choose'?[hit.uid]:[]);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===DREAM).length,mode==='choose'?1:0);
 assert.notEqual(s.rng,random);
 assert.deepEqual(physical(s),before);
});
