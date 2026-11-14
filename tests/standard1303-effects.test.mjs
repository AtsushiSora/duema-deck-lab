import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {shieldCards} from '../dist/shield-state.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const CLOCK='dmex10-024',BARO='dmsd18-001',EARTH='dm27-s05';
const BASIC='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',DARK='dm01-090';
const GRENMA='dmrp13-040',KANGOKU='dmex16-068',OTAKEBI='dmrp13-068',OTATE='dmrp15-069';
const SHUFFLE='dm22-029',DEMON='dm01-027',JEWEL='dmd12-013',SITO='dmrp16-062';
const TRIGUARD='dmbd06-016',PAALDA='dmr18-013',EMERAL='dm03-042';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
const uid=({value})=>value?.uid??value;
const pick=(s,x)=>act(s,'extended',a=>uid(s.decision.choices[a.choice])===x.uid);

test('ten official prints resolve to three canonical IDs and validate in saved decks',()=>{
 const m=read('tools/support-phase-1303.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[CLOCK,BARO,EARTH]);
 assert.equal(m.printAliases.length,7);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1303}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.limit],
   [f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.civilizations,f.race,4]);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId,name,image,source});
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('Oni Clock grants Oni Time only to its caster this turn and draws a card (QA 33474)',()=>{
 const s=field(),grenma=add(s,0,'battle',GRENMA),legacy=add(s,0,'battle',KANGOKU),
  inverse=add(s,0,'battle',OTATE),enemy=add(s,1,'battle',GRENMA);
 const before=s.players[0].deck.length;
 assert.equal(e.effectiveCard(grenma,s).breaker,undefined);
 const old=e.power(legacy,false,s);
 cast(s,CLOCK);
 assert.equal(s.players[0].deck.length,before-1);
 assert.deepEqual(s.players.map(p=>p.shields.length),[5,5]);
 assert.equal(e.effectiveCard(grenma,s).breaker,2);
 assert.equal(e.power(legacy,false,s),old+3000);
 assert.equal(!!e.effectiveCard(inverse,s).noAttack,false);
 assert.equal(e.effectiveCard(enemy,s).breaker,undefined);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.effectiveCard(grenma,s).breaker,undefined);
 assert.equal(e.power(legacy,false,s),old);
});

test('Oni Clock enables a later entry ability with ten shields already in play',()=>{
 const s=field(),victim=add(s,1,'battle',BASIC);
 cast(s,CLOCK);cast(s,OTAKEBI);pick(s,victim);drain(s);
 assert.ok(has(s,1,'grave',victim));
 assert.deepEqual(s.players.map(p=>p.shields.length),[5,5]);
});

test('Balodias enters with EX Life, destroys one creature and uses T-breaker',()=>{
 const s=field(),victim=add(s,1,'battle',BASIC),before=s.players[0].deck[0];
 cast(s,BARO);pick(s,victim);drain(s);
 const baro=s.players[0].battle.find(x=>x.cardId===BARO);
 assert.deepEqual(e.exLifeShields(s,0,baro).map(x=>x.uid),[before.uid]);
 assert.ok(has(s,1,'grave',victim));
 assert.equal(e.effectiveCard(baro,s).breaker,3);
});

test('Balodias keeps the EX Life slot when shuffled, then destroys a creature once the entire group leaves (QA 39544, 39548)',()=>{
 const s=field();cast(s,BARO);
 const baro=s.players[0].battle.find(x=>x.cardId===BARO),shield=e.exLifeShields(s,0,baro)[0],pos=s.players[0].shields.indexOf(shield);
 shield.shieldStack=[inst(FIRE),inst(LIGHT)];
 const victim=add(s,1,'battle',BASIC);
 cast(s,SHUFFLE);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',victim));
 const root=s.players[0].shields[pos];
 assert.deepEqual(e.exLifeShields(s,0,baro),[root]);
 assert.equal(shieldCards(root).length,3);
 s.players[0].shields=[root];
 s.active=1;attack(s,victim.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(root.uid));
 pick(s,victim);drain(s);
 assert.equal(e.exLifeShields(s,0,baro).length,0);
 assert.equal(s.players[1].grave.filter(x=>x.uid===victim.uid).length,1);
});

