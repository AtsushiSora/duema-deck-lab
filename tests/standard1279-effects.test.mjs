import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FIVE='dm38-006',GLASSES='dm22rp2-024',LETTER='dm22rp2-040',FISH='dm22rp2-034';
const NATURE='dm01-108',WATER='dm01-083',LIGHT='dm01-075',SEED='dmsd20-016',GEAR='dm14-046';
const BOUNCE='dmrp20-036',SPIRAL='dm01-086',TRIGGER='dm01-027',DARK='dm01-090';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);return x;
}
const values=s=>s.decision.choices.map(c=>c.value);
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const choose=(s,value)=>pick(s,v=>(v?.uid??v)===value);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};

test('four definitions and eight official printings resolve to the same four original IDs',()=>{
 const m=read('tools/support-phase-1279.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[FIVE,GLASSES,LETTER,FISH]);
 assert.equal(m.printAliases.length,4);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const printed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(printed,{phase:1279}),row.spec);
  const changed=structuredClone(printed);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1279}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id:canonicalId,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

for(const amount of [0,1,2])test('Five Star puts '+amount+' top cards beneath one shield on a 4500 entrant (QA 36157 and 36159)',()=>{
 const s=field();give(s,0,'mana',Array(15).fill(LIGHT));
 const five=play(s,FIVE);
 assert.equal(s.decision,null);
 const top=s.players[0].deck.slice(0,2),shield=s.players[0].shields[0];
 const entrant=play(s,'dm14-042');
 assert.equal(e.power(entrant,false,s),4500);
 assert.equal(s.decision.source,FIVE);
 if(amount===0)choose(s,null);
 else pick(s,v=>v?.group===shield.uid&&v.amount===amount);
 assert.equal(s.players[0].shields.length,5);
 assert.deepEqual((shield.shieldStack||[]).map(x=>x.uid),top.slice(0,amount).map(x=>x.uid));
 assert.ok((shield.shieldStack||[]).every(x=>!x.faceUp));
 assert.ok(has(s,0,'battle',five));
 s.active=1;const rival=add(s,1,'battle',NATURE);
 s.phase='attack';act(s,'attack',a=>a.uid===rival.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.players[0].shields.length,4);
 assert.ok([shield,...top.slice(0,amount)].every(x=>has(s,0,'hand',x)));
});

test('Crossing Shining Defense after a 2000 ally enters does not trigger Five Star (QA 36158)',()=>{
 const s=field(),five=play(s,FIVE),gear=play(s,GEAR),plain=play(s,NATURE);
 assert.equal(s.decision,null);
 assert.equal(e.power(plain,false,s),2000);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===plain.uid);
 assert.equal(e.power(plain,false,s),3500);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',five)&&s.players[0].shields.every(x=>!x.shieldStack));
});

function glassesField(active=0,{civil=true}={}){
 const s=field(active),rival=1-active,glasses=add(s,active,'battle',GLASSES);
 add(s,active,'battle',NATURE);
 add(s,civil?active:rival,'battle',SEED);
 give(s,rival,'shields',[TRIGGER,NATURE,NATURE]);
 return {s,rival,glasses};
}
test('Glasses counts its own Nature seed, moves the full shield bundle to mana, and offers no trigger',()=>{
 const {s,rival,glasses}=glassesField(1);
 const root=s.players[rival].shields[0],added=inst('dm22ex2-024');
 root.shieldStack=[added];
 attack(s,glasses.uid);if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision,null);
 assert.ok(has(s,rival,'mana',root)&&has(s,rival,'mana',added));
 assert.ok(!root.tapped&&added.tapped);
 assert.ok(!has(s,rival,'hand',root));
 assert.equal(s.players[rival].brokenThisTurn,1);
});
test('Glasses does not count the opponent’s seed and leaves the shield trigger usable',()=>{
 const {s,rival,glasses}=glassesField(0,{civil:false});
 attack(s,glasses.uid);if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision?.type,'trigger');
 assert.equal(s.decision?.source,TRIGGER);
 assert.equal(s.players[rival].brokenThisTurn,1);
});
test('Glasses also redirects the extra shield from Bajula’s Soul (QA 42497)',()=>{
 const {s,rival,glasses}=glassesField();
 const gear=add(s,0,'battle','dm15-s04');
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===glasses.uid);
 const shields=s.players[rival].shields.slice(0,2);
 attack(s,glasses.uid);if(s.decision?.task?.op==='g34_Select')choose(s,null);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>shields.every(x=>a.shields.includes(x.uid)));
 assert.ok(shields.every(x=>has(s,rival,'mana',x)));
 assert.equal(s.players[rival].shields.length,1);
 assert.equal(s.players[rival].brokenThisTurn,2);
});

