import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const JACK='dm39-041',SWORD='dm38-005',NAZ='dm36-009';
const BODY='dm01-108',MIND='dm36-082',COOL='dm36-019',KARATE='dm36-029',WILD='dm36-106';
const TANK='dm03-015',MANA_REPLACE='dm10-035',SAVER='dm13-027',STAR='dmsd20-003';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const play=(s,id)=>{const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
test('Phase 865 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-865.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[JACK,SWORD,NAZ]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:865}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:864}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:865}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const decline=s=>act(s,'extended',a=>values(s)[a.choice]===null);


function evolve(s,id,base){
 const x=play(s,id);
 act(s,'evolve',a=>a.uid===x.uid&&a.baseUid===base.uid);
 return x;
}
function deployTwo(s,p,cards){
 s.phase='main';
 s.extTasks=[{op:'g34_Select',p,source:BODY,origin:'hand',n:2,deploy:true,filter:{creature:true}}];
 act(s,'toAttack');
 for(const x of cards)pick(s,x);
}

test('Aqua Jack counts allied M Soul for payment but reveals and compares against its cost of five (QA 36224)',()=>{
 let s=field();
 add(s,0,'battle',MIND);
 add(s,0,'battle',COOL);
 add(s,1,'battle',MIND);
 add(s,0,'battle',BODY);
 give(s,0,'deck',[SAVER,BODY,BODY]);
 const first=s.players[0].deck[0],jack=add(s,0,'hand',JACK);
 act(s,'play',a=>a.uid===jack.uid&&a.cost===3);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.equal(e.effectiveCard(jack,s).cost,5);
 assert.deepEqual(values(s),[first.uid,null]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===JACK&&x.text.includes(e.card(first).name)));
 s=restore(s);
 pick(s,first);
 assert.ok(has(s,0,'battle',first));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
});

test('Aqua Jack keeps the top card when declined or at equal cost, and sympathy stops at one',()=>{
 for(const id of [BODY,COOL]){
  const s=field();
  for(let n=0;n<6;n++)add(s,0,'battle',MIND);
  give(s,0,'deck',[id,BODY,BODY]);
  const first=s.players[0].deck[0],jack=add(s,0,'hand',JACK);
  act(s,'play',a=>a.uid===jack.uid&&a.cost===1);
  if(id===BODY)decline(s);else assert.equal(s.decision,null);
  assert.equal(s.players[0].deck[0].uid,first.uid);
  assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===JACK&&x.text.includes(e.card(first).name)));
 }
});

test('Sylvester takes an allied M or K Soul, destroys at current power and draws for each direct destruction',()=>{
 for(const baseId of [MIND,KARATE]){
  const s=field(),base=add(s,0,'battle',baseId);
  add(s,0,'battle',WILD);
  const ally=add(s,0,'battle',BODY),large=add(s,1,'battle',TANK);
  const strengthened=add(s,1,'battle',BODY,{powerModifiers:[{amount:3000,expires:'end',who:0}]});
  const victims=[add(s,1,'battle',BODY),add(s,1,'battle',BODY)];
  const draws=s.players[0].deck.slice(0,2);
  const sword=play(s,SWORD);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>a.baseUid===base.uid);
  assert.deepEqual(sword.under.map(x=>x.uid),[base.uid]);
  assert.equal(e.effectiveCard(sword,s).breaker,2);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),draws.map(x=>x.uid));
  for(const x of victims)assert.ok(has(s,1,'grave',x));
  assert.ok(has(s,1,'battle',large)&&has(s,1,'battle',strengthened)&&has(s,0,'battle',ally));
 }
});

test('Sylvester excludes mana replacements and the substituted Saver while counting the directly destroyed creature (QA 34924)',()=>{
 let s=field();
 const base=add(s,0,'battle',MIND);
 const diverted=add(s,1,'battle',MANA_REPLACE),saver=add(s,1,'battle',SAVER);
 const protectedEvo=add(s,1,'battle',STAR,{under:[inst(BODY)]});
 const victim=add(s,1,'battle',BODY),top=s.players[0].deck[0];
 evolve(s,SWORD,base);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.uid,diverted.uid);
 act(s,'replaceYamata');
 assert.equal(s.decision.uid,protectedEvo.uid);
 s=restore(s);
 act(s,'replaceUltra',a=>a.uid===saver.uid);
 assert.ok(has(s,1,'mana',diverted)&&has(s,1,'battle',protectedEvo));
 assert.ok(has(s,1,'grave',saver)&&has(s,1,'grave',victim));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top.uid]);
});

test('Sylvester counts a Star evolution card that was destroyed and enters mana tapped (QA 40197)',()=>{
 const s=field(),base=add(s,0,'battle',MIND),under=inst(BODY),star=add(s,1,'battle',STAR,{under:[under]});
 const top=s.players[0].deck[0];
 evolve(s,SWORD,base);
 assert.ok(has(s,1,'grave',star)&&has(s,1,'battle',under));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top.uid]);
 const copy=add(s,0,'hand',SWORD);
 s.phase='charge';
 act(s,'charge',a=>a.uid===copy.uid);
 assert.ok(has(s,0,'mana',copy)&&copy.tapped);
});

test('Naznaguma untaps only visible allied W Soul creature mana and has T-Breaker',()=>{
 const s=field(),naz=add(s,0,'battle',NAZ);
 const eligible=[add(s,0,'mana',WILD,{tapped:true}),add(s,0,'mana','dm39-024',{tapped:true})];
 const other=add(s,0,'mana',COOL,{tapped:true}),faceDown=add(s,0,'mana',WILD,{faceDown:true,tapped:true});
 const enemy=add(s,1,'mana',WILD,{tapped:true});
 play(s,WILD);
 assert.ok(eligible.every(x=>!x.tapped));
 assert.ok(other.tapped&&faceDown.tapped&&enemy.tapped);
 attack(s,naz.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===3);
 assert.equal(s.players[1].brokenThisTurn,3);
});

test('Naznaguma observes another W Soul only when it is present at that entry (rule 409.1f)',()=>{
 for(const nazFirst of [true,false]){
  const s=field(),mana=add(s,0,'mana',WILD,{tapped:true}),naz=add(s,0,'hand',NAZ),wild=add(s,0,'hand',WILD);
  deployTwo(s,0,nazFirst?[naz,wild]:[wild,naz]);
  assert.ok(has(s,0,'battle',naz)&&has(s,0,'battle',wild));
  assert.equal(mana.tapped,!nazFirst);
 }
});

test('Naznaguma ignores opposing entries, non-W entries, and its own entry',()=>{
 const s=field(),mana=add(s,0,'mana',WILD,{tapped:true});
 play(s,NAZ);
 play(s,BODY);
 assert.ok(mana.tapped);
 s.active=1;
 play(s,WILD);
 assert.ok(mana.tapped);
});
