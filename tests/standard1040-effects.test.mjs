import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const BERSERK='dm23ex3-049',BARAMON='dm24bd6-005',SUSPENSE='dm23ex3-020',NYAHAN='dm24bd6-008';
const N='dm01-108',L='dm01-075',D='dm01-090',MULTI='dm23ex3-074',BASIL='dm23ex3-033',TOBAR='dm23ex3-043';
const DEMON='dm01-027',ONIKAMASU='dmrp01-041';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const cast=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const restore=s=>decodeBattleData(encodeBattleData(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function crystal(s,n,p=0){
 for(const x of s.players[p].mana.slice(0,n))x.faceDown=true;
}

test('four full definitions and three reprints preserve canonical IDs, official stats, art and limits',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url)));
 const manifest=read('tools/support-phase-1040.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[BERSERK,BARAMON,SUSPENSE,NYAHAN]);
 assert.equal(manifest.printAliases.length,3);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),front=row.faces[0],base=manifest.cards.find(r=>r.id===id);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [front.cost,Number(front.powerText),front.race,front.civilizations.filter(x=>x!=='無色'),1,manifest.regulationVerification.limits[row.id]]);
  if(row.faces.length===2){
   const back=row.faces[1];
   assert.deepEqual([c.spellFace.name,c.spellFace.cost,e.civilizations(c.spellFace),c.spellFace.trigger],
    [back.name,back.cost,back.civilizations,true]);
  }
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1040}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Berserk attacks only from two crystals onward and breaks two shields',()=>{
 const s=setup(),berserk=add(s,0,'battle',BERSERK),enemy=add(s,1,'battle',N,{tapped:true});
 const attacks=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===berserk.uid).map(a=>a.target);
 crystal(s,1);
 act(s,'toAttack');
 assert.deepEqual(attacks(),[]);
 crystal(s,2);
 assert.deepEqual(new Set(attacks()),new Set(['player',enemy.uid]));
 const before=s.players[1].shields.length;
 attack(s,berserk.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,before-2);
});

test('Berserk redirects a creature attack as Guardman with no crystals',()=>{
 const s=Object.assign(setup(),{active:1}),berserk=add(s,0,'battle',BERSERK);
 const ally=add(s,0,'battle',L,{tapped:true}),attacker=add(s,1,'battle',N);
 attack(s,attacker.uid,ally.uid);
 act(s,'guardman',a=>a.uid===berserk.uid);
 drain(s);
 assert.ok(berserk.tapped&&find(s,0,'battle',ally)&&find(s,1,'grave',attacker));
});

test('Berserk offers a flip on both turns when tied with an opposing creature',()=>{
 let s=setup();
 add(s,0,'battle',BERSERK);
 add(s,1,'battle',BERSERK);
 const mana=s.players[0].mana[0],all=physical(s);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 s=restore(s);
 choose(s,mana.uid);
 assert.ok(find(s,0,'mana',mana).faceDown);
 assert.equal(s.decision.player,1);
 choose(s,null);
 assert.equal(s.active,1);
 end(s);
 assert.equal(s.decision.player,1);
 choose(s,null);
 assert.equal(s.decision.player,0);
 assert.ok(!choices(s).includes(mana.uid));
 choose(s,null);
 assert.equal(s.active,0);
 assert.deepEqual(physical(s),all);
});

test('Berserk checks all creatures, including another ally, for the largest power',()=>{
 const s=setup();
 add(s,0,'battle',BERSERK);
 add(s,1,'battle',N,{powerModifiers:[{amount:10000}]});
 end(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
 add(s,0,'battle',N,{powerModifiers:[{amount:10000}]});
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 choose(s,null);
 assert.ok(s.players[0].mana.every(x=>!x.faceDown));
});

test('Baramon draws precisely the difference and can block afterwards',()=>{
 const s=setup(),baramon=add(s,0,'hand',BARAMON),keep=add(s,0,'hand',N),top=s.players[0].deck.slice(0,2);
 give(s,1,'hand',[N,N,N]);
 cast(s,baramon);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[keep,...top].map(x=>x.uid));
 const attacker=add(s,1,'battle',N);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===baramon.uid);
 drain(s);
 assert.ok(find(s,0,'battle',baramon)&&find(s,1,'grave',attacker));
});

test('Baramon draws nothing when tied or ahead in cards',()=>{
 for(const count of [0,1]){
  const s=setup(),baramon=add(s,0,'hand',BARAMON),keep=add(s,0,'hand',N),top=s.players[0].deck[0];
  give(s,1,'hand',Array(count).fill(N));
  cast(s,baramon);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),[keep.uid]);
  assert.equal(s.players[0].deck[0].uid,top.uid);
 }
});

