import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HAM='dm26rp2-074',BOLT='dm26rp2-051',GAI='dm26rp2-040',HATTER='dm24ex1-019';
const N='dm01-108',FIRE='dm01-097',BIG='dm01-001',HAND='dm01-027',COMMAND='dm26rp2-064';
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

test('three canonical definitions and four official printings preserve verified stats, images and IDs',()=>{
 const m=read('tools/support-phase-1144.json'),r=createCatalogue(snapshot,data.cards,details);
 const prints=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[HAM,BOLT,GAI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm26rp2-SEC024',HAM]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],canonical=m.cards.find(x=>x.id===id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1144}),canonical.spec);
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(r.get(row.id).id,id);
  assert.equal(r.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],canonical.image);
  assert.ok(prints.some(x=>x.id===row.id&&x.image===row.image));
 }
});

test('Hamkatsuman reveals three, must take a qualifying creature, and orders the rest',()=>{
 const s=field(),own=s.players[0],h=add(s,0,'hand',HAM);
 give(s,0,'deck',[N,BIG,HAND,N,N]);
 const [small,big,spell,...tail]=own.deck;
 add(s,1,'battle',N);
 play(s,h);
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.deepEqual(choice(s),[big.uid]);
 assert.ok(s.log.some(l=>l.type==='reveal'&&l.text.includes(e.card(spell).name)));
 pick(s,big.uid);
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,spell.uid);
 assert.deepEqual(own.hand,[big]);
 assert.deepEqual(own.deck,[...tail,spell,small]);
 assert.ok(!own.g34Protected.length);
 s.phase='attack';
 assert.ok(legal(s,'attack').some(a=>a.uid===h.uid&&a.target===s.players[1].battle[0].uid));
 assert.ok(!legal(s,'attack').some(a=>a.uid===h.uid&&a.target==='player'));
});

test('Hamkatsuman can Change from nature and still orders all revealed cards when none qualify',()=>{
 for(const eligible of [false,true]){
  const s=field(),own=s.players[0],h=add(s,0,'hand',HAM),attacker=add(s,0,'battle',eligible?N:FIRE);
  const target=add(s,1,'battle',N,{tapped:true});
  give(s,0,'deck',[N,HAND,FIRE,N,N]);
  const [a,b,c,...tail]=own.deck;
  attack(s,attacker.uid,target.uid);
  assert.equal(s.decision?.task?.op==='revDeclare',eligible);
  if(!eligible)continue;
  pick(s,true);pick(s,attacker.uid);
  assert.equal(s.decision.task.op,'g34_Order');
  pick(s,c.uid);pick(s,b.uid);
  assert.ok(own.battle.includes(h)&&own.hand.includes(attacker));
  assert.deepEqual(own.deck,[...tail,c,b,a]);
 }
});

test('Voltron must seal an own unsealed creature at its turn end, including itself',()=>{
 for(const self of [false,true]){
  const s=field(),own=s.players[0],v=add(s,0,'battle',BOLT),ally=add(s,0,'battle',N);
  const sealed=add(s,0,'battle',N,{sealed:true});
  add(s,0,'seals',N,{faceDown:true,sealOf:sealed.uid});
  add(s,1,'battle',N);
  const seal=own.deck[0],target=self?v:ally;
  assert.equal(e.effectiveCard(v,s).breaker,2);
  s.phase='attack';
  act(s,'endTurn');
  assert.equal(s.decision.task.op,'g34_Target');
  assert.deepEqual(new Set(choice(s)),new Set([v.uid,ally.uid]));
  pick(s,target.uid);
  assert.ok(target.sealed&&!((self?ally:v).sealed));
  assert.equal(own.seals.at(-1),seal);
  assert.equal(seal.faceDown,true);
  assert.equal(seal.sealOf,target.uid);
  if(!self)continue;
  s.active=0;s.phase='main';
  play(s,add(s,0,'hand',COMMAND));
  assert.equal(s.decision.task.op,'g23_Unseal');
  pick(s,seal.uid);pick(s,null);
  assert.ok(!v.sealed&&own.grave.includes(seal));
 }
});

test('Voltron never seals at the opponent turn end',()=>{
 const s=field(),v=add(s,0,'battle',BOLT);
 s.active=1;s.phase='attack';
 act(s,'endTurn');
 assert.ok(!v.sealed&&!s.players[0].seals.length);
});

test('Gaigunshin counts tapped fire mana, uses the total current power, and can stop after one choice',()=>{
 for(const [count,takeTwo] of [[2,false],[3,false],[3,true]]){
  const s=field(),own=s.players[0],g=add(s,0,'hand',GAI);
  give(s,0,'mana',[...Array(count).fill(FIRE),...Array(5).fill(N)]);
  own.mana[0].tapped=true;
  const a=add(s,1,'battle',N,{powerModifiers:[{amount:2000}]}),
   b=add(s,1,'battle',N,{powerModifiers:[{amount:2000}]}),
   large=add(s,1,'battle',BIG);
  play(s,g);
  const power=count===3?8000:4000;
  assert.equal(e.power(g,false,s),power);
  assert.equal(e.effectiveCard(g,s).breaker??1,count===3?2:1);
  assert.equal(s.decision.task.g506PowerBudget,power);
  assert.deepEqual(new Set(choice(s)),new Set([a.uid,b.uid,null]));
  pick(s,a.uid);
  if(count===3){
   assert.deepEqual(new Set(choice(s)),new Set([b.uid,null]));
   assert.ok(s.players[1].battle.includes(a));
   pick(s,takeTwo?b.uid:null);
  }
  assert.ok(s.players[1].grave.includes(a)&&s.players[1].battle.includes(large));
  assert.equal(s.players[1].grave.includes(b),takeTwo);
  own.mana.find(x=>x.cardId===FIRE).faceDown=true;
  assert.equal(e.power(g,false,s),4000);
  assert.equal(e.effectiveCard(g,s).breaker??1,1);
 }
});

test('Gaigunshin uses its last battlefield power after Hatter destroys the shield-trigger summon (QA 45925)',()=>{
 const s=field(),own=s.players[0];
 give(s,0,'mana',[FIRE,FIRE,FIRE]);
 give(s,0,'shields',[GAI]);
 const [g]=own.shields;
 const hatter=add(s,1,'battle',HATTER),other=add(s,1,'battle',N,{powerModifiers:[{amount:3000}]});
 s.active=1;
 attack(s,hatter.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===g.uid);
 assert.ok(own.grave.includes(g));
 assert.equal(s.decision.task.g506PowerBudget,8000);
 assert.deepEqual(new Set(choice(s)),new Set([hatter.uid,other.uid,null]));
 pick(s,other.uid);pick(s,hatter.uid);
 assert.ok(s.players[1].grave.includes(hatter)&&s.players[1].grave.includes(other));
});
