import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const ARMOR='promoy19-003',CRYSTAL='dm25ex2-086',CLICK='dmex14-046';
const N='dm01-108',LIGHT='dm01-075',MAO='dm24rp1-013',MESSIAH='dmsd07-001';
const SASUKE='dmbd02-008',FAST='dm06-098',FUJIN='dmrp22-037';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const restore=s=>decodeBattleData(encodeBattleData(s));
const zoneHas=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function useShieldTrigger(s,source){
 const p=1-s.active;
 give(s,p,'shields',[source]);
 const shield=s.players[p].shields[0],attacker=add(s,s.active,'battle',N);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 return shield;
}

test('three official definitions and ten alternate prints retain canonical IDs, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1035.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ARMOR,CRYSTAL,CLICK]);
 assert.equal(m.printAliases.length,10);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=registry.get(row.id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  assert.equal(c.id,id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,id===CLICK?0:4);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1035}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
 assert.ok(e.validateDeck({cards:[{id:CLICK,count:1}]}).some(error=>error.includes('0枚まで')));
});

for(const accept of [false,true])test('Armor summons for free from a broken shield and may create one face-up shield '+accept,()=>{
 let s=Object.assign(setup(),{active:1});
 const target=add(s,0,'hand',CRYSTAL);
 const mana=s.players[0].mana.filter(x=>x.tapped).length;
 const armor=useShieldTrigger(s,ARMOR);
 assert.ok(zoneHas(s,0,'battle',armor));
 assert.equal(e.effectiveCard(s.players[0].battle[0],s).blocker,true);
 assert.deepEqual(values(s),[target.uid,null]);
 const all=physical(s);
 s=restore(s);
 choose(s,accept?target.uid:null);
 assert.equal(s.players[0].shields.length,Number(accept));
 assert.equal(zoneHas(s,0,'hand',target),!accept);
 if(accept){
  assert.equal(s.players[0].shields[0].uid,target.uid);
  assert.equal(s.players[0].shields[0].faceUp,true);
 }
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana);
 assert.deepEqual(physical(s),all);
});

test('Armor cannot move a hand card while shield placement is prohibited',()=>{
 const s=setup(),target=add(s,0,'hand',N),n=s.players[0].shields.length;
 add(s,1,'battle',FUJIN);
 cast(s,add(s,0,'hand',ARMOR));
 choose(s,target.uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,n);
 assert.ok(zoneHas(s,0,'hand',target));
});

for(const accept of [false,true])test('the colorless spell draws before its optional mana flip '+accept,()=>{
 let s=setup();
 give(s,0,'mana',[LIGHT,N]);
 const [mana,other]=s.players[0].mana,top=s.players[0].deck[0],spell=add(s,0,'hand',CRYSTAL);
 cast(s,spell);
 assert.ok(zoneHas(s,0,'hand',top));
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 s=restore(s);
 choose(s,accept?other.uid:null);
 const current=s.players[0].mana.find(x=>x.uid===other.uid);
 assert.equal(!!current.faceDown,accept);
 assert.equal(current.tapped,other.tapped);
 assert.equal(e.manaValueAt(s,0,current),1);
 if(accept)assert.equal(e.manaPayment(e.paymentPool(s,0),{cost:1,civilizations:['自然']}),null);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).tapped);
 assert.ok(zoneHas(s,0,'grave',spell));
});

test('the colorless spell is a free S-Trigger and still draws with no mana to flip',()=>{
 const s=Object.assign(setup(),{active:1}),top=s.players[0].deck[0];
 give(s,0,'mana',[]);
 const spell=useShieldTrigger(s,CRYSTAL);
 drain(s);
 assert.ok(zoneHas(s,0,'hand',top)&&zoneHas(s,0,'grave',spell));
 assert.equal(s.decision,null);
});

test('Click affects only existing enemies costing at most five and independently offers to return the grave',()=>{
 const s=setup(),small=add(s,1,'battle',MAO),big=add(s,1,'battle',MESSIAH);
 const ally=add(s,0,'battle',N),oldGrave=add(s,0,'grave',N),spell=add(s,0,'hand',CLICK);
 const deck=s.players[0].deck.map(x=>x.uid),all=physical(s);
 cast(s,spell);
 assert.ok(zoneHas(s,0,'grave',spell));
 assert.ok(e.attackLocked(s,1,small));
 assert.ok(!e.attackLocked(s,1,big)&&!e.attackLocked(s,0,ally));
 assert.deepEqual(values(s),[true,null]);
 choose(s,true);
 assert.deepEqual(s.players[0].deck.slice(0,deck.length).map(x=>x.uid),deck);
 assert.deepEqual(new Set(s.players[0].deck.slice(deck.length).map(x=>x.uid)),new Set([oldGrave.uid,spell.uid]));
 assert.equal(s.players[0].grave.length,0);
 attack(s,ally.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),[big.uid]);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.ok(e.attackLocked(s,1,small));
 act(s,'skipCharge');
 const late=add(s,1,'hand',FAST);
 cast(s,late);
 act(s,'toAttack');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===late.uid));
 end(s);
 assert.ok(!e.attackLocked(s,1,small));
 assert.deepEqual(physical(s),all.concat(late.uid).sort());
});

test('Click triggers on a discard even if the same ability moves it to mana before resolution',()=>{
 let s=setup();
 const click=add(s,0,'hand',CLICK),old=add(s,0,'grave',N),other=add(s,1,'grave',N),allBefore=physical(s);
 const sasuke=add(s,0,'hand',SASUKE);
 cast(s,sasuke);
 choose(s,click.uid);
 choose(s,click.uid);
 assert.ok(zoneHas(s,0,'mana',click));
 assert.deepEqual(values(s),[true,null]);
 s=restore(s);
 choose(s,true);
 assert.ok(zoneHas(s,0,'mana',click)&&zoneHas(s,1,'grave',other));
 assert.equal(s.players[0].deck.at(-1).uid,old.uid);
 assert.deepEqual(physical(s),allBefore.concat(sasuke.uid).sort());
});

test('Click works as a Shield Trigger and may leave its grave untouched',()=>{
 const s=Object.assign(setup(),{active:1}),target=add(s,1,'battle',FAST),old=add(s,0,'grave',N);
 const spell=useShieldTrigger(s,CLICK);
 assert.ok(e.attackLocked(s,1,target));
 assert.deepEqual(values(s),[true,null]);
 choose(s,null);
 assert.ok(zoneHas(s,0,'grave',spell)&&zoneHas(s,0,'grave',old));
});