test('Baramon spell counts physical mana cards and puts two cards into mana face-down and untapped',()=>{
 for(const count of [4,5]){
  const s=setup(),spell=add(s,0,'hand',BARAMON);
  give(s,0,'mana',[L,L,L,L]);
  give(s,1,'mana',Array(count).fill(N));
  crystal(s,2,1);
  give(s,0,'deck',[MULTI,D,N,N]);
  const top=s.players[0].deck.slice(0,2),all=physical(s);
  cast(s,spell,1);
  const placed=s.players[0].mana.slice(4);
  assert.deepEqual(placed.map(x=>x.uid),count===5?top.map(x=>x.uid):[]);
  assert.ok(placed.every(x=>x.faceDown&&!x.tapped));
  assert.ok(find(s,0,'grave',spell));
  assert.deepEqual(physical(s),all);
 }
});

test('Baramon spell face is the only S-Trigger and resolves for free',()=>{
 const s=Object.assign(setup(),{active:1}),attacker=add(s,1,'battle',N);
 give(s,0,'mana',[]);
 give(s,0,'shields',[BARAMON,N]);
 const spell=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.face),[1]);
 act(s,'useTrigger',a=>a.uid===spell.uid);
 assert.equal(s.players[0].mana.length,2);
 assert.ok(s.players[0].mana.every(x=>x.faceDown&&!x.tapped));
 assert.ok(find(s,0,'grave',spell));
});

for(const count of [3,4])test('Suspense applies -15000 to the target and only at four crystals applies -6000 to the rest '+count,()=>{
 let s=setup();
 const spell=add(s,0,'hand',SUSPENSE),ally=add(s,0,'battle',N),untargetable=add(s,1,'battle',ONIKAMASU);
 const target=add(s,1,'battle',N,{powerModifiers:[{amount:20000}]}),other=add(s,1,'battle',N,{powerModifiers:[{amount:8000}]});
 crystal(s,count);
 const all=physical(s),[initialTarget,initialOther]=[target,other].map(x=>e.power(x,false,s));
 cast(s,spell);
 assert.deepEqual(new Set(choices(s)),new Set([target.uid,other.uid]));
 s=restore(s);
 choose(s,target.uid);
 assert.equal(e.power(find(s,1,'battle',target),false,s),initialTarget-15000);
 assert.equal(e.power(find(s,1,'battle',other),false,s),initialOther-(count===4?6000:0));
 assert.equal(!!find(s,1,'grave',untargetable),count===4);
 assert.ok(find(s,0,'battle',ally)&&find(s,0,'grave',spell));
 assert.deepEqual(physical(s),all);
 end(s);
 assert.equal(e.power(find(s,1,'battle',target),false,s),initialTarget);
 assert.equal(e.power(find(s,1,'battle',other),false,s),initialOther);
});

test('Suspense S-Trigger applies crystal-armed power loss with no legal target',()=>{
 const s=Object.assign(setup(),{active:1}),attacker=add(s,1,'battle',ONIKAMASU);
 give(s,0,'mana',[N,N,N,N]);
 crystal(s,4);
 give(s,0,'shields',[SUSPENSE,N]);
 const spell=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 assert.equal(s.decision,null);
 assert.ok(find(s,1,'grave',attacker)&&find(s,0,'grave',spell));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Nyahan can place a multicolor card face-down and untapped, or decline after restore',()=>{
 let s=setup();
 const nyahan=add(s,0,'hand',NYAHAN),multi=add(s,0,'hand',MULTI),all=physical(s);
 cast(s,nyahan);
 assert.deepEqual(new Set(choices(s)),new Set([multi.uid,null]));
 const declined=restore(s);
 choose(declined,null);
 assert.ok(find(declined,0,'hand',multi));
 s=restore(s);
 choose(s,multi.uid);
 const mana=find(s,0,'mana',multi);
 assert.ok(mana.faceDown&&!mana.tapped);
 assert.deepEqual(physical(s),all);
});

test('Nyahan can recover only a face-up card of the specified races after leaving',()=>{
 let s=Object.assign(setup(),{active:1});
 const nyahan=add(s,0,'battle',NYAHAN),oracle=add(s,0,'mana',BASIL),unknown=add(s,0,'mana',TOBAR);
 const hidden=add(s,0,'mana',BASIL,{faceDown:true}),wrong=add(s,0,'mana',L);
 const demon=add(s,1,'hand',DEMON),all=physical(s);
 cast(s,demon);
 act(s,'effect',a=>a.targets[0].uid===nyahan.uid);
 assert.ok(find(s,0,'grave',nyahan));
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(choices(s)),new Set([oracle.uid,unknown.uid,null]));
 const declined=restore(s);
 choose(declined,null);
 assert.ok(find(declined,0,'mana',oracle));
 s=restore(s);
 choose(s,oracle.uid);
 assert.ok(find(s,0,'hand',oracle)&&find(s,0,'mana',hidden).faceDown&&find(s,0,'mana',wrong));
 assert.deepEqual(physical(s),all);
});

test('Nyahan G Strike leaves the shield card in hand and locks the chosen attack',()=>{
 const s=Object.assign(setup(),{active:1}),attacker=add(s,1,'battle',N),later=add(s,1,'battle',N);
 give(s,0,'shields',[NYAHAN,N]);
 const nyahan=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 choose(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 choose(s,later.uid);
 assert.ok(find(s,0,'hand',nyahan)&&!later.tapped&&e.attackLocked(s,1,later));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
});
