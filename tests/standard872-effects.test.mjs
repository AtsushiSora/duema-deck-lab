import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const PANIC='dmr05-015',HEAVENS='dmr06-008',WIND='dmr05-016';
const HEAVENS_PRINT='dmx16-013',WIND_PRINT='dmex07-010';
const SMALL='dm01-108',FIRE='dm01-097',LARGE='dm01-079',ANGEL='dm01-s01',EVO='dmr05-017';
const HAND='dm01-027',SURFER='dm05-024',SEED='dmsd20-016',FUUJIN='dmrp22-037';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
  give(s,p,'mana',Array(7).fill('dm01-075'));
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
const logShield=(s,cardId)=>s.log.some(x=>x.type==='shieldHand'&&x.cardId===cardId);

test('Phase 872 pins three complete definitions and resolves both reprints to the original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-872.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PANIC,HEAVENS,WIND]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[HEAVENS_PRINT,HEAVENS],[WIND_PRINT,WIND]]);
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(registry.resolveRows([{id,count:1},{id:canonicalId,count:3}]),[{id:canonicalId,count:4}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:872}),m.cards.find(x=>x.id===canonicalId).spec);
 }
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:872}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:871}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:872}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.manaValue,c.limit],['spell',f.cost,['光'],1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Panic Room can recover the shield it creates and does not count it as a break',()=>{
 let s=field();
 const target=add(s,1,'battle',SMALL),evo=add(s,1,'battle',EVO),ally=add(s,0,'battle',FIRE);
 add(s,1,'battle',SEED);
 cast(s,PANIC);
 assert.deepEqual(values(s),[target.uid]);
 pick(s,target);
 const shield=s.players[1].shields.at(-1);
 assert.equal(shield.uid,target.uid);
 assert.ok(!shield.faceUp);
 assert.ok(s.decision.choices.every(c=>c.cardId===undefined));
 s=restore(s);
 pick(s,shield);
 assert.ok(has(s,1,'hand',target)&&has(s,1,'battle',evo)&&has(s,0,'battle',ally));
 assert.ok(!has(s,1,'shields',target));
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.players[1].brokenThisTurn||0,0);
 assert.ok(logShield(s,PANIC));
});

test('Panic Room lets the opponent cast the recovered Shield Trigger even with no legal creature',()=>{
 const s=field(),ally=add(s,0,'battle',SMALL);
 give(s,1,'shields',[HAND,SMALL]);
 const shield=s.players[1].shields[0];
 cast(s,PANIC);
 assert.deepEqual(values(s),ids(s.players[1].shields));
 pick(s,shield);
 assert.equal(s.decision.player,1);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===ally.uid));
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',shield));
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.decision,null);
});

test('Panic Room can be cast from a broken shield and opens a nested opponent trigger',()=>{
 let s=field();
 const attacker=add(s,0,'battle',SMALL),spare=add(s,1,'battle',FIRE);
 give(s,0,'shields',[SURFER,SMALL]);
 give(s,1,'shields',[PANIC,SMALL]);
 const reply=s.players[0].shields[0],panic=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===panic.uid);
 pick(s,attacker);
 pick(s,reply);
 s=restore(s);
 act(s,'useTrigger',a=>a.uid===reply.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===spare.uid));
 drain(s);
 assert.ok(has(s,0,'shields',attacker)&&has(s,0,'battle',reply)&&has(s,1,'hand',spare));
 assert.equal(s.metrics[0].breaks,1);
 assert.equal(s.metrics[1].breaks,0);
 assert.ok(!s.triggers&&!s.g19Interrupt&&!s.attack);
});

test('True Heavens requires one target with four Angel Commands and ignores a sealed fifth one',()=>{
 const s=field();
 for(let i=0;i<4;i++)add(s,0,'battle',ANGEL);
 const sealed=add(s,0,'battle',ANGEL);
 add(s,0,'seals',SMALL,{sealOf:sealed.uid,faceDown:true});
 const target=add(s,1,'battle',FIRE),evo=add(s,1,'battle',EVO);
 cast(s,HEAVENS);
 assert.deepEqual(values(s),[target.uid]);
 pick(s,target);
 assert.equal(s.players[1].shields.at(-1).uid,target.uid);
 assert.ok(has(s,1,'battle',evo));
 assert.equal(s.decision,null);
});

test('True Heavens selects up to three distinct creatures before moving any and allows zero',()=>{
 for(const count of [0,2,3]){
  let s=field();
  for(let i=0;i<5;i++)add(s,0,'battle',ANGEL);
  const targets=[SMALL,FIRE,LARGE,ANGEL].map(id=>add(s,1,'battle',id));
  add(s,1,'battle',EVO);
  const initial=s.players[1].shields.length;
  cast(s,HEAVENS);
  for(const target of targets.slice(0,count)){
   assert.equal(s.players[1].shields.length,initial);
   pick(s,target);
   s=restore(s);
   if(s.decision)assert.ok(!values(s).includes(target.uid));
  }
  if(count<3)pick(s,null);
  assert.deepEqual(ids(s.players[1].shields.slice(initial)),ids(targets.slice(0,count)));
  assert.ok(s.players[1].shields.slice(initial).every(x=>!x.faceUp));
  assert.ok(targets.slice(count).every(x=>has(s,1,'battle',x)));
 }
});

test('True Heavens can be cast for free as a Shield Trigger against an attacker',()=>{
 const s=field(),attacker=add(s,0,'battle',SMALL);
 give(s,1,'mana',[]);
 give(s,1,'shields',[HEAVENS,SMALL]);
 const trigger=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 pick(s,attacker);
 drain(s);
 assert.ok(has(s,0,'shields',attacker)&&has(s,1,'grave',trigger));
});

test('Lionel Wind shields all eligible creatures on both sides and uses current power',()=>{
 const s=field();
 const a=add(s,0,'battle',SMALL),b=add(s,0,'battle',FIRE);
 const buffed=add(s,0,'battle',SMALL,{powerModifiers:[{amount:1000,expires:'end',who:0}]});
 const weakened=add(s,1,'battle',LARGE,{powerModifiers:[{amount:-2000,expires:'end',who:0}]});
 const c=add(s,1,'battle',SMALL);
 const evo=add(s,1,'battle',EVO,{powerModifiers:[{amount:-3000,expires:'end',who:0}]});
 const sealed=add(s,1,'battle',FIRE),seed=add(s,1,'battle',SEED);
 add(s,1,'seals',SMALL,{sealOf:sealed.uid,faceDown:true});
 cast(s,WIND);
 assert.deepEqual(ids(s.players[0].shields.slice(5)),ids([a,b]));
 assert.deepEqual(ids(s.players[1].shields.slice(5)),ids([weakened,c]));
 assert.deepEqual(ids(s.players[0].battle),ids([buffed]));
 assert.deepEqual(ids(s.players[1].battle),ids([evo,sealed,seed]));
 assert.ok(s.players.every(p=>p.shields.slice(5).every(x=>!x.faceUp)));
 assert.equal(s.players[0].grave.at(-1).cardId,WIND);
});

test('Lionel Wind respects a prohibition on adding shields without blocking the other side',()=>{
 const s=field(),ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',FIRE);
 add(s,1,'battle',FUUJIN);
 cast(s,WIND);
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'shields',enemy));
});