test('Balodias is protected from an opponent’s nonmulticolor spell choices',()=>{
 const s=field(),baro=add(s,1,'battle',BARO),other=add(s,1,'battle',BASIC);
 cast(s,DEMON);
 assert.deepEqual(s.decision.targets.map(x=>x.uid),[other.uid]);
 act(s,'effect',a=>a.targets[0].uid===other.uid);
 assert.ok(has(s,1,'battle',baro)&&has(s,1,'grave',other));
 cast(s,JEWEL);
 assert.ok(s.decision.choices.some(c=>uid(c)===baro.uid));
 pick(s,baro);drain(s);
 assert.ok(has(s,1,'grave',baro));
});

test('Balodias triggers on Sito’s full shield swap and keeps EX Life on a partial swap (QA 39537, 39549)',()=>{
 for(const stacked of [false,true]){
  const s=field();cast(s,BARO);
  const baro=s.players[0].battle.find(x=>x.cardId===BARO),shield=e.exLifeShields(s,0,baro)[0];
  if(stacked)shield.shieldStack=[inst(FIRE)];
  const victim=add(s,1,'battle',BASIC),incoming=s.players[0].deck[0];
  cast(s,SITO);pick(s,shield);
  act(s,'extended',a=>s.decision.choices[a.choice].value===true);
  assert.ok(has(s,0,'deck',shield));
  if(stacked){
   assert.equal(s.decision,null);
   assert.ok(has(s,1,'battle',victim));
   assert.ok(e.exLifeShields(s,0,baro).some(x=>shieldCards(x).includes(incoming)));
  }else{
   assert.equal(e.exLifeShields(s,0,baro).length,0);
   pick(s,victim);drain(s);
   assert.ok(has(s,1,'grave',victim));
  }
 }
});

test('Perfect Earth grants Shield Trigger to a normally ineligible creature from a broken shield',()=>{
 const s=field(),attacker=add(s,0,'battle',BASIC);
 add(s,1,'battle',EARTH);
 give(s,1,'shields',[FIRE]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);
 assert.ok(has(s,1,'battle',shield));
 assert.equal(e.manaValue(e.card(EARTH)),0);
});

test('Perfect Earth lets a shield spell interrupt recovery, respecting effects that prohibit S-Trigger',()=>{
 const s=field(),earth=add(s,0,'battle',EARTH);
 assert.equal(e.effectiveCard(earth,s).breaker,2);
 give(s,0,'shields',[CLOCK]);
 const shield=s.players[0].shields[0];
 s.extTasks=[{op:'g55_ShieldHand',p:0,source:EARTH}];
 act(s,'toAttack');
 pick(s,shield);
 act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);
 assert.ok(has(s,0,'grave',shield));
 assert.equal(s.g1303OniClock[0],s.turn);

 const locked=field();add(locked,0,'battle',EARTH);give(locked,0,'shields',[CLOCK]);
 const other=locked.players[0].shields[0];
 cast(locked,TRIGUARD);
 act(locked,'extended',a=>locked.decision.choices[a.choice].value===true);
 pick(locked,other);
 if(locked.decision?.choices.some(c=>c.value===null))act(locked,'extended',a=>locked.decision.choices[a.choice].value===null);
 drain(locked);
 assert.ok(has(locked,0,'hand',other));
 assert.equal(locked.g1303OniClock,undefined);
});

test('Perfect Earth grants S-Trigger on Paalda’s attack and respects Emeral’s restriction',()=>{
 const active=field(),paalda=add(active,0,'battle',PAALDA);
 add(active,0,'battle',EARTH);
 give(active,0,'shields',[CLOCK]);
 const spell=active.players[0].shields[0];
 attack(active,paalda.uid);pick(active,spell);
 act(active,'useTrigger',a=>a.uid===spell.uid);
 assert.ok(has(active,0,'grave',spell));
 assert.equal(active.g1303OniClock[0],active.turn);

 const locked=field(),hand=add(locked,0,'hand',FIRE);
 add(locked,0,'battle',EARTH);give(locked,0,'shields',[CLOCK]);
 const shield=locked.players[0].shields[0];
 cast(locked,EMERAL);pick(locked,hand);pick(locked,shield);
 assert.ok(has(locked,0,'hand',shield)&&has(locked,0,'shields',hand));
 assert.ok(!locked.triggers);
 assert.equal(locked.g1303OniClock,undefined);
});
