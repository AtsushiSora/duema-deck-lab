import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const IMPACT='dmr09-s02',MIA='dmx23-026',HEAVENS='dmd32-001',PRINT='dmex13-007';
const SMALL='dm01-108',LIGHT='dm01-001',LIGHT_EVOLUTION='dm02-s01',DARK='dm01-027',DRAW='dm06-085';
const DUAL='dm23bd7-003',CLOCK='dmr09-021',MIST='dm04-024',LOCK='dmrp07-m01',BLACK='dm22ex1-086',FUJIN='dmrp22-037';
const get=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid);
function play(s,id){const x=add(s,s.active,'hand',id);cast(s,x);return x;}
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function direct(s,id,p=0){
 const x=add(s,p,'hand',id);
 s.extTasks=[{op:'g34_Put',p,source:LIGHT,origin:'hand',target:x.uid}];act(s,'toAttack');
 return x;
}
const project=(s,uid)=>projectRoom({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],
 profiles:[{},{}],events:[],expiresAt:10000},{uid},1).game;
function setTop(s,id){
 const top=inst(id);s.players[0].deck.unshift(top);return top;
}

test('Three cards match their official faces and Heavens reprint preserves the original deck ID',()=>{
 const m=get('tools/support-phase-1244.json'),refs=get('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[IMPACT,MIA,HEAVENS]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[PRINT,HEAVENS]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1244}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],[f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
 assert.deepEqual(cat.resolveRows([{id:PRINT,count:1},{id:HEAVENS,count:3}]),[{id:HEAVENS,count:4}]);
});

test('Impactrigger on its own summon offers only spell faces with S-Trigger and casts for free',()=>{
 const s=field(),st=add(s,0,'hand',DARK),twin=add(s,0,'hand',DUAL),target=add(s,1,'battle',SMALL);
 add(s,0,'hand',DRAW);add(s,0,'hand',CLOCK);
 const x=play(s,IMPACT);
 assert.deepEqual(values(s),[st.uid,twin.uid,null]);assert.equal(s.decision.choices[1].value.face,1);
 const paid=tapped(s,0);
 pick(s,st.uid);act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',st)&&has(s,1,'grave',target));
 assert.equal(tapped(s,0),paid);
 assert.equal(s.metrics[0].triggers,0);
});

test('Impactrigger watches allied summons only and the spell offer is optional',()=>{
 for(const mode of ['own','opponent','direct','selfDirect','spellLocked','creatureFaceOnly']){
  const s=field(mode==='opponent'?1:0),st=add(s,0,'hand',mode==='creatureFaceOnly'?'dm23sp1-008':DARK);
  if(mode!=='selfDirect')add(s,0,'battle',IMPACT);
  if(mode==='spellLocked')add(s,1,'battle','dm04-001');
  if(mode==='direct'||mode==='selfDirect')direct(s,mode==='direct'?SMALL:IMPACT);
  else play(s,SMALL);
  if(mode==='own'){assert.deepEqual(values(s),[st.uid,null]);pick(s,null);}
  assert.equal(s.decision,null,mode);assert.ok(has(s,0,'hand',st));
 }
});

test('An allied real shield-trigger summon wakes Impactrigger without turning its spell into a shield trigger',()=>{
 const s=field(1),attacker=add(s,1,'battle',SMALL),st=add(s,0,'hand',DARK);
 add(s,0,'battle',IMPACT);give(s,0,'shields',['dm04-042']);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.deepEqual(values(s),[st.uid,null]);pick(s,st.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===attacker.uid));drain(s);
 assert.ok(has(s,0,'grave',st)&&has(s,1,'grave',attacker));
 assert.equal(s.metrics[0].triggers,1);assert.equal(tapped(s,0),0);
});

test('Impactrigger breaks three shields with an unblocked attack',()=>{
 const s=field();attack(s,add(s,0,'battle',IMPACT).uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Mia privately inspects one card and must place it into mana or a new face-down shield',()=>{
 for(const zone of ['mana','shields']){
  const s=field(),top=setTop(s,DRAW),shields=s.players[0].shields.length;
  play(s,MIA);
  assert.deepEqual(project(s,'a').inspectedCards.map(x=>x.id),[DRAW]);
  assert.ok(!JSON.stringify(project(s,'b')).includes(DRAW));
  assert.deepEqual(values(s),['mana','shields']);
  pick(s,zone);
  assert.ok(has(s,0,zone,top)&&!has(s,0,'deck',top));
  assert.equal(s.players[0].shields.length,shields+(zone==='shields'?1:0));
  assert.ok(!top.faceUp&&!top.tapped);
 }
});

test('Mia enters mana tapped when charged or moved there from the library',()=>{
 const s=field(),x=add(s,0,'hand',MIA);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
 const top=setTop(s,MIA);play(s,MIA);pick(s,'mana');
 assert.ok(has(s,0,'mana',top)&&top.tapped);
});

test('Mia respects blocked inspection, shield placement and deck-to-mana and shield replacement',()=>{
 for(const [mode,enemy,dest] of [['look',LOCK,'mana'],['shield',FUJIN,'shields'],['redirectMana',BLACK,'mana'],['redirectShield',BLACK,'shields']]){
  const s=field(),top=setTop(s,DARK);add(s,1,'battle',enemy);
  play(s,MIA);
  if(mode==='look')assert.equal(s.decision,null);
  else pick(s,dest);
  assert.ok(has(s,0,mode.startsWith('redirect')?'grave':'deck',top),mode);
 }
});

test('Heavens offers one light blocker from hand without summoning and filters other candidates',()=>{
 const s=field(),x=add(s,0,'hand',LIGHT);
 add(s,0,'hand','dm01-054');add(s,0,'hand',SMALL);add(s,0,'hand',LIGHT_EVOLUTION);add(s,0,'hand',DARK);
 const h=play(s,HEAVENS);
 assert.deepEqual(values(s),[x.uid,null]);const paid=tapped(s,0);
 pick(s,x.uid);drain(s);
 assert.ok(has(s,0,'battle',h)&&has(s,0,'battle',x));
 assert.equal(x.summonedTurn,undefined);assert.equal(tapped(s,0),paid);
 assert.equal(e.card(HEAVENS).blocker,true);assert.equal(e.card(HEAVENS).breaker,2);
});

test('Heavens can use a light blocker first drawn by Mist Rias after simultaneous entry triggers (QA34319)',()=>{
 const s=field(),top=setTop(s,LIGHT);add(s,0,'battle',MIST);
 play(s,HEAVENS);
 const entries=s.decision.type==='entryOrder'?s.triggers.entries:s.pendingEffects;
 const draw=entries.find(x=>x.source===MIST);assert.ok(draw);
 act(s,s.decision.type==='entryOrder'?'orderEntry':'orderEffect',a=>a.effectId===draw.effectId);
 if(!has(s,0,'hand',top))pick(s,1);
 assert.ok(has(s,0,'hand',top));
 assert.deepEqual(values(s),[top.uid,null]);pick(s,top.uid);
 drain(s);assert.ok(has(s,0,'battle',top));
});
