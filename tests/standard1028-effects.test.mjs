import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const SWORD='dmrp04m-026', EYE='dmbd04-008', GATE='dmbd07-b-004', RAGE='dmrp06-065';
const NATURE='dm01-108', METALLICA='dmrp11-069', TWIN='dmrp08-mh05', BLOCKER='dm01-084', DARK_BLOCKER='dm01-089';
const CYCLE='dm22ex1-018', GENMU='dmrp15-km1', UNTARGETABLE='dm23ex1-003';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));

function add(s,p,zone,id,props={}){
 const card=Object.assign(inst(id),props);
 s.players[p][zone].push(card);
 return card;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,card)=>act(s,'play',a=>a.uid===card.uid&&!a.alternative);
const restored=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const chooseShield=(s,root)=>choose(s,root.shieldGroup||root.uid);
function pass(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
}

test('four verified definitions and seven reprints preserve catalogue IDs and art',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),m=read('tools/support-phase-1028.json');
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[SWORD,EYE,GATE,RAGE]);
 assert.equal(m.printAliases.length,7);
 for(const row of m.cards){
  const c=registry.get(row.id);
  assert.equal(c.supported,true);
  assert.equal(c.cost,row.faces[0].cost);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[c.id],row.image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).length,1);
 }
 for(const alias of m.printAliases){
  const canonical=m.cards.find(c=>c.id===alias.canonicalId);
  assert.equal(registry.get(alias.id).id,canonical.id);
  assert.deepEqual(standardCardSpec({...alias,status:'complete'},{phase:1028}),canonical.spec);
  assert.deepEqual(refs.find(x=>x.id===alias.id),{
   id:alias.id,canonicalId:canonical.id,name:canonical.name,image:alias.image,source:alias.source
  });
 }
});

for(const selection of ['spell','creature','none'])test('Sword inspects three, reveals only a valid card taken, and orders the rest '+selection,()=>{
 let s=setup();
 give(s,0,'deck',[NATURE,TWIN,METALLICA,RAGE,NATURE]);
 give(s,0,'shields',[NATURE]);
 const [wrong,twin,metal,next,last]=s.players[0].deck;
 const selected=selection==='spell'?twin:selection==='creature'?metal:null;
 const before=physical(s),spell=add(s,0,'hand',SWORD),all=physical(s);
 assert.equal(all.length,before.length+1);
 cast(s,spell);
 assert.deepEqual(values(s),[twin.uid,metal.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[NATURE,TWIN,METALLICA]);
 choose(s,selected?.uid??null);
 s=restored(s);
 const rest=[metal,twin,wrong].filter(x=>x!==selected);
 for(const card of rest.slice(0,-1))choose(s,card.uid);
 chooseShield(s,s.players[0].shields[0]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[next.uid,last.uid,...rest.map(x=>x.uid)]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),selected?[selected.uid]:[]);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),selected?[selected.cardId]:[]);
 assert.deepEqual(s.players[0].shields[0].shieldStack.map(x=>[x.uid,x.faceUp]),[[spell.uid,true]]);
 assert.deepEqual(physical(s),all);
});

test('Eye targets one opposing creature and skips only its next start untap',()=>{
 const s=setup(),target=add(s,1,'battle',NATURE),ally=add(s,0,'battle',NATURE);
 const protectedUnit=add(s,1,'battle',UNTARGETABLE,{justDiverActive:true});
 const spell=add(s,0,'hand',EYE);
 cast(s,spell);
 assert.deepEqual(values(s),[target.uid]);
 choose(s,target.uid);
 chooseShield(s,s.players[0].shields[0]);
 assert.equal(target.tapped,true);
 assert.equal(ally.tapped,false);
 assert.equal(protectedUnit.tapped,false);
 pass(s);
 assert.equal(s.active,1);
 assert.equal(target.tapped,true);
 pass(s);
 pass(s);
 assert.equal(target.tapped,false);
});

for(const remaining of [0,1])test('Eye can trigger from a face-up stack, and can reattach only with a shield remaining '+remaining,()=>{
 const s=Object.assign(setup(),{active:1});
 give(s,0,'mana',[]);
 give(s,0,'shields',Array(remaining+1).fill(NATURE));
 const [broken,keep]=s.players[0].shields,spell={...inst(EYE),faceUp:true,shieldCardOnly:true};
 broken.shieldStack=[spell];
 const attacker=add(s,1,'battle',NATURE),target=add(s,1,'battle',NATURE);
 const before=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 choose(s,target.uid);
 if(keep)chooseShield(s,keep);
 assert.equal(target.tapped,true);
 assert.equal(inZone(s,0,'grave',spell),!keep);
 if(keep)assert.deepEqual(keep.shieldStack.map(x=>[x.uid,x.faceUp]),[[spell.uid,true]]);
 assert.deepEqual(physical(s),before);
});

for(const deploy of [true,false])test('Gate draws before offering one hand blocker of any civilization '+deploy,()=>{
 let s=setup();
 give(s,0,'deck',[BLOCKER,NATURE,NATURE]);
 const drawn=s.players[0].deck[0];
 const other=add(s,0,'hand',DARK_BLOCKER),ineligible=add(s,0,'hand',NATURE);
 const spell=add(s,0,'hand',GATE),before=physical(s);
 cast(s,spell);
 assert.deepEqual(values(s),[other.uid,drawn.uid,null]);
 s=restored(s);
 choose(s,deploy?drawn.uid:null);
 chooseShield(s,s.players[0].shields[0]);
 assert.equal(inZone(s,0,'battle',drawn),deploy);
 assert.equal(inZone(s,0,'hand',drawn),!deploy);
 assert.ok(inZone(s,0,'hand',other)&&inZone(s,0,'hand',ineligible));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 assert.deepEqual(physical(s),before);
});

test('Rage draws exactly one and attaches to the chosen shield group from hand',()=>{
 const s=setup(),top=s.players[0].deck[0],root=s.players[0].shields[1],spell=add(s,0,'hand',RAGE);
 cast(s,spell);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top.uid]);
 chooseShield(s,root);
 assert.deepEqual(root.shieldStack.map(x=>[x.uid,x.faceUp]),[[spell.uid,true]]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});

test('Rage from grave draws but keeps the external deck destination, and ignored Rage cannot draw or attach',()=>{
 const s=setup(),top=s.players[0].deck[0],rage=add(s,0,'grave',RAGE);
 cast(s,add(s,0,'hand',CYCLE));
 choose(s,rage.uid);
 drain(s);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top.uid]);
 assert.equal(s.players[0].deck.at(-1).uid,rage.uid);
 assert.ok(s.players[0].shields.every(root=>!root.shieldStack?.length));
 const ignored=setup(),spell=add(ignored,0,'hand',RAGE),size=ignored.players[0].deck.length;
 add(ignored,1,'battle',GENMU);
 cast(ignored,spell);
 assert.equal(ignored.decision,null);
 assert.equal(ignored.players[0].deck.length,size);
 assert.ok(inZone(ignored,0,'grave',spell));
});
