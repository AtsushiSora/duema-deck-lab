import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const WATER='dmrp07-017',BICK='dmrp06-s07',PRINT='dmbd22-017',MIGHTY='dm18-135';
const SMALL='dm01-108',DARK='dm01-090',DEMON='dm01-027',TWIN='dmrp12-s01',KATS='dmex15-b002',BLUE='dm23bd7-003';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
};
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function moveCreature(s,p,x,properties={}){
 s.phase='main';
 s.extTasks=[{op:'g34_Target',p,source:DEMON,to:'grave',filter:{exactUid:x.uid},...properties}];
 act(s,'toAttack');pick(s,x.uid);drain(s);
}
const spellsOnTop=(s,ids)=>give(s,0,'deck',ids);

test('The three new cards and the reprint retain distinct official IDs, faces and images',()=>{
 const m=read('tools/support-phase-1242.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[WATER,BICK,MIGHTY]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,BICK]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1242}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,[...(c.race||'').split('/')].sort(),c.civilizations,c.manaValue,c.limit],
   [f.cost,f.race.split('/').sort(),f.civilizations,1,4]);
  if(f.powerText!=='-')assert.equal(c.power,Number(f.powerText));
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Water in the Dark shuffles first, privately offers an exact cost-seven spell face, then casts it without paying',()=>{
 const s=field(),water=add(s,0,'hand',WATER);
 spellsOnTop(s,[SMALL,BLUE,SMALL]);
 const top=s.players[0].deck[1];
 e.setRandomSource(()=>0);
 try{play(s,water);}finally{e.setRandomSource(null);}
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.decision.choices[0].value.face,1);assert.deepEqual(choices(s),[top.uid,null]);
 const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{},{}],events:[],expiresAt:10000};
 assert.deepEqual(projectRoom(room,{uid:'a'},1).game.inspectedCards.map(x=>x.id),[BLUE]);
 assert.ok(!JSON.stringify(projectRoom(room,{uid:'b'},1)).includes(BLUE));
 const tapped=s.players[0].mana.filter(x=>x.tapped).length;pick(s,top.uid);drain(s);
 assert.ok(has(s,0,'grave',top));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
});

test('Water in the Dark leaves the inspected card on top when declined or when its spell costs more than seven',()=>{
 for(const id of [DEMON,'dmex08-170',SMALL]){
  const s=field();give(s,0,'deck',Array(8).fill(id));
  play(s,add(s,0,'hand',WATER));const top=s.players[0].deck[0];
  assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[id]);
  assert.deepEqual(choices(s),id===DEMON?[top.uid,null]:[null]);
  pick(s,null);assert.equal(s.players[0].deck[0],top);
 }
});

test('Water in the Dark can use its shield trigger and playing the last spell loses before it resolves',()=>{
 const s=field(1),attacker=add(s,1,'battle',SMALL);
 give(s,0,'shields',[WATER]);give(s,0,'deck',[DEMON]);
 const top=s.players[0].deck[0];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===WATER);
 assert.deepEqual(choices(s),[top.uid,null]);pick(s,top.uid);
 assert.equal(s.winner,1);
 assert.ok(has(s,1,'battle',attacker));assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Bick attacks to make the opponent choose one discard, then returns from the grave at its own empty-enemy end step',()=>{
 const s=field(),x=add(s,0,'battle',BICK),one=add(s,1,'hand',SMALL),two=add(s,1,'hand',DARK);
 attack(s,x.uid);assert.equal(s.decision.player,1);assert.deepEqual(choices(s),[one.uid,two.uid]);
 pick(s,two.uid);act(s,'noBlock');drain(s);assert.ok(has(s,1,'grave',two)&&has(s,1,'hand',one));
 moveCreature(s,0,x,{owner:'self'});assert.ok(has(s,0,'grave',x));
 const enemy=add(s,1,'battle',SMALL);
 end(s);end(s);assert.ok(has(s,0,'grave',x));
 moveCreature(s,0,enemy);add(s,1,'battle','dmrp22-069');
 end(s);assert.ok(has(s,0,'battle',x));assert.equal(s.metrics[0].played[BICK],undefined);
});

test('Bick reacts to the used twinpact face and to paid S-Trigger cards but ignores a printed trigger on the unused face',()=>{
 const s=field(1),x=add(s,0,'battle',BICK),y=add(s,1,'hand',TWIN);
 play(s,y);drain(s);assert.ok(has(s,0,'battle',x));
 const other=add(s,0,'battle',SMALL);
 play(s,add(s,1,'hand',DEMON));act(s,'effect',a=>a.targets.some(t=>t.uid===other.uid));drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'grave',other));
 assert.ok(s.log.some(l=>l.cardId===DEMON&&l.type==='play'));

 const t=field(1),v=add(t,0,'battle',BICK);
 play(t,add(t,1,'hand',TWIN),1);drain(t);
 assert.ok(has(t,0,'grave',v));
});

test('Bick sees the trigger granted to Katsuking in the shield zone but not the ordinary summon',()=>{
 const t=field(1),b=add(t,0,'battle',BICK);
 give(t,1,'shields',[SMALL]);give(t,1,'deck',Array(20).fill(DARK));
 play(t,add(t,1,'hand',KATS));drain(t);
 assert.ok(has(t,0,'battle',b));

 const s=field(),x=add(s,0,'battle',BICK),attacker=add(s,0,'battle',SMALL);
 give(s,1,'shields',[KATS]);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===KATS);drain(s);
 assert.ok(has(s,0,'grave',x));
});

test('Bick triggers when the opponent uses the trigger spell via Smash Burst',()=>{
 const s=field(1),x=add(s,0,'battle',BICK),attacker=add(s,1,'battle',BLUE);
 attack(s,attacker.uid);pick(s,true);
 assert.equal(s.decision.task.op,'g37Bounce');pick(s,null);drain(s);
 assert.ok(s.log.some(l=>l.type==='play'&&l.cardId===BLUE));assert.ok(has(s,0,'grave',x));
});

test('Mighty Shouter goes into mana untapped when destroyed, but not when bounced or sent to grave without destruction',()=>{
 for(const to of ['grave','hand','mana','replacement']){
  const s=field(),x=add(s,0,'hand',MIGHTY);
  play(s,x);assert.ok(has(s,0,'battle',x));
  if(to==='grave'){
   s.extTasks=[{op:'g34_Custom',name:'emrakulMove',p:0,source:DEMON,target:x.uid}];
   act(s,'toAttack');drain(s);
  }else moveCreature(s,0,x,{owner:'self',to:to==='hand'?'hand':'grave',g1133AlreadyReplaced:to==='replacement'});
  assert.ok(has(s,0,to==='replacement'?'grave':to,x),to);
  if(to==='mana')assert.ok(!x.tapped);
 }
});
