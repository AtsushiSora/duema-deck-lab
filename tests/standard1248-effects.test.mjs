import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const RE='promoy15-067',INFINITY='dm23bd4-006',MUSHA='dmpcd02-a01';
const SMALL='dm01-108',HIGH='dm01-001',TRIGGER='dm01-027',DRAGON='dm22-018',
 DRAGON_SEED='dm23ex2-032',DRAGON_SPELL='dm22bd1-014',SELF_MANA='dm18-135',QX='dmrp07-m01';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const choose=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function move(s,p,x,to='hand'){
 s.phase='main';
 s.extTasks=[{op:'g34_ExactMove',p:1-p,source:TRIGGER,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
 act(s,'toAttack');
}

test('Six official print IDs resolve to three definitions with their corresponding images',()=>{
 const manifest=read('tools/support-phase-1248.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[RE,INFINITY,MUSHA]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dm25rp1-T04',INFINITY],['dm25ex3-TF15',INFINITY],['promoy23-028',INFINITY]
 ]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),face=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1248}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit,c.breaker],
   [face.cost,Number(face.powerText),face.race,face.civilizations,1,4,2]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Gaiaar Re attacks untapped creatures only on entry turn, and may attack the player immediately for two shields',()=>{
 const s=field(),x=add(s,0,'hand',RE),enemy=add(s,1,'battle',SMALL),tapped=add(s,1,'battle',SMALL,{tapped:true});
 const targets=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 play(s,x);s.phase='attack';
 assert.deepEqual(new Set(targets()),new Set(['player',enemy.uid,tapped.uid]));
 attack(s,x.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);end(s);s.phase='attack';tapped.tapped=true;
 assert.deepEqual(new Set(targets()),new Set(['player',tapped.uid]));
});

test('Infinity can decline, use on a later Dragon leave, and use again on the next turn',()=>{
 const s=field(),source=add(s,0,'battle',INFINITY);
 give(s,0,'deck',[DRAGON_SPELL,SMALL,SMALL,SMALL]);
 const spell=s.players[0].deck[0];
 move(s,0,add(s,0,'battle',SMALL));
 assert.equal(s.decision,null);
 move(s,1,add(s,1,'battle',DRAGON));
 assert.equal(s.decision,null);
 move(s,0,add(s,0,'battle',DRAGON));
 choose(s,null);
 assert.equal(s.players[0].deck[0],spell);
 move(s,0,add(s,0,'battle',DRAGON),'grave');
 choose(s,true);drain(s);
 assert.ok(has(s,0,'mana',spell)&&spell.tapped);
 assert.ok(s.log.some(l=>l.type==='reveal'&&l.text.includes(e.card(DRAGON_SPELL).name)));
 move(s,0,add(s,0,'battle',DRAGON));
 assert.equal(s.decision,null);
 end(s);
 move(s,0,source);
 assert.equal(s.decision.player,0);
 choose(s,true);drain(s);
 assert.ok(has(s,0,'hand',source));
 assert.equal(s.players[0].mana.at(-1).cardId,SMALL);
});

test('Infinity puts Dragon creatures and Dragon seeds into battle and observes a Dragon seed leaving',()=>{
 for(const cardId of [DRAGON,DRAGON_SEED]){
  const s=field();
  add(s,0,'battle',INFINITY);give(s,0,'deck',[cardId,SMALL,SMALL,SMALL,SMALL]);
  const top=s.players[0].deck[0],seed=add(s,0,'battle',DRAGON_SEED);
  move(s,0,seed);
  choose(s,true);drain(s);
  assert.ok(has(s,0,'battle',top)&&has(s,0,'hand',seed));
  assert.ok(!has(s,0,'mana',top));
 }
});

test('Infinity leaves an unplaceable Dragon in the library and cannot reveal under Q.Q.QX.',()=>{
 for(const blockedReveal of [false,true]){
  const s=field();
  add(s,0,'battle',INFINITY);
  give(s,0,'deck',['dm22ex1-007',SMALL,SMALL,SMALL]);
  const top=s.players[0].deck[0];
  if(blockedReveal)add(s,1,'battle',QX);
  else assert.ok(e.card(top).evolution&&e.card(top).race.includes('ドラゴン'));
  move(s,0,add(s,0,'battle',DRAGON));
  if(!blockedReveal)choose(s,true);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck[0],top);
 }
});

test('Musha offers destruction on entry and attack at the inclusive current-power threshold',()=>{
 const s=field();
 const exact=add(s,1,'battle',DRAGON),tooLarge=add(s,1,'battle',SMALL,{powerModifiers:[{amount:5000}]});
 const x=add(s,0,'hand',MUSHA),shield=s.players[0].shields[0];
 play(s,x);
 assert.deepEqual(choices(s),[exact.uid,null]);
 choose(s,null);
 assert.ok(has(s,0,'shields',shield)&&has(s,1,'battle',exact));
 x.entered=0;
 attack(s,x.uid);
 choose(s,exact.uid);
 assert.ok(has(s,1,'grave',exact)&&has(s,1,'battle',tooLarge));
 choose(s,shield.uid);drain(s);
 assert.ok(has(s,0,'grave',shield));
 assert.equal(s.players[1].shields.length,3);
});

test('Musha sends a shield to the grave after a destruction attempt is replaced and still destroys with no shields',()=>{
 for(const withShield of [false,true]){
  const s=field(),enemy=add(s,1,'battle',SELF_MANA);
  give(s,0,'shields',withShield?[TRIGGER]:[]);
  const shield=s.players[0].shields[0];
  play(s,add(s,0,'hand',MUSHA));choose(s,enemy.uid);
  assert.ok(has(s,1,'mana',enemy));
  if(withShield){
   choose(s,shield.uid);
   assert.ok(has(s,0,'grave',shield));
   assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
  }
  assert.equal(s.decision,null);
 }
});
