import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const UKON='dm26rp2-018',REV='dm26rp2-077',ROBO='dm26rp2-008',DREAM='dm26rp2-DM001';
const N='dm01-108',FIRE='dm01-097',BIG='dm01-001',HAND='dm01-027',WATER='dm01-083';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(N));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const choice=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choice(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

test('three canonical definitions preserve official text, stats, image and copy limits',()=>{
 const m=read('tools/support-phase-1146.json'),r=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[UKON,REV,ROBO]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1146}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(c.cost,f.cost);
  assert.equal(c.type,row.id===REV?'spell':'creature');
  assert.equal(c.power,parseInt(f.powerText,10)||0);
  assert.deepEqual(e.civilizations(c),f.civilizations);
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,4);
  assert.equal(r.get(row.id).id,row.id);
  assert.equal(r.byName.get(nameKey(row.name)).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Ukon and Sakon may decline the first ally, grant once per turn, and keep the bonuses on later turns',()=>{
 const s=field(),u=add(s,0,'hand',UKON);
 play(s,u);
 assert.equal(s.decision,null);
 const first=add(s,0,'hand',N);play(s,first);
 assert.equal(s.decision.task.op,'g34_UkonSakon1146');
 pick(s,null);
 assert.equal(e.power(first,false,s),2000);
 const next=add(s,0,'hand',N);play(s,next);
 pick(s,true);
 const after=add(s,0,'hand',N);play(s,after);
 assert.equal(s.decision,null);
 assert.equal(e.power(next,false,s),6000);
 assert.ok(e.effectiveCard(next,s).speedAttacker&&e.effectiveCard(next,s).poweredBreaker);
 assert.equal(e.power(after,false,s),2000);
 s.phase='attack';act(s,'endTurn');
 const saved=JSON.parse(JSON.stringify(s));
 const restored=saved.players[0].battle.find(x=>x.uid===next.uid);
 assert.equal(e.power(restored,false,saved),6000);
 assert.ok(e.effectiveCard(restored,saved).speedAttacker&&e.effectiveCard(restored,saved).poweredBreaker);
 s.phase='attack';act(s,'endTurn');s.phase='main';
 play(s,add(s,0,'hand',WATER));
 assert.equal(s.decision.task.op,'g34_UkonSakon1146');
});

test('Ukon and Sakon can grant on the opponent turn, and revival gives the ally a fresh identity',()=>{
 const s=field(),own=s.players[0],u=add(s,0,'battle',UKON);
 give(s,0,'shields',['dm26rp1-036']);
 const [entrant]=own.shields,enemy=add(s,1,'battle',N);
 s.active=1;attack(s,enemy.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===entrant.uid);
 pick(s,true);
 assert.equal(e.power(entrant,false,s),8000);
 s.phase='main';
 play(s,add(s,1,'hand',HAND));
 act(s,'effect',a=>a.targets[0].uid===entrant.uid);
 assert.ok(own.grave.includes(entrant)&&own.battle.includes(u));
 const victim=add(s,0,'battle',BIG);
 play(s,add(s,1,'hand',HAND));act(s,'effect',a=>a.targets[0].uid===victim.uid);
 pick(s,true);
 assert.ok(own.battle.includes(entrant));
 assert.equal(e.power(entrant,false,s),4000);
 assert.ok(!e.effectiveCard(entrant,s).speedAttacker&&!e.effectiveCard(entrant,s).poweredBreaker);
});

test('Complete Heatblood Revolution can decline or tap an ally and retain its lure until the caster turn',()=>{
 for(const use of [false,true]){
  const s=field(),ally=add(s,0,'battle',N),attacker=add(s,1,'battle',N);
  play(s,add(s,0,'hand',REV));
  pick(s,use?ally.uid:null);
  assert.equal(ally.tapped,use);
  assert.equal(e.power(ally,false,s),use?6000:2000);
  s.phase='attack';act(s,'endTurn');s.phase='attack';
  assert.deepEqual(new Set(legal(s,'attack').filter(a=>a.uid===attacker.uid).map(a=>a.target)),new Set([use?ally.uid:'player']));
  assert.ok(legal(s,'endTurn').length);
  act(s,'endTurn');
  assert.equal(e.power(ally,false,s),2000);
  assert.ok(!s.g42Lures.length);
 }
});

test('Complete Heatblood Revolution casts from a broken shield and may select an already tapped ally',()=>{
 const s=field(),ally=add(s,0,'battle',N,{tapped:true});
 give(s,0,'shields',[REV]);
 const [spell]=s.players[0].shields;
 const attacker=add(s,1,'battle',N),second=add(s,1,'battle',N);
 s.active=1;attack(s,attacker.uid);act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 pick(s,ally.uid);
 assert.equal(e.power(ally,false,s),6000);
 assert.ok(ally.tapped&&s.players[0].grave.includes(spell));
 assert.deepEqual(legal(s,'attack').filter(a=>a.uid===second.uid).map(a=>a.target),[ally.uid]);
});

test('Gachirobo Mk II discounts its summon only without an ally and grants haste at two enemy shields',()=>{
 const s=field(),r=add(s,0,'hand',ROBO),ally=add(s,0,'hand',N);
 assert.equal(legal(s,'play').find(a=>a.uid===r.uid).cost,5);
 play(s,ally);
 assert.equal(legal(s,'play').find(a=>a.uid===r.uid).cost,8);
 assert.ok(!e.effectiveCard(ally,s).speedAttacker);
 play(s,r);
 assert.ok(e.effectiveCard(r,s).speedAttacker);
 assert.ok(!e.effectiveCard(ally,s).speedAttacker);
 give(s,1,'shields',[N,N]);
 assert.ok(e.effectiveCard(ally,s).speedAttacker);
 s.players[0].battle.splice(s.players[0].battle.indexOf(r),1);
 assert.ok(!e.effectiveCard(ally,s).speedAttacker);
});

test('Gachirobo Mk II deploys a single copy of the same Dream creature and keeps two on top (QA 48942)',()=>{
 const s=field(),own=s.players[0],r=add(s,0,'battle',ROBO);
 give(s,0,'deck',[DREAM,DREAM,DREAM,N,N,N]);
 const [first,second,third]=own.deck;
 attack(s,r.uid);
 assert.equal(s.decision.task.op,'g10_Next');
 assert.deepEqual(choice(s),[first.uid,second.uid,third.uid]);
 pick(s,second.uid);
 assert.deepEqual(own.deck.slice(0,2),[first,third]);
 assert.deepEqual(own.battle.filter(x=>x.cardId===DREAM),[second]);
 assert.ok(!own.g10Protected.length);
});

test('Gachirobo Mk II orders the reveal on a miss and deploys equal-cost creatures on a hit',()=>{
 for(const hit of [false,true]){
  const s=field(),own=s.players[0],r=add(s,0,'battle',ROBO);
  give(s,0,'deck',[N,hit?FIRE:HAND,WATER,N,N]);
  const [a,b,c,...tail]=own.deck;
  attack(s,r.uid);
  if(hit){
   assert.equal(s.decision.task.op,'g10_Next');pick(s,c.uid);pick(s,b.uid);
   assert.deepEqual(own.battle,[r,c,b,a]);
   assert.deepEqual(own.deck,tail);
  }else{
   assert.equal(s.decision.task.op,'g10_Order');pick(s,c.uid);pick(s,b.uid);
   assert.deepEqual(own.battle,[r]);
   assert.deepEqual(own.deck,[...tail,c,b,a]);
  }
 }
});
