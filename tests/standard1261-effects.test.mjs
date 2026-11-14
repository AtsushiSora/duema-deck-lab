import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TAIMAN='dmr18-008',DENEBIA='dm22rp2-030',PALUCK='dm24-106',REPRINT='dm22rp2x-030';
const NATURE='dm01-108',FIRE='dm01-097',LIGHT='dmrp08-063',SEED='dm25ex1-054';
const GATE='dm16-007',HAND='dm01-027',SURFER='dm05-024',SIGN='dmc44-001';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));

test('the four official prints resolve to three cards with verified stats, abilities, limits and art',()=>{
 const m=read('tools/support-phase-1261.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TAIMAN,DENEBIA,PALUCK]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,DENEBIA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1261}),row.spec);
  const unknown=structuredClone({...row,status:'complete'});
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:1261}));
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  if(id===canonicalId){
   assert.equal(CARD_IMAGES[id],image);
   assert.equal(c.text,f.abilityText);
  }
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('Mega Taiman has +8000 in battle but not during a regular swing for two shields',()=>{
 const s=field(),taiman=add(s,0,'battle',TAIMAN),large=add(s,1,'battle','dm05-s04',{tapped:true});
 assert.equal(e.power(taiman,true,s),8000);
 attack(s,taiman.uid,large.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,0,'battle',taiman)&&has(s,1,'grave',large));
 assert.equal(e.power(taiman,false,s),8000);
 const t=field(),attacker=add(t,0,'battle',TAIMAN);
 attack(t,attacker.uid);act(t,'noBlock');drain(t);
 assert.equal(t.players[1].shields.length,3);
});

test('Mega Taiman stops enemy creature entry through a two-shield break and releases it when it leaves',()=>{
 const s=field(),taiman=add(s,0,'battle',TAIMAN);
 give(s,1,'shields',[HAND,SURFER]);
 const [destruction,creature]=s.players[1].shields;
 attack(s,taiman.uid);act(s,'noBlock');
 assert.equal(e.canEnterCreature(s,1,e.card(LIGHT),{execution:false}),false);
 assert.equal(e.canEnterCreature(s,1,e.card(SEED),{execution:false}),true);
 assert.equal(e.canEnterCreature(s,0,e.card(LIGHT),{execution:false}),true);
 act(s,'useTrigger',a=>a.cardId===HAND);
 act(s,'useTrigger',a=>a.cardId===SURFER);
 target(s,taiman);drain(s);
 assert.ok(has(s,1,'grave',destruction)&&has(s,0,'grave',taiman));
 assert.ok(has(s,1,'battle',creature));
});

test('Mega Taiman leaves a blocked creature S-Trigger in hand if it never leaves the attack',()=>{
 const s=field(),taiman=add(s,0,'battle',TAIMAN);
 give(s,1,'shields',[SURFER,NATURE]);
 const [creature]=s.players[1].shields;
 attack(s,taiman.uid);act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===SURFER);drain(s);
 assert.ok(has(s,1,'hand',creature)&&!has(s,1,'battle',creature));
 assert.equal(e.canEnterCreature(s,1,e.card(LIGHT)),true);
});

test('Denebia can deploy a light creature or a light Tamaseed after an opponent puts a card from their hand',()=>{
 for(const chooseSeed of [false,true]){
  const s=field(),scout=add(s,1,'battle',DENEBIA);
  const entrant=add(s,0,'hand',LIGHT);
  const cheap=add(s,1,'hand',LIGHT),seed=add(s,1,'hand',SEED);
  const higher=add(s,1,'hand','dm01-s01'),wrongColor=add(s,1,'hand',FIRE);
  if(chooseSeed)entrant.cardId='dmrp18-060';
  cast(s,GATE);pick(s,entrant.uid);drainEntryOrder(s,scout);
  assert.ok(options(s).includes(cheap.uid));
  assert.equal(options(s).includes(seed.uid),chooseSeed);
  assert.ok(!options(s).includes(higher.uid)&&!options(s).includes(wrongColor.uid));
  const chosen=chooseSeed?seed:cheap;
  pick(s,chosen.uid);drain(s);
  assert.ok(has(s,1,'battle',chosen));
 }
});
function drainEntryOrder(s,watcher){
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===watcher.uid));
}
test('Denebia does not respond to summoning or graveyard deployment and can decline its own deployment',()=>{
 const s=field(),watcher=add(s,1,'battle',DENEBIA),candidate=add(s,1,'hand',LIGHT);
 const summon=add(s,0,'hand',LIGHT);
 act(s,'play',a=>a.uid===summon.uid);assert.equal(s.decision,null);
 const grave=add(s,0,'grave',LIGHT);
 cast(s,SIGN);pick(s,grave.uid);drain(s);
 assert.ok(has(s,0,'battle',grave)&&has(s,1,'hand',candidate));
 const entrant=add(s,0,'hand',LIGHT);
 cast(s,GATE);pick(s,entrant.uid);drainEntryOrder(s,watcher);
 assert.ok(options(s).includes(candidate.uid));pick(s,null);
 assert.ok(has(s,1,'hand',candidate));
});
test('Paluck makes Nature mana also Light and Fire only while its ability is active (QA 35532 and 35533)',()=>{
 const s=field(),paluck=add(s,0,'battle',PALUCK);
 give(s,0,'mana',[NATURE,NATURE,FIRE]);give(s,1,'mana',[NATURE]);
 const [first,second]=s.players[0].mana;
 const light=add(s,0,'hand',LIGHT);
 const natural=new Set(['自然','光','火']);
 assert.deepEqual(new Set(e.manaColors(e.card(first),s,0)),natural);
 assert.deepEqual(new Set(e.zoneCard(s,0,first,'mana').civilizations),natural);
 assert.deepEqual(e.manaColors(e.card(first),s,1),['自然']);
 assert.deepEqual(e.manaColors(e.card(FIRE),s,0),['火']);
 assert.equal(e.paymentPool(s,0).find(x=>x.uid===first.uid).paymentValue,undefined);
 second.faceDown=true;
 assert.equal(e.paymentPool(s,0).find(x=>x.uid===second.uid).paymentColors,undefined);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===light.uid));
 const untapped=s.players[0].mana.filter(x=>!x.tapped).length;
 act(s,'play',a=>a.uid===light.uid);
 assert.equal(s.players[0].mana.filter(x=>!x.tapped).length,untapped-2);
 paluck.g35Ignored=s.turn;
 assert.deepEqual(e.manaColors(e.card(first),s,0),['自然']);
});

test('Paluck adds colors to multicolored Nature mana without replacing its printed civilizations',()=>{
 const s=field();add(s,0,'battle',PALUCK);
 const multi=e.card('dmex17-021');
 assert.ok(multi);
 const original=multi.civilizations??multi.civ.split('/');
 assert.ok(original.includes('自然')&&original.length>1);
 assert.deepEqual(new Set(e.manaColors(multi,s,0)),new Set([...original,'光','火']));
});
