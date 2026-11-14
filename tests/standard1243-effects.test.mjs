import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const MURU='dmrp08-002',BLUE='dm22-002',PRINT='dmc48-006',CHAIN='dmex03-035';
const SMALL='dm01-108',BLOCKER='dm01-001',DEMON='dm01-027',TWIN='dm23bd7-003';
const LOCK='dmrp07-m01',HAND_ONLY='dm25rp2-022',ENTRY_REPLACE='dmrp17-025',SPELL_LOCK='dm04-001';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
};
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id)=>{const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const putTop=(s,id)=>{const top=inst(id);s.players[0].deck.unshift(top);return top;};
const projected=(s,uid)=>projectRoom({game:s,phase:'playing',hostUid:'host',guestUid:'guest',decks:[],profiles:[{},{}],events:[],expiresAt:10000},{uid},1).game;
const privateTop=(s,id)=>{
 assert.deepEqual(projected(s,'host').inspectedCards.map(x=>x.id),[id]);
 assert.ok(!JSON.stringify(projected(s,'guest')).includes(id));
};
function move(s,x,to){
 s.phase='main';
 s.extTasks=[{op:'g34_Target',p:0,source:DEMON,to,owner:'self',filter:{exactUid:x.uid}}];
 act(s,'toAttack');pick(s,x.uid);
}

test('Three official cards keep their printed faces and the DMC-48 print resolves to the original',()=>{
 const m=read('tools/support-phase-1243.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[MURU,BLUE,CHAIN]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[PRINT,BLUE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1243}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],[f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
 assert.deepEqual(cat.resolveRows([{id:PRINT,count:1},{id:BLUE,count:3}]),[{id:BLUE,count:4}]);
});

test('Murujim privately offers the blocker and puts it out without summoning or paying mana',()=>{
 const s=field(),top=putTop(s,BLOCKER);
 const m=play(s,MURU);
 assert.deepEqual(values(s),[true,false]);privateTop(s,BLOCKER);
 const tapped=s.players[0].mana.filter(x=>x.tapped).length;
 pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',m)&&has(s,0,'battle',top));
 assert.equal(s.metrics[0].played[BLOCKER],undefined);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
 assert.equal(e.card(MURU).blocker,true);
 assert.equal(e.card(MURU).breaker,2);
});

test('Murujim adds the top card when deployment is declined, inapplicable or prohibited',()=>{
 for(const mode of ['decline','spell','prohibited']){
  const s=field(),top=putTop(s,mode==='spell'?DEMON:BLOCKER);
  if(mode==='prohibited')add(s,1,'battle',HAND_ONLY);
  play(s,MURU);
  if(mode==='decline')pick(s,false);
  assert.ok(has(s,0,'hand',top),mode);
  assert.ok(!has(s,0,'battle',top)&&!has(s,0,'deck',top));
  assert.ok(!s.log.some(l=>l.type==='reveal'),mode);
 }
});

test('Murujim retriggers when destroyed but not when returned to hand',()=>{
 for(const to of ['grave','hand']){
  const s=field(),m=play(s,MURU),top=putTop(s,BLOCKER);
  move(s,m,to);
  if(to==='grave'){
   assert.deepEqual(values(s),[true,false]);pick(s,true);drain(s);
   assert.ok(has(s,0,'grave',m)&&has(s,0,'battle',top));
  }else assert.ok(has(s,0,'hand',m)&&s.players[0].deck[0]===top);
 }
});

test('Murujim has no hand fallback after choosing a blocker whose entry is replaced',()=>{
 const s=field(),top=putTop(s,BLOCKER);
 add(s,1,'battle',ENTRY_REPLACE);
 play(s,MURU);assert.deepEqual(values(s),[true,false]);pick(s,true);drain(s);
 assert.ok(has(s,0,'mana',top)&&!has(s,0,'hand',top)&&!has(s,0,'battle',top));
});

test('Great Blue reveals and casts the exact cost-seven twinpact spell before W-break without using mana',()=>{
 const s=field(),top=putTop(s,TWIN);
 attack(s,add(s,0,'battle',BLUE).uid);
 assert.equal(s.decision.choices[0].value.face,1);
 assert.deepEqual(values(s),[top.uid,null]);
 assert.ok(s.log.some(l=>l.type==='reveal'&&l.cardId===BLUE&&l.text.includes(e.card(TWIN).name)));
 pick(s,top.uid);pick(s,null);drain(s);
 assert.ok(has(s,0,'grave',top)&&!has(s,0,'battle',top));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.equal(s.players[1].shields.length,3);
});

test('Great Blue mills a nonspell or an expensive spell but keeps a declined or prohibited eligible spell',()=>{
 for(const [id,mode] of [[SMALL,'mill'],['dmex08-170','mill'],[DEMON,'decline'],[DEMON,'locked']]){
  const s=field(),top=putTop(s,id),attacker=add(s,0,'battle',BLUE);
  if(mode==='locked')add(s,1,'battle',SPELL_LOCK);
  attack(s,attacker.uid);
  if(mode==='mill') assert.ok(has(s,0,'grave',top));
  else{
   assert.deepEqual(values(s),mode==='decline'?[top.uid,null]:[null]);
   pick(s,null);assert.equal(s.players[0].deck[0],top);
  }
  assert.ok(s.log.some(l=>l.type==='reveal'&&l.cardId===BLUE));
 }
});

test('Great Blue loses with the last spell before it can resolve',()=>{
 const s=field(),target=add(s,1,'battle',SMALL);
 give(s,0,'deck',[DEMON]);
 const top=s.players[0].deck[0];
 attack(s,add(s,0,'battle',BLUE).uid);pick(s,top.uid);
 assert.equal(s.winner,1);
 assert.ok(has(s,1,'battle',target));
 assert.equal(s.players[0].deck.length,0);
});

test('Eieio uses S-Trigger and privately chains into a cheaper creature without paying',()=>{
 const s=field(1),top=putTop(s,BLOCKER);
 give(s,0,'shields',[CHAIN]);
 attack(s,add(s,1,'battle',SMALL).uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===CHAIN);
 assert.deepEqual(values(s),[top.uid,null]);privateTop(s,BLOCKER);
 pick(s,top.uid);drain(s);
 assert.ok(has(s,0,'battle',top));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Eieio keeps the privately inspected top when it is declined, too expensive, not a creature, or blocked from entering',()=>{
 for(const [id,mode] of [[BLOCKER,'decline'],[MURU,'equal'],[DEMON,'spell'],[BLOCKER,'prohibited']]){
  const s=field(),top=putTop(s,id);
  if(mode==='prohibited')add(s,1,'battle',HAND_ONLY);
  play(s,CHAIN);
  assert.deepEqual(values(s),mode==='decline'?[top.uid,null]:[null]);
  privateTop(s,id);pick(s,null);
  assert.equal(s.players[0].deck[0],top);
  assert.deepEqual(s.players[0].g34Protected,[]);
 }
});

test('An opponent’s Q.Q.QX. prevents inspecting or moving the top card for all three abilities',()=>{
 for(const id of [MURU,BLUE,CHAIN]){
  const s=field(),top=putTop(s,DEMON);
  add(s,1,'battle',LOCK);
  if(id===BLUE)attack(s,add(s,0,'battle',id).uid);else play(s,id);
  assert.equal(s.players[0].deck[0],top,id);
  assert.ok(!s.log.some(l=>l.cardId===id&&(l.type==='reveal'||l.type==='look')));
 }
});
