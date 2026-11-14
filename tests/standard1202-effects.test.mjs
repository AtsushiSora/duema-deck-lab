import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

import {boardChoice} from '../dist/manual-ui.js';
const GEO='dmrp01-s05',ACC='dmrp19-017',MEL='dmrp20-034',FIO='dm23ex2-056';
const BUG='dmrp04s-s06',DO='dmrp04m-014',SMALL='dm01-108',WATER='dm01-086',DEATH='dm01-027';
const MEI='dm24ex1-014',DIS='dmrp19-030',SWEEP='dm14-015',SEED='dm25ex1-054';
const put=(s,p,z,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const restore=s=>JSON.parse(JSON.stringify(s));
const target=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('the six official prints resolve to four supported cards with their verified specs and art',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1202.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[GEO,ACC,MEL,FIO]);
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['dm23rp2x-TR06','dm23rp2-TR06']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1202}),row.spec);
  const bad=structuredClone(parsed);
  bad.faces.at(-1).abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1202}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,(+face.powerText||0),face.race,face.civilizations.filter(c=>c!=='ゼロ'),1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

test('Bataille requires four destructible creatures and spends no mana; cost destruction cannot use Escape',()=>{
 let s=setup();
 const geo=put(s,0,'hand',GEO),victims=[MEI,SMALL,SMALL].map(id=>put(s,0,'battle',id));
 const alt=a=>a.uid===geo.uid&&a.role==='destroySummon1148';
 assert.ok(!e.getLegalActions(s).some(alt));
 victims.push(put(s,0,'battle',SMALL));
 act(s,'play',alt);
 pick(s,victims[0].uid);
 pick(s,null);
 assert.ok(victims.every(v=>has(s,0,'battle',v)));
 act(s,'play',alt);
 for(const x of victims)pick(s,x.uid);
 assert.ok(victims.every(v=>has(s,0,'grave',v))&&has(s,0,'battle',geo));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,0);
 assert.equal(s.decision?.task?.op,'g34_Mill');
 assert.equal(s.decision.task.n,4);
 const first=s.players[0].deck.slice(0,4);
 s=restore(s);pick(s,true);
 assert.ok(first.every(x=>has(s,0,'grave',x)));
 assert.equal(e.effectiveCard(geo,s).breaker,3);
});

test('Bataille can decline the graveyard-sized mill when summoned normally',()=>{
 const s=setup(),initial=s.players[0].deck.length;
 put(s,0,'grave',DEATH);put(s,0,'grave',SMALL);
 const geo=play(s,GEO);
 assert.equal(s.decision?.task?.n,2);
 pick(s,null);
 assert.ok(has(s,0,'battle',geo));
 assert.equal(s.players[0].deck.length,initial);
});

test('Bataille orders six graveyard cards at the bottom to replace even a bounce, including after save and resume',()=>{
 let s=setup();
 const geo=put(s,1,'battle',GEO);
 const payment=Array.from({length:7},()=>put(s,1,'grave',SMALL)),order=payment.slice(0,6).reverse();
 play(s,WATER);target(s,geo);
 act(s,'replaceGraveBottom1202');
 act(s,'graveBottomStayPick1202',a=>a.uid===payment[6].uid);
 act(s,'graveBottomStayCancel1202');
 assert.equal(s.players[1].grave.length,7);
 act(s,'replaceGraveBottom1202');
 for(const x of order.slice(0,3))act(s,'graveBottomStayPick1202',a=>a.uid===x.uid);
 s=restore(s);
 for(const x of order.slice(3))act(s,'graveBottomStayPick1202',a=>a.uid===x.uid);
 assert.ok(has(s,1,'battle',geo));
 assert.deepEqual(s.players[1].deck.slice(-6).map(x=>x.uid),order.map(x=>x.uid));
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[payment[6].uid]);
});

