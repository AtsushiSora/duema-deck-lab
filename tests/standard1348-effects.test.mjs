import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {shieldCards,shieldGroup} from '../dist/shield-state.js';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const JUSTICE='dmex19-025',SABAKI='dmbd07-b-005',CREST='dmbd04-008',XX='dmrp20-009';
const BASIC='dm01-108',OTHER_TRIGGER='dm01-027',FIRE='dm01-097',DRAGON='dm01-008';
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return (x?.uid??x)===(v?.uid??v);});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const read=file=>JSON.parse(readFileSync(new URL('../tools/'+file,import.meta.url)));

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}

test('Justice and Shuketsu each keep their original identity and official reprint',()=>{
 const m=read('support-phase-1348.json'),refs=read('image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[JUSTICE,SABAKI]);
 assert.equal(m.printAliases.length,2);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(y=>nameKey(y.name)===nameKey(row.name)).map(y=>y.id),[id]);
  assert.deepEqual([c.type,c.cost,c.race,c.civilizations,c.limit],['spell',f.cost,f.race,['光'],4]);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
 }
});

test('Justice draws one and finishes face up over a chosen shield',()=>{
 const s=field(),shield=s.players[0].shields[0],top=s.players[0].deck[0],justice=add(s,0,'hand',JUSTICE);
 act(s,'play',a=>a.uid===justice.uid);
 assert.ok(has(s,0,'hand',top));
 pick(s,shieldGroup(shield));
 assert.ok(shieldCards(shield).some(x=>x.uid===justice.uid&&x.faceUp));
 assert.equal(s.players[0].shields.length,5);
 assert.ok(!has(s,0,'grave',justice));
});

test('a Crest stays castable under an active prohibition until Justice is turned face down',()=>{
 const s=field(),justice=s.players[0].shields[0];
 justice.cardId=JUSTICE;
 justice.faceUp=true;
 s.extLimits=[{kind:'cast',player:0}];
 assert.equal(e.canCastSpell(s,0,e.card(CREST),'hand'),true);
 assert.equal(e.canCastSpell(s,0,e.card(OTHER_TRIGGER),'hand'),false);
 justice.faceUp=false;
 assert.equal(e.canCastSpell(s,0,e.card(CREST),'hand'),false);
});

test('XXDDZ lets the bundled Crest declare S-Trigger before Justice leaves but it cannot cast (QA44311)',()=>{
 let s=field();
 cast(s,XX);
 const x=s.players[0].battle[0],[life]=e.exLifeShields(s,0,x);
 const crest=inst(CREST),justice=Object.assign(inst(JUSTICE),{faceUp:true}),sabaki=add(s,1,'hand',SABAKI);
 crest.shieldStack=[justice];
 s.players[1].shields=[crest];
 attack(s,x.uid);
 pick(s,life.uid);
 assert.ok(has(s,0,'grave',life));
 act(s,'noBlock');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===crest.uid));
 s=JSON.parse(JSON.stringify(s));
 act(s,'useTrigger',a=>a.uid===crest.uid);
 assert.ok(has(s,1,'hand',crest)&&has(s,1,'hand',justice)&&has(s,1,'hand',sabaki));
 assert.ok(!has(s,1,'grave',justice)&&!has(s,1,'grave',crest));
 assert.ok(s.log.some(event=>event.type==='spellPrevented'&&event.cardId===CREST));
 assert.ok(!s.decision||s.decision.type!=='extended');
});

test('Sabaki actually discards the shield Crest, picks all eligible reveals, and stacks the spell',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),sabaki=add(s,1,'hand',SABAKI);
 const crest=inst(JUSTICE),remain=inst(FIRE);
 s.players[1].shields=[crest,remain];
 give(s,1,'deck',[DRAGON,BASIC,FIRE,BASIC,BASIC]);
 const [dragon,nonmatch]=s.players[1].deck;
 attack(s,attacker.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.uids.includes(crest.uid));
 assert.equal(s.decision.task.op,'g34_SabakiPay1348');
 pick(s,true);
 assert.ok(has(s,1,'grave',crest));
 assert.ok(has(s,1,'hand',dragon)&&!has(s,1,'hand',nonmatch));
 assert.equal(s.players[1].deck.at(-1).uid,nonmatch.uid);
 pick(s,shieldGroup(remain));
 drain(s);
 assert.ok(shieldCards(remain).some(x=>x.uid===sabaki.uid&&x.faceUp));
});

test('Sabaki pays during declaration, then resolves with an ordinary Shield Trigger in either order',()=>{
 for(const sabakiFirst of [false,true]){
  const s=field(),attacker=add(s,0,'battle',FIRE),sabaki=add(s,1,'hand',SABAKI);
  const crest=inst(CREST),justice=inst(JUSTICE),remain=inst(BASIC);
  crest.shieldStack=[justice];
  s.players[1].shields=[crest,remain];
  attack(s,attacker.uid);act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.uids.includes(crest.uid));
  act(s,'useTrigger',a=>a.uid===crest.uid);
  assert.equal(s.decision?.task?.payment,crest.uid);
  pick(s,null);
  assert.equal(s.decision?.task?.payment,justice.uid);
  pick(s,true);
  assert.ok(has(s,1,'grave',justice));
  assert.equal(s.decision.type,'triggerOrder');
  assert.deepEqual(new Set(e.getLegalActions(s).map(a=>a.uid)),new Set([crest.uid,sabaki.uid]));
  act(s,'orderTrigger',a=>a.uid===(sabakiFirst?sabaki.uid:crest.uid));
  assert.equal(s.extSpells.at(-1)?.inst.uid,sabakiFirst?sabaki.uid:crest.uid);
  drain(s);
  assert.ok(shieldCards(remain).some(x=>x.uid===sabaki.uid));
  assert.ok(shieldCards(remain).some(x=>x.uid===crest.uid));
 }
});
