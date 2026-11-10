import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const KOB='dmr06-023',ELA='dmr05-090',AQUA='dmr05-s05',NUKE='dmr05-105';
const SMALL='dm01-108',WATER='dm01-083',LARGE='dm01-079',EIGHT='dm03-s03';
const HAND='dm01-027',SPIRAL='dm01-086',HEAVENS='dmr06-008',WIND='dmr05-016',TWIN='dm22ex1-030';
const QX='dmrp07-m01';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
  give(s,p,'mana',[...Array(5).fill(WATER),'dm01-075','dm01-090','dm01-097']);
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const result=s=>s.log.filter(x=>x.type==='judgeResult').at(-1)?.text;
function judgeDecks(s,first,second){
 give(s,0,'deck',[first,SMALL,SMALL]);
 give(s,1,'deck',[second,SMALL,SMALL]);
}

test('Phase 873 pins the three complete official definitions without duplicating Nukeppi',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-873.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KOB,ELA,AQUA]);
 assert.deepEqual(m.printAliases,[]);
 assert.equal(e.card(NUKE).supportBatch,'phase-206');
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:873}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:872}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:873}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Koborun wins tied costs and returns itself and an enemy together after both choices',()=>{
 let s=field();
 judgeDecks(s,SMALL,SMALL);
 const tops=s.players.map(p=>p.deck[0]),enemy=add(s,1,'battle',LARGE),self=add(s,0,'hand',KOB);
 act(s,'play',a=>a.uid===self.uid);
 assert.match(result(s),/2 対 2、勝ち/);
 assert.ok(s.players.every((p,i)=>p.deck.at(-1).uid===tops[i].uid));
 assert.ok(values(s).includes(self.uid)&&values(s).includes(enemy.uid));
 pick(s,self);
 assert.ok(has(s,0,'battle',self)&&has(s,1,'battle',enemy));
 assert.ok(!values(s).includes(self.uid));
 s=restore(s);
 pick(s,enemy);
 assert.ok(has(s,0,'hand',self)&&has(s,1,'hand',enemy));
 assert.equal(s.judge,null);
});

test('Koborun can decline a win and cannot select a target after a loss',()=>{
 for(const outcome of ['decline','loss']){
  const s=field(),enemy=add(s,1,'battle',SMALL);
  judgeDecks(s,SMALL,outcome==='loss'?EIGHT:SMALL);
  cast(s,KOB);
  if(outcome==='decline')pick(s,null);
  assert.match(result(s),outcome==='decline'?/勝ち/:/負け/);
  assert.ok(has(s,1,'battle',enemy));
  assert.equal(s.decision,null);
 }
});

test('Aqua adds three to a tie, bounces all opposing creatures costing up to six before blocking, and breaks two shields',()=>{
 const s=field(),aqua=add(s,0,'battle',AQUA),ally=add(s,0,'battle',SMALL);
 const six=add(s,1,'battle','dm01-001',{g34Grants:[{turn:s.turn,untargetable:true}]});
 const small=add(s,1,'battle',SMALL),large=add(s,1,'battle',EIGHT);
 judgeDecks(s,KOB,EIGHT);
 attack(s,aqua.uid);
 assert.match(result(s),/8 対 8、勝ち/);
 assert.ok(has(s,1,'hand',six)&&has(s,1,'hand',small));
 assert.ok(has(s,1,'battle',large)&&has(s,0,'battle',ally));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===six.uid));
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
});

test('Aqua adds its bonus to the chosen twinpact cost during an opponent-initiated judge and copies stack',()=>{
 let s=field();
 const one=add(s,0,'battle',AQUA),two=add(s,0,'battle',AQUA);
 s.active=1;
 judgeDecks(s,TWIN,EIGHT);
 cast(s,KOB);
 assert.equal(s.decision.type,'judgeCost');
 assert.equal(s.decision.player,0);
 s=restore(s);
 act(s,'judgeCost',a=>a.cost===3);
 assert.match(result(s),/8 対 9、負け/);
 assert.ok(has(s,0,'battle',one)&&has(s,0,'battle',two));
 assert.equal(s.decision,null);
});

test('Aqua ignores sealed copies and does not modify a card that cannot be revealed',()=>{
 for(const locked of [false,true]){
  const s=field(),aqua=add(s,0,'battle',AQUA),sealed=add(s,0,'battle',AQUA),enemy=add(s,1,'battle',SMALL);
  add(s,0,'seals',SMALL,{sealOf:sealed.uid,faceDown:true});
  if(locked)add(s,1,'battle',QX);
  judgeDecks(s,SMALL,EIGHT);
  const top=s.players[0].deck[0].uid;
  attack(s,aqua.uid);
  assert.match(result(s),locked?/no-card 対 8、負け/:/5 対 8、負け/);
  assert.equal(s.players[0].deck[locked?0:2].uid,top);
  assert.ok(has(s,1,'battle',enemy));
 }
});

test('Elappi excludes only opponent selection from spells costing six or less',()=>{
 for(const spell of [HAND,HEAVENS,WIND]){
  const s=field(),ela=add(s,1,'battle',ELA),other=add(s,1,'battle',SMALL);
  cast(s,spell);
  if(spell===HAND){
   const targets=e.getLegalActions(s).flatMap(a=>a.targets||[]);
   assert.deepEqual(targets.map(t=>t.uid),[other.uid]);
   act(s,'effect',a=>a.targets.some(t=>t.uid===other.uid));
   assert.ok(has(s,1,'battle',ela));
  }else if(spell===HEAVENS){
   assert.ok(values(s).includes(ela.uid));
   pick(s,ela);
   assert.ok(has(s,1,'shields',ela));
  }else assert.ok(has(s,1,'shields',ela));
 }
 const own=field(),ela=add(own,0,'battle',ELA);
 cast(own,SPIRAL);
 act(own,'effect',a=>a.targets.some(t=>t.uid===ela.uid));
 assert.ok(has(own,0,'hand',ela));

 const byCreature=field(),target=add(byCreature,1,'battle',ELA);
 judgeDecks(byCreature,SMALL,SMALL);
 cast(byCreature,KOB);
 pick(byCreature,target);
 if(byCreature.decision)pick(byCreature,null);
 assert.ok(has(byCreature,1,'hand',target));
});

test('Elappi Hunting counts itself and live allied Hunters only during battle',()=>{
 for(const sealed of [false,true]){
  const s=field(),ela=add(s,0,'battle',ELA),ally=add(s,0,'battle',NUKE);
  const target=add(s,1,'battle',LARGE,{tapped:true,powerModifiers:[{amount:-500,expires:'end',who:0}]});
  add(s,1,'battle',NUKE);
  if(sealed)add(s,0,'seals',SMALL,{sealOf:ally.uid,faceDown:true});
  assert.equal(e.power(ela,true,s),2000);
  attack(s,ela.uid,target.uid);
  drain(s);
  assert.equal(has(s,0,'battle',ela),!sealed);
  assert.equal(has(s,1,'battle',target),sealed);
 }
});
