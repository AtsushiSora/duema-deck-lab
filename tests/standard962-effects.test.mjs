import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PALM='dm09-032',SPY='dm14-082',SENIA='dm08-053',MUSASHI='dm20-004';
const PALM_PRINTS=['dmc27-032','dmc42-051'];
const PLAIN='dm01-108',BIG='dm01-s01',JIL='dm09-037',DREAM='dm34-052',BOOST='dm01-095';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',CASTLE='dm26rp1-043',HIDDEN='dm25rp3-S09';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const zone=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>JSON.parse(JSON.stringify(s));
const seen=s=>s.decision?.task?.g585Peek?.map(x=>x.id);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(16).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function fight(s,x,y){
 attack(s,x.uid,y.uid);
 act(s,'noBlock');
}

function breakOne(s,x){
 attack(s,x.uid);
 act(s,'noBlock');
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 962 keeps four complete card IDs and resolves both Palm reprints to DM-09',()=>{
 const m=read('tools/support-phase-962.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[PALM,SPY,SENIA,MUSASHI]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),PALM_PRINTS.map(id=>[id,PALM]));
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],d={...row,status:'complete'};
  const def=m.cards.find(r=>r.id===id);
  assert.deepEqual(standardCardSpec(d,{phase:962}),def.spec);
  assert.throws(()=>standardCardSpec(d,{phase:961}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:962}));
  for(const [key,value] of Object.entries(def.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],
   [id===PALM?'spell':'creature',f.cost,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-962');
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 assert.deepEqual(catalogue.resolveRows([PALM,...PALM_PRINTS].map(id=>({id,count:1}))),[{id:PALM,count:3}]);
});

test('Palm mandatorily untaps the same creature after each win and after JSON restore',()=>{
 let s=field();
 const attacker=put(s,0,'battle',BIG),other=put(s,0,'battle',PLAIN);
 const first=put(s,1,'battle',DREAM,{tapped:true}),second=put(s,1,'battle',PLAIN,{tapped:true});
 cast(s,PALM);
 assert.deepEqual(values(s),[attacker.uid,other.uid]);
 pick(s,attacker.uid);
 const before=physical(s);
 s=restore(s);
 const a=s.players[0].battle.find(x=>x.uid===attacker.uid);
 fight(s,a,first);
 assert.equal(s.decision,null);
 assert.equal(a.tapped,false);
 fight(s,a,second);
 assert.equal(s.decision,null);
 assert.equal(a.tapped,false);
 assert.deepEqual(zone(s,1,'grave'),[first.uid,second.uid]);
 assert.deepEqual(physical(s),before);
});

test('Palm untaps before the defending Jil Warka can tap the winner again',()=>{
 const s=field(),attacker=put(s,0,'battle',BIG),jil=put(s,1,'battle',JIL);
 cast(s,PALM);
 pick(s,attacker.uid);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===jil.uid);
 assert.equal(s.decision.player,1);
 assert.equal(attacker.tapped,false);
 pick(s,attacker.uid);
 assert.equal(attacker.tapped,true);
});

test('Palm does not untap on a shield break and expires before a later-turn victory',()=>{
 const s=field(),attacker=put(s,0,'battle',BIG),victim=put(s,1,'battle',DREAM,{tapped:true});
 cast(s,PALM);
 pick(s,attacker.uid);
 breakOne(s,attacker);
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(attacker.tapped,true);
 end(s);
 end(s);
 victim.tapped=true;
 fight(s,attacker,victim);
 assert.equal(attacker.tapped,true);
});

test('Palm does not follow a departed creature into a new incarnation',()=>{
 const s=field(),attacker=put(s,0,'battle',BIG),victim=put(s,1,'battle',DREAM,{tapped:true});
 cast(s,PALM);
 pick(s,attacker.uid);
 s.extTasks=[{op:'g34_ExactMove',p:0,owner:0,source:PALM,target:attacker.uid,to:'hand'}];
 act(s,'toAttack');
 assert.ok(zone(s,0,'hand').includes(attacker.uid));
 s.phase='main';
 act(s,'play',a=>a.uid===attacker.uid);
 const current=s.players[0].battle.find(x=>x.uid===attacker.uid);
 current.entered=s.turn-1;
 fight(s,current,victim);
 assert.equal(current.tapped,true);
});

