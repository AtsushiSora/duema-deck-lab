import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KANTA='dm23rp3-047',MANTRA='dm24rp1-014',BOYAN='dm22rp1-045';
const FIRE='dm01-097',SMALL='dm01-108',LIGHT='dm01-075',MEDIUM='dm34-024',BIG='dm01-001';
const FIRE_SEED='dmrp21-069',BOUNCE='dm01-086',DESTROY='dm01-027',EVO='dmx17-008';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(SMALL));
 return s;
};
const add=(s,p,id,zone='battle',props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
const clone=s=>JSON.parse(JSON.stringify(s));
const passBlock=s=>{if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');};
const end=s=>{s.phase='attack';act(s,'endTurn');if(s.phase==='charge')act(s,'skipCharge');};
function breakShield(s,id){
 give(s,0,'shields',[id]);
 const attacker=add(s,1,FIRE);
 attack(s,attacker.uid);passBlock(s);
 return s.players[0].shields[0]??s.players[0].hand.at(-1);
}

test('four official prints resolve to three supported names with their official stats and limits',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1217.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[KANTA,MANTRA,BOYAN]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['dm24ex3-007',MANTRA]]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1217}),row.spec);
  for(const i of parsed.faces.keys()){
   const changed=structuredClone(parsed);
   changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1217}));
  }
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual(e.playFaces(c).map(f=>[f.type,f.cost,f.race,f.civilizations]),row.faces.map(f=>[
   f.typeText==='呪文'?'spell':'creature',f.cost,f.race,f.civilizations
  ]));
  assert.deepEqual([c.manaValue,c.limit,manifest.regulationVerification.limits[row.id]],[1,4,4]);
  assert.equal(c.power,Number(row.faces[0].powerText));
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('Kanta gains 3000 only during battle, enough to defeat a 4000-power creature',()=>{
 const s=field(),kanta=add(s,0,KANTA,'hand'),opponent=add(s,1,MEDIUM,'battle',{tapped:true});
 play(s,kanta);
 assert.ok(has(s,0,'battle',kanta));
 assert.equal(e.power(kanta,false,s),2000);
 assert.equal(e.matchupPower(kanta,opponent,true,s),5000);
 s.turn++;
 attack(s,kanta.uid,opponent.uid);passBlock(s);drain(s);
 assert.ok(has(s,1,'grave',opponent)&&has(s,0,'battle',kanta));
 assert.equal(e.power(kanta,false,s),2000);
});

test('Kanta’s spell ignores selection immunity and lets the opponent order the entire batch',()=>{
 let s=field();
 give(s,1,'mana',[FIRE,FIRE]);
 s.players[1].mana[0].tapped=true;
 const equal=add(s,1,FIRE),protectedFromSelection=add(s,1,'dm09-s01');
 const evolution=add(s,1,EVO),base=inst(LIGHT);
 evolution.under=[base];
 const caster=add(s,0,BIG),spell=add(s,0,KANTA,'hand');
 play(s,spell,1);
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(values(s)),new Set([protectedFromSelection.uid,evolution.uid,base.uid]));
 pick(s,base.uid);s=clone(s);pick(s,protectedFromSelection.uid);
 assert.deepEqual(s.players[1].deck.slice(-3).map(x=>x.uid),[base.uid,protectedFromSelection.uid,evolution.uid]);
 assert.ok(has(s,1,'battle',equal)&&has(s,0,'battle',caster));
});

test('Kanta’s spell side is available as an S Trigger without mana payment',()=>{
 const s=field(1);give(s,1,'mana',[]);
 breakShield(s,KANTA);
 const trigger=e.getLegalActions(s).find(a=>a.kind==='useTrigger'&&a.face===1);
 assert.ok(trigger);
 e.step(s,trigger);drain(s);
 assert.equal(s.players[1].battle.length,0);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Mantra can pass on the first tap, then draw once for each copy and regain use next turn',()=>{
 let s=field(),first=add(s,0,MANTRA),second=add(s,0,MANTRA);
 const attackers=Array.from({length:3},()=>add(s,0,FIRE));
 const attackAndStart=x=>{attack(s,x.uid);assert.equal(s.decision.type,'effectOrder');};
 attackAndStart(attackers[0]);
 act(s,'orderEffect',a=>a.uid===first.uid);pick(s,0);
 assert.equal(s.decision.task.uid,second.uid);pick(s,1);
 passBlock(s);drain(s);
 assert.equal(s.players[0].hand.length,1);
 s=clone(s);
 attack(s,attackers[1].uid);
 assert.equal(s.decision.task.uid,first.uid);
 pick(s,1);passBlock(s);drain(s);
 assert.equal(s.players[0].hand.length,2);
 attack(s,attackers[2].uid);
 assert.equal(s.decision.type,'block');
 passBlock(s);drain(s);
 end(s);end(s);
 const hand=s.players[0].hand.length;
 attackAndStart(first);
 act(s,'orderEffect',a=>a.uid===first.uid);pick(s,1);
 assert.equal(s.decision.task.uid,second.uid);pick(s,1);
 assert.equal(s.players[0].hand.length,hand+2);
});

