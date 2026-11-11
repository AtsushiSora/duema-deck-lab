import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const NOVA='dm21-004',PLUTO='dm19-s06',MARY='dm21-048';
const PLAIN='dm01-108',DRAKE='dm19-089',BRAVE='dm21-046',PUPPET='dm06-092',DEVIL='dm19-084';
const BEE='dm21-053',BLOCKER='dm21-021',SAVER='dmex14-101',BRAIN='dm01-052',STRATO='dm22rp2-048';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(PLAIN));
 return s;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 938 verifies all six printings and resolves three canonical deck IDs',()=>{
 const m=read('tools/support-phase-938.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[NOVA,PLUTO,MARY]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),f=row.faces[0],c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:938}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:937}));
  const extra=structuredClone(d);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:938}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],[f.cost,f.race,f.civilizations,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  assert.equal(c.supportBatch,'phase-938');
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmex15-a043','dm25ex3-CSP4','dmc54-007']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:938}),m.cards.find(x=>x.id===id).spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.equal(cat.resolveRows([{id:row.id,count:1}])[0].id,id);
 }
 assert.match(m.cards[0].faces[0].abilityText,/手札に加える/);
 assert.match(e.card(NOVA).text,/すべてブレイクする/);
 assert.equal(e.card(NOVA).text,m.cards[0].currentPrint.faces[0].abilityText);
 const deck={id:'phase938',name:'シンパシーと進化GV',cards:['dm25ex3-CSP4','dmc54-007',MARY,PLAIN,DRAKE,BRAVE,PUPPET,DEVIL,BEE,BLOCKER].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Nova counts each live friendly Drake or Brave Spirit once and has a one-mana floor',()=>{
 const s=field(),original=e.card(DRAKE);
 e.setCards(data.cards.map(c=>c.id===DRAKE?{...original,race:'ティラノ・ドレイク/ブレイブ・スピリット'}:c));
 try{
  put(s,0,'battle',DRAKE);
  put(s,0,'battle',BRAVE);
  put(s,0,'battle',DRAKE,{sealed:true});
  put(s,1,'battle',BRAVE);
  put(s,0,'battle',PLAIN,{under:[inst(DRAKE)]});
  const cost=()=>e.summonCost(s,0,e.card(NOVA));
  assert.equal(cost(),12);
  for(let i=0;i<12;i++)put(s,0,'battle',BRAVE);
  assert.equal(cost(),1);
  const spell=put(s,0,'hand',NOVA);
  const ranked=e.rankHeuristicActions(s).find(x=>x.a.kind==='play'&&x.a.uid===spell.uid);
  assert.ok(Number.isFinite(ranked?.value));
  act(s,'play',a=>a.uid===spell.uid);
  drain(s);
  assert.ok(has(s,0,'grave',spell));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 }finally{e.setCards(data.cards);}
});

test('Nova breaks shields together, supports Shield Saver, and offers the actual S-Trigger',()=>{
 let s=field();
 const saver=put(s,1,'battle',SAVER);
 const [keep,trigger,stacked]=give(s,1,'shields',[PLAIN,BRAIN,PLAIN]);
 const under=inst(PLAIN);
 stacked.shieldStack=[under];
 const allBefore=e.physicalCards(s).length;
 play(s,NOVA);
 assert.equal(s.decision.type,'shieldGuard');
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.shieldBreak.uids,[keep.uid,trigger.uid,stacked.uid]);
 assert.ok(!s.attack);
 s=restore(s);
 act(s,'saveShield',a=>a.uid===saver.uid&&a.shield===keep.uid);
 drainUntilTrigger(s);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),[keep.uid]);
 assert.equal(s.metrics[0].breaks,2);
 assert.ok(has(s,1,'grave',saver)&&has(s,1,'hand',stacked)&&has(s,1,'hand',under));
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 drain(s);
 assert.equal(s.metrics[1].triggers,1);
 assert.ok(has(s,1,'grave',trigger));
 assert.equal(e.physicalCards(s).length,allBefore+1);
});
function drainUntilTrigger(s){
 if(s.decision?.type==='shieldGuard')act(s,'finishShieldGuards');
 assert.equal(s.decision.type,'trigger');
}