for(const owner of [0,1])test('Aqua Spy privately reads every card of just the chosen player '+owner,()=>{
 let s=field(),expected=[HIDDEN,DARK,WATER];
 give(s,0,'mana',Array(7).fill(WATER));
 give(s,owner,'shields',[HIDDEN,WATER]);
 give(s,1-owner,'shields',[FIRE]);
 s.players[owner].shields[0].shieldStack=[inst(DARK),{...inst(CASTLE),faceUp:true}];
 const shields=s.players.map(p=>structuredClone(p.shields));
 cast(s,SPY);
 assert.deepEqual(values(s),[0,1,2]);
 pick(s,owner);
 assert.deepEqual(seen(s),expected);
 assert.ok(!JSON.stringify(s.log).includes(HIDDEN));
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(HIDDEN));
 s=restore(s);
 assert.deepEqual(seen(s),expected);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players.map(p=>p.shields),shields);
});

test('Aqua Spy can decline at seven mana and has no entry ability at six',()=>{
 for(const n of [6,7]){
  const s=field(1);
  give(s,1,'mana',Array(n).fill(WATER));
  cast(s,SPY);
  if(n===7)pick(s,2);
  assert.equal(s.decision,null);
  assert.ok(!s.log.some(l=>l.type==='look'));
 }
});

test('Senia gains +5000 and W Breaker after another ally breaks, even when it entered later',()=>{
 const s=field(),ally=put(s,0,'battle',PLAIN),senia=put(s,0,'battle',SENIA);
 assert.deepEqual([e.power(senia,false,s),e.effectiveCard(senia,s).breaker??1],[3000,1]);
 breakOne(s,ally);
 const later=put(s,0,'battle',SENIA);
 for(const x of [senia,later])assert.deepEqual([e.power(x,false,s),e.effectiveCard(x,s).breaker],[8000,2]);
 attack(s,senia.uid);
 act(s,'noBlock');
 assert.equal(s.decision.count,2);
 act(s,'breakShields',a=>a.shields.length===2);
 assert.equal(e.power(senia,false,s),8000);
 end(s);
 for(const x of [senia,later])assert.deepEqual([e.power(x,false,s),e.effectiveCard(x,s).breaker??1],[3000,1]);
});

test('Senia ignores its own break and an opposing break',()=>{
 const s=field(),senia=put(s,0,'battle',SENIA),opponent=put(s,1,'battle',PLAIN);
 breakOne(s,senia);
 assert.equal(e.power(senia,false,s),3000);
 s.active=1;
 breakOne(s,opponent);
 assert.equal(e.power(senia,false,s),3000);
});

test('Senia does not activate when a creature replaces the break with a shield burn',()=>{
 const s=field(),senia=put(s,0,'battle',SENIA),burner=put(s,0,'battle','dm06-s08');
 assert.ok(e.card(burner).shieldBurn);
 breakOne(s,burner);
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===2);
 assert.equal(e.power(senia,false,s),3000);
});

test('Musashi requires eligible enemy attacks only while tapped and leaves the attacker’s target choice open',()=>{
 for(const tapped of [false,true]){
  const s=field(1),musashi=put(s,0,'battle',MUSASHI,{tapped}),enemy=put(s,1,'battle',DREAM);
  const target=put(s,0,'battle',PLAIN,{tapped:true});
  s.phase='attack';
  const actions=e.getLegalActions(s);
  assert.equal(actions.some(a=>a.kind==='endTurn'),!tapped);
  assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target==='player'));
  assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===target.uid));
  attack(s,enemy.uid,target.uid);
  assert.ok(zone(s,1,'grave').includes(enemy.uid));
  assert.ok(zone(s,0,'battle').includes(musashi.uid)&&zone(s,0,'battle').includes(target.uid));
  assert.equal(s.decision,null);
  assert.ok(!s.log.some(l=>l.type==='block'||l.type==='battle'||l.type==='break'));
 }
});

test('Musashi uses attack-time power, and ignores enemy attacks while its abilities are suppressed',()=>{
 for(const [id,ignored] of [[BOOST,false],[DREAM,true]]){
  const s=field(1),musashi=put(s,0,'battle',MUSASHI,{tapped:true}),enemy=put(s,1,'battle',id);
  if(ignored)musashi.g35Ignored=s.turn;
  attack(s,enemy.uid);
  assert.equal(s.decision.type,'block');
  assert.ok(zone(s,1,'battle').includes(enemy.uid));
 }
});

test('Palm’s delayed untap is suppressed by Genmu even after Palm left its own graveyard',()=>{
 const s=field(),attacker=put(s,0,'battle',BIG),victim=put(s,1,'battle',DREAM,{tapped:true});
 cast(s,PALM);
 pick(s,attacker.uid);
 s.players[0].hand.push(s.players[0].grave.pop());
 put(s,1,'battle',GEN);
 fight(s,attacker,victim);
 assert.equal(attacker.tapped,true);
});
