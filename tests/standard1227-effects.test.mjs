import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DEC='dm23rp1-008',GU='dm23rp1-040',ARC='dm23rp1-S7',FINE='dm23sd1-012';
const SONG='dm22rp1-014',DARK='dm01-090',GREEN='dm01-108',WATER='dm01-083',FIRE='dm01-097';
const ABYSS='dm22sd1-005',BIG_DARK='dm01-088',DESTROY='dm01-027';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const setupField=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(GREEN));give(s,p,'grave',[]);}
 return s;
};
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const choices=s=>s.decision?.choices.map(({value})=>value?.uid??value)??[];
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v||s.decision.choices[a.choice].value?.uid===v);
const paid=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const selectFace=(s,x,face)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;return v?.uid===x.uid&&v.face===face;
});
const attackWith=(s,x)=>attack(s,x.uid);

test('twelve official prints retain four canonical IDs, all faces, deck limits and images',()=>{
 const m=read('tools/support-phase-1227.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[DEC,GU,ARC,FINE]);
 assert.equal(m.printAliases.length,8);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1227}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.deepEqual(e.playFaces(c).map(x=>[x.type,x.cost,x.race,x.civilizations]),row.faces.map(f=>
   [f.typeText==='呪文'?'spell':'creature',f.cost,f.race,f.civilizations]));
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Decision costs five below eight cards and three at eight, including face-down mana',()=>{
 for(const n of [7,8]){
  const s=setupField();
  give(s,0,'mana',[DARK,GREEN,GREEN,GREEN,GREEN]);
  s.players[0].mana[4].faceDown=true;
  give(s,0,'grave',Array(n-5).fill(DARK));
  const x=add(s,0,'hand',DEC),need=n===7?5:3;
  const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid);
  assert.equal(a?.cost,need);
  e.step(s,a);assert.equal(paid(s,0),need);
  drain(s);
 }
});

test('Song grants Decision its grave cast and the spell counts toward eight (QA43065)',()=>{
 const s=setupField();give(s,0,'mana',[DARK,DARK,WATER,WATER,GREEN,GREEN]);give(s,0,'grave',[DEC]);
 const [x]=s.players[0].grave;
 cast(s,SONG);pick(s,x.uid);
 assert.equal(s.players[0].mana.length+s.players[0].grave.length,8);
 const prev=paid(s,0);
 const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&a.origin==='grave');
 assert.equal(a?.cost,3);e.step(s,a);assert.equal(paid(s,0)-prev,3);
 pick(s,0);pick(s,0);drain(s);
 assert.ok(has(s,0,'grave',x));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
});

test('Decision preselects both modes then resolves mill and recovery before deployment',()=>{
 const s=setupField(),green=add(s,0,'grave',GREEN),dark=add(s,0,'mana',DARK);
 const wrong=add(s,0,'mana',WATER),large=add(s,0,'mana',BIG_DARK);
 cast(s,DEC);const count=s.players[0].deck.length;
 pick(s,2);assert.equal(s.players[0].deck.length,count);pick(s,0);
 assert.equal(s.players[0].deck.length,count-2);
 pick(s,green.uid);
 assert.ok(choices(s).includes(green.uid)&&choices(s).includes(dark.uid));
 assert.ok(!choices(s).includes(wrong.uid)&&!choices(s).includes(large.uid)&&!choices(s).includes(null));
 pick(s,green.uid);drain(s);
 assert.ok(has(s,0,'battle',green));
 assert.equal(green.summonedTurn,undefined);
});

test('Decision can apply its power reduction twice, leaving later entrants unchanged',()=>{
 const s=setupField(),own=add(s,0,'battle',GREEN),enemy=add(s,1,'battle',GREEN);
 const survivor=add(s,1,'battle','dm01-029',{justDiverActive:true});
 cast(s,DEC);pick(s,1);pick(s,1);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(e.power(own,false,s),2000);
 assert.equal(e.power(survivor,false,s),7000);
 assert.equal(e.power(add(s,1,'battle',FIRE),false,s),2000);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.power(survivor,false,s),9000);
});

test('Muyukiba cannot attack and is destroyed after winning a block, opening a single Abyss Mekraid',()=>{
 const s=setupField(1),gu=add(s,0,'battle',GU),attacker=add(s,1,'battle',FIRE);
 add(s,1,'battle',FIRE);
 const [abyss,big,wrong]=[ABYSS,'dm23rp3-OR1',WATER].map(inst);
 s.players[0].deck.unshift(abyss,big,wrong);
 s.phase='attack';s.active=0;
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gu.uid));
 s.active=1;attackWith(s,attacker);
 assert.ok(has(s,0,'battle',gu));
 act(s,'block',a=>a.uid===gu.uid);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'grave',gu));
 assert.equal(s.decision?.task?.op,'g34_RaidPick');
 assert.deepEqual(choices(s),[abyss.uid,null]);
 pick(s,abyss.uid);drain(s);
 assert.ok(has(s,0,'battle',abyss));
 assert.deepEqual(new Set(s.players[0].deck.slice(-2).map(x=>x.uid)),new Set([big.uid,wrong.uid]));
 assert.ok(!s.decision);
});