test('the manual board uses the same legal graveyard choices and only shows unselected cards',()=>{
 const s=setup(),geo=put(s,0,'battle',GEO);
 const cards=Array.from({length:6},()=>put(s,0,'grave',SMALL));
 play(s,WATER);target(s,geo);
 act(s,'replaceGraveBottom1202');
 const get=x=>boardChoice(s,{},0,'grave',x.uid);
 assert.equal(get(cards[0])?.kind,'graveBottomStayPick1202');
 act(s,'graveBottomStayPick1202',a=>a.uid===cards[0].uid);
 assert.equal(get(cards[0]),null);
 assert.equal(get(cards[1])?.kind,'graveBottomStayPick1202');
});

for(const [n,cancel] of [[5,false],[6,true]])test('Bataille moves normally without an elected six-card payment '+n,()=>{
 const s=setup(),geo=put(s,1,'battle',GEO);
 for(let i=0;i<n;i++)put(s,1,'grave',SMALL);
 play(s,DEATH);target(s,geo);
 if(cancel)act(s,'allowLeave');
 assert.ok(has(s,1,'grave',geo));
 assert.equal(s.players[1].grave.length,n+1);
});

test('simultaneous Bataille replacements cannot spend the same cards twice',()=>{
 const s=setup(),a=put(s,1,'battle',GEO),b=put(s,1,'battle',GEO);
 for(let i=0;i<4;i++)put(s,0,'battle',SMALL);
 const payment=Array.from({length:6},()=>put(s,1,'grave',SMALL));
 play(s,SWEEP);
 assert.equal(s.decision?.uid,a.uid);
 act(s,'replaceGraveBottom1202');
 for(const x of payment)act(s,'graveBottomStayPick1202',y=>y.uid===x.uid);
 assert.ok(has(s,1,'battle',a)&&has(s,1,'grave',b));
 assert.equal(s.players[1].grave.length,1);
});

test('QA 41285: Scorpion Centipede only attempts to destroy the sole Bataille once at turn end',()=>{
 const s=setup();
 for(let i=0;i<6;i++)put(s,0,'grave',WATER);
 const geo=put(s,0,'grave',GEO),du=put(s,0,'grave',DO);
 const bug=play(s,BUG);
 pick(s,geo.uid);pick(s,du.uid);
 while(s.decision){
  if(s.decision.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===geo.uid));
  else if(s.decision.task?.op==='g34_Mill')pick(s,null);
  else if(options(s).includes(bug.uid))pick(s,bug.uid);
  else if(options(s).includes(du.uid))pick(s,du.uid);
  else drain(s);
 }
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[geo.uid]);
 end(s);pick(s,geo.uid);
 act(s,'replaceGraveBottom1202');
 for(const x of s.players[0].grave.slice(0,6))act(s,'graveBottomStayPick1202',a=>a.uid===x.uid);
 assert.ok(has(s,0,'battle',geo));
 assert.equal(s.active,1);
});

test('QA 40258/40259: a spared creature can be chosen again, once in the simultaneous second group',()=>{
 let s=setup();
 put(s,0,'grave',ACC);put(s,0,'grave',ACC);put(s,1,'grave',ACC);
 const mei=put(s,1,'battle',MEI),other=put(s,1,'battle',SMALL),last=put(s,1,'battle',SMALL);
 const shield=s.players[1].shields[0];
 play(s,ACC);pick(s,mei.uid);
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 assert.deepEqual(options(s),[mei.uid,other.uid,last.uid]);
 pick(s,mei.uid);
 assert.ok(!options(s).includes(mei.uid)&&has(s,1,'battle',mei));
 s=restore(s);pick(s,other.uid);
 assert.equal(s.decision?.type,'leaveReplace');
 act(s,'allowLeave');
 assert.ok(has(s,1,'grave',mei)&&has(s,1,'grave',other)&&has(s,1,'battle',last));
});

test('Accumulated Hand is a shield trigger and the spell being cast never counts itself',()=>{
 const s=setup(),attacker=put(s,0,'battle',SMALL),other=put(s,0,'battle',SMALL);
 give(s,1,'shields',[ACC,SMALL]);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');pick(s,attacker.uid);
 assert.ok(has(s,0,'grave',attacker)&&has(s,0,'battle',other));
 assert.equal(s.decision,null);
});

