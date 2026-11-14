import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const OWL='dm23rp2-010',DECISION='dm23rp2-008',NATEHA='dm23rp2-017';
const SMALL='dm01-108',BOUNCE='dm01-086',DESTROY='dm01-027',GS='dm23rp2-044';
const TWIN='dm23rp2-024',ABYSS='dm23rp3-OR1',BIG_ABYSS='dm24rp2-017',REV='dm24ex4-032';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const add=(s,p,zone,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const clone=s=>JSON.parse(JSON.stringify(s));
function pass(s){s.phase='attack';act(s,'endTurn');}
function noBlock(s){if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');}

test('16 official prints resolve to the three active IDs and share four-copy limits',()=>{
 const m=read('support-phase-1213.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[OWL,DECISION,NATEHA]);
 assert.deepEqual(m.printAliases.map(x=>x.id),[
  'dm23rp2x-010','promoy22-019','dm23rp2x-008','dm23rp2-11A','dm23rp2x-11A','dm23rp2-13B','dm23rp2x-13B','dmart14-002',
  'dm23rp2x-017','dm23rp2-14A','dm23rp2x-14A','dm23rp2-16B','dm23rp2x-16B'
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:1213}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...row.faces[0],abilityText:row.faces[0].abilityText+'\n未知の能力。'}]},{phase:1213}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual([c.manaValue,c.limit,m.regulationVerification.limits[row.id]],[1,4,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('true escape replaces a bounce using two separate shield groups; no S Trigger, but G Strike remains',()=>{
 let s=field();
 give(s,1,'shields',[BOUNCE,GS]);
 const [trigger,gStrike]=s.players[1].shields,stack=inst(DESTROY);
 trigger.shieldGroup='retained-group';trigger.shieldStack=[stack];
 const owl=add(s,1,'battle',OWL),attacker=add(s,0,'battle',SMALL);
 play(s,add(s,0,'hand',BOUNCE));target(s,owl);
 act(s,'replaceEver');
 act(s,'everShield',a=>a.shield==='retained-group');
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='everShield').map(a=>a.shield),[gStrike.uid]);
 s=clone(s);
 act(s,'everShield',a=>a.shield===gStrike.uid);
 assert.ok(has(s,1,'battle',owl));
 assert.deepEqual(ids(s.players[1].hand),[trigger.uid,stack.uid,gStrike.uid]);
 assert.equal(s.players[1].shields.length,0);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 if(s.decision?.task?.op==='gsDeclare')pick(s,true);
 assert.equal(s.decision?.task?.op,'gsTarget');pick(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'||a.kind==='attack'&&a.uid===attacker.uid));
});

test('Owl can decline, cannot use a single shield, and cannot leave with zero shields',()=>{
 for(const [n,spell] of [[2,DESTROY],[1,DESTROY],[0,DESTROY],[0,BOUNCE]]){
  const s=field(),owl=add(s,1,'battle',OWL);
  give(s,1,'shields',Array(n).fill(SMALL));
  play(s,add(s,0,'hand',spell));target(s,owl);
  if(n===2)act(s,'allowLeave');
  assert.equal(s.decision,null);
  assert.equal(has(s,1,'battle',owl),n===0);
  if(n>0)assert.ok(has(s,1,'grave',owl));
  assert.equal(s.players[1].shields.length,n);
 }
});

test('true escape cancels Revolution Change without consuming chosen shields',()=>{
 const s=field(),owl=add(s,0,'battle',OWL),incoming=add(s,0,'hand',REV);
 const shields=ids(s.players[0].shields);
 attack(s,owl.uid);
 const change=e.getLegalActions(s).find(a=>a.cardId===REV||s.decision?.choices?.[a.choice]?.value===incoming.uid);
 assert.ok(change,JSON.stringify(s.decision));e.step(s,change);
 pick(s,owl.uid);
 act(s,'replaceEver');
 act(s,'everShield',a=>a.shield===shields[0]);
 act(s,'everShield',a=>a.shield===shields[1]);
 assert.deepEqual(ids(s.players[0].shields),shields);
 assert.ok(has(s,0,'hand',incoming)&&has(s,0,'battle',owl));
 assert.equal(s.attack.attacker,owl.uid);
 noBlock(s);assert.ok(e.getLegalActions(s).some(a=>a.kind==='breakShields'&&a.shields.length===2));
});

test('Owl can block and Nateha slays its stronger attacker after losing the battle',()=>{
 for(const id of [OWL,NATEHA]){
  const s=field(),blocker=add(s,1,'battle',id);
  const attacker=add(s,0,'battle',id===OWL?SMALL:ABYSS);
  const shields=ids(s.players[1].shields);
  attack(s,attacker.uid);act(s,'block',a=>a.uid===blocker.uid);
  assert.ok(has(s,0,'grave',attacker));
  assert.equal(has(s,1,'grave',blocker),id===NATEHA);
  assert.deepEqual(ids(s.players[1].shields),shields);
 }
});

test('Decision discounts exactly two for four distinct face-up high-cost mana cards, including a Twinpact spell face',()=>{
 const s=field(),spell=add(s,0,'hand',DECISION);
 give(s,0,'mana',[ABYSS,ABYSS,ABYSS,TWIN,'dm01-083',SMALL]);
 const twin=s.players[0].mana[3],can=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===spell.uid);
 assert.ok(can());twin.faceDown=true;assert.ok(!can());twin.faceDown=false;
 play(s,spell);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 pick(s,0);assert.equal(s.players[0].hand.length,0);
 pick(s,0);assert.equal(s.players[0].hand.length,4);
});

test('Decision resolves the selected modes in printed order, including owner mana and reveal of a Twinpact creature',()=>{
 let s=field();
 give(s,0,'deck',Array(8).fill(TWIN));
 const spell=add(s,0,'hand',DECISION),victim=add(s,1,'battle',SMALL,{cardOwner:0});
 play(s,spell);pick(s,2);
 assert.equal(s.players[0].battle.length,0);
 s=clone(s);pick(s,1);
 assert.equal(s.players[0].battle.length,0);
 pick(s,victim.uid);
 assert.ok(has(s,0,'mana',victim)&&!has(s,1,'mana',victim));
 assert.deepEqual(s.players[0].battle.map(x=>x.cardId),[TWIN]);
 assert.equal(s.players[0].deck.length,7);
});

test('Decision does not cast a revealed spell or reveal a top card under Q.Q.QX.',()=>{
 for(const locked of [false,true]){
  const s=field();
  if(locked)add(s,1,'battle','dmrp07-m01');
  else give(s,0,'deck',Array(8).fill(BOUNCE));
  const spell=add(s,0,'hand',DECISION);
  play(s,spell);pick(s,2);pick(s,2);
  assert.equal(s.players[0].battle.length,0);
  assert.deepEqual(s.players[0].grave.map(x=>x.cardId),[DECISION]);
  assert.equal(s.players[0].deck.length,locked?12:8);
  assert.equal(s.log.filter(x=>x.cardId===DECISION&&x.type==='reveal').length,locked?0:2);
 }
});

test('Nateha requires two shields and may decline after selecting only one',()=>{
 for(const n of [1,2]){
  const s=field();
  add(s,0,'battle',NATEHA);give(s,0,'shields',Array(n).fill(BOUNCE));
  const [first]=s.players[0].shields;
  first.shieldStack=[inst(DESTROY)];
  pass(s);assert.equal(s.decision,null);
  pass(s);
  if(n===1)assert.equal(s.decision,null);
  else{pick(s,first.uid);assert.equal(s.players[0].shields.length,2);pick(s,null);}
  assert.equal(s.players[0].shields.length,n);
  assert.deepEqual(s.players[0].grave,[]);
  assert.ok(!s.log.some(x=>x.cardId===NATEHA&&x.type==='look'));
 }
});

test('Nateha moves both shields together and uses an Abyss within cost 8 before normal draw',()=>{
 let s=field();
 add(s,0,'battle',NATEHA);give(s,0,'shields',[BOUNCE,GS,SMALL]);
 const [one,two]=s.players[0].shields,stack=inst(DESTROY);
 one.shieldStack=[stack];
 give(s,0,'deck',[ABYSS,BIG_ABYSS,SMALL,SMALL,...Array(8).fill(SMALL)]);
 const [abyss,big,miss,draw,...tail]=s.players[0].deck;
 pass(s);pass(s);pick(s,two.uid);
 assert.deepEqual(s.players[0].grave,[]);
 s=clone(s);pick(s,one.uid);
 assert.deepEqual(ids(s.players[0].grave),[two.uid,one.uid,stack.uid]);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(values(s),[abyss.uid,null]);
 pick(s,abyss.uid);pick(s,miss.uid);
 assert.ok(has(s,0,'battle',abyss)&&has(s,0,'hand',draw));
 assert.deepEqual(ids(s.players[0].deck),ids([...tail,miss,big]));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});
