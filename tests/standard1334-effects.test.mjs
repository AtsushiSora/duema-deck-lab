import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const HEAVY='dmc40-002',METAL='dmc40-006',DEATH='dmc40-008',ZET='dmx21-021';
const EXTREME_HEAVY='dmex17-033',EXTREME_METAL='dmex17-059';
const BASIC='dm01-108',GEAR='dm14-110',DEMON='dm01-027',APOCALYPSE='dm14-015';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const find=(s,p,z,id)=>s.players[p][z].find(x=>x.cardId===id);
const parts=x=>[x,...(x.godLinks||[])];
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return typeof value==='function'?value(v):(v?.uid??v)===value;
});
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function link(s,target){
 assert.equal(s.decision?.task?.op,'g31_Link');
 pick(s,target);
}
function linkedNames(s,p){
 return s.players[p].battle.filter(x=>x.godLinks?.length).map(x=>parts(x).map(y=>y.cardId).sort());
}

test('The original Gods and twelve official reprints resolve to the original three IDs',()=>{
 const m=read('tools/support-phase-1334.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[HEAVY,METAL,DEATH]);
 assert.equal(m.printAliases.length,12);
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,source,image,canonicalId=id}=row;
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(name)).map(c=>c.id),[canonicalId]);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId,name,source,image});
  if(canonicalId===id)assert.equal(CARD_IMAGES[id],image);
 }
 assert.deepEqual([HEAVY,METAL,DEATH].map(id=>e.card(id).limit),[4,4,4]);
});

for(const [first,second] of [[HEAVY,METAL],[METAL,DEATH],[DEATH,HEAVY]])test('God of Zet places '+first+' then '+second+' in order and permits their G-Link (QA 34396)',()=>{
 let s=field();
 const a=add(s,0,'hand',first),b=add(s,0,'hand',second);
 const third=add(s,0,'hand',[HEAVY,METAL,DEATH].find(id=>![first,second].includes(id)));
 const unrelated=add(s,0,'hand',BASIC);
 cast(s,ZET);
 assert.ok(!s.decision.choices.some(x=>x.value?.uid===unrelated.uid));
 pick(s,a.uid);pick(s,b.uid);
 assert.ok(find(s,0,'battle',first));
 assert.ok(!find(s,0,'battle',second));
 s=JSON.parse(JSON.stringify(s));
 link(s,a.uid);drain(s);
 assert.deepEqual(linkedNames(s,0),[[first,second].sort()]);
 assert.ok(s.players[0].hand.some(x=>x.uid===third.uid));
 assert.equal(e.card(s.players[0].battle[0]).power,e.card(first).power+e.card(second).power);
});

test('Heavy can sacrifice itself to draw and let the opponent choose which of their own creatures to destroy',()=>{
 const s=field();
 const heavy=add(s,0,'hand',HEAVY),victim=add(s,1,'battle',BASIC);
 add(s,1,'battle',BASIC);
 const top=s.players[0].deck[0];
 play(s,heavy);pick(s,heavy.uid);
 assert.equal(s.decision.player,1);
 const selected=s.decision.choices.find(({value})=>(value?.uid??value)===victim.uid);
 assert.ok(selected);
 pick(s,victim.uid);drain(s);
 assert.ok(find(s,0,'grave',HEAVY));
 assert.ok(s.players[0].hand.some(x=>x.uid===top.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===victim.uid));
});

for(const choice of ['battle','mana',null])test('Metal moves just one card to its owner’s grave from '+choice,()=>{
 const s=field();
 const gear=add(s,1,'battle',GEAR),mana=s.players[1].mana[0];
 const other=add(s,1,'battle',BASIC);
 play(s,add(s,0,'hand',METAL));
 assert.ok(!s.decision.choices.some(o=>o.value?.uid===other.uid));
 pick(s,choice===null?null:choice==='battle'?gear.uid:mana.uid);
 drain(s);
 assert.equal(s.players[1].grave.some(x=>x.uid===gear.uid),choice==='battle');
 assert.equal(s.players[1].grave.some(x=>x.uid===mana.uid),choice==='mana');
 assert.equal(e.card(METAL).breaker,2);
});

