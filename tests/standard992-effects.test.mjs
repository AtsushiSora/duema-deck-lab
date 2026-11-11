import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PTERA='dmr13-065',TYRANNO='dmr13-009',SULLIVAN='dmr13-012',ALERT='dmr14-051';
const PRINTS=[...['dmr13-065D','dmex02-004','dmex13-037'].map(id=>[id,PTERA]),['dmr13-012D',SULLIVAN]];
const LIGHT='dm01-075',FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',BLOCKER='dm01-076';
const EVO='dm02-033',MULTI='dmr02-054',SIGN='dmr13-016',DRAGNER='dm25bd3-020';
const UNTOUCHABLE='dmr14-007';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 992 registers four official definitions and maps four reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-992.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PTERA,TYRANNO,SULLIVAN,ALERT]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:PTERA,count:3},{id:SULLIVAN,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:992}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:992}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,id===ALERT?1:4]);
  assert.equal(c.supportBatch,'phase-992');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],row.id===ALERT?1:4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:992}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const attackPlayer=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');

test('Pteratox deploys a non-evolution Nature creature of cost four or less from its own mana',()=>{
 const s=field();
 const nature=put(s,0,'mana',NATURE),multi=put(s,0,'mana',MULTI,{tapped:true});
 const evo=put(s,0,'mana',EVO),large=put(s,0,'mana',PTERA),fire=put(s,0,'mana',FIRE);
 put(s,1,'mana',NATURE);
 play(s,PTERA);
 assert.ok(choices(s).includes(nature.uid));
 assert.ok(choices(s).includes(multi.uid));
 for(const x of [evo,large,fire])assert.ok(!choices(s).includes(x.uid));
 assert.ok(choices(s).includes(null));
 pick(s,multi.uid);drain(s);
 assert.ok(has(s,0,'battle',multi));
 assert.ok(!has(s,0,'mana',multi));
});

test('Tyranno Venom can deploy from mana both on entry and on attack, and excludes multicolor',()=>{
 let s=field();
 const first=put(s,0,'mana',NATURE),second=put(s,0,'mana',PTERA);
 const multi=put(s,0,'mana',MULTI),evo=put(s,0,'mana',EVO),over=put(s,0,'mana',TYRANNO);
 const x=play(s,TYRANNO);
 for(const card of [multi,evo,over])assert.ok(!choices(s).includes(card.uid));
 assert.ok(choices(s).includes(second.uid));
 pick(s,first.uid);drain(s);
 assert.ok(has(s,0,'battle',first));
 assert.equal(e.effectiveCard(x,s).breaker,2);
 end(s);end(s);
 attack(s,x.uid);
 s=restore(s);
 assert.ok(choices(s).includes(second.uid));
 pick(s,second.uid);
 drain(s);
 assert.ok(has(s,0,'battle',second));
 assert.equal(s.players[1].shields.length,3);
});

test('Either Nature creature moves a larger battle winner to mana even after the loser is destroyed',()=>{
 for(const id of [PTERA,TYRANNO]){
  const s=field();
  const x=put(s,0,'battle',id);
  const foe=put(s,1,'battle',UNTOUCHABLE,{tapped:true,powerModifiers:[{amount:6000}]});
  const before=physical(s);
  attack(s,x.uid,foe.uid);drain(s);
  assert.ok(has(s,0,'grave',x));
  assert.ok(has(s,1,'mana',foe));
  assert.deepEqual(physical(s),before);
 }
});

test('Equal power and victories do not move a combatant to mana',()=>{
 for(const outcome of ['tie','win']){
  const s=field(),x=put(s,0,'battle',PTERA);
  const foe=put(s,1,'battle',outcome==='tie'?PTERA:FIRE,{tapped:true});
  attack(s,x.uid,foe.uid);drain(s);
  assert.ok(has(s,1,'grave',foe));
  assert.equal(has(s,0,'grave',x),outcome==='tie');
  assert.ok(!has(s,1,'mana',foe));
 }
});

test('Sullivan offers exactly two draws to each player, then may deploy two small Light creatures',()=>{
 let s=field();
 give(s,0,'deck',[LIGHT,BLOCKER,NATURE,FIRE]);
 const [one,two]=s.players[0].deck;
 put(s,0,'hand',FIRE);
 put(s,0,'hand',PTERA);
 const x=play(s,SULLIVAN);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[true,null]);
 pick(s,true);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.decision.player,1);
 s=restore(s);
 pick(s,null);
 assert.deepEqual(new Set(choices(s)),new Set([one.uid,two.uid,null]));
 pick(s,one.uid);pick(s,two.uid);drain(s);
 assert.ok(has(s,0,'battle',one)&&has(s,0,'battle',two));
 assert.equal(s.players[1].hand.length,0);
});

test('Sullivan offers the active player the draw first when it enters through a Shield Trigger',()=>{
 const s=field();
 const x=put(s,0,'hand',SULLIVAN),small=put(s,0,'hand',LIGHT);
 give(s,0,'shields',[SIGN]);
 s.active=1;
 const foe=put(s,1,'battle',FIRE);
 attack(s,foe.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===SIGN);
 if(s.decision.type==='extended')pick(s,x.uid);
 else act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
 assert.equal(s.decision.source,SULLIVAN);
 assert.equal(s.decision.player,1);
 pick(s,true);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(s.decision.player,0);
 pick(s,null);
 pick(s,null);
 assert.ok(has(s,0,'hand',small));
});

test('Dragon Alert has a one-card restriction and uses G Zero only with a live allied Fire Dragner',()=>{
 for(const mode of ['paid','sealed','enemy','free']){
  const s=field();
  give(s,0,'mana',mode==='paid'?[FIRE,FIRE]:[]);
  const target=put(s,0,'battle',FIRE,{entered:s.turn});
  if(mode!=='paid'){
   const x=put(s,mode==='enemy'?1:0,'battle',DRAGNER,{sealed:mode==='sealed'});
   if(x.sealed)put(s,0,'seals',NATURE,{faceDown:true,sealOf:x.uid});
  }
  const spell=put(s,0,'hand',ALERT);
  const action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===spell.uid);
  assert.equal(!!action,mode==='paid'||mode==='free');
  if(!action)continue;
  assert.equal(action.freeSpell==='G・ゼロ',mode==='free');
  act(s,'play',a=>a.uid===spell.uid);
  pick(s,target.uid);
  s.phase='attack';
  assert.ok(attackPlayer(s,target));
  assert.ok(e.effectiveCard(target,s).race.includes('ガイアール・コマンド・ドラゴン'));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mode==='paid'?2:0);
  end(s);
  assert.ok(!e.effectiveCard(target,s).speedAttacker);
  assert.ok(!e.effectiveCard(target,s).race.includes('ガイアール・コマンド・ドラゴン'));
 }
 assert.ok(e.validateDeck({format:'original',cards:[{id:ALERT,count:2}]}).some(err=>err.includes('暴龍警報は1枚まで')));
});

test('Dragon Alert may also grant both properties to an opponent creature',()=>{
 const s=field();
 const foe=put(s,1,'battle',WATER);
 play(s,ALERT);
 pick(s,foe.uid);
 assert.ok(e.effectiveCard(foe,s).speedAttacker);
 assert.ok(e.effectiveCard(foe,s).race.includes('ガイアール・コマンド・ドラゴン'));
});