test('Letter can bottom its creature and then offers a separate optional draw',()=>{
 const s=field(),letter=play(s,LETTER),plain=add(s,0,'battle',NATURE);
 const top=s.players[0].deck[0];
 end(s);choose(s,plain.uid);
 assert.equal(s.players[0].deck.at(-1).uid,plain.uid);
 assert.deepEqual(values(s),[0,1]);choose(s,1);drain(s);
 assert.ok(has(s,0,'hand',top)&&has(s,0,'battle',letter));
});
test('Letter still offers a draw after an earlier departure when its optional move is declined',()=>{
 const s=field(),lost=add(s,0,'battle',WATER);
 cast(s,SPIRAL);act(s,'effect',a=>a.targets[0].uid===lost.uid);
 const letter=play(s,LETTER),stays=add(s,0,'battle',NATURE);
 end(s);choose(s,null);
 assert.deepEqual(values(s),[0,1]);choose(s,0);drain(s);
 assert.ok(has(s,0,'battle',stays)&&has(s,0,'battle',letter));
});
test('Letter offers no draw when an EX Life replacement prevents its only departure',()=>{
 const s=field(),letter=play(s,LETTER),shield=s.players[0].shields[0];
 const host=add(s,0,'battle','dm22ex1-057',{exLifeShieldUid:shield.uid});
 end(s);choose(s,host.uid);drain(s);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'battle',host)&&has(s,0,'battle',letter));
 assert.equal(s.players[0].hand.length,0);
});

test('Fish protected by Tamaseed use cannot be selected by either player until its next turn',()=>{
 const s=field(),fish=add(s,0,'battle',FISH),ally=add(s,0,'battle',WATER);
 play(s,LETTER);drain(s);
 assert.equal(e.effectiveCard(fish,s).g1082ChoiceProtected,true);
 cast(s,SPIRAL);
 assert.ok(!s.decision.targets.some(x=>x.uid===fish.uid));act(s,'effect',a=>a.targets[0].uid===ally.uid);
 end(s);drain(s);s.phase='main';cast(s,BOUNCE);drain(s);
 assert.ok(has(s,0,'battle',fish));
 end(s);drain(s);
 assert.equal(e.effectiveCard(fish,s).g1082ChoiceProtected,undefined);
});
test('Fish reacts to its controller’s spell and takes every Tamaseed and spell from the revealed cards',()=>{
 const s=field(),fish=add(s,0,'battle',FISH);
 cast(s,'dm01-085');drain(s);
 assert.equal(e.effectiveCard(fish,s).g1082ChoiceProtected,true);
 give(s,0,'deck',[LETTER,SPIRAL,NATURE,WATER,NATURE]);
 const [seed,spell,rest]=s.players[0].deck;
 attack(s,fish.uid);drain(s);
 assert.ok(has(s,0,'hand',seed)&&has(s,0,'hand',spell));
 assert.equal(s.players[0].deck.at(-1).uid,rest.uid);
});
test('Fish orders all remaining revealed cards when none is eligible',()=>{
 const s=field(),fish=add(s,0,'battle',FISH);
 give(s,0,'deck',[LIGHT,WATER,NATURE,DARK,NATURE]);
 const [first,second,third]=s.players[0].deck;
 attack(s,fish.uid);
 choose(s,third.uid);choose(s,first.uid);drain(s);
 assert.deepEqual(s.players[0].deck.slice(-3).map(x=>x.uid),[third.uid,first.uid,second.uid]);
 assert.equal(s.players[0].hand.length,0);
});