test('Death joins an existing pair, destroys only opposing non-Gods and gains World Breaker and selection immunity',()=>{
 const s=field(),heavy=add(s,0,'battle',HEAVY),death=add(s,0,'hand',DEATH);
 heavy.godLinks=[inst(METAL)];
 const enemyGod=add(s,1,'battle',EXTREME_HEAVY),enemy=add(s,1,'battle',BASIC);
 const own=add(s,0,'battle',BASIC);
 play(s,death);link(s,heavy.uid);drain(s);
 assert.deepEqual(linkedNames(s,0),[[HEAVY,DEATH,METAL].sort()]);
 assert.equal(e.power(heavy,false,s),23000);
 assert.equal(e.card(heavy).breaker,'∞');
 assert.ok(s.players[1].battle.includes(enemyGod));
 assert.ok(s.players[1].grave.includes(enemy));
 assert.ok(s.players[0].battle.includes(own));
 s.active=1;s.phase='main';cast(s,DEMON);
 assert.ok(!e.getLegalActions(s).some(a=>a.targets?.some(t=>t.uid===heavy.uid)));
 assert.ok(e.getLegalActions(s).some(a=>a.targets?.some(t=>t.uid===own.uid)));
});

test('Death can link between separate Heavy and Metal, including after a JSON round trip',()=>{
 let s=field();
 const h=add(s,0,'battle',HEAVY),m=add(s,0,'battle',METAL,{tapped:true});
 play(s,add(s,0,'hand',DEATH));
 s=JSON.parse(JSON.stringify(s));
 link(s,v=>Array.isArray(v)&&v[0]===h.uid&&v[1]===m.uid);
 drain(s);
 assert.deepEqual(linkedNames(s,0),[[HEAVY,DEATH,METAL].sort()]);
 assert.equal(s.players[0].battle[0].tapped,true);
});

for(const relink of [true,false])test('Metal can '+(relink?'accept':'decline')+' relinking after only Death leaves (QA 35539)',()=>{
 let s=field(1);
 const heavy=add(s,0,'battle',HEAVY,{tapped:true});
 heavy.godLinks=[inst(DEATH),inst(METAL)];
 for(let i=0;i<5;i++)add(s,1,'battle',BASIC);
 cast(s,APOCALYPSE);
 act(s,'godLeave',a=>a.cardId===DEATH);
 assert.equal(s.decision?.task?.op,'g31_RelinkHdm');
 assert.equal(s.players[0].battle.length,2);
 assert.equal(s.players[0].battle.every(x=>x.tapped),true);
 assert.ok(find(s,0,'grave',DEATH));
 s=JSON.parse(JSON.stringify(s));
 pick(s,relink?true:null);drain(s);
 assert.deepEqual(linkedNames(s,0),relink?[[HEAVY,METAL].sort()]:[]);
 if(relink)assert.equal(e.card(s.players[0].battle[0]).breaker,3);
});

test('Only a linked Heavy forces each opponent that can attack it to do so',()=>{
 const s=field(1),heavy=add(s,0,'battle',HEAVY,{tapped:true});
 const attacker=add(s,1,'battle',BASIC);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 heavy.godLinks=[inst(METAL)];
 const actions=e.getLegalActions(s);
 assert.ok(!actions.some(a=>a.kind==='endTurn'||a.uid===attacker.uid&&a.target==='player'));
 assert.ok(actions.some(a=>a.target===heavy.uid));
 attack(s,attacker.uid,heavy.uid);
});

test('Extreme Metal can link to named original Heavy without triggering Heavy’s entry ability again',()=>{
 const s=field(),heavy=add(s,0,'battle',HEAVY);
 play(s,add(s,0,'hand',EXTREME_METAL));link(s,heavy.uid);
 assert.equal(s.decision?.task?.op,'g31_Metal');
 drain(s);
 assert.deepEqual(linkedNames(s,0),[[HEAVY,EXTREME_METAL].sort()]);
 assert.equal(s.players[0].hand.length,0);
});

test('The three linked Gods actually break all shields, including more than three',()=>{
 const s=field(),host=add(s,0,'battle',HEAVY);
 host.godLinks=[inst(DEATH),inst(METAL)];
 give(s,1,'shields',Array(7).fill(BASIC));
 attack(s,host.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[1].hand.length,7);
});

test('Death links to an existing Extreme Heavy and allows Extreme Metal to join a free side (QA 42633)',()=>{
 const s=field(),heavy=add(s,0,'battle',EXTREME_HEAVY),victim=add(s,1,'battle',BASIC);
 play(s,add(s,0,'hand',DEATH));link(s,heavy.uid);drain(s);
 play(s,add(s,0,'hand',EXTREME_METAL));link(s,heavy.uid);pick(s,null);drain(s);
 assert.deepEqual(linkedNames(s,0),[[EXTREME_HEAVY,EXTREME_METAL,DEATH].sort()]);
 assert.notEqual(e.card(heavy).breaker,'∞');
 assert.ok(s.players[1].battle.includes(victim));
});