test('Mantra sees its controller’s blocker tap during the opponent’s turn',()=>{
 const s=field(1),watcher=add(s,0,MANTRA),blocker=add(s,0,BIG),attacker=add(s,1,FIRE);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.uid,watcher.uid);
 pick(s,1);
 assert.ok(has(s,0,'battle',blocker)&&has(s,1,'grave',attacker));
});

test('Mantra can only draw once when several friendly creatures tap in the same effect',()=>{
 for(const drawFirst of [0,1]){
  const s=field(1),watcher=add(s,0,MANTRA);
  add(s,0,FIRE);
  play(s,add(s,1,'dmr16g-020','hand'));
  assert.equal(s.decision.type,'effectOrder');
  act(s,'orderEffect',a=>a.uid===watcher.uid);
  pick(s,drawFirst);
  if(!drawFirst){assert.equal(s.decision.task.uid,watcher.uid);pick(s,1);}
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,1);
 }
});

test('Mantra can deploy a cost-four creature after bounce or destruction during the opponent’s turn',()=>{
 for(const [spellId,destination] of [[BOUNCE,'hand'],[DESTROY,'grave']]){
  const s=field(1),mantra=add(s,0,MANTRA),eligible=add(s,0,MEDIUM,'hand');
  const expensive=add(s,0,BIG,'hand'),otherSpell=add(s,0,BOYAN,'hand'),spell=add(s,1,spellId,'hand');
  play(s,spell);act(s,'effect',a=>a.targets[0]?.uid===mantra.uid);
  assert.equal(s.decision.player,0);
  assert.deepEqual(new Set(values(s)),new Set([eligible.uid,...(destination==='hand'?[mantra.uid]:[]),null]));
  pick(s,eligible.uid);drain(s);
  assert.ok(has(s,0,destination,mantra)&&has(s,0,'battle',eligible));
  assert.ok(has(s,0,'hand',expensive)&&has(s,0,'hand',otherSpell));
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
 }
});

test('Mantra cannot deploy when it leaves on its controller’s turn',()=>{
 const s=field(),mantra=add(s,0,MANTRA),bounce=add(s,0,BOUNCE,'hand'),eligible=add(s,0,MEDIUM,'hand');
 play(s,bounce);act(s,'effect',a=>a.targets[0]?.uid===mantra.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',mantra)&&has(s,0,'hand',eligible));
});

test('Boyan’s trigger counts both fire creatures and fire Tamaseeds, including tapped creatures',()=>{
 for(const enough of [false,true]){
  const s=field(1);
  add(s,0,FIRE,'battle',{tapped:true});
  add(s,enough?0:1,FIRE_SEED);
  const victim=add(s,1,MEDIUM);
  breakShield(s,BOYAN);
  const trigger=e.getLegalActions(s).find(a=>a.kind==='useTrigger'&&a.cardId===BOYAN);
  assert.equal(!!trigger,enough);
  if(enough){e.step(s,trigger);pick(s,victim.uid);assert.ok(has(s,1,'grave',victim));}
  else assert.ok(s.players[0].hand.some(x=>x.cardId===BOYAN));
 }
});

test('Boyan can be cast from hand without civil count and only offers selectable opponents at current power 5000 or less',()=>{
 const s=field(),spell=add(s,0,BOYAN,'hand'),valid=add(s,1,MEDIUM,'battle',{powerModifiers:[{amount:1000}]});
 const tooBig=add(s,1,MEDIUM,'battle',{powerModifiers:[{amount:1001}]}),ally=add(s,0,MEDIUM);
 const immune=add(s,1,FIRE,'battle',{g34Grants:[{turn:s.turn,untargetable:true}]});
 play(s,spell);
 assert.deepEqual(values(s),[valid.uid]);
 pick(s,valid.uid);
 assert.ok(has(s,1,'grave',valid)&&has(s,1,'battle',tooBig)&&has(s,1,'battle',immune)&&has(s,0,'battle',ally));
});