test('Nova with no opposing shields leaves the result and friendly shields intact',()=>{
 const s=field();
 give(s,1,'shields',[]);
 const spell=play(s,NOVA);
 drain(s);
 assert.equal(s.winner,null);
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.players[0].shields.length,5);
 assert.ok(has(s,0,'grave',spell));
});

for(const races of [[PUPPET,DEVIL,DRAKE],[PUPPET,PUPPET,PUPPET]])test('Pluto uses any three qualifying bases in the chosen order '+races.join(','),()=>{
 const s=field();
 const [first,second]=races.slice(0,2).map(id=>put(s,0,'battle',id));
 const wrong=put(s,0,'battle',PLAIN);
 const sealed=put(s,0,'battle',DEVIL,{sealed:1});
 s.players[0].seals=[{...inst(PLAIN),faceDown:true,sealOf:sealed.uid}];
 put(s,1,'battle',DEVIL);
 const pluto=put(s,0,'hand',PLUTO);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===pluto.uid));
 const third=put(s,0,'battle',races[2]);
 act(s,'play',a=>a.uid===pluto.uid);
 assert.equal(s.decision.task.op,'g31_Bases');
 assert.deepEqual(new Set(values(s)),new Set([first.uid,second.uid,third.uid]));
 pick(s,third);pick(s,first);pick(s,second);
 assert.ok(has(s,0,'battle',wrong)&&has(s,0,'battle',pluto));
 assert.deepEqual(pluto.under.map(x=>x.uid),[third.uid,first.uid,second.uid]);
});

test('Pluto can pay with one under-card and destroy its initial attack target before blocking',()=>{
 let s=field();
 const beneath=inst(DEVIL),unused=inst(PUPPET);
 const source=put(s,0,'battle',PLUTO,{under:[beneath,unused]});
 const target=put(s,1,'battle',PLAIN,{tapped:true}),other=put(s,1,'battle',BLOCKER);
 attack(s,source.uid,target.uid);
 assert.equal(s.decision.task.op,'g31_Meteor');
 s=restore(s);
 pick(s,beneath);
 assert.deepEqual(values(s).sort(),[target.uid,other.uid].sort());
 pick(s,target);
 assert.equal(s.attack,null);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',beneath)&&has(s,1,'grave',target)&&has(s,1,'battle',other));
 assert.deepEqual(s.players[0].battle[0].under.map(x=>x.uid),[unused.uid]);
 assert.equal(s.players[1].shields.length,5);
});

test('Pluto may decline Meteoburn and breaks three shields normally',()=>{
 const s=field(),beneath=inst(PUPPET);
 const source=put(s,0,'battle',PLUTO,{under:[beneath]});
 const target=put(s,1,'battle',PLAIN);
 attack(s,source.uid);
 pick(s,null);
 act(s,'noBlock');
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.ok(has(s,1,'battle',target));
 assert.deepEqual(source.under,[beneath]);
});

test('Pluto resolves the destruction after an opposing Stratobag redirects the under-card',()=>{
 const s=field(),beneath=inst(PUPPET);
 const source=put(s,0,'battle',PLUTO,{under:[beneath]});
 const replacement=put(s,1,'battle',STRATO),target=put(s,1,'battle',PLAIN);
 attack(s,source.uid);
 pick(s,beneath);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g31_Meteor825Dest');
 pick(s,replacement);
 assert.equal(s.decision.player,0);
 pick(s,target);
 assert.ok(has(s,0,'mana',beneath)&&has(s,1,'grave',target));
 assert.equal(s.decision.type,'block');
});

for(const mode of ['blocked Bee','unblocked Bee','blocked non-Bee','ignored Mary'])test('Mary applies after an actual battle against a blocked friendly Bee '+mode,()=>{
 const s=field();
 const mary=put(s,0,'battle',MARY);
 if(mode==='ignored Mary')mary.g35Ignored=s.turn;
 const attacker=put(s,0,'battle',mode==='blocked non-Bee'?PLAIN:BEE);
 const blocker=put(s,1,'battle',BLOCKER);
 attack(s,attacker.uid);
 if(mode==='unblocked Bee')act(s,'noBlock');
 else act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(has(s,0,'grave',attacker),mode!=='unblocked Bee');
 assert.equal(has(s,1,'grave',blocker),mode==='blocked Bee');
 assert.ok(has(s,0,'battle',mary));
 assert.equal(s.players[1].shields.length,mode==='unblocked Bee'?4:5);
});
