import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SHINRAN='dm36-011',VC='dm36-011VC',PADMA='dm37-007',ALAST='dm23-027';
const BODY='dm01-108',KURT='dm38-020',WORM='dm36-091',DEVIL='dmr12-041';
const DEMON='dm01-027';
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
function destroy(s,x){
 play(s,DEMON);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

test('Phase 861 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-861.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[SHINRAN,PADMA,ALAST]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[VC,SHINRAN]]);
 assert.deepEqual(registry.resolveRows([{id:VC,count:2},{id:SHINRAN,count:2}]),[{id:SHINRAN,count:4}]);
 const ref=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...ref,status:'complete'},{phase:861}),m.cards[0].spec);
 assert.equal(m.regulationVerification.limits[VC],4);
 assert.notEqual(ref.image,CARD_IMAGES[SHINRAN]);
 assert.ok(!data.cards.some(c=>c.id===VC));
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:861}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:860}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:861}));
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
const end=s=>{s.phase='attack';act(s,'endTurn');};
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function breakWithEffect(s,p,options,n){
 task(s,'g34_Break497',p,{...options,n});
 const owner=options.owner==='self'?p:1-p;
 for(const x of s.players[owner].shields.slice(0,n))pick(s,x);
}

test('Shinran evolves from an allied H Soul and breaks two shields',()=>{
 const s=field(),p=s.active;
 const host=add(s,p,'battle',KURT,{g35Ignored:s.turn});
 const sealed=add(s,p,'battle',KURT,{sealed:true});
 s.players[p].seals=[{...inst(BODY),sealOf:sealed.uid}];
 add(s,p,'battle',KURT,{faceDown:true});
 add(s,p,'battle',BODY,{under:[inst(KURT)]});
 add(s,p,'battle',WORM);
 add(s,1-p,'battle',KURT);
 const shinran=add(s,p,'hand',SHINRAN);
 act(s,'play',a=>a.uid===shinran.uid);
 const plays=e.getLegalActions(s).filter(a=>a.kind==='evolve'&&a.uid===shinran.uid);
 assert.deepEqual(plays.map(a=>a.baseUid),[host.uid]);
 act(s,'evolve',a=>a.uid===shinran.uid&&a.baseUid===host.uid);
 assert.deepEqual(shinran.under.map(x=>x.uid),[host.uid]);
 end(s);
 end(s);
 attack(s,shinran.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 assert.equal(s.players[1-p].brokenThisTurn,2);
});

test('Shinran chooses the hand mode and can put an H Soul evolution on a legal base',()=>{
 let s=field();
 const host=add(s,1,'battle',KURT),victim=add(s,1,'battle',SHINRAN,{under:[inst(KURT)]});
 const second=add(s,1,'hand',SHINRAN),padma=add(s,1,'hand',PADMA);
 add(s,1,'hand',BODY);
 const shields=s.players[1].shields.length;
 destroy(s,victim);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[0,1]);
 s=restore(s);
 act(s,'extended',a=>values(s)[a.choice]===0);
 assert.deepEqual(values(s),[second.uid,padma.uid]);
 pick(s,second);
 drain(s);
 assert.ok(has(s,1,'battle',second));
 assert.deepEqual(s.players[1].battle.find(x=>x.uid===second.uid).under.map(x=>x.uid),[host.uid]);
 assert.equal(s.players[1].shields.length,shields);
});

test('Shinran can add a face-down shield or choose an unavailable hand mode',()=>{
 for(const mode of [0,1]){
  const s=field(),victim=add(s,1,'battle',SHINRAN),top=s.players[1].deck[0];
  const shields=s.players[1].shields.length;
  destroy(s,victim);
  assert.deepEqual(values(s),[0,1]);
  act(s,'extended',a=>values(s)[a.choice]===mode);
  assert.equal(s.players[1].shields.length,shields+mode);
  assert.equal(has(s,1,'shields',top),mode===1);
  if(mode===1)assert.ok(!s.players[1].shields.at(-1).faceUp);
 }
});

test('Padma can trigger from the second broken shield and restore a shield that turn',()=>{
 const s=field();
 const attacker=add(s,0,'battle',SHINRAN);
 give(s,1,'shields',[BODY,PADMA]);
 const top=s.players[1].deck[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(s.players[1].battle.some(x=>x.cardId===PADMA));
 assert.equal(s.players[1].brokenThisTurn,2);
 end(s);
 assert.ok(has(s,1,'shields',top));
 assert.ok(!s.players[1].shields.at(-1).faceUp);
});

test('Padma counts own effects, prior breaks and replenished shields, then resets next turn',()=>{
 let s=field();
 breakWithEffect(s,0,{owner:'self'},2);
 const padma=add(s,0,'hand',PADMA);
 s.phase='main';
 act(s,'play',a=>a.uid===padma.uid);
 task(s,'g34_ShieldTop',0,{n:2,g779Simultaneous:true});
 assert.equal(s.players[0].shields.length,5);
 const top=s.players[0].deck[0];
 s=restore(s);
 end(s);
 assert.ok(has(s,0,'shields',top));
 assert.equal(s.players[0].brokenThisTurn,0);
 end(s);
 assert.equal(s.players[0].shields.length,6);
});

test('Padma excludes the other player’s breaks and shields moved without breaking',()=>{
 const s=field(),top=s.players[0].deck[0];
 add(s,0,'battle',PADMA);
 breakWithEffect(s,0,{},2);
 task(s,'g34_ShieldGrave',0,{});
 pick(s,s.players[0].shields[0]);
 breakWithEffect(s,0,{owner:'self'},1);
 assert.equal(s.players[0].brokenThisTurn,1);
 end(s);
 assert.ok(!has(s,0,'shields',top));
 assert.equal(s.players[0].shields.length,3);
});

test('Alast makes the turn player put their chosen shield in the graveyard',()=>{
 let s=field();
 const alast=add(s,1,'battle',ALAST),devil=add(s,1,'battle',DEVIL);
 const shield=s.players[0].shields[1];
 shield.shieldStack=[inst(PADMA)];
 const stack=shield.shieldStack[0];
 destroy(s,devil);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),s.players[0].shields.map(x=>x.uid));
 s=restore(s);
 pick(s,shield);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'grave',stack));
 assert.ok(has(s,1,'battle',alast));
 assert.equal(s.players[0].brokenThisTurn||0,0);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.decision,null);
});

test('Alast sees another Grand Devil in simultaneous destruction, including another copy',()=>{
 for(const id of [DEVIL,ALAST]){
  const s=field();
  add(s,1,'battle',ALAST);
  add(s,1,'battle',id);
  task(s,'g34_Sweep',0,{to:'grave',filter:{creature:true}});
  assert.equal(s.players[1].battle.length,0);
  drain(s);
  assert.equal(s.players[0].shields.length,id===ALAST?3:4);
 }
});

test('Alast ignores its own destruction, allied non-Grand Devils, other moves and its own turn',()=>{
 for(const [owner,victimId,to,self] of [[1,ALAST,'grave',true],[1,BODY,'grave',false],[1,DEVIL,'hand',false],[0,DEVIL,'grave',false]]){
  const s=field(),alast=add(s,owner,'battle',ALAST);
  const victim=self?alast:add(s,owner,'battle',victimId);
  task(s,'g34_Sweep',1-owner,{to,filter:{creature:true},excludeUid:self?undefined:alast.uid});
  assert.ok(has(s,owner,to,victim));
  assert.equal(s.decision,null);
  assert.deepEqual(s.players.map(p=>p.shields.length),[5,5]);
 }
});