test('Muyukiba raids when destroyed outside combat and does not raid when returned to hand',()=>{
 for(const id of [DESTROY,'dm01-086']){
  const s=setupField(1),gu=add(s,0,'battle',GU);
  const abyss=add(s,0,'deck',ABYSS);s.players[0].deck.unshift(s.players[0].deck.pop());
  cast(s,id);act(s,'effect',a=>a.targets?.some(t=>t.uid===gu.uid));
  if(id===DESTROY){
   assert.equal(s.decision?.task?.op,'g34_RaidPick');
   assert.ok(choices(s).includes(abyss.uid));
  }else{
   assert.ok(has(s,0,'hand',gu));
   assert.notEqual(s.decision?.task?.op,'g34_RaidPick');
  }
  drain(s);
 }
});

test('Arczeos has both Piyocchi options and keeps the outer cards reserved during the inner Mekraid (QA43046)',()=>{
 const s=setupField();
 const [fine,outer1,outer2,inner1,inner2,inner3]=[FINE,FIRE,DARK,WATER,GREEN,FIRE].map(inst);
 s.players[0].deck.unshift(fine,outer1,outer2,inner1,inner2,inner3);
 cast(s,ARC);
 assert.deepEqual(s.decision.choices.map(({value})=>value),[{uid:fine.uid,face:0},{uid:fine.uid,face:1},null]);
 selectFace(s,fine,1);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(s.decision.task.ids,[inner1.uid,inner2.uid,inner3.uid]);
 assert.ok(has(s,0,'deck',outer1)&&has(s,0,'deck',outer2));
 assert.deepEqual(s.players[0].deck.slice(0,2).map(x=>x.uid),[outer1.uid,outer2.uid]);
 pick(s,null);
 for(const x of [inner3,inner2,outer2])pick(s,x.uid);
 assert.deepEqual(s.players[0].deck.slice(-5).map(x=>x.uid),[inner3,inner2,inner1,outer2,outer1].map(x=>x.uid));
 assert.ok(has(s,0,'grave',fine));
});

test('Arczeos counts Fire Birds, may decline and fight later, and only fights once per turn (QA44212)',()=>{
 const s=setupField(),arc=add(s,0,'battle',ARC),first=add(s,1,'battle',FIRE),second=add(s,1,'battle',GREEN);
 for(let n=1;n<=3;n++){
  cast(s,FINE);
  assert.equal(e.power(arc,false,s),5000+3000*n);
  if(n===1){assert.equal(s.decision?.task?.op,'g34_FightEnemy240');pick(s,null);}
  if(n===2){assert.equal(s.decision?.task?.op,'g34_FightEnemy240');pick(s,first.uid);assert.ok(has(s,1,'grave',first));}
  if(n===3)assert.equal(s.decision,null);
 }
 assert.equal(e.effectiveCard(arc,s).breaker,3);
 s.active=1;s.turn++;s.phase='main';
 cast(s,FINE);assert.notEqual(s.decision?.task?.op,'g34_FightEnemy240');
 s.active=0;cast(s,FINE);
 pick(s,second.uid);drain(s);
 assert.ok(has(s,1,'grave',second));
 assert.ok(e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle.at(-1).uid));
});

test('Arczeos counts an allied Fire Bird Tamaseed and offers a fight when it enters',()=>{
 const s=setupField(),arc=add(s,0,'battle',ARC),enemy=add(s,1,'battle',FIRE);
 cast(s,'dm25rp4-073');
 assert.equal(e.power(arc,false,s),8000);
 assert.equal(s.decision?.task?.op,'g34_FightEnemy240');
 pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy));
});

test('Two Arczeos copies each get one optional fight for the same Fire Bird',()=>{
 const s=setupField();
 for(let i=0;i<2;i++)add(s,0,'battle',ARC);
 const enemies=[add(s,1,'battle',FIRE),add(s,1,'battle',FIRE),add(s,1,'battle',FIRE)];
 cast(s,FINE);
 for(const x of enemies.slice(0,2)){
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===ARC);
  pick(s,x.uid);
 }
 assert.ok(enemies.slice(0,2).every(x=>has(s,1,'grave',x)));
 cast(s,FINE);assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',enemies[2]));
});
