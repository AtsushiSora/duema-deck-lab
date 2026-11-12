import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const MASTIN='dmrp01-s09',ENGINEER='dm25rp2-033',JOKIRU='dmrp02-073';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',GREEN='dm01-108',SPELL='dm01-102';
const RABBIT='dmex08-115',EVOLUTION='dm14-s03',QQX='dmrp07-m01',KAREIKO='dm22ex1-086';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Three official names and one secret print keep canonical IDs, stats, limits and art',()=>{
 const m=read('tools/support-phase-1067.json');
 const cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[MASTIN,ENGINEER,JOKIRU]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dm25rp2-Sec19',ENGINEER]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(cat.get(id).supported,true);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1067}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(data.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
  }
 }
});

test('Mastin privately looks at three, deploys any number of eligible creatures and keeps the rest',()=>{
 let s=field();
 const base=add(s,0,'battle',GREEN);
 const mastin=summon(s,MASTIN,base);
 give(s,0,'deck',[MASTIN,EVOLUTION,RABBIT,GREEN,GREEN]);
 const [first,excluded,second,...rest]=ids(s,0,'deck');
 const before=physical(s);
 attack(s,mastin.uid);
 assert.deepEqual(new Set(values(s)),new Set([first,second,null]));
 assert.deepEqual(s.decision.task.g585Peek.map(c=>c.id),[MASTIN,EVOLUTION,RABBIT]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(e.card(EVOLUTION).name));
 s=decodeBattleData(encodeBattleData(s));
 pick(s,first);
 assert.ok(values(s).includes(second));
 pick(s,second);
 pick(s,null);
 pick(s,null);
 drain(s);
 assert.ok(ids(s,0,'battle').includes(first));
 assert.ok(ids(s,0,'battle').includes(second));
 assert.deepEqual(ids(s,0,'hand'),[excluded]);
 assert.deepEqual(ids(s,0,'deck'),rest);
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(physical(s),before);
});

test('Mastin bars low-power enemy attacks on either target while its ability is active',()=>{
 const s=field(1);
 const mastin=add(s,0,'battle',MASTIN,{tapped:true});
 const enemy=add(s,1,'battle',LIGHT,{powerModifiers:[{amount:1000}]});
 s.phase='attack';
 const targets=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===enemy.uid).map(a=>a.target);
 assert.deepEqual(targets(),[]);
 enemy.powerModifiers[0].amount=1001;
 assert.deepEqual(new Set(targets()),new Set(['player',mastin.uid]));
 enemy.powerModifiers[0].amount=1000;
 mastin.g35Ignored=s.turn;
 assert.deepEqual(new Set(targets()),new Set(['player',mastin.uid]));
});

test('Engineer offers the top card at its own end and returns only its former bases on destruction',()=>{
 const s=field();
 const base=add(s,0,'battle',LIGHT);
 const engineer=summon(s,ENGINEER,base);
 const unrelated=add(s,0,'grave',SPELL);
 give(s,0,'deck',[SPELL,GREEN,GREEN]);
 const top=s.players[0].deck[0],before=physical(s);
 end(s);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(!JSON.stringify(s.decision.choices).includes(e.card(SPELL).name));
 pick(s,true);
 drain(s);
 assert.deepEqual(engineer.under.map(x=>x.uid),[base.uid,top.uid]);
 assert.ok(s.log.some(row=>row.type==='reveal'&&row.cardId===SPELL));
 const opponent=add(s,1,'battle',JOKIRU);
 s.extTasks=[{op:'g34_Sequence',p:1,source:JOKIRU,uid:opponent.uid,defs:[
  {op:'ExactMove',owner:0,to:'grave',target:engineer.uid,targetIncarnation:engineer.incarnation||0}
 ]}];
 s.phase='main';
 act(s,'toAttack');
 drain(s);
 assert.deepEqual(new Set(ids(s,0,'hand')),new Set([base.uid,top.uid]));
 assert.deepEqual(new Set(ids(s,0,'grave')),new Set([unrelated.uid,engineer.uid]));
 assert.deepEqual(physical(s).filter(uid=>uid!==opponent.uid),before);
});

test('Engineer can decline, places the top card under reveal prohibition, and honors deck replacement',()=>{
 for(const [watcher,choice,destination] of [[null,null,'deck'],[QQX,true,'under'],[KAREIKO,true,'grave']]){
  const s=field();
  const engineer=summon(s,ENGINEER);
  if(watcher)add(s,1,'battle',watcher);
  give(s,0,'deck',[SPELL,GREEN,GREEN]);
  const top=s.players[0].deck[0];
  end(s);
  pick(s,choice);
  drain(s);
  const rows=destination==='under'?engineer.under:s.players[0][destination];
  assert.ok(rows.some(x=>x.uid===top.uid),destination);
  assert.equal(s.log.some(r=>r.type==='reveal'&&r.cardId===SPELL),watcher===KAREIKO);
 }
});

test('Engineer can use G Strike from a broken shield',()=>{
 const s=field(1);
 const attacker=add(s,1,'battle',WATER),later=add(s,1,'battle',LIGHT);
 give(s,0,'shields',[ENGINEER]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,later.uid);
 drain(s);
 assert.ok(e.attackLocked(s,1,later));
 assert.ok(s.players[0].hand.some(x=>x.cardId===ENGINEER));
});

test('Jokiru destroys itself after winning a battle only if it was non-evolved',()=>{
 for(const evolved of [false,true]){
  const s=field();
  const base=evolved?add(s,0,'battle',DARK):undefined;
  const jokiru=summon(s,JOKIRU,base);
  jokiru.entered=0;
  const defender=add(s,1,'battle',WATER,{tapped:true});
  attack(s,jokiru.uid,defender.uid);
  drain(s);
  assert.ok(ids(s,1,'grave').includes(defender.uid));
  assert.equal(ids(s,0,'grave').includes(jokiru.uid),!evolved);
  assert.equal(ids(s,0,'battle').includes(jokiru.uid),evolved);
 }
 const s=field();
 const jokiru=add(s,0,'battle',JOKIRU);
 attack(s,jokiru.uid);
 drain(s);
 assert.ok(ids(s,0,'battle').includes(jokiru.uid));
});