for(const dispector of [false,true])test('Melge draws two before deciding whether two discards are required '+dispector,()=>{
 const s=setup(),old=put(s,0,'hand',SMALL),first=s.players[0].deck[0],second=s.players[0].deck[1];
 put(s,dispector?0:1,'battle',DIS);
 play(s,MEL);
 assert.ok([old,first,second].every(x=>has(s,0,'hand',x)));
 if(dispector)assert.equal(s.decision,null);
 else{
  assert.ok(options(s).includes(first.uid)&&!options(s).includes(null));
  pick(s,first.uid);pick(s,old.uid);
  assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',old)&&has(s,0,'hand',second));
 }
});

test('Melge’s Sasage destroys it to reduce a Dispector summon by two',()=>{
 const s=setup(),m=put(s,0,'battle',MEL),dis=put(s,0,'hand',DIS);
 const base=e.card(DIS).cost;
 act(s,'play',a=>a.uid===dis.uid&&a.alternative==='sasage'&&a.sasage.includes(m.uid)&&a.cost===base-2);
 drain(s);
 assert.ok(has(s,0,'grave',m)&&has(s,0,'battle',dis));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,base-2);
});

test('Fiona watches each friendly creature on either turn but does not trigger on itself, seeds, or enemy creatures',()=>{
 const s=setup(),field=play(s,FIO);
 assert.ok(has(s,0,'battle',field));assert.equal(s.decision,null);
 play(s,SEED);assert.equal(s.decision,null);
 play(s,SMALL);assert.equal(s.decision?.task?.op,'g34_Draw');pick(s,0);
 const drawn=s.players[0].deck[0];play(s,SMALL);pick(s,1);
 assert.ok(has(s,0,'hand',drawn));
 end(s);assert.ok(has(s,0,'mana',drawn));
 play(s,SMALL);assert.equal(s.decision,null);
 give(s,0,'shields',[SMALL]);
 // Deploy a creature by its S Trigger while Fiona's controller is not active.
 s.players[0].shields[0].cardId='dmrp05-075';
 const attacker=s.players[1].battle[0];s.turn++;
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');pick(s,1);
 assert.equal(s.players[0].hand.length,1);
 const kept=s.players[0].hand[0];end(s);drain(s);
 assert.ok(has(s,0,'hand',kept));
});

test('Fiona puts its entire hand into mana together at its owner’s end, with multicolor tapped',()=>{
 const s=setup();play(s,FIO);
 const one=put(s,0,'hand',SMALL),two=put(s,0,'hand','dmrp17-s07'),three=put(s,0,'hand',DEATH);
 end(s);
 assert.deepEqual(s.players[0].mana.slice(-3).map(x=>[x.uid,x.tapped]),[[one.uid,false],[two.uid,true],[three.uid,false]]);
 assert.equal(s.players[0].hand.length,0);
});

for(const geoFirst of [false,true])test('Bataille and L Gate cannot reserve the same graveyard card; Bataille first = '+geoFirst,()=>{
 const s=setup(),unit=geoFirst?[GEO,'dm23-048']:['dm23-048',GEO];
 const [a,b]=unit.map(id=>put(s,1,'battle',id));
 for(let i=0;i<4;i++)put(s,0,'battle',SMALL);
 const drake=put(s,1,'grave','dm23-051'),other=Array.from({length:5},()=>put(s,1,'grave',SMALL));
 play(s,SWEEP);
 assert.equal(s.decision?.uid,a.uid);
 if(geoFirst){
  act(s,'replaceGraveBottom1202');
  for(const x of [drake,...other])act(s,'graveBottomStayPick1202',v=>v.uid===x.uid);
  assert.ok(has(s,1,'battle',a)&&has(s,1,'grave',b)&&has(s,1,'deck',drake));
 }else{
  act(s,'replaceLGate955',v=>v.uid===drake.uid);
  drain(s);
  assert.ok(has(s,1,'deck',a)&&has(s,1,'grave',b)&&has(s,1,'hand',drake));
 }
});
